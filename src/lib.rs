pub mod admin;
pub mod app;
pub mod db;
pub mod source;

use aes_gcm::{Aes256Gcm, KeyInit};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use sha2::{Digest, Sha256};
use sqlx::AnyPool;
use std::{
    env,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use url::Url;

#[derive(Clone)]
pub struct Config {
    pub origin: String,
    pub source_api: String,
    pub source_web: String,
    pub bridge_key: String,
    pub encryption_key: [u8; 32],
    pub demo: bool,
}
impl Config {
    pub fn from_env() -> Result<Self, String> {
        let origin = env::var("PUBLIC_ORIGIN").unwrap_or_else(|_| "http://localhost:8088".into());
        let source_api =
            env::var("ARISESELL_API_URL").unwrap_or_else(|_| "http://127.0.0.1:8111/api/v1".into());
        let source_web =
            env::var("ARISESELL_WEB_URL").unwrap_or_else(|_| "http://localhost:8111".into());
        let demo = env::var("DEMO_MODE").is_ok_and(|value| value == "true");
        for value in [&origin, &source_api, &source_web] {
            validate_origin(value)?;
        }
        if demo
            && [&origin, &source_api, &source_web]
                .iter()
                .any(|value| !is_loopback(value))
        {
            return Err("Demo mode is restricted to localhost URLs".into());
        }
        let bridge_key = env::var("ARISESELL_BRIDGE_KEY")
            .map_err(|_| "Set ARISESELL_BRIDGE_KEY (at least 32 characters)")?;
        if bridge_key.len() < 32 {
            return Err("ARISESELL_BRIDGE_KEY must contain at least 32 characters".into());
        }
        let encoded = env::var("SESSION_ENCRYPTION_KEY")
            .map_err(|_| "Set SESSION_ENCRYPTION_KEY to a base64url-encoded 32-byte key")?;
        let encryption_key = URL_SAFE_NO_PAD
            .decode(encoded)
            .map_err(|_| "Invalid SESSION_ENCRYPTION_KEY")?
            .try_into()
            .map_err(|_| "SESSION_ENCRYPTION_KEY must decode to 32 bytes")?;
        Ok(Self {
            origin: origin.trim_end_matches('/').into(),
            source_api: source_api.trim_end_matches('/').into(),
            source_web: source_web.trim_end_matches('/').into(),
            bridge_key,
            encryption_key,
            demo,
        })
    }
    pub fn secure(&self) -> bool {
        self.origin.starts_with("https://")
    }
    pub fn callback(&self) -> String {
        format!("{}/api/auth/callback", self.origin)
    }
    pub fn validate_serverless(&self, local_development: bool) -> Result<(), String> {
        if local_development
            && [&self.origin, &self.source_api, &self.source_web]
                .iter()
                .all(|value| is_loopback(value))
        {
            return Ok(());
        }
        if self.demo
            || [&self.origin, &self.source_api, &self.source_web]
                .iter()
                .any(|value| !value.starts_with("https://"))
        {
            return Err("Vercel requires DEMO_MODE=false and explicit HTTPS PUBLIC_ORIGIN, ARISESELL_API_URL and ARISESELL_WEB_URL".into());
        }
        Ok(())
    }
}
pub fn is_loopback(value: &str) -> bool {
    Url::parse(value)
        .ok()
        .and_then(|u| u.host_str().map(str::to_owned))
        .is_some_and(|host| matches!(host.as_str(), "localhost" | "127.0.0.1" | "::1"))
}
pub fn validate_origin(value: &str) -> Result<(), String> {
    let parsed = Url::parse(value).map_err(|_| "Invalid URL".to_string())?;
    if !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.query().is_some()
        || parsed.fragment().is_some()
        || (parsed.scheme() != "https" && !(parsed.scheme() == "http" && is_loopback(value)))
    {
        return Err("Use HTTPS URLs without credentials; HTTP is allowed only on localhost".into());
    }
    Ok(())
}
pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
pub fn token() -> String {
    format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    )
}
pub fn digest(value: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(value.as_bytes()))
}
#[derive(Clone)]
pub struct AppState {
    pub db: AnyPool,
    pub config: Arc<Config>,
    pub http: reqwest::Client,
    pub cipher: Arc<Aes256Gcm>,
}
impl AppState {
    pub fn new(config: Config, db: AnyPool) -> Result<Self, String> {
        let cipher = Aes256Gcm::new_from_slice(&config.encryption_key)
            .map_err(|_| "Invalid encryption key")?;
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|_| "Could not create AriseSell client")?;
        Ok(Self {
            db,
            config: Arc::new(config),
            http,
            cipher: Arc::new(cipher),
        })
    }
}
