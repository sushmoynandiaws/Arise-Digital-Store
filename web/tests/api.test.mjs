import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function client(fetch=async()=>({ok:true,json:async()=>({ok:true})})){
  const exports={};
  const code=ts.transpileModule(fs.readFileSync("src/api.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,fetch,Intl,Number});return exports;
}
test("prices retain currency and decimals; availability comes from all actual variants",()=>{
  const helpers=client();assert.match(helpers.money("1290.50"),/1,290\.50/);assert.match(helpers.money("0.01"),/0\.01/);
  assert.equal(helpers.stock({variants:[{stock:2},{stock:0},{stock:7}]}),9);
  assert.equal(helpers.minimumPrice({variants:[{price:"500.00"},{price:"99.50"}]}),"99.50");
});
test("customer status copy does not expose internal enum names or claim unverified payment is paid",()=>{
  const helpers=client();assert.equal(helpers.paymentLabel("pending_verification"),"Checking payment");
  assert.equal(helpers.paymentLabel("future_unknown_state"),"Checking payment");
  assert.equal(helpers.deliveryLabel("awaiting_manual"),"Seller is preparing your order");
  assert.equal(helpers.paymentLabel("refunded"),"Refunded");
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
