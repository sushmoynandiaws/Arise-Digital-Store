use crate::app::{AppError, Result};
use crate::{AppState, digest, now};
use aes_gcm::{
    Nonce,
    aead::{Aead, OsRng, rand_core::RngCore},
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use rusqlite::{OptionalExtension, params};

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
    pub fn access_token(&self, session: Option<&str>) -> Result<Option<String>> {
        let Some(session) = session else {
            return Ok(None);
        };
        let encrypted: Option<String> = self
            .db
            .lock()
            .map_err(|_| AppError::internal())?
            .query_row(
                "SELECT source_token FROM sessions WHERE token_hash=?1 AND expires_at>?2",
                params![digest(session), now()],
                |row| row.get(0),
            )
            .optional()
            .map_err(|_| AppError::internal())?;
        encrypted.map(|v| self.unseal(&v)).transpose()
    }
    pub fn rate_limit(&self, key: &str, limit: i64) -> Result<()> {
        let db = self.db.lock().map_err(|_| AppError::internal())?;
        db.execute("INSERT INTO rate_limits(bucket,window_start,attempts) VALUES (?1,?2,1) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN window_start<?3 THEN 1 ELSE attempts+1 END, window_start=CASE WHEN window_start<?3 THEN ?2 ELSE window_start END",params![key,now(),now()-3600]).map_err(|_|AppError::internal())?;
        let attempts: i64 = db
            .query_row(
                "SELECT attempts FROM rate_limits WHERE bucket=?1",
                [key],
                |row| row.get(0),
            )
            .map_err(|_| AppError::internal())?;
        if attempts > limit {
            return Err(AppError::new(
                axum::http::StatusCode::TOO_MANY_REQUESTS,
                "Too many attempts. Please try again later.",
            ));
        }
        Ok(())
    }
}
