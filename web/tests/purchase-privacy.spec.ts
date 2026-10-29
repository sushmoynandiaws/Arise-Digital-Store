import { test, expect, type Page } from "@playwright/test";
import type { Purchase, Shop } from "../src/types";

const marker = "NONCREDENTIAL-PRIVATE-DELIVERY-FIXTURE";
const shop: Shop = { id: "privacy-shop", slug: "privacy-shop", name: "Dummy shop", description: "", support: "help@example.test", logo_url: "", cover_url: "", published: true };
const order: Purchase = { id: "privacy-order", ref: "DUMMY-PRIVATE", shop, name: "Dummy digital product", quantity: 1,
  total: "10.00", currency: "BDT", payment_status: "paid", delivery_status: "sent", delivery_mode: "automatic",
  delivery_estimate: "", created_at: "2026-10-29T00:00:00Z", ready: true, payment: null };

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(yes => { resolve = yes; });
  return { promise, resolve };
}

// UI fixture only: server-side session deletion/ownership stays covered by the native Rust tests.
async function fixture(page: Page, options: { guest?: boolean; failedRefresh?: boolean; heldReveal?: boolean } = {}) {
  let signedOut = false;
  const denied = deferred(), revealStarted = deferred(), releaseReveal = deferred(), revealFinished = deferred();
  await page.addInitScript(() => {
    localStorage.setItem("arise_lang", "en");
    const copied: string[] = [];
    Object.defineProperty(window, "dummyCopied", { value: copied });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { copied.push(text); } } });
  });
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/session") {
      if (signedOut && options.failedRefresh) return route.fulfill({ status: 503, json: { error: "Dummy session unavailable" } });
      return route.fulfill({ json: { user: signedOut || options.guest ? null : { id: "dummy-A", name: "Dummy buyer", email: "buyer@example.test", admin: false },
        csrf: signedOut ? "new-dummy-buyer" : "old-dummy-buyer", demo: false, source_web: "" } });
    }
    if (path === "/api/catalog") return route.fulfill({ json: { shops: [shop], products: [], synced_at: "" } });
    if (path === "/api/promotions") return route.fulfill({ json: { ads: [], settings: {} } });
    if (path === "/api/traffic") return route.fulfill({ json: { ok: true } });
    if (path === "/api/auth/logout") {
      expect(route.request().method()).toBe("POST");
      expect(route.request().headers()["x-csrf-token"]).toBe("old-dummy-buyer");
      signedOut = true;
      return route.fulfill({ json: { ok: true } });
    }
    if (path === "/api/orders/privacy-order/reveal") {
      expect(signedOut).toBe(false);
      revealStarted.resolve();
      if (options.heldReveal) await releaseReveal.promise;
      try { await route.fulfill({ json: { items: [{ item: 1, content: marker }] } }); }
      catch (error) { if (!route.request().failure()) throw error; }
      finally { revealFinished.resolve(); }
      return;
    }
    if (path === "/api/orders/privacy-order" && !signedOut) return route.fulfill({ json: order });
    if (path.startsWith("/api/orders/")) {
      denied.resolve();
      return route.fulfill({ status: 404, json: { error: "Dummy order unavailable" } });
    }
    return route.fulfill({ status: 404, json: { error: "Dummy endpoint unavailable" } });
  });
  await page.goto("/purchases/privacy-order");
  await expect(page.getByRole("button", { name: "View my items", exact: true })).toBeVisible();
  return { denied, revealStarted, releaseReveal, revealFinished };
}

test("successful sign-out removes revealed data and its Copy control in the same tab", async ({ page }) => {
  const f = await fixture(page);
  await page.getByRole("button", { name: "View my items", exact: true }).click();
  await expect(page.locator("pre[data-private]")).toHaveText(marker);
  await page.locator(".private-item").getByRole("button", { name: "Copy", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { dummyCopied: string[] }).dummyCopied)).toEqual([marker]);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await f.denied.promise;
  await expect(page.getByText("Dummy order unavailable", { exact: true })).toBeVisible();
  await expect(page.locator("pre[data-private], .private-item")).toHaveCount(0);
  await expect(page.getByText(marker, { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/purchases\/privacy-order$/);
});

test("a delayed pre-logout reveal cannot return after sign-out", async ({ page }) => {
  const f = await fixture(page, { heldReveal: true });
  await page.getByRole("button", { name: "View my items", exact: true }).click();
  await f.revealStarted.promise;
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await f.denied.promise;
  f.releaseReveal.resolve();
  await f.revealFinished.promise;
  await expect(page.getByText("Dummy order unavailable", { exact: true })).toBeVisible();
  await expect(page.locator("pre[data-private], .private-item")).toHaveCount(0);
});

test("a failed refresh after successful logout cannot retain private delivery", async ({ page }) => {
  await fixture(page, { failedRefresh: true });
  await page.getByRole("button", { name: "View my items", exact: true }).click();
  await expect(page.locator("pre[data-private]")).toHaveText(marker);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Dummy session unavailable").first()).toBeVisible();
  await expect(page.locator("pre[data-private], .private-item")).toHaveCount(0);
});

test("a browser-owned guest order can still reveal its authorized delivery", async ({ page }) => {
  await fixture(page, { guest: true });
  await page.getByRole("button", { name: "View my items", exact: true }).click();
  await expect(page.locator("pre[data-private]")).toHaveText(marker);
  await page.getByRole("button", { name: "Hide my items", exact: true }).click();
  await expect(page.locator("pre[data-private]")).toHaveCount(0);
});

test("changing purchase routes clears the previous order before a failed reload", async ({ page }) => {
  const f = await fixture(page);
  await page.getByRole("button", { name: "View my items", exact: true }).click();
  await expect(page.locator("pre[data-private]")).toHaveText(marker);
  await page.evaluate(() => { history.pushState({}, "", "/purchases/another-dummy-order"); dispatchEvent(new PopStateEvent("popstate")); });
  await f.denied.promise;
  await expect(page.getByText("Dummy order unavailable", { exact: true })).toBeVisible();
  await expect(page.locator("pre[data-private], .private-item")).toHaveCount(0);
});
