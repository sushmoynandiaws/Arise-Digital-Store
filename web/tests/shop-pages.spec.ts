import { test, expect, type Page } from "@playwright/test";

const sections = [
  ["privacy", "Privacy policy"], ["returns", "Returns & refund policy"],
  ["terms", "Terms & conditions"], ["about", "About us"], ["contact", "Contact us"],
] as const;

async function fixture(page: Page) {
  await page.addInitScript(() => localStorage.setItem("arise_lang", "en"));
  const shop = {
    id: "11111111-1111-4111-8111-111111111111", slug: "test-shop", name: "Test shop",
    description: "Digital products from our independent shop.", support: "help@example.test",
    logo_url: "", cover_url: "", published: false, payment_methods: ["bkash"],
    contact: { email: "help@example.test", address: "Dhaka" }, pages: {} as Record<string, string>,
  };
  const other = { ...shop, id: "22222222-2222-4222-8222-222222222222", slug: "other-shop", name: "Other shop", pages: { about: "A different shop." } };
  let failSave = false;
  const product = { id: "product", shop_id: shop.id, name: "Digital guide", category: "Education", description: "A digital guide", image_url: "", currency: "BDT", delivery_mode: "manual", delivery_estimate: "", delivery_note: "", purchase_terms: "", required_buyer_fields: [], sales_enabled: true, selected: true, variants: [{ id: "variant", name: "Guide", price: "100.00", stock: 3 }] };
  await page.route("**/api/**", route => {
    if (new URL(route.request().url()).pathname === "/api/promotions") return route.fulfill({ json: { ads: [], settings: {} } });
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === "/api/traffic") return route.fulfill({json:{ok:true}});
    if (endpoint.endsWith("/questions")) return route.fulfill({json:{questions:[],has_more:false}});
    if (endpoint.endsWith("/offers")) return route.fulfill({json:{offers:[],revision:"a".repeat(64)}});
    if (endpoint === "/api/session") return route.fulfill({ json: { user: { id: "seller", name: "Seller", admin: false }, csrf: "csrf", demo: false, source_web: "https://example.test" } });
    if (endpoint === "/api/catalog") return route.fulfill({ json: { shops: [shop, other], products: [product], synced_at: new Date().toISOString() } });
    if (endpoint === "/api/seller") return route.fulfill({ json: { shops: [shop, other] } });
    if (endpoint.endsWith("/catalog")) return route.fulfill({ json: { shop: endpoint.includes(other.id) ? other : shop, products: [product], payment_methods: ["bkash"], active: true } });
    if (endpoint.endsWith("/listing")) {
      if (failSave) return route.fulfill({ status: 503, json: { error: "Could not save shop information. Try again." } });
      const payload = route.request().postDataJSON();
      Object.assign(shop, payload);
      return route.fulfill({ json: { shop } });
    }
    throw new Error(`Unexpected request ${endpoint}`);
  });
  return { shop, fail: () => { failSave = true; } };
}

test("seller sets up all five pages, saves, reloads and customers read the same text", async ({ page }) => {
  const { shop } = await fixture(page);
  await page.goto("/seller");
  const panel = page.getByRole("region", { name: "Shop information & policies" });
  await expect(panel).toBeVisible();
  for (const [key, title] of sections) {
    await panel.locator("summary").filter({ hasText: title }).click();
    await panel.getByRole("textbox", { name: title, exact: true }).fill(`${title}\n\nআমাদের দোকানের তথ্য।\n<script>alert('text only')</script>`);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await panel.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: "../artifacts/shop-pages/seller-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Publish shop", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your shop is published" })).toBeVisible();
  await page.reload();
  await panel.locator("summary").filter({ hasText: "Privacy policy" }).click();
  await expect(panel.getByRole("textbox", { name: "Privacy policy", exact: true })).toHaveValue(shop.pages.privacy);
  // Switching shops must not carry the first shop's policy text across.
  await page.getByLabel("Choose your AriseSell shop").selectOption({ label: "Other shop" });
  await expect(page.getByLabel("Shop name", { exact: true })).toHaveValue("Other shop");
  await panel.locator("summary").filter({ hasText: "Privacy policy" }).click();
  await expect(panel.getByRole("textbox", { name: "Privacy policy", exact: true })).toHaveValue("");
  await page.getByLabel("Choose your AriseSell shop").selectOption({ label: "Test shop" });
  await expect(page.getByLabel("Shop name", { exact: true })).toHaveValue("Test shop");
  await panel.locator("summary").filter({ hasText: "Privacy policy" }).click();
  await expect(panel.getByRole("textbox", { name: "Privacy policy", exact: true })).toHaveValue(shop.pages.privacy);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "../artifacts/shop-pages/seller-desktop.png", fullPage: true });
  await page.goto("/shops/test-shop");
  for (const [key, title] of sections) {
    const link = page.locator("footer").getByRole("link", { name: title, exact: true });
    await expect(link).toHaveAttribute("href", `/shops/test-shop/info/${key}`);
    await link.click();
    await expect(page).toHaveURL(`/shops/test-shop/info/${key}`);
    await expect(page.getByRole("heading", { name: title, level: 1, exact: true })).toBeVisible();
    await expect(page.locator("main article")).toContainText(shop.pages[key]);
    await expect(page.locator("main article script")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Test shop shop home", exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL("/shops/test-shop");
  }
  await page.getByRole("navigation", { name: "Store navigation" }).getByRole("link", { name: "About this shop", exact: true }).click();
  await expect(page).toHaveURL("/shops/test-shop/info/about");
  await expect(page.getByRole("heading", { name: "About us", level: 1, exact: true })).toBeVisible();
});

test("customer pages support direct links, refresh, responsive layouts and bilingual content", async ({ page }) => {
  const { shop } = await fixture(page);
  shop.pages.privacy = "Customer information\n\n" + "আমাদের গোপনীয়তা নীতি। ".repeat(100);
  await page.goto("/shops/test-shop/info/privacy");
  const main = page.locator("main");
  await page.reload();
  await expect(main).toContainText(shop.pages.privacy);
  await expect(page).toHaveTitle("Privacy policy | Test shop");
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    await expect(main.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
    expect(await main.locator("article").evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    })).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await expect(main.getByRole("link", { name: "Back to shop" })).toHaveAttribute("href", "/shops/test-shop");
    if (width === 375 || width === 1440) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `../artifacts/shop-pages/customer-page-${width}.png` });
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  }
  await page.locator("footer").getByRole("link", { name: "Returns & refund policy", exact: true }).click();
  await expect(main).toContainText("This information has not been added yet.");
  await expect(main).not.toContainText("1-Month replacement guarantee");
  await page.locator("footer").getByRole("link", { name: "About us", exact: true }).click();
  await expect(main).toContainText(shop.description);
  await page.locator("footer").getByRole("link", { name: "Contact us", exact: true }).click();
  await expect(main.getByRole("link", { name: "Contact support" })).toHaveAttribute("href", "mailto:help@example.test");
  await expect(main).toContainText("Dhaka");
  await page.getByRole("group", { name: "Language selection / ভাষা নির্বাচন", exact: true }).getByRole("button", { name: "বাং", exact: true }).click();
  await page.locator("footer").getByRole("link", { name: "গোপনীয়তা নীতি", exact: true }).click();
  await expect(main.getByRole("heading", { name: "গোপনীয়তা নীতি", level: 1 })).toBeVisible();
  await expect(main).toContainText(shop.pages.privacy);
  await main.getByRole("link", { name: "শপে ফিরে যান" }).click();
  await expect(page).toHaveURL("/shops/test-shop");
});

test("information pages preserve shop isolation and handle missing pages and catalog errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await fixture(page);
  await page.goto("/shops/other-shop/info/about");
  await expect(page.locator("main")).toContainText("A different shop.");
  await expect(page.getByRole("link", { name: "Other shop shop home", exact: true })).toBeVisible();
  for (const path of ["/shops/missing-shop/info/privacy", "/shops/test-shop/info/unknown", "/info/unknown"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  }
  await page.goto("/info/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  await page.route("**/api/catalog", route => route.fulfill({ status: 503, json: { error: "Catalog is unavailable. Try again." } }));
  await page.goto("/shops/test-shop/info/privacy");
  await expect(page.locator("main").getByRole("alert")).toContainText("Catalog is unavailable");
  await page.unroute("**/api/catalog");
  await page.locator("main").getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("shop information links stay scoped before the catalog loads", async ({ page }) => {
  await fixture(page);
  let releaseCatalog!: () => void;
  const catalogReady = new Promise<void>(resolve => { releaseCatalog = resolve; });
  await page.route("**/api/catalog", async route => {
    await catalogReady;
    await route.fallback();
  });
  try {
    await page.goto("/shops/test-shop");
    for (const [key, title] of sections) {
      await expect(page.locator("footer").getByRole("link", { name: title, exact: true })).toHaveAttribute("href", `/shops/test-shop/info/${key}`);
    }
    await expect(page.getByRole("navigation", { name: "Store navigation" }).getByRole("link", { name: "About this shop", exact: true })).toHaveAttribute("href", "/shops/test-shop/info/about");
    await page.locator("footer").getByRole("link", { name: "Privacy policy", exact: true }).click();
    await expect(page).toHaveURL("/shops/test-shop/info/privacy");
  } finally {
    releaseCatalog();
  }
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1, exact: true })).toBeVisible();
});

test("failed save preserves seller input for retry", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/seller");
  const panel = page.getByRole("region", { name: "Shop information & policies" });
  await panel.locator("summary").filter({ hasText: "Privacy policy" }).click();
  const input = panel.getByRole("textbox", { name: "Privacy policy", exact: true });
  await input.fill("Keep this unsaved privacy policy.");
  state.fail();
  await page.getByRole("button", { name: "Publish shop", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not save shop information");
  await expect(input).toHaveValue("Keep this unsaved privacy policy.");
});
