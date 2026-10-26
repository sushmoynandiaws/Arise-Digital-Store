use arise_digital_store::db::connect_pool;
use arise_digital_store::{AppState, Config, app::router, digest, now, validate_origin};
use axum::{
    Json, Router,
    body::Body,
    http::{Request, StatusCode},
    response::IntoResponse,
    routing::{get, post},
};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use std::sync::{Arc, Mutex};
use tower::ServiceExt;

const SHOP: &str = "11111111-1111-4111-8111-111111111111";
const PRODUCT: &str = "22222222-2222-4222-8222-222222222222";
const BUYER: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
type Requests = Arc<Mutex<Vec<(String, Value)>>>;

fn postgres_test_url() -> Option<String> {
    let value = std::env::var("MARKETPLACE_TEST_DATABASE_URL").ok()?;
    let parsed = url::Url::parse(&value).unwrap();
    assert_eq!(
        parsed.path(),
        "/arise_marketplace_test",
        "Tests may reset only their disposable database"
    );
    assert!(matches!(parsed.host_str(), Some("localhost" | "127.0.0.1")));
    Some(value)
}
async fn metadata_pool() -> sqlx::AnyPool {
    connect_pool("sqlite::memory:").await.unwrap()
}

async fn setup() -> (AppState, Requests, tokio::task::JoinHandle<()>) {
    setup_with_pool(metadata_pool().await).await
}

async fn setup_with_pool(pool: sqlx::AnyPool) -> (AppState, Requests, tokio::task::JoinHandle<()>) {
    let calls: Requests = Arc::new(Mutex::new(Vec::new()));
    let captured = calls.clone();
    let listing_calls = calls.clone();
    let source=Router::new()
        .route("/api/v1/marketplace/feed",get(||async {Json(json!({"shops":[{"id":SHOP,"slug":"test-shop","name":"Test shop"}],"products":[{"id":PRODUCT,"shop_id":SHOP,"name":"Owned product"}]}))}))
        .route("/api/v1/marketplace/me",get(|headers:axum::http::HeaderMap|async move {
            if headers.get("authorization").and_then(|v|v.to_str().ok())==Some("Bearer revoked") {return (StatusCode::UNAUTHORIZED,Json(json!({"detail":"Session revoked"}))).into_response();}
            Json(json!({"user":{"id":"user-1","admin":headers.get("authorization").and_then(|v|v.to_str().ok())==Some("Bearer admin")},"shops":[]})).into_response()
        }))
        .route("/api/v1/marketplace/admin/users",get(||async {Json(json!({"users":[{"id":"66666666-6666-4666-8666-666666666666","name":"Other administrator","email":"admin@example.test"}]}))}))
        .route("/api/v1/marketplace/admin/orders",get(||async {Json(json!({"orders":[],"summary":{"total":0,"paid":0,"payment_issues":0,"delivery_issues":0},"has_more":false,"checked_at":"2026-10-26T12:00:00Z"}))}))
        .route("/api/v1/marketplace/orders/{id}", get(|axum::extract::Path(id): axum::extract::Path<String>, headers: axum::http::HeaderMap| async move {
            if headers.get("X-Marketplace-Buyer").and_then(|v|v.to_str().ok()) != Some(BUYER) {
                return (StatusCode::NOT_FOUND, Json(json!({"detail":"Purchase not found"}))).into_response();
            }
            Json(json!({"id":id,"product_id":PRODUCT,"shop":{"id":SHOP},"name":"Owned product",
                "buyer_name":"Private checkout buyer",
                "payment_status":if id.starts_with('4') {"unpaid"} else {"paid"},
                "delivery_status":if id.starts_with('5') {"queued"} else {"delivered"},
                "private_secret":"must not appear in public reviews"})).into_response()
        }))
        .route("/api/v1/marketplace/stores/{id}/catalog", get(|axum::extract::Path(id): axum::extract::Path<String>| async move {
            Json(json!({"shop":{"id":id,"name":"Test shop"},"products":[]}))
        }))
        .route("/api/v1/marketplace/stores/{id}/listing", axum::routing::put(move |axum::extract::Path(id): axum::extract::Path<String>, headers: axum::http::HeaderMap, Json(body): Json<Value>| {
            let calls = listing_calls.clone();
            async move {
                if id != SHOP || headers.get("authorization").and_then(|v| v.to_str().ok()) != Some("Bearer seller-source-access") {
                    return (StatusCode::NOT_FOUND, Json(json!({"detail":"Shop not found"}))).into_response();
                }
                calls.lock().unwrap().push(("listing".into(), body));
                Json(json!({"shop":{"id":id,"name":"Test shop"}})).into_response()
            }
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
        pool,
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
async fn sign_in(state: &AppState, access: &str) -> String {
    let session = "b".repeat(64);
    sqlx::query("INSERT INTO sessions VALUES($1,$2,$3)")
        .bind(digest(&session))
        .bind(state.seal(access).ok().unwrap())
        .bind(now() + 3600)
        .execute(&state.db)
        .await
        .unwrap();
    session
}

fn admin_request(method: &str, path: &str, session: &str, data: Value) -> Request<Body> {
    let mut request=write(path,data);
    *request.method_mut()=method.parse().unwrap();
    request.headers_mut().insert("Cookie",format!("arise_buyer={BUYER}; arise_session={session}").parse().unwrap());
    request
}
fn campaign() -> Value { json!({"id":"77777777-7777-4777-8777-777777777777","title":"Sample course access","advertiser_name":"Sample advertiser","target_url":"/products","banner_url":"","badge_text":"Sponsored","cta_text":"View details","placement":"home_hero","start_date":"2020-01-01","end_date":"2099-12-31","price_bdt":500,"status":"active","created_at":0}) }

#[tokio::test]
async fn admin_routes_reject_regular_accounts_even_with_forged_local_role() {
    let (state,_,server)=setup().await;
    let session=sign_in(&state,"seller-source-access").await;
    sqlx::query("INSERT INTO admin_roles VALUES('user-1','owner')").execute(&state.db).await.unwrap();
    let app=router(state.clone());
    for path in ["/api/admin","/api/admin/orders","/api/admin/access","/api/admin/activity","/api/admin/reviews","/api/admin/notes?target_type=report&target_id=22222222-2222-4222-8222-222222222222","/api/admin/health","/api/admin/documents/settings","/api/admin/documents/campaigns"] {
        assert_eq!(app.clone().oneshot(admin_request("GET",path,&session,json!({}))).await.unwrap().status(),StatusCode::FORBIDDEN,"{path}");
    }
    for (method,path,data) in [
        ("PUT","/api/admin/documents/settings",json!({"revision":0,"content":{}})),
        ("PUT","/api/admin/access/66666666-6666-4666-8666-666666666666",json!({"role":"owner"})),
        ("POST","/api/admin/notes",json!({"target_type":"report","target_id":PRODUCT,"content":"forbidden"})),
        ("PUT","/api/admin/reviews/66666666-6666-4666-8666-666666666666/visibility",json!({"hidden":true,"reason":"forbidden action"})),
    ] {assert_eq!(app.clone().oneshot(admin_request(method,path,&session,data)).await.unwrap().status(),StatusCode::FORBIDDEN,"{path}");}
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT COUNT(*) FROM admin_activity").fetch_one(&state.db).await.unwrap(),0);
    let guest=app.oneshot(Request::builder().uri("/api/admin").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(guest.status(),StatusCode::UNAUTHORIZED);
    server.abort();
}

#[tokio::test]
async fn campaigns_persist_validate_urls_detect_conflicts_and_count_real_deduplicated_events() {
    let (state,_,server)=setup().await;let session=sign_in(&state,"admin").await;let app=router(state.clone());
    let save=|revision,ads|admin_request("PUT","/api/admin/documents/campaigns",&session,json!({"revision":revision,"content":ads}));
    assert_eq!(app.clone().oneshot(save(0,json!([campaign()]))).await.unwrap().status(),StatusCode::OK);
    assert_eq!(app.clone().oneshot(save(0,json!([]))).await.unwrap().status(),StatusCode::CONFLICT);
    let mut bad=campaign();bad["target_url"]=json!("javascript:alert(1)");
    assert_eq!(app.clone().oneshot(save(1,json!([bad]))).await.unwrap().status(),StatusCode::UNPROCESSABLE_ENTITY);
    let mut bad=campaign();bad["end_date"]=json!("2026-02-30");
    assert_eq!(app.clone().oneshot(save(1,json!([bad]))).await.unwrap().status(),StatusCode::UNPROCESSABLE_ENTITY);
    let public=body(app.clone().oneshot(Request::builder().uri("/api/promotions").body(Body::empty()).unwrap()).await.unwrap()).await;
    assert_eq!(public["ads"][0]["title"],"Sample course access");assert!(public["ads"][0].get("price_bdt").is_none());
    for _ in 0..2 {assert_eq!(app.clone().oneshot(admin_request("POST","/api/promotions/77777777-7777-4777-8777-777777777777/events",&session,json!({"kind":"impression"}))).await.unwrap().status(),StatusCode::OK);}
    let doc=body(app.clone().oneshot(admin_request("GET","/api/admin/documents/campaigns",&session,json!({}))).await.unwrap()).await;
    assert_eq!(doc["content"][0]["impressions"],1);assert_eq!(doc["content"][0]["clicks"],0);assert_eq!(doc["revision"],1);
    assert_eq!(app.clone().oneshot(save(1,json!([]))).await.unwrap().status(),StatusCode::OK);
    let empty=body(router(state.clone()).oneshot(Request::builder().uri("/api/promotions").body(Body::empty()).unwrap()).await.unwrap()).await;
    assert_eq!(empty["ads"],json!([]));
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT COUNT(*) FROM admin_activity").fetch_one(&state.db).await.unwrap(),2);
    server.abort();
}

#[tokio::test]
async fn platform_content_is_persistent_audited_and_rejects_unsafe_links() {
    let (state,_,server)=setup().await;let session=sign_in(&state,"admin").await;let app=router(state.clone());
    let data=json!({"hero_title":"Actual platform title","pages":{"privacy":"Platform policy. বাংলা"},"announcement":"Marketplace update","announcement_url":"/products","support_email":"help@example.test"});
    assert_eq!(app.clone().oneshot(admin_request("PUT","/api/admin/documents/settings",&session,json!({"revision":0,"content":data}))).await.unwrap().status(),StatusCode::OK);
    let public=body(router(state.clone()).oneshot(Request::builder().uri("/api/promotions").body(Body::empty()).unwrap()).await.unwrap()).await;
    assert_eq!(public["settings"],data);
    assert_eq!(app.clone().oneshot(admin_request("PUT","/api/admin/documents/settings",&session,json!({"revision":1,"content":{"announcement_url":"//evil.example"}}))).await.unwrap().status(),StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(app.clone().oneshot(admin_request("PUT","/api/admin/documents/settings",&session,json!({"revision":1,"content":{"unknown":"field"}}))).await.unwrap().status(),StatusCode::UNPROCESSABLE_ENTITY);
    let activity=body(app.oneshot(admin_request("GET","/api/admin/activity",&session,json!({}))).await.unwrap()).await;
    assert_eq!(activity["activity"][0]["action"],"document.saved");
    assert!(!activity.to_string().contains("Bearer"));server.abort();
}

#[tokio::test]
async fn support_roles_are_server_enforced_and_blocked_accounts_lose_admin_session_flag() {
    let (state,_,server)=setup().await;let session=sign_in(&state,"admin").await;let app=router(state.clone());
    sqlx::query("INSERT INTO admin_roles VALUES('user-1','support')").execute(&state.db).await.unwrap();
    assert_eq!(app.clone().oneshot(admin_request("GET","/api/admin/orders",&session,json!({}))).await.unwrap().status(),StatusCode::OK);
    assert_eq!(app.clone().oneshot(admin_request("GET","/api/admin/documents/campaigns",&session,json!({}))).await.unwrap().status(),StatusCode::FORBIDDEN);
    assert_eq!(app.clone().oneshot(admin_request("PUT","/api/admin/moderation",&session,json!({"kind":"shop","target_id":SHOP,"hidden":true,"reason":"Not allowed for support"}))).await.unwrap().status(),StatusCode::FORBIDDEN);
    let note=json!({"target_type":"order","target_id":PRODUCT,"content":"Follow up with seller; no secrets stored."});
    assert_eq!(app.clone().oneshot(admin_request("POST","/api/admin/notes",&session,note)).await.unwrap().status(),StatusCode::OK);
    let notes=body(app.clone().oneshot(admin_request("GET",&format!("/api/admin/notes?target_type=order&target_id={PRODUCT}"),&session,json!({}))).await.unwrap()).await;
    assert_eq!(notes["notes"].as_array().unwrap().len(),1);
    sqlx::query("UPDATE admin_roles SET role='blocked'").execute(&state.db).await.unwrap();
    assert_eq!(app.clone().oneshot(admin_request("GET","/api/admin",&session,json!({}))).await.unwrap().status(),StatusCode::FORBIDDEN);
    let me=body(app.oneshot(admin_request("GET","/api/session",&session,json!({}))).await.unwrap()).await;
    assert_eq!(me["user"]["admin"],false);server.abort();
}

#[tokio::test]
async fn admin_review_hiding_updates_public_counts_without_editing_customer_content() {
    let (state,_,server)=setup().await;let session=sign_in(&state,"admin").await;let app=router(state.clone());
    let id="88888888-8888-4888-8888-888888888888";
    sqlx::query("INSERT INTO reviews VALUES($1,$2,$3,$4,5,'Real buyer','A real verified customer comment',1)").bind(id).bind(id).bind(PRODUCT).bind(SHOP).execute(&state.db).await.unwrap();
    let request=|hidden| admin_request("PUT",&format!("/api/admin/reviews/{id}/visibility"),&session,json!({"hidden":hidden,"reason":"Customer report reviewed"}));
    assert_eq!(app.clone().oneshot(request(true)).await.unwrap().status(),StatusCode::OK);
    let public=body(app.clone().oneshot(Request::builder().uri(format!("/api/products/{PRODUCT}/reviews")).body(Body::empty()).unwrap()).await.unwrap()).await;
    assert_eq!(public["count"],0);assert_eq!(public["average"],Value::Null);
    assert_eq!(app.clone().oneshot(request(false)).await.unwrap().status(),StatusCode::OK);
    let public=body(app.oneshot(Request::builder().uri(format!("/api/products/{PRODUCT}/reviews")).body(Body::empty()).unwrap()).await.unwrap()).await;
    assert_eq!(public["count"],1);assert_eq!(public["reviews"][0]["comment"],"A real verified customer comment");server.abort();
}

#[tokio::test]
async fn shop_pages_are_validated_owned_persistent_and_shop_scoped() {
    let (state, calls, server) = setup().await;
    let session = sign_in(&state, "seller-source-access").await;
    let app = router(state.clone());
    let save = |id: &str, payload: Value| {
        let mut request = write(&format!("/api/seller/stores/{id}/listing"), payload);
        request.headers_mut().insert(
            "Cookie",
            format!("arise_buyer={BUYER}; arise_session={session}")
                .parse()
                .unwrap(),
        );
        request
    };
    let pages = json!({"privacy":"Customer details stay private.\n\nবাংলা নীতিমালা", "returns":"Contact us before requesting a refund.", "terms":"Read the product terms.", "about":"Our digital shop.", "contact":"Email support@example.test"});
    let payload = json!({"name":"Test shop", "published":true, "pages":pages});
    let response = app
        .clone()
        .oneshot(save(SHOP, payload.clone()))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(body(response).await["shop"]["pages"], pages);
    let forwarded = calls
        .lock()
        .unwrap()
        .iter()
        .find(|(kind, _)| kind == "listing")
        .unwrap()
        .1
        .clone();
    assert!(forwarded.get("pages").is_none());
    assert_eq!(forwarded["name"], "Test shop");

    let read = |path: &str| {
        Request::builder()
            .uri(path)
            .header(
                "Cookie",
                format!("arise_buyer={BUYER}; arise_session={session}"),
            )
            .body(Body::empty())
            .unwrap()
    };
    let saved = body(
        app.clone()
            .oneshot(read(&format!("/api/seller/stores/{SHOP}/catalog")))
            .await
            .unwrap(),
    )
    .await;
    assert_eq!(saved["shop"]["pages"], pages);
    // Old callers omitting pages must not erase saved information.
    assert_eq!(
        app.clone()
            .oneshot(save(SHOP, json!({"name":"Updated shop"})))
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    let foreign_id = "66666666-6666-4666-8666-666666666666";
    assert_eq!(
        app.clone()
            .oneshot(save(foreign_id, payload))
            .await
            .unwrap()
            .status(),
        StatusCode::NOT_FOUND
    );
    let foreign_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM shop_pages WHERE shop_id=$1")
        .bind(foreign_id)
        .fetch_one(&state.db)
        .await
        .unwrap();
    assert_eq!(foreign_count, 0);
    for invalid in [
        json!(null),
        json!("text"),
        json!({"unknown":"text"}),
        json!({"privacy":42}),
        json!({"terms":"ক".repeat(3001)}),
    ] {
        assert_eq!(
            app.clone()
                .oneshot(save(SHOP, json!({"pages":invalid})))
                .await
                .unwrap()
                .status(),
            StatusCode::UNPROCESSABLE_ENTITY
        );
    }
    assert_eq!(
        app.clone()
            .oneshot(write(
                &format!("/api/seller/stores/{SHOP}/listing"),
                json!({"pages":{}})
            ))
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    // Unpublished metadata is never added as a new public shop.
    sqlx::query("INSERT INTO shop_pages(shop_id,content) VALUES($1,$2)")
        .bind(foreign_id)
        .bind(json!({"about":"Private unpublished shop"}).to_string())
        .execute(&state.db)
        .await
        .unwrap();
    let public = body(app.clone().oneshot(read("/api/catalog")).await.unwrap()).await;
    assert_eq!(public["shops"].as_array().unwrap().len(), 1);
    assert_eq!(public["shops"][0]["pages"], pages);
    assert!(!public.to_string().contains("Private unpublished shop"));
    let cleared = app
        .clone()
        .oneshot(save(SHOP, json!({"pages":{"privacy":""}})))
        .await
        .unwrap();
    assert_eq!(cleared.status(), StatusCode::OK);
    let public = body(app.oneshot(read("/api/catalog")).await.unwrap()).await;
    assert_eq!(public["shops"][0]["pages"], json!({"privacy":""}));
    server.abort();
}

#[tokio::test]
async fn reviews_require_an_owned_paid_delivered_purchase_and_never_leak_order_data() {
    let (state, _, server) = setup().await;
    let app = router(state.clone());
    let get_reviews = || {
        Request::builder()
            .uri(format!("/api/products/{PRODUCT}/reviews"))
            .body(Body::empty())
            .unwrap()
    };
    let empty = body(app.clone().oneshot(get_reviews()).await.unwrap()).await;
    assert_eq!(empty["count"], 0);
    assert!(empty["average"].is_null());
    let input =
        json!({"rating":5,"display_name":"ক্রেতা","comment":"The product arrived as described."});
    let review_request = |id: &str, data: Value| {
        let mut request = write(&format!("/api/orders/{id}/review"), data);
        *request.method_mut() = axum::http::Method::POST;
        request
    };
    for id in [
        "44444444-4444-4444-8444-444444444444",
        "55555555-5555-4555-8555-555555555555",
    ] {
        assert_eq!(
            app.clone()
                .oneshot(review_request(id, input.clone()))
                .await
                .unwrap()
                .status(),
            StatusCode::CONFLICT
        );
    }
    let id = "33333333-3333-4333-8333-333333333333";
    let mut invalid = input.clone();
    invalid["rating"] = json!(6);
    assert_eq!(
        app.clone()
            .oneshot(review_request(id, invalid))
            .await
            .unwrap()
            .status(),
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let mut wrong_product = input.clone();
    wrong_product["product_id"] = json!(PRODUCT);
    assert_eq!(
        app.clone()
            .oneshot(review_request(id, wrong_product))
            .await
            .unwrap()
            .status(),
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let other_buyer = "c".repeat(64);
    let mut foreign = review_request(id, input.clone());
    foreign.headers_mut().insert(
        "Cookie",
        format!("arise_buyer={other_buyer}").parse().unwrap(),
    );
    foreign
        .headers_mut()
        .insert("X-CSRF-Token", digest(&other_buyer).parse().unwrap());
    assert_eq!(
        app.clone().oneshot(foreign).await.unwrap().status(),
        StatusCode::NOT_FOUND
    );
    let response = app
        .clone()
        .oneshot(review_request(id, input.clone()))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let first = body(response).await;
    assert_eq!(first["rating"], 5);
    let mut update = input;
    update["rating"] = json!(3);
    let updated = body(
        app.clone()
            .oneshot(review_request(id, update))
            .await
            .unwrap(),
    )
    .await;
    assert_eq!(updated["id"], first["id"]);
    let public = body(app.clone().oneshot(get_reviews()).await.unwrap()).await;
    assert_eq!(public["count"], 1);
    assert_eq!(public["average"], 3.0);
    assert_eq!(public["reviews"].as_array().unwrap().len(), 1);
    assert!(!public.to_string().contains(id));
    assert!(!public.to_string().contains("private_secret"));
    assert!(!public.to_string().contains("Private checkout buyer"));
    let owned = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/orders/{id}"))
                .header("Cookie", format!("arise_buyer={BUYER}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let owned = body(owned).await;
    assert_eq!(owned["buyer_name"], "Private checkout buyer");
    assert_eq!(owned["can_review"], true);
    assert_eq!(owned["review"]["rating"], 3);
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM reviews")
            .fetch_one(&state.db)
            .await
            .unwrap(),
        1
    );
    server.abort();
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
    let session = sign_in(&state, "PRIVATE-SOURCE-ACCESS-TOKEN").await;
    assert_eq!(
        state
            .access_token(Some(&session))
            .await
            .ok()
            .flatten()
            .unwrap(),
        "PRIVATE-SOURCE-ACCESS-TOKEN"
    );
    assert!(
        state
            .access_token(Some(&"c".repeat(64)))
            .await
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
    let session = sign_in(&state, "seller").await;
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
    sqlx::query("DELETE FROM sessions")
        .execute(&state.db)
        .await
        .unwrap();
    let session = sign_in(&state, "admin").await;
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
    let session = sign_in(&state, "seller").await;
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
    assert!(
        state
            .access_token(Some(&session))
            .await
            .ok()
            .flatten()
            .is_none()
    );
    server.abort();
}

#[tokio::test]
async fn revoked_source_login_clears_both_account_access_and_old_guest_capability() {
    let (state, _, server) = setup().await;
    let session = sign_in(&state, "revoked").await;
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
    assert!(
        state
            .access_token(Some(&session))
            .await
            .ok()
            .flatten()
            .is_none()
    );
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

#[tokio::test]
async fn rate_limits_admit_only_the_allowed_number_under_concurrent_requests() {
    let (state, _, server) = setup().await;
    let mut requests = Vec::new();
    for _ in 0..20 {
        let state = state.clone();
        requests.push(tokio::spawn(async move {
            state.rate_limit("concurrent-client", 5).await.is_ok()
        }));
    }
    let mut admitted = 0;
    for request in requests {
        admitted += usize::from(request.await.unwrap());
    }
    assert_eq!(admitted, 5);
    server.abort();
}

#[tokio::test]
async fn serverless_api_preserves_public_paths_and_never_serves_a_storefront_fallback() {
    let (state, _, server) = setup().await;
    let app = arise_digital_store::app::api_router(state);
    for (path, expected) in [
        ("/health", StatusCode::OK),
        ("/api/catalog", StatusCode::OK),
        ("/api/unknown", StatusCode::NOT_FOUND),
        ("/shops/test-shop", StatusCode::NOT_FOUND),
    ] {
        let response = app
            .clone()
            .oneshot(Request::builder().uri(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), expected);
        assert!(
            response.headers()["content-type"]
                .to_str()
                .unwrap()
                .starts_with("application/json")
        );
    }
    server.abort();
}

#[tokio::test]
async fn only_native_vercel_ingress_uses_platform_forwarded_client_ips() {
    let (state, _, server) = setup().await;
    let request = || {
        Request::builder()
            .uri("/api/auth/start")
            .header("x-forwarded-for", "203.0.113.5")
            .body(Body::empty())
            .unwrap()
    };
    assert_eq!(
        arise_digital_store::app::api_router(state.clone())
            .oneshot(request())
            .await
            .unwrap()
            .status(),
        StatusCode::SEE_OTHER
    );
    assert_eq!(
        router(state.clone())
            .oneshot(request())
            .await
            .unwrap()
            .status(),
        StatusCode::SEE_OTHER
    );
    let forwarded: i64 = sqlx::query_scalar("SELECT attempts FROM rate_limits WHERE bucket=$1")
        .bind("ip:203.0.113.5")
        .fetch_one(&state.db)
        .await
        .unwrap();
    assert_eq!(forwarded, 1);
    let direct: i64 = sqlx::query_scalar("SELECT attempts FROM rate_limits WHERE bucket=$1")
        .bind("ip:test")
        .fetch_one(&state.db)
        .await
        .unwrap();
    assert_eq!(direct, 1);
    server.abort();
}

#[tokio::test]
async fn production_runtime_refuses_demo_or_loopback_commerce_origins() {
    let (state, _, server) = setup().await;
    let mut config = (*state.config).clone();
    assert!(config.validate_serverless(false).is_err());
    assert!(config.validate_serverless(true).is_ok());
    config.demo = false;
    config.origin = "https://store.example.test".into();
    config.source_api = "https://arisesell.com/api/v1".into();
    config.source_web = "https://arisesell.com".into();
    assert!(config.validate_serverless(false).is_ok());
    config.demo = true;
    assert!(config.validate_serverless(true).is_err());
    server.abort();
}

#[test]
fn serverless_storage_rejects_ephemeral_files_and_unverified_remote_database_connections() {
    use arise_digital_store::db::validate_database_url;
    assert!(validate_database_url("sqlite::memory:", true).is_err());
    assert!(
        validate_database_url(
            "postgresql://user@remote.example/store?sslmode=verify-full&sslmode=disable",
            true
        )
        .is_err()
    );
    assert!(
        validate_database_url(
            "postgresql://user:secret@remote.example/store?sslmode=disable",
            true
        )
        .is_err()
    );
    assert!(validate_database_url("postgresql+asyncpg://user@remote.example/store", true).is_err());
    assert!(
        validate_database_url(
            "postgresql://user:secret@remote.example/store?sslmode=verify-full",
            true
        )
        .is_ok()
    );
    assert!(
        validate_database_url(
            "postgresql://user@127.0.0.1:55438/arise_marketplace_test",
            true
        )
        .is_ok()
    );
    assert!(validate_database_url("sqlite::memory:", false).is_ok());
}

#[tokio::test]
#[ignore = "requires disposable local MARKETPLACE_TEST_DATABASE_URL; run with --ignored --test-threads=1"]
async fn postgres_state_survives_separate_function_instances_without_commerce_table_access() {
    let url = postgres_test_url().expect("Set the disposable local PostgreSQL test URL");
    let pool = connect_pool(&url).await.unwrap();
    sqlx::raw_sql("DELETE FROM arise_marketplace.auth_requests; DELETE FROM arise_marketplace.sessions; DELETE FROM arise_marketplace.moderation; DELETE FROM arise_marketplace.reports; DELETE FROM arise_marketplace.rate_limits; DELETE FROM arise_marketplace.reviews;").execute(&pool).await.unwrap();
    let (first, calls, server) = setup_with_pool(pool).await;
    let second = AppState::new((*first.config).clone(), connect_pool(&url).await.unwrap()).unwrap();
    let pages = json!({"privacy":"Privacy policy persisted in PostgreSQL. বাংলা"});
    sqlx::query("INSERT INTO shop_pages(shop_id,content) VALUES($1,$2) ON CONFLICT(shop_id) DO UPDATE SET content=excluded.content")
        .bind(SHOP).bind(pages.to_string()).execute(&first.db).await.unwrap();
    let public = body(
        router(second.clone())
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
    assert_eq!(public["shops"][0]["pages"], pages);
    let session = sign_in(&first, "admin").await;
    assert_eq!(
        second
            .access_token(Some(&session))
            .await
            .ok()
            .flatten()
            .as_deref(),
        Some("admin")
    );
    let one = router(first.clone());
    let two = router(second.clone());
    let mut review = write(
        "/api/orders/33333333-3333-4333-8333-333333333333/review",
        json!({"rating":4,"display_name":"Postgres buyer","comment":"Review persists across function instances."}),
    );
    *review.method_mut() = axum::http::Method::POST;
    assert_eq!(
        one.clone().oneshot(review).await.unwrap().status(),
        StatusCode::OK
    );
    let reviews = body(
        two.clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/products/{PRODUCT}/reviews"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap(),
    )
    .await;
    assert_eq!(reviews["count"], 1);
    assert_eq!(reviews["average"], 4.0);
    let start = one
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/auth/start")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let location = url::Url::parse(start.headers()["location"].to_str().unwrap()).unwrap();
    let nonce = location
        .query_pairs()
        .find(|(key, _)| key == "state")
        .unwrap()
        .1
        .into_owned();
    let request = || {
        Request::builder()
            .uri(format!("/api/auth/callback?state={nonce}&code=single-code"))
            .header("Cookie", format!("arise_auth_state={nonce}"))
            .body(Body::empty())
            .unwrap()
    };
    let (left, right) = tokio::join!(one.oneshot(request()), two.oneshot(request()));
    let redirects: Vec<_> = [left.unwrap(), right.unwrap()]
        .into_iter()
        .map(|response| response.headers()["location"].to_str().unwrap().to_owned())
        .collect();
    assert_eq!(
        redirects
            .iter()
            .filter(|path| path.as_str() == "/seller")
            .count(),
        1
    );
    assert_eq!(calls.lock().unwrap().len(), 1);
    let mut moderation = write(
        "/api/admin/moderation",
        json!({"kind":"product","target_id":PRODUCT,"hidden":true,"reason":"Persistence across instances"}),
    );
    moderation.headers_mut().insert(
        "Cookie",
        format!("arise_buyer={BUYER}; arise_session={session}")
            .parse()
            .unwrap(),
    );
    assert_eq!(
        router(second.clone())
            .oneshot(moderation)
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    let feed = body(
        router(first)
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
    assert!(feed["products"].as_array().unwrap().is_empty());
    assert!(
        sqlx::query("SELECT * FROM public.commerce_sentinel")
            .fetch_all(&second.db)
            .await
            .is_err()
    );
    server.abort();
}
