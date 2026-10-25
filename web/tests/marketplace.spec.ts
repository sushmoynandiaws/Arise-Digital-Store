import {test,expect,type Page} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const env=Object.fromEntries(fs.readFileSync(path.resolve("../.env"),"utf8").trim().split(/\r?\n/).map(line=>{const i=line.indexOf("=");return [line.slice(0,i),line.slice(i+1)];}));

test("storefront search, category filters, shop navigation and mobile reflow",async({page})=>{
  await page.goto("/");await expect(page.getByRole("heading",{name:/Digital products/})).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(8);
  await page.screenshot({path:"../artifacts/home-desktop.png",fullPage:true});
  await page.getByLabel("Search digital products").fill("Rust");await page.getByRole("button",{name:"Search products",exact:true}).click();
  await expect(page.getByRole("link",{name:"Practical Rust Essentials",exact:true})).toBeVisible();await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("button",{name:"Clear search"}).click();await page.getByRole("button",{name:"Templates",exact:true}).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.goto("/shops");await page.getByRole("link",{name:"Visit shop"}).first().click();await expect(page.locator(".shop-identity h1")).toBeVisible();
  await page.setViewportSize({width:375,height:812});await page.goto("/");await expect(page.locator(".product-card")).toHaveCount(8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:"../artifacts/home-mobile.png",fullPage:true});
  await page.getByRole("button",{name:"Open menu"}).click();await page.getByRole("navigation",{name:"Mobile navigation"}).getByRole("link",{name:"Browse shops"}).click();
  await expect(page.getByRole("heading",{name:/Independent shops/})).toBeVisible();
  await page.setViewportSize({width:812,height:375});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

async function checkout(page:Page,name:string){
  await page.goto("/products");await page.getByRole("link",{name,exact:true}).click();await page.getByRole("link",{name:"Buy now",exact:true}).click();
  await page.getByLabel("Full name",{exact:true}).fill("Local Preview Buyer");await page.getByRole("button",{name:"Review order"}).click();
  await expect(page.getByRole("heading",{name:"Review your order"})).toBeVisible();await page.getByRole("checkbox",{name:/I’ve read and accept/}).check();
  const response=page.waitForResponse(response=>response.url().endsWith("/api/checkout/accept")&&response.request().method()==="POST");
  await page.getByRole("button",{name:"Confirm order"}).click();const order=await (await response).json();
  expect(order.id).toBeTruthy();await expect(page.getByRole("heading",{name:/Complete your payment/})).toBeVisible();return order;
}
test("guest payment stays unverified for arbitrary TrxID; real source fixture verifies and privately delivers",async({page,browser})=>{
  const order=await checkout(page,"Notion Life Planner");
  await page.getByLabel("Transaction ID",{exact:true}).fill("NOTARECEIPT123");await page.getByRole("button",{name:"Check payment"}).click();
  await expect(page.getByText("Checking payment",{exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"View my items"})).toHaveCount(0);
  await page.getByLabel("Transaction ID",{exact:true}).fill(`DEMO${order.ref.replace(/\D/g,"")}`);await page.getByRole("button",{name:"Check payment"}).click();
  await expect(page.getByRole("heading",{name:"Your order is ready"})).toBeVisible();await page.getByRole("button",{name:"View my items"}).click();
  await expect(page.locator("pre[data-private]")).toContainText("SAMPLE ITEM — NOT A REAL CREDENTIAL");await expect(page.getByText("Delivered",{exact:true})).toBeVisible();
  await page.screenshot({path:"../artifacts/purchase-delivery.png",fullPage:true});
  const other=await browser.newContext();const otherPage=await other.newPage();await otherPage.goto(`/purchases/${order.id}`);
  await expect(otherPage.getByRole("alert").filter({hasText:"Purchase not found"})).toBeVisible();await expect(otherPage.locator("pre[data-private]")).toHaveCount(0);await other.close();
});
test("manual delivery waits for seller preparation and explicit send",async({page,request})=>{
  const order=await checkout(page,"Personal Brand Review");await page.getByLabel("Transaction ID",{exact:true}).fill(`DEMO${order.ref.replace(/\D/g,"")}`);await page.getByRole("button",{name:"Check payment"}).click();
  await expect(page.getByRole("heading",{name:"Your order is being prepared"})).toBeVisible();await expect(page.getByRole("button",{name:"View my items"})).toHaveCount(0);
  const prepared=await request.post(`http://localhost:8111/demo/orders/${order.id}/prepare`,{headers:{"X-Marketplace-Key":env.ARISESELL_BRIDGE_KEY}});expect(prepared.ok()).toBeTruthy();
  await expect(page.getByRole("button",{name:"View my items"})).toBeVisible({timeout:15000});await page.getByRole("button",{name:"View my items"}).click();
  await expect(page.locator("pre[data-private]")).toContainText("SAMPLE MANUAL DELIVERY — NOT A REAL ITEM");
});
test("seller uses PKCE connection and updates the source-owned shop profile",async({page,context})=>{
  await page.goto("/seller");await page.getByRole("link",{name:"Continue with AriseSell",exact:true}).click();await page.getByRole("button",{name:"Continue as Demo Seller",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Shop profile"})).toBeVisible();await page.getByLabel("Choose your AriseSell shop").selectOption({label:"Studio North"});
  await expect(page.getByLabel("Shop name",{exact:true})).toHaveValue("Studio North");await page.getByLabel("Tell customers about your shop").fill("Thoughtful design assets and templates for your next creative chapter.");
  await page.getByRole("button",{name:"Save shop changes"}).click();await expect(page.getByRole("status").filter({hasText:"Your shop is published."})).toBeVisible();
  const storeLink=`${new URL(page.url()).origin}/shops/studio-north`;
  await expect(page.getByLabel("Shop link",{exact:true})).toHaveValue(storeLink);
  await context.grantPermissions(["clipboard-read","clipboard-write"]);await page.getByRole("button",{name:"Copy shop link",exact:true}).click();
  await expect(page.getByRole("button",{name:"Copied",exact:true})).toBeVisible();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(storeLink);
  await page.screenshot({path:"../artifacts/seller-dashboard.png",fullPage:true});
  await page.setViewportSize({width:375,height:812});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await expect(page.getByLabel("Shop link",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:"View shop",exact:true}).click();await expect(page.locator(".shop-identity h1")).toHaveText("Studio North");
});

test("shared store link opens a branded guest storefront and keeps shopping with that seller",async({page})=>{
  await page.goto("/shops/studio-north");await page.reload();
  await expect(page.getByRole("link",{name:"Studio North shop home",exact:true})).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(5);
  await expect(page.locator("header").getByRole("link",{name:"Browse shops",exact:true})).toHaveCount(0);
  await expect(page.locator("header").getByRole("link",{name:"Start selling",exact:true})).toHaveCount(0);
  await page.screenshot({path:"../artifacts/shared-store-desktop.png",fullPage:true});
  await page.getByLabel("Search products",{exact:true}).fill("Rust");await expect(page.locator(".product-card")).toHaveCount(0);
  await page.getByRole("button",{name:"Clear search",exact:true}).click();await expect(page.locator(".product-card")).toHaveCount(5);
  await page.setViewportSize({width:375,height:812});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:"../artifacts/shared-store-mobile.png",fullPage:true});
  await page.getByRole("button",{name:"Open menu",exact:true}).click();await expect(page.getByRole("navigation",{name:"Mobile navigation"}).getByRole("link",{name:"Shop products",exact:true})).toHaveAttribute("href","/shops/studio-north");
  await page.getByRole("button",{name:"Close menu",exact:true}).click();
  await page.getByRole("link",{name:"Notion Life Planner",exact:true}).click();
  const breadcrumbs=page.getByRole("navigation",{name:"Breadcrumb"});await expect(breadcrumbs.getByRole("link",{name:"Templates",exact:true})).toHaveAttribute("href","/shops/studio-north?category=Templates");
  await expect(page.getByRole("link",{name:"Studio North shop home",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Buy now",exact:true}).click();await expect(page.getByRole("link",{name:"Studio North shop home",exact:true})).toBeVisible();
  await expect(page.getByText("Checking out as a guest.",{exact:false})).toBeVisible();
  await page.getByLabel("Full name",{exact:true}).fill("Shared Link Buyer");await page.getByRole("button",{name:"Review order",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Review your order",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
test("customer sign-in returns directly to purchase history",async({page})=>{
  await page.goto("/purchases");await page.getByRole("link",{name:"Continue with AriseSell",exact:true}).click();
  await page.getByRole("button",{name:"Continue as Demo Seller",exact:true}).click();
  await expect(page).toHaveURL(/\/purchases$/);await expect(page.getByRole("heading",{name:"My purchases"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Continue with AriseSell",exact:true})).toHaveCount(0);
});
test("administrator can moderate a listing without deleting AriseSell inventory",async({page})=>{
  await page.goto("/seller");await page.getByRole("link",{name:"Continue with AriseSell",exact:true}).click();await page.getByRole("button",{name:"Continue as Demo Administrator",exact:true}).click();
  await page.getByRole("link",{name:"Marketplace admin"}).click();await expect(page.getByRole("heading",{name:"Published shops"})).toBeVisible();
  const row=page.locator(".admin-row").filter({hasText:"Soft Light Texture Pack"});await row.getByRole("button",{name:"Hide listing"}).click();
  await page.getByLabel("Reason for this action").fill("Local moderation test of a sample listing");await page.getByRole("dialog").getByRole("button",{name:"Hide listing",exact:true}).click();
  await expect(row.getByText("Hidden",{exact:true})).toBeVisible();await row.getByRole("button",{name:"Restore",exact:true}).click();await page.getByLabel("Reason for this action").fill("Restore sample listing after local verification");await page.getByRole("dialog").getByRole("button",{name:"Restore",exact:true}).click();
  await expect(row.getByText("Visible",{exact:true})).toBeVisible();
});

test("refunded purchases never invite a second payment",async({page})=>{
  const id="99999999-9999-4999-8999-999999999999";
  await page.route(`**/api/orders/${id}`,route=>route.fulfill({json:{id,ref:"TEST-REFUND",shop:{id:"test-shop",slug:"test-shop",name:"Test shop",support:"support@example.test"},name:"Refunded sample purchase",quantity:1,total:"490.00",currency:"BDT",payment_status:"refunded",delivery_status:"cancelled",delivery_mode:"automatic",created_at:new Date().toISOString(),ready:false,payment:{provider:"bkash",account:"01700000000",amount:"490.00",trx_id:"SAMPLE123",expires_at:new Date(Date.now()+600000).toISOString()}}}));
  await page.goto(`/purchases/${id}`);await expect(page.getByText("Refunded",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Transaction ID",{exact:true})).toHaveCount(0);await expect(page.getByRole("button",{name:"Check payment"})).toHaveCount(0);
});
