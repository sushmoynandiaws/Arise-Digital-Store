import { test, expect, type Page } from "@playwright/test";
import type { Purchase, Shop } from "../src/types";

const now = new Date("2026-10-26T12:00:00Z");
const shop: Shop = { id: "timer-shop", slug: "timer-shop", name: "Sample shop", description: "", support: "help@example.test", logo_url: "", cover_url: "", published: true, payment_methods: ["bkash"] };
const order: Purchase = {
  id: "timer-order", ref: "SAMPLE-TIMER", shop, name: "Sample subscription",
  quantity: 1, total: "490.00", currency: "BDT", payment_status: "unpaid",
  delivery_status: "awaiting_payment", delivery_mode: "automatic", delivery_estimate: "",
  created_at: now.toISOString(), ready: false,
  payment: { provider: "bkash", account: "SAMPLE-DO-NOT-PAY", amount: "490.00", trx_id: null, expires_at: new Date(+now + 605000).toISOString() },
};

async function preview(page: Page, getOrder: () => Purchase = () => order, lang = "en") {
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.addInitScript(value => localStorage.setItem("arise_lang", value), lang);
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/traffic") return route.fulfill({json:{ok:true}});
    if (path.endsWith("/questions")) return route.fulfill({json:{questions:[],has_more:false}});
    if (route.request().method() !== "GET") throw new Error(`Unexpected write: ${path}`);
    if (path === "/api/session") return route.fulfill({ json: { user: null, csrf: "sample", demo: false } });
    if (path === "/api/catalog") return route.fulfill({ json: { shops: [shop], products: [], synced_at: now.toISOString() } });
    if (path === "/api/orders/timer-order") return route.fulfill({ json: getOrder() });
    return route.fulfill({ status: 404, json: { error: "Sample endpoint unavailable" } });
  });
  await page.goto("/purchases/timer-order");
  await expect(page.locator(".purchase-page-heading h1")).toBeVisible();
}

test("countdown uses the deadline, ticks without a poll and survives reload", async ({ page }) => {
  await preview(page);
  await expect(page.getByRole("timer")).toHaveText("10:05");
  await page.clock.runFor(1000);
  await expect(page.getByRole("timer")).toHaveText("10:04");
  await page.clock.runFor(64000);
  await expect(page.getByRole("timer")).toHaveText("09:00");
  await page.reload();
  await expect(page.getByRole("timer")).toHaveText("09:00");
  await page.clock.setSystemTime(new Date(+now + 185000));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("timer")).toHaveText("07:00");
  await expect(page.locator(".purchase-sharing-actions")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /recovery link/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /send delivery/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy", exact: true })).toHaveCount(3);
});

test("deadline immediately switches to expired state and removes payment controls", async ({ page }) => {
  await preview(page, () => ({ ...order, payment: { ...order.payment!, expires_at: new Date(+now + 2000).toISOString() } }));
  await page.clock.runFor(1000);
  await expect(page.getByRole("timer")).toHaveText("00:01");
  await page.clock.runFor(1000);
  await expect(page.getByRole("heading", { name: "Payment request expired", exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await expect(page.getByLabel("Transaction ID", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check payment", exact: true })).toHaveCount(0);
  await expect(page.getByText("This payment request is no longer active. Do not send payment using these details.")).toBeVisible();
});

test("a physical advance cannot invent an account, payment request or expiry from contact details",async({page})=>{
  await preview(page,()=>({...order,fulfilment_kind:"physical",delivery_mode:"shipping",delivery_status:"awaiting_advance",advance_amount:"70.00",payment:null,
    shop:{...shop,contact:{phone:"01712345678"},payment_methods:["cod"],payment_account_types:{bkash:"personal"}}}));
  await expect(page.getByRole("heading",{name:"Awaiting advance verification",exact:true})).toBeVisible();
  await expect(page.locator(".payment-instruction-card")).toHaveCount(0);
  await expect(page.getByRole("timer")).toHaveCount(0);
  await expect(page.getByLabel("Transaction ID",{exact:true})).toHaveCount(0);
  await expect(page.locator(".purchase-buyer-info")).toContainText("Contact the seller to verify the advance before dispatch");
});

test("countdown follows a source deadline update and stops after verified payment", async ({ page }) => {
  let current = order;
  await preview(page, () => current);
  current = { ...order, payment: { ...order.payment!, expires_at: new Date(+now + 1200000).toISOString() } };
  await page.clock.runFor(7000);
  await expect(page.getByRole("timer")).toHaveText("19:53");
  current = { ...current, payment_status: "paid", delivery_status: "queued" };
  await page.clock.runFor(7000);
  await expect(page.getByRole("heading", { name: "Preparing your digital items", exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await expect(page.locator(".proof-form")).toHaveCount(0);
});

test("Bangla countdown stays readable at mobile and desktop widths", async ({ page }) => {
  await preview(page, () => order, "bn");
  await expect(page.locator(".payment-expiry-note")).toContainText("পেমেন্টের বাকি সময়:");
  await expect(page.getByRole("timer")).toHaveAttribute("aria-live", "off");
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("timer").scrollIntoViewIfNeeded();
    await expect(page.getByRole("timer")).toBeVisible();
    expect(await page.locator(".payment-expiry-note").evaluate(el => getComputedStyle(el).fontSize)).toBe("16px");
    const bounds = await page.locator(".payment-expiry-note").boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `../artifacts/payment-countdown/bn-${width}.png`, fullPage: true });
  }
});

for (const [state, changes, title] of [
  ["pending", { payment_status: "pending_verification" }, "Checking your payment"],
  ["review", { payment_status: "review_required" }, "Your payment needs review"],
  ["paid", { payment_status: "paid", ready: true }, "Your order is ready"],
  ["refunded", { payment_status: "refunded" }, "Payment refunded"],
  ["cancelled", { delivery_status: "cancelled" }, "Order cancelled"],
] as const) test(`sharing actions are absent in ${state} state`, async ({ page }) => {
  await preview(page, () => ({ ...order, ...changes }));
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(page.locator(".purchase-sharing-actions, .button-wa-share")).toHaveCount(0);
  await expect(page.getByRole("timer")).toHaveCount(state === "pending" || state === "review" ? 1 : 0);
});
