import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

test('the existing fonts load from local licensed WOFF2 assets without a remote stylesheet', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('public/fonts/fonts.css', 'utf8');
  const sources = JSON.parse(fs.readFileSync('public/fonts/sources.json', 'utf8'));
  assert.match(html, /href="\/fonts\/fonts.css"/);
  assert.doesNotMatch(html + css, /https?:\/\/fonts\.(?:googleapis|gstatic)\.com/);
  for (const family of ['Urbanist', 'Hind Siliguri', 'JetBrains Mono']) assert.ok(css.includes(`font-family: '${family}'`));
  assert.match(css, /font-display: swap/);
  for (const font of sources) {
    const bytes = fs.readFileSync(`public/fonts/${font.file}`);
    assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), font.sha256);
    assert.ok(css.includes(font.file));
  }
  for (const family of ['urbanist', 'hindsiliguri', 'jetbrainsmono']) assert.match(fs.readFileSync(`public/fonts/${family}-OFL.txt`, 'utf8'), /SIL OPEN FONT LICENSE/);
});
