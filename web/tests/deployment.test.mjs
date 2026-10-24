import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const config=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url),'utf8'));
test('services route API, callback and health to Rust; storefront and assets to Vite',()=>{
  const target=path=>config.rewrites.find(rule=>new RegExp(`^${rule.source}$`).test(path))?.destination;
  for(const path of ['/api','/api/catalog','/api/auth/callback','/api/orders/id/reveal','/health'])assert.deepEqual(target(path),{service:'app',path:'/api/app'});
  for(const path of ['/','/shops/studio-north','/products/id','/purchases/id','/assets/app.js'])assert.deepEqual(target(path),{service:'web'});
  assert.equal(config.rewrites.at(-1).source,'/(.*)');
});
test('runtime/build settings belong to services and entrypoints exist',()=>{
  for(const key of ['framework','runtime','functions','installCommand','buildCommand','devCommand','ignoreCommand','outputDirectory'])assert.equal(config[key],undefined);
  assert.equal(config.services.app.runtime,'rust');
  assert.equal(config.services.app.rewrites,undefined);
  assert.ok(existsSync(new URL(`../../${config.services.app.entrypoint}`,import.meta.url)));
  assert.equal(config.services.web.root,'web');assert.equal(config.services.web.outputDirectory,'dist');
  assert.equal(config.services.web.rewrites,undefined);
  assert.deepEqual(config.services.web.routes,[{handle:'filesystem'},{src:'/:path((?!@vite/|@id/|@fs/|src/|node_modules/|assets/).*)',dest:'/index.html'}]);
});
test('a static browser client uses public same-origin API, not runtime-only service bindings',()=>{
  const client=readFileSync(new URL('../src/api.ts',import.meta.url),'utf8');
  assert.ok(client.includes('fetch(`/api${path}`'));
  for(const service of Object.values(config.services))assert.equal(service.bindings,undefined);
});
