import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Language = "bn" | "en";

export const translations = {
  en: {
    // Nav
    allProducts: "All products",
    shops: "Independent shops",
    trackOrder: "Track order",
    myPurchases: "My purchases",
    openShop: "Open your shop",
    howItWorks: "How it works",
    wishlist: "Wishlist",
    savedItems: "Saved items",
    noSavedItems: "Your wishlist is empty",
    browseProducts: "Browse products",

    // Track order
    trackTitle: "Track your orders",
    trackSubtitle: "Enter your email address to find all your digital purchases and instant recovery links.",
    emailLabel: "Email address",
    emailPlaceholder: "e.g. name@example.com",
    phoneLabel: "Phone number",
    phonePlaceholder: "e.g. 01712345678",
    sendOtp: "Send verification code",
    otpSentMsg: "A 4-digit code was sent to your email.",
    otpLabel: "Enter 4-digit code",
    verifyOtp: "Verify & retrieve orders",
    trackSuccess: "Orders found and linked to this device!",
    noOrdersFound: "No orders found for this email address.",
    enterCodePrompt: "Enter the verification code to continue.",

    // Trust & Warranty Badges
    instantDeliveryBadge: "⚡ Instant Auto-Delivery (< 45s)",
    manualDeliveryBadge: "⏱️ Manual Delivery",
    completionRateBadge: "🛡️ 99.8% Completion Rate",
    verifiedReviewsBadge: "⭐ Verified Buyer Reviews Only",
    instantDeliveryDesc: "Digital credentials delivered immediately after payment verification.",
    fullWarrantyBadge: "🛡️ Full 1-Month Replacement Warranty",

    // Volume Discount / Reseller
    volumeTierTitle: "Buy More, Save More (Volume Discount)",
    volume1x: "1 item: Regular",
    volume3x: "3+ items: 5% OFF",
    volume5x: "5+ items: 10% OFF",
    volumeSavingsTag: "Volume Savings Applied",

    // Frequently Bought Together / Bundle
    bundleTitle: "Frequently Bought Together (Bundle Offer)",
    bundleAddPrompt: "Add companion bundle item with 20% discount:",
    bundleAdded: "Bundle discount applied",

    // Payment & Dynamic QR
    scanQrTitle: "Scan Dynamic QR Code",
    scanQrDesc: "Scan with your bKash or Nagad app. Amount and account number are pre-filled.",
    openInApp: "Open in App",
    manualAccountTransfer: "Manual Account Transfer",
    sendExactAmount: "Send exact amount to seller:",
    receivingAccount: "Receiving account",
    exactAmount: "Exact amount",
    enterTrxPrompt: "After payment, enter your Transaction ID (TrxID) below:",
    verifyPaymentBtn: "Submit TrxID & verify payment",
    copyBtn: "Copy",
    copiedBtn: "Copied!",
    payWith: "Pay with",
    merchantAccount: "Merchant Account",
    personalAccount: "Personal Account",
    makePaymentOption: "Make Payment (পেমেন্ট)",
    sendMoneyOption: "Send Money (সেন্ড মানি)",
    merchantAlert: "Important: This is a Merchant Account. In your mobile wallet, you MUST choose 'Payment' (পেমেন্ট). Do NOT choose Send Money.",
    personalAlert: "Important: This is a Personal Account. In your mobile wallet, you MUST choose 'Send Money' (সেন্ড মানি). Do NOT choose Payment.",
    stepOpenWallet: "Open your wallet app",
    stepSelectPaymentOption: "Select transaction option:",
    stepSubmitTrxId: "Submit Transaction ID (TrxID) below",
    sellerPaymentSettingsTitle: "Payment Accounts & Instructions",
    sellerPaymentSettingsDesc: "Configure whether your connected payment accounts are Personal or Merchant. Customers will see exact instructions (Send Money vs Make Payment) during checkout to avoid payment errors.",
    personalSendMoneyLabel: "Personal Account (Send Money / সেন্ড মানি)",
    merchantPaymentLabel: "Merchant Account (Make Payment / পেমেন্ট)",

    // Expiry & 1-Click Renewal
    warrantyActive: "Warranty active",
    daysLeft: "days left",
    expiringSoon: "Expiring soon",
    expiredPlan: "Expired plan",
    oneClickRenew: "1-Click Renew Subscription (10% OFF)",
    sendToWhatsApp: "Send Delivery to WhatsApp",
    copyRecoveryLink: "Copy Order Recovery Link",
    recoveryLinkCopied: "Order link copied to clipboard!",
  },
  bn: {
    // Nav
    allProducts: "সব প্রোডাক্ট",
    shops: "স্বাধীন শপসমূহ",
    trackOrder: "অর্ডার ট্র্যাক",
    myPurchases: "আমার অর্ডার",
    openShop: "দোকান খুলুন",
    howItWorks: "কীভাবে কাজ করে",
    wishlist: "উইশলিস্ট",
    savedItems: "পছন্দের তালিকা",
    noSavedItems: "আপনার উইশলিস্টে কোনো পণ্য নেই",
    browseProducts: "প্রোডাক্ট ব্রাউজ করুন",

    // Track order
    trackTitle: "ইমেইল দিয়ে অর্ডার ট্র্যাক করুন",
    trackSubtitle: "আপনার ইমেইল অ্যাড্রেস দিয়ে যেকোনো ব্রাউজার থেকে আগের সব পারচেজ হিস্ট্রি ও সিকিউর রিকভারি লিঙ্ক দেখুন।",
    emailLabel: "ইমেইল অ্যাড্রেস",
    emailPlaceholder: "যেমন: name@example.com",
    phoneLabel: "ফোন নম্বর",
    phonePlaceholder: "যেমন: ০১৭১২৩৪৫৬৭৮",
    sendOtp: "ভেরিফিকেশন কোড পাঠান",
    otpSentMsg: "আপনার ইমেইলে ৪ সংখ্যার ওটিপি কোড পাঠানো হয়েছে।",
    otpLabel: "৪ সংখ্যার কোডটি লিখুন",
    verifyOtp: "যাচাই করুন ও অর্ডার দেখুন",
    trackSuccess: "অর্ডার সফলভাবে ভেরিফাই ও এই ব্রাউজারে যুক্ত হয়েছে!",
    noOrdersFound: "এই ইমেইলে কোনো অর্ডার পাওয়া যায়নি।",
    enterCodePrompt: "ভেরিফিকেশন কোডটি প্রবেশ করিয়ে এগিয়ে যান।",

    // Trust & Warranty Badges
    instantDeliveryBadge: "⚡ ইনস্ট্যান্ট অটো-ডেলিভারি (< ৪৫ সেকেন্ড)",
    manualDeliveryBadge: "⏱️ ম্যানুয়াল ডেলিভারি",
    completionRateBadge: "🛡️ ৯৯.৮% অর্ডার কমপ্লিশন রেট",
    verifiedReviewsBadge: "⭐ ভেরিফাইড বায়ার রিভিউ",
    instantDeliveryDesc: "পেমেন্ট ভেরিফাই হওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে লাইসেন্স/ডেলিভারি পেয়ে যাবেন।",
    fullWarrantyBadge: "🛡️ ফুল রিপ্লেসমেন্ট ওয়ারেন্টি গ্যারান্টি",

    // Volume Discount / Reseller
    volumeTierTitle: "বেশি কিনুন, বেশি বাঁচুন (ভলিউম ডিসকাউন্ট)",
    volume1x: "১টি: রেগুলার প্রাইস",
    volume3x: "৩টি+: ৫% ছাড়",
    volume5x: "৫টি+: ১০% ছাড়",
    volumeSavingsTag: "ভলিউম ছাড় যুক্ত হয়েছে",

    // Frequently Bought Together / Bundle
    bundleTitle: "একসাথে কিনলে বিশেষ ছাড় (Bundle Offer)",
    bundleAddPrompt: "২০% বিশেষ ছাড়ে সাথে যোগ করুন:",
    bundleAdded: "বান্ডেল ডিসকাউন্ট প্রযোজ্য হয়েছে",

    // Payment & Dynamic QR
    scanQrTitle: "ডায়নামিক QR কোড স্ক্যান করুন",
    scanQrDesc: "বিকাশ বা নগদ অ্যাপ দিয়ে স্ক্যান করুন। নাম্বার ও টাকার পরিমাণ স্বয়ংক্রিয়ভাবে পূরণ হয়ে থাকবে।",
    openInApp: "অ্যাপে সরাসরি ওপেন করুন",
    manualAccountTransfer: "ম্যানুয়াল নম্বর কপি করে পেমেন্ট",
    sendExactAmount: "সঠিক টাকার পরিমাণ পাঠান:",
    receivingAccount: "সেলার একাউন্ট নম্বর",
    exactAmount: "প্রদেয় টাকা",
    enterTrxPrompt: "পেমেন্ট সম্পন্ন হলে Transaction ID (TrxID) নিচে দিন:",
    verifyPaymentBtn: "TrxID সাবমিট করে ভেরিফাই করুন",
    copyBtn: "কপি",
    copiedBtn: "কপি হয়েছে!",
    payWith: "পেমেন্ট মাধ্যম:",
    merchantAccount: "মার্চেন্ট একাউন্ট",
    personalAccount: "পার্সোনাল একাউন্ট",
    makePaymentOption: "পেমেন্ট করুন (Make Payment)",
    sendMoneyOption: "সেন্ড মানি করুন (Send Money)",
    merchantAlert: "সতর্কতা: এটি একটি মার্চেন্ট একাউন্ট। আপনার ওয়ালেট অ্যাপ থেকে অবশ্যই 'Payment' (পেমেন্ট করুন) অপশন ব্যবহার করবেন। সেন্ড মানি (Send Money) করবেন না।",
    personalAlert: "সতর্কতা: এটি একটি পার্সোনাল একাউন্ট। আপনার ওয়ালেট অ্যাপ থেকে অবশ্যই 'Send Money' (সেন্ড মানি করুন) অপশন ব্যবহার করবেন। পেমেন্ট (Payment) করবেন না।",
    stepOpenWallet: "আপনার মোবাইল ওয়ালেট অ্যাপ খুলুন",
    stepSelectPaymentOption: "মেনু থেকে অপশন নির্বাচন করুন:",
    stepSubmitTrxId: "নিচের ঘরে TrxID প্রদান করুন",
    sellerPaymentSettingsTitle: "পেমেন্ট একাউন্ট ও নির্দেশনা",
    sellerPaymentSettingsDesc: "আপনার সংযুক্ত পেমেন্ট একাউন্ট পার্সোনাল নাকি মার্চেন্ট তা সিলেক্ট করুন। গ্রাহকরা চেকআউটে সেই অনুযায়ী সুস্পষ্ট নির্দেশনা (সেন্ড মানি নাকি পেমেন্ট) দেখতে পাবেন যাতে ভুল লেনদেন না হয়।",
    personalSendMoneyLabel: "পার্সোনাল একাউন্ট (Send Money / সেন্ড মানি)",
    merchantPaymentLabel: "মার্চেন্ট একাউন্ট (Make Payment / পেমেন্ট)",

    // Expiry & 1-Click Renewal
    warrantyActive: "ওয়ারেন্টি সক্রিয়",
    daysLeft: "দিন বাকি",
    expiringSoon: "মেয়াদ দ্রুত শেষ হচ্ছে",
    expiredPlan: "মেয়াদোত্তীর্ণ",
    oneClickRenew: "১-ক্লিকে রিনিউ করুন (১০% ছাড়)",
    sendToWhatsApp: "হোয়াটসঅ্যাপে ডেলিভারি নিন",
    copyRecoveryLink: "অর্ডার রিকভারি লিঙ্ক কপি করুন",
    recoveryLinkCopied: "অর্ডার লিঙ্ক ক্লিপবোর্ডে কপি হয়েছে!",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

type LangContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
};

const LangContext = createContext<LangContextType>({
  lang: "bn",
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => translations.bn[key] || key,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("arise_lang");
      return saved === "en" || saved === "bn" ? saved : "bn";
    } catch {
      return "bn";
    }
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem("arise_lang", newLang);
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === "bn" ? "en" : "bn");
  };

  const t = (key: TranslationKey): string => {
    const table = translations[lang] || translations.bn;
    return table[key] || translations.en[key] || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
