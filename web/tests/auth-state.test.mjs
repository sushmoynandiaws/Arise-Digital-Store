import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual App session functions with deferred dummy API responses; no React/browser simulation.
function sessionClient(api) {
  const source = ts.createSourceFile("App.tsx", fs.readFileSync("src/App.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const app = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "App");
  const functions = ["refreshSession", "signOut"].map(name => {
    const node = app.body.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(source) === name));
    assert.ok(node, `Missing App function: ${name}`);
    return node.getText(source);
  }).join("\n");
  const state = { session: { user: { id: "dummy-A" }, csrf: "old-buyer" }, csrf: "old-buyer", error: "" };
  const exports = {};
  const code = ts.transpileModule(`let boot; ${functions}\nexports.refreshSession = refreshSession; exports.signOut = signOut;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, api, sessionRevision: { current: 0 },
    setSession: value => { state.session = value; }, setCsrf: value => { state.csrf = value; },
    setSessionError: value => { state.error = value; } });
  return { ...exports, state };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("successful logout clears identity before a failed session refresh", async () => {
  const refresh = deferred(), started = deferred();
  const app = sessionClient(async path => {
    if (path === "/auth/logout") return { ok: true };
    assert.equal(path, "/session");
    started.resolve();
    return refresh.promise;
  });
  const logout = app.signOut();
  await started.promise;
  assert.equal(app.state.session, null);
  assert.equal(app.state.csrf, "");
  refresh.reject(new Error("Dummy session refresh unavailable"));
  await logout;
  assert.equal(app.state.session, null);
  assert.equal(app.state.error, "Dummy session refresh unavailable");
});

for (const failure of [false, true]) test(`a pre-logout session ${failure ? "failure" : "response"} cannot restore old authorization`, async () => {
  const old = deferred();
  let reads = 0;
  const app = sessionClient(async path => {
    if (path === "/auth/logout") return { ok: true };
    if (++reads === 1) return old.promise;
    return { user: null, csrf: "rotated-dummy-buyer", demo: false };
  });
  const stale = app.refreshSession();
  await app.signOut();
  if (failure) old.reject(new Error("Stale dummy error"));
  else old.resolve({ user: { id: "dummy-A" }, csrf: "old-buyer", demo: false });
  await stale;
  assert.equal(app.state.session.user, null);
  assert.equal(app.state.csrf, "rotated-dummy-buyer");
  assert.equal(app.state.error, "");
});
