use arise_digital_store::{AppState, Config, app::api_router, db::connect_database};
use tower::Layer;
use vercel_runtime::{Error, axum::VercelLayer};

#[tokio::main]
async fn main() -> Result<(), Error> {
    let config = Config::from_env().map_err(std::io::Error::other)?;
    config
        .validate_serverless(std::env::var("VERCEL_ENV").as_deref() == Ok("development"))
        .map_err(std::io::Error::other)?;
    let db = connect_database(true)
        .await
        .map_err(std::io::Error::other)?;
    let state = AppState::new(config, db).map_err(std::io::Error::other)?;
    vercel_runtime::run(VercelLayer::new().layer(api_router(state))).await
}
