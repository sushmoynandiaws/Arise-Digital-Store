import {test, expect} from "@playwright/test";

const shop = {id:"art-shop", slug:"art-shop",name:"Art shop",kind:"Art & Crafts",commerce_mode:"standard",published:true,payment_methods:["cod"],support:"help@example.test"};
const product = {id:"canvas",shop_id:shop.id,name:"Custom canvas",category:"Art",description:"Personal canvas",image_url:"",currency:"BDT",
  fulfilment_kind:"physical",delivery_mode:"shipping",required_buyer_fields:["name","phone","address","district"],payment_methods:["cod"],sales_enabled:true,checkout_available:true,
  variants:[{id:"small",name:"Small canvas",price:"600",stock:4}],custom_order:{revision:"a".repeat(64),fields:[{id:"printed",label:"Printed name",question:"Which name should be printed?",type:"text",required:true,options:[]}],
    craft:{enabled:true,allow_mixing:false,allow_artwork:true,proof_required:true,designs:[{code:"D1",label:"Floral"}]}}};

test("mobile custom selection waits for seller proof, approves it and passes source draft to checkout", async ({page}) => {
  let approved = false, saved: any, quote: any;
  const selection = () => ({id:"custom-draft",product_id:product.id,variant_id:"small",quantity:1,ready:approved,reason:approved?"":"Merchant preview and customer proof approval are required",
    proof:{id:"proof-1",url:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'/%3E",revision:"b".repeat(64),approved}});
  await page.addInitScript(() => localStorage.setItem("arise_lang","en"));
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if(path === "/api/catalog") return route.fulfill({json:{shops:[shop],products:[product],synced_at:new Date().toISOString()}});
    if(path === "/api/session") return route.fulfill({json:{user:null,csrf:"csrf",demo:false,source_web:""}});
    if(path === "/api/promotions") return route.fulfill({json:{ads:[],settings:{}}});
    if(path === "/api/traffic") return route.fulfill({json:{ok:true}});
    if(path === "/api/craft") {saved=route.request().postDataJSON();return route.fulfill({json:selection()});}
    if(path === "/api/craft/custom-draft") return route.fulfill({json:selection()});
    if(path.endsWith("/approve")) {expect(route.request().postDataJSON()).toEqual({proof_id:"proof-1",revision:"b".repeat(64)});approved=true;return route.fulfill({json:selection()});}
    if(path === "/api/checkout/quote") {quote=route.request().postDataJSON();return route.fulfill({json:{draft_id:"custom-draft",quote_hash:"quote",snapshot:{name:product.name,variant:"Small canvas",quantity:1,total:"670",delivery_charge:"70",advance_amount:"180",buyer:quote.buyer}}});}
    throw new Error(`Unexpected API call ${path}`);
  });
  await page.setViewportSize({width:375,height:812});
  await page.goto("/checkout/canvas?variant=small&quantity=1");
  await page.getByLabel("Floral quantity").fill("1");
  await page.getByLabel("Printed name").fill("Exact spelling");
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Submit selection",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Seller review and preview"})).toBeVisible();
  expect(saved.answers.printed).toBe("Exact spelling");
  expect(saved.selection).toEqual([{code:"D1",qty:1}]);
  await expect(page.getByRole("button",{name:"Review order",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"I approve this preview",exact:true}).click();
  await page.getByLabel("Full name",{exact:true}).fill("Craft buyer");
  await page.getByLabel("Phone number",{exact:true}).fill("01712345678");
  await page.getByLabel("Full delivery address",{exact:true}).fill("House 12 Road 4 Mirpur");
  await page.getByLabel("District",{exact:true}).fill("Dhaka");
  await page.getByRole("button",{name:"Review order",exact:true}).click();
  expect(quote.custom_draft_id).toBe("custom-draft");
  expect(quote).not.toHaveProperty("total");
  await expect(page.getByText(/Required advance payment/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({path:"../artifacts/craft-checkout-mobile.png",fullPage:true});
});
