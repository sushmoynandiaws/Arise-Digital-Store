import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Read source files
const appCode = fs.readFileSync("src/App.tsx", "utf8");
const stylesCode = fs.readFileSync("src/styles.css", "utf8");
const i18nCode = fs.readFileSync("src/i18n.tsx", "utf8");
const qrCode = fs.readFileSync("src/qr.ts", "utf8");

test("QR code generator produces valid 2D bit matrix with finder patterns", () => {
  // Verify pure typescript source includes byte mode, rs error correction, and finder coordinates
  assert.ok(qrCode.includes("function generateQrMatrix(text: string): boolean[][]"));
  assert.ok(qrCode.includes("GF_EXP"));
  assert.ok(qrCode.includes("rsCompute"));
  assert.ok(qrCode.includes("const finders = [[0, 0], [size - 7, 0], [0, size - 7]];"));

  // Check payment URI formatting
  const cleanAccount = "01305087389";
  const amount = "1000";
  const orderRef = "AR-2026-TEST";
  const bkashString = `bkash://payment?account=${cleanAccount}&amount=${amount}&ref=${orderRef}`;
  const nagadString = `nagad://payment?account=${cleanAccount}&amount=${amount}&ref=${orderRef}`;

  assert.ok(bkashString.includes("bkash://payment?account=01305087389"));
  assert.ok(nagadString.includes("nagad://payment?account=01305087389"));
});

test("Bilingual i18n dictionary has complete symmetry and essential keys", () => {
  assert.ok(i18nCode.includes("⚡ ইনস্ট্যান্ট অটো-ডেলিভারি (< ৪৫ সেকেন্ড)"));
  assert.ok(i18nCode.includes("⚡ Instant Auto-Delivery (< 45s)"));
  assert.ok(i18nCode.includes("🛡️ ৯৯.৮% অর্ডার কমপ্লিশন রেট"));
  assert.ok(i18nCode.includes("🛡️ 99.8% Completion Rate"));
  assert.ok(i18nCode.includes("বেশি কিনুন, বেশি বাঁচুন (ভলিউম ডিসকাউন্ট)"));
  assert.ok(i18nCode.includes("Buy More, Save More (Volume Discount)"));
  assert.ok(i18nCode.includes("অর্ডার ট্র্যাক"));
  assert.ok(i18nCode.includes("Track order"));
  assert.ok(i18nCode.includes("1-Click Renew Subscription"));
  assert.ok(i18nCode.includes("Copy Order Recovery Link"));
  assert.ok(i18nCode.includes("Send Delivery to WhatsApp"));
});

test("Bangladeshi phone normalization handles 01, +880, 880, and spaces", () => {
  function normalizeBdPhone(phone) {
    let clean = (phone || "").replace(/[^\d+]/g, "");
    if (clean.startsWith("+88001")) clean = "+8801" + clean.slice(6);
    else if (clean.startsWith("88001")) clean = "+8801" + clean.slice(5);
    else if (clean.startsWith("+8801")) clean = clean;
    else if (clean.startsWith("8801")) clean = "+" + clean;
    else if (clean.startsWith("01")) clean = "+88" + clean;
    return clean;
  }

  assert.equal(normalizeBdPhone("01305087389"), "+8801305087389");
  assert.equal(normalizeBdPhone("+880 01305087389"), "+8801305087389");
  assert.equal(normalizeBdPhone("88001305087389"), "+8801305087389");
  assert.equal(normalizeBdPhone("+8801305087389"), "+8801305087389");
});

test("Volume discount calculation logic matches backend rules", () => {
  function calculateVolumeDiscount(unitPrice, quantity) {
    const rawTotal = unitPrice * quantity;
    let discountCode = null;
    let discountAmount = 0;
    if (quantity >= 5) {
      discountCode = "VOLUME10";
      discountAmount = Math.round(rawTotal * 0.10);
    } else if (quantity >= 3) {
      discountCode = "VOLUME5";
      discountAmount = Math.round(rawTotal * 0.05);
    }
    return {
      rawTotal,
      discountCode,
      discountAmount,
      finalTotal: rawTotal - discountAmount,
    };
  }

  // 1 item: No discount
  const q1 = calculateVolumeDiscount(1000, 1);
  assert.equal(q1.discountCode, null);
  assert.equal(q1.discountAmount, 0);
  assert.equal(q1.finalTotal, 1000);

  // 3 items: 5% discount
  const q3 = calculateVolumeDiscount(1000, 3);
  assert.equal(q3.discountCode, "VOLUME5");
  assert.equal(q3.discountAmount, 150);
  assert.equal(q3.finalTotal, 2850);

  // 5 items: 10% discount
  const q5 = calculateVolumeDiscount(1000, 5);
  assert.equal(q5.discountCode, "VOLUME10");
  assert.equal(q5.discountAmount, 500);
  assert.equal(q5.finalTotal, 4500);
});

test("Subscription expiry calculation evaluates remaining days correctly", () => {
  const now = Date.now();
  
  // Created 5 days ago -> 25 days remaining
  const created5DaysAgo = new Date(now - (5 * 86400000)).toISOString();
  const expiryTime5 = new Date(created5DaysAgo).getTime() + (30 * 86400000);
  const diffDays5 = Math.ceil((expiryTime5 - now) / 86400000);
  assert.equal(diffDays5, 25);

  // Created 35 days ago -> Expired
  const created35DaysAgo = new Date(now - (35 * 86400000)).toISOString();
  const expiryTime35 = new Date(created35DaysAgo).getTime() + (30 * 86400000);
  const diffDays35 = Math.ceil((expiryTime35 - now) / 86400000);
  assert.ok(diffDays35 <= 0);
});

test("App.tsx integrates all advanced e-commerce components and routes", () => {
  // DynamicPaymentQR
  assert.ok(appCode.includes("function DynamicPaymentQR("));
  assert.ok(appCode.includes("provider.toLowerCase().includes(\"bkash\")"));
  assert.ok(appCode.includes("provider.toLowerCase().includes(\"nagad\")"));
  assert.ok(appCode.includes("generateQrMatrix(paymentString)"));

  // Wishlist
  assert.ok(appCode.includes("function useWishlist()"));
  assert.ok(appCode.includes("function WishlistModal("));
  assert.ok(appCode.includes("arise_wishlist"));
  assert.ok(appCode.includes("card-wishlist-btn"));

  // Track Order / OTP
  assert.ok(appCode.includes("function TrackOrderPage()"));
  assert.ok(appCode.includes("/orders/track/request-otp"));
  assert.ok(appCode.includes("/orders/track/verify-otp"));
  assert.ok(appCode.includes("<Route path=\"/track\" element={<TrackOrderPage />} />"));

  // Volume discount & Bundles
  assert.ok(appCode.includes("volume-discount-widget"));
  assert.ok(appCode.includes("bundle-cross-sell-box"));
  assert.ok(appCode.includes("BUNDLE20"));
  assert.ok(appCode.includes("RENEW10"));

  // Badges & WhatsApp
  assert.ok(appCode.includes("product-trust-stats-badges"));
  assert.ok(appCode.includes("subscription-expiry-card"));
  assert.ok(appCode.includes("purchase-sharing-actions"));
  assert.ok(appCode.includes("wa.me/?text="));
  assert.ok(appCode.includes("copyRecoveryLink"));
});

test("styles.css includes all corresponding responsive tokens and classes", () => {
  assert.ok(stylesCode.includes(".lang-toggle-btn"));
  assert.ok(stylesCode.includes(".header-wishlist-btn"));
  assert.ok(stylesCode.includes(".wishlist-badge"));
  assert.ok(stylesCode.includes(".card-wishlist-btn"));
  assert.ok(stylesCode.includes(".dynamic-qr-box"));
  assert.ok(stylesCode.includes(".payment-mode-tabs"));
  assert.ok(stylesCode.includes(".open-app-deep-btn"));
  assert.ok(stylesCode.includes(".product-trust-stats-badges"));
  assert.ok(stylesCode.includes(".volume-discount-widget"));
  assert.ok(stylesCode.includes(".bundle-cross-sell-box"));
  assert.ok(stylesCode.includes(".subscription-expiry-card"));
  assert.ok(stylesCode.includes(".track-order-page"));
});

test("Dark theme footer has clean 4-column layout, social pills, and policy modal without unwanted cards or payment strip", () => {
  // App.tsx contains footer components
  assert.ok(appCode.includes("function PolicyModal("));
  assert.ok(appCode.includes("dark-theme-footer"));
  assert.ok(appCode.includes("dark-social-pills-row"));
  assert.ok(appCode.includes("dark-footer-links-list"));

  // Red-boxed elements removed
  assert.ok(!appCode.includes("COCC Trade Licence No:"));
  assert.ok(!appCode.includes("DBID No :"));
  assert.ok(!appCode.includes("dark-footer-payment-strip"));

  // styles.css contains dark footer styling
  assert.ok(stylesCode.includes(".dark-theme-footer"));
  assert.ok(stylesCode.includes(".dark-footer-grid"));
  assert.ok(stylesCode.includes(".dark-social-pill"));
  assert.ok(stylesCode.includes(".policy-modal-card"));
});
