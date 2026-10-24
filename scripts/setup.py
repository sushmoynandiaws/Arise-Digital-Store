"""Create private local-development configuration without overwriting existing settings."""
from pathlib import Path
import base64
import secrets

root = Path(__file__).resolve().parents[1]
target = root / ".env"
if target.exists():
    print("Existing .env retained. No configuration was overwritten.")
else:
    values = {
        "PUBLIC_ORIGIN": "http://localhost:8088",
        "ARISESELL_API_URL": "http://127.0.0.1:8111/api/v1",
        "ARISESELL_WEB_URL": "http://localhost:8111",
        "ARISESELL_BRIDGE_KEY": secrets.token_urlsafe(36),
        "SESSION_ENCRYPTION_KEY": base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("="),
        "DEMO_MODE": "true",
        "BIND_ADDRESS": "127.0.0.1:8088",
        "DATABASE_PATH": "data/marketplace.db",
    }
    target.write_text("\n".join(f"{key}={value}" for key, value in values.items()) + "\n", encoding="utf-8")
    target.chmod(0o600)
    print("Created .env with new local-only development secrets. Demo mode is explicit.")
(root / "data").mkdir(exist_ok=True)
