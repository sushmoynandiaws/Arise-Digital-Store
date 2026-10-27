import {test,expect} from "@playwright/test";
const shop={id:"11111111-1111-4111-8111-111111111111",slug:"shoe-shop",name:"Shoe shop",kind:"Fashion",published:true,payment_methods:["cod"]};
const product={id:"22222222-2222-4222-8222-222222222222",shop_id:shop.id,name:"White canvas sneaker",category:"Shoes",description:"White canvas",image_url:"",currency:"BDT",
  fulfilment_kind:"physical",delivery_mode:"shipping",sales_enabled:true,checkout_available:true,payment_methods:["cod"],required_buyer_fields:["name","phone","address","district"],
  variants:[{id:"white42",name:"White 42",price:"1450.50",stock:3},{id:"white41",name:"White 41",price:"1200",stock:0}]};

async function mock(page:any,requests:any[],state="results") {
  await page.addInitScript(()=>{localStorage.setItem("arise_lang","bn");Object.defineProperty(window,"SpeechRecognition",{value:undefined,configurable:true});Object.defineProperty(window,"webkitSpeechRecognition",{value:undefined,configurable:true});});
  await page.route("**/api/**",async(route:any)=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/session")return route.fulfill({json:{user:null,csrf:"csrf",demo:false,source_web:""}});
    if(path==="/api/catalog")return route.fulfill({json:{shops:[shop],products:[{...product,variants:product.variants.map(v=>({...v,price:"2999",stock:v.stock?1:0}))}],synced_at:new Date().toISOString()}});
    if(path==="/api/promotions")return route.fulfill({json:{ads:[],settings:{}}});
    if(path==="/api/traffic")return route.fulfill({json:{ok:true}});
    if(path.endsWith("/questions"))return route.fulfill({json:{questions:[],has_more:false}});
    if(path.endsWith("/reviews"))return route.fulfill({json:{reviews:[],count:0,average:null}});
    if(path==="/api/assistant"){requests.push(route.request().postDataJSON());return route.fulfill({json:{state,matches:state==="results"?[{product_id:product.id,variant_ids:["white42"],product}]:[]}});}
    throw new Error(`Unexpected request ${path}`);
  });
}

test("Bangla drawer keeps shop scope, shows source variant facts and checks out without creating orders in chat",async({page})=>{
  const requests:any[]=[];await mock(page,requests);await page.setViewportSize({width:375,height:812});
  await page.goto("/shops/shoe-shop");
  await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  const drawer=page.getByRole("dialog");await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button",{name:"বাংলায় বলুন"})).toBeDisabled();
  await drawer.getByLabel("আপনার খোঁজ").fill("১৫০০ টাকার মধ্যে ৪২ সাইজের জুতা দেখাও");
  await drawer.getByRole("button",{name:"খুঁজুন",exact:true}).click();
  await expect(drawer.getByText("Stock",{exact:false})).toHaveCount(0);
  await expect(drawer.getByText("স্টক: 3",{exact:false})).toBeVisible();
  await expect(drawer.getByText(/1,450.50/)).toBeVisible();
  await expect(drawer.getByRole("combobox")).toHaveValue("white42");
  expect(requests[0].shop_id).toBe(shop.id);expect(requests[0]).not.toHaveProperty("allowed_product_ids");
  await drawer.getByRole("button",{name:"এই পণ্য নিয়ে খুঁজুন"}).click();
  await drawer.getByRole("button",{name:"খুঁজুন",exact:true}).click();
  await expect.poll(()=>requests.length).toBe(2);expect(requests[1].selected_product_id).toBe(product.id);
  expect(requests[1].previous_queries).toEqual(["১৫০০ টাকার মধ্যে ৪২ সাইজের জুতা দেখাও"]);
  expect(await drawer.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
  await page.screenshot({path:"../artifacts/shopping-assistant-mobile.png"});
  await drawer.getByRole("link",{name:"চেকআউট",exact:true}).last().click();
  await expect(page).toHaveURL(new RegExp(`/checkout/${product.id}\\?variant=white42&quantity=1`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("unavailable AI is explicit and Escape returns keyboard focus",async({page})=>{
  const requests:any[]=[];await mock(page,requests,"unavailable");await page.goto("/shops/shoe-shop");
  const launch=page.getByRole("button",{name:"AI সহকারী",exact:true});await launch.click();
  const drawer=page.getByRole("dialog");await drawer.getByLabel("আপনার খোঁজ").fill("জুতা চাই");await drawer.getByRole("button",{name:"খুঁজুন",exact:true}).click();
  await expect(drawer.getByText(/AI এখন পাওয়া যাচ্ছে না/)).toBeVisible();await expect(drawer.getByRole("article")).toHaveCount(0);
  await page.keyboard.press("Escape");await expect(drawer).not.toBeVisible();await expect(launch).toBeFocused();
});

test("voice transcript is editable and is never sent without customer submission",async({page})=>{
  const requests:any[]=[];await mock(page,requests);
  await page.addInitScript(()=>{class Voice {lang="";continuous=false;interimResults=false;onresult:any;onend:any;onerror:any;start(){this.onresult?.({results:[[{transcript:"১৫০০ টাকার জুতা"}]]});this.onend?.();}abort(){this.onend?.();}}Object.defineProperty(window,"SpeechRecognition",{value:Voice,configurable:true});});
  await page.goto("/shops/shoe-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  const drawer=page.getByRole("dialog");await drawer.getByRole("button",{name:"বাংলায় বলুন"}).click();
  await expect(drawer.getByLabel("আপনার খোঁজ")).toHaveValue("১৫০০ টাকার জুতা");expect(requests).toHaveLength(0);
  await drawer.getByLabel("আপনার খোঁজ").fill("সংশোধিত জুতা");await drawer.getByRole("button",{name:"খুঁজুন",exact:true}).click();
  await expect.poll(()=>requests.length).toBe(1);expect(requests[0].message).toBe("সংশোধিত জুতা");
});


test("assistant is absent outside shops",async({page})=>{
  const requests:any[]=[];await mock(page,requests);
  await page.goto("/products");
  await expect(page.getByRole("button",{name:"AI সহকারী",exact:true})).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("button",{name:"AI সহকারী",exact:true})).toHaveCount(0);
});


test("changing shops clears conversation and product context",async({page})=>{
  const requests:any[]=[];await mock(page,requests);
  const second={...shop,id:"33333333-3333-4333-8333-333333333333",slug:"second-shop",name:"Second shop"};
  await page.route("**/api/catalog",route=>route.fulfill({json:{shops:[shop,second],products:[product],synced_at:new Date().toISOString()}}));
  await page.goto("/shops/shoe-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  await page.getByLabel("আপনার খোঁজ").fill("সাদা জুতা");await page.getByRole("dialog").getByRole("button",{name:"খুঁজুন",exact:true}).click();
  await expect.poll(()=>requests.length).toBe(1);
  await page.goto("/shops/second-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  await expect(page.getByRole("dialog").getByText("সাদা জুতা",{exact:true})).toHaveCount(0);
  await page.getByLabel("আপনার খোঁজ").fill("গিফট চাই");await page.getByRole("dialog").getByRole("button",{name:"খুঁজুন",exact:true}).click();
  await expect.poll(()=>requests.length).toBe(2);expect(requests[1].shop_id).toBe(second.id);expect(requests[1].previous_queries).toEqual([]);
  await expect(page.getByRole("dialog").getByRole("article")).toHaveCount(0);
});
