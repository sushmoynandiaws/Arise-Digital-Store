import { test, expect, type Page } from "@playwright/test";
import type { Catalog, Product, Shop, SponsoredAd } from "../src/types";

const shop: Shop = { id: "11111111-1111-4111-8111-111111111111", slug: "sample-shop", name: "Sample shop", description: "Sample authorized digital products", support: "help@example.test", logo_url: "", cover_url: "", published: true };
const product: Product = { id: "22222222-2222-4222-8222-222222222222", shop_id: shop.id, name: "Sample digital course", category: "Learning", description: "Source-owned course details", image_url: "", variants: [{ id: "sample-variant", name: "Standard", price: "490.00", stock: 3 }], currency: "BDT", delivery_mode: "automatic", delivery_estimate: "", delivery_note: "", purchase_terms: "", required_buyer_fields: [], sales_enabled: true };
const catalog: Catalog = { shops: [shop], products: [product], synced_at: "2026-10-26T12:00:00Z" };
const owner = { id: "33333333-3333-4333-8333-333333333333", name: "Sample owner", email: "owner@example.test", admin: true };
const permissions = ["catalog", "moderate", "reports", "orders", "reviews", "campaigns", "content", "activity", "access", "health"];

async function preview(page: Page, options: { admin?: boolean; role?: string; denied?: boolean; sourceFailure?: boolean } = {}) {
  let user = { ...owner, admin: options.admin !== false } as typeof owner | null;
  let docRevision = 0, settingsRevision = 0;
  let ads: SponsoredAd[] = [];
  let settings: { hero_title?: string; announcement?: string; pages?: { privacy?: string } } = {};
  const moderation: { kind: string; target_id: string; hidden: boolean; reason: string }[] = [];
  const reports = [{ id: "44444444-4444-4444-8444-444444444444", product_id: product.id, reason: "Sample listing needs review", created_at: 1793016000, resolved: false }];
  const reviews = [{ id: "55555555-5555-4555-8555-555555555555", product_id: product.id, display_name: "Verified buyer", comment: "Actual sample purchase review", rating: 4, created_at: 1793016000, hidden: false, reason: "" }];
  const notes: { id: string; target_type: string; target_id: string; content: string; actor: string; created_at: number }[] = [];
  const actions: { id: string; action: string; target: string; detail: string; actor: string; created_at: number }[] = [];
  const requests: string[] = [];
  let failNextSave = false;
  await page.addInitScript(() => { localStorage.setItem("arise_lang", "en"); localStorage.setItem("arise_admin", "true"); });
  await page.route("**/api/**", route => {
    const url = new URL(route.request().url()), path = url.pathname, method = route.request().method();
    requests.push(`${method} ${path}`);
    const json = (value: unknown) => route.fulfill({ json: value });
    const event = (action: string, target: string) => actions.unshift({ id: crypto.randomUUID(), action, target, detail: "Sample administrative change", actor: owner.id, created_at: Date.now() / 1000 });
    if (path === "/api/session") return json({ user, csrf: "sample", demo: true, source_web: "https://source.example.test" });
    if (path === "/api/auth/logout") { user = null; return json({ ok: true }); }
    if (path === "/api/catalog") return json(catalog);
    if (path === "/api/seller") return json({ shops: [shop] });
    if (path === `/api/seller/stores/${shop.id}/catalog`) return json({ shop, products: [product] });
    if (path === "/api/promotions") return json({ ads: ads.filter(ad => ad.status === "active"), settings });
    if (path.includes("/events")) return json({ ok: true });
    if (!path.startsWith("/api/admin")) return route.fulfill({ status: 404, json: { error: "Sample endpoint unavailable" } });
    if (!user?.admin || options.denied) return route.fulfill({ status: 403, json: { error: "Administrator permission is required" } });
    const role = options.role || "owner";
    const caps = role === "support" ? ["catalog", "reports", "orders"] : permissions;
    if (path === "/api/admin") return json({ catalog, reports, moderation, permissions: caps, role, checked_at: Date.now() / 1000 });
    if (path === "/api/admin/moderation") {
      const body = route.request().postDataJSON() as typeof moderation[number];
      moderation.push(body); event("listing.hidden", body.target_id); return json({ ok: true });
    }
    if (path.includes("/reports/") && path.endsWith("/resolve")) { reports[0].resolved = true; event("report.resolved", reports[0].id); return json({ ok: true }); }
    if (path === "/api/admin/orders") {
      if (options.sourceFailure) return route.fulfill({ status: 503, json: { error: "AriseSell is temporarily unavailable" } });
      return json({ orders: [{ id: "66666666-6666-4666-8666-666666666666", ref: "SAMPLE-ORDER", shop_name: shop.name, name: product.name, buyer_name: "Sample buyer", buyer_email: "buyer@example.test", quantity: 1, total: "490.00", currency: "BDT", payment_status: "review_required", delivery_status: "awaiting_payment", created_at: "2026-10-26T12:00:00Z" }], summary: { total: 1, paid: 0, payment_issues: 1, delivery_issues: 0 }, has_more: false, checked_at: "2026-10-26T12:00:00Z" });
    }
    if (path === "/api/admin/reviews") return json({ reviews, has_more: false });
    if (path.includes("/reviews/") && method === "PUT") { const body = route.request().postDataJSON(); reviews[0].hidden = body.hidden; reviews[0].reason = body.reason; return json({ ok: true }); }
    if (path === "/api/admin/notes") {
      if (method === "GET") return json({ notes: notes.filter(n => n.target_type === url.searchParams.get("target_type") && n.target_id === url.searchParams.get("target_id")) });
      const body = route.request().postDataJSON(); notes.push({ ...body, id: crypto.randomUUID(), actor: owner.id, created_at: Date.now() / 1000 }); event("note.added", body.target_id); return json({ ok: true });
    }
    if (path === "/api/admin/activity") return json({ activity: actions, has_more: false });
    if (path === "/api/admin/health") return json({ metadata: "connected", source: "connected", source_ms: 30, synced_at: catalog.synced_at, checked_at: Date.now() / 1000 });
    if (path === "/api/admin/access") return json({ users: [{ ...owner, marketplace_role: "owner" }] });
    if (path.includes("/documents/")) {
      const campaigns = path.endsWith("campaigns");
      if (method === "GET") return json({ revision: campaigns ? docRevision : settingsRevision, content: campaigns ? ads : settings });
      if (failNextSave) { failNextSave = false; return route.fulfill({ status: 409, json: { error: "Another administrator updated this page. Reload before saving again." } }); }
      const body = route.request().postDataJSON();
      if (campaigns) { ads = body.content; docRevision++; } else { settings = body.content; settingsRevision++; }
      event("document.saved", campaigns ? "campaigns" : "settings");
      return json({ revision: campaigns ? docRevision : settingsRevision, content: body.content });
    }
    return route.fulfill({ status: 404, json: { error: "Sample endpoint unavailable" } });
  });
  return { requests, failSave: () => { failNextSave = true; } };
}

test("regular accounts never mount the console or request admin data even with local storage flags", async ({ page }) => {
  const state = await preview(page, { admin: false });
  const loaded: string[] = []; page.on("request", req => loaded.push(req.url()));
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Administrator access required" })).toBeVisible();
  await expect(page.locator(".admin-workspace")).toHaveCount(0);
  expect(state.requests.some(path => path.includes("/api/admin"))).toBeFalsy();
  expect(loaded.some(url => /\/src\/Admin\.tsx|\/assets\/Admin-/.test(url))).toBeFalsy();
  await page.goto("/seller");
  await expect(page.getByRole("heading", { name: "Manage your shop" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Marketplace admin" })).toHaveCount(0);
  await expect(page.locator(".ads-manager-panel, .admin-seller-highlight-card")).toHaveCount(0);
});

test("administrator has a separate shell and functional catalog moderation", async ({ page }) => {
  await preview(page); await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await expect(page.locator(".site-header, .dark-theme-footer, .sticky-bottom-ad-strip")).toHaveCount(0);
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByRole("button", { name: "Hide listing", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Reason for this action")).toBeFocused();
  await dialog.getByLabel("Reason for this action").fill("Review the seller-provided product details");
  await dialog.getByRole("button", { name: "Hide listing", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("tbody").getByText("Hidden", { exact: true })).toBeVisible();
  await page.getByLabel("Visibility", { exact: true }).selectOption("visible");
  await expect(page.getByText(/No matching products/)).toBeVisible();
});

test("campaign changes persist, errors retain edits, and deleting all does not restore fake ads", async ({ page }) => {
  const state = await preview(page); await page.goto("/admin/campaigns");
  await page.getByRole("button", { name: "Create campaign", exact: true }).click();
  await page.getByLabel("Campaign title", { exact: true }).fill("Sample authorized campaign");
  await page.getByLabel("Advertiser name", { exact: true }).fill("Sample advertiser");
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  state.failSave(); await page.getByRole("button", { name: "Save campaign", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Another administrator");
  await expect(page.getByLabel("Campaign title", { exact: true })).toHaveValue("Sample authorized campaign");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByLabel("Campaign title", { exact: true })).toHaveValue("Sample authorized campaign");
  await page.getByRole("button", { name: "Save campaign", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Sample authorized campaign");
  await page.reload(); await expect(page.locator("tbody")).toContainText("Sample authorized campaign");
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No campaigns yet" })).toBeVisible();
  await page.reload(); await expect(page.getByRole("heading", { name: "No campaigns yet" })).toBeVisible();
});

test("content saves to public pages and reports and order notes have working actions", async ({ page }) => {
  await preview(page); await page.goto("/admin/content");
  await page.getByLabel("Homepage heading", { exact: true }).fill("Our digital marketplace");
  await page.getByLabel("Privacy policy", { exact: true }).fill("Actual platform privacy text.");
  await page.getByRole("button", { name: "Save website content", exact: true }).click();
  await page.getByRole("link", { name: /Support & reports/ }).click();
  await page.getByRole("button", { name: "Internal notes" }).click();
  await page.getByLabel("Internal support note").fill("Checked the listing and contacted the seller separately.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(page.getByText("Checked the listing and contacted the seller separately.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resolve report", exact: true }).click();
  await expect(page.getByText("No reports in this view.")).toBeVisible();
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("SAMPLE-ORDER");
  await page.getByRole("button", { name: "Add support note" }).click();
  await expect(page.getByText("No internal notes yet.")).toBeVisible();
  await page.getByRole("link", { name: "View marketplace", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Our digital marketplace", exact: true })).toBeVisible();
  await page.goto("/info/privacy"); await expect(page.getByText("Actual platform privacy text.", { exact: true })).toBeVisible();
});

test("reviews, audit, access and health render actual API data", async ({ page }) => {
  await preview(page); await page.goto("/admin/reviews");
  await page.getByRole("button", { name: "Hide review", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.getByLabel("Reason for this action").fill("Customer requested moderation of this review");
  await dialog.getByRole("button", { name: "Hide review", exact: true }).click();
  await expect(page.getByText("4 / 5 · Hidden", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Team access", exact: true }).click();
  await expect(page.getByLabel("Role for Sample owner")).toBeDisabled();
  await page.getByRole("link", { name: "System health", exact: true }).click();
  await expect(page.getByText("connected", { exact: true })).toHaveCount(2);
  await page.getByRole("link", { name: "Activity log", exact: true }).click();
  await expect(page.getByText("No administrator changes recorded yet.")).toBeVisible();
});

test("support roles cannot navigate to owner features and server failures show no fabricated counts", async ({ page }) => {
  await preview(page, { role: "support", sourceFailure: true }); await page.goto("/admin/orders");
  await expect(page.getByRole("alert")).toContainText("AriseSell is temporarily unavailable");
  await expect(page.locator(".admin-stats")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Campaigns", exact: true })).toHaveCount(0);
  await page.goto("/admin/campaigns"); await expect(page.getByRole("heading", { name: "This view is unavailable for your role" })).toBeVisible();
});

test("admin workspace is responsive and sign out removes privileged UI", async ({ page }) => {
  await preview(page); await page.goto("/admin");
  await expect(page.locator(".admin-workspace")).toBeVisible();
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    if (width <= 800) {
      const menu = page.getByRole("button", { name: "Admin menu", exact: true }); await menu.click();
      await expect(page.getByRole("navigation", { name: "Administration" })).toBeVisible();
      await menu.click();
    }
    await page.screenshot({ path: `../artifacts/admin-console/overview-${width}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Administrator access required" })).toBeVisible();
  await expect(page.locator(".admin-workspace")).toHaveCount(0);
});

test("a stale or forged administrator session cannot render cached console data", async ({ page }) => {
  await preview(page, { denied: true }); await page.goto("/admin");
  await expect(page.getByRole("alert")).toContainText("Administrator permission is required");
  await expect(page.getByRole("navigation", { name: "Administration" })).toHaveCount(0);
});
