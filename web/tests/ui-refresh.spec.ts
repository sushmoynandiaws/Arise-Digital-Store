import { test, expect, type Page } from "@playwright/test";
import type { Catalog, Product, Purchase, Shop } from "../src/types";

// Isolated UI samples: no payment requests or production catalog writes.
const shop: Shop = { id: "sample-shop", slug: "studio-north", name: "Studio North", description: "Thoughtful design assets and templates for your next creative chapter.", support: "hello@example.test", logo_url: "", cover_url: "", published: true, payment_methods: ["bkash", "nagad", "rocket"] };
const otherShop: Shop = { ...shop, id: "sample-learning", slug: "open-chapter", name: "Open Chapter", description: "Practical courses for curious people, in English and Bangla." };
const products: Product[] = [
  ["Notion Life Planner", "Templates", "490.00"],
  ["Practical Rust Essentials", "Education", "1200.00"],
  ["Minimal Brand Kit", "Design", "890.00"],
  ["বাংলা ডিজাইন কোর্স", "Education", "650.00"],
  ["Soft Light Texture Pack", "Photography", "390.00"],
  ["Personal Brand Review", "Design", "1490.00"],
].map(([name, category, price], index) => ({
  id: `sample-${index}`, shop_id: index % 2 ? otherShop.id : shop.id, name, category, description: "A thoughtful addition to your digital toolkit. Read the seller’s requirements and purchase terms before ordering.",
  image_url: "", currency: "BDT", delivery_mode: index === 5 ? "manual" : "automatic", delivery_estimate: "Prepared by the seller after payment verification.",
  delivery_note: "Find your private items in My purchases after verified payment.", purchase_terms: "For personal use. Contact the seller for help with this product.",
  required_buyer_fields: ["email"], sales_enabled: true, selected: true,
  variants: [{ id: `variant-${index}`, name: "Standard", price, stock: 12 }, { id: `extended-${index}`, name: "Extended", price: "1790.00", stock: 0 }],
}));
const catalog: Catalog = { shops: [shop, otherShop], products, synced_at: "2026-10-25T10:00:00Z" };
const readyOrder: Purchase = { id: "sample-order", ref: "SAMPLE-001", shop, name: products[0].name, product_id: products[0].id, quantity: 1, total: "490.00", currency: "BDT", payment_status: "paid", delivery_status: "delivered", delivery_mode: "automatic", delivery_estimate: "", created_at: "2026-10-25T10:00:00Z", ready: true, payment: null, buyer_name: "Sample Buyer", buyer_email: "buyer@example.test", can_review: true };

async function preview(page: Page, options: { signedIn?: boolean; admin?: boolean; empty?: boolean; failure?: boolean } = {}) {
  await page.route("https://example.test/**", route => route.fulfill({ status: 200, contentType: "text/html", body: "" }));
  await page.route("**/api/**", async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === "/api/session") return route.fulfill({ json: { user: options.signedIn ? { id: "sample-user", name: "Sample Seller", email: "seller@example.test", admin: !!options.admin } : null, csrf: "sample-csrf", demo: true, source_web: "https://example.test" } });
    if (endpoint === "/api/catalog") return route.fulfill(options.failure ? { status: 503, json: { error: "The catalog is temporarily unavailable. Try again." } } : { json: options.empty ? { ...catalog, products: [], shops: [] } : catalog });
    if (endpoint === "/api/orders") return route.fulfill({ json: { orders: options.empty ? [] : [readyOrder] } });
    if (endpoint === "/api/orders/sample-order") return route.fulfill({ json: readyOrder });
    if (endpoint === "/api/orders/sample-pending") return route.fulfill({ json: { ...readyOrder, id: "sample-pending", ref: "SAMPLE-002", payment_status: "unpaid", delivery_status: "awaiting_payment", ready: false, can_review: false, payment: { provider: "bkash", account: "SAMPLE-DO-NOT-PAY", amount: "490.00", trx_id: null, expires_at: new Date(Date.now() + 600000).toISOString() } } });
    if (endpoint === "/api/orders/sample-order/reveal") return route.fulfill({ json: { items: [{ item: 1, content: "SAMPLE PRIVATE ITEM — NOT A REAL CREDENTIAL" }] } });
    if (endpoint === "/api/seller") return route.fulfill({ json: { shops: [shop, otherShop] } });
    if (endpoint.startsWith("/api/seller/stores/")) return route.fulfill({ json: { shop, products, payment_methods: shop.payment_methods, active: true } });
    if (endpoint === "/api/admin") return route.fulfill({ json: { catalog, reports: [{ id: "sample-report", product_id: products[0].id, reason: "Sample report for marketplace review.", resolved: false, created_at: 1792922400 }], moderation: [] } });
    if (endpoint.endsWith("/reviews")) return route.fulfill({ json: { count: 0, average: null, has_more: false, reviews: [] } });
    throw new Error(`Unexpected UI request: ${endpoint}`);
  });
}

const routes = [
  ["home", "/"], ["products", "/products"], ["shops", "/shops"], ["shop", "/shops/studio-north"],
  ["product", "/products/sample-0"], ["checkout", "/checkout/sample-0"], ["purchases", "/purchases"],
  ["delivery", "/purchases/sample-order"], ["payment", "/purchases/sample-pending"], ["seller-connect", "/seller"],
  ["seller-workspace", "/seller"], ["admin", "/admin"], ["help", "/how-it-works"], ["not-found", "/missing-page"],
];

test("English and Bangla typography load while external font services are blocked", async ({ page }) => {
  const external: string[] = [];
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => { external.push(route.request().url()); return route.abort(); });
  await preview(page);
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "All products", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "বাংলা ডিজাইন কোর্স", exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const family of ["Urbanist", "Hind Siliguri"]) expect(await page.evaluate(name => [...document.fonts].some(face => face.family.includes(name) && face.status === "loaded"), family)).toBeTruthy();
  expect(external).toEqual([]);
});

for (const width of [320, 768, 1024, 1440]) {
  for (const [name, path] of routes) test(`${name} reflows and keeps usable controls at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width, height: 1000 });
      await preview(page, { signedIn: name === "seller-workspace" || name === "admin", admin: name === "admin" });
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("#main")).toBeVisible();
      if (name === "checkout") for (const method of ["bKash", "Nagad", "Rocket"]) {
        const option = page.locator(".payment-method").filter({ hasText: method });
        await expect(option.locator(".payment-logo")).toBeVisible();
        expect(await option.locator(".payment-logo").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      }
      if (name === "seller-workspace") await expect(page.getByRole("heading", { name: "Shop profile" })).toBeVisible();
      if (name === "admin") await expect(page.getByRole("heading", { name: "Published shops" })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const issues = await page.evaluate(() => {
        const problems: string[] = [];
        if (document.documentElement.scrollWidth > innerWidth) problems.push(`page overflow: ${document.documentElement.scrollWidth}`);
        for (const element of document.querySelectorAll<HTMLElement>("button, a, input, select, textarea, summary")) {
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height || element.closest(".sr-only") || element.classList.contains("skip-link")) continue;
          const input = element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type);
          const target = input ? element.closest("label")?.getBoundingClientRect() : rect;
          if (target && (target.height < 43 || target.width < 43)) problems.push(`small target: ${element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 35) || element.tagName}`);
          if (innerWidth <= 768 && element.matches('input:not([type="checkbox"]):not([type="radio"]),select,textarea') && parseFloat(getComputedStyle(element).fontSize) < 16) problems.push(`small input text: ${element.tagName}`);
        }
        return problems;
      });
      expect(issues, `${name} at ${width}px`).toEqual([]);
      const titleSize = await page.locator("h1").evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      if (name !== "home") expect(titleSize).toBeLessThanOrEqual(width <= 600 ? 30 : 36);
      await page.screenshot({ path: `../artifacts/copy-typography/${name}-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("keyboard menu, FAQ and moderation dialogs preserve focus", async ({ page }) => {
  await preview(page, { signedIn: true, admin: true });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/how-it-works");
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await menu.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(menu).toBeFocused();
  const question = page.locator(".faq-section summary").first();
  await question.focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".faq-section details").first()).toHaveAttribute("open", "");
  await page.goto("/admin");
  const hide = page.getByRole("button", { name: "Hide listing", exact: true }).first();
  await hide.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName(`Hide ${products[0].name}`);
  await expect(page.getByLabel("Reason for this action")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Close moderation" })).toBeFocused();
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement) || document.activeElement === document.body)).toBeTruthy();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0); await expect(hide).toBeFocused();
  await hide.click(); await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0); await expect(hide).toBeFocused();
  await hide.click(); await page.getByRole("button", { name: "Close moderation" }).click();
  await expect(dialog).toHaveCount(0); await expect(hide).toBeFocused();
});

const payment = { provider: "bkash", account: "SAMPLE-DO-NOT-PAY", amount: "490.00", trx_id: null, expires_at: "2999-01-01T00:00:00Z" };
const orderStates: [string, Partial<Purchase>, string, boolean, boolean][] = [
  ["unpaid", { payment_status: "unpaid", delivery_status: "awaiting_payment", ready: false, payment }, "Complete your payment", true, false],
  ["checking", { payment_status: "pending_verification", ready: false, payment: { ...payment, trx_id: "SAMPLE123" } }, "Checking your payment", true, false],
  ["review", { payment_status: "review_required", ready: false, payment }, "Your payment needs review", true, false],
  ["expired", { payment_status: "unpaid", ready: false, payment: { ...payment, expires_at: "2000-01-01T00:00:00Z" } }, "Payment request expired", false, false],
  ["manual", { ready: false, delivery_mode: "manual", delivery_status: "awaiting_manual", delivery_estimate: "Seller-provided delivery schedule remains unchanged." }, "Your order is being prepared", false, false],
  ["queued", { ready: false, delivery_status: "queued" }, "Preparing your digital items", false, false],
  ["attention", { ready: false, delivery_status: "needs_attention" }, "Your delivery needs attention", false, false],
  ["ready", {}, "Your order is ready", false, true],
  ["cancelled", { delivery_status: "cancelled", ready: true }, "Order cancelled", false, false],
  ["refunded", { payment_status: "refunded", delivery_status: "cancelled", ready: true, payment }, "Payment refunded", false, false],
  ["partial-refund", { payment_status: "partially_refunded", ready: true, payment }, "Payment partially refunded", false, false],
  ["unknown", { payment_status: "future-state", ready: false }, "Payment status unavailable", false, false],
];

for (const [name, changes, title, canPay, canAccess] of orderStates) test(`order copy matches ${name} without promising the wrong next step`, async ({ page }) => {
  await preview(page);
  const order = { ...readyOrder, can_review: false, ...changes };
  await page.route("**/api/orders/sample-order", route => route.fulfill({ json: order }));
  await page.goto("/purchases/sample-order");
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check payment", exact: true })).toHaveCount(canPay ? 1 : 0);
  await expect(page.getByRole("button", { name: "View my items", exact: true })).toHaveCount(canAccess ? 1 : 0);
  if (name === "manual") await expect(page.getByText(order.delivery_estimate, { exact: true })).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.locator("h1").evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBe(width === 320 ? 26 : 32);
    expect(await page.locator(".purchase-page-heading > p").last().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBe(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `../artifacts/copy-typography/status-${name}-${width}.png`, fullPage: true });
  }
  if (canAccess) {
    await page.getByRole("button", { name: "View my items" }).click();
    await expect(page.locator("pre[data-private]")).toContainText("SAMPLE PRIVATE ITEM");
    await page.getByRole("button", { name: "Hide my items" }).click();
    await expect(page.locator("pre[data-private]")).toHaveCount(0);
  }
});

test("seller artwork stays visible and failed images fall back to category artwork", async ({ page }) => {
  await preview(page);
  const withImage = structuredClone(catalog);
  withImage.products[0].image_url = "https://images.example.test/product.svg";
  await page.route("**/api/catalog", route => route.fulfill({ json: withImage }));
  await page.route("https://images.example.test/product.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#683de6"/></svg>' }));
  await page.goto("/products");
  const card = page.locator(".product-card").first();
  await expect(card.locator("img")).toBeVisible();
  await expect.poll(() => card.locator("img").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(card.locator(".art-digital-badge")).toHaveCount(0);
  await page.route("https://images.example.test/product.svg", route => route.fulfill({ status: 404 }));
  await page.reload();
  await expect(card.locator(".art-digital-badge")).toBeVisible();
  await expect(card.locator(".product-art img")).toHaveCount(0);
});

test("moderation errors stay inside the dialog and a successful retry updates the listing", async ({ page }) => {
  await preview(page, { signedIn: true, admin: true });
  let hidden = false;
  let attempts = 0;
  await page.route("**/api/admin", route => route.fulfill({ json: { catalog, reports: [], moderation: hidden ? [{ kind: "product", target_id: products[0].id, hidden, reason: "Review sample listing" }] : [] } }));
  await page.route("**/api/admin/moderation", route => {
    expect(route.request().postDataJSON()).toEqual({ kind: "product", target_id: products[0].id, hidden: true, reason: "Review sample listing" });
    if (++attempts === 1) return route.fulfill({ status: 503, json: { error: "Could not save this change. Try again." } });
    hidden = true;
    return route.fulfill({ json: {} });
  });
  await page.goto("/admin");
  const row = page.locator(".admin-row").filter({ hasText: products[0].name });
  await row.getByRole("button", { name: "Hide listing" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Reason for this action").fill("Review sample listing");
  await dialog.getByRole("button", { name: "Hide listing", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Could not save this change");
  await dialog.getByRole("button", { name: "Hide listing", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row.getByText("Hidden", { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
});

test("empty, failure, loading and permission states retain a useful next action", async ({ page }) => {
  await preview(page, { empty: true });
  await page.goto("/");
  await expect(page.locator(".empty").getByRole("link", { name: "Browse shops", exact: true })).toHaveAttribute("href", "/shops");
  await page.goto("/products"); await expect(page.getByRole("heading", { name: "No products found" })).toBeVisible();
  await page.goto("/purchases"); await expect(page.locator(".empty").getByRole("link", { name: "Browse products", exact: true })).toBeVisible();
  await page.goto("/admin"); await expect(page.getByRole("heading", { name: "Administrator access required", exact: true })).toBeVisible();
  await page.unroute("**/api/**"); await preview(page, { failure: true });
  await page.goto("/products"); await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await page.route("**/api/catalog", route => route.fulfill({ json: catalog }));
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(products.length);
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/catalog", async route => { await waiting; await route.fulfill({ json: catalog }); });
  await page.reload();
  await expect(page.locator('.loading[aria-busy="true"]')).toBeVisible();
  release(); await expect(page.locator(".product-card")).toHaveCount(products.length);
});
