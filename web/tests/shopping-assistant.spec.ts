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
    if(path==="/api/assistant"){requests.push(route.request().postDataJSON());return route.fulfill({json:{state,contract:"marketplace-chat-v3",matches:state==="results"?[{product_id:product.id,variant_ids:["white42"],product}]:[]}});}
    throw new Error(`Unexpected request ${path}`);
  });
}

test("Bangla drawer keeps shop scope, shows source variant facts and checks out without creating orders in chat",async({page})=>{
  const requests:any[]=[];await mock(page,requests);await page.setViewportSize({width:375,height:812});
  await page.goto("/shops/shoe-shop");
  await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  const drawer=page.getByRole("dialog");await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button",{name:"বাংলায় বলুন"})).toBeDisabled();
  await drawer.getByLabel("আপনার বার্তা").fill("১৫০০ টাকার মধ্যে ৪২ সাইজের জুতা দেখাও");
  await drawer.getByRole("button",{name:"বার্তা পাঠান",exact:true}).click();
  await expect(drawer.getByText("Stock",{exact:false})).toHaveCount(0);
  await expect(drawer.getByText("স্টক: 3",{exact:false})).toBeVisible();
  await expect(drawer.getByText(/1,450.50/)).toBeVisible();
  await expect(drawer.getByRole("combobox")).toHaveValue("white42");
  expect(requests[0].shop_id).toBe(shop.id);expect(requests[0]).not.toHaveProperty("allowed_product_ids");
  await drawer.getByRole("button",{name:"এই পণ্য নিয়ে কথা বলুন"}).click();
  await drawer.getByRole("button",{name:"বার্তা পাঠান",exact:true}).click();
  await expect.poll(()=>requests.length).toBe(2);expect(requests[1].selected_product_id).toBe(product.id);
  expect(requests[1].previous_queries).toEqual(["১৫০০ টাকার মধ্যে ৪২ সাইজের জুতা দেখাও"]);
  expect(requests[1].context_product_ids).toEqual([product.id]);
  expect(await drawer.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
  await page.screenshot({path:"../artifacts/shopping-assistant-mobile.png"});
  await drawer.getByRole("link",{name:"চেকআউট",exact:true}).last().click();
  await expect(page).toHaveURL(new RegExp(`/checkout/${product.id}\\?variant=white42&quantity=1`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("unavailable AI is explicit and Escape returns keyboard focus",async({page})=>{
  const requests:any[]=[];await mock(page,requests,"unavailable");await page.goto("/shops/shoe-shop");
  const launch=page.getByRole("button",{name:"AI সহকারী",exact:true});await launch.click();
  const drawer=page.getByRole("dialog");await drawer.getByLabel("আপনার বার্তা").fill("জুতা চাই");await drawer.getByRole("button",{name:"বার্তা পাঠান",exact:true}).click();
  await expect(drawer.getByText(/এখন উত্তর দিতে পারছি না/)).toBeVisible();await expect(drawer.getByRole("article")).toHaveCount(0);
  await page.keyboard.press("Escape");await expect(drawer).not.toBeVisible();await expect(launch).toBeFocused();
});

test("voice transcript is editable and is never sent without customer submission",async({page})=>{
  const requests:any[]=[];await mock(page,requests);
  await page.addInitScript(()=>{class Voice {lang="";continuous=false;interimResults=false;onresult:any;onend:any;onerror:any;start(){this.onresult?.({results:[[{transcript:"১৫০০ টাকার জুতা"}]]});this.onend?.();}abort(){this.onend?.();}}Object.defineProperty(window,"SpeechRecognition",{value:Voice,configurable:true});});
  await page.goto("/shops/shoe-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  const drawer=page.getByRole("dialog");await drawer.getByRole("button",{name:"বাংলায় বলুন"}).click();
  await expect(drawer.getByLabel("আপনার বার্তা")).toHaveValue("১৫০০ টাকার জুতা");expect(requests).toHaveLength(0);
  await drawer.getByLabel("আপনার বার্তা").fill("সংশোধিত জুতা");await drawer.getByRole("button",{name:"বার্তা পাঠান",exact:true}).click();
  await expect.poll(()=>requests.length).toBe(1);expect(requests[0].message).toBe("সংশোধিত জুতা");
});


test("assistant is absent outside shops",async({page})=>{
  const requests:any[]=[];await mock(page,requests);
  await page.goto("/products");
  await expect(page.getByRole("button",{name:"AI সহকারী",exact:true})).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("button",{name:"AI সহকারী",exact:true})).toHaveCount(0);
});

test("minimal empty state fits mobile and desktop and suggestions do not spend a message",async({page})=>{
  const requests:any[]=[];await mock(page,requests);await page.goto("/shops/shoe-shop");
  await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  const drawer=page.getByRole("dialog");
  for(const width of [375,1280]) {
    await page.setViewportSize({width,height:900});
    await expect(drawer.getByRole("heading",{name:"কী খুঁজছেন?"})).toBeVisible();
    await expect(drawer.getByLabel("আপনার বার্তা")).toBeVisible();
    expect(await drawer.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
    await page.screenshot({path:`../artifacts/assistant-clean-${width}.png`});
  }
  await drawer.getByRole("button",{name:"Shoes দেখাও",exact:true}).click();
  await expect(drawer.getByLabel("আপনার বার্তা")).toHaveValue("Shoes দেখাও");
  await expect(drawer.getByLabel("আপনার বার্তা")).toBeFocused();
  expect(requests).toHaveLength(0);
});


test("changing shops clears conversation and product context",async({page})=>{
  const requests:any[]=[];await mock(page,requests);
  const second={...shop,id:"33333333-3333-4333-8333-333333333333",slug:"second-shop",name:"Second shop"};
  await page.route("**/api/catalog",route=>route.fulfill({json:{shops:[shop,second],products:[product],synced_at:new Date().toISOString()}}));
  await page.goto("/shops/shoe-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  await page.getByLabel("আপনার বার্তা").fill("সাদা জুতা");await page.getByRole("dialog").getByRole("button",{name:"বার্তা পাঠান",exact:true}).click();
  await expect.poll(()=>requests.length).toBe(1);
  await page.goto("/shops/second-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  await expect(page.getByRole("dialog").getByText("সাদা জুতা",{exact:true})).toHaveCount(0);
  await page.getByLabel("আপনার বার্তা").fill("গিফট চাই");await page.getByRole("dialog").getByRole("button",{name:"বার্তা পাঠান",exact:true}).click();
  await expect.poll(()=>requests.length).toBe(2);expect(requests[1].shop_id).toBe(second.id);expect(requests[1].previous_queries).toEqual([]);
  await expect(page.getByRole("dialog").getByRole("article")).toHaveCount(0);
});


test("chat sends with Enter, keeps Shift+Enter, and never renders raw knowledge cards",async({page})=>{
  const requests:any[]=[];await mock(page,requests,"policy");
  await page.route("**/api/assistant",route=>{
    requests.push(route.request().postDataJSON());
    return route.fulfill({json:{state:"policy",matches:[],reply:"হ্যাঁ, ক্যাশ অন ডেলিভারি চালু আছে। চেকআউটে প্রযোজ্য চার্জ দেখাবে।",
      information:[{id:"policy:cod_enabled",label:"AriseSell · cod_enabled",content:"True"},{id:"policy:cod_policy",label:"cod_policy",content:"full_cod"}]}});
  });
  await page.goto("/shops/shoe-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  const drawer=page.getByRole("dialog"),input=drawer.getByLabel("আপনার বার্তা");
  await expect(drawer.getByRole("button",{name:/Search|খুঁজুন/})).toHaveCount(0);
  await expect(drawer.getByRole("button",{name:"বার্তা পাঠান",exact:true})).toBeDisabled();
  await input.fill("cash on delivery possible?");await input.press("Shift+Enter");
  expect(requests).toHaveLength(0);await input.press("Enter");
  await expect.poll(()=>requests.length).toBe(1);
  await expect(drawer.locator(".assistant-answer")).toContainText("ক্যাশ অন ডেলিভারি চালু আছে");
  await expect(drawer.getByText(/cod_enabled|full_cod|AriseSell ·|^True$/)).toHaveCount(0);
  await expect(drawer.locator("blockquote")).toHaveCount(0);
  await expect(drawer.getByRole("link",{name:"বিক্রেতার সঙ্গে কথা বলুন"})).toHaveAttribute("href","/shops/shoe-shop/info/contact");
  await expect(input).toBeFocused();
  for(const width of [320,375,1280]) {
    await page.setViewportSize({width,height:900});
    expect(await drawer.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
    await expect(drawer.getByRole("button",{name:"বার্তা পাঠান",exact:true})).toBeVisible();
    await page.screenshot({path:`../artifacts/assistant-conversation-${width}.png`});
  }
});


test("old policy responses do not expose internal fields before the source deployment",async({page})=>{
  const requests:any[]=[];await mock(page,requests,"policy");
  await page.route("**/api/assistant",route=>{
    requests.push(route.request().postDataJSON());
    return route.fulfill({json:{state:"policy",contract:"marketplace-chat-v2",matches:[],information:[{id:"x",label:"cod_enabled",content:"True"}]}});
  });
  await page.goto("/shops/shoe-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  const drawer=page.getByRole("dialog");await drawer.getByLabel("আপনার বার্তা").fill("cod ache?");await drawer.getByRole("button",{name:"বার্তা পাঠান",exact:true}).click();
  await expect(drawer.locator(".assistant-answer")).toContainText("নিশ্চিত তথ্য পাচ্ছি না");
  await expect(drawer.getByText(/cod_enabled|^True$/)).toHaveCount(0);
  await drawer.getByLabel("আপনার বার্তা").fill("আরও বলুন");await drawer.getByLabel("আপনার বার্তা").press("Enter");
  await expect.poll(()=>requests.length).toBe(2);
  for(const request of requests)expect(request).not.toHaveProperty("context_product_ids");
});


test("chat carries shown products into followups and replaces context on a product switch",async({page})=>{
  const requests:any[]=[];await mock(page,requests);
  const polo={...product,id:"44444444-4444-4444-8444-444444444444",name:"Classic Polo",variants:[{id:"polo-l",name:"Blue L",price:"790",stock:4}]};
  await page.route("**/api/catalog",route=>route.fulfill({json:{shops:[shop],products:[product,polo],synced_at:new Date().toISOString()}}));
  await page.route("**/api/assistant",route=>{
    const body=route.request().postDataJSON();requests.push(body);
    const chosen=body.message.includes("polo")||body.context_product_ids?.includes(polo.id)?polo:product;
    return route.fulfill({json:{state:"results",contract:"marketplace-chat-v3",reply:"পণ্যের তথ্য নিচে দেখুন।",matches:[{product_id:chosen.id,variant_ids:[chosen.variants[0].id],product:chosen}]}});
  });
  await page.goto("/shops/shoe-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  const drawer=page.getByRole("dialog"),input=drawer.getByLabel("আপনার বার্তা");
  await input.fill("no love aca?");await input.press("Enter");
  await expect(drawer.getByRole("article")).toHaveCount(1);
  expect(requests[0]).not.toHaveProperty("context_product_ids");
  await drawer.getByRole("button",{name:"এই পণ্য নিয়ে কথা বলুন"}).click();
  await input.fill("M size?");await input.press("Enter");
  await expect(drawer.getByRole("article")).toHaveCount(2);
  expect(requests[1].context_product_ids).toEqual([product.id]);
  await input.fill("instead show polo");await input.press("Enter");
  await expect(drawer.getByRole("article")).toHaveCount(3);
  await expect(drawer.locator(".assistant-context")).toHaveCount(0);
  await input.fill("L size?");await input.press("Enter");
  await expect(drawer.getByRole("article")).toHaveCount(4);
  expect(requests[3].context_product_ids).toEqual([polo.id]);
  expect(requests[3]).not.toHaveProperty("selected_product_id");
});


test("known sold-out products show source details without a checkout action",async({page})=>{
  const requests:any[]=[];await mock(page,requests);
  await page.route("**/api/assistant",route=>route.fulfill({json:{state:"out_of_stock",contract:"marketplace-chat-v3",reply:"পণ্যটি আছে, তবে এখন স্টকে নেই।",matches:[{product_id:product.id,variant_ids:["white42"],product:{...product,size_chart:"Size M: chest 40 inches",variants:[{...product.variants[0],stock:0}]}}]}}));
  await page.goto("/shops/shoe-shop");await page.getByRole("button",{name:"AI সহকারী",exact:true}).click();
  const drawer=page.getByRole("dialog");await drawer.getByLabel("আপনার বার্তা").fill("এই পণ্য আছে?");await drawer.getByLabel("আপনার বার্তা").press("Enter");
  await expect(drawer.getByRole("article")).toContainText(product.name);
  await expect(drawer.getByRole("article")).toContainText(product.description);
  await expect(drawer.getByRole("article")).toContainText("এই অপশন এখন স্টকে নেই");
  await drawer.getByText("পণ্যের বিস্তারিত",{exact:true}).click();
  await expect(drawer.getByText("Size M: chest 40 inches",{exact:true})).toBeVisible();
  await expect(drawer.getByRole("link",{name:"চেকআউট",exact:true})).toHaveCount(0);
});
