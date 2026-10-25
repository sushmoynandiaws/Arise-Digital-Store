import { test, expect } from "@playwright/test";

const product = { id: "product-test", shop_id: "shop-test", name: "Digital course", category: "Education", description: "Course materials", image_url: "", currency: "BDT", delivery_mode: "automatic", delivery_note: "Private delivery", purchase_terms: "Seller terms", required_buyer_fields: [], sales_enabled: true, variants: [{ id: "variant-test", name: "Standard", price: "10.00", stock: 9 }] };
const shop = { id: "shop-test", slug: "test-shop", name: "Test shop", support: "", payment_methods: ["bkash"] };

test("verified customers can publish and edit one review, and products show real ratings", async ({ page }) => {
  let review: { id: string; rating: number; display_name: string; comment: string; created_at: number } | null = null;
  let eligible = true;
  let failReviews = false;
  let submissions = 0;
  await page.route("**/api/**", route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === "/api/session") return route.fulfill({ json: { user: null, csrf: "test-csrf", demo: false, source_web: "" } });
    if (endpoint === "/api/catalog") return route.fulfill({ json: { products: [product], shops: [shop], synced_at: new Date().toISOString() } });
    if (endpoint === "/api/products/product-test/reviews") {
      if (failReviews) { failReviews = false; return route.fulfill({ status: 503, json: { error: "Reviews are temporarily unavailable." } }); }
      return route.fulfill({ json: { count: review ? 1 : 0, average: review?.rating ?? null, has_more: false, reviews: review ? [review] : [] } });
    }
    if (endpoint === "/api/orders/order-test") return route.fulfill({ json: { id: "order-test", product_id: product.id, buyer_name: "Checkout buyer", ref: "ORD-TEST", shop, name: product.name, quantity: 1, total: "10.00", currency: "BDT", payment_status: "paid", delivery_status: "delivered", delivery_mode: "automatic", created_at: new Date().toISOString(), ready: true, payment: null, can_review: eligible, review } });
    if (endpoint === "/api/orders/order-test/review") {
      const body = route.request().postDataJSON();
      expect(Object.keys(body).sort()).toEqual(["comment", "display_name", "rating"]);
      submissions += 1;
      review = { ...body, id: "review-test", created_at: 1792886400 };
      return route.fulfill({ json: review });
    }
    throw new Error(`Unexpected review request: ${endpoint}`);
  });
  await page.goto("/products/product-test");
  await page.getByRole("button", { name: "Reviews", exact: true }).click();
  const reviews = page.getByRole("region", { name: "Customer reviews", exact: true });
  await expect(reviews).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("No reviews yet.", { exact: true })).toBeVisible();
  await page.goto("/purchases/order-test");
  await expect(page.getByLabel("Your public name", { exact: true })).toHaveValue("Checkout buyer");
  await page.getByRole("radio", { name: "4 stars", exact: true }).check();
  await page.getByLabel("Your public name", { exact: true }).fill("ক্রেতা");
  await page.getByRole("textbox", { name: "Your review", exact: true }).fill("The course was useful and delivery was straightforward.");
  await page.getByRole("button", { name: "Publish review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your review", exact: true })).toBeVisible();
  await expect(page.getByText("Verified purchase", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Edit your review", exact: true }).click();
  await expect(page.getByLabel("Your public name", { exact: true })).toHaveValue("ক্রেতা");
  await page.getByRole("radio", { name: "3 stars", exact: true }).check();
  await page.getByRole("textbox", { name: "Your review", exact: true }).fill("Useful course. <script>alert('review')</script> is plain text here.");
  await page.getByRole("button", { name: "Update review", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit your review", exact: true })).toBeVisible();
  expect(submissions).toBe(2);
  failReviews = true;
  await page.goto("/products/product-test");
  await page.getByRole("button", { name: "Reviews", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  await page.getByRole("button", { name: "Retry reviews", exact: true }).click();
  await expect(page.locator(".review-summary")).toContainText("3.0");
  await expect(page.locator(".review-summary")).toContainText("1 review");
  await expect(page.locator(".review-card")).toHaveCount(1);
  await expect(page.locator(".review-card script")).toHaveCount(0);
  await expect(page.locator(".review-author strong")).toHaveText("ক্রেতা");
  review!.comment = "পণ্যটি পেয়েছি। কেনাকাটা ও ডেলিভারি সহজ ছিল।";
  await page.reload();
  await page.getByRole("button", { name: "Reviews", exact: true }).click();
  await expect(page.locator(".review-card")).toContainText(review!.comment);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: "../artifacts/copy-typography/reviews-mobile.png" });
  review = null; eligible = false;
  await page.goto("/purchases/order-test");
  await expect(page.getByRole("heading", { name: "Your order is ready", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish review", exact: true })).toHaveCount(0);
});

test("many reviews scroll within a bounded keyboard-accessible list and pagination still works", async ({ page }) => {
  const reviews = Array.from({ length: 12 }, (_, index) => ({ id: `review-${index}`, rating: 5, display_name: `Customer ${index + 1}`, comment: `Review ${index + 1}: The digital course was helpful and easy to follow.`, created_at: 1792886400 }));
  const offsets: number[] = [];
  await page.route("**/api/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/session") return route.fulfill({ json: { user: null, csrf: "test-csrf", demo: false, source_web: "" } });
    if (url.pathname === "/api/catalog") return route.fulfill({ json: { products: [product], shops: [shop], synced_at: new Date().toISOString() } });
    if (url.pathname.endsWith("/reviews")) {
      const offset = Number(url.searchParams.get("offset") || 0);
      offsets.push(offset);
      return route.fulfill({ json: { count: 12, average: 5, has_more: offset === 0, reviews: reviews.slice(offset, offset + 6) } });
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  await page.goto("/products/product-test");
  const list = page.getByRole("region", { name: "Customer review list", exact: true });
  await expect(list.locator(".review-card")).toHaveCount(6);
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await list.evaluate(element => { element.scrollTop = 0; });
    expect(await list.evaluate(element => element.scrollHeight > element.clientHeight && element.clientHeight <= 384)).toBeTruthy();
    await list.focus();
    await expect(list).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `../artifacts/review-scroll/reviews-${width}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Load more reviews", exact: true }).click();
  await expect(list.locator(".review-card")).toHaveCount(12);
  await expect(page.getByRole("button", { name: "Load more reviews", exact: true })).toHaveCount(0);
  expect(offsets).toEqual([0, 6]);
  await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(list.getByText(reviews[11].comment, { exact: true })).toBeInViewport();
  await expect(page.locator(".review-summary")).toContainText("12 reviews");
});
