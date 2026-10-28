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
  await page.addInitScript(() => localStorage.setItem("arise_lang", "en"));
  await page.route("https://example.test/**", route => route.fulfill({ status: 200, contentType: "text/html", body: "" }));
  await page.route("**/api/**", async route => {
    if (new URL(route.request().url()).pathname === "/api/promotions") return route.fulfill({ json: { ads: [], settings: {} } });
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === "/api/traffic") return route.fulfill({json:{ok:true}});
    if (endpoint.endsWith("/questions")) return route.fulfill({json:{questions:[],has_more:false}});
    if (endpoint.endsWith("/offers")) return route.fulfill({json:{offers:[],revision:"a".repeat(64)}});
    if (endpoint === "/api/session") return route.fulfill({ json: { user: options.signedIn ? { id: "sample-user", name: "Sample Seller", email: "seller@example.test", admin: !!options.admin } : null, csrf: "sample-csrf", demo: true, source_web: "https://example.test" } });
    if (endpoint === "/api/catalog") return route.fulfill(options.failure ? { status: 503, json: { error: "The catalog is temporarily unavailable. Try again." } } : { json: options.empty ? { ...catalog, products: [], shops: [] } : catalog });
    if (endpoint === "/api/orders") return route.fulfill({ json: { orders: options.empty ? [] : [readyOrder] } });
    if (endpoint === "/api/orders/sample-order") return route.fulfill({ json: readyOrder });
    if (endpoint === "/api/orders/sample-pending") return route.fulfill({ json: { ...readyOrder, id: "sample-pending", ref: "SAMPLE-002", payment_status: "unpaid", delivery_status: "awaiting_payment", ready: false, can_review: false, payment: { provider: "bkash", account: "SAMPLE-DO-NOT-PAY", amount: "490.00", trx_id: null, expires_at: new Date(Date.now() + 600000).toISOString() } } });
    if (endpoint === "/api/orders/sample-order/reveal") return route.fulfill({ json: { items: [{ item: 1, content: "SAMPLE PRIVATE ITEM — NOT A REAL CREDENTIAL" }] } });
    if (endpoint === "/api/seller") return route.fulfill({ json: { shops: [shop, otherShop] } });
    if (endpoint.startsWith("/api/seller/stores/")) return route.fulfill({ json: { shop, products, payment_methods: shop.payment_methods, active: true } });
    if (endpoint === "/api/admin") return route.fulfill({ json: { catalog, permissions: ["catalog", "moderate", "reports"], role: "owner", checked_at: 1793016000, reports: [{ id: "sample-report", product_id: products[0].id, reason: "Sample report for marketplace review.", resolved: false, created_at: 1792922400 }], moderation: [] } });
    if (endpoint.endsWith("/reviews")) return route.fulfill({ json: { count: 0, average: null, has_more: false, reviews: [] } });
    throw new Error(`Unexpected UI request: ${endpoint}`);
  });
}

const routes = [
  ["home", "/"], ["products", "/products"], ["shops", "/shops"], ["shop", "/shops/studio-north"],
  ["product", "/products/sample-0"], ["checkout", "/checkout/sample-0"], ["purchases", "/purchases"],
  ["delivery", "/purchases/sample-order"], ["payment", "/purchases/sample-pending"], ["seller-connect", "/seller"],
  ["seller-workspace", "/seller"], ["admin", "/admin"], ["help", "/how-it-works"], ["not-found", "/missing-page"],
  ["tracking", "/track"], ["shop-reviews", "/shops/studio-north/reviews"],
  ["shop-policy", "/shops/studio-north/info/terms"], ["shop-contact", "/shops/studio-north/info/contact"], ["marketplace-policy", "/info/terms"],
];

test("glass rims respond to the real backdrop while text and popovers stay unfiltered", async ({ page }) => {
  await preview(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/products");
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.getByRole("button", { name: "Help", exact: true }).click();
  const triggerBox = (await page.getByRole("button", { name: "Help", exact: true }).boundingBox())!;
  const menuBox = (await page.locator("#navigation-help").boundingBox())!;
  expect(menuBox.y - triggerBox.y - triggerBox.height).toBeCloseTo(8, 0);
  expect(menuBox.x >= 0 && menuBox.x + menuBox.width <= 1440).toBeTruthy();
  await page.evaluate(() => {
    const backdrop = document.createElement("div");
    backdrop.id = "glass-verification-backdrop";
    backdrop.style.cssText = "position:fixed;inset:0;z-index:49;pointer-events:none";
    document.body.append(backdrop);
  });
  for (const selector of [".site-header", "#navigation-help"]) {
    const layer = page.locator(selector);
    expect(await layer.evaluate(element => getComputedStyle(element).backdropFilter)).toBe("none");
    expect(await layer.evaluate(element => getComputedStyle(element, "::before").backdropFilter)).toContain("blur");
    expect(await layer.evaluate(element => getComputedStyle(element, "::after").maskComposite.split(",").every(value => value.trim() === "exclude"))).toBeTruthy();
    const samples: number[][] = [];
    for (const [name, color] of [["blue", "#204a99"], ["orange", "#b85a32"]]) {
      await page.locator("#glass-verification-backdrop").evaluate((element, value) => { (element as HTMLElement).style.background = value; }, color);
      const box = await layer.boundingBox();
      expect(box).not.toBeNull();
      const shot = await page.screenshot({ clip: { x: Math.ceil(box!.x), y: Math.ceil(box!.y), width: Math.floor(box!.width), height: Math.floor(box!.height) }, path: `../artifacts/premium-ui/glass-${selector === ".site-header" ? "header" : "menu"}-${name}.png` });
      samples.push(await page.evaluate(async encoded => {
        const image = new Image();
        image.src = `data:image/png;base64,${encoded}`;
        await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
        const pixels = context.getImageData(24, 0, image.width - 48, 1).data;
        const sum = [0, 0, 0];
        for (let index = 0; index < pixels.length; index += 4) for (let channel = 0; channel < 3; channel++) sum[channel] += pixels[index + channel];
        return sum.map(value => value / (pixels.length / 4));
      }, shot.toString("base64")));
    }
    expect(samples[1][0] - samples[0][0], `${selector} red edge response`).toBeGreaterThan(10);
    expect(samples[0][2] - samples[1][2], `${selector} blue edge response`).toBeGreaterThan(10);
    await page.locator("#glass-verification-backdrop").evaluate(element => { (element as HTMLElement).style.background = "repeating-linear-gradient(90deg,#000 0 2px,#fff 2px 4px)"; });
    const box = (await layer.boundingBox())!;
    const patterned = await page.screenshot({ clip: { x: Math.ceil(box.x), y: Math.ceil(box.y), width: Math.floor(box.width), height: Math.floor(box.height) }, path: `../artifacts/premium-ui/glass-${selector === ".site-header" ? "header" : "menu"}-blur.png` });
    const deviation = await page.evaluate(async encoded => {
      const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
      const pixels = context.getImageData(24, 3, image.width - 48, 1).data;
      const values = Array.from({ length: pixels.length / 4 }, (_, index) => pixels[index * 4]);
      // Adjacent contrast detects stripes without counting gradual edge lighting.
      return values.slice(1).reduce((sum, value, index) => sum + Math.abs(value - values[index]), 0) / (values.length - 1);
    }, patterned.toString("base64"));
    expect(deviation, `${selector} blurs a two-pixel backdrop pattern`).toBeLessThan(2);
  }
  await page.locator("#glass-verification-backdrop").evaluate(element => element.remove());
  await page.screenshot({ path: "../artifacts/premium-ui/glass-real-content.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Help", exact: true })).toBeFocused();
});

test("glass has opaque reduced-transparency, high-contrast and forced-color fallbacks", async ({ page }) => {
  await preview(page);
  await page.goto("/products");
  const client = await page.context().newCDPSession(page);
  for (const [name, value] of [["prefers-reduced-transparency", "reduce"], ["prefers-contrast", "more"], ["forced-colors", "active"]]) {
    await client.send("Emulation.setEmulatedMedia", { features: [{ name, value }] });
    expect(await page.evaluate(query => matchMedia(query).matches, `(${name}: ${value})`)).toBeTruthy();
    await page.getByRole("button", { name: "Wishlist (0)", exact: true }).click();
    for (const selector of [".site-header", ".wishlist-modal"]) {
      const styles = await page.locator(selector).evaluate(element => {
        const probe = document.createElement("div"); probe.style.background = "Canvas"; document.body.append(probe);
        const canvas = getComputedStyle(probe).backgroundColor; probe.remove();
        return { canvas, background: getComputedStyle(element).backgroundColor, before: getComputedStyle(element, "::before").display, after: getComputedStyle(element, "::after").display, filter: getComputedStyle(element).backdropFilter };
      });
      expect(styles.background).toBe(name === "forced-colors" ? styles.canvas : "rgb(255, 255, 255)");
      expect(styles.before).toBe("none"); expect(styles.after).toBe("none"); expect(styles.filter).toBe("none");
    }
    await page.keyboard.press("Escape");
  }
  await client.send("Emulation.setEmulatedMedia", { features: [] });
});

test("mobile glass shell stays within portrait and short landscape viewports while its contents scroll", async ({ page }) => {
  await preview(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [{ width: 320, height: 740 }, { width: 812, height: 375 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu", exact: true });
    await toggle.click();
    const menu = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
    const before = await menu.boundingBox();
    expect(before && before.y >= 0 && before.y + before.height <= viewport.height + 1).toBeTruthy();
    await menu.getByRole("link", { name: "Open your shop", exact: true }).scrollIntoViewIfNeeded();
    const after = await menu.boundingBox();
    expect(after?.y).toBe(before?.y);
    expect(after?.height).toBe(before?.height);
    const last = await menu.getByRole("link", { name: "Open your shop", exact: true }).boundingBox();
    expect(last && last.y + last.height <= viewport.height + 1).toBeTruthy();
    await page.screenshot({ path: `../artifacts/premium-ui/glass-mobile-${viewport.width}.png` });
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
  }
});

test("marketplace and seller headers stay compact with full-size search and touch targets", async ({ page }) => {
  await preview(page);
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/shops/studio-north"]) {
      await page.goto(path);
      await expect(page.locator(".product-card").first()).toBeVisible();
      const metrics = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>(".header-inner")!;
        const search = main.querySelector<HTMLInputElement>('input[type="search"]')!;
        const nav = document.querySelector<HTMLElement>(".store-navigation")!;
        return { main: main.getBoundingClientRect().height, search: search.getBoundingClientRect().height, inputFont: parseFloat(getComputedStyle(search).fontSize), nav: nav.getBoundingClientRect().height, card: document.querySelector(".product-card")!.getBoundingClientRect().height };
      });
      expect(metrics.main).toBeLessThanOrEqual(width <= 640 ? 120 : 64);
      expect(metrics.search).toBeGreaterThanOrEqual(44);
      expect(metrics.search).toBeLessThanOrEqual(46);
      expect(metrics.inputFont).toBeGreaterThanOrEqual(16);
      expect(metrics.nav).toBeLessThanOrEqual(width <= 900 ? 0 : 50);
      expect(metrics.card).toBeLessThanOrEqual(440);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      await page.screenshot({ path: `../artifacts/premium-ui/compact-${path === "/" ? "home" : "shop"}-${width}.png` });
    }
  }
});

test("home uses source artwork and counted category collections before order shortcuts", async ({ page }) => {
  await preview(page);
  await page.route("**/api/catalog", route => route.fulfill({ json: { ...catalog, products: products.map((product, index) => ({ ...product, image_url: index === 0 ? "" : "https://example.test/product-art.svg" })) } }));
  await page.route("https://example.test/product-art.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="#eae6f5"/><text x="40" y="170" font-size="28">Sample product artwork</text></svg>' }));
  await page.goto("/");
  await expect(page.locator(".discovery-pick")).toHaveCount(3);
  await expect(page.locator(".discovery-pick").first()).toContainText("Practical Rust Essentials");
  await expect(page.locator(".discovery-pick img").first()).toHaveAttribute("src", "https://example.test/product-art.svg");
  expect(await page.locator(".discovery-pick img").first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBeTruthy();
  const education = page.locator(".category-card").filter({ hasText: "Education" });
  await expect(education).toContainText("2 products");
  await expect(education).toHaveAttribute("href", "/products?category=Education");
  expect(await page.locator(".products-section").evaluate(element => !!(element.compareDocumentPosition(document.querySelector(".order-tools")!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBeTruthy();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `../artifacts/premium-ui/research-home-${width}.png` });
  }
  await education.click();
  await expect(page).toHaveURL(/category=Education$/);
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.locator(".product-card").first().getByRole("link", { name: /View options for/ }).click();
  await expect(page.locator(".product-summary h1")).toHaveText("Practical Rust Essentials");
});

test("shared product cards distinguish source delivery, sold-out and paused offers", async ({ page }) => {
  await preview(page);
  await page.route("**/api/catalog", route => route.fulfill({ json: { ...catalog, products: products.map((product, index) => index === 0 ? { ...product, sales_enabled: false } : index === 1 ? { ...product, variants: product.variants.map(variant => ({ ...variant, stock: 0 })) } : product) } }));
  await page.goto("/products");
  const cards = page.locator(".product-card");
  await expect(cards.nth(0).locator(".product-meta")).toHaveText("Purchases paused");
  await expect(cards.nth(1).locator(".product-meta")).toHaveText("Sold out");
  await expect(cards.nth(2).locator(".product-meta")).toHaveText("In stock");
  await expect(cards.nth(5).locator(".product-meta")).toHaveText("In stock");
  await expect(cards.nth(0).locator(".price")).toHaveText(/490/);
  await expect(cards.nth(0).locator(".by-shop")).toContainText("Studio North");
});

test("home previews prioritize available artwork without reordering the catalog", async ({ page }) => {
  await preview(page);
  await page.route("**/api/catalog", route => route.fulfill({ json: { ...catalog, products: [
    { ...products[0], image_url: "https://example.test/art.svg", variants: [] },
    products[1],
    { ...products[2], image_url: "https://example.test/art.svg" },
  ] } }));
  await page.goto("/");
  await expect(page.locator(".discovery-pick strong")).toHaveText(["Minimal Brand Kit", "Practical Rust Essentials", "Notion Life Planner"]);
  await expect(page.locator(".products-section .product-title")).toHaveText(["Notion Life Planner", "Practical Rust Essentials", "Minimal Brand Kit"]);
});

test("marketplace navigation separates discovery, purchases and keyboard-operated help", async ({ page }) => {
  await preview(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Store navigation", exact: true });
  await expect(nav.locator(".navigation-primary").getByRole("link")).toHaveText(["Products", "Shops", "My purchases"]);
  await expect(nav.getByRole("link", { name: "About Us", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Track order", exact: true })).toHaveCount(0);
  const help = nav.getByRole("button", { name: "Help", exact: true });
  await help.focus(); await page.keyboard.press("Enter");
  await expect(help).toHaveAttribute("aria-expanded", "true");
  await expect(nav.getByRole("link", { name: "Track order", exact: true })).toHaveAttribute("href", "/track");
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  await expect(help).toHaveAttribute("aria-expanded", "false");
  const categories = nav.getByRole("button", { name: "Browse categories", exact: true });
  await categories.focus(); await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.locator("#navigation-categories").getByRole("link", { name: "All products", exact: true })).toBeFocused();
  await page.locator("#navigation-categories").getByRole("link", { name: "Education", exact: true }).click();
  await expect(page).toHaveURL(/\/products\?category=Education$/);
  await expect(categories).toHaveAttribute("aria-expanded", "false");
  await help.click();
  await nav.getByRole("link", { name: "Track order", exact: true }).click();
  await expect(page).toHaveURL("/track");
  await expect(help).toHaveClass(/is-current/);
  await expect(help).toHaveAttribute("aria-expanded", "false");
});

test("shop reviews retain seller navigation and category links never leave the shop", async ({ page }) => {
  await preview(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/shops/studio-north/reviews");
  await expect(page.getByRole("link", { name: "Studio North shop home", exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Store navigation", exact: true });
  await expect(nav.locator(".navigation-primary").getByRole("link")).toHaveText(["Products", "Reviews", "About this shop"]);
  await expect(nav.getByRole("link", { name: "Reviews", exact: true })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "Browse categories", exact: true }).click();
  const categories = page.locator("#navigation-categories");
  await expect(categories.getByRole("link", { name: "Education", exact: true })).toHaveCount(0);
  await expect(categories.getByRole("link", { name: "Templates", exact: true })).toHaveAttribute("href", "/shops/studio-north?category=Templates");
  await categories.getByRole("link", { name: "Design", exact: true }).click();
  await expect(page).toHaveURL(/\/shops\/studio-north\?category=Design$/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(nav.getByRole("link", { name: "Contact seller", exact: true })).toHaveAttribute("href", "/shops/studio-north/info/contact");
});

test("mobile navigation exposes complete destinations without a clipped horizontal tab strip", async ({ page }) => {
  await preview(page);
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Store navigation", exact: true })).not.toBeVisible();
    const toggle = page.getByRole("button", { name: "Open menu", exact: true });
    await toggle.click();
    const menu = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
    for (const name of ["Products", "Shops", "My purchases", "Track order", "Buying guide", "Contact"]) await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `../artifacts/premium-ui/navigation-mobile-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
  }
});

test("tracking uses existing order access and never requests an unsupported recovery code", async ({ page }) => {
  await preview(page);
  const recoveryRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("/orders/track/")) recoveryRequests.push(request.url()); });
  await page.goto("/track");
  await expect(page.getByText("Order recovery by phone or email code is unavailable.")).toBeVisible();
  await expect(page.getByLabel("Email address", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Verification code", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Demo code/)).toHaveCount(0);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.getByRole("region", { name: "Order access", exact: true }).getByRole("link", { name: "My purchases", exact: true }).click();
  await expect(page).toHaveURL(/\/purchases$/);
  await expect(page.getByText("SAMPLE-001", { exact: true })).toBeVisible();
  expect(recoveryRequests).toEqual([]);
});

test("catalog search stays visible and preserves shop and category context when a legacy query is cleared", async ({ page }) => {
  await preview(page);
  await page.goto("/shops/studio-north?search=Notion&category=Templates");
  const search = page.getByRole("searchbox", { name: "Search Studio North catalog", exact: true });
  await expect(search).toHaveValue("Notion");
  await search.fill("");
  await expect(page).toHaveURL(/\/shops\/studio-north\?category=Templates$/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("Notion Life Planner");
});

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

test("language switching updates document language and the English and Bangla font roles", async ({ page }) => {
  await preview(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.locator("body").evaluate(element => getComputedStyle(element).fontFamily)).toContain("-apple-system");
  expect(await page.locator("h1").evaluate(element => getComputedStyle(element).fontFamily)).toContain("Urbanist");
  await page.locator(".header-actions .lang-pill-btn").first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  expect(await page.locator("h1").evaluate(element => getComputedStyle(element).fontFamily)).toMatch(/^"Hind Siliguri"/);
  expect(await page.locator("h1").evaluate(element => getComputedStyle(element).letterSpacing)).toBe("normal");
  await page.evaluate(() => document.fonts.ready);
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `../artifacts/premium-ui/bangla-fonts-${width}.png`, fullPage: true });
  }
});

test("primary actions, supporting copy and footer links retain readable text contrast", async ({ page }) => {
  await preview(page);
  await page.goto("/products");
  const ratios = await page.evaluate(() => {
    const rgba = (value: string) => {
      const numbers = value.match(/[\d.]+/g)!.map(Number);
      return [numbers[0], numbers[1], numbers[2], numbers[3] ?? 1];
    };
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    return [...document.querySelectorAll<HTMLElement>(".button.primary, .availability, .results-count, .dark-brand-tagline, .dark-product-link, .dark-footer-link-btn, .top-trust-badge")].filter(element => element.getBoundingClientRect().height > 0).map(element => {
      const ancestors: HTMLElement[] = [];
      for (let node: HTMLElement | null = element; node; node = node.parentElement) ancestors.unshift(node);
      let background = [255, 255, 255];
      for (const node of ancestors) {
        const color = rgba(getComputedStyle(node).backgroundColor);
        background = background.map((value, index) => color[index] * color[3] + value * (1 - color[3]));
      }
      const text = luminance(rgba(getComputedStyle(element).color));
      const ground = luminance(background);
      return { text: element.textContent?.trim(), ratio: (Math.max(text, ground) + .05) / (Math.min(text, ground) + .05) };
    });
  });
  expect(ratios.length).toBeGreaterThan(5);
  for (const item of ratios) expect(item.ratio, item.text).toBeGreaterThanOrEqual(4.5);
});

test("active sponsored placements use the shared palette without mobile overflow", async ({ page }) => {
  await preview(page);
  const ads = ["home_hero", "top_flash", "sponsored_product", "featured_shop", "sticky_bottom"].map(placement => ({ id: `sample-${placement}`, title: "Sample promotion", advertiser_name: "Sample advertiser", target_url: "/products/sample-0", placement, status: "active", start_date: "2020-01-01", end_date: "2999-01-01" }));
  await page.route("**/api/promotions**", route => route.fulfill({ json: route.request().method() === "GET" ? { ads, settings: {} } : { ok: true } }));
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/shops"]) {
      await page.goto(path);
      await expect(page.locator(".top-flash-sponsored-bar")).toContainText("Sample promotion");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
  }
  await page.screenshot({ path: "../artifacts/premium-ui/sponsored-palette.png", fullPage: true });
});

test("wishlist traps keyboard focus, closes with Escape and restores its trigger", async ({ page }) => {
  await preview(page);
  await page.goto("/products");
  await page.getByRole("button", { name: "Save to wishlist", exact: true }).first().click();
  const trigger = page.getByRole("button", { name: "Wishlist (1)", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Saved items (1)", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(products[0].name, { exact: true })).toBeVisible();
  await expect(page.locator(".product-card").first().getByRole("button", { name: "Remove from wishlist", exact: true })).toHaveCount(1);
  for (let index = 0; index < 7; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement) || document.activeElement === document.body)).toBeTruthy();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: `Remove ${products[0].name} from wishlist` }).click();
  await expect(page.getByText("Your wishlist is empty", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close wishlist" }).click();
  await expect(page.getByRole("button", { name: "Wishlist (0)", exact: true })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("button", { name: "Wishlist (0)", exact: true })).toBeVisible();
});

test("sticky navigation stays accessible and reduced motion removes dialog travel", async ({ page }) => {
  await preview(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/products");
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(page.locator(".site-header")).toHaveClass(/is-scrolled/);
  expect(await page.locator(".site-header").evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(1);
  await page.getByRole("button", { name: "Wishlist (0)", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => getComputedStyle(element).transform)).toBe("none");
  expect(await dialog.evaluate(element => getComputedStyle(element).transitionDuration)).toBe("0s");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("mobile product buying controls precede reviews and delivery copy stays source-owned", async ({ page }) => {
  await preview(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/products/sample-0");
  await expect(page.locator(".product-trust-stats-badges")).toContainText(products[0].delivery_estimate);
  await expect(page.locator(".product-trust-stats-badges")).not.toContainText(/99\.8|45s|1-3 Hours/);
  const buy = await page.getByRole("link", { name: "Buy now", exact: true }).boundingBox();
  const reviews = await page.locator("#customer-reviews").boundingBox();
  expect(buy && reviews && buy.y + buy.height < reviews.y).toBeTruthy();
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
      if (name === "admin") {
        await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
        await expect(page.locator(".admin-stats > div").filter({ hasText: "Published shops" })).toContainText("2");
      }
      await page.evaluate(() => document.fonts.ready);
      const issues = await page.evaluate(() => {
        const problems: string[] = [];
        if (document.documentElement.scrollWidth > innerWidth) {
          const overflowing = [...document.querySelectorAll<HTMLElement>("main *")].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(-5).map(element => element.className || element.tagName);
          problems.push(`page overflow: ${document.documentElement.scrollWidth} (${overflowing.join(", ")})`);
        }
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
      if (width === 1440) await page.screenshot({ path: `../artifacts/premium-ui/${name}-desktop.png` });
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
  await page.goto("/admin/products");
  const hide = page.getByRole("button", { name: "Hide listing", exact: true }).first();
  await hide.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Hide listing");
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
  expect(await card.locator("img").evaluate(image => getComputedStyle(image).objectFit)).toBe("contain");
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
  await page.route("**/api/admin", route => route.fulfill({ json: { catalog, permissions: ["catalog", "moderate", "reports"], role: "owner", checked_at: 1793016000, reports: [], moderation: hidden ? [{ kind: "product", target_id: products[0].id, hidden, reason: "Review sample listing" }] : [] } }));
  await page.route("**/api/admin/moderation", route => {
    expect(route.request().postDataJSON()).toEqual({ kind: "product", target_id: products[0].id, hidden: true, reason: "Review sample listing" });
    if (++attempts === 1) return route.fulfill({ status: 503, json: { error: "Could not save this change. Try again." } });
    hidden = true;
    return route.fulfill({ json: {} });
  });
  await page.goto("/admin/products");
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
