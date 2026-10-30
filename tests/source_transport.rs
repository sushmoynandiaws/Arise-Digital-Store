use arise_digital_store::{AppState, Config, db::connect_pool};
use axum::http::StatusCode;
use reqwest::Method;
use serde_json::json;
use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

async fn fixture(
    status: u16,
    disconnect_first: bool,
) -> (AppState, Arc<AtomicUsize>, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let requests = Arc::new(AtomicUsize::new(0));
    let seen = requests.clone();
    let server = tokio::spawn(async move {
        loop {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut header = Vec::new();
            while !header.ends_with(b"\r\n\r\n") {
                let mut byte = [0];
                if stream.read(&mut byte).await.unwrap() == 0 {
                    break;
                }
                header.push(byte[0]);
                assert!(header.len() < 8192);
            }
            let header = String::from_utf8(header).unwrap().to_lowercase();
            assert!(header.contains(concat!(
                "user-agent: arisedigitalstore/",
                env!("CARGO_PKG_VERSION")
            )));
            assert!(
                header.contains(
                    "x-marketplace-key: dummy-bridge-key-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                )
            );
            assert!(header.contains("authorization: bearer dummy-access"));
            let attempt = seen.fetch_add(1, Ordering::SeqCst);
            if status == 0 || disconnect_first && attempt == 0 {
                continue;
            }
            let body = if status == 200 {
                r#"{"user":{"id":"dummy-user"}}"#
            } else {
                r#"{"detail":"Dummy permission or availability failure"}"#
            };
            let response = format!(
                "HTTP/1.1 {status} Fixture\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
            stream.write_all(response.as_bytes()).await.unwrap();
        }
    });
    let state = AppState::new(
        Config {
            origin: "http://localhost:8088".into(),
            source_api: format!("http://{address}"),
            source_web: "http://localhost:8111".into(),
            bridge_key: "dummy-bridge-key-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".into(),
            encryption_key: [7; 32],
            demo: true,
        },
        connect_pool("sqlite::memory:").await.unwrap(),
    )
    .unwrap();
    (state, requests, server)
}

#[tokio::test]
async fn source_get_recovers_one_transport_disconnect_with_same_authorization() {
    let (state, requests, server) = fixture(200, true).await;
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        state.source(
            Method::GET,
            "/marketplace/me",
            Some("dummy-access"),
            None,
            None,
        ),
    )
    .await
    .unwrap()
    .ok()
    .unwrap();
    assert_eq!(result["user"]["id"], "dummy-user");
    assert_eq!(requests.load(Ordering::SeqCst), 2);
    server.abort();
}

#[tokio::test]
async fn source_writes_never_replay_after_an_uncertain_transport_result() {
    for method in [Method::POST, Method::PUT, Method::DELETE] {
        let (state, requests, server) = fixture(200, true).await;
        let error = state
            .source(
                method,
                "/marketplace/token",
                Some("dummy-access"),
                None,
                Some(json!({"fixture":true})),
            )
            .await
            .unwrap_err();
        assert_eq!(error.0, StatusCode::SERVICE_UNAVAILABLE);
        assert_eq!(requests.load(Ordering::SeqCst), 1);
        server.abort();
    }
}

#[tokio::test]
async fn source_http_permission_and_business_failures_are_not_retried() {
    for status in [401, 403, 404, 429, 503] {
        let (state, requests, server) = fixture(status, false).await;
        let error = state
            .source(
                Method::GET,
                "/marketplace/me",
                Some("dummy-access"),
                None,
                None,
            )
            .await
            .unwrap_err();
        assert_eq!(error.0.as_u16(), status);
        assert_eq!(requests.load(Ordering::SeqCst), 1);
        server.abort();
    }
}

#[tokio::test]
async fn source_get_stops_after_a_single_retry_on_connection_failure() {
    let (state, requests, server) = fixture(0, true).await;
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        state.source(
            Method::GET,
            "/marketplace/me",
            Some("dummy-access"),
            None,
            None,
        ),
    )
    .await
    .unwrap();
    assert_eq!(result.unwrap_err().0, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(requests.load(Ordering::SeqCst), 2);
    server.abort();
}
