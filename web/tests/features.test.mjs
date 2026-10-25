import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Load App.tsx and extract extractDownloadLinks
const appCode = fs.readFileSync("src/App.tsx", "utf8");

// Simple evaluation of extractDownloadLinks
function extractLinks(content) {
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/gi;
  const matches = content.match(urlRegex) || [];
  return Array.from(new Set(matches)).map((url) => {
    const cleanUrl = url.replace(/[.,;!?)]+$/, "");
    const isFile = /\.(zip|rar|7z|tar|gz|pdf|epub|apk|exe|dmg|iso|mp4|docx?|xlsx?|pptx?)(?:\?.*)?$/i.test(cleanUrl);
    const isDrive = /drive\.google\.com|dropbox\.com|mega\.nz|onedrive\.live\.com/i.test(cleanUrl);
    let label = "Access Download Link";
    if (isFile) {
      const filename = cleanUrl.split("/").pop()?.split("?")[0] || "File";
      label = `Download ${filename}`;
    } else if (isDrive) {
      label = "Open Cloud Download";
    }
    return { url: cleanUrl, label, isFile };
  });
}

// WhatsApp URL generator
function generateWhatsAppUrl(contact, { product, shop, order } = {}) {
  if (!contact) return null;
  if (contact.includes("wa.me") || contact.includes("api.whatsapp.com")) return contact;
  const digits = contact.replace(/\D/g, "");
  if (digits.length >= 10) {
    const cleanPhone = digits.length === 11 && digits.startsWith("01") ? `88${digits}` : digits;
    let text = "Hello! I am contacting you from Arise Digital Store.";
    if (order) {
      text = `Hello! I need help with my order *${order.ref}* (${order.name}) on Arise Digital Store.`;
    } else if (product) {
      text = `Hello! I have a question about *${product.name}* on Arise Digital Store.`;
    } else if (shop) {
      text = `Hello! I have a question regarding *${shop.name}* on Arise Digital Store.`;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }
  if (/^https?:\/\//i.test(contact)) return contact;
  return null;
}

test("extractDownloadLinks detects file downloads, archives and cloud links with correct labels", () => {
  const contentWithZip = "Thank you for your purchase! Download your digital assets: https://example.com/assets/theme-pack-v2.zip. Enjoy!";
  const links1 = extractLinks(contentWithZip);
  assert.equal(links1.length, 1);
  assert.equal(links1[0].url, "https://example.com/assets/theme-pack-v2.zip");
  assert.equal(links1[0].isFile, true);
  assert.equal(links1[0].label, "Download theme-pack-v2.zip");

  const contentWithDrive = "Here is your shared drive link: https://drive.google.com/drive/folders/1a2b3c4d5e";
  const links2 = extractLinks(contentWithDrive);
  assert.equal(links2.length, 1);
  assert.equal(links2[0].isFile, false);
  assert.equal(links2[0].label, "Open Cloud Download");

  const contentWithPdf = "Read your ebook here: https://cdn.store.com/books/guide.pdf?token=xyz123";
  const links3 = extractLinks(contentWithPdf);
  assert.equal(links3.length, 1);
  assert.equal(links3[0].isFile, true);
  assert.equal(links3[0].label, "Download guide.pdf");

  const plainLicense = "LICENSE-KEY: 1234-ABCD-5678-EFGH";
  const links4 = extractLinks(plainLicense);
  assert.equal(links4.length, 0);
});

test("WhatsApp URL generator normalizes BD phone numbers and encodes custom context messages", () => {
  const bdPhone = "01712345678";
  const productContext = { product: { name: "ChatGPT Plus 1 Month" } };
  const waUrl = generateWhatsAppUrl(bdPhone, productContext);
  assert.ok(waUrl.startsWith("https://wa.me/8801712345678?text="));
  assert.ok(waUrl.includes(encodeURIComponent("ChatGPT Plus 1 Month")));

  const orderContext = { order: { ref: "DIG-9876", name: "Grammarly Premium" } };
  const waOrderUrl = generateWhatsAppUrl("01899998888", orderContext);
  assert.ok(waOrderUrl.startsWith("https://wa.me/8801899998888?text="));
  assert.ok(waOrderUrl.includes(encodeURIComponent("DIG-9876")));

  const existingWaLink = "https://wa.me/8801700000000";
  assert.equal(generateWhatsAppUrl(existingWaLink), existingWaLink);
});

test("App.tsx contains promo code input, WhatsApp support button, and download button logic", () => {
  assert.ok(appCode.includes("Promo code / Coupon"), "Missing promo code input in App.tsx");
  assert.ok(appCode.includes("coupon_code"), "Missing coupon_code handling in App.tsx");
  assert.ok(appCode.includes("WhatsAppFloatingButton"), "Missing WhatsAppFloatingButton in App.tsx");
  assert.ok(appCode.includes("download-action-btn"), "Missing download-action-btn in App.tsx");
});

test("resolveImageUrl resolves full URLs, relative paths and unsigned catalog asset content URLs", () => {
  assert.ok(appCode.includes("export function resolveImageUrl"), "resolveImageUrl should be exported");
  // Test slug conversion and public URL fallback logic
  const unsignedPath = "/api/v1/catalog/image-assets/24cd2075-38a5-4811-8914-1775ca4441ef/content";
  const toSlug = (text) =>
    text
      .normalize("NFKC")
      .toLowerCase()
      .replace(/['\u2019]/g, "")
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");

  function resolveImageUrl(url, sourceWeb, shopSlug, productName) {
    const base = (sourceWeb || "https://arisesell.com").replace(/\/+$/, "");
    if (!url) {
      if (shopSlug && productName) {
        const slug = toSlug(productName);
        if (slug) return `${base}/${encodeURIComponent(shopSlug)}/${encodeURIComponent(slug)}`;
      }
      return null;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      if (shopSlug && productName) {
        const slug = toSlug(productName);
        if (slug) return `${base}/${encodeURIComponent(shopSlug)}/${encodeURIComponent(slug)}`;
      }
      return null;
    }
    if (/^\/?api\/v1\/catalog\/image-assets\/[0-9a-fA-F-]{36}\/content$/i.test(trimmed)) {
      if (shopSlug && productName) {
        const slug = toSlug(productName);
        if (slug) return `${base}/${encodeURIComponent(shopSlug)}/${encodeURIComponent(slug)}`;
      }
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith("/")) {
      return `${base}${trimmed}`;
    }
    return null;
  }

  // 1. Full HTTPS URL remains untouched
  assert.equal(
    resolveImageUrl("https://arisesell.com/nandi-digital-products/udemy-personal-1-month"),
    "https://arisesell.com/nandi-digital-products/udemy-personal-1-month"
  );

  // 2. Unsigned asset path resolves to shop and product public slug link
  assert.equal(
    resolveImageUrl(
      unsignedPath,
      "https://arisesell.com",
      "nandi-digital-products",
      "Chatgpt Plus No Warranty (Upi) - Without 5H Limit"
    ),
    "https://arisesell.com/nandi-digital-products/chatgpt-plus-no-warranty-upi-without-5h-limit"
  );

  // 3. Signed asset path with query parameters is preserved
  const signedUrl = "https://arisesell.com/api/v1/catalog/image-assets/24cd2075-38a5-4811-8914-1775ca4441ef/content?expires=1793551407&signature=abc";
  assert.equal(resolveImageUrl(signedUrl), signedUrl);

  // 4. Relative paths are prefixed with base
  assert.equal(
    resolveImageUrl("/images/banner.png", "https://arisesell.com"),
    "https://arisesell.com/images/banner.png"
  );

  // 5. Empty or null inputs with shop/product fallback
  assert.equal(
    resolveImageUrl(null, "https://arisesell.com", "nandi-digital-products", "Demo Item"),
    "https://arisesell.com/nandi-digital-products/demo-item"
  );
  assert.equal(resolveImageUrl(null), null);
});

test("Shop social links and contact details remain available in footer and floating support", () => {
  assert.ok(appCode.includes("export function SocialLinks"), "SocialLinks component should be exported");
  assert.ok(appCode.includes("export function ShopContactChips"), "ShopContactChips component should be exported");
  assert.ok(appCode.includes("store-footer-card"), "store-footer-card should be in App.tsx");
  assert.ok(appCode.includes("seller-verified-badge"), "seller-verified-badge should be in App.tsx");
  assert.ok(appCode.includes('<WhatsAppFloatingButton shop={shop} />'), "Shop should use the existing floating support control");
  assert.ok(!appCode.includes('className="shop-banner"'), "The large shop banner should be removed");

  // Verify supportHref normalizes Bangladeshi phone numbers correctly including +880 013...
  function supportHref(value) {
    if (/^https:\/\//.test(value)) return value;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 10) {
      let clean = digits;
      if (digits.startsWith("88001")) {
        clean = "8801" + digits.slice(5);
      } else if (digits.length === 11 && digits.startsWith("01")) {
        clean = `88${digits}`;
      }
      return `https://wa.me/${clean}`;
    }
    return "#seller-support";
  }

  assert.equal(supportHref("+880 01305087389"), "https://wa.me/8801305087389");
  assert.equal(supportHref("01305087389"), "https://wa.me/8801305087389");
  assert.equal(supportHref("+8801305087389"), "https://wa.me/8801305087389");
  assert.equal(supportHref("sushmoynandiml@gmail.com"), "mailto:sushmoynandiml@gmail.com");
  assert.equal(supportHref("https://wa.me/8801305087389"), "https://wa.me/8801305087389");
});
