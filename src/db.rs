use crate::app::{AppError, Result};
use crate::{AppState, digest, now};
use aes_gcm::{
    Nonce,
    aead::{Aead, OsRng, rand_core::RngCore},
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use sqlx::{AnyPool, any::AnyPoolOptions};
use std::time::Duration;

pub fn validate_database_url(value: &str, serverless: bool) -> std::result::Result<(), String> {
    let url = url::Url::parse(value).map_err(|_| "Invalid MARKETPLACE_DATABASE_URL")?;
    if matches!(url.scheme(), "postgres" | "postgresql") {
        if url.host_str().is_none() || url.username().is_empty() || url.fragment().is_some() {
            return Err("Use an explicit PostgreSQL host and marketplace database role".into());
        }
        let ssl_modes: Vec<_> = url
            .query_pairs()
            .filter(|(key, _)| key == "sslmode")
            .map(|(_, value)| value.into_owned())
            .collect();
        if !crate::is_loopback(value) && ssl_modes != ["verify-full"] {
            return Err("Remote PostgreSQL requires sslmode=verify-full".into());
        }
        return Ok(());
    }
    if url.scheme() == "sqlite" && !serverless {
        return Ok(());
    }
    Err("Vercel requires MARKETPLACE_DATABASE_URL pointing to persistent PostgreSQL; local SQLite is only for standalone development".into())
}

pub async fn connect_pool(value: &str) -> std::result::Result<AnyPool, String> {
    sqlx::any::install_default_drivers();
    let parsed = url::Url::parse(value).map_err(|_| "Invalid metadata database URL")?;
    let postgres = matches!(parsed.scheme(), "postgres" | "postgresql");
    let pool = AnyPoolOptions::new()
        .max_connections(if postgres { 3 } else { 1 })
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(30))
        .max_lifetime(Duration::from_secs(300))
        .after_connect(move |connection, _| {
            Box::pin(async move {
                if postgres {
                    sqlx::query("SET search_path TO arise_marketplace, pg_catalog")
                        .execute(connection)
                        .await?;
                } else {
                    sqlx::query("PRAGMA busy_timeout=5000")
                        .execute(connection)
                        .await?;
                }
                Ok(())
            })
        })
        .connect(value)
        .await
        .map_err(|_| "Could not connect to the marketplace metadata database")?;
    if postgres {
        let version: Option<i64> = sqlx::query_scalar(
            "SELECT version FROM arise_marketplace.schema_version WHERE version=3",
        )
        .fetch_optional(&pool)
        .await
        .map_err(|_| "Apply marketplace migrations through migrations/004_shop_pages.sql before starting the marketplace")?;
        if version != Some(3) {
            return Err(
                "Apply migrations/004_shop_pages.sql before starting the marketplace".into(),
            );
        }
    } else {
        sqlx::raw_sql(include_str!("../migrations/001_marketplace.sql"))
            .execute(&pool)
            .await
            .map_err(|_| "Could not apply local marketplace migrations")?;
        sqlx::raw_sql(
            &include_str!("../migrations/005_admin_console.sql").replace("arise_marketplace.", ""),
        )
        .execute(&pool)
        .await
        .map_err(|_| "Could not apply local admin migrations")?;
        sqlx::raw_sql(
            &include_str!("../migrations/006_growth.sql").replace("arise_marketplace.", ""),
        )
        .execute(&pool)
        .await
        .map_err(|_| "Could not apply local growth migrations")?;
    }
    Ok(pool)
}

pub async fn connect_database(serverless: bool) -> std::result::Result<AnyPool, String> {
    let value = match std::env::var("MARKETPLACE_DATABASE_URL").ok().filter(|value| !value.is_empty()) {
        Some(value) => value,
        None if serverless => return Err("Set MARKETPLACE_DATABASE_URL to the existing AriseSell PostgreSQL database using a marketplace-only role".into()),
        None => {
            let path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "data/marketplace.db".into());
            if let Some(parent) = std::path::Path::new(&path).parent() { std::fs::create_dir_all(parent).map_err(|_| "Could not create local database directory")?; }
            format!("sqlite://{path}?mode=rwc")
        }
    };
    validate_database_url(&value, serverless)?;
    connect_pool(&value).await
}

impl AppState {
    pub fn seal(&self, value: &str) -> Result<String> {
        let mut nonce = [0u8; 12];
        OsRng.fill_bytes(&mut nonce);
        let encrypted = self
            .cipher
            .encrypt(Nonce::from_slice(&nonce), value.as_bytes())
            .map_err(|_| AppError::internal())?;
        Ok(URL_SAFE_NO_PAD.encode([nonce.to_vec(), encrypted].concat()))
    }
    pub fn unseal(&self, value: &str) -> Result<String> {
        let bytes = URL_SAFE_NO_PAD
            .decode(value)
            .map_err(|_| AppError::unauthorized())?;
        if bytes.len() < 28 {
            return Err(AppError::unauthorized());
        }
        let clear = self
            .cipher
            .decrypt(Nonce::from_slice(&bytes[..12]), &bytes[12..])
            .map_err(|_| AppError::unauthorized())?;
        String::from_utf8(clear).map_err(|_| AppError::unauthorized())
    }
    pub async fn access_token(&self, session: Option<&str>) -> Result<Option<String>> {
        let Some(session) = session else {
            return Ok(None);
        };
        let encrypted: Option<String> = sqlx::query_scalar(
            "SELECT source_token FROM sessions WHERE token_hash=$1 AND expires_at>$2",
        )
        .bind(digest(session))
        .bind(now())
        .fetch_optional(&self.db)
        .await
        .map_err(|_| AppError::internal())?;
        encrypted.map(|v| self.unseal(&v)).transpose()
    }
    pub async fn rate_limit(&self, key: &str, limit: i64) -> Result<()> {
        let attempts: i64 = sqlx::query_scalar("INSERT INTO rate_limits(bucket,window_start,attempts) VALUES ($1,$2,1) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN rate_limits.window_start<$3 THEN 1 ELSE rate_limits.attempts+1 END, window_start=CASE WHEN rate_limits.window_start<$3 THEN $2 ELSE rate_limits.window_start END RETURNING attempts")
            .bind(key).bind(now()).bind(now()-3600).fetch_one(&self.db).await.map_err(|_| AppError::internal())?;
        if attempts > limit {
            return Err(AppError::new(
                axum::http::StatusCode::TOO_MANY_REQUESTS,
                "Too many attempts. Please try again later.",
            ));
        }
        Ok(())
    }
}
