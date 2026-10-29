use crate::{
    AppState,
    app::{AppError, Result},
};
use axum::http::StatusCode;
use serde_json::Value;

fn transport_cause(error: &(dyn std::error::Error + 'static)) -> &'static str {
    let mut cause = Some(error);
    for _ in 0..8 {
        let Some(error) = cause else { break };
        if let Some(io) = error.downcast_ref::<std::io::Error>() {
            eprintln!(
                "AriseSell transport IO: kind={:?} errno={:?}",
                io.kind(),
                io.raw_os_error()
            );
        }
        let message = error.to_string().to_ascii_lowercase();
        for (needle, category) in [
            ("unknownissuer", "tls_unknown_issuer"),
            ("certificate has expired", "tls_expired"),
            ("invalid peer certificate", "tls_certificate"),
            ("tls handshake", "tls_handshake"),
            ("temporary failure in name resolution", "dns_temporary"),
            ("too many open files", "file_descriptor_limit"),
            ("address family not supported", "address_family"),
            ("failed to lookup", "dns"),
            ("dns error", "dns"),
            ("name or service not known", "dns"),
            ("network is unreachable", "network_unreachable"),
            ("connection refused", "connection_refused"),
            ("connection reset", "connection_reset"),
            ("permission denied", "permission_denied"),
            ("cannot assign requested address", "address_unavailable"),
            ("timed out", "timeout"),
        ] {
            if message.contains(needle) {
                return category;
            }
        }
        cause = error.source();
    }
    "unclassified"
}

impl AppState {
    pub async fn source(
        &self,
        method: reqwest::Method,
        path: &str,
        access: Option<&str>,
        buyer: Option<&str>,
        body: Option<Value>,
    ) -> Result<Value> {
        let read_only = method == reqwest::Method::GET;
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
        if read_only {
            request = request.timeout(std::time::Duration::from_secs(10));
        }
        let mut retried = false;
        let response = loop {
            match request
                .try_clone()
                .ok_or_else(AppError::internal)?
                .send()
                .await
            {
                Ok(response) => break response,
                Err(error) => {
                    let retry = read_only
                        && !retried
                        && (error.is_connect() || error.is_timeout() || error.is_request());
                    // Never log the request URL, credentials or response body.
                    eprintln!(
                        "AriseSell transport failure: connect={} timeout={} request={} retry={} cause={}",
                        error.is_connect(),
                        error.is_timeout(),
                        error.is_request(),
                        retry,
                        transport_cause(&error)
                    );
                    if !retry {
                        return Err(AppError::new(
                            StatusCode::SERVICE_UNAVAILABLE,
                            "AriseSell is temporarily unavailable. Please retry.",
                        ));
                    }
                    retried = true;
                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                }
            }
        };
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

#[cfg(test)]
mod tests {
    use super::transport_cause;

    #[test]
    fn transport_diagnostics_only_emit_fixed_categories() {
        for (message, expected) in [
            (
                "invalid peer certificate: UnknownIssuer",
                "tls_unknown_issuer",
            ),
            ("certificate has expired", "tls_expired"),
            (
                "invalid peer certificate: NotValidForName",
                "tls_certificate",
            ),
            ("failed to lookup address information", "dns"),
            ("Temporary failure in name resolution", "dns_temporary"),
            ("Too many open files (os error 24)", "file_descriptor_limit"),
            ("Address family not supported by protocol", "address_family"),
            (
                "Network is unreachable (os error 101)",
                "network_unreachable",
            ),
            ("Connection refused (os error 111)", "connection_refused"),
            (
                "Connection reset by peer (os error 104)",
                "connection_reset",
            ),
            ("Permission denied (os error 13)", "permission_denied"),
            (
                "Cannot assign requested address (os error 99)",
                "address_unavailable",
            ),
            ("operation timed out", "timeout"),
            (
                "https://dummy.invalid/private?dummy-token=secret",
                "unclassified",
            ),
        ] {
            let error = std::io::Error::other(message);
            assert_eq!(transport_cause(&error), expected);
        }
    }
}
