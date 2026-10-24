use arise_digital_store::{AppState, Config, app::router, db::connect_database};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let config = Config::from_env().map_err(std::io::Error::other)?;
    let bind = match std::env::var("PORT") {
        Ok(port) => format!("127.0.0.1:{}", port.parse::<u16>()?),
        Err(_) => std::env::var("BIND_ADDRESS").unwrap_or_else(|_| "127.0.0.1:8088".into()),
    };
    if config.demo && !bind.starts_with("127.0.0.1:") {
        return Err("Demo must bind to 127.0.0.1".into());
    }
    let db = connect_database(std::env::var("VERCEL").is_ok())
        .await
        .map_err(std::io::Error::other)?;
    let app = router(AppState::new(config, db).map_err(std::io::Error::other)?);
    let listener = tokio::net::TcpListener::bind(&bind).await?;
    println!("Arise Digital Store listening at http://{bind}");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(async {
        tokio::signal::ctrl_c().await.ok();
    })
    .await?;
    Ok(())
}
