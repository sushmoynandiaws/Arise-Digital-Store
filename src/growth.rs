//! Marketplace metadata; prices, offers and sales remain in AriseSell.
use crate::{
    AppState,
    app::{AppError, Result, buyer, required_access, uuid},
    digest, now,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::Html,
    routing::{get, post, put},
};
use serde::Deserialize;
use serde_json::{Value, json};
use sqlx::Row;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/products/{id}/questions", get(questions).post(ask))
        .route("/api/seller/stores/{id}/questions", get(seller_questions))
        .route("/api/seller/stores/{shop}/questions/{id}", put(answer))
        .route(
            "/api/seller/stores/{id}/offers",
            get(offers).put(save_offers),
        )
        .route(
            "/api/admin/stores/{id}/offers",
            get(admin_offers).put(admin_save_offers),
        )
        .route("/api/admin/questions", get(admin_questions))
        .route(
            "/api/admin/questions/{id}/visibility",
            put(question_visibility),
        )
        .route("/api/traffic", post(traffic))
        .route("/api/admin/analytics", get(analytics))
        .route("/shops/{slug}", get(shop_html))
        .route("/shops/{slug}/products/{product}", get(product_html))
        .route("/products/{id}", get(product_id_html))
}
async fn ready(state: &AppState) -> Result<bool> {
    Ok(
        sqlx::query_scalar::<_, i64>("SELECT version FROM schema_version WHERE version=5")
            .fetch_optional(&state.db)
            .await
            .map_err(|_| AppError::internal())?
            .is_some(),
    )
}
async fn require_ready(state: &AppState) -> Result<()> {
    if !ready(state).await? {
        return Err(AppError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "This feature is temporarily unavailable. Please try again later.",
        ));
    }
    Ok(())
}
fn invalid(message: &str) -> AppError {
    AppError::new(StatusCode::UNPROCESSABLE_ENTITY, message)
}
fn clean(value: &str, min: usize, max: usize) -> Result<String> {
    let value = value.trim();
    if !(min..=max).contains(&value.chars().count())
        || value.chars().any(|c| c.is_control() && c != '\n')
    {
        return Err(invalid(
            "Check the text length and remove control characters.",
        ));
    }
    Ok(value.into())
}
pub async fn decorate(state: &AppState, feed: &mut Value) -> Result<()> {
    let shops: Vec<String> = feed["shops"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|s| s["id"].as_str().map(str::to_owned))
        .collect();
    let products: Vec<String> = feed["products"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|p| p["id"].as_str().map(str::to_owned))
        .collect();
    if let Some(offers) = feed["offers"].as_array_mut() {
        offers.retain(|offer| {
            shops.iter().any(|s| offer["shop_id"] == *s)
                && offer["product_ids"].as_array().is_none_or(|ids| {
                    ids.iter().any(|id| {
                        id.as_str()
                            .is_some_and(|id| products.iter().any(|p| p == id))
                    }) || ids.is_empty()
                })
        });
    }
    if crate::admin::schema_ready(state).await? {
        let badges = crate::admin::read_document(state, "badges").await?;
        for shop in feed["shops"].as_array_mut().into_iter().flatten() {
            if let Some(badge) = badges["content"][shop["id"].as_str().unwrap_or("")].as_object()
                && badge
                    .get("expires_at")
                    .and_then(Value::as_i64)
                    .is_some_and(|end| end > now())
            {
                shop["merchant_badge"] = json!({"label":badge["label"],"expires_at":badge["expires_at"],"reviewed":true});
            }
        }
    }
    Ok(())
}
async fn public_product(state: &AppState, id: &str) -> Result<Value> {
    uuid(id)?;
    crate::app::feed(state).await?["products"]
        .as_array()
        .into_iter()
        .flatten()
        .find(|p| p["id"] == id)
        .cloned()
        .ok_or_else(|| AppError::new(StatusCode::NOT_FOUND, "Product unavailable."))
}
#[derive(Deserialize, Default)]
struct Page {
    #[serde(default)]
    offset: u32,
}
async fn question_rows(
    state: &AppState,
    field: &str,
    id: &str,
    public: bool,
    offset: u32,
) -> Result<Value> {
    require_ready(state).await?;
    let clause = if field == "all" {
        "$1='all'".to_owned()
    } else {
        format!("{field}=$1")
    };
    let query = format!(
        "SELECT id,product_id,shop_id,display_name,question,answer,hidden,created_at,answered_at FROM product_questions WHERE {clause} {} ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET $2",
        if public {
            "AND hidden=0 AND answer<>''"
        } else {
            ""
        }
    );
    let rows = sqlx::query(&query)
        .bind(id)
        .bind(i64::from(offset.min(10000)))
        .fetch_all(&state.db)
        .await
        .map_err(|_| AppError::internal())?;
    let mut items = Vec::new();
    for row in rows.iter().take(50) {
        items.push(json!({"id":row.try_get::<String,_>("id").map_err(|_|AppError::internal())?,
            "product_id":row.try_get::<String,_>("product_id").map_err(|_|AppError::internal())?,
            "shop_id":row.try_get::<String,_>("shop_id").map_err(|_|AppError::internal())?,
            "display_name":row.try_get::<String,_>("display_name").map_err(|_|AppError::internal())?,
            "question":row.try_get::<String,_>("question").map_err(|_|AppError::internal())?,
            "answer":row.try_get::<String,_>("answer").map_err(|_|AppError::internal())?,
            "hidden":row.try_get::<i64,_>("hidden").map_err(|_|AppError::internal())?==1,
            "created_at":row.try_get::<i64,_>("created_at").map_err(|_|AppError::internal())?,
            "answered_at":row.try_get::<i64,_>("answered_at").map_err(|_|AppError::internal())?}));
    }
    Ok(json!({"questions":items,"has_more":rows.len()>50}))
}
async fn questions(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(page): Query<Page>,
) -> Result<Json<Value>> {
    public_product(&state, &id).await?;
    if !ready(&state).await? {
        return Ok(Json(json!({"questions":[],"has_more":false})));
    }
    Ok(Json(
        question_rows(&state, "product_id", &id, true, page.offset).await?,
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Question {
    display_name: String,
    question: String,
}
async fn ask(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<Question>,
) -> Result<Json<Value>> {
    require_ready(&state).await?;
    let product = public_product(&state, &id).await?;
    let visitor = digest(&buyer(&headers)?);
    state.rate_limit(&format!("questions:{visitor}"), 6).await?;
    let name = clean(&input.display_name, 2, 60)?;
    let question = clean(&input.question, 10, 1000)?;
    sqlx::query("INSERT INTO product_questions(id,product_id,shop_id,visitor_hash,display_name,question,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)")
        .bind(uuid::Uuid::new_v4().to_string()).bind(id).bind(product["shop_id"].as_str().ok_or_else(AppError::internal)?)
        .bind(visitor).bind(name).bind(question).bind(now()).execute(&state.db).await.map_err(|_|AppError::internal())?;
    Ok(Json(
        json!({"ok":true,"message":"Question sent. It appears publicly after the seller answers."}),
    ))
}
async fn owner(state: &AppState, headers: &HeaderMap, shop: &str) -> Result<String> {
    uuid(shop)?;
    let access = required_access(state, headers).await?;
    state
        .source(
            reqwest::Method::GET,
            &format!("/marketplace/stores/{shop}/catalog"),
            Some(&access),
            None,
            None,
        )
        .await?;
    Ok(access)
}
async fn seller_questions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Query(page): Query<Page>,
) -> Result<Json<Value>> {
    owner(&state, &headers, &id).await?;
    Ok(Json(
        question_rows(&state, "shop_id", &id, false, page.offset).await?,
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Answer {
    answer: String,
}
async fn answer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((shop, id)): Path<(String, String)>,
    Json(input): Json<Answer>,
) -> Result<Json<Value>> {
    owner(&state, &headers, &shop).await?;
    require_ready(&state).await?;
    uuid(&id)?;
    let answer = clean(&input.answer, 2, 2000)?;
    let changed = sqlx::query(
        "UPDATE product_questions SET answer=$1,answered_at=$2 WHERE id=$3 AND shop_id=$4",
    )
    .bind(answer)
    .bind(now())
    .bind(id)
    .bind(shop)
    .execute(&state.db)
    .await
    .map_err(|_| AppError::internal())?
    .rows_affected();
    if changed != 1 {
        return Err(AppError::new(StatusCode::NOT_FOUND, "Question not found."));
    }
    Ok(Json(json!({"ok":true})))
}
async fn admin_questions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(page): Query<Page>,
) -> Result<Json<Value>> {
    crate::admin::authorize(&state, &headers, "reviews").await?;
    Ok(Json(
        question_rows(&state, "all", "all", false, page.offset).await?,
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Visibility {
    hidden: bool,
    reason: String,
}
async fn question_visibility(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(input): Json<Visibility>,
) -> Result<Json<Value>> {
    let admin = crate::admin::authorize(&state, &headers, "reviews").await?;
    require_ready(&state).await?;
    uuid(&id)?;
    let reason = clean(&input.reason, 10, 500)?;
    let mut tx = state.db.begin().await.map_err(|_| AppError::internal())?;
    let changed = sqlx::query("UPDATE product_questions SET hidden=$1 WHERE id=$2")
        .bind(i64::from(input.hidden))
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|_| AppError::internal())?
        .rows_affected();
    if changed != 1 {
        return Err(AppError::new(StatusCode::NOT_FOUND, "Question not found."));
    }
    crate::admin::audit(&mut tx, &admin.actor, "question.visibility", &id, &reason).await?;
    tx.commit().await.map_err(|_| AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
async fn source_offers(
    state: &AppState,
    headers: &HeaderMap,
    id: &str,
    body: Option<Value>,
) -> Result<Json<Value>> {
    uuid(id)?;
    let access = required_access(state, headers).await?;
    Ok(Json(
        state
            .source(
                if body.is_some() {
                    reqwest::Method::PUT
                } else {
                    reqwest::Method::GET
                },
                &format!("/marketplace/stores/{id}/offers"),
                Some(&access),
                None,
                body,
            )
            .await?,
    ))
}
async fn offers(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    owner(&state, &headers, &id).await?;
    source_offers(&state, &headers, &id, None).await
}
async fn save_offers(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>> {
    owner(&state, &headers, &id).await?;
    source_offers(&state, &headers, &id, Some(body)).await
}
async fn admin_offers(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    crate::admin::authorize(&state, &headers, "campaigns").await?;
    source_offers(&state, &headers, &id, None).await
}
async fn admin_save_offers(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>> {
    let admin = crate::admin::authorize(&state, &headers, "campaigns").await?;
    let result = source_offers(&state, &headers, &id, Some(body)).await?;
    let mut tx = state.db.begin().await.map_err(|_| AppError::internal())?;
    crate::admin::audit(
        &mut tx,
        &admin.actor,
        "offers.saved",
        &id,
        "Updated source-owned store offers",
    )
    .await?;
    tx.commit().await.map_err(|_| AppError::internal())?;
    Ok(result)
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Visit {
    kind: String,
    target_id: String,
}
async fn traffic(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<Visit>,
) -> Result<Json<Value>> {
    require_ready(&state).await?;
    let day = now() / 86400;
    let visitor = digest(&format!("{}:{day}", buyer(&headers)?));
    state.rate_limit(&format!("traffic:{visitor}"), 100).await?;
    let valid = if input.kind == "home" {
        input.target_id.is_empty()
    } else if input.kind == "listing" {
        ["products", "shops"].contains(&input.target_id.as_str())
    } else {
        uuid(&input.target_id)?;
        let feed = crate::app::feed(&state).await?;
        let field = match input.kind.as_str() {
            "shop" => "shops",
            "product" => "products",
            _ => return Err(invalid("Unknown visit type.")),
        };
        feed[field]
            .as_array()
            .into_iter()
            .flatten()
            .any(|item| item["id"] == input.target_id)
    };
    if !valid {
        return Err(invalid("Page unavailable."));
    }
    sqlx::query("INSERT INTO traffic_events VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING")
        .bind(day)
        .bind(visitor)
        .bind(input.kind)
        .bind(input.target_id)
        .execute(&state.db)
        .await
        .map_err(|_| AppError::internal())?;
    // Bound retention; daily hashes cannot be used to follow people between days.
    sqlx::query("DELETE FROM traffic_events WHERE day<$1")
        .bind(day - 90)
        .execute(&state.db)
        .await
        .map_err(|_| AppError::internal())?;
    Ok(Json(json!({"ok":true})))
}
async fn analytics(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Value>> {
    crate::admin::authorize(&state, &headers, "activity").await?;
    require_ready(&state).await?;
    let access = required_access(&state, &headers).await?;
    let sales = state
        .source(
            reqwest::Method::GET,
            "/marketplace/admin/analytics",
            Some(&access),
            None,
            None,
        )
        .await?;
    let rows = sqlx::query("SELECT day,COUNT(DISTINCT visitor_hash) AS visitors,COUNT(*) AS page_views FROM traffic_events WHERE day>=$1 GROUP BY day ORDER BY day")
        .bind(now()/86400-29).fetch_all(&state.db).await.map_err(|_|AppError::internal())?;
    let daily: Vec<Value> = rows.iter().map(|r|Ok(json!({"day":r.try_get::<i64,_>("day")?,"visitors":r.try_get::<i64,_>("visitors")?,"page_views":r.try_get::<i64,_>("page_views")?}))).collect::<std::result::Result<_,sqlx::Error>>().map_err(|_|AppError::internal())?;
    let rows = sqlx::query("SELECT target_id,COUNT(*) AS views FROM traffic_events WHERE kind='product' AND day>=$1 GROUP BY target_id").bind(now()/86400-29).fetch_all(&state.db).await.map_err(|_|AppError::internal())?;
    let feed = crate::app::feed(&state).await?;
    let mut categories = std::collections::BTreeMap::<String, i64>::new();
    for row in rows {
        let id: String = row.try_get("target_id").map_err(|_| AppError::internal())?;
        if let Some(p) = feed["products"]
            .as_array()
            .into_iter()
            .flatten()
            .find(|p| p["id"] == id)
        {
            *categories
                .entry(p["category"].as_str().unwrap_or("Other").into())
                .or_default() += row
                .try_get::<i64, _>("views")
                .map_err(|_| AppError::internal())?;
        }
    }
    Ok(Json(
        json!({"daily":daily,"categories":categories,"sales":sales["sales"],"checked_at":sales["checked_at"]}),
    ))
}
fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}
async fn share_html(
    state: &AppState,
    shop: &str,
    product: Option<&str>,
    by_id: bool,
) -> Result<Html<String>> {
    let feed = crate::app::feed(state).await?;
    let selected = product.and_then(|id| {
        feed["products"].as_array()?.iter().find(|p| {
            if by_id {
                p["id"] == id
            } else {
                p["url_slug"] == id
                    && feed["shops"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .any(|s| s["id"] == p["shop_id"] && s["slug"] == shop)
            }
        })
    });
    let seller = feed["shops"]
        .as_array()
        .into_iter()
        .flatten()
        .find(|s| selected.map_or(s["slug"] == shop, |p| s["id"] == p["shop_id"]));
    let seller = seller.ok_or_else(|| AppError::new(StatusCode::NOT_FOUND, "Shop unavailable."))?;
    if product.is_some() && selected.is_none() {
        return Err(AppError::new(StatusCode::NOT_FOUND, "Product unavailable."));
    }
    let item = selected.unwrap_or(seller);
    let name = item["name"].as_str().unwrap_or("Arise Store");
    let description = item["description"]
        .as_str()
        .unwrap_or("")
        .chars()
        .take(240)
        .collect::<String>();
    let price = selected
        .and_then(|p| p["variants"].as_array())
        .and_then(|v| {
            v.iter()
                .filter_map(|v| v["price"].as_str()?.parse::<f64>().ok())
                .filter(|p| p.is_finite() && *p > 0.0)
                .min_by(f64::total_cmp)
        });
    let description = price.map_or(description.clone(), |p| {
        format!(
            "From {} {p:.2}. {description}",
            item["currency"].as_str().unwrap_or("BDT")
        )
    });
    let image = item[if selected.is_some() {
        "image_url"
    } else {
        "cover_url"
    }]
    .as_str()
    .filter(|s| s.starts_with("https://"))
    .or_else(|| {
        seller["logo_url"]
            .as_str()
            .filter(|s| s.starts_with("https://"))
    })
    .unwrap_or("");
    let slug = seller["slug"].as_str().unwrap_or("");
    let path = selected.map_or(format!("/shops/{slug}"), |p| {
        p["url_slug"].as_str().map_or_else(
            || format!("/products/{}", p["id"].as_str().unwrap_or("")),
            |slug| {
                format!(
                    "/shops/{}/products/{slug}",
                    seller["slug"].as_str().unwrap_or("")
                )
            },
        )
    });
    let url = format!("{}{path}", state.config.origin);
    let mut shell = match std::fs::read_to_string("web/dist/index.html") {
        Ok(html) => html,
        Err(_) => state
            .http
            .get(format!("{}/index.html", state.config.origin))
            .send()
            .await
            .map_err(|_| AppError::internal())?
            .error_for_status()
            .map_err(|_| AppError::internal())?
            .text()
            .await
            .map_err(|_| AppError::internal())?,
    };
    if let (Some(start), Some(end)) = (shell.find("<title>"), shell.find("</title>")) {
        shell.replace_range(
            start..end + 8,
            &format!("<title>{} | Arise Store</title>", escape(name)),
        );
    }
    if let Some(start) = shell.find("<meta name=\"description\"")
        && let Some(end) = shell[start..].find('>')
    {
        shell.replace_range(start..start + end + 1, "");
    }
    let meta = format!(
        "<meta property=\"og:type\" content=\"{}\"><meta property=\"og:title\" content=\"{}\"><meta property=\"og:description\" content=\"{}\"><meta property=\"og:url\" content=\"{}\"><meta property=\"og:image\" content=\"{}\"><meta name=\"twitter:card\" content=\"summary_large_image\"><link rel=\"canonical\" href=\"{}\">",
        if selected.is_some() {
            "product"
        } else {
            "website"
        },
        escape(name),
        escape(&description),
        escape(&url),
        escape(image),
        escape(&url)
    );
    // Reuse only the moderated public feed; escape HTML delimiters in the inert JSON block.
    let catalog = feed
        .to_string()
        .replace('&', "\\u0026")
        .replace('<', "\\u003c")
        .replace('>', "\\u003e");
    let shell = shell.replace(
        "</head>",
        &format!(
            "{meta}<script id=\"arise-catalog\" type=\"application/json\">{catalog}</script></head>"
        ),
    );
    let shell = shell.replace("</head>", &format!("<meta name=\"description\" content=\"{}\">{}</head>",escape(&description),price.map_or(String::new(),|price|format!("<meta property=\"product:price:amount\" content=\"{price:.2}\"><meta property=\"product:price:currency\" content=\"{}\">",escape(item["currency"].as_str().unwrap_or("BDT"))))));
    Ok(Html(shell))
}
async fn shop_html(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Html<String>> {
    share_html(&state, &slug, None, false).await
}
async fn product_html(
    State(state): State<AppState>,
    Path((slug, product)): Path<(String, String)>,
) -> Result<Html<String>> {
    share_html(&state, &slug, Some(&product), false).await
}
async fn product_id_html(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Html<String>> {
    uuid(&id)?;
    share_html(&state, "", Some(&id), true).await
}
