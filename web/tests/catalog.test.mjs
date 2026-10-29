import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function read(element) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync("src/catalog.ts", "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code, {exports, document: {getElementById: id => {assert.equal(id, "arise-catalog"); return element;}}});
  return exports.readInitialCatalog();
}
const block = textContent => ({textContent, getAttribute: name => name === "type" ? "application/json" : null});
test("server public catalog is available before the first API read", () => {
  const catalog = {shops: [{id: "dummy-shop"}], products: [{name: "<harmless>"}], synced_at: "fixture"};
  assert.equal(JSON.stringify(read(block(JSON.stringify(catalog)))), JSON.stringify(catalog));
});
test("missing, malformed or non-JSON bootstrap falls back to normal catalog loading", () => {
  for (const element of [null, block("{"), block("null"), block("{}"), block('{"shops":[],"products":{}}'), {textContent: "{}", getAttribute: () => "text/javascript"}]) assert.equal(read(element), null);
  assert.equal(JSON.stringify(read(block('{"shops":[],"products":[]}'))), '{"shops":[],"products":[]}');
});
