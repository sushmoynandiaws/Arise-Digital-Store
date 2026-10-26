//! Marketplace-only administration. AriseSell remains authoritative for identity and commerce.
use crate::{
    AppState,
    app::{AppError, Result},
    digest, now,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post, put},
};
use serde::Deserialize;
use serde_json::{Value, json};
use sqlx::Row;

pub struct AdminIdentity {
    pub actor: String,
    pub role: String,
}
pub fn permissions(role: &str) -> Vec<&'static str> {
    match role {
        "owner" => vec![
            "catalog",
            "moderate",
            "reports",
            "orders",
            "reviews",
            "campaigns",
            "content",
            "activity",
            "access",
            "health",
        ],
        "moderator" => vec!["catalog", "moderate", "reports", "reviews"],
        "support" => vec!["catalog", "reports", "orders"],
        _ => vec![],
    }
}
pub async fn role(state: &AppState, id: &str) -> Result<String> {
    Ok(
        sqlx::query_scalar("SELECT role FROM admin_roles WHERE user_id=$1")
            .bind(id)
            .fetch_optional(&state.db)
            .await
            .map_err(|_| AppError::internal())?
            .unwrap_or_else(|| "owner".into()),
    )
}
pub async fn authorize(
    state: &AppState,
    headers: &HeaderMap,
    capability: &str,
) -> Result<AdminIdentity> {
    let access = crate::app::required_access(state, headers).await?;
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
        return Err(denied());
    }
    let actor = me["user"]["id"]
        .as_str()
        .ok_or_else(AppError::internal)?
        .to_owned();
    let role = role(state, &actor).await?;
    if !permissions(&role).contains(&capability) {
        return Err(denied());
    }
    Ok(AdminIdentity { actor, role })
}
fn denied() -> AppError {
    AppError::new(
        StatusCode::FORBIDDEN,
        "Marketplace administrator permission is required for this action.",
    )
}
pub async fn audit(
    tx: &mut sqlx::Transaction<'_, sqlx::Any>,
    actor: &str,
    action: &str,
    target: &str,
    detail: &str,
) -> Result<()> {
    sqlx::query("INSERT INTO admin_activity VALUES($1,$2,$3,$4,$5,$6)")
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(actor)
        .bind(action)
        .bind(target)
        .bind(detail)
        .bind(now())
        .execute(&mut **tx)
        .await
        .map_err(|_| AppError::internal())?;
    Ok(())
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/promotions", get(promotions))
        .route("/api/promotions/{id}/events", post(ad_event))
        .route(
            "/api/admin/documents/{key}",
            get(document).put(save_document),
        )
        .route("/api/admin/orders", get(orders))
        .route("/api/admin/reviews", get(reviews))
        .route("/api/admin/reviews/{id}/visibility", put(review_visibility))
        .route("/api/admin/activity", get(activity))
        .route("/api/admin/notes", get(notes).post(add_note))
        .route("/api/admin/access", get(access_list))
        .route("/api/admin/access/{id}", put(save_role))
        .route("/api/admin/health", get(health))
}
pub async fn read_document(state: &AppState, key: &str) -> Result<Value> {
    let row = sqlx::query("SELECT content,revision,updated_at FROM admin_documents WHERE key=$1")
        .bind(key)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| AppError::internal())?;
    match row {
        Some(row) => Ok(
            json!({"content":serde_json::from_str::<Value>(&row.try_get::<String,_>("content").map_err(|_|AppError::internal())?).map_err(|_|AppError::internal())?,"revision":row.try_get::<i64,_>("revision").map_err(|_|AppError::internal())?,"updated_at":row.try_get::<i64,_>("updated_at").map_err(|_|AppError::internal())?}),
        ),
        None => Ok(
            json!({"content":if key=="campaigns" {json!([])} else {json!({})},"revision":0,"updated_at":null}),
        ),
    }
}
fn capability(key: &str) -> Result<&'static str> {
    match key {
        "campaigns" => Ok("campaigns"),
        "settings" => Ok("content"),
        _ => Err(AppError::new(StatusCode::NOT_FOUND, "Document not found.")),
    }
}
async fn document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(key): Path<String>,
) -> Result<Json<Value>> {
    authorize(&state, &headers, capability(&key)?).await?;
    let mut data = read_document(&state, &key).await?;
    if key == "campaigns" {
        let metrics =
            sqlx::query("SELECT ad_id,kind,COUNT(*) AS count FROM ad_events GROUP BY ad_id,kind")
                .fetch_all(&state.db)
                .await
                .map_err(|_| AppError::internal())?;
        for ad in data["content"]
            .as_array_mut()
            .ok_or_else(AppError::internal)?
        {
            ad["impressions"] = json!(0);
            ad["clicks"] = json!(0);
            for row in &metrics {
                if ad["id"].as_str()
                    == Some(
                        row.try_get::<String, _>("ad_id")
                            .map_err(|_| AppError::internal())?
                            .as_str(),
                    )
                {
                    let field = if row
                        .try_get::<String, _>("kind")
                        .map_err(|_| AppError::internal())?
                        == "click"
                    {
                        "clicks"
                    } else {
                        "impressions"
                    };
                    ad[field] = json!(
                        row.try_get::<i64, _>("count")
                            .map_err(|_| AppError::internal())?
                    );
                }
            }
        }
    }
    Ok(Json(data))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DocumentInput {
    revision: i64,
    content: Value,
}
fn invalid(message: &str) -> AppError {
    AppError::new(StatusCode::UNPROCESSABLE_ENTITY, message)
}
fn text<'a>(value: &'a Value, field: &str, min: usize, max: usize) -> Result<&'a str> {
    let value = value[field]
        .as_str()
        .ok_or_else(|| invalid("Complete the required text fields."))?;
    if !(min..=max).contains(&value.trim().chars().count())
        || value
            .chars()
            .any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t')
    {
        return Err(invalid(
            "A text field is empty, too long or contains unsupported characters.",
        ));
    }
    Ok(value)
}
fn safe_url(value: &str, internal: bool, empty: bool) -> bool {
    if value.is_empty() {
        return empty;
    }
    if value.chars().any(|c| c.is_control() || c.is_whitespace()) || value.contains('\\') {
        return false;
    }
    if internal && value.starts_with('/') && !value.starts_with("//") {
        return true;
    }
    url::Url::parse(value).is_ok_and(|u| {
        u.scheme() == "https"
            && u.host_str().is_some()
            && u.username().is_empty()
            && u.password().is_none()
    })
}
fn date(value: &str) -> Option<i64> {
    if value.len() != 10 || value.as_bytes()[4] != b'-' || value.as_bytes()[7] != b'-' {
        return None;
    }
    let year: i64 = value.get(..4)?.parse().ok()?;
    let month: usize = value.get(5..7)?.parse().ok()?;
    let day: i64 = value.get(8..)?.parse().ok()?;
    let leap = |y: i64| y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    if !(1970..=2200).contains(&year) || !(1..=12).contains(&month) {
        return None;
    }
    let months = [
        31,
        if leap(year) { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    if day < 1 || day > months[month - 1] {
        return None;
    }
    Some(
        ((1970..year)
            .map(|y| if leap(y) { 366 } else { 365 })
            .sum::<i64>()
            + months[..month - 1].iter().sum::<i64>()
            + day
            - 1)
            * 86400,
    )
}
fn active(ad: &Value) -> bool {
    ad["status"] == "active"
        && date(ad["start_date"].as_str().unwrap_or("")).is_some_and(|d| d <= now())
        && date(ad["end_date"].as_str().unwrap_or("")).is_some_and(|d| now() < d + 86400)
}
fn validate_document(key: &str, value: &Value) -> Result<()> {
    if key == "campaigns" {
        let ads = value
            .as_array()
            .filter(|a| a.len() <= 100)
            .ok_or_else(|| invalid("Use at most 100 campaigns."))?;
        let mut ids = std::collections::HashSet::new();
        for ad in ads {
            let id = text(ad, "id", 1, 64)?;
            crate::app::uuid(id)?;
            if !ids.insert(id) {
                return Err(invalid("Campaign identifiers must be unique."));
            }
            for (field, min, max) in [
                ("title", 2, 160),
                ("advertiser_name", 2, 100),
                ("badge_text", 0, 40),
                ("cta_text", 1, 40),
            ] {
                text(ad, field, min, max)?;
            }
            if !safe_url(text(ad, "target_url", 1, 2000)?, true, false)
                || !safe_url(text(ad, "banner_url", 0, 2000)?, false, true)
            {
                return Err(invalid(
                    "Use a local destination or HTTPS link; banners require HTTPS.",
                ));
            }
            if ![
                "home_hero",
                "top_flash",
                "sponsored_product",
                "featured_shop",
                "sticky_bottom",
            ]
            .contains(&ad["placement"].as_str().unwrap_or(""))
                || !["active", "paused", "pending_payment"]
                    .contains(&ad["status"].as_str().unwrap_or(""))
            {
                return Err(invalid("Choose a valid placement and campaign status."));
            }
            let start = date(text(ad, "start_date", 10, 10)?)
                .ok_or_else(|| invalid("Choose valid campaign dates."))?;
            let end = date(text(ad, "end_date", 10, 10)?)
                .ok_or_else(|| invalid("Choose valid campaign dates."))?;
            if end < start
                || !ad["price_bdt"]
                    .as_f64()
                    .is_some_and(|p| p.is_finite() && (0.0..=10000000.0).contains(&p))
            {
                return Err(invalid("Check the date range and campaign fee."));
            }
        }
    } else {
        let fields = value
            .as_object()
            .ok_or_else(|| invalid("Use valid platform settings."))?;
        for (field, val) in fields {
            match field.as_str() {
                "announcement" | "hero_title" => {
                    if !val.as_str().is_some_and(|s| s.chars().count() <= 160) {
                        return Err(invalid("Headings must be 160 characters or fewer."));
                    }
                }
                "hero_description" => {
                    if !val.as_str().is_some_and(|s| s.chars().count() <= 500) {
                        return Err(invalid("Use a description of at most 500 characters."));
                    }
                }
                "announcement_url" => {
                    if !val
                        .as_str()
                        .is_some_and(|s| s.len() <= 2000 && safe_url(s, true, true))
                    {
                        return Err(invalid(
                            "Use a local destination or HTTPS announcement link.",
                        ));
                    }
                }
                "support_email" => {
                    if !val.as_str().is_some_and(|s| {
                        s.len() <= 255
                            && (s.is_empty()
                                || s.contains('@') && !s.chars().any(char::is_whitespace))
                    }) {
                        return Err(invalid("Use a support email address."));
                    }
                }
                "pages" => {
                    let pages = val
                        .as_object()
                        .ok_or_else(|| invalid("Use valid policy pages."))?;
                    for (k, v) in pages {
                        if !["privacy", "returns", "terms", "about", "contact"]
                            .contains(&k.as_str())
                            || !v.as_str().is_some_and(|s| s.chars().count() <= 3000)
                        {
                            return Err(invalid(
                                "Use the five supported policy pages, at most 3,000 characters each.",
                            ));
                        }
                    }
                }
                _ => return Err(invalid("Unknown platform setting.")),
            }
        }
    }
    Ok(())
}
async fn save_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(key): Path<String>,
    Json(mut input): Json<DocumentInput>,
) -> Result<Json<Value>> {
    let admin = authorize(&state, &headers, capability(&key)?).await?;
    validate_document(&key, &input.content)?;
    if key == "campaigns" {
        for ad in input
            .content
            .as_array_mut()
            .ok_or_else(AppError::internal)?
        {
            ad.as_object_mut()
                .ok_or_else(AppError::internal)?
                .retain(|k, _| !["impressions", "clicks"].contains(&k.as_str()));
        }
    }
    let mut tx = state.db.begin().await.map_err(|_| AppError::internal())?;
    sqlx::query("INSERT INTO admin_documents(key,content,revision,updated_at) VALUES($1,$2,0,$3) ON CONFLICT(key) DO NOTHING").bind(&key).bind(if key=="campaigns" {"[]"} else {"{}"}).bind(now()).execute(&mut *tx).await.map_err(|_|AppError::internal())?;
    let changed=sqlx::query("UPDATE admin_documents SET content=$1,revision=revision+1,updated_at=$2 WHERE key=$3 AND revision=$4").bind(input.content.to_string()).bind(now()).bind(&key).bind(input.revision).execute(&mut *tx).await.map_err(|_|AppError::internal())?.rows_affected();
    if changed != 1 {
        return Err(AppError::new(
            StatusCode::CONFLICT,
            "Another administrator updated this page. Reload before saving again.",
        ));
    }
    audit(
        &mut tx,
        &admin.actor,
        "document.saved",
        &key,
        "Updated marketplace configuration",
    )
    .await?;
    tx.commit().await.map_err(|_| AppError::internal())?;
    Ok(Json(
        json!({"revision":input.revision+1,"content":input.content}),
    ))
}
async fn promotions(State(state): State<AppState>) -> Result<Json<Value>> {
    let campaigns = read_document(&state, "campaigns").await?;
    let ads: Vec<Value> = campaigns["content"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|ad| active(ad))
        .map(|ad| {
            let mut ad = ad.clone();
            if let Some(obj) = ad.as_object_mut() {
                obj.remove("price_bdt");
                obj.remove("created_at");
            }
            ad
        })
        .collect();
    Ok(Json(
        json!({"ads":ads,"settings":read_document(&state,"settings").await?["content"]}),
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct EventInput {
    kind: String,
}
async fn ad_event(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<EventInput>,
) -> Result<Json<Value>> {
    crate::app::uuid(&id)?;
    if !["impression", "click"].contains(&input.kind.as_str()) {
        return Err(invalid("Unknown campaign event."));
    }
    let visitor = digest(&crate::app::buyer(&headers)?);
    state
        .rate_limit(&format!("ad-events:{visitor}"), 60)
        .await?;
    let doc = read_document(&state, "campaigns").await?;
    if !doc["content"]
        .as_array()
        .into_iter()
        .flatten()
        .any(|a| a["id"] == id && active(a))
    {
        return Err(AppError::new(
            StatusCode::NOT_FOUND,
            "Campaign is inactive.",
        ));
    }
    sqlx::query("INSERT INTO ad_events VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING")
        .bind(id)
        .bind(visitor)
        .bind(input.kind)
        .bind(now() / 86400)
        .execute(&state.db)
        .await
        .map_err(|_| AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
#[derive(Deserialize, Default)]
pub struct ListQuery {
    pub offset: Option<u32>,
    pub q: Option<String>,
}
async fn source_admin(state: &AppState, headers: &HeaderMap, path: &str) -> Result<Value> {
    let access = crate::app::required_access(state, headers).await?;
    state
        .source(reqwest::Method::GET, path, Some(&access), None, None)
        .await
}
async fn orders(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListQuery>,
) -> Result<Json<Value>> {
    authorize(&state, &headers, "orders").await?;
    let q = query.q.unwrap_or_default();
    if q.chars().count() > 100 {
        return Err(invalid("Search must be 100 characters or fewer."));
    }
    let mut path = url::Url::parse("https://internal/marketplace/admin/orders")
        .map_err(|_| AppError::internal())?;
    path.query_pairs_mut()
        .append_pair("offset", &query.offset.unwrap_or(0).to_string())
        .append_pair("q", &q);
    let result = source_admin(
        &state,
        &headers,
        &format!("{}?{}", path.path(), path.query().unwrap_or_default()),
    )
    .await?;
    Ok(Json(result))
}
async fn reviews(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListQuery>,
) -> Result<Json<Value>> {
    authorize(&state, &headers, "reviews").await?;
    let rows=sqlx::query("SELECT r.id,r.product_id,r.shop_id,r.display_name,r.comment,CAST(r.rating AS BIGINT) AS rating,r.created_at,COALESCE(m.hidden,0) AS hidden,COALESCE(m.reason,'') AS reason FROM reviews r LEFT JOIN review_moderation m ON m.review_id=r.id ORDER BY r.created_at DESC,r.id DESC LIMIT 51 OFFSET $1")
        .bind(i64::from(query.offset.unwrap_or(0))).fetch_all(&state.db).await.map_err(|_|AppError::internal())?;
    let mut values = Vec::new();
    for row in rows {
        values.push(json!({"id":row.try_get::<String,_>("id").map_err(|_|AppError::internal())?,"product_id":row.try_get::<String,_>("product_id").map_err(|_|AppError::internal())?,"shop_id":row.try_get::<String,_>("shop_id").map_err(|_|AppError::internal())?,"display_name":row.try_get::<String,_>("display_name").map_err(|_|AppError::internal())?,"comment":row.try_get::<String,_>("comment").map_err(|_|AppError::internal())?,"rating":row.try_get::<i64,_>("rating").map_err(|_|AppError::internal())?,"created_at":row.try_get::<i64,_>("created_at").map_err(|_|AppError::internal())?,"hidden":row.try_get::<i64,_>("hidden").map_err(|_|AppError::internal())?!=0,"reason":row.try_get::<String,_>("reason").map_err(|_|AppError::internal())?}));
    }
    let more = values.len() > 50;
    values.truncate(50);
    Ok(Json(json!({"reviews":values,"has_more":more})))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Visibility {
    hidden: bool,
    reason: String,
}
async fn review_visibility(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<Visibility>,
) -> Result<Json<Value>> {
    let admin = authorize(&state, &headers, "reviews").await?;
    crate::app::uuid(&id)?;
    if !(5..=1000).contains(&input.reason.trim().chars().count()) {
        return Err(invalid("Provide a moderation reason (5–1,000 characters)."));
    }
    let mut tx = state.db.begin().await.map_err(|_| AppError::internal())?;
    if sqlx::query("SELECT id FROM reviews WHERE id=$1")
        .bind(&id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|_| AppError::internal())?
        .is_none()
    {
        return Err(AppError::new(StatusCode::NOT_FOUND, "Review not found."));
    }
    sqlx::query("INSERT INTO review_moderation VALUES($1,$2,$3) ON CONFLICT(review_id) DO UPDATE SET hidden=excluded.hidden,reason=excluded.reason").bind(&id).bind(i64::from(input.hidden)).bind(input.reason.trim()).execute(&mut *tx).await.map_err(|_|AppError::internal())?;
    audit(
        &mut tx,
        &admin.actor,
        if input.hidden {
            "review.hidden"
        } else {
            "review.restored"
        },
        &id,
        input.reason.trim(),
    )
    .await?;
    tx.commit().await.map_err(|_| AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
async fn activity(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListQuery>,
) -> Result<Json<Value>> {
    authorize(&state, &headers, "activity").await?;
    let rows=sqlx::query("SELECT id,actor,action,target,detail,created_at FROM admin_activity ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET $1").bind(i64::from(query.offset.unwrap_or(0))).fetch_all(&state.db).await.map_err(|_|AppError::internal())?;
    let mut values = Vec::new();
    for row in rows {
        values.push(json!({"id":row.try_get::<String,_>("id").map_err(|_|AppError::internal())?,"actor":row.try_get::<String,_>("actor").map_err(|_|AppError::internal())?,"action":row.try_get::<String,_>("action").map_err(|_|AppError::internal())?,"target":row.try_get::<String,_>("target").map_err(|_|AppError::internal())?,"detail":row.try_get::<String,_>("detail").map_err(|_|AppError::internal())?,"created_at":row.try_get::<i64,_>("created_at").map_err(|_|AppError::internal())?}));
    }
    let more = values.len() > 50;
    values.truncate(50);
    Ok(Json(json!({"activity":values,"has_more":more})))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct NoteInput {
    target_type: String,
    target_id: String,
    content: String,
}
#[derive(Deserialize)]
struct NoteQuery { target_type: String, target_id: String }
async fn notes(State(state): State<AppState>, headers: HeaderMap, Query(query): Query<NoteQuery>) -> Result<Json<Value>> {
    authorize(&state, &headers, "reports").await?;
    if !["report","order"].contains(&query.target_type.as_str()) { return Err(invalid("Choose a report or order.")); }
    if query.target_type=="order" { authorize(&state,&headers,"orders").await?; }
    crate::app::uuid(&query.target_id)?;
    let rows=sqlx::query("SELECT id,target_type,target_id,actor,content,created_at FROM admin_notes WHERE target_type=$1 AND target_id=$2 ORDER BY created_at DESC,id DESC LIMIT 200").bind(query.target_type).bind(query.target_id).fetch_all(&state.db).await.map_err(|_|AppError::internal())?;
    let mut values = Vec::new();
    for row in rows {
        values.push(json!({"id":row.try_get::<String,_>("id").map_err(|_|AppError::internal())?,"target_type":row.try_get::<String,_>("target_type").map_err(|_|AppError::internal())?,"target_id":row.try_get::<String,_>("target_id").map_err(|_|AppError::internal())?,"actor":row.try_get::<String,_>("actor").map_err(|_|AppError::internal())?,"content":row.try_get::<String,_>("content").map_err(|_|AppError::internal())?,"created_at":row.try_get::<i64,_>("created_at").map_err(|_|AppError::internal())?}));
    }
    Ok(Json(json!({"notes":values})))
}
async fn add_note(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<NoteInput>,
) -> Result<Json<Value>> {
    let admin = authorize(&state, &headers, "reports").await?;
    if !["report", "order"].contains(&input.target_type.as_str())
        || !(1..=2000).contains(&input.content.trim().chars().count())
    {
        return Err(invalid(
            "Choose a report or order and write a note (at most 2,000 characters).",
        ));
    }
    if input.target_type == "order" {
        authorize(&state, &headers, "orders").await?;
    }
    crate::app::uuid(&input.target_id)?;
    let mut tx = state.db.begin().await.map_err(|_| AppError::internal())?;
    sqlx::query("INSERT INTO admin_notes VALUES($1,$2,$3,$4,$5,$6)")
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&input.target_type)
        .bind(&input.target_id)
        .bind(&admin.actor)
        .bind(input.content.trim())
        .bind(now())
        .execute(&mut *tx)
        .await
        .map_err(|_| AppError::internal())?;
    audit(
        &mut tx,
        &admin.actor,
        "note.added",
        &input.target_id,
        "Added internal support note",
    )
    .await?;
    tx.commit().await.map_err(|_| AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
async fn access_list(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Value>> {
    authorize(&state, &headers, "access").await?;
    let mut users = source_admin(&state, &headers, "/marketplace/admin/users").await?;
    for user in users["users"]
        .as_array_mut()
        .ok_or_else(AppError::internal)?
    {
        user["marketplace_role"] =
            json!(role(&state, user["id"].as_str().ok_or_else(AppError::internal)?).await?);
    }
    Ok(Json(users))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RoleInput {
    role: String,
}
async fn save_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<RoleInput>,
) -> Result<Json<Value>> {
    let admin = authorize(&state, &headers, "access").await?;
    crate::app::uuid(&id)?;
    if id == admin.actor {
        return Err(invalid("You cannot change your own access."));
    }
    if !["owner", "moderator", "support", "blocked"].contains(&input.role.as_str()) {
        return Err(invalid("Choose a supported role."));
    }
    let users = source_admin(&state, &headers, "/marketplace/admin/users").await?;
    if !users["users"]
        .as_array()
        .into_iter()
        .flatten()
        .any(|u| u["id"] == id)
    {
        return Err(invalid(
            "Only existing AriseSell administrators can receive marketplace roles.",
        ));
    }
    let mut tx = state.db.begin().await.map_err(|_| AppError::internal())?;
    // Serialize owner changes and recheck after locking, so two owners cannot block each other concurrently.
    sqlx::query("INSERT INTO admin_documents(key,content,revision,updated_at) VALUES('access_lock','{}',0,$1) ON CONFLICT(key) DO UPDATE SET revision=admin_documents.revision+1")
        .bind(now()).execute(&mut *tx).await.map_err(|_|AppError::internal())?;
    let current: Option<String> = sqlx::query_scalar("SELECT role FROM admin_roles WHERE user_id=$1")
        .bind(&admin.actor).fetch_optional(&mut *tx).await.map_err(|_|AppError::internal())?;
    if current.as_deref().is_some_and(|role|role!="owner") { return Err(denied()); }
    sqlx::query("INSERT INTO admin_roles VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role").bind(&id).bind(&input.role).execute(&mut *tx).await.map_err(|_|AppError::internal())?;
    audit(&mut tx, &admin.actor, "access.changed", &id, &input.role).await?;
    tx.commit().await.map_err(|_| AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
async fn health(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Value>> {
    authorize(&state, &headers, "health").await?;
    sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .map_err(|_| AppError::internal())?;
    let started = std::time::Instant::now();
    let source = state
        .source(reqwest::Method::GET, "/marketplace/feed", None, None, None)
        .await;
    let (status, synced_at) = match source {
        Ok(value) => ("connected", value["synced_at"].clone()),
        Err(_) => ("unavailable", Value::Null),
    };
    Ok(Json(
        json!({"metadata":"connected","source":status,"source_ms":started.elapsed().as_millis(),"synced_at":synced_at,"checked_at":now()}),
    ))
}
