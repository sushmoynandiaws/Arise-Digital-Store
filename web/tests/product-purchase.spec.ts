import { test, expect, type Page } from "@playwright/test";

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
    if (endpoint === "/api/traffic") return route.fulfill({json:{ok:true}});
    if (endpoint.endsWith("/questions")) return route.fulfill({json:{questions:[],has_more:false}});
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


const refreshShop = {id:"refresh-shop",slug:"refresh-shop",name:"Refresh shop",published:true,payment_methods:["bkash"]};
const refreshProduct = {id:"refresh-product",shop_id:refreshShop.id,url_slug:"course",name:"Refresh course",category:"Education",description:"Source product description.",image_url:"",currency:"BDT",delivery_mode:"automatic",required_buyer_fields:[],sales_enabled:true,variants:[{id:"refresh-variant",name:"Standard",price:"10.00",stock:4}]};
async function refreshFixture(page: Page, catalog: () => {status: number; json: unknown}) {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/catalog") return route.fulfill(catalog());
    if (path === "/api/session") return route.fulfill({json:{user:null,csrf:"dummy",demo:false,source_web:""}});
    if (path === "/api/promotions") return route.fulfill({json:{ads:[],settings:{}}});
    if (path.endsWith("/reviews")) return route.fulfill({json:{count:0,average:null,has_more:false,reviews:[]}});
    if (path.endsWith("/questions")) return route.fulfill({json:{questions:[],has_more:false}});
    if (path === "/api/traffic") return route.fulfill({json:{ok:true}});
    throw new Error(`Unexpected request: ${path}`);
  });
}

test("a failed background refresh retains product options, pauses buying and recovers with current source data", async ({page}) => {
  await page.clock.install();
  let offline = false, removed = false, price = "10.00";
  await refreshFixture(page, () => offline ? {status:503,json:{error:"AriseSell is temporarily unavailable. Please retry."}} : {status:200,json:{shops:[refreshShop],products:removed ? [] : [{...refreshProduct,variants:[{...refreshProduct.variants[0],price}]}]}});
  await page.goto("/shops/refresh-shop/products/course");
  const heading = page.getByRole("heading",{name:refreshProduct.name,exact:true});
  await expect(heading).toBeVisible();
  await page.getByRole("spinbutton",{name:"Quantity",exact:true}).fill("2");
  offline = true;
  await page.clock.runFor(30000);
  await expect(page.getByText("Products could not refresh.",{exact:false})).toBeVisible();
  await expect(heading).toBeVisible();
  await expect(page.getByRole("spinbutton",{name:"Quantity",exact:true})).toHaveValue("2");
  await expect(page.getByRole("link",{name:"Buy now",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Waiting for updated details",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Add to bag",exact:true})).toBeDisabled();
  await expect(page.getByText(/Choose a whole quantity/)).toHaveCount(0);
  offline = false; price = "12.50";
  await page.getByRole("button",{name:"Try again",exact:true}).click();
  await expect(page.getByText("Products could not refresh.",{exact:false})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Buy now",exact:true})).toHaveAttribute("href","/checkout/refresh-product?variant=refresh-variant&quantity=2");
  await expect(page.locator(".product-purchase-total")).toContainText("25.00");
  removed = true;
  await page.clock.runFor(30000);
  await expect(heading).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Buy now",exact:true})).toHaveCount(0);
});

test("an initial catalog failure has a working retry without fabricating a product", async ({page}) => {
  let offline = true;
  await refreshFixture(page, () => offline ? {status:503,json:{error:"AriseSell is temporarily unavailable. Please retry."}} : {status:200,json:{shops:[refreshShop],products:[refreshProduct]}});
  await page.goto("/shops/refresh-shop/products/course");
  await expect(page.getByRole("alert")).toContainText("AriseSell is temporarily unavailable");
  await expect(page.getByRole("heading",{name:refreshProduct.name,exact:true})).toHaveCount(0);
  offline = false;
  await page.getByRole("button",{name:"Try again",exact:true}).click();
  await expect(page.getByRole("heading",{name:refreshProduct.name,exact:true})).toBeVisible();
});


test("checkout cannot request a new quote while its catalog refresh has failed", async ({page}) => {
  await page.clock.install();
  let offline = false;
  await refreshFixture(page, () => offline ? {status:503,json:{error:"AriseSell is temporarily unavailable. Please retry."}} : {status:200,json:{shops:[refreshShop],products:[refreshProduct]}});
  await page.goto("/checkout/refresh-product?variant=refresh-variant");
  const review = page.getByRole("button",{name:"Review order",exact:true});
  await expect(review).toBeEnabled();
  offline = true;
  await page.clock.runFor(30000);
  await expect(page.getByText("Products could not refresh.",{exact:false})).toBeVisible();
  await expect(review).toBeDisabled();
  offline = false;
  await page.getByRole("button",{name:"Try again",exact:true}).click();
  await expect(review).toBeEnabled();
});
