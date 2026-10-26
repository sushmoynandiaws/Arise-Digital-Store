import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("arise_lang", "en"));
});

test("product options, quantity and total stay consistent through checkout", async ({ page }) => {
  const product = {
    id: "product-test", shop_id: "shop-test", name: "Digital course", category: "Education",
    description: "Learn at your own pace. Includes the seller’s course materials.", image_url: "", currency: "BDT",
    delivery_mode: "automatic", delivery_estimate: "After payment", delivery_note: "Open My purchases after payment verification.",
    purchase_terms: "Read the course requirements before purchasing.", required_buyer_fields: [], sales_enabled: true,
    variants: [{ id: "sold-out", name: "Starter", price: "5.00", stock: 0 }, { id: "available", name: "Full course", price: "10.00", stock: 9 }],
  };
  await page.route("**/api/**", route => {
    if (new URL(route.request().url()).pathname === "/api/promotions") return route.fulfill({ json: { ads: [], settings: {} } });
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === "/api/session") return route.fulfill({ json: { user: null, csrf: "test-csrf", demo: false, source_web: "" } });
    if (endpoint.endsWith("/reviews")) return route.fulfill({ json: { count: 0, average: null, has_more: false, reviews: [] } });
    if (endpoint === "/api/catalog") return route.fulfill({ json: {
      products: [product], shops: [{ id: "shop-test", slug: "test-shop", name: "Test shop", support: "", payment_methods: ["bkash"] }],
      synced_at: new Date().toISOString(),
    } });
    throw new Error(`Unexpected product request: ${endpoint}`);
  });
  await page.goto("/products/product-test");
  await expect(page.getByRole("heading", { name: "Digital course", exact: true })).toBeVisible();
  const option = page.getByRole("combobox", { name: "Choose your option", exact: true });
  await expect(option).toHaveValue("available");
  await option.selectOption("sold-out");
  await expect(page.getByRole("button", { name: "Currently unavailable", exact: true })).toBeDisabled();
  await option.selectOption("available");
  const quantity = page.getByRole("spinbutton", { name: "Quantity", exact: true });
  await quantity.fill("0");
  await expect(page.getByRole("button", { name: "Check quantity", exact: true })).toBeDisabled();
  await quantity.fill("6");
  await expect(page.locator(".product-purchase-total strong")).toHaveText(/60\.00/);
  const buy = page.getByRole("link", { name: "Buy now", exact: true });
  await expect(buy).toHaveAttribute("href", "/checkout/product-test?variant=available&quantity=6");
  for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    if (viewport.width === 375) await page.screenshot({ path: "../artifacts/product-reference/product-mobile.png", fullPage: true });
  }
  await page.screenshot({ path: "../artifacts/product-reference/product-desktop.png", fullPage: true });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("tablist")).toHaveCount(0);
  const terms = page.getByRole("button", { name: "Purchase terms", exact: true });
  await terms.click();
  const popup = page.getByRole("dialog");
  await expect(popup).toHaveAccessibleName("Purchase terms");
  await expect(popup).toContainText(product.purchase_terms);
  // A queued close event from the previous opening must not clear the new section.
  await popup.evaluate(element => new Promise<void>(resolve => {
    element.addEventListener("close", () => resolve(), { once: true });
    const dialog = element as HTMLDialogElement;
    dialog.close();
    dialog.showModal();
  }));
  await expect(popup).toHaveAccessibleName("Purchase terms");
  await expect(page).toHaveURL(/#product-terms$/);
  await expect(page.getByRole("button", { name: "Close product details" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(terms).toBeFocused();
  await page.getByRole("button", { name: "Delivery details", exact: true }).click();
  await expect(popup).toHaveAccessibleName("Delivery details");
  await expect(popup).toContainText(product.delivery_note);
  await page.getByRole("button", { name: "Close product details" }).click();
  const description = page.getByRole("button", { name: "Read full description", exact: true });
  await description.click();
  await expect(popup).toContainText(product.description);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await popup.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
  })).toBeTruthy();
  await page.screenshot({ path: "../artifacts/product-reference/product-popup-mobile.png" });
  await page.getByRole("button", { name: "Close product details" }).click();
  product.description = product.description.repeat(30);
  await page.reload();
  await description.click();
  expect(await popup.locator(".product-info-content").evaluate(element => element.scrollHeight > element.clientHeight)).toBeTruthy();
  await expect(page.getByRole("button", { name: "Close product details" })).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(popup).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  product.delivery_mode = "manual";
  product.delivery_estimate = "Prepared by the seller after payment.";
  await page.reload();
  await page.getByRole("button", { name: "Delivery details", exact: true }).click();
  await expect(popup).toContainText(product.delivery_estimate);
  await page.getByRole("button", { name: "Close product details" }).click();
  await page.goto("/shops/test-shop/products/digital-course#product-terms");
  await expect(popup).toHaveAccessibleName("Purchase terms");
  await page.getByRole("button", { name: "Close product details" }).click();
  await expect(popup).toHaveCount(0);
  await expect(page).toHaveURL("/shops/test-shop/products/digital-course");
  await quantity.fill("6");
  await expect(buy).toHaveAttribute("href", "/checkout/product-test?variant=available&quantity=6");
  await buy.click();
  await expect(page.getByRole("spinbutton", { name: "Quantity", exact: true })).toHaveValue("6");
  await expect(page.locator(".summary-total strong")).toHaveText(/60\.00/);
});
