import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../src/product.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,encodeURIComponent});
const {productPath,productSlug,productForRoute,productSection,productSections}=exports;
const p={id:'34a419e0-8596-4910-ac03-7cb9ba04773f',shop_id:'a',name:'ChatGPT Plus No Warranty (UPI)'};
const shop={id:'a',slug:'nandi-digital-products'};
const catalog={shops:[shop,{id:'b',slug:'another-shop'}],products:[p]};

test('product information defaults to overview and preserves existing section links',()=>{
  assert.equal(productSection(''),'overview');
  assert.equal(productSection('#unrecognized'),'overview');
  assert.equal(productSection('#product-delivery-extra'),'overview');
  for(const section of productSections)assert.equal(productSection(`#product-${section.id}`),section.id);
});

test('product URLs show shop and product names while legacy IDs still resolve',()=>{
  assert.equal(productPath(p,catalog),'/shops/nandi-digital-products/products/chatgpt-plus-no-warranty-upi');
  assert.equal(productForRoute(catalog,{id:p.id}),p);
  assert.equal(productForRoute(catalog,{slug:shop.slug,productSlug:'chatgpt-plus-no-warranty-upi'}),p);
  const renamed={...p,name:'ChatGPT Plus Monthly'};
  assert.equal(productForRoute({...catalog,products:[renamed]},{id:p.id}),renamed);
  assert.match(productPath(renamed,catalog),/chatgpt-plus-monthly$/);
});
test('same names in different shops cannot resolve to the wrong seller',()=>{
  const other={...p,id:'other',shop_id:'b'};
  const c={...catalog,products:[p,other]};
  assert.equal(productPath(other,c),'/shops/another-shop/products/chatgpt-plus-no-warranty-upi');
  assert.equal(productForRoute(c,{slug:'another-shop',productSlug:'chatgpt-plus-no-warranty-upi'}),other);
  assert.equal(productForRoute(c,{slug:'missing',productSlug:'chatgpt-plus-no-warranty-upi'}),undefined);
  assert.equal(productForRoute(c,{id:'unknown'}),undefined);
});
test('duplicate normalized titles in one shop have unique, deterministic links',()=>{
  const duplicate={...p,id:'second',name:'ChatGPT Plus No Warranty UPI'};
  const c={...catalog,products:[p,duplicate]};
  assert.notEqual(productPath(p,c),productPath(duplicate,c));
  for(const product of c.products)assert.equal(productForRoute(c,{slug:shop.slug,productSlug:productSlug(product,c.products)}),product);
});
test('Bangla names preserve vowel marks and URL characters are safely encoded',()=>{
  const bangla={...p,name:'বাংলা কোর্স / ১ মাস'};
  const c={...catalog,products:[bangla]};
  assert.equal(productSlug(bangla,c.products),'বাংলা-কোর্স-১-মাস');
  assert.equal(decodeURIComponent(productPath(bangla,c)).split('/').at(-1),'বাংলা-কোর্স-১-মাস');
  assert.equal(productSlug({...p,name:'!!!'},[p]),'digital-product');
});
