import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("arise_lang", "en"));
});

test("checkout updates totals, rejects invalid quantities and uses the seller quote at review", async ({ page }) => {
  const product = {
    id: "checkout-test", shop_id: "shop-test", name: "Digital course", category: "Education",
    description: "A digital course", image_url: "", currency: "BDT", delivery_mode: "automatic",
    delivery_estimate: "After payment", delivery_note: "Private delivery after verified payment.",
    purchase_terms: "Read before purchasing.", required_buyer_fields: [], sales_enabled: true,
    variants: [{ id: "variant-test", name: "Standard", price: "10.00", stock: 9 }],
  };
  let quoteBody: Record<string, unknown> | undefined;
  await page.route("**/api/**", async route => {
    if (new URL(route.request().url()).pathname === "/api/promotions") return route.fulfill({ json: { ads: [], settings: {} } });
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === "/api/session") return route.fulfill({ json: { user: null, csrf: "test-csrf", demo: false, source_web: "" } });
    if (endpoint === "/api/catalog") return route.fulfill({ json: {
      shops: [{ id: "shop-test", slug: "test-shop", name: "Test shop", support: "", payment_methods: ["bkash"] }],
      products: [product], synced_at: new Date().toISOString(),
    } });
    if (endpoint === "/api/checkout/quote") {
      quoteBody = route.request().postDataJSON();
      return route.fulfill({ json: { draft_id: "test-draft", quote_hash: "test-hash", snapshot: {
        name: product.name, variant: "Standard", quantity: quoteBody!.quantity, total: "66.00",
        digital_config: { purchase_terms: product.purchase_terms, delivery_note: product.delivery_note, delivery_mode: "automatic" },
      } } });
    }
    throw new Error(`Unexpected checkout request: ${endpoint}`);
  });
  await page.goto("/checkout/checkout-test?variant=variant-test");
  const quantity = page.getByRole("spinbutton", { name: "Quantity", exact: true });
  const review = page.getByRole("button", { name: "Review order", exact: true });
  await page.getByLabel("Full name", { exact: true }).fill("Test buyer");
  await quantity.fill("6");
  await expect(page.locator(".summary-total strong")).toHaveText(/60\.00/);
  await expect(page.locator(".checkout-payable strong")).toHaveText(/60\.00/);
  for (const value of ["", "0", "1.5", "10"]) {
    await quantity.fill(value);
    await expect(review).toBeDisabled();
    await expect(page.locator(".summary-total strong")).toHaveText("—");
  }
  await quantity.fill("6");
  for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }, { width: 1600, height: 1000 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await review.click();
  expect(quoteBody).toMatchObject({ quantity: 6, variant_id: "variant-test", provider: "bkash" });
  expect(quoteBody).not.toHaveProperty("total");
  await expect(page.locator(".summary-total")).toContainText("Total to pay");
  await expect(page.locator(".summary-total strong")).toHaveText(/66\.00/);
  await expect(page.locator(".checkout-payable strong")).toHaveText(/66\.00/);
  const confirm = page.getByRole("button", { name: "Confirm order", exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByRole("button", { name: "Edit order details", exact: true }).click();
  await quantity.fill("2");
  await expect(page.locator(".summary-total strong")).toHaveText(/20\.00/);
});
