"""Local-only sample AriseSell transport using its real digital commerce services.

Run with the AriseSell backend development Python environment. This is not a
production backend and must never be exposed publicly or used with real stock.
"""
from pathlib import Path
import os
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get("ARISESELL_SOURCE_PATH", str(ROOT.parent / "next-product-2" / "backend"))).resolve()
if not (SOURCE / "app" / "api" / "v1" / "marketplace.py").exists():
    raise SystemExit("Set ARISESELL_SOURCE_PATH to the AriseSell backend checkout containing the marketplace bridge.")
sys.path.insert(0, str(SOURCE))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
if os.environ.get("DEMO_MODE") != "true":
    raise SystemExit("The sample source requires DEMO_MODE=true and only binds to localhost.")

DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
os.environ.update({"APP_ENV": "test", "DATABASE_URL": f"sqlite+aiosqlite:///{(DATA / 'demo-source.db').as_posix()}",
    "JWT_SECRET_KEY": os.environ["ARISESELL_BRIDGE_KEY"], "MARKETPLACE_BRIDGE_KEY": os.environ["ARISESELL_BRIDGE_KEY"],
    "MARKETPLACE_REDIRECT_URI": os.environ.get("PUBLIC_ORIGIN", "http://localhost:8088") + "/api/auth/callback",
    "GOOGLE_API_KEY": "", "GEMINI_API_KEY": "", "OPENAI_API_KEY": "", "ANTHROPIC_API_KEY": ""})

import base64
import hashlib
import html
import json
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
import fakeredis.aioredis
from cryptography.fernet import Fernet
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import event, select
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
import app.models
from app.core.config import settings
from app.core.database import Base, get_db
from app.api.v1 import marketplace as market
from app.models.user import User, UserSession
from app.models.tenant import Business
from app.models.product import Product, Variant
from app.models.order import Order
from app.models.payment_sms import SmsPayment
from app.schemas.digital import StockImportRequest, PrepareRequest
from app.services.digital_inventory import import_stock
from app.services import digital_checkout as checkout, digital_fulfilment as delivery


@compiles(UUID, "sqlite")
def sqlite_uuid(type_, compiler, **kwargs):
    return "CHAR(32)"


engine = create_async_engine(os.environ["DATABASE_URL"])
@event.listens_for(engine.sync_engine, "connect")
def foreign_keys(connection, _):
    connection.execute("PRAGMA foreign_keys=ON")

factory = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)
redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
market.get_redis_client = AsyncMock(return_value=redis)
keyfile = DATA / "demo-stock.key"
if not keyfile.exists():
    keyfile.write_bytes(Fernet.generate_key())
    keyfile.chmod(0o600)
settings.DIGITAL_STOCK_KEYS = json.dumps({"demo": keyfile.read_text().strip()})
settings.DIGITAL_STOCK_ACTIVE_KEY_ID = "demo"
settings.DIGITAL_STOCK_FINGERPRINT_KEY = hashlib.sha256((os.environ["ARISESELL_BRIDGE_KEY"] + ":demo-stock").encode()).hexdigest()

def ident(name):
    return uuid.uuid5(uuid.NAMESPACE_URL, "arise-marketplace-demo:" + name)

OWNER, ADMIN = ident("seller"), ident("admin")
NAMES = [
    ("studio-north", "Studio North", "Thoughtful design assets and templates for your next creative chapter."),
    ("orbit-learning", "Orbit Learning", "Practical guides and focused courses. Learn a little, make a lot."),
    ("pixel-supply", "Pixel Supply", "Useful digital tools for the people who like making things."),
]
ITEMS = [
    (0,"Notion Life Planner","Templates","A calmer space for your goals, projects, and everyday plans.","490",7),
    (2,"Studio Icons — Essential UI","Design assets","A considered collection of vector icons for your next interface.","790",12),
    (1,"Practical Rust Essentials","Learning","Build your foundations with hands-on Rust lessons and exercises.","1290",6),
    (2,"Everyday Film Presets","Photography","Warm, natural tones for photos with a little more feeling.","390",9),
    (0,"Freelancer Proposal Kit","Templates","A clear, editable starting point for your next great client project.","590",5),
    (2,"SaaS Starter Blueprint","Developer tools","Architecture notes and starter patterns for your next web project.","1490",4),
    (1,"Designing Better Interfaces","Learning","A practical guide to hierarchy, interaction, and useful design decisions.","890",8),
    (0,"Social Content Calendar","Productivity","Less last-minute planning. More room for ideas worth sharing.","290",11),
    (2,"Soft Light Texture Pack","Photography","A collection of subtle digital textures for your creative toolkit.","350",0),
    (0,"Landing Page Starter Kit","Design assets","A flexible set of layouts and interface building blocks.","990",6),
    (1,"Python Pocket Guide","Learning","Small, practical examples for your next Python project.","450",5),
    (0,"Personal Brand Review","Design assets","A focused, manually prepared review from the sample shop.","1900",3),
]

async def seed():
    names = {"businesses", "organizations", "products", "product_variants", "orders", "order_lines", "courier_bookings",
        "connected_channels", "conversations", "messages", "checkout_drafts", "checkout_receipts", "outbound_parts", "users", "user_sessions", "subscription_plans",
        "digital_stock_units", "digital_fulfilment_units", "digital_payment_requests", "digital_payment_entries", "digital_order_events",
        "sms_payment_ledger", "gateway_payment_receipts", "invoices", "payment_transaction_claims", "pipeline_cards", "courier_jobs", "lead_followups", "knowledge_entries"}
    async with engine.begin() as connection:
        await connection.run_sync(lambda c: Base.metadata.create_all(c, tables=[Base.metadata.tables[name] for name in names]))
    async with factory() as db:
        if await db.get(User, OWNER):
            return
        shops = []
        for slug, name, description in NAMES:
            business = Business(id=ident(slug), slug=slug, name=name, commerce_mode="digital", kind="Digital Products", settings_data={
                "owner_id": str(OWNER), "payment_verification_mode": "automated", "payment_gateways": {
                    "bkash": {"is_active": True, "mode": "personal", "personal_number": "01700000000"}},
                "marketplace_listing": {"published": True, "name": name, "description": description,
                    "support": "support@example.test", "product_ids": []}})
            shops.append(business)
            db.add(business)
        await db.flush()
        owner = User(id=OWNER, business_id=shops[0].id, first_name="Demo", last_name="Seller", email="seller@example.test",
            hashed_password="DEMO-NO-REAL-PASSWORD", is_active=True, is_verified=True)
        admin = User(id=ADMIN, first_name="Demo", last_name="Administrator", email="admin@example.test",
            hashed_password="DEMO-NO-REAL-PASSWORD", is_active=True, is_verified=True, is_superadmin=True)
        db.add_all([owner, admin])
        await db.flush()
        for user in [owner, admin]:
            db.add(UserSession(id=ident("session:" + str(user.id)), user_id=user.id, session_token=uuid.uuid4().hex, device_name="Local preview", is_active=True))
        for index, (shop_index, name, category, description, price, count) in enumerate(ITEMS):
            business = shops[shop_index]
            manual = index == len(ITEMS) - 1
            product = Product(id=ident(name), business_id=business.id, name=name, category=category, price=Decimal(price), image_url="",
                blurb=description + "\n\nThis is a sample product in an isolated development catalog. No real product or service is sold.",
                fulfilment_kind="digital", digital_config={"delivery_mode": "manual" if manual else "automatic", "sales_enabled": True,
                    "purchase_terms": "Local preview only. No real purchase or payment. Sample delivery details are not valid credentials.",
                    "delivery_note": "Your digital item will appear in My purchases after the sample payment is verified.",
                    "delivery_estimate": "Within one working day" if manual else "After payment verification", "required_buyer_fields": ["name"]})
            variant = Variant(id=ident(name + ":variant"), product_id=product.id, sku=f"DEMO-{index+1:03}", label="Standard", price=Decimal(price), stock=count if manual else 0)
            db.add_all([product, variant])
            await db.flush()
            if not manual and count:
                await import_stock(db, business, product, StockImportRequest(variant_id=variant.id, idempotency_key=f"demo-stock-{index:03}",
                    units=[{"content": f"SAMPLE ITEM — NOT A REAL CREDENTIAL\nProduct: {name}\nDemo access: DEMO-{index+1:03}-{unit+1:03}\nGuide: https://example.test/demo-only"} for unit in range(count)]), OWNER)
            listing = dict(business.settings_data["marketplace_listing"])
            listing["product_ids"] = [*listing["product_ids"], str(product.id)]
            business.settings_data = {**business.settings_data, "marketplace_listing": listing}
        await db.commit()

@asynccontextmanager
async def lifespan(app):
    await seed()
    yield
    await redis.aclose()
    await engine.dispose()

app = FastAPI(lifespan=lifespan)
app.include_router(market.router, prefix="/api/v1")
async def database():
    async with factory() as db:
        try:
            yield db
        except Exception:
            await db.rollback()
            raise
app.dependency_overrides[get_db] = database

@app.get("/health")
async def health():
    return {"status": "ok", "mode": "isolated-demo"}

@app.get("/marketplace/connect", response_class=HTMLResponse)
async def consent(request: Request):
    fields = "".join(f'<input type="hidden" name="{name}" value="{html.escape(request.query_params.get(name, ""), quote=True)}">' for name in ["state", "code_challenge", "redirect_uri"])
    return f'''<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo AriseSell connection</title><style>body{{font:16px/1.7 system-ui;background:#f5f7ef;color:#183e2b;padding:5vw}}main{{max-width:520px;margin:auto;background:white;padding:36px;border:1px solid #dce5d4;border-radius:20px}}button{{padding:14px 22px;border:0;border-radius:9px;background:#08704f;color:white;font:inherit;cursor:pointer;margin:12px 10px 0 0}}.muted{{color:#6a7865;font-size:13px}}</style><main><p class="muted">ISOLATED DEVELOPMENT FIXTURE</p><h1>Continue with AriseSell</h1><p>This local fixture uses AriseSell’s real stock, checkout, payment verification, and delivery services with sample data.</p><p>No password, real customer data, or real payment is used.</p><form method="post">{fields}<button name="account" value="seller">Continue as Demo Seller</button><button name="account" value="admin">Continue as Demo Administrator</button></form><p class="muted">Production uses the actual AriseSell sign-in and consent page.</p></main></html>'''

@app.post("/marketplace/connect")
async def approve(request: Request):
    data = await request.form()
    user_id = ADMIN if data.get("account") == "admin" else OWNER
    async with factory() as db:
        user = await db.get(User, user_id)
        req = market.Authorization(**{name: str(data.get(name, "")) for name in ["state", "code_challenge", "redirect_uri"]})
        result = await market.authorize(req, Response(), user=user, payload={"sub": str(user.id), "sid": str(ident("session:" + str(user.id)))})
    return RedirectResponse(result["redirect"], status_code=303)

@app.middleware("http")
async def demo_receipt(request: Request, call_next):
    if request.method == "POST" and re.fullmatch(r"/api/v1/marketplace/orders/[0-9a-f-]+/proof", request.url.path):
        market.bridge(request, Response())
        payload = await request.json()
        async with factory() as db:
            order = await db.get(Order, uuid.UUID(request.url.path.split("/")[-2]))
            if order:
                expected = "DEMO" + re.sub(r"\D", "", order.ref)
                if str(payload.get("trx_id", "")).upper() == expected:
                    payment = await checkout.payment_request_for(db, order)
                    if payment and not await db.scalar(select(SmsPayment.id).where(SmsPayment.trx_id == expected)):
                        db.add(SmsPayment(business_id=order.business_id, provider=payment.provider, wallet_number=payment.receiving_account,
                            trx_id=expected, amount=payment.amount, payer_phone="01700000000", sms_sender="DEMO",
                            raw_text="Synthetic receipt for local marketplace integration testing only", received_at=datetime.now(timezone.utc), status="UNCLAIMED"))
                        await db.commit()
    return await call_next(request)

@app.post("/demo/orders/{order_id}/prepare", dependencies=[Depends(market.bridge)])
async def prepare_manual(order_id: uuid.UUID):
    async with factory() as db:
        order = await db.get(Order, order_id)
        if not order:
            raise HTTPException(404, "Sample order not found")
        business = await db.get(Business, order.business_id)
        units = await checkout.units_for(db, order)
        await delivery.prepare_delivery(db, business, order, PrepareRequest(idempotency_key="demo-prepare-" + str(order_id),
            units=[{"fulfilment_id": unit.id, "content": f"SAMPLE MANUAL DELIVERY — NOT A REAL ITEM\nOrder: {order.ref}\nItem: {unit.unit_index}"} for unit in units]), OWNER)
        await delivery.queue_delivery(db, business, order, actor=OWNER, key="demo-send-" + str(order_id))
        await db.commit()
        return {"status": "ready"}

@app.get("/console/{path:path}", response_class=HTMLResponse)
async def console_help(path: str):
    return '<html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><main style="font:16px/1.8 system-ui;max-width:600px;margin:10vh auto;padding:24px"><h1>AriseSell development source</h1><p>This isolated fixture supports marketplace testing. Real catalog editing and seller order management use your existing AriseSell console after the bridge is configured there.</p><p>No production account, catalog or payment has been changed.</p><a href="http://localhost:8088/seller">Return to the sample seller dashboard</a></main></html>'

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8111, access_log=False)
