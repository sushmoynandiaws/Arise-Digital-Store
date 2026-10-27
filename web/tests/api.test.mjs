import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function client(fetch=async()=>({ok:true,json:async()=>({ok:true})}), clock=Date){
  const exports={};
  const code=ts.transpileModule(fs.readFileSync("src/api.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,fetch,Intl,Number,Date:clock});return exports;
}

test("courier labels preserve source pickup and delivery stages",()=>{
  const {deliveryLabel}=client();
  assert.equal(deliveryLabel("pickup_pending"),"Awaiting pickup");
  assert.equal(deliveryLabel("out_for_delivery"),"Out for delivery");
  assert.equal(deliveryLabel("out_for_delivery","bn"),"ডেলিভারি দিতে যাচ্ছে");
  assert.equal(deliveryLabel("unrecognized_provider_state"),"Status unavailable");
});

test("partial paid digital delivery shows an accurate count without overriding refund or cancellation",()=>{
  const {purchaseMessage}=client();
  const order={fulfilment_kind:"digital",payment_status:"paid",delivery_status:"partially_sent",ready:true,ready_quantity:1,quantity:2};
  assert.equal(purchaseMessage(order).title,"Some of your items are ready");
  assert.match(purchaseMessage(order).description,/1 of 2/);
  assert.equal(purchaseMessage({...order,payment_status:"refunded"}).title,"Payment refunded");
  assert.equal(purchaseMessage({...order,delivery_status:"cancelled"}).title,"Order cancelled");
});

test("checkout follows product fulfillment and source capability without treating unknown items as digital",()=>{
  const {productFulfilment,productPayments,canCheckout,shopType}=client();
  const shop={kind:"Fashion & Clothing",commerce_mode:"standard",payment_methods:["cod"]};
  const physical={fulfilment_kind:"physical",delivery_mode:"shipping",payment_methods:["cod"],sales_enabled:true,checkout_available:true};
  assert.equal(productFulfilment(physical),"physical");
  assert.equal(canCheckout(physical,shop),true);
  assert.equal(canCheckout({...physical,checkout_available:false},shop),false);
  assert.equal(canCheckout({...physical,payment_methods:[]},shop),false);
  assert.equal(productFulfilment({delivery_mode:"automatic"}),"digital");
  assert.equal(productFulfilment({delivery_mode:"unrecognized"}),"unknown");
  assert.equal(productFulfilment({fulfilment_kind:"service",delivery_mode:"automatic"}),"unknown");
  assert.equal(canCheckout({delivery_mode:"unrecognized",sales_enabled:true},shop),false);
  assert.equal(productPayments({...physical,payment_methods:undefined},shop).length,1);
  assert.equal(productPayments({...physical,payment_methods:undefined},{payment_methods:[]}).length,0);
  assert.deepEqual([...productPayments({...physical,payment_methods:["bkash"]},{...shop,payment_methods:["cod","bkash"]})],["bkash"]);
  assert.equal(shopType(shop),"Fashion & Clothing");
  assert.equal(shopType({}),"Shop");
});

test("physical order status never offers digital access or treats COD delivery as verified payment",()=>{
  const {purchaseMessage,paymentMethodLabel}=client();
  const order={fulfilment_kind:"physical",payment_method:"cod",payment_status:"unpaid",delivery_status:"confirmed",ready:false};
  assert.equal(purchaseMessage(order).title,"Order confirmed");
  assert.match(purchaseMessage({...order,delivery_status:"in_transit"}).title,/In transit/);
  const delivered=purchaseMessage({...order,delivery_status:"delivered"});
  assert.match(delivered.description,/settlement has not been confirmed/);
  assert.doesNotMatch(delivered.description,/digital|access/);
  assert.equal(purchaseMessage({...order,payment_status:"refunded"}).title,"Payment refunded");
  assert.equal(purchaseMessage({...order,delivery_status:"cancelled"}).title,"Order cancelled");
  assert.match(purchaseMessage({...order,delivery_status:"awaiting_advance"}).description,/required advance/);
  assert.equal(paymentMethodLabel("cod"),"Cash on delivery");
});
test("prices retain currency and decimals; availability comes from all actual variants",()=>{
  const helpers=client();assert.match(helpers.money("1290.50"),/1,290\.50/);assert.match(helpers.money("0.01"),/0\.01/);
  assert.equal(helpers.stock({variants:[{stock:2},{stock:0},{stock:7}]}),9);
  assert.equal(helpers.minimumPrice({variants:[{price:"500.00"},{price:"99.50"}]}),"99.50");
});
test("customer status copy does not expose internal enum names or claim unverified payment is paid",()=>{
  const helpers=client();assert.equal(helpers.paymentLabel("pending_verification"),"Checking payment");
  assert.equal(helpers.paymentLabel("future_unknown_state"),"Status unavailable");
  assert.equal(helpers.deliveryLabel("future_unknown_state"),"Status unavailable");
  assert.equal(helpers.deliveryLabel("awaiting_manual"),"Seller is preparing your order");
  assert.equal(helpers.paymentLabel("refunded"),"Refunded");
});

test("payment method names are consistent and unknown source names are preserved",()=>{
  const {paymentMethodLabel}=client();
  assert.equal(paymentMethodLabel("bkash"),"bKash");
  assert.equal(paymentMethodLabel("nagad"),"Nagad");
  assert.equal(paymentMethodLabel("rocket"),"Rocket");
  assert.equal(paymentMethodLabel("New source wallet"),"New source wallet");
});
test("checkout totals multiply exact minor units and reject incomplete or unsafe values",()=>{
  const {checkoutTotal}=client();
  assert.equal(checkoutTotal("10.00",6),"60.00");
  assert.equal(checkoutTotal("0.29",3),"0.87");
  assert.equal(checkoutTotal("1290.5",2),"2581.00");
  assert.equal(checkoutTotal("0",1),"0.00");
  assert.equal(checkoutTotal("11",100),"1100.00");
  for(const quantity of [0,-1,1.5,101,NaN,Infinity]) assert.equal(checkoutTotal("10.00",quantity),null);
  for(const price of ["", "NaN", "-1", "1.001", "1e2", "9007199254740991"]) assert.equal(checkoutTotal(price,1),null);
});
test("quantity carried from a product link is a bounded whole number",()=>{
  const {checkoutQuantity}=client();
  assert.equal(checkoutQuantity("6"),6);
  assert.equal(checkoutQuantity("100"),100);
  for(const value of [null,"","0","-1","1.5","101","oops","Infinity"]) assert.equal(checkoutQuantity(value),1);
});
test("API writes include same-origin credentials and the current CSRF token",async()=>{
  let captured;const helpers=client(async(url,options)=>{captured={url,options};return {ok:true,json:async()=>({ok:true})};});
  helpers.setCsrf("bound-to-browser");await helpers.api("/checkout/accept",{method:"POST",body:'{"accepted":true}'});
  assert.equal(captured.url,"/api/checkout/accept");assert.equal(captured.options.credentials,"same-origin");
  assert.equal(captured.options.headers["X-CSRF-Token"],"bound-to-browser");assert.equal(captured.options.method,"POST");
});
test("API errors preserve actionable messages and do not masquerade as successful results",async()=>{
  const helpers=client(async()=>({ok:false,json:async()=>({error:"Not enough stock; no payment invoice was created"})}));
  await assert.rejects(helpers.api("/checkout/accept",{method:"POST"}),/Not enough stock/);
});

test("purchase headings distinguish verified access, preparation, review, expiry and refunds",()=>{
  const {purchaseMessage}=client();
  const base={payment_status:"unpaid",delivery_status:"awaiting_payment",delivery_mode:"automatic",ready:false,payment:null};
  const expired={expires_at:"2000-01-01T00:00:00Z"};
  const future={expires_at:"2999-01-01T00:00:00Z"};
  for(const [changes,title] of [
    [{},"Complete your payment"],
    [{payment_status:"pending_verification"},"Checking your payment"],
    [{payment_status:"review_required"},"Your payment needs review"],
    [{payment:expired},"Payment request expired"],
    [{payment_status:"pending_verification",payment:expired},"Payment request expired"],
    [{payment:future},"Complete your payment"],
    [{payment_status:"paid",payment:expired,ready:true,delivery_status:"delivered"},"Your order is ready"],
    [{payment_status:"paid",delivery_mode:"manual"},"Your order is being prepared"],
    [{payment_status:"paid",delivery_status:"queued"},"Preparing your digital items"],
    [{payment_status:"paid",delivery_status:"needs_attention"},"Your delivery needs attention"],
    [{payment_status:"refunded",delivery_status:"cancelled",ready:true},"Payment refunded"],
    [{payment_status:"partially_refunded",ready:true},"Payment partially refunded"],
    [{payment_status:"paid",delivery_status:"cancelled",ready:true},"Order cancelled"],
    [{payment_status:"unknown",ready:true},"Payment status unavailable"],
  ]) assert.equal(purchaseMessage({...base,...changes}).title,title);
  assert.match(purchaseMessage({...base,payment_status:"pending_verification"}).description,/not been verified/);
  assert.doesNotMatch(purchaseMessage({...base,payment_status:"paid",delivery_mode:"manual"}).description,/ready/);
});

test("connection failures and unreadable responses explain how to check the result safely",async()=>{
  await assert.rejects(client(async()=>{throw new TypeError("Failed to fetch");}).api("/checkout/accept"),/refresh this page to check the result/);
  await assert.rejects(client(async()=>({ok:false,json:async()=>{throw new Error("invalid JSON");}})).api("/checkout/accept"),/check the result before trying again/);
});

test("payment expires exactly at its deadline without overriding verified or refunded states",()=>{
  class Clock extends Date { static now() { return Date.parse("2026-10-26T12:00:00Z"); } }
  const {purchaseMessage}=client(undefined,Clock);
  const order={payment_status:"unpaid",delivery_status:"awaiting_payment",ready:false,payment:{expires_at:"2026-10-26T12:00:00Z"}};
  assert.equal(purchaseMessage(order).title,"Payment request expired");
  assert.equal(purchaseMessage({...order,payment_status:"paid",ready:true}).title,"Your order is ready");
  assert.equal(purchaseMessage({...order,payment_status:"refunded"}).title,"Payment refunded");
});

test("bilingual payment status and purchase headings render correctly in Bangla and English", () => {
  const { paymentLabel, deliveryLabel, purchaseMessage } = client();
  assert.equal(paymentLabel("paid", "bn"), "পেমেন্ট সম্পন্ন");
  assert.equal(paymentLabel("unpaid", "bn"), "পেমেন্টের অপেক্ষায়");
  assert.equal(paymentLabel("pending_verification", "bn"), "পেমেন্ট যাচাই হচ্ছে");
  assert.equal(deliveryLabel("delivered", "bn"), "ডেলিভারি সম্পন্ন");
  assert.equal(deliveryLabel("awaiting_manual", "bn"), "সেলার অর্ডার প্রস্তুত করছেন");
  assert.equal(deliveryLabel("sent", "bn"), "ব্যবহারের জন্য প্রস্তুত");

  const order = { payment_status: "unpaid", delivery_status: "awaiting_payment", ready: false, payment: null };
  const bnMsg = purchaseMessage(order, "bn");
  assert.equal(bnMsg.title, "পেমেন্ট সম্পন্ন করুন");
  assert.match(bnMsg.description, /নির্দেশনা অনুযায়ী পেমেন্ট করুন/);

  const readyOrder = { ...order, payment_status: "paid", ready: true };
  assert.equal(purchaseMessage(readyOrder, "bn").title, "আপনার অর্ডার প্রস্তুত");
  assert.equal(purchaseMessage(readyOrder, "en").title, "Your order is ready");
});
