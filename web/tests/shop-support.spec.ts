import { test, expect } from "@playwright/test";

test("shop shows products and a fixed WhatsApp icon using the seller's configured channel", async ({ page }) => {
  const shop = {
    id: "shop-support", slug: "support-shop", name: "Support shop", description: "Our digital products.",
    logo_url: "", cover_url: "", published: true, support: "help@example.test",
    contact: { whatsapp: "01712345678" }, social_links: { whatsapp: "" },
  };
  const product = {
    id: "guide", shop_id: shop.id, name: "Digital guide", category: "Education", description: "Seller's guide.",
    image_url: "", currency: "BDT", delivery_mode: "manual", delivery_estimate: "", delivery_note: "",
    purchase_terms: "", required_buyer_fields: [], sales_enabled: true,
    variants: [{ id: "standard", name: "Standard", price: "100.00", stock: 5 }],
  };
  await page.addInitScript(() => localStorage.setItem("arise_lang", "en"));
  await page.route("**/api/**", route => {
    if (new URL(route.request().url()).pathname === "/api/promotions") return route.fulfill({ json: { ads: [], settings: {} } });
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/traffic") return route.fulfill({json:{ok:true}});
    if (path.endsWith("/questions")) return route.fulfill({json:{questions:[],has_more:false}});
    if (path === "/api/session") return route.fulfill({ json: { user: null, csrf: "csrf", demo: false, source_web: "" } });
    if (path === "/api/catalog") return route.fulfill({ json: { shops: [shop], products: [product], synced_at: new Date().toISOString() } });
    throw new Error(`Unexpected request: ${path}`);
  });
  await page.goto("/shops/support-shop");
  await expect(page.locator("main").getByRole("heading", { name: "Support shop", exact: true, level: 1 })).toBeVisible();
  await expect(page.locator(".shop-banner")).toHaveCount(0);
  await expect(page.locator(".product-card")).toHaveCount(1);
  const support = page.getByRole("complementary", { name: "WhatsApp live chat support" }).getByRole("link");
  await expect(support).toBeVisible();
  const href = new URL((await support.getAttribute("href"))!);
  expect(href.origin + href.pathname).toBe("https://wa.me/8801712345678");
  expect(href.searchParams.get("text")).toContain(shop.name);
  await expect(support).toHaveAttribute("target", "_blank");
  await expect(support.locator(".whatsapp-label")).toBeHidden();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect(await support.evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.width >= 44 && box.height >= 44 && box.right <= innerWidth && box.bottom <= innerHeight;
    })).toBeTruthy();
    const before = await support.boundingBox();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const after = await support.boundingBox();
    expect(after?.y).toBe(before?.y);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width === 375 || width === 1440) await page.screenshot({ path: `../artifacts/shop-support/shop-${width}.png`, fullPage: true });
  }
  shop.social_links.whatsapp = "https://wa.me/8801999999999?text=Seller%20message";
  await page.reload();
  await expect(support).toHaveAttribute("href", shop.social_links.whatsapp);
  shop.social_links.whatsapp = "";
  shop.contact.whatsapp = "";
  shop.support = "01812345678";
  await page.reload();
  await expect(support).toHaveAttribute("href", /^https:\/\/wa\.me\/8801812345678\?/);
  for (const contact of ["help@example.test", "https://example.test", "https://wa.me.evil.test/8801700000000"]) {
    shop.support = contact;
    await page.reload();
    await expect(page.locator("main").getByRole("heading", { name: "Support shop", exact: true })).toBeVisible();
    await expect(support).toHaveCount(0);
  }
});
