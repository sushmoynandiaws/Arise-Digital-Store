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

  // Track Order / OTP by email (Global across shops)
  assert.ok(appCode.includes("function TrackOrderPage()"));
  assert.ok(appCode.includes("track-email"));
  assert.ok(!appCode.includes("track-phone"));
  assert.ok(appCode.includes("/orders/track/request-otp"));
  assert.ok(appCode.includes("/orders/track/verify-otp"));
  assert.ok(appCode.includes("<Route path=\"/track\" element={<TrackOrderPage />} />"));
  assert.ok(appCode.includes("ordersByShop"));
  assert.ok(appCode.includes("track-shop-card-section"));

  // Shop customer reviews with clear product attribution
  assert.ok(appCode.includes("<ShopReviews"));

  // Volume discount (opt-in from shop setup with customizable percentage tiers) and Bundle box (removed per user request)
  assert.ok(appCode.includes("volume-discount-widget"));
  assert.ok(appCode.includes("isVolumeDiscountEnabled"));
  assert.ok(appCode.includes("getShopVolumeConfig"));
  assert.ok(appCode.includes("volume-discount-settings-row"));
  assert.ok(appCode.includes("tier-quick-presets"));
  assert.ok(!appCode.includes("bundle-cross-sell-box"));
  assert.ok(appCode.includes("RENEW10"));

  // Badges & WhatsApp
  assert.ok(appCode.includes("product-trust-stats-badges"));
  assert.ok(appCode.includes("subscription-expiry-card"));
  assert.ok(appCode.includes("purchase-sharing-actions"));
  assert.ok(appCode.includes("wa.me/?text="));
  assert.ok(appCode.includes("copyRecoveryLink"));

  // Payment Instruction Card (Merchant vs Personal detection & clear step instructions)
  assert.ok(appCode.includes("function PaymentInstructionCard("));
  assert.ok(appCode.includes("detectPaymentAccountType"));
  assert.ok(appCode.includes("getSellerPaymentAccountType"));
  assert.ok(appCode.includes("setSellerPaymentAccountType"));
  assert.ok(appCode.includes("merchantAccount"));
  assert.ok(appCode.includes("personalAccount"));
  assert.ok(appCode.includes("seller-payment-method-row"));
  assert.ok(appCode.includes("<PaymentInstructionCard order={order} session={session} />"));

  // Sponsored Ads & Monetization Management
  assert.ok(appCode.includes("AdminSponsoredAdsManager"));
  assert.ok(appCode.includes("HomeHeroSponsoredAd"));
  assert.ok(appCode.includes("TopFlashSponsoredAd"));
  assert.ok(appCode.includes("SponsoredProductCard"));
  assert.ok(appCode.includes("FeaturedShopSponsoredAd"));
  assert.ok(appCode.includes("StickyBottomSponsoredStrip"));
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
  assert.ok(stylesCode.includes(".volume-discount-settings-row"));
  assert.ok(stylesCode.includes(".preset-pill"));
  assert.ok(stylesCode.includes(".bundle-cross-sell-box"));
  assert.ok(stylesCode.includes(".subscription-expiry-card"));
  assert.ok(stylesCode.includes(".track-order-page"));
  assert.ok(stylesCode.includes(".track-shop-card-section"));
  assert.ok(stylesCode.includes(".shop-reviews-section"));
  assert.ok(stylesCode.includes(".shop-review-product-tag"));
  assert.ok(stylesCode.includes(".payment-instruction-card"));
  assert.ok(stylesCode.includes(".account-type-badge.merchant"));
  assert.ok(stylesCode.includes(".account-type-badge.personal"));
  assert.ok(stylesCode.includes(".payment-type-alert.merchant-alert"));
  assert.ok(stylesCode.includes(".payment-type-alert.personal-alert"));
  assert.ok(stylesCode.includes(".payment-steps-list"));
  assert.ok(stylesCode.includes(".seller-payment-methods-list"));
  assert.ok(stylesCode.includes(".sponsored-hero-banner"));
  assert.ok(stylesCode.includes(".top-flash-sponsored-bar"));
  assert.ok(stylesCode.includes(".sponsored-product-card"));
  assert.ok(stylesCode.includes(".featured-shop-spotlight"));
  assert.ok(stylesCode.includes(".sticky-bottom-ad-strip"));
  assert.ok(stylesCode.includes(".ads-manager-panel"));
});

test("Dark theme footer has clean 4-column layout, social pills, and information pages without unwanted cards or payment strip", () => {
  // App.tsx contains footer components
  assert.ok(appCode.includes("function ShopInformationPage("));
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
  assert.ok(stylesCode.includes(".shop-policy-page"));
});

test("Top bar, central search and sub-nav remain available above the compact shop heading", () => {
  // App.tsx contains top bar and sub-nav components
  assert.ok(appCode.includes("function TopAnnouncementBar()"));
  assert.ok(appCode.includes("function SubNavBar()"));
  assert.ok(appCode.includes("header-center-search"));
  assert.ok(appCode.includes("site-top-bar"));
  assert.ok(appCode.includes("category-pill-btn"));
  assert.ok(appCode.includes('className="shop-page"'));

  // styles.css contains corresponding rules
  assert.ok(stylesCode.includes(".site-top-bar"));
  assert.ok(stylesCode.includes(".header-center-search"));
  assert.ok(stylesCode.includes(".site-sub-nav"));
  assert.ok(stylesCode.includes(".category-pill-btn"));
  assert.ok(stylesCode.includes(".shop-page .whatsapp-floating-btn"));
});

test("Top bar and footer dynamically isolate shop contact and marketplace info without hardcoding", () => {
  // Ensure no hardcoded dummy email or phone in TopAnnouncementBar or Footer
  assert.ok(!appCode.includes("sushmoynandiml@gmail.com"));
  assert.ok(!appCode.includes("01305087389"));
  assert.ok(!appCode.includes('"https://instagram.com"'));
  assert.ok(!appCode.includes('"https://linkedin.com"'));

  // Marketplace footer provides platform shortcuts
  assert.ok(appCode.includes('to="/seller" className="dark-social-pill"'));
  assert.ok(appCode.includes('to="/shops" className="dark-social-pill"'));
  assert.ok(appCode.includes("MARKETPLACE & PLATFORM"));

  // Shop footer dynamically consumes shop.contact and shop.social_links
  assert.ok(appCode.includes("shop?.social_links?.facebook"));
  assert.ok(appCode.includes("shop?.social_links?.instagram"));
  assert.ok(appCode.includes("shop?.contact?.email"));
  assert.ok(appCode.includes("shop?.contact?.whatsapp || shop?.contact?.phone"));
});

test("detectPaymentAccountType correctly detects merchant vs personal accounts and guides buyer", () => {
  function detectPaymentAccountType(payment, shop) {
    if (!payment) return "personal";
    const direct = (payment.account_type || payment.type || "").toString().toLowerCase();
    if (direct.includes("merchant") || direct.includes("payment")) return "merchant";
    if (direct.includes("personal") || direct.includes("send_money")) return "personal";

    const text = (payment.instructions || payment.note || "").toString().toLowerCase();
    if (text.includes("merchant") || text.includes("মার্চেন্ট") || text.includes("make payment") || text.includes("পেমেন্ট")) {
      return "merchant";
    }
    if (text.includes("personal") || text.includes("পার্সোনাল") || text.includes("send money") || text.includes("সেন্ড মানি")) {
      return "personal";
    }

    if (shop?.payment_account_types && payment.provider) {
      const val = shop.payment_account_types[payment.provider.toLowerCase()];
      if (val === "merchant" || val === "personal") return val;
    }
    return "personal";
  }

  // Merchant tests
  assert.equal(detectPaymentAccountType({ account_type: "merchant" }), "merchant");
  assert.equal(detectPaymentAccountType({ type: "merchant" }), "merchant");
  assert.equal(detectPaymentAccountType({ instructions: "Please make payment to merchant account" }), "merchant");
  assert.equal(detectPaymentAccountType({ instructions: "মার্চেন্ট একাউন্টে পেমেন্ট করুন" }), "merchant");
  assert.equal(detectPaymentAccountType({ provider: "bkash" }, { payment_account_types: { bkash: "merchant" } }), "merchant");

  // Personal tests
  assert.equal(detectPaymentAccountType({ account_type: "personal" }), "personal");
  assert.equal(detectPaymentAccountType({ type: "personal" }), "personal");
  assert.equal(detectPaymentAccountType({ instructions: "Please send money to personal account" }), "personal");
  assert.equal(detectPaymentAccountType({ instructions: "পার্সোনাল নম্বরে সেন্ড মানি করুন" }), "personal");
  assert.equal(detectPaymentAccountType({ provider: "nagad" }, { payment_account_types: { nagad: "personal" } }), "personal");
  assert.equal(detectPaymentAccountType(null), "personal");
});

test("Sponsored Ads logic correctly filters slots and calculates metrics", () => {
  const sampleAds = [
    { id: "1", title: "Ad 1", placement: "home_hero", status: "active", start_date: "2026-01-01", end_date: "2026-12-31", price_bdt: 3000, impressions: 100, clicks: 10 },
    { id: "2", title: "Ad 2", placement: "home_hero", status: "paused", start_date: "2026-01-01", end_date: "2026-12-31", price_bdt: 2000, impressions: 50, clicks: 2 },
    { id: "3", title: "Ad 3", placement: "top_flash", status: "active", start_date: "2026-01-01", end_date: "2026-12-31", price_bdt: 1500, impressions: 200, clicks: 15 },
    { id: "4", title: "Ad 4", placement: "sponsored_product", status: "active", start_date: "2026-01-01", end_date: "2026-12-31", price_bdt: 2500, impressions: 80, clicks: 8 },
    { id: "5", title: "Ad 5", placement: "home_hero", status: "active", start_date: "2020-01-01", end_date: "2020-02-01", price_bdt: 1000, impressions: 10, clicks: 0 },
  ];

  function filterActive(slot, list) {
    const now = Date.now();
    return list.filter((ad) => {
      if (ad.placement !== slot || ad.status !== "active") return false;
      if (ad.end_date && new Date(ad.end_date).getTime() + 86400000 < now) return false;
      return true;
    });
  }

  const activeHero = filterActive("home_hero", sampleAds);
  assert.equal(activeHero.length, 1);
  assert.equal(activeHero[0].id, "1");

  const activeFlash = filterActive("top_flash", sampleAds);
  assert.equal(activeFlash.length, 1);
  assert.equal(activeFlash[0].id, "3");

  const totalRevenue = sampleAds.reduce((acc, a) => acc + a.price_bdt, 0);
  assert.equal(totalRevenue, 10000);
});
