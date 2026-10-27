import { test, expect, type Page } from "@playwright/test";

const shop = {
  id: "shop-growth",
  slug: "growth-shop",
  name: "Growth Shop",
  description: "Source-owned clothing and footwear.",
  support: "",
  published: true,
  kind: "Fashion & Clothing",
  commerce_mode: "standard",
  payment_methods: ["cod"],
  currency: "BDT",
};
const shirt = {
  id: "shirt-growth",
  shop_id: shop.id,
  name: "Cotton shirt",
  category: "Clothing",
  description: "Cotton shirt with two sizes.",
  image_url: "",
  currency: "BDT",
  fulfilment_kind: "physical",
  delivery_mode: "shipping",
  delivery_estimate: "",
  delivery_note: "",
  purchase_terms: "Contact the seller about returns.",
  required_buyer_fields: ["name", "phone", "address", "district"],
  payment_methods: ["cod"],
  sales_enabled: true,
  checkout_available: true,
  variants: [
    { id: "small-growth", name: "Small", price: "100.00", stock: 5 },
    { id: "large-growth", name: "Large", price: "120.00", stock: 4 },
  ],
};
const shoe = {
  ...shirt,
  id: "shoe-growth",
  name: "Daily sneakers",
  category: "Footwear",
  variants: [{ id: "shoe-option", name: "Size 42", price: "500.00", stock: 2 }],
};
const other = {
  ...shop,
  id: "other-shop",
  slug: "other-shop",
  name: "Other shop",
};
const foreign = {
  ...shoe,
  id: "foreign-product",
  shop_id: other.id,
  name: "Other sneakers",
  variants: [
    { id: "foreign-option", name: "Size 42", price: "500.00", stock: 2 },
  ],
};
const catalog = {
  shops: [shop, other],
  products: [shirt, shoe, foreign],
  synced_at: new Date().toISOString(),
  offers: [] as any[],
};
const order = {
  id: "growth-order",
  ref: "ORD-880",
  shop,
  name: "Cotton shirt · Daily sneakers",
  quantity: 3,
  total: "770.00",
  currency: "BDT",
  payment_status: "unpaid",
  fulfilment_kind: "physical",
  payment_method: "cod",
  delivery_status: "in_transit",
  delivery_mode: "shipping",
  created_at: new Date().toISOString(),
  ready: false,
  payment: null,
  address: "House 12 Road 4 Mirpur",
  district: "Dhaka",
  delivery_charge: "70.00",
  tracking: {
    provider: "steadfast",
    tracking: "SHIP880",
    status: "in_transit",
    updated_at: new Date().toISOString(),
    poll_delayed: false,
  },
};

async function preview(
  page: Page,
  { admin = false, offers = [] as any[], questions = [] as any[] } = {},
) {
  const writes: { path: string; body: any }[] = [];
  const user = admin
    ? {
        id: "owner-growth",
        name: "Owner",
        email: "owner@example.test",
        admin: true,
      }
    : null;
  await page.addInitScript(() => localStorage.setItem("arise_lang", "en"));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname,
      method = route.request().method();
    const body = method !== "GET" ? route.request().postDataJSON() : undefined;
    if (body) writes.push({ path, body });
    if (path === "/api/session")
      return route.fulfill({
        json: {
          user,
          csrf: "growth-csrf",
          demo: false,
          source_web: "https://source.example.test",
        },
      });
    if (path === "/api/catalog")
      return route.fulfill({ json: { ...catalog, offers } });
    if (path === "/api/promotions")
      return route.fulfill({ json: { ads: [], settings: {} } });
    if (path === "/api/traffic") return route.fulfill({ json: { ok: true } });
    if (path.endsWith("/reviews"))
      return route.fulfill({
        json: { count: 0, average: null, has_more: false, reviews: [] },
      });
    if (path.endsWith("/questions"))
      return route.fulfill({
        json:
          method === "POST"
            ? {
                ok: true,
                message:
                  "Question sent. It appears publicly after the seller answers.",
              }
            : { questions, has_more: false },
      });
    if (path === "/api/checkout/quote")
      return route.fulfill({
        json: {
          draft_id: "cart-draft",
          quote_hash: "cart-hash",
          snapshot: {
            name: "Your bag",
            variant: "Selected options",
            quantity: body.items.reduce(
              (n: number, item: any) => n + item.quantity,
              0,
            ),
            total: "770.00",
            subtotal: "700.00",
            delivery_charge: "70.00",
            buyer: body.buyer,
            fulfilment_kind: "physical",
            items: body.items.map((item: any) => {
              const product = catalog.products.find(
                  (p) => p.id === item.product_id,
                )!,
                variant = product.variants.find(
                  (v) => v.id === item.variant_id,
                )!;
              return {
                ...item,
                name: product.name,
                variant: variant.name,
                unit_price: variant.price,
              };
            }),
          },
        },
      });
    if (path === "/api/checkout/accept" || path === "/api/orders/growth-order")
      return route.fulfill({ json: order });
    if (path === "/api/orders")
      return route.fulfill({ json: { orders: [order] } });
    if (path === "/api/admin")
      return route.fulfill({
        json: {
          catalog,
          role: "owner",
          permissions: ["catalog", "campaigns", "activity", "reviews"],
          checked_at: Date.now() / 1000,
          reports: [],
          moderation: [],
        },
      });
    if (path === "/api/admin/analytics")
      return route.fulfill({
        json: {
          daily: [
            {
              day: Math.floor(Date.now() / 86400000),
              visitors: 7,
              page_views: 11,
            },
          ],
          categories: { Clothing: 5, Footwear: 3 },
          sales: [
            {
              shop_id: shop.id,
              shop_name: shop.name,
              day: new Date().toISOString().slice(0, 10),
              currency: "BDT",
              orders: 3,
              paid_orders: 2,
              paid_total: "770.00",
            },
          ],
          checked_at: new Date().toISOString(),
        },
      });
    if (path === "/api/admin/documents/badges")
      return route.fulfill({
        json: { revision: body ? 1 : 0, content: body?.content || {} },
      });
    if (path.endsWith("/offers"))
      return route.fulfill({
        json: {
          revision: "a".repeat(64),
          offers: body?.offer ? [body.offer] : [],
        },
      });
    return route.fulfill({
      status: 404,
      json: { error: `Unavailable fixture: ${path}` },
    });
  });
  return writes;
}

test("mobile bag checks out multiple products once and uses source shipping and total", async ({
  page,
}) => {
  const writes = await preview(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/products/${shirt.id}`);
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Your bag" });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Add to bag", exact: true }),
  ).toBeFocused();
  await page.goto(`/products/${shoe.id}`);
  await page
    .getByRole("spinbutton", { name: "Quantity", exact: true })
    .fill("1");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await drawer
    .getByRole("spinbutton", { name: "Quantity for Cotton shirt" })
    .fill("2");
  await drawer.getByRole("link", { name: "Checkout together" }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Cart Buyer");
  await page.getByLabel("Phone number", { exact: true }).fill("01712345678");
  await page
    .getByLabel("Full delivery address", { exact: true })
    .fill("House 12 Road 4 Mirpur");
  await page.getByLabel("District", { exact: true }).fill("Dhaka");
  await page.getByRole("button", { name: "Review order", exact: true }).click();
  await expect(page.locator(".summary-total")).toContainText("770");
  const quote = writes.find(
    (write) => write.path === "/api/checkout/quote",
  )!.body;
  expect(quote.items).toEqual([
    { product_id: shirt.id, variant_id: shirt.variants[0].id, quantity: 2 },
    { product_id: shoe.id, variant_id: shoe.variants[0].id, quantity: 1 },
  ]);
  expect(quote.total).toBeUndefined();
  expect(quote.delivery_charge).toBeUndefined();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "../artifacts/growth/mobile-cart-checkout.png",
    fullPage: true,
  });
  await page.getByRole("checkbox", { name: /accept this seller/ }).check();
  await page
    .getByRole("button", { name: "Confirm order", exact: true })
    .click();
  await expect(page).toHaveURL(/purchases\/growth-order$/);
  await expect(
    page.getByRole("button", { name: "Open bag (0)", exact: true }),
  ).toBeVisible();
});

test("bag prevents cross-shop mixing and recently viewed uses real products", async ({
  page,
}) => {
  await preview(page);
  await page.goto(`/products/${shirt.id}`);
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goto(`/products/${foreign.id}`);
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Complete or empty this bag first",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "Recently viewed products" }),
  ).toContainText(shirt.name);
  await page
    .getByRole("button", { name: "Clear history", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Recently viewed products" }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    window.history.pushState({}, "", "/shops/%");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(
    page.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible();
});

test("public Q&A sends the question and shows only source responses", async ({
  page,
}) => {
  const questions = [
    {
      id: "q1",
      display_name: "Customer",
      question: "Does this come in blue?",
      answer: "Yes. Choose the blue option.",
      answered_at: Date.now() / 1000,
    },
  ];
  const writes = await preview(page, { questions });
  await page.goto(`/products/${shirt.id}`);
  await page.getByText("Ask seller / Product Q&A", { exact: true }).click();
  await expect(
    page.getByText("Yes. Choose the blue option.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Public name", { exact: true }).fill("Buyer");
  await page
    .getByLabel("Question", { exact: true })
    .fill("Is there a size guide for this shirt?");
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Question sent" }),
  ).toBeVisible();
  expect(
    writes.find((write) => write.path.endsWith("/questions"))!.body,
  ).toEqual({
    display_name: "Buyer",
    question: "Is there a size guide for this shirt?",
  });
});

test("configured flash deal has a real deadline and expires", async ({
  page,
}) => {
  const now = Date.now();
  await page.clock.install({ time: now });
  await preview(page, {
    offers: [
      {
        shop_id: shop.id,
        code: "SAVE10",
        title: "Weekend clothing offer",
        benefit: "10%",
        min_spend: "0",
        starts_at: new Date(now - 60000).toISOString(),
        expires_at: new Date(now + 3000).toISOString(),
        product_ids: [shirt.id],
      },
    ],
  });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Flash deals" })).toContainText(
    "SAVE10",
  );
  await expect(page.getByRole("link", { name: "View offer" })).toHaveAttribute(
    "href",
    /coupon=SAVE10/,
  );
  await page.clock.fastForward(5000);
  await expect(page.getByRole("region", { name: "Flash deals" })).toHaveCount(
    0,
  );
});

test("track page displays courier status inline and explains stale updates", async ({
  page,
}) => {
  await preview(page);
  await page.goto("/track");
  const tracking = page.locator(".live-tracking");
  await expect(tracking).toContainText("SHIP880");
  await expect(tracking).toContainText("Last source update");
  await expect(tracking.getByRole("link", { name: /ORD-880/ })).toHaveAttribute(
    "href",
    "/purchases/growth-order",
  );
  await tracking
    .getByRole("button", { name: "Refresh status", exact: true })
    .click();
  await expect(tracking).toContainText("SHIP880");
});

test("a paid mixed digital bag exposes ready items while remaining items are prepared", async ({
  page,
}) => {
  await preview(page);
  await page.route("**/api/orders/growth-order", (route) =>
    route.fulfill({
      json: {
        ...order,
        shop: { ...shop, commerce_mode: "digital", kind: "Digital Products" },
        name: "Automatic license · Prepared course",
        fulfilment_kind: "digital",
        payment_status: "paid",
        delivery_status: "partially_sent",
        quantity: 2,
        ready: true,
        ready_quantity: 1,
      },
    }),
  );
  await page.route("**/api/orders/growth-order/reveal", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            item: 1,
            name: "Automatic license",
            variant: "Standard",
            content: "SAMPLE-READY-ITEM",
          },
        ],
        delivery_status: "partially_sent",
      },
    }),
  );
  await page.goto("/purchases/growth-order");
  await expect(
    page.getByRole("heading", {
      name: "Some of your items are ready",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "1 of 2 items are available below. The remaining items are still being prepared.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View my items", exact: true })
    .click();
  await expect(page.locator("[data-private]")).toHaveText("SAMPLE-READY-ITEM");
  await expect(page.locator(".private-item-header")).toContainText(
    "Automatic license",
  );
});

test("admin report shows actual traffic and sales and creates a scheduled source offer", async ({
  page,
}) => {
  const writes = await preview(page, { admin: true });
  await page.goto("/admin/analytics");
  await expect(
    page.getByRole("heading", { name: "Sales by shop" }),
  ).toBeVisible();
  await expect(page.locator(".growth-insights")).toContainText("770");
  await page
    .getByRole("link", { name: "Coupons & flash deals", exact: true })
    .click();
  await page.getByLabel("Coupon code", { exact: true }).fill("SAVE10");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Weekend clothing offer");
  await page
    .getByLabel("Discount (10% or 100 BDT)", { exact: true })
    .fill("10%");
  await page.getByLabel("Starts", { exact: true }).fill("2027-01-01T10:00");
  await page.getByLabel("Ends", { exact: true }).fill("2027-01-02T10:00");
  await page.getByLabel("Show as a flash deal", { exact: true }).check();
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Offers saved in AriseSell",
  );
  const saved = writes.find((write) => write.path.endsWith("/offers"))!.body;
  expect(saved.offer.flash).toBe(true);
  expect(saved.offer.code).toBe("SAVE10");
  expect(saved.revision).toHaveLength(64);
});

test("new admin views fit narrow screens and reviewed badges record evidence", async ({
  page,
}) => {
  const writes = await preview(page, { admin: true });
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["offers", "badges", "analytics", "questions"]) {
      await page.goto(`/admin/${route}`);
      await expect(page.locator(".admin-page-title h1")).toBeVisible();
      if (route === "offers")
        await expect(
          page.getByLabel("Coupon code", { exact: true }),
        ).toBeVisible();
      if (route === "badges")
        await expect(
          page.getByLabel("Review evidence (admin only)", { exact: true }),
        ).toBeVisible();
      if (route === "analytics")
        await expect(
          page.getByRole("heading", { name: "Sales by shop", exact: true }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  await page.goto("/admin/badges");
  await page
    .getByLabel("Review evidence (admin only)", { exact: true })
    .fill("Reviewed fulfilled source orders and resolved support cases.");
  await page.getByLabel("Expires", { exact: true }).fill("2027-01-01T10:00");
  await page
    .getByRole("button", { name: "Grant reviewed badge", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Shop badges updated");
  const saved = writes.find(
    (write) => write.path === "/api/admin/documents/badges",
  )!.body;
  expect(saved.content[shop.id].reason).toContain("fulfilled source orders");
  expect(saved.content[shop.id].label).toBe("Trusted Shop");
});
