use crate::{
    AppState,
    app::{AppError, Result},
};
use axum::http::StatusCode;
use serde_json::Value;

impl AppState {
    pub async fn source(
        &self,
        method: reqwest::Method,
        path: &str,
        access: Option<&str>,
        buyer: Option<&str>,
        body: Option<Value>,
    ) -> Result<Value> {
        let mut request = self
            .http
            .request(method, format!("{}{path}", self.config.source_api))
            .header("X-Marketplace-Key", &self.config.bridge_key);
        if let Some(access) = access {
            request = request.bearer_auth(access);
        }
        if let Some(buyer) = buyer {
            request = request.header("X-Marketplace-Buyer", buyer);
        }
        if let Some(body) = body {
            request = request.json(&body);
        }
        let response = request.send().await.map_err(|_| {
            AppError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "AriseSell is temporarily unavailable. Please retry.",
            )
        })?;
        let status = response.status();
        let value: Value = response.json().await.map_err(|_| {
            AppError::new(
                StatusCode::BAD_GATEWAY,
                "AriseSell returned an unreadable response.",
            )
        })?;
        if !status.is_success() {
            let extracted: Option<String> =
                if let Some(s) = value.get("detail").and_then(Value::as_str) {
                    Some(s.to_string())
                } else if let Some(arr) = value.get("detail").and_then(Value::as_array) {
                    let parts: Vec<String> = arr
                        .iter()
                        .filter_map(|item| {
                            let msg = item.get("msg").and_then(Value::as_str)?;
                            let field = item
                                .get("loc")
                                .and_then(Value::as_array)
                                .and_then(|l| l.last())
                                .and_then(Value::as_str);
                            if let Some(f) = field {
                                Some(format!("{f}: {msg}"))
                            } else {
                                Some(msg.to_string())
                            }
                        })
                        .collect();
                    if parts.is_empty() {
                        None
                    } else {
                        Some(parts.join(", "))
                    }
                } else if let Some(msg) = value.get("message").and_then(Value::as_str) {
                    Some(msg.to_string())
                } else if let Some(err) = value.get("error").and_then(Value::as_str) {
                    Some(err.to_string())
                } else {
                    None
                };
            let fallback =
                "AriseSell could not complete this action. Please check the details and retry.";
            let message = extracted.unwrap_or_else(|| fallback.to_string());
            return Err(AppError::new(
                StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
                message,
            ));
        }
        Ok(value)
    }
}
