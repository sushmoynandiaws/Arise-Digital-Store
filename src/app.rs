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
use rusqlite::{OptionalExtension, params};
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
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
    Router::new()
        .route(
            "/health",
            get(|| async { Json(json!({"status":"ok","service":"arise-digital-store"})) }),
        )
        .route("/api/session", get(session))
        .route("/api/auth/start", get(auth_start))
        .route("/api/auth/callback", get(auth_callback))
        .route("/api/auth/logout", post(logout))
        .route("/api/catalog", get(catalog))
        .route("/api/seller", get(seller))
        .route("/api/seller/stores/{id}/catalog", get(seller_catalog))
        .route("/api/seller/stores/{id}/listing", put(save_listing))
        .route("/api/checkout/quote", post(quote))
        .route("/api/checkout/accept", post(accept))
        .route("/api/orders", get(orders))
        .route("/api/orders/{id}", get(order))
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
        )
        .fallback_service(
            ServeDir::new("web/dist").not_found_service(ServeFile::new("web/dist/index.html")),
        )
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
        let ip = request
            .extensions()
            .get::<ConnectInfo<std::net::SocketAddr>>()
            .map(|v| v.0.ip().to_string())
            .unwrap_or_else(|| "test".into());
        if let Err(error) = state.rate_limit(&format!("ip:{ip}"), 6000) {
            return error.into_response();
        }
        if let Some(buyer) = cookie(request.headers(), "arise_buyer")
            && let Err(error) = state.rate_limit(&format!("actions:{}", digest(&buyer)), 180)
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
fn access(state: &AppState, headers: &HeaderMap) -> Result<Option<String>> {
    state.access_token(cookie(headers, "arise_session").as_deref())
}
fn required_access(state: &AppState, headers: &HeaderMap) -> Result<String> {
    access(state, headers)?.ok_or_else(AppError::unauthorized)
}
fn buyer(headers: &HeaderMap) -> Result<String> {
    cookie(headers, "arise_buyer").ok_or_else(|| {
        AppError::new(
            StatusCode::BAD_REQUEST,
            "Reload this page before continuing.",
        )
    })
}
fn uuid(value: &str) -> Result<()> {
    uuid::Uuid::parse_str(value)
        .map(|_| ())
        .map_err(|_| AppError::new(StatusCode::BAD_REQUEST, "Invalid item identifier."))
}
async fn session(State(state): State<AppState>, headers: HeaderMap) -> Result<Response> {
    let mut guest = cookie(&headers, "arise_buyer").unwrap_or_else(token);
    let mut revoked = false;
    let mut response = if let Some(access) = access(&state, &headers)? {
        match state.source(reqwest::Method::GET,"/marketplace/me",Some(&access),None,None).await {
            Ok(me)=>Json(json!({"user":me["user"],"csrf":digest(&guest),"demo":state.config.demo,"source_web":state.config.source_web})).into_response(),
            Err(error) if matches!(error.0,StatusCode::UNAUTHORIZED|StatusCode::FORBIDDEN)=>{
                if let Some(session)=cookie(&headers,"arise_session") {state.db.lock().map_err(|_|AppError::internal())?.execute("DELETE FROM sessions WHERE token_hash=?1",[digest(&session)]).map_err(|_|AppError::internal())?;}
                revoked=true;
                guest=token();
                Json(json!({"user":null,"csrf":digest(&guest),"demo":state.config.demo,"source_web":state.config.source_web})).into_response()
            },
            Err(error)=>return Err(error),
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
        let db = state.db.lock().map_err(|_| AppError::internal())?;
        db.execute("DELETE FROM auth_requests WHERE expires_at<?1", [now()])
            .map_err(|_| AppError::internal())?;
        db.execute("DELETE FROM sessions WHERE expires_at<?1", [now()])
            .map_err(|_| AppError::internal())?;
        db.execute(
            "INSERT INTO auth_requests VALUES(?1,?2,?3)",
            params![
                digest(&nonce),
                state.seal(&json!({"verifier":verifier,"return_path":return_path}).to_string())?,
                now() + 600
            ],
        )
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
        state.db.lock().map_err(|_|AppError::internal())?.query_row("DELETE FROM auth_requests WHERE state_hash=?1 AND expires_at>?2 RETURNING verifier",params![digest(&query.state),now()],|row|row.get(0)).optional().map_err(|_|AppError::internal())?
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
        let db = state.db.lock().map_err(|_| AppError::internal())?;
        if let Some(old) = cookie(&headers, "arise_session") {
            db.execute("DELETE FROM sessions WHERE token_hash=?1", [digest(&old)])
                .map_err(|_| AppError::internal())?;
        }
        db.execute(
            "INSERT INTO sessions VALUES(?1,?2,?3)",
            params![digest(&session), encrypted, now() + lifetime],
        )
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
        state
            .db
            .lock()
            .map_err(|_| AppError::internal())?
            .execute(
                "DELETE FROM sessions WHERE token_hash=?1",
                [digest(&session)],
            )
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
    let hidden: Vec<(String, String)> = {
        let db = state.db.lock().map_err(|_| AppError::internal())?;
        let mut statement = db
            .prepare("SELECT kind,target_id FROM moderation WHERE hidden=1")
            .map_err(|_| AppError::internal())?;
        statement
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|_| AppError::internal())?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|_| AppError::internal())?
    };
    if let Some(shops) = feed["shops"].as_array_mut() {
        shops.retain(|shop| {
            !hidden
                .iter()
                .any(|(kind, id)| kind == "shop" && shop["id"].as_str() == Some(id))
        });
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
    let access = required_access(&state, &headers)?;
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
    let access = required_access(&state, &headers)?;
    Ok(Json(
        state
            .source(
                reqwest::Method::GET,
                &format!("/marketplace/stores/{id}/catalog"),
                Some(&access),
                None,
                None,
            )
            .await?,
    ))
}
async fn save_listing(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>> {
    uuid(&id)?;
    let access = required_access(&state, &headers)?;
    Ok(Json(
        state
            .source(
                reqwest::Method::PUT,
                &format!("/marketplace/stores/{id}/listing"),
                Some(&access),
                None,
                Some(body),
            )
            .await?,
    ))
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
    let access = access(state, headers)?;
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
    commerce(
        &state,
        &headers,
        reqwest::Method::GET,
        &format!("/marketplace/orders/{id}"),
        None,
    )
    .await
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
    state.rate_limit(&format!("reports:{}", digest(&buyer)), 5)?;
    let catalog = feed(&state).await?;
    if !catalog["products"]
        .as_array()
        .is_some_and(|rows| rows.iter().any(|row| row["id"] == body.product_id))
    {
        return Err(AppError::new(StatusCode::NOT_FOUND, "Product not found."));
    }
    state.db.lock().map_err(|_|AppError::internal())?.execute("INSERT INTO reports(id,product_id,reason,reporter_hash,created_at) VALUES(?1,?2,?3,?4,?5)",params![uuid::Uuid::new_v4().to_string(),body.product_id,reason,digest(&buyer),now()]).map_err(|_|AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
async fn require_admin(state: &AppState, headers: &HeaderMap) -> Result<String> {
    let access = required_access(state, headers)?;
    let me = state
        .source(
            reqwest::Method::GET,
            "/marketplace/me",
            Some(&access),
            None,
            None,
        )
        .await?;
    if me["user"]["admin"] != true {
        return Err(AppError::new(
            StatusCode::FORBIDDEN,
            "Marketplace administrator access is required.",
        ));
    }
    Ok(me["user"]["id"]
        .as_str()
        .ok_or_else(AppError::internal)?
        .to_owned())
}
async fn admin(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Value>> {
    require_admin(&state, &headers).await?;
    let catalog = state
        .source(reqwest::Method::GET, "/marketplace/feed", None, None, None)
        .await?;
    let db = state.db.lock().map_err(|_| AppError::internal())?;
    let mut reports=db.prepare("SELECT id,product_id,reason,created_at,resolved FROM reports ORDER BY created_at DESC LIMIT 200").map_err(|_|AppError::internal())?;
    let reports=reports.query_map([],|row|Ok(json!({"id":row.get::<_,String>(0)?,"product_id":row.get::<_,String>(1)?,"reason":row.get::<_,String>(2)?,"created_at":row.get::<_,i64>(3)?,"resolved":row.get::<_,bool>(4)?}))).map_err(|_|AppError::internal())?.collect::<std::result::Result<Vec<_>,_>>().map_err(|_|AppError::internal())?;
    let mut moderation = db
        .prepare("SELECT kind,target_id,hidden,reason FROM moderation")
        .map_err(|_| AppError::internal())?;
    let moderation=moderation.query_map([],|row|Ok(json!({"kind":row.get::<_,String>(0)?,"target_id":row.get::<_,String>(1)?,"hidden":row.get::<_,bool>(2)?,"reason":row.get::<_,String>(3)?}))).map_err(|_|AppError::internal())?.collect::<std::result::Result<Vec<_>,_>>().map_err(|_|AppError::internal())?;
    Ok(Json(
        json!({"catalog":catalog,"reports":reports,"moderation":moderation}),
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
    state.db.lock().map_err(|_|AppError::internal())?.execute("INSERT INTO moderation VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(kind,target_id) DO UPDATE SET hidden=excluded.hidden,reason=excluded.reason,actor=excluded.actor,updated_at=excluded.updated_at",params![body.kind,body.target_id,body.hidden,body.reason.trim(),actor,now()]).map_err(|_|AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
async fn resolve_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    require_admin(&state, &headers).await?;
    uuid(&id)?;
    let count = state
        .db
        .lock()
        .map_err(|_| AppError::internal())?
        .execute("UPDATE reports SET resolved=1 WHERE id=?1", [id])
        .map_err(|_| AppError::internal())?;
    if count == 0 {
        return Err(AppError::new(StatusCode::NOT_FOUND, "Report not found."));
    }
    Ok(Json(json!({"ok":true})))
}
