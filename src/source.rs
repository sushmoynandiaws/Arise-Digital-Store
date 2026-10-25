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
                "AriseSell is temporarily unavailable. Try again shortly.",
            )
        })?;
        let status = response.status();
        let value: Value = response.json().await.map_err(|_| {
            AppError::new(
                StatusCode::BAD_GATEWAY,
                "We could not read the shop service response. Refresh this page to check the result before trying again.",
            )
        })?;
        if !status.is_success() {
            let message = value.get("detail").and_then(Value::as_str).unwrap_or(
                "AriseSell could not complete this action. Please check the details and retry.",
            );
            return Err(AppError::new(
                StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
                message,
            ));
        }
        Ok(value)
    }
}
