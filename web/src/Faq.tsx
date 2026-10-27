import { useState } from "react";
import { useLang } from "./i18n";
import { ChevronDown, CheckCircle2, HelpCircle } from "./icons";
import type { Shop, Product } from "./types";

export interface FaqItem {
  question: string;
  answer: string;
}

export const ART_CRAFTS_FAQS: { bn: string; en: string; ans_bn: string; ans_en: string }[] = [
  {
    bn: "আমি কি নিজের ছবি বা পছন্দের ডিজাইন দিয়ে কাস্টম ফ্রেম বানাতে পারব?",
    en: "Can I customize the frame with my own photo or design?",
    ans_bn: "হ্যাঁ, সম্পূর্ণ কাস্টমাইজেশন সুবিধা রয়েছে! অর্ডার সম্পন্ন করার পর আপনার হাই-রেজোলিউশন ছবি বা পছন্দের ডিজাইন আমাদের হোয়াটসঅ্যাপে পাঠিয়ে দিন। আমাদের ডিজাইনার টিম আপনাকে প্রিন্ট প্রিভিউ দেখিয়ে চূড়ান্ত অনুমোদনের পরই ফ্রেমিং ও প্রিন্ট প্রস্তুত করবে।",
    ans_en: "Yes, full custom framing is available! After placing your order, send your high-resolution photos or designs to our WhatsApp. Our design team will share a preview for your approval before final printing and framing.",
  },
  {
    bn: "ফ্রেমের ম্যাটেরিয়াল এবং প্রিন্টের কোয়ালিটি কেমন?",
    en: "What materials and print quality are used for the frames?",
    ans_bn: "আমরা দীর্ঘস্থায়ী প্রিমিয়াম ফাইবার ও কাঠের ফ্রেম, আল্ট্রা-ক্লিয়ার গ্লাস/অ্যাক্রিলিক এবং ওয়াটারপ্রুফ আল্ট্রা-এইচডি ল্যামিনেশন ব্যবহার করি। ফলে ছবির রঙ কখনো বিবর্ণ হয় না এবং ফ্রেম বছরের পর বছর নতুনের মতো টেকসই ও চকচকে থাকে।",
    ans_en: "We use durable premium fiber/wooden frames, ultra-clear glass or acrylic, and waterproof Ultra-HD laminated prints that resist fading and stay vibrant for years.",
  },
  {
    bn: "কুরিয়ার ডেলিভারিতে ফ্রেম বা গ্লাস ভাঙার কোনো ঝুঁকি আছে কি?",
    en: "Is there any risk of frame or glass breakage during courier delivery?",
    ans_bn: "একদমই না। আমরা ফ্রেম ডেলিভারির জন্য মাল্টি-লেয়ার বাবল র‍্যাপ এবং শক-প্রুফ শক্ত কার্টন দিয়ে বিশেষ সুরক্ষিত প্যাকেজিং করি। ট্রানজিটে কোনো কারণে ক্ষতি হলে তাৎক্ষণিক ফ্রি রিপ্লেসমেন্ট প্রদান করা হয়।",
    ans_en: "Not at all. Every frame is safely wrapped in multi-layer protective bubble wrap and shock-absorbing cartons. If any transit damage occurs, we guarantee an immediate free replacement.",
  },
  {
    bn: "ডেলিভারি পেতে কতদিন সময় লাগবে এবং অগ্রিম কত দিতে হবে?",
    en: "How long does delivery take and is any advance payment required?",
    ans_bn: "ঢাকা সিটির মধ্যে সাধারণত ২-৩ কার্যদিবস এবং ঢাকার বাইরে ৩-৫ কার্যদিবসের মধ্যে কুরিয়ার ডেলিভারি সম্পন্ন হয়। ক্যাশ অন ডেলিভারি (COD) অর্ডারে পার্সেল বুকিংয়ের জন্য শুধুমাত্র কুরিয়ার ডেলিভারি চার্জ অগ্রিম প্রযোজ্য।",
    ans_en: "Delivery typically takes 2-3 business days inside Dhaka and 3-5 business days outside Dhaka. For Cash on Delivery orders, only the courier delivery charge is required in advance to confirm dispatch.",
  },
  {
    bn: "ডেলিভারি রাইডারের সামনে পার্সেল খুলে চেক করা যাবে কি?",
    en: "Can I inspect the parcel in front of the delivery rider?",
    ans_bn: "হ্যাঁ, কুরিয়ার ডেলিভারি রাইডারের সামনেই পার্সেল খুলে ফ্রেম ও প্রিন্ট কোয়ালিটি যাচাই করে নিতে পারবেন। কোনো ত্রুটি পেলে বা ভুল সাইজ এলে রাইডারের উপস্থিতিতেই তাৎক্ষণিক আমাদের হেল্পলাইনে কল করুন।",
    ans_en: "Yes, you can inspect the package in the presence of the courier rider before accepting it. If you notice any defect, contact our support helpline immediately while the rider is present.",
  },
];

export const GENERAL_STORE_FAQS: { bn: string; en: string; ans_bn: string; ans_en: string }[] = [
  {
    bn: "অর্ডার কনফার্ম করার পর ডেলিভারি কীভাবে পাব এবং কত সময় লাগবে?",
    en: "How and when will I receive my order after confirmation?",
    ans_bn: "অর্ডার সম্পন্ন হলে সাথে সাথেই আপনি রিয়েল-টাইম কুরিয়ার ট্র্যাকিং লিংক পেয়ে যাবেন। ফিজিক্যাল পণ্য কুরিয়ার সার্ভিসের মাধ্যমে ২-৫ কার্যদিবসে পৌঁছাবে; ডিজিটাল পণ্য তাৎক্ষণিক ড্যাশবোর্ডে ও ইমেইলে ডেলিভারি হবে।",
    ans_en: "Once confirmed, you will receive real-time courier tracking updates. Physical goods are delivered within 2-5 business days via courier, while digital licenses and subscriptions are delivered instantly.",
  },
  {
    bn: "পেমেন্টের নিয়ম কী? ক্যাশ অন ডেলিভারি (COD) কি পাওয়া যাবে?",
    en: "What payment methods are supported? Is Cash on Delivery available?",
    ans_bn: "হ্যাঁ, ক্যাশ অন ডেলিভারি (COD) এবং সরাসরি বিকাশ, নগদ ও রকেটের মাধ্যমে বিক্রেতার ভেরিফাইড একাউন্টে পেমেন্ট সুবিধা রয়েছে। সিওডি অর্ডারে কুরিয়ার চার্জ অগ্রিম প্রযোজ্য হতে পারে।",
    ans_en: "Yes, Cash on Delivery (COD) as well as direct mobile banking (bKash, Nagad, Rocket) are supported. For COD orders, the courier delivery fee may be collected in advance.",
  },
  {
    bn: "ডেলিভারির সময় পার্সেল খুলে চেক করা যাবে কি?",
    en: "Can I open and inspect the parcel upon delivery?",
    ans_bn: "হ্যাঁ, কুরিয়ার রাইডারের উপস্থিতিতে পার্সেল চেক করে নেওয়ার সুযোগ রয়েছে। কোনো সমস্যা বা ত্রুটি থাকলে রাইডারের সামনেই বিক্রেতার হেল্পলাইনে যোগাযোগ করতে পারেন।",
    ans_en: "Yes, you can check the parcel condition in the presence of the courier rider. If any issue arises, contact seller support immediately.",
  },
  {
    bn: "পণ্য বা সেবায় সমস্যা থাকলে রিটার্ন বা রিফান্ডের নিয়ম কী?",
    en: "What is the return and refund policy if there is an issue?",
    ans_bn: "প্রোডাক্টে কোনো ত্রুটি থাকলে ডেলিভারি পাওয়ার পর দ্রুত বিক্রেতার সাথে যোগাযোগ করুন। শপের রিটার্ন পলিসি অনুযায়ী উপযুক্ত ক্ষেত্রে সহজ রিপ্লেসমেন্ট বা রিফান্ড প্রদান করা হয়।",
    ans_en: "If you receive a defective or incorrect item, reach out to seller support immediately. Fast replacement or refund is provided according to the shop return policy.",
  },
];

export function parseFaqText(raw?: string): FaqItem[] {
  if (!raw || !raw.trim()) return [];
  const items: FaqItem[] = [];
  const blocks = raw.split(/\n\s*\n+/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const qLineIdx = lines.findIndex((l) =>
      /^(?:Q|প্রশ্ন|Question|Q\d+)[\s:：\-.]/i.test(l)
    );
    const aLineIdx = lines.findIndex((l) =>
      /^(?:A|উত্তর|Answer|Ans)[\s:：\-.]/i.test(l)
    );
    if (qLineIdx !== -1 && aLineIdx !== -1 && aLineIdx > qLineIdx) {
      const question = lines
        .slice(qLineIdx, aLineIdx)
        .join(" ")
        .replace(/^(?:Q|প্রশ্ন|Question|Q\d+)[\s:：\-.]\s*/i, "")
        .trim();
      const answer = lines
        .slice(aLineIdx)
        .join(" ")
        .replace(/^(?:A|উত্তর|Answer|Ans)[\s:：\-.]\s*/i, "")
        .trim();
      if (question && answer) {
        items.push({ question, answer });
        continue;
      }
    }

    if (lines[0].startsWith("#")) {
      const question = lines[0].replace(/^#+\s*/, "").trim();
      const answer = lines.slice(1).join("\n").trim();
      if (question && answer) {
        items.push({ question, answer });
        continue;
      }
    }

    if (
      lines.length >= 2 &&
      (lines[0].includes("?") || lines[0].includes("؟") || lines[0].includes("।") || /^\d+[\.\)]/.test(lines[0]))
    ) {
      const question = lines[0].replace(/^(?:\d+[\.\)]\s*)/, "").trim();
      const answer = lines.slice(1).join("\n").trim();
      if (question && answer) {
        items.push({ question, answer });
        continue;
      }
    }
  }
  return items;
}

export function isArtAndCraftShop(shop?: Shop, product?: Product): boolean {
  const text = [
    shop?.name,
    shop?.slug,
    shop?.tagline,
    shop?.description,
    product?.name,
    product?.category,
    product?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("frame") ||
    text.includes("art") ||
    text.includes("craft") ||
    text.includes("ফটো ফ্রেম") ||
    text.includes("ফ্রেম") ||
    text.includes("ক্যানভাস") ||
    text.includes("canvas") ||
    text.includes("decor") ||
    text.includes("painting")
  );
}

export function getStoreFaqs(options: {
  shop?: Shop;
  product?: Product;
  lang: string;
}): FaqItem[] {
  const { shop, product, lang } = options;
  const customFaqs = parseFaqText(shop?.pages?.faq);
  const isArt = isArtAndCraftShop(shop, product);
  const defaultList = isArt ? ART_CRAFTS_FAQS : GENERAL_STORE_FAQS;
  const mappedDefaults: FaqItem[] = defaultList.map((item) => ({
    question: lang === "bn" ? item.bn : item.en,
    answer: lang === "bn" ? item.ans_bn : item.ans_en,
  }));

  if (customFaqs.length > 0) {
    const questionsSet = new Set(
      customFaqs.map((f) => f.question.toLowerCase().trim())
    );
    const supplementary = mappedDefaults.filter(
      (d) => !questionsSet.has(d.question.toLowerCase().trim())
    );
    return [...customFaqs, ...supplementary];
  }

  return mappedDefaults;
}

export function StoreFaqAccordion({
  shop,
  product,
  standalone = false,
  title,
}: {
  shop?: Shop;
  product?: Product;
  standalone?: boolean;
  title?: string;
}) {
  const { lang } = useLang();
  const faqs = getStoreFaqs({ shop, product, lang });

  if (!faqs.length) return null;

  return (
    <section
      className={`store-faq-section ${standalone ? "standalone-faq" : ""}`}
      aria-labelledby="store-faq-heading"
    >
      <div className="store-faq-card">
        <header className="store-faq-header">
          <div className="store-faq-title-wrap">
            <h3 id="store-faq-heading">
              <HelpCircle size={20} className="store-faq-icon" aria-hidden="true" />
              {title || (lang === "bn" ? "সাধারণ প্রশ্নোত্তর (FAQ)" : "Frequently Asked Questions (FAQ)")}
            </h3>
            <p>
              {lang === "bn"
                ? "অর্ডার, ডেলিভারি ও প্রোডাক্ট কোয়ালিটি সম্পর্কিত ভেরিফাইড প্রশ্নোত্তর"
                : "Verified answers about ordering, delivery, and product quality"}
            </p>
          </div>
        </header>
        <div className="store-faq-list">
          {faqs.map((faq, index) => (
            <details key={index} className="store-faq-item" open={index === 0}>
              <summary className="store-faq-summary">
                <span className="store-faq-q-text">{faq.question}</span>
                <ChevronDown size={18} className="store-faq-chevron" aria-hidden="true" />
              </summary>
              <div className="store-faq-answer">
                <p className="preserve-lines">{faq.answer}</p>
                <div className="store-faq-footer">
                  <span className="faq-verified-pill">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    {lang === "bn" ? "ভেরিফাইড তথ্য" : "Verified answer"}
                  </span>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
