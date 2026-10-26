use crate::{AppState, digest, now, token};
use axum::{
    Json, Router,
    extract::{ConnectInfo, DefaultBodyLimit, Path, Query, Request, State},
    http::{HeaderMap, HeaderValue, Method, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Redirect, Response},
    routing::{get, post, put},
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sqlx::Row;
use tower_http::services::{ServeDir, ServeFile};

pub type Result<T> = std::result::Result<T, AppError>;
pub struct AppError(pub StatusCode, pub String);
impl AppError {
    pub fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self(status, message.into())
    }
    pub fn internal() -> Self {
        Self::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Something went wrong. Please retry.",
        )
    }
    pub fn unauthorized() -> Self {
        Self::new(
            StatusCode::UNAUTHORIZED,
            "Please continue with AriseSell to sign in.",
        )
    }
}
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({"error":self.1}))).into_response()
    }
}
pub fn router(state: AppState) -> Router {
    build_router(state, true)
}
pub fn api_router(state: AppState) -> Router {
    build_router(state, false).layer(axum::Extension(VercelIngress))
}
#[derive(Clone, Copy)]
struct VercelIngress;
fn build_router(state: AppState, serve_web: bool) -> Router {
    let routes = Router::new()
        .route(
            "/health",
            get(|| async { Json(json!({"status":"ok","service":"arise-digital-store"})) }),
        )
        .merge(crate::admin::routes())
        .route("/api/session", get(session))
        .route("/api/auth/start", get(auth_start))
        .route("/api/auth/callback", get(auth_callback))
        .route("/api/auth/logout", post(logout))
        .route("/api/catalog", get(catalog))
        .route("/api/products/{id}/reviews", get(product_reviews))
        .route("/api/seller", get(seller))
        .route("/api/seller/stores/{id}/catalog", get(seller_catalog))
        .route("/api/seller/stores/{id}/listing", put(save_listing))
        .route("/api/checkout/quote", post(quote))
        .route("/api/checkout/accept", post(accept))
        .route("/api/orders", get(orders))
        .route("/api/orders/{id}", get(order))
        .route("/api/orders/{id}/review", post(save_review))
        .route("/api/orders/{id}/proof", post(proof))
        .route("/api/orders/{id}/reveal", post(reveal))
        .route("/api/reports", post(report))
        .route("/api/admin", get(admin))
        .route("/api/admin/moderation", put(moderate))
        .route("/api/admin/reports/{id}/resolve", post(resolve_report))
        .route(
            "/api/{*path}",
            axum::routing::any(|| async {
                AppError::new(StatusCode::NOT_FOUND, "API route not found.")
            }),
        );
    let routes = if serve_web {
        routes.fallback_service(
            ServeDir::new("web/dist").not_found_service(ServeFile::new("web/dist/index.html")),
        )
    } else {
        routes.fallback(|| async { AppError::new(StatusCode::NOT_FOUND, "API route not found.") })
    };
    routes
        .layer(DefaultBodyLimit::max(65536))
        .layer(middleware::from_fn_with_state(state.clone(), security))
        .with_state(state)
}
pub fn cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .find_map(|part| {
            part.trim()
                .strip_prefix(&format!("{name}="))
                .map(str::to_owned)
        })
        .filter(|v| v.len() == 64 && v.bytes().all(|c| c.is_ascii_hexdigit()))
}
fn set_cookie(response: &mut Response, state: &AppState, name: &str, value: &str, age: i64) {
    let secure = if state.config.secure() {
        "; Secure"
    } else {
        ""
    };
    let text = format!("{name}={value}; Path=/; HttpOnly; SameSite=Lax; Max-Age={age}{secure}");
    if let Ok(value) = HeaderValue::from_str(&text) {
        response.headers_mut().append(header::SET_COOKIE, value);
    }
}
async fn security(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let mutation = request.uri().path().starts_with("/api/")
        && !matches!(
            *request.method(),
            Method::GET | Method::HEAD | Method::OPTIONS
        );
    if mutation {
        let origin = request
            .headers()
            .get(header::ORIGIN)
            .and_then(|v| v.to_str().ok());
        let buyer = cookie(request.headers(), "arise_buyer");
        let csrf = request
            .headers()
            .get("X-CSRF-Token")
            .and_then(|v| v.to_str().ok());
        if origin != Some(state.config.origin.as_str())
            || buyer
                .as_ref()
                .is_none_or(|value| csrf != Some(digest(value).as_str()))
        {
            return AppError::new(
                StatusCode::FORBIDDEN,
                "This page has expired. Reload it and try again.",
            )
            .into_response();
        }
    }
    if mutation || request.uri().path() == "/api/auth/start" {
        let forwarded = request
            .extensions()
            .get::<VercelIngress>()
            .and_then(|_| request.headers().get("x-forwarded-for"))
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.split(',').next())
            .and_then(|value| value.trim().parse::<std::net::IpAddr>().ok());
        let ip = forwarded
            .map(|ip| ip.to_string())
            .or_else(|| {
                request
                    .extensions()
                    .get::<ConnectInfo<std::net::SocketAddr>>()
                    .map(|v| v.0.ip().to_string())
            })
            .unwrap_or_else(|| "test".into());
        if let Err(error) = state.rate_limit(&format!("ip:{ip}"), 6000).await {
            return error.into_response();
        }
        if let Some(buyer) = cookie(request.headers(), "arise_buyer")
            && let Err(error) = state
                .rate_limit(&format!("actions:{}", digest(&buyer)), 180)
                .await
        {
            return error.into_response();
        }
    }
    let api = request.uri().path().starts_with("/api/");
    let callback = request.uri().path() == "/api/auth/callback";
    let mut response = next.run(request).await;
    if callback && (response.status().is_client_error() || response.status().is_server_error()) {
        response = Redirect::to("/seller?connection=retry").into_response();
    }
    let headers = response.headers_mut();
    headers.insert(
        "X-Content-Type-Options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert("Referrer-Policy", HeaderValue::from_static("no-referrer"));
    headers.insert("X-Frame-Options", HeaderValue::from_static("DENY"));
    headers.insert("Content-Security-Policy",HeaderValue::from_static("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"));
    if api {
        headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    }
    response
}
async fn access(state: &AppState, headers: &HeaderMap) -> Result<Option<String>> {
    state
        .access_token(cookie(headers, "arise_session").as_deref())
        .await
}
pub(crate) async fn required_access(state: &AppState, headers: &HeaderMap) -> Result<String> {
    access(state, headers)
        .await?
        .ok_or_else(AppError::unauthorized)
}
pub(crate) fn buyer(headers: &HeaderMap) -> Result<String> {
    cookie(headers, "arise_buyer").ok_or_else(|| {
        AppError::new(
            StatusCode::BAD_REQUEST,
            "Reload this page before continuing.",
        )
    })
}
pub(crate) fn uuid(value: &str) -> Result<()> {
    uuid::Uuid::parse_str(value)
        .map(|_| ())
        .map_err(|_| AppError::new(StatusCode::BAD_REQUEST, "Invalid item identifier."))
}
async fn session(State(state): State<AppState>, headers: HeaderMap) -> Result<Response> {
    let mut guest = cookie(&headers, "arise_buyer").unwrap_or_else(token);
    let mut revoked = false;
    let mut response = if let Some(access) = access(&state, &headers).await? {
        match state
            .source(
                reqwest::Method::GET,
                "/marketplace/me",
                Some(&access),
                None,
                None,
            )
            .await
        {
            Ok(mut me) => {
                if me["user"]["admin"] == true {
                    let role = crate::admin::role(
                        &state,
                        me["user"]["id"].as_str().ok_or_else(AppError::internal)?,
                    )
                    .await?;
                    me["user"]["admin"] = json!(role != "blocked");
                    me["user"]["admin_role"] = json!(role);
                    me["user"]["admin_permissions"] = json!(crate::admin::permissions(&role));
                }
                Json(json!({"user":me["user"],"csrf":digest(&guest),"demo":state.config.demo,"source_web":state.config.source_web})).into_response()
            }
            Err(error) if matches!(error.0, StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN) => {
                if let Some(session) = cookie(&headers, "arise_session") {
                    sqlx::query("DELETE FROM sessions WHERE token_hash=$1")
                        .bind(digest(&session))
                        .execute(&state.db)
                        .await
                        .map_err(|_| AppError::internal())?;
                }
                revoked = true;
                guest = token();
                Json(json!({"user":null,"csrf":digest(&guest),"demo":state.config.demo,"source_web":state.config.source_web})).into_response()
            }
            Err(error) => return Err(error),
        }
    } else {
        Json(json!({"user":null,"csrf":digest(&guest),"demo":state.config.demo,"source_web":state.config.source_web})).into_response()
    };
    set_cookie(
        &mut response,
        &state,
        "arise_buyer",
        &guest,
        60 * 60 * 24 * 365,
    );
    if revoked {
        set_cookie(&mut response, &state, "arise_session", "", 0);
    }
    Ok(response)
}
#[derive(Deserialize)]
struct SignInDestination {
    return_to: Option<String>,
}
async fn auth_start(
    State(state): State<AppState>,
    Query(query): Query<SignInDestination>,
) -> Result<Response> {
    let return_path = match query.return_to.as_deref() {
        None | Some("/seller") => "/seller",
        Some("/purchases") => "/purchases",
        Some("/admin") => "/admin",
        _ => {
            return Err(AppError::new(
                StatusCode::BAD_REQUEST,
                "Choose a valid sign-in destination.",
            ));
        }
    };
    let nonce = token();
    let verifier = token();
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    {
        sqlx::query("DELETE FROM auth_requests WHERE expires_at<$1")
            .bind(now())
            .execute(&state.db)
            .await
            .map_err(|_| AppError::internal())?;
        sqlx::query("DELETE FROM sessions WHERE expires_at<$1")
            .bind(now())
            .execute(&state.db)
            .await
            .map_err(|_| AppError::internal())?;
        sqlx::query("INSERT INTO auth_requests VALUES($1,$2,$3)")
            .bind(digest(&nonce))
            .bind(state.seal(&json!({"verifier":verifier,"return_path":return_path}).to_string())?)
            .bind(now() + 600)
            .execute(&state.db)
            .await
            .map_err(|_| AppError::internal())?;
    }
    let mut url = url::Url::parse(&format!("{}/marketplace/connect", state.config.source_web))
        .map_err(|_| AppError::internal())?;
    url.query_pairs_mut()
        .append_pair("state", &nonce)
        .append_pair("code_challenge", &challenge)
        .append_pair("redirect_uri", &state.config.callback());
    let mut response = Redirect::to(url.as_str()).into_response();
    set_cookie(&mut response, &state, "arise_auth_state", &nonce, 600);
    Ok(response)
}
#[derive(Deserialize)]
struct Callback {
    code: String,
    state: String,
}
async fn auth_callback(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<Callback>,
) -> Result<Response> {
    if cookie(&headers, "arise_auth_state").as_deref() != Some(&query.state)
        || query.code.len() > 256
    {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "Sign-in could not be verified. Please start again.",
        ));
    }
    let verifier: Option<String> = {
        sqlx::query_scalar(
            "DELETE FROM auth_requests WHERE state_hash=$1 AND expires_at>$2 RETURNING verifier",
        )
        .bind(digest(&query.state))
        .bind(now())
        .fetch_optional(&state.db)
        .await
        .map_err(|_| AppError::internal())?
    };
    let verifier = verifier.ok_or_else(|| {
        AppError::new(
            StatusCode::BAD_REQUEST,
            "This sign-in link expired or has already been used.",
        )
    })?;
    let stored: Value =
        serde_json::from_str(&state.unseal(&verifier)?).map_err(|_| AppError::internal())?;
    let verifier = stored["verifier"].as_str().ok_or_else(AppError::internal)?;
    let return_path = if stored["return_path"] == "/purchases" {
        "/purchases"
    } else if stored["return_path"] == "/admin" {
        "/admin"
    } else {
        "/seller"
    };
    let exchange=state.source(reqwest::Method::POST,"/marketplace/token",None,None,Some(json!({"code":query.code,"code_verifier":verifier,"redirect_uri":state.config.callback()}))).await?;
    let source_token = exchange["access_token"]
        .as_str()
        .ok_or_else(AppError::internal)?;
    let lifetime = exchange["expires_in"]
        .as_i64()
        .unwrap_or(3600)
        .clamp(60, 86400);
    let session = token();
    let encrypted = state.seal(source_token)?;
    {
        let mut transaction = state.db.begin().await.map_err(|_| AppError::internal())?;
        if let Some(old) = cookie(&headers, "arise_session") {
            sqlx::query("DELETE FROM sessions WHERE token_hash=$1")
                .bind(digest(&old))
                .execute(&mut *transaction)
                .await
                .map_err(|_| AppError::internal())?;
        }
        sqlx::query("INSERT INTO sessions VALUES($1,$2,$3)")
            .bind(digest(&session))
            .bind(encrypted)
            .bind(now() + lifetime)
            .execute(&mut *transaction)
            .await
            .map_err(|_| AppError::internal())?;
        transaction
            .commit()
            .await
            .map_err(|_| AppError::internal())?;
    }
    let mut response = Redirect::to(return_path).into_response();
    set_cookie(&mut response, &state, "arise_session", &session, lifetime);
    set_cookie(&mut response, &state, "arise_auth_state", "", 0);
    set_cookie(
        &mut response,
        &state,
        "arise_buyer",
        &token(),
        60 * 60 * 24 * 365,
    );
    Ok(response)
}
async fn logout(State(state): State<AppState>, headers: HeaderMap) -> Result<Response> {
    if let Some(session) = cookie(&headers, "arise_session") {
        sqlx::query("DELETE FROM sessions WHERE token_hash=$1")
            .bind(digest(&session))
            .execute(&state.db)
            .await
            .map_err(|_| AppError::internal())?;
    }
    let mut response = Json(json!({"ok":true})).into_response();
    set_cookie(&mut response, &state, "arise_session", "", 0);
    set_cookie(
        &mut response,
        &state,
        "arise_buyer",
        &token(),
        60 * 60 * 24 * 365,
    );
    Ok(response)
}
async fn feed(state: &AppState) -> Result<Value> {
    let mut feed = state
        .source(reqwest::Method::GET, "/marketplace/feed", None, None, None)
        .await?;
    let hidden: Vec<(String, String)> =
        sqlx::query_as("SELECT kind,target_id FROM moderation WHERE hidden=1")
            .fetch_all(&state.db)
            .await
            .map_err(|_| AppError::internal())?;
    let pages: Vec<(String, String)> = sqlx::query_as("SELECT shop_id,content FROM shop_pages")
        .fetch_all(&state.db)
        .await
        .map_err(|_| AppError::internal())?;
    if let Some(shops) = feed["shops"].as_array_mut() {
        shops.retain(|shop| {
            !hidden
                .iter()
                .any(|(kind, id)| kind == "shop" && shop["id"].as_str() == Some(id))
        });
        for shop in shops {
            if let Some((_, content)) = pages.iter().find(|(id, _)| shop["id"] == *id) {
                shop["pages"] = serde_json::from_str(content).map_err(|_| AppError::internal())?;
            }
        }
    }
    let shop_ids: Vec<String> = feed["shops"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|v| v["id"].as_str().map(str::to_owned))
        .collect();
    if let Some(products) = feed["products"].as_array_mut() {
        products.retain(|product| {
            shop_ids
                .iter()
                .any(|id| product["shop_id"].as_str() == Some(id))
                && !hidden
                    .iter()
                    .any(|(kind, id)| kind == "product" && product["id"].as_str() == Some(id))
        });
    }
    Ok(feed)
}
async fn catalog(State(state): State<AppState>) -> Result<Json<Value>> {
    Ok(Json(feed(&state).await?))
}
async fn seller(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Value>> {
    let access = required_access(&state, &headers).await?;
    Ok(Json(
        state
            .source(
                reqwest::Method::GET,
                "/marketplace/me",
                Some(&access),
                None,
                None,
            )
            .await?,
    ))
}
async fn seller_catalog(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    uuid(&id)?;
    let access = required_access(&state, &headers).await?;
    let mut result = state
        .source(
            reqwest::Method::GET,
            &format!("/marketplace/stores/{id}/catalog"),
            Some(&access),
            None,
            None,
        )
        .await?;
    let content: Option<String> =
        sqlx::query_scalar("SELECT content FROM shop_pages WHERE shop_id=$1")
            .bind(&id)
            .fetch_optional(&state.db)
            .await
            .map_err(|_| AppError::internal())?;
    if let Some(content) = content {
        result["shop"]["pages"] =
            serde_json::from_str(&content).map_err(|_| AppError::internal())?;
    }
    Ok(Json(result))
}
async fn save_listing(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(mut body): Json<Value>,
) -> Result<Json<Value>> {
    uuid(&id)?;
    let access = required_access(&state, &headers).await?;
    let pages = body.as_object_mut().and_then(|body| body.remove("pages"));
    if let Some(pages) = &pages {
        let valid = pages.as_object().is_some_and(|fields| {
            fields.iter().all(|(key, value)| {
                matches!(
                    key.as_str(),
                    "privacy" | "returns" | "terms" | "about" | "contact"
                ) && value
                    .as_str()
                    .is_some_and(|text| text.chars().count() <= 3000)
            })
        });
        if !valid {
            return Err(AppError::new(
                StatusCode::UNPROCESSABLE_ENTITY,
                "Shop information must contain only the five supported text sections, up to 3,000 characters each.",
            ));
        }
    }
    // AriseSell validates ownership and publication before any local metadata write.
    let mut result = state
        .source(
            reqwest::Method::PUT,
            &format!("/marketplace/stores/{id}/listing"),
            Some(&access),
            None,
            Some(body),
        )
        .await?;
    if let Some(pages) = pages {
        sqlx::query("INSERT INTO shop_pages(shop_id,content) VALUES($1,$2) ON CONFLICT(shop_id) DO UPDATE SET content=excluded.content")
            .bind(&id).bind(pages.to_string()).execute(&state.db).await.map_err(|_| {
                AppError::new(StatusCode::INTERNAL_SERVER_ERROR,
                    "Your shop listing was saved, but its information could not be saved. Reload your shop settings and check them before retrying.")
            })?;
        result["shop"]["pages"] = pages;
    }
    Ok(Json(result))
}
async fn ensure_visible(state: &AppState, body: &Value) -> Result<()> {
    let catalog = feed(state).await?;
    if !catalog["products"].as_array().is_some_and(|rows| {
        rows.iter().any(|product| {
            product["id"] == body["product_id"] && product["shop_id"] == body["shop_id"]
        })
    }) {
        return Err(AppError::new(
            StatusCode::CONFLICT,
            "This product is no longer available on the marketplace.",
        ));
    }
    Ok(())
}
async fn commerce(
    state: &AppState,
    headers: &HeaderMap,
    method: reqwest::Method,
    path: &str,
    body: Option<Value>,
) -> Result<Json<Value>> {
    let buyer = buyer(headers)?;
    let access = access(state, headers).await?;
    Ok(Json(
        state
            .source(method, path, access.as_deref(), Some(&buyer), body)
            .await?,
    ))
}
async fn quote(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Result<Json<Value>> {
    ensure_visible(&state, &body).await?;
    commerce(
        &state,
        &headers,
        reqwest::Method::POST,
        "/marketplace/checkout/quote",
        Some(body),
    )
    .await
}
async fn accept(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Result<Json<Value>> {
    ensure_visible(&state, &body).await?;
    commerce(
        &state,
        &headers,
        reqwest::Method::POST,
        "/marketplace/checkout/accept",
        Some(body),
    )
    .await
}
async fn orders(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Value>> {
    commerce(
        &state,
        &headers,
        reqwest::Method::GET,
        "/marketplace/orders",
        None,
    )
    .await
}
async fn order(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    uuid(&id)?;
    let Json(mut data) = commerce(
        &state,
        &headers,
        reqwest::Method::GET,
        &format!("/marketplace/orders/{id}"),
        None,
    )
    .await?;
    data["can_review"] = json!(reviewable_order(&data));
    data["review"] = sqlx::query("SELECT id,CAST(rating AS BIGINT) AS rating,display_name,comment,created_at FROM reviews WHERE order_id=$1")
        .bind(id).fetch_optional(&state.db).await.map_err(|_| AppError::internal())?
        .map(public_review).transpose()?.unwrap_or(Value::Null);
    Ok(Json(data))
}
fn reviewable_order(order: &Value) -> bool {
    order["payment_status"] == "paid"
        && matches!(
            order["delivery_status"].as_str(),
            Some("sent" | "delivered")
        )
        && order["product_id"]
            .as_str()
            .is_some_and(|id| uuid::Uuid::parse_str(id).is_ok())
}
fn public_review(row: sqlx::any::AnyRow) -> Result<Value> {
    Ok(json!({
        "id": row.try_get::<String,_>("id").map_err(|_| AppError::internal())?,
        "rating": row.try_get::<i64,_>("rating").map_err(|_| AppError::internal())?,
        "display_name": row.try_get::<String,_>("display_name").map_err(|_| AppError::internal())?,
        "comment": row.try_get::<String,_>("comment").map_err(|_| AppError::internal())?,
        "created_at": row.try_get::<i64,_>("created_at").map_err(|_| AppError::internal())?,
    }))
}
#[derive(Deserialize)]
struct ReviewPage {
    #[serde(default)]
    offset: u32,
}
async fn product_reviews(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(page): Query<ReviewPage>,
) -> Result<Json<Value>> {
    uuid(&id)?;
    if page.offset > 100_000 {
        return Err(AppError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Review page is out of range.",
        ));
    }
    let catalog = feed(&state).await?;
    if !catalog["products"]
        .as_array()
        .is_some_and(|rows| rows.iter().any(|row| row["id"] == id))
    {
        return Err(AppError::new(StatusCode::NOT_FOUND, "Product not found."));
    }
    let summary = sqlx::query("SELECT COUNT(*) AS count,CAST(COALESCE(SUM(rating),0) AS BIGINT) AS total FROM reviews WHERE product_id=$1 AND id NOT IN (SELECT review_id FROM review_moderation WHERE hidden=1)")
        .bind(&id).fetch_one(&state.db).await.map_err(|_| AppError::internal())?;
    let count: i64 = summary.try_get("count").map_err(|_| AppError::internal())?;
    let total: i64 = summary.try_get("total").map_err(|_| AppError::internal())?;
    let reviews = sqlx::query("SELECT id,CAST(rating AS BIGINT) AS rating,display_name,comment,created_at FROM reviews WHERE product_id=$1 AND id NOT IN (SELECT review_id FROM review_moderation WHERE hidden=1) ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $2")
        .bind(id).bind(i64::from(page.offset)).fetch_all(&state.db).await.map_err(|_| AppError::internal())?
        .into_iter().map(public_review).collect::<Result<Vec<_>>>()?;
    Ok(Json(
        json!({"count":count,"average":if count > 0 { Some(total as f64 / count as f64) } else { None },
        "has_more":i64::from(page.offset)+(reviews.len() as i64) < count,"reviews":reviews}),
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ReviewInput {
    rating: u8,
    display_name: String,
    comment: String,
}
async fn save_review(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<ReviewInput>,
) -> Result<Json<Value>> {
    uuid(&id)?;
    let display_name = body.display_name.trim();
    let comment = body.comment.trim();
    if !(1..=5).contains(&body.rating)
        || !(2..=60).contains(&display_name.chars().count())
        || !(10..=2000).contains(&comment.chars().count())
        || display_name.chars().any(char::is_control)
    {
        return Err(AppError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Choose 1–5 stars, a public name (2–60 characters), and a review (10–2,000 characters).",
        ));
    }
    let Json(order) = commerce(
        &state,
        &headers,
        reqwest::Method::GET,
        &format!("/marketplace/orders/{id}"),
        None,
    )
    .await?;
    if !reviewable_order(&order) {
        return Err(AppError::new(
            StatusCode::CONFLICT,
            "You can review this product after verified payment and delivery.",
        ));
    }
    let product_id = order["product_id"]
        .as_str()
        .ok_or_else(AppError::internal)?;
    let shop_id = order["shop"]["id"]
        .as_str()
        .ok_or_else(AppError::internal)?;
    uuid(shop_id)?;
    let buyer = buyer(&headers)?;
    state
        .rate_limit(&format!("reviews:{}", digest(&buyer)), 20)
        .await?;
    let row = sqlx::query("INSERT INTO reviews(id,order_id,product_id,shop_id,rating,display_name,comment,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(order_id) DO UPDATE SET rating=excluded.rating,display_name=excluded.display_name,comment=excluded.comment RETURNING id,CAST(rating AS BIGINT) AS rating,display_name,comment,created_at")
        .bind(uuid::Uuid::new_v4().to_string()).bind(id).bind(product_id).bind(shop_id).bind(i64::from(body.rating))
        .bind(display_name).bind(comment).bind(now()).fetch_one(&state.db).await.map_err(|_| AppError::internal())?;
    Ok(Json(public_review(row)?))
}
async fn proof(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>> {
    uuid(&id)?;
    commerce(
        &state,
        &headers,
        reqwest::Method::POST,
        &format!("/marketplace/orders/{id}/proof"),
        Some(body),
    )
    .await
}
async fn reveal(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    uuid(&id)?;
    commerce(
        &state,
        &headers,
        reqwest::Method::POST,
        &format!("/marketplace/orders/{id}/reveal"),
        Some(json!({})),
    )
    .await
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ReportInput {
    product_id: String,
    reason: String,
}
async fn report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<ReportInput>,
) -> Result<Json<Value>> {
    uuid(&body.product_id)?;
    let buyer = buyer(&headers)?;
    let reason = body.reason.trim();
    if !(10..=1000).contains(&reason.len()) {
        return Err(AppError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Describe the issue in 10 to 1,000 characters.",
        ));
    }
    state
        .rate_limit(&format!("reports:{}", digest(&buyer)), 5)
        .await?;
    let catalog = feed(&state).await?;
    if !catalog["products"]
        .as_array()
        .is_some_and(|rows| rows.iter().any(|row| row["id"] == body.product_id))
    {
        return Err(AppError::new(StatusCode::NOT_FOUND, "Product not found."));
    }
    sqlx::query(
        "INSERT INTO reports(id,product_id,reason,reporter_hash,created_at) VALUES($1,$2,$3,$4,$5)",
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(body.product_id)
    .bind(reason)
    .bind(digest(&buyer))
    .bind(now())
    .execute(&state.db)
    .await
    .map_err(|_| AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
async fn require_admin(state: &AppState, headers: &HeaderMap) -> Result<String> {
    Ok(crate::admin::authorize(state, headers, "moderate")
        .await?
        .actor)
}
async fn admin(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Value>> {
    let identity = crate::admin::authorize(&state, &headers, "catalog").await?;
    let catalog = state
        .source(reqwest::Method::GET, "/marketplace/feed", None, None, None)
        .await?;
    let reports = sqlx::query("SELECT id,product_id,reason,created_at,CAST(resolved AS BIGINT) AS resolved FROM reports ORDER BY created_at DESC LIMIT 200").fetch_all(&state.db).await.map_err(|_|AppError::internal())?.into_iter().map(|row| {
        Ok(json!({"id":row.try_get::<String,_>("id")?,"product_id":row.try_get::<String,_>("product_id")?,"reason":row.try_get::<String,_>("reason")?,"created_at":row.try_get::<i64,_>("created_at")?,"resolved":row.try_get::<i64,_>("resolved")? != 0}))
    }).collect::<std::result::Result<Vec<Value>,sqlx::Error>>().map_err(|_|AppError::internal())?;
    let moderation = sqlx::query("SELECT kind,target_id,CAST(hidden AS BIGINT) AS hidden,reason FROM moderation").fetch_all(&state.db).await.map_err(|_|AppError::internal())?.into_iter().map(|row| {
        Ok(json!({"kind":row.try_get::<String,_>("kind")?,"target_id":row.try_get::<String,_>("target_id")?,"hidden":row.try_get::<i64,_>("hidden")? != 0,"reason":row.try_get::<String,_>("reason")?}))
    }).collect::<std::result::Result<Vec<Value>,sqlx::Error>>().map_err(|_|AppError::internal())?;
    Ok(Json(
        json!({"catalog":catalog,"reports":reports,"moderation":moderation,"role":identity.role,"permissions":crate::admin::permissions(&identity.role),"checked_at":now()}),
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ModerationInput {
    kind: String,
    target_id: String,
    hidden: bool,
    reason: String,
}
async fn moderate(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<ModerationInput>,
) -> Result<Json<Value>> {
    let actor = require_admin(&state, &headers).await?;
    uuid(&body.target_id)?;
    if !matches!(body.kind.as_str(), "shop" | "product")
        || !(5..=1000).contains(&body.reason.trim().len())
    {
        return Err(AppError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Choose a shop or product and provide a reason.",
        ));
    }
    let mut tx = state.db.begin().await.map_err(|_| AppError::internal())?;
    sqlx::query("INSERT INTO moderation VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(kind,target_id) DO UPDATE SET hidden=excluded.hidden,reason=excluded.reason,actor=excluded.actor,updated_at=excluded.updated_at").bind(&body.kind).bind(&body.target_id).bind(i64::from(body.hidden)).bind(body.reason.trim()).bind(&actor).bind(now()).execute(&mut *tx).await.map_err(|_|AppError::internal())?;
    crate::admin::audit(
        &mut tx,
        &actor,
        if body.hidden {
            "listing.hidden"
        } else {
            "listing.restored"
        },
        &body.target_id,
        body.reason.trim(),
    )
    .await?;
    tx.commit().await.map_err(|_| AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
async fn resolve_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    let identity = crate::admin::authorize(&state, &headers, "reports").await?;
    uuid(&id)?;
    let mut tx = state.db.begin().await.map_err(|_| AppError::internal())?;
    let count = sqlx::query("UPDATE reports SET resolved=1 WHERE id=$1")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|_| AppError::internal())?
        .rows_affected();
    if count == 0 {
        return Err(AppError::new(StatusCode::NOT_FOUND, "Report not found."));
    }
    crate::admin::audit(
        &mut tx,
        &identity.actor,
        "report.resolved",
        &id,
        "Resolved customer report",
    )
    .await?;
    tx.commit().await.map_err(|_| AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
