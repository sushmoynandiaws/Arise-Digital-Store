export const shopPageSections = [
  { key: "privacy", title: "Privacy policy", titleBn: "গোপনীয়তা নীতি", hint: "Explain what customer information you collect and how you use it." },
  { key: "returns", title: "Returns & refund policy", titleBn: "রিটার্ন ও রিফান্ড নীতি", hint: "Explain when customers can request a return, refund or replacement and how to request one." },
  { key: "terms", title: "Terms & conditions", titleBn: "নিয়ম ও শর্তাবলী", hint: "Describe the conditions customers should read before buying from your shop." },
  { key: "about", title: "About us", titleBn: "আমাদের সম্পর্কে", hint: "Tell customers about your shop and the products you sell." },
  { key: "contact", title: "Contact us", titleBn: "যোগাযোগ করুন", hint: "Share your support channels, contact details and working hours." },
] as const;

export const defaultPlatformPolicies: Record<string, { en: string; bn: string }> = {
  terms: {
    en: `Welcome to Arise Store (arise-digital-store.vercel.app). By browsing, accessing, or placing an order on our marketplace, you agree to these Terms & Conditions. Please read them carefully.

1. Marketplace Intermediary Role
Arise Store is an open, multi-vendor electronic commerce marketplace platform powered by AriseSell. Arise Store serves strictly as a neutral technological intermediary connecting independent third-party merchant shops with buyers. Unless explicitly stated otherwise on an individual product listing, Arise Store is not the direct manufacturer, seller, owner, or packer of items listed on this platform.

2. Independent Sellers & Catalog Accuracy
All shops hosted on Arise Store are owned and operated by independent sellers. Each merchant maintains sole responsibility for their product descriptions, variant configurations, stock counts, pricing, warranties, physical packaging, and order fulfillment. While Arise Store conducts seller verification and active content moderation, the platform does not warrant that merchant-provided specifications are always error-free.

3. Multi-Category Marketplace: Physical & Digital Goods
Arise Store offers a diverse catalog across multiple industries:
• Physical Goods (Fashion, Footwear, Electronics, Lifestyle, Accessories): Physical products are packaged and dispatched directly by the independent merchant through licensed third-party courier services (e.g. SteadFast, Pathao, RedX). Courier delivery timeframes are estimates and subject to logistics conditions.
• Digital Products (Software Licenses, Developer Tools, Subscriptions): Legitimate digital keys and licenses are delivered electronically or as instructed in the product listing.

4. Orders, Advance Payments & Cash on Delivery (COD)
• Customers must provide authentic and verifiable contact information (full name, phone number, complete delivery address, and district).
• For Cash on Delivery (COD) orders, independent sellers may require a non-refundable advance payment covering courier delivery charges or commitment fees to protect against fraudulent, unverified, or cancelled orders.
• Buyers must send advance payments strictly using the official payment accounts and order reference codes displayed at checkout. Arise Store never asks for personal mobile financial service PINs or OTPs.

5. Courier Delivery & Parcel Inspection
Buyers are strongly required to inspect the exterior and condition of the parcel in the presence of the courier delivery agent upon delivery. If an item is visibly broken, damaged, tampered with, or mismatched, the customer has the right to refuse acceptance immediately and report the issue to the seller.

6. Limitation of Liability
To the fullest extent permitted by the laws of Bangladesh:
• Arise Store shall not be liable for any direct, indirect, incidental, punitive, or consequential damages resulting from merchant transactions, courier delivery delays, defective items, or seller breaches.
• The platform's liability is strictly limited to facilitating order communication, tracking routing, and mediating disputes in good faith.

7. Prohibited Products & Zero Tolerance
Counterfeit items, unauthorized replicas, stolen licenses, illegal goods, and copyright-infringing materials are strictly prohibited. Sellers violating these rules face immediate shop termination, permanent forfeiture of access, and reporting to relevant legal authorities.

8. Governing Law
These terms and conditions are governed by and construed in accordance with the applicable laws of Bangladesh.`,
    bn: `অ্যারাইজ স্টোরে (Arise Store - arise-digital-store.vercel.app) আপনাকে স্বাগতম। আমাদের মার্কেটপ্লেস ব্রাউজ করা বা অর্ডার করার মাধ্যমে আপনি নিম্নোক্ত নিয়ম ও শর্তাবলীতে সম্মতি প্রদান করছেন।

১. প্ল্যাটফর্ম ও প্রযুক্তিগত মধ্যস্থতাকারী হিসেবে ভূমিকা (Marketplace Intermediary Role)
অ্যারাইজ স্টোর হলো AriseSell ইকোসিস্টেমের অধীন পরিচালিত একটি উন্মুক্ত মাল্টি-ভেন্ডার ডিজিটাল মার্কেটপ্লেস প্ল্যাটফর্ম। অ্যারাইজ স্টোর একটি নিরপেক্ষ প্রযুক্তিগত মাধ্যম (Intermediary) হিসেবে স্বাধীন তৃতীয়-পক্ষ বিক্রেতা (Independent Sellers) এবং ক্রেতাদের সংযুক্ত করে। কোনো নির্দিষ্ট পণ্যে স্পষ্ট উল্লেখ না থাকলে, অ্যারাইজ স্টোর সরাসরি কোনো পণ্যের প্রস্তুতকারক, আমদানিকারক, পাইকার বা প্রত্যক্ষ বিক্রেতা নয়।

২. স্বাধীন বিক্রেতা ও পণ্যের তথ্যের দায়বদ্ধতা
অ্যারাইজ স্টোরে নিবন্ধিত প্রতিটি শপ সম্পূর্ণ স্বাধীনভাবে তাদের ব্যবসা পরিচালনা করে। পণ্যের বিবরণ, ছবি, সাইজ, স্টক, মূল্য নির্ধারণ, প্যাকেজিং, ডেলিভারি এবং ওয়্যারেন্টি প্রতিশ্রুতি সংক্রান্ত সকল দায়-দায়িত্ব সংশ্লিষ্ট বিক্রেতার। কোনো পণ্যের বিবরণ বা তথ্যের অসঙ্গতির জন্য সংশ্লিষ্ট বিক্রেতা সম্পূর্ণ দায়বদ্ধ থাকবেন।

৩. মাল্টি-ক্যাটাগরি পণ্য (ফিজিক্যাল ও ডিজিটাল)
অ্যারাইজ স্টোর এখন পোশাক, জুতো, গ্যাজেটস, ইলেকট্রনিক্স, দৈনন্দিন পণ্য এবং ডিজিটাল লাইসেন্সসহ বহুবিধ পণ্যের সমাহার:
• ফিজিক্যাল পণ্য: পোশাক, জুতো ও হার্ডওয়্যার পণ্যসমূহ সরাসরি বিক্রেতার ওয়্যারহাউস থেকে প্যাকেজিং হয়ে নির্ভরযোগ্য কুরিয়ার সার্ভিসের (যেমন SteadFast, Pathao, RedX) মাধ্যমে ক্রেতার ঠিকানায় পৌঁছায়।
• ডিজিটাল পণ্য: ডিজিটাল সফটওয়্যার ও লাইসেন্সসমূহ সরাসরি অর্ডার পেজ বা মেসেজের মাধ্যমে নিরাপদ পদ্ধতিতে সরবরাহ করা হয়।

৪. অর্ডার ও অগ্রিম ডেলিভারি চার্জ (Advance Payment)
• ক্রেতাকে অবশ্যই সঠিক ও সক্রিয় যোগাযোগের তথ্য (নাম, সচল মোবাইল নম্বর, বিস্তারিত ডেলিভারি ঠিকানা ও জেলা) প্রদান করতে হবে।
• ক্যাশ অন ডেলিভারি (COD) অর্ডারের ক্ষেত্রে ভুয়া বা ফেক অর্ডার প্রতিরোধে বিক্রেতা কুরিয়ার ডেলিভারি চার্জ বা আংশিক অগ্রিম পেমেন্ট চাইতে পারেন।
• ক্রেতাকে চেকআউটে প্রদর্শিত বিক্রেতার নির্দিষ্ট অ্যাকাউন্ট ও রেফারেন্স কোড মিলিয়ে পেমেন্ট সম্পন্ন করতে হবে। কখনোই বিকাশ বা নগদের গোপন পিন (PIN) বা ওটিপি (OTP) কারও সাথে শেয়ার করবেন না।

৫. পার্সেল গ্রহণ ও তাৎক্ষণিক যাচাইকরণ
কুরিয়ার ডেলিভারি ম্যানের সামনে পার্সেলের বাহ্যিক অবস্থা ও পণ্য যাচাই করে গ্রহণ করা ক্রেতার দায়িত্ব। পণ্যটি ভাঙা, ত্রুটিযুক্ত বা ভুল পাঠানো হলে ডেলিভারি ম্যানের সামনেই পার্সেলটি প্রত্যাখ্যান করুন এবং বিক্রেতাকে অবহিত করুন।

৬. প্ল্যাটফর্মের দায়বদ্ধতার সীমাবদ্ধতা (Limitation of Liability)
• স্বাধীন বিক্রেতার পণ্যের মানগত ত্রুটি, কুরিয়ারের পরিবহনজনিত বিলম্ব বা বিক্রেতা-ক্রেতা পারস্পরিক লেনদেনের বিরোধে অ্যারাইজ স্টোর সরাসরি কোনো আর্থিক বা আইনি ক্ষতিপূরণের জন্য দায়ী থাকবে না।
• অ্যারাইজ স্টোর নিরপেক্ষ মধ্যস্থতাকারী হিসেবে অর্ডার ট্র্যাকিং, তথ্য আদান-প্রদান এবং বিরোধ নিষ্পত্তিতে সর্বাত্মক সহযোগিতা করবে।

৭. নিষিদ্ধ পণ্য ও জিরো টলারেন্স নীতি
নকল পণ্য, কপিরাইট লঙ্ঘনকারী সামগ্রী, অবৈধ দ্রব্য বা প্রতারণামূলক কর্মকাণ্ড অ্যারাইজ স্টোরে সম্পূর্ণ নিষিদ্ধ। কোনো বিক্রেতা এই নিয়ম ভঙ্গ করলে তার শপ তাৎক্ষণিকভাবে স্থায়ীভাবে বন্ধ করা হবে।

৮. আইনি এখতিয়ার
এই শর্তাবলী গণপ্রজাতন্ত্রী বাংলাদেশের প্রচলিত ইলেকট্রনিক লেনদেন ও ভোক্তা অধিকার সংরক্ষণ আইন দ্বারা পরিচালিত হবে।`
  },
  returns: {
    en: `At Arise Store, we are committed to facilitating a fair, secure, and transparent shopping experience. Because products on Arise Store are sold and fulfilled directly by independent sellers, the following marketplace returns and refund policy applies to all orders:

1. Delivery Inspection for Physical Products
Customers are strongly advised to inspect all parcels immediately upon arrival in the presence of the courier delivery representative:
• Damaged or Broken Items: If the item was damaged during transit, you have the right to refuse acceptance on the spot.
• Mismatched or Incorrect Product: If you receive an incorrect size, color, or different product, refuse delivery or notify the seller within 24 to 48 hours with clear unboxing photographs or video proof.

2. Return & Exchange Eligibility
To qualify for an exchange, return, or refund:
• The product must be unused, unwashed, unworn, and in its original condition.
• Original product packaging, manufacturer tags, barcodes, warranties, and all bundled accessories must remain intact.
• Return requests must be initiated within the return window stated on the product page (standard window: 48 hours from delivery).

3. Courier Advance Delivery Charge Policy
• For Cash on Delivery (COD) orders where an advance delivery charge was paid: If the customer arbitrarily cancels or refuses the parcel upon delivery without any product defect or valid reason, the advance delivery charge is strictly non-refundable, as it pays the courier company for transit logistics costs.
• If the return is due to seller error (defective, damaged, or incorrect item sent), the seller is responsible for replacement courier shipping costs.

4. Digital Products & Software Licenses
• Digital licenses, software keys, and electronic vouchers that have been verified, revealed, or redeemed cannot be returned or refunded due to their irreversible digital nature.
• If a digital code is proven non-functional upon initial delivery, the seller will verify and replace the key within 24 hours.

5. Refund Processing Timeline
• Once the returned physical product is received, inspected, and approved by the seller, refunds are issued within 3 to 7 business days.
• Refunds are transferred directly to the customer's mobile financial wallet (bKash, Nagad) or bank account used for payment.

6. Platform Dispute Mediation
If an independent seller fails to respond to a legitimate return or refund request within 72 hours, please escalate the issue to Arise Store Support at support@arisesell.com with your Order Reference ID. Our team will investigate and intervene.`,
    bn: `অ্যারাইজ স্টোরে প্রতিটি ক্রেতা ও বিক্রেতার স্বার্থ সুরক্ষায় একটি স্বচ্ছ ও ভারসাম্যপূর্ণ রিটার্ন ও রিফান্ড পলিসি অনুসরণ করা হয়। যেহেতু পণ্যগুলো স্বাধীন বিক্রেতাদের মাধ্যমে সরাসরি সরবরাহ করা হয়, তাই নিম্নোক্ত নিয়মাবলী প্রযোজ্য হবে:

১. পার্সেল গ্রহণ ও ডেলিভারির সময় যাচাইকরণ
• কুরিয়ার ডেলিভারি পার্সন যখন পার্সেল নিয়ে আসবেন, তখন তার সামনে পার্সেলটি পরীক্ষা করে গ্রহণ করুন।
• পণ্যটি যদি ভাঙা, ফাটা, নষ্ট বা ভুল পাঠানো হয়ে থাকে, তবে ডেলিভারি ম্যানের সামনেই পার্সেলটি গ্রহণ না করে ফেরত দিন (রিটার্ন করুন)।
• কোনো লুকানো ত্রুটি থাকলে ডেলিভারি পাওয়ার ২৪ থেকে ৪৮ ঘণ্টার মধ্যে আনবক্সিং ভিডিও বা ছবিসহ বিক্রেতার সাথে যোগাযোগ করুন।

২. রিটার্ন ও পরিবর্তনের শর্তাবলী
• পণ্যটি অব্যবহৃত, অক্ষত এবং পুনর্বিক্রয়যোগ্য অবস্থায় থাকতে হবে।
• মূল প্যাকেজিং, ট্যাগ, ক্যাশ মেমো এবং সাথে থাকা অন্যান্য এক্সেসরিজ অক্ষত থাকতে হবে।
• সুনির্দিষ্ট কারণ ছাড়া ব্যবহৃত বা গ্রাহকের নিজের অসাবধানতায় ক্ষতিগ্রস্ত পণ্য রিটার্নযোগ্য নয়।

৩. অগ্রিম ডেলিভারি চার্জ সংক্রান্ত নিয়ম
• ক্যাশ অন ডেলিভারি (COD) অর্ডারের ক্ষেত্রে যদি গ্রাহক পণ্য কোনো ত্রুটি ছাড়াই অহেতুক গ্রহণ না করেন বা ডেলিভারি ফিরিয়ে দেন, তবে প্রদত্ত অগ্রিম ডেলিভারি চার্জটি অফেরতযোগ্য (Non-refundable), কারণ এটি কুরিয়ার কোম্পানিকে পরিবহন খরচ বাবদ পরিশোধিত হয়।
• কিন্তু বিক্রেতার ভুলের কারণে (ভুল পণ্য বা নষ্ট পণ্য) রিটার্ন হলে পুনঃডেলিভারির কুরিয়ার খরচ বিক্রেতা বহন করবেন।

৪. ডিজিটাল পণ্য সংক্রান্ত রিফান্ড নীতি
• ডিজিটাল সফটওয়্যার কোড বা লাইসেন্স একবার সরবরাহ ও সক্রিয় (Activated) হয়ে গেলে তা পরিবর্তন বা রিফান্ডযোগ্য নয়।
• সরবরাহকৃত কী (Key) যদি প্রথম থেকেই অকার্যকর প্রমাণিত হয়, তবে বিক্রেতা নতুন কোড প্রদান করবেন।

৫. রিফান্ড সম্পন্ন হওয়ার সময়সীমা
• বিক্রেতা ফেরত আসা পণ্যটি পাওয়ার পর যাচাই-বাছাই শেষে ৩ থেকে ৭ কার্যদিবসের মধ্যে রিফান্ডের টাকা ক্রেতার বিকাশ/নগদ বা ব্যাংক অ্যাকাউন্টে পাঠিয়ে দেওয়া হয়।

৬. প্ল্যাটফর্ম সহায়তা ও মধ্যস্থতা
বিক্রেতার সাথে যোগাযোগ করে ৭২ ঘণ্টার মধ্যে যৌক্তিক সমাধান না পেলে, আপনার অর্ডার আইডি সহ অ্যারাইজ স্টোর সাপোর্টে (support@arisesell.com) যোগাযোগ করুন। আমাদের টিম দ্রুত তদন্তপূর্বক সমাধান নিশ্চিত করবে।`
  },
  privacy: {
    en: `Arise Store values and respects your personal privacy. This Privacy Policy outlines how your information is collected, utilized, and safeguarded across our multi-vendor marketplace platform.

1. Information We Collect
When you browse, register, or place an order on Arise Store, we collect only information necessary to process transactions:
• Order Fulfillment Data: Recipient full name, mobile phone number, complete delivery address, and district.
• Transaction Verification Data: Mobile wallet transaction identifiers (TrxID), payment method, and order reference codes.
• Technical Session Data: Browser type, device operating system, IP address, and secure cookie tokens for session integrity and CSRF protection.

2. How We Use Your Information
Your information is used strictly for:
• Routing and fulfilling your orders with the relevant independent seller.
• Generating shipping labels and facilitating parcel delivery via integrated courier partners (e.g. SteadFast, Pathao).
• Communicating order status updates, tracking links, and payment verification notices.
• Detecting, preventing, and mitigating fraudulent transactions and unauthorized activities.

3. Information Sharing with Sellers and Couriers
To fulfill your purchase, your contact details (name, phone, delivery address) are shared strictly with:
• The specific independent seller whose products you purchased.
• The designated courier logistics service assigned to deliver your parcel.
Neither sellers nor courier services are authorized to use your personal information for unrelated marketing purposes.

4. Financial Security & No PIN Storage
Arise Store never asks for, collects, or stores your personal mobile banking PINs, account passwords, or one-time passcodes (OTPs). Payments are processed securely via direct wallet provider channels (bKash, Nagad, Bank).

5. Zero Third-Party Data Monetization
We do not sell, rent, lease, or distribute your personal contact information to third-party advertising companies or marketing aggregators.

6. Data Retention and Buyer Rights
Order details are maintained in accordance with accounting and commercial record-keeping regulations. Customers may request review, correction, or deletion of their account records by contacting support@arisesell.com.`,
    bn: `অ্যারাইজ স্টোর আপনার ব্যক্তিগত তথ্যের গোপনীয়তা রক্ষায় দৃঢ় প্রতিশ্রুতিবদ্ধ। আমাদের প্ল্যাটফর্মে আপনার তথ্য কীভাবে সংরক্ষিত ও ব্যবহৃত হয় তা নিচে স্পষ্ট করা হলো:

১. যেসব তথ্য আমরা সংগ্রহ করি
অর্ডার সম্পন্ন ও ডেলিভারির সুবিধার্থে আমরা নিম্নোক্ত তথ্যসমূহ সংগ্রহ করি:
• ক্রেতার নাম, যোগাযোগের মোবাইল নম্বর, পূর্ণাঙ্গ ডেলিভারি ঠিকানা ও জেলা।
• পেমেন্ট ভেরিফিকেশনের জন্য ট্রানজাকশন আইডি (TrxID) এবং অর্ডার রেফারেন্স।
• ব্রাউজার সেশন নিরাপত্তা ও সিএসআরএফ (CSRF) সুরক্ষার জন্য প্রযুক্তিগত কুকিজ।

২. তথ্যের ব্যবহার
সংগৃহীত তথ্য শুধুমাত্র নিচের কাজগুলোতে ব্যবহৃত হয়:
• সংশ্লিষ্ট বিক্রেতার মাধ্যমে আপনার অর্ডারটি প্রস্তুত ও নিশ্চিতকরণ।
• কুরিয়ার সার্ভিসের মাধ্যমে আপনার ঠিকানায় পার্সেল পৌঁছানো এবং ট্র্যাকিং আপডেট প্রদান।
• প্রতারণামূলক লেনদেন রোধ এবং নিরাপদ কেনাকাটা নিশ্চিতকরণ।

৩. বিক্রেতা ও কুরিয়ারের সাথে তথ্য আদান-প্রদান
অর্ডার ডেলিভারির স্বার্থে আপনার নাম, ঠিকানা ও ফোন নম্বর শুধুমাত্র সংশ্লিষ্ট বিক্রেতা এবং দায়িত্বপ্রাপ্ত কুরিয়ার কোম্পানির সাথে শেয়ার করা হয়। কোনো অবস্থাতেই বাণিজ্যিক প্রচারের উদ্দেশ্যে এই তথ্য অন্য কারও কাছে বিক্রি বা ভাড়া দেওয়া হয় না।

৪. আর্থিক তথ্যের নিরাপত্তা
অ্যারাইজ স্টোর কখনোই গ্রাহকের বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টের পিন (PIN) বা ওটিপি (OTP) সংগ্রহ বা সংরক্ষণ করে না। সকল আর্থিক লেনদেন সরাসরি নিরাপদ মোবাইল ব্যাংকিং চ্যানেলে সম্পন্ন হয়।

৫. গ্রাহক অধিকার
আপনার সংরক্ষিত তথ্যের কোনো সংশোধন বা অনুসন্ধানের প্রয়োজন হলে সরাসরি আমাদের সাপোর্ট টিমে (support@arisesell.com) যোগাযোগ করতে পারেন।`
  },
  about: {
    en: `Welcome to Arise Store — Bangladesh's modern, unified multi-vendor commerce marketplace powered by AriseSell.

1. Who We Are
Arise Store originated as a verified destination for digital tools, software licenses, and productivity assets. Today, Arise Store has evolved into a comprehensive multi-category marketplace hosting independent sellers and artisan brands across Bangladesh. From modern fashion, leather footwear, and lifestyle essentials to technology accessories and digital products, Arise Store brings independent commerce into one cohesive, beautifully designed storefront.

2. Powered by AriseSell
Every merchant on Arise Store operates through AriseSell — an advanced merchant operating engine providing live inventory management, direct carrier courier integrations, transparent order tracking, and flexible payment processing. This ensures that every order you place is synced in real-time directly with the seller's actual stock and fulfillment pipeline.

3. Our Core Pillars
• Direct Support for Independent Businesses: When you shop on Arise Store, your purchase directly supports independent creators, local entrepreneurs, and growing retail brands.
• Transparent Pricing & Real Stock: No inflated discounts, fake countdowns, or phantom products. All prices, stock levels, and delivery charges are source-owned and transparent.
• Buyer Security & Clear Tracking: With courier integration, SMS/WhatsApp order status, and clear payment verification, you always know the status of your purchase.

4. Join Our Marketplace
Are you an independent seller or creator? Launch your store effortlessly on AriseSell and showcase your catalog to buyers across the country. Visit "Open your shop" to get started today.`,
    bn: `অ্যারাইজ স্টোরে (Arise Store) স্বাগতম — AriseSell প্রযুক্তিতে পরিচালিত বাংলাদেশের আধুনিক মাল্টি-ভেন্ডার ই-কমার্স মার্কেটপ্লেস।

১. আমাদের পরিচয়
অ্যারাইজ স্টোরের যাত্রা শুরু হয়েছিল ডিজিটাল সফটওয়্যার লাইসেন্স ও টেকনোলজি সমাধানের মাধ্যমে। বর্তমানে অ্যারাইজ স্টোর বাংলাদেশের স্বাধীন বিক্রেতা, বুটিক ও ব্র্যান্ডগুলোর জন্য একটি উন্মুক্ত মাল্টি-ক্যাটাগরি মার্কেটপ্লেসে রূপান্তরিত হয়েছে। ফ্যাশন, জুতো, ইলেকট্রনিক্স, দৈনন্দিন লাইফস্টাইল পণ্য থেকে শুরু করে ডিজিটাল সামগ্রী—সবকিছুই এখন এক ঠিকানায় সহজ ও নির্ভরযোগ্যভাবে পাওয়া যায়।

২. AriseSell এর প্রযুক্তি
অ্যারাইজ স্টোরের প্রতিটি শপ AriseSell সিস্টেমের সাথে সরাসরি যুক্ত। এর ফলে পণ্যের লাইভ স্টক, কুরিয়ার ট্র্যাকিং, বিক্রেতার নিজস্ব পেমেন্ট মেথড এবং স্বচ্ছ ডেলিভারি চার্জ স্বয়ংক্রিয়ভাবে সিঙ্ক থাকে।

৩. আমাদের মূল লক্ষ্য
• স্বাধীন উদ্যোক্তাদের ক্ষমতায়ন: অ্যারাইজ স্টোরে কেনাকাটার মাধ্যমে আপনি সরাসরি দেশীয় উদ্যোক্তা ও স্বাধীন ব্র্যান্ডগুলোকে উৎসাহিত করছেন।
• শতভাগ স্বচ্ছতা: কোনো কৃত্রিম ডিসকাউন্ট বা ফেক স্টক নয়; বিক্রেতার মূল মূল্য এবং বাস্তব স্টক প্রদর্শিত হয়।
• নিরাপদ কেনাকাটা: স্বচ্ছ অর্ডার ট্র্যাকিং ও কুরিয়ার ডেলিভারি নিশ্চিতকরণ।

৪. বিক্রেতা হিসেবে যুক্ত হোন
আপনি কি একজন স্বাধীন ব্যবসায়ী বা পণ্যের প্রস্তুতকারক? AriseSell-এ আপনার শপ খুলে আজই যুক্ত হোন আমাদের মার্কেটপ্লেসে।`
  },
  contact: {
    en: `We are here to help you have the best possible shopping experience on Arise Store.

1. Product & Order Inquiries (Contact the Seller Directly)
Because products are sold and fulfilled by independent merchants, the quickest way to resolve questions regarding item sizing, material details, delivery status, or parcel tracking is to contact the shop owner directly:
• Check the seller's contact details, phone number, and WhatsApp link displayed on the product page and shop profile.
• You can also click the floating WhatsApp button on any shop or product page for instant communication.

2. Marketplace Platform Support
For platform-level questions, merchant onboarding inquiries, technical support, or unresolved seller disputes:
• Email: support@arisesell.com / contact@arise.store
• Helpline Hours: Saturday to Thursday, 10:00 AM – 8:00 PM (BST)
• Order Tracking: Use the "Track Order" link in the footer with your Order Reference ID.

3. Reporting a Problem
If you suspect an unauthorized listing, fraudulent seller, or copyright infringement, please notify our moderation team immediately via support@arisesell.com.`,
    bn: `অ্যারাইজ স্টোরে আপনার কেনাকাটা নিরাপদ ও নির্বিঘ্ন রাখতে আমাদের টিম সর্বদা প্রস্তুত।

১. পণ্য ও অর্ডার সংক্রান্ত তথ্য (সরাসরি বিক্রেতার সাথে যোগাযোগ)
যেহেতু পণ্যগুলো স্বাধীন বিক্রেতাদের নিজস্ব শপ থেকে সরাসরি সরবরাহ করা হয়, তাই পণ্যের সাইজ, ফেব্রিক, ডেলিভারি বা ট্র্যাকিং সংক্রান্ত যেকোনো তথ্যের জন্য সরাসরি বিক্রেতার সাথে যোগাযোগ করুন:
• প্রতিটি শপ ও প্রোডাক্ট পেজে বিক্রেতার ফোন ও হোয়াটসঅ্যাপ লিংক দেওয়া রয়েছে।
• দ্রুত যোগাযোগের জন্য পেজের নিচে থাকা ভাসমান হোয়াটসঅ্যাপ (WhatsApp) বাটনে ক্লিক করতে পারেন।

২. অ্যারাইজ স্টোর প্ল্যাটফর্ম সাপোর্ট
প্ল্যাটফর্ম সংক্রান্ত কোনো জিজ্ঞাসা, নতুন শপ খোলা, টেকনিক্যাল সমস্যা বা বিক্রেতার সাথে কোনো বিরোধ নিষ্পত্তির জন্য:
• ইমেইল: support@arisesell.com / contact@arise.store
• হেল্পলাইন সময়: শনিবার থেকে বৃহস্পতিবার, সকাল ১০:০০ টা থেকে রাত ৮:০০ টা পর্যন্ত।
• অর্ডার ট্র্যাক: ফুটারের "অর্ডার ট্র্যাক" লিংকে গিয়ে আপনার রেফারেন্স আইডি দিয়ে বর্তমান অবস্থা দেখতে পারেন।`
  }
};
