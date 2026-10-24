use arise_digital_store::{AppState, Config, app::router, digest, now, validate_origin};
use axum::{
    Json, Router,
    body::Body,
    http::{Request, StatusCode},
    response::IntoResponse,
    routing::{get, post},
};
use http_body_util::BodyExt;
use rusqlite::{Connection, params};
use serde_json::{Value, json};
use std::sync::{Arc, Mutex};
use tower::ServiceExt;

const SHOP: &str = "11111111-1111-4111-8111-111111111111";
const PRODUCT: &str = "22222222-2222-4222-8222-222222222222";
const BUYER: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
type Requests = Arc<Mutex<Vec<(String, Value)>>>;

async fn setup() -> (AppState, Requests, tokio::task::JoinHandle<()>) {
    let calls: Requests = Arc::new(Mutex::new(Vec::new()));
    let captured = calls.clone();
    let source=Router::new()
        .route("/api/v1/marketplace/feed",get(||async {Json(json!({"shops":[{"id":SHOP,"slug":"test-shop","name":"Test shop"}],"products":[{"id":PRODUCT,"shop_id":SHOP,"name":"Owned product"}]}))}))
        .route("/api/v1/marketplace/me",get(|headers:axum::http::HeaderMap|async move {
            if headers.get("authorization").and_then(|v|v.to_str().ok())==Some("Bearer revoked") {return (StatusCode::UNAUTHORIZED,Json(json!({"detail":"Session revoked"}))).into_response();}
            Json(json!({"user":{"id":"user-1","admin":headers.get("authorization").and_then(|v|v.to_str().ok())==Some("Bearer admin")},"shops":[]})).into_response()
        }))
        .route("/api/v1/marketplace/token",post(move |Json(body):Json<Value>| {let calls=captured.clone();async move {calls.lock().unwrap().push(("token".into(),body));Json(json!({"access_token":"seller-source-access","expires_in":3600}))}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let handle = tokio::spawn(async move {
        axum::serve(listener, source).await.unwrap();
    });
    let state = AppState::new(
        Config {
            origin: "http://localhost:8088".into(),
            source_api: format!("http://{address}/api/v1"),
            source_web: "http://localhost:8111".into(),
            bridge_key: "test-key-at-least-32-characters-long".into(),
            encryption_key: [8; 32],
            demo: true,
        },
        Connection::open_in_memory().unwrap(),
    )
    .ok()
    .unwrap();
    (state, calls, handle)
}
async fn body(response: axum::response::Response) -> Value {
    serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap()
}
fn write(path: &str, payload: Value) -> Request<Body> {
    Request::builder()
        .method("PUT")
        .uri(path)
        .header("Origin", "http://localhost:8088")
        .header("Cookie", format!("arise_buyer={BUYER}"))
        .header("X-CSRF-Token", digest(BUYER))
        .header("Content-Type", "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap()
}
fn sign_in(state: &AppState, access: &str) -> String {
    let session = "b".repeat(64);
    state
        .db
        .lock()
        .unwrap()
        .execute(
            "INSERT INTO sessions VALUES(?1,?2,?3)",
            params![
                digest(&session),
                state.seal(access).ok().unwrap(),
                now() + 3600
            ],
        )
        .unwrap();
    session
}

#[tokio::test]
async fn csrf_requires_both_same_origin_and_cookie_bound_token() {
    let (state, _, server) = setup().await;
    let app = router(state);
    let mut request = write("/api/admin/moderation", json!({}));
    request
        .headers_mut()
        .insert("Origin", "https://attacker.test".parse().unwrap());
    assert_eq!(
        app.clone().oneshot(request).await.unwrap().status(),
        StatusCode::FORBIDDEN
    );
    let mut request = write("/api/admin/moderation", json!({}));
    request.headers_mut().remove("X-CSRF-Token");
    assert_eq!(
        app.clone().oneshot(request).await.unwrap().status(),
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        app.oneshot(write(
            "/api/admin/moderation",
            json!({"kind":"shop","target_id":SHOP,"hidden":true,"reason":"test reason"})
        ))
        .await
        .unwrap()
        .status(),
        StatusCode::UNAUTHORIZED
    );
    server.abort();
}

#[tokio::test]
async fn guest_session_is_httponly_no_store_and_has_a_bound_csrf_token() {
    let (state, _, server) = setup().await;
    let response = router(state)
        .oneshot(
            Request::builder()
                .uri("/api/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let cookie = response.headers()["set-cookie"]
        .to_str()
        .unwrap()
        .to_owned();
    assert!(cookie.contains("HttpOnly") && cookie.contains("SameSite=Lax"));
    assert_eq!(response.headers()["cache-control"], "no-store");
    let token = cookie.split(';').next().unwrap().split('=').nth(1).unwrap();
    let data = body(response).await;
    assert_eq!(data["csrf"], digest(token));
    assert!(data["user"].is_null());
    server.abort();
}

#[tokio::test]
async fn source_tokens_are_encrypted_and_tampering_is_rejected() {
    let (state, _, server) = setup().await;
    let first = state.seal("PRIVATE-SOURCE-ACCESS-TOKEN").ok().unwrap();
    let second = state.seal("PRIVATE-SOURCE-ACCESS-TOKEN").ok().unwrap();
    assert_ne!(first, second);
    assert!(!first.contains("PRIVATE-SOURCE"));
    assert_eq!(
        state.unseal(&first).ok().unwrap(),
        "PRIVATE-SOURCE-ACCESS-TOKEN"
    );
    let changed = if first.starts_with('A') { 'B' } else { 'A' };
    assert!(state.unseal(&format!("{changed}{}", &first[1..])).is_err());
    let session = sign_in(&state, "PRIVATE-SOURCE-ACCESS-TOKEN");
    assert_eq!(
        state.access_token(Some(&session)).ok().flatten().unwrap(),
        "PRIVATE-SOURCE-ACCESS-TOKEN"
    );
    assert!(
        state
            .access_token(Some(&"c".repeat(64)))
            .ok()
            .flatten()
            .is_none()
    );
    server.abort();
}

#[tokio::test]
async fn pkce_callback_is_state_bound_single_use_and_hides_source_tokens() {
    let (state, calls, server) = setup().await;
    let app = router(state.clone());
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/auth/start")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let url = url::Url::parse(response.headers()["location"].to_str().unwrap()).unwrap();
    let values: std::collections::HashMap<_, _> = url
        .query_pairs()
        .map(|(a, b)| (a.into_owned(), b.into_owned()))
        .collect();
    let nonce = &values["state"];
    let path = format!("/api/auth/callback?state={nonce}&code=one-time-code");
    let bad = app
        .clone()
        .oneshot(Request::builder().uri(&path).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(bad.status(), StatusCode::SEE_OTHER);
    assert_eq!(bad.headers()["location"], "/seller?connection=retry");
    assert!(calls.lock().unwrap().is_empty());
    let request = || {
        Request::builder()
            .uri(&path)
            .header("Cookie", format!("arise_auth_state={nonce}"))
            .body(Body::empty())
            .unwrap()
    };
    let response = app.clone().oneshot(request()).await.unwrap();
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    assert_eq!(response.headers()["location"], "/seller");
    assert!(!format!("{:?}", response.headers()).contains("seller-source-access"));
    assert_eq!(
        app.oneshot(request()).await.unwrap().headers()["location"],
        "/seller?connection=retry"
    );
    let calls = calls.lock().unwrap();
    assert_eq!(calls.len(), 1);
    assert_eq!(
        digest(calls[0].1["code_verifier"].as_str().unwrap()),
        values["code_challenge"]
    );
    server.abort();
}

#[tokio::test]
async fn customer_sign_in_returns_to_purchases_and_rejects_external_destinations() {
    let (state, _, server) = setup().await;
    let app = router(state);
    let rejected = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/auth/start?return_to=https%3A%2F%2Fattacker.test")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(rejected.status(), StatusCode::BAD_REQUEST);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/auth/start?return_to=%2Fpurchases")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let url = url::Url::parse(response.headers()["location"].to_str().unwrap()).unwrap();
    let nonce = url
        .query_pairs()
        .find(|(key, _)| key == "state")
        .unwrap()
        .1
        .into_owned();
    let response = app
        .oneshot(
            Request::builder()
                .uri(format!(
                    "/api/auth/callback?state={nonce}&code=customer-code"
                ))
                .header("Cookie", format!("arise_auth_state={nonce}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.headers()["location"], "/purchases");
    server.abort();
}

#[tokio::test]
async fn moderation_requires_admin_and_removes_hidden_products_from_browse_and_checkout() {
    let (state, _, server) = setup().await;
    let app = router(state.clone());
    let session = sign_in(&state, "seller");
    let payload = json!({"kind":"product","target_id":PRODUCT,"hidden":true,"reason":"Reported test listing"});
    let mut request = write("/api/admin/moderation", payload.clone());
    request.headers_mut().insert(
        "Cookie",
        format!("arise_buyer={BUYER}; arise_session={session}")
            .parse()
            .unwrap(),
    );
    assert_eq!(
        app.clone().oneshot(request).await.unwrap().status(),
        StatusCode::FORBIDDEN
    );
    state
        .db
        .lock()
        .unwrap()
        .execute("DELETE FROM sessions", [])
        .unwrap();
    let session = sign_in(&state, "admin");
    let mut request = write("/api/admin/moderation", payload);
    request.headers_mut().insert(
        "Cookie",
        format!("arise_buyer={BUYER}; arise_session={session}")
            .parse()
            .unwrap(),
    );
    assert_eq!(
        app.clone().oneshot(request).await.unwrap().status(),
        StatusCode::OK
    );
    let data = body(
        app.clone()
            .oneshot(
                Request::builder()
                    .uri("/api/catalog")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap(),
    )
    .await;
    assert!(data["products"].as_array().unwrap().is_empty());
    let mut request = write(
        "/api/checkout/accept",
        json!({"product_id":PRODUCT,"shop_id":SHOP}),
    );
    *request.method_mut() = axum::http::Method::POST;
    assert_eq!(
        app.oneshot(request).await.unwrap().status(),
        StatusCode::CONFLICT
    );
    server.abort();
}

#[tokio::test]
async fn source_failure_never_falls_back_to_a_fake_catalog() {
    let (state, _, server) = setup().await;
    server.abort();
    tokio::task::yield_now().await;
    let response = router(state)
        .oneshot(
            Request::builder()
                .uri("/api/catalog")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert!(!body(response).await.to_string().contains("Owned product"));
}

#[tokio::test]
async fn logout_removes_account_session_and_rotates_the_private_buyer_capability() {
    let (state, _, server) = setup().await;
    let session = sign_in(&state, "seller");
    let mut request = write("/api/auth/logout", json!({}));
    *request.method_mut() = axum::http::Method::POST;
    request.headers_mut().insert(
        "Cookie",
        format!("arise_buyer={BUYER}; arise_session={session}")
            .parse()
            .unwrap(),
    );
    let response = router(state.clone()).oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let cookies: Vec<_> = response
        .headers()
        .get_all("set-cookie")
        .iter()
        .map(|v| v.to_str().unwrap())
        .collect();
    assert!(
        cookies
            .iter()
            .any(|c| c.starts_with("arise_session=;") && c.contains("Max-Age=0"))
    );
    assert!(
        cookies
            .iter()
            .any(|c| c.starts_with("arise_buyer=") && !c.contains(BUYER))
    );
    assert!(state.access_token(Some(&session)).ok().flatten().is_none());
    server.abort();
}

#[tokio::test]
async fn revoked_source_login_clears_both_account_access_and_old_guest_capability() {
    let (state, _, server) = setup().await;
    let session = sign_in(&state, "revoked");
    let response = router(state.clone())
        .oneshot(
            Request::builder()
                .uri("/api/session")
                .header(
                    "Cookie",
                    format!("arise_buyer={BUYER}; arise_session={session}"),
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let cookies: Vec<_> = response
        .headers()
        .get_all("set-cookie")
        .iter()
        .map(|v| v.to_str().unwrap())
        .collect();
    assert!(
        cookies
            .iter()
            .any(|c| c.starts_with("arise_session=;") && c.contains("Max-Age=0"))
    );
    assert!(
        cookies
            .iter()
            .any(|c| c.starts_with("arise_buyer=") && !c.contains(BUYER))
    );
    let data = body(response).await;
    assert!(data["user"].is_null());
    assert_ne!(data["csrf"], digest(BUYER));
    assert!(state.access_token(Some(&session)).ok().flatten().is_none());
    server.abort();
}

#[test]
fn url_configuration_rejects_insecure_remote_origins_and_credentials() {
    for url in [
        "http://attacker.test",
        "https://user:password@example.test",
        "https://example.test?token=secret",
        "javascript:alert(1)",
    ] {
        assert!(validate_origin(url).is_err());
    }
    for url in [
        "https://arisesell.com/api/v1",
        "http://localhost:8111/api/v1",
        "http://127.0.0.1:8088",
    ] {
        assert!(validate_origin(url).is_ok());
    }
}
