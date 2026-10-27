import {test, expect} from "@playwright/test";

const shop = {id:"shop-types", slug:"fashion-shop", name:"Fashion shop", kind:"Fashion & Clothing",
  commerce_mode:"standard", support:"help@example.test", published:true, payment_methods:["cod"]};
const physical = {id:"physical-test", shop_id:shop.id, name:"Cotton shirt", category:"Clothing", description:"Cotton shirt with source-owned options.",
  image_url:"", currency:"BDT", fulfilment_kind:"physical", delivery_mode:"shipping", delivery_estimate:"", delivery_note:"", purchase_terms:"",
  required_buyer_fields:["name","phone","address","district"], payment_methods:["cod"], sales_enabled:true, checkout_available:true,
  variants:[{id:"shirt-large", name:"Large", price:"100.00", stock:4}]};

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("arise_lang", "en"));
});

test("physical checkout collects delivery details and displays source shipping and tracking on mobile", async ({page}) => {
  let quoted: any;
  await page.route("**/api/**", async route => {
    const path=new URL(route.request().url()).pathname;
    if (path === "/api/traffic") return route.fulfill({json:{ok:true}});
    if (path.endsWith("/questions")) return route.fulfill({json:{questions:[],has_more:false}});
    if(path==="/api/promotions") return route.fulfill({json:{ads:[],settings:{}}});
    if(path==="/api/session") return route.fulfill({json:{user:null,csrf:"test-csrf",demo:false,source_web:""}});
    if(path==="/api/catalog") return route.fulfill({json:{shops:[shop],products:[physical],synced_at:new Date().toISOString()}});
    if(path.endsWith("/reviews")) return route.fulfill({json:{count:0,average:null,has_more:false,reviews:[]}});
    if(path==="/api/checkout/quote") {
      quoted=route.request().postDataJSON();
      return route.fulfill({json:{draft_id:"physical-draft",quote_hash:"q",snapshot:{name:physical.name,variant:"Large",quantity:quoted.quantity,
        unit_price:"100.00",subtotal:"200.00",total:"270.00",delivery_charge:"70.00",advance_amount:"0",fulfilment_kind:"physical",buyer:quoted.buyer}}});
    }
    const order={id:"order-physical",ref:"ORD-123",shop,name:physical.name,quantity:2,total:"270.00",currency:"BDT",payment_status:"unpaid",
      fulfilment_kind:"physical",payment_method:"cod",delivery_status:"in_transit",delivery_mode:"shipping",delivery_estimate:"",created_at:new Date().toISOString(),
      ready:false,payment:null,delivery_charge:"70.00",address:quoted?.buyer.address,district:quoted?.buyer.district,
      tracking:{provider:"steadfast",tracking:"TRACK123",status:"in_transit",tracking_url:"https://steadfast.com.bd/t/TRACK123"}};
    if(path==="/api/checkout/accept" || path==="/api/orders/order-physical") return route.fulfill({json:order});
    throw new Error(`Unexpected request: ${path}`);
  });
  await page.setViewportSize({width:375,height:812});
  await page.goto("/products/physical-test");
  await expect(page.getByText("Physical delivery",{exact:true})).toBeVisible();
  await page.getByRole("spinbutton",{name:"Quantity",exact:true}).fill("2");
  await page.getByRole("link",{name:"Buy now",exact:true}).click();
  await page.getByLabel("Full name",{exact:true}).fill("Physical buyer");
  await page.getByLabel("Phone number",{exact:true}).fill("01712345678");
  await page.getByLabel("Full delivery address",{exact:true}).fill("House 12 Road 4 Mirpur");
  await page.getByLabel("District",{exact:true}).fill("Dhaka");
  await page.getByRole("button",{name:"Review order",exact:true}).click();
  await expect(page.locator(".summary-total strong")).toContainText("270");
  await expect(page.locator(".order-summary")).toContainText("70");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({path:"../artifacts/store-types/physical-checkout-mobile.png",fullPage:true});
  expect(quoted.provider).toBe("cod");
  expect(quoted).not.toHaveProperty("total");
  expect(quoted).not.toHaveProperty("delivery_charge");
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Confirm order",exact:true}).click();
  await expect(page.getByRole("heading",{name:"In transit",exact:true})).toBeVisible();
  await expect(page.getByText(/Tracking number: TRACK123/)).toBeVisible();
  await expect(page.getByRole("link",{name:"Track with courier"})).toHaveAttribute("href","https://steadfast.com.bd/t/TRACK123");
  await expect(page.getByText("Your digital items",{exact:true})).toHaveCount(0);
  await expect(page.getByText("Digital · no shipping",{exact:true})).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("source category filters include physical shops and unavailable checkout cannot be opened directly",async ({page})=>{
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if (path === "/api/traffic") return route.fulfill({json:{ok:true}});
    if (path.endsWith("/questions")) return route.fulfill({json:{questions:[],has_more:false}});
    if(path==="/api/promotions") return route.fulfill({json:{ads:[],settings:{}}});
    if(path==="/api/session") return route.fulfill({json:{user:null,csrf:"test-csrf",demo:false,source_web:""}});
    if(path.endsWith("/reviews")) return route.fulfill({json:{count:0,average:null,has_more:false,reviews:[]}});
    if(path==="/api/catalog") return route.fulfill({json:{shops:[shop],products:[{...physical,checkout_available:false,checkout_unavailable_reason:"Contact the seller to complete custom requirements."}],synced_at:new Date().toISOString()}});
    throw new Error(`Unexpected request: ${path}`);
  });
  await page.goto("/products");
  await page.getByRole("combobox",{name:"Shop type",exact:true}).selectOption("Fashion & Clothing");
  await expect(page.getByRole("link",{name:"Cotton shirt",exact:true})).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.goto("/checkout/physical-test?variant=shirt-large");
  await expect(page.getByRole("heading",{name:"Checkout unavailable",exact:true})).toBeVisible();
  await expect(page.getByText("Contact the seller to complete custom requirements.",{exact:true})).toBeVisible();
});
