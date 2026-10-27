export const shopPageSections = [
  { key: "privacy", title: "Privacy policy", titleBn: "গোপনীয়তা নীতি", hint: "Explain what customer information you collect and how you use it." },
  { key: "returns", title: "Returns & refund policy", titleBn: "রিটার্ন ও রিফান্ড নীতি", hint: "Explain when customers can request a return, refund or replacement and how to request one." },
  { key: "terms", title: "Terms & conditions", titleBn: "নিয়ম ও শর্তাবলী", hint: "Describe the conditions customers should read before buying from your shop." },
  { key: "about", title: "About us", titleBn: "আমাদের সম্পর্কে", hint: "Tell customers about your shop and the products you sell." },
  { key: "contact", title: "Contact us", titleBn: "যোগাযোগ করুন", hint: "Share your support channels, contact details and working hours." },
] as const;

export type ShopPageSectionKey = typeof shopPageSections[number]["key"];

export const defaultPlatformPolicies: Record<string, { en: string; bn: string }> = {
  terms: {
    en: `Welcome to Arise Store. By accessing, browsing, or purchasing from our marketplace, you agree to comply with and be bound by the following Terms & Conditions.

1. Marketplace Intermediary Role
Arise Store is an independent multi-vendor technology platform and online marketplace powered by AriseSell. We provide digital storefront infrastructure, catalog discovery, and order management tools connecting independent merchant shops ("Sellers") with shoppers ("Buyers"). Arise Store operates solely as an intermediary and is not the manufacturer, owner, stockist, or direct seller of third-party products.

2. Independent Seller Responsibility
Each shop on Arise Store operates as an independent business. The respective merchant shop is solely responsible for:
• Accuracy of product listings, specifications, sizes, colors, images, and pricing.
• Product authenticity, condition, quality, and compliance with applicable standards.
• Packaging, courier dispatch, fulfillment, and honoring any manufacturer or seller warranties stated on their listings.

3. Pricing, Orders & Payments
• All product prices, discounts, and delivery charges are set directly by the respective merchant shop in Bangladeshi Taka (BDT).
• Placing an order constitutes a direct commercial agreement between the buyer and the seller.
• Accepted payment methods include Cash on Delivery (COD) and direct mobile financial services (bKash, Nagad, Rocket).
• When advance payment (such as courier delivery charges or partial advance) is requested for Cash on Delivery orders, the buyer transfers funds directly to the seller's verified mobile account and submits the Transaction ID (TrxID) for verification.
• Arise Store does not collect, hold, or escrow customer transaction funds directly.

4. Shipping & Delivery of Physical Goods
• Physical items are dispatched by each seller using licensed third-party courier services across Bangladesh (e.g., Steadfast, Pathao, RedX, Sundarban, etc.).
• Delivery timeframes are estimated and subject to courier schedules and regional transit conditions.
• Customers must provide an accurate recipient name, complete delivery address, and active Bangladeshi mobile number.

5. Digital Products & Software Licenses
• Digital items, software licenses, game keys, and subscription credentials are delivered according to the seller's stated fulfillment mode (instant or manual).
• Buyers must verify device compatibility before purchase. Resale or unauthorized sharing of single-user digital licenses is strictly prohibited.

6. Limitation of Liability & Disclaimers
To the maximum extent permitted by the laws of Bangladesh:
• Arise Store is not liable for indirect, incidental, punitive, or consequential damages resulting from transactions between buyers and third-party sellers.
• Arise Store does not warrant that product descriptions or seller representations are free from error.
• In any event, Arise Store's aggregate liability relating to marketplace platform technology shall not exceed the platform service fee (if any) collected for the specific transaction.

7. Buyer Protection & Dispute Resolution
Arise Store is committed to maintaining a safe, transparent marketplace. If a buyer encounters fraudulent activity, non-delivery, counterfeit goods, or an unresponsive seller, they may report the shop via the "Report Product" or platform support channels. Arise Store reserves the right to investigate, mediate, suspend, or terminate non-compliant seller accounts.

8. Fair Use & Prohibited Activities
Fraudulent orders, abusive behavior, submission of fake TrxIDs, harassment of sellers or courier agents, and unlawful commercial activities are strictly prohibited and subject to legal action under the Cyber Security / Digital Security regulations of Bangladesh.`,
    bn: `অ্যারাইজ স্টোর (Arise Store)-এ আপনাকে স্বাগতম। আমাদের মার্কেটপ্লেস ব্রাউজ, ব্যবহার বা কোনো পণ্য ক্রয়ের মাধ্যমে আপনি নিচের নিয়ম ও শর্তাবলীর সাথে সম্পূর্ণভাবে সম্মত হচ্ছেন।

১. মার্কেটপ্লেস মধ্যস্থতাকারী ভূমিকা (Marketplace Intermediary Role)
অ্যারাইজ স্টোর একটি আধুনিক মাল্টি-ভেন্ডার ই-কমার্স প্রযুক্তি প্ল্যাটফর্ম (Powered by AriseSell)। আমরা স্বাধীন উদ্যোক্তা ও বিক্রেতাদের (Seller) সাথে ক্রেতাদের (Buyer) সংযোগ স্থাপনকারী মাধ্যম হিসেবে কাজ করি। অ্যারাইজ স্টোর প্ল্যাটফর্মে প্রদর্শিত পণ্যের সরাসরি প্রস্তুতকারক, মালিক বা মজুদদার নয়; সকল পণ্য স্বাধীন মার্চেন্টদের দ্বারা পরিচালিত, সংরক্ষিত ও সরবরাহিত হয়।

২. বিক্রেতার একক দায়িত্ব ও পণ্য বিবরণ
মার্কেটপ্লেসের প্রতিটি শপ নিজস্ব পরিচালনায় পরিচালিত হয়। পণ্যের সঠিক বিবরণ, মান, স্পেসিফিকেশন, সাইজ, রঙ, মেয়াদ, ওয়ারেন্টি ও স্টক ব্যবস্থাপনার সার্বিক দায়িত্ব সংশ্লিষ্ট বিক্রেতার। বিক্রেতার অসত্য বা অসম্পূর্ণ বিবরণের জন্য অ্যারাইজ স্টোর দায়ী থাকবে না।

৩. মূল্য নির্ধারণ, অর্ডার ও পেমেন্ট পদ্ধতি
• পণ্যের মূল্য ও ডেলিভারি চার্জ সংশ্লিষ্ট বিক্রেতা কর্তৃক বাংলাদেশি টাকায় (BDT) নির্ধারিত হয়।
• অর্ডার প্রদানের মাধ্যমে ক্রেতা ও বিক্রেতার মধ্যে সরাসরি ক্রয়-বিক্রয় চুক্তি সম্পাদিত হয়।
• পেমেন্ট পদ্ধতির মধ্যে ক্যাশ অন ডেলিভারি (COD) এবং মোবাইল ব্যাংকিং (বিকাশ, নগদ, রকেট) অন্তর্ভুক্ত।
• ক্যাশ অন ডেলিভারি অর্ডারে কুরিয়ার ডেলিভারি চার্জ বা আংশিক অগ্রিম (Advance) প্রযোজ্য হলে, ক্রেতা সরাসরি বিক্রেতার অনুমোদিত নম্বরে টাকা পাঠিয়ে TrxID প্রদান করবেন।
• অ্যারাইজ স্টোর গ্রাহকদের পেমেন্টের টাকা সরাসরি নিজের একাউন্টে জমা বা এসক্রো হিসেবে ধারণ করে না।

৪. ফিজিক্যাল পণ্যের ডেলিভারি ও শিপিং
• ফিজিক্যাল পণ্যসমূহ বিক্রেতারা অনুমোদিত কুরিয়ার সার্ভিসের (যেমন: Steadfast, Pathao, RedX, সুন্দরবন কুরিয়ার ইত্যাদি) মাধ্যমে ক্রেতার ঠিকানায় প্রেরণ করেন।
• ডেলিভারির সময়সীমা কুরিয়ারের স্বাভাবিক কার্যক্রম ও আঞ্চলিক পরিস্থিতির উপর নির্ভরশীল।
• সঠিক ডেলিভারি নিশ্চিত করতে ক্রেতাকে সঠিক নাম, পূর্ণাঙ্গ ঠিকানা ও সচল মোবাইল নম্বর প্রদান করতে হবে।

৫. ডিজিটাল পণ্য ও সফটওয়্যার লাইসেন্স
• ডিজিটাল সফটওয়্যার কি, ভাউচার ও সাবস্ক্রিপশন ক্রেতার নিকট বিক্রেতার নির্ধারিত পদ্ধতিতে পৌঁছানো হয়।
• কেনার আগে সফটওয়্যার বা সার্ভিসের নিয়মাবলী জেনে নেওয়া ক্রেতার দায়িত্ব। ডিজিটাল অ্যাক্সেসের অপব্যবহার বা অননুমোদিত পুনর্বিক্রয় নিষিদ্ধ।

৬. প্ল্যাটফর্মের দায়বদ্ধতার সীমাবদ্ধতা (Limitation of Liability)
ক্রেতা ও বিক্রেতার মধ্যকার লেনদেন, কুরিয়ারের পার্সেল সংক্রান্ত বিলম্ব, বা পণ্যের কোনো ত্রুটিজনিত পরোক্ষ ক্ষতির জন্য প্ল্যাটফর্ম কর্তৃপক্ষ আইনগতভাবে দায়ী থাকবে না। তবে প্ল্যাটফর্মে কোনো প্রতারণামূলক কার্যকলাপের প্রমাণ পেলে অ্যারাইজ স্টোর সংশ্লিষ্ট বিক্রেতার শপ ও পণ্য তাৎক্ষণিকভাবে স্থগিত বা বাতিল করার পূর্ণ অধিকার সংরক্ষণ করে।

৭. ক্রেতা সুরক্ষা ও অভিযোগ প্রতিকার
কোনো পণ্য বা বিক্রেতার বিষয়ে প্রতারণা বা অনিয়মের অভিযোগ থাকলে ক্রেতা সরাসরি "রিপোর্ট প্রোডাক্ট" অপশন ব্যবহার করে বা প্ল্যাটফর্ম সাপোর্টে অভিযোগ জানাতে পারেন। অ্যারাইজ স্টোর নিরপেক্ষ তদন্ত ও ব্যবস্থা গ্রহণ করবে।

৮. নিষিদ্ধ কার্যক্রম ও আইনের বাধ্যবাধকতা
ভুয়া অর্ডার প্রদান, জাল TrxID সাবমিট করা, বিক্রেতা বা কুরিয়ার কর্মীদের সাথে অসদাচরণ করা ডিজিটাল নিরাপত্তা আইন অনুযায়ী দণ্ডনীয় অপরাধ।`
  },

  returns: {
    en: `At Arise Store, we strive to ensure a fair, transparent, and trustworthy shopping experience across all independent shops on our marketplace. Please review our Returns & Refund Policy carefully.

1. Merchant-Managed Returns & Refunds
Each independent shop on Arise Store fulfills its own orders. Returns, replacements, and refunds are managed directly by the respective merchant shop in accordance with their shop policy and Bangladesh Consumer Rights Protection regulations.

2. Physical Goods Inspection & Reporting Window
• Customers must inspect their parcel immediately upon receiving it from the delivery courier.
• In case of a defective, damaged, incorrect item, or missing parts, the customer must notify the seller or submit a dispute within 48 hours of delivery.
• Mandatory Unboxing Evidence: We strongly advise recording an uninterrupted video while opening the courier package. This serves as critical evidence for damaged, wrong, or missing item claims.

3. Eligibility for Return & Replacement
To qualify for an exchange or return:
• The product must be unused, unwashed, unaltered, and returned in its original packaging with all tags, labels, manuals, and accessories intact.
• Non-Returnable Items: Perishable goods, personal hygiene items, intimate apparel, customized/personalized items, and clearance items marked as non-returnable cannot be returned unless sent in error by the seller.

4. Return Shipping & Advance Payment Refunds
• Seller Error: If an incorrect, damaged, or significantly non-conforming item was delivered, the seller covers return shipping and must provide a replacement or full refund.
• Change of Mind: Where a seller accepts returns for personal preference (e.g., size change), return shipping charges may be borne by the customer.
• Advance Payment Refund: If an order is cancelled by the seller before dispatch or cannot be fulfilled, the seller must refund any advance payment within 5-7 business days via the original payment channel (bKash/Nagad/Bank).
• Return Inspection: Once the returned item reaches the seller and passes physical inspection, the refund or replacement will be processed within 5-7 business days.

5. Digital Products & Software Licenses
Due to the digital and instantly redeemable nature of software keys and digital credentials:
• Digital products are generally non-refundable once the activation key or account credential has been delivered.
• If an activation key is provably invalid, expired, or non-functional upon delivery, the customer must report it within 24 hours. The seller will verify and issue a working replacement or full refund.

6. Dispute Escalation & Platform Assistance
If a seller is unresponsive, unfairly refuses a valid return, or fails to issue an approved refund, buyers can escalate the issue through the "My Purchases" page or email support@arisesell.com. Arise Store will intervene to protect the buyer and take disciplinary action against defaulting sellers.`,
    bn: `অ্যারাইজ স্টোর-এ ক্রেতাদের স্বচ্ছ ও সুরক্ষিত কেনাকাটার অভিজ্ঞতা নিশ্চিত করতে একটি নিয়মতান্ত্রিক রিটার্ন ও রিফান্ড নীতিমালা অনুসরণ করা হয়।

১. বিক্রেতা-ভিত্তিক রিটার্ন ও রিফান্ড
অ্যারাইজ স্টোরের প্রতিটি স্বাধীন শপ নিজস্ব রিটার্ন ও রিফান্ড পলিসি পরিচালনা করে। পণ্য ফেরত, পরিবর্তন বা টাকা ফেরতের আবেদন সংশ্লিষ্ট বিক্রেতার মাধ্যমে বাস্তবায়িত হয়।

২. পণ্য গ্রহণ ও ত্রুটি রিপোর্ট করার সময়সীমা
• কুরিয়ার থেকে পার্সেল গ্রহণের পর অনতিবিলম্বে পণ্যটি পরীক্ষা করুন।
• যদি পণ্যটি ভাঙা, ত্রুটিপূর্ণ, নষ্ট বা ভুল মডেলের হয়ে থাকে, তবে ডেলিভারি পাওয়ার সর্বোচ্চ ৪৮ ঘণ্টার মধ্যে বিক্রেতা বা সাপোর্ট টিমে অভিযোগ জানাতে হবে।
• আনবক্সিং ভিডিও প্রমাণ: পার্সেল খোলার সময় একটি নিরবচ্ছিন্ন ভিডিও ধারণ করার পরামর্শ দেওয়া হচ্ছে। কোনো ত্রুটি বা ভুল পণ্যের ক্ষেত্রে এই ভিডিওটি মূল প্রমাণ হিসেবে বিবেচিত হবে।

৩. রিটার্নের সাধারণ শর্তাবলী
• পণ্যটি অবশ্যই অব্যবহৃত, অক্ষত এবং আসল প্যাকেজিং, ট্যাগ ও এক্সেসরিজসহ থাকতে হবে।
• ব্যক্তিগত ব্যবহারের জিনিসপত্র (যেমন অন্তর্বাস, কসমেটিক্স, হাইজিন প্রোডাক্ট) বা কাস্টমাইজড পণ্য ত্রুটিহীন থাকলে ফেরতযোগ্য নয়।

৪. অগ্রিম টাকা ও রিফান্ড প্রক্রিয়া
• যদি বিক্রেতা পণ্য ডেলিভারি দিতে ব্যর্থ হন বা ডেলিভারির পূর্বে অর্ডার বাতিল করা হয়, তবে ক্রেতার প্রদত্ত অগ্রিম টাকা ৫-৭ কার্যদিবসের মধ্যে যে মাধ্যমে টাকা পাঠানো হয়েছিল (বিকাশ/নগদ/ব্যাংক) সে মাধ্যমেই ফেরত দেওয়া হবে।
• বিক্রেতার ভুলের কারণে (ভুল বা ভাঙা পণ্য) রিটার্ন হলে কুরিয়ার খরচ বিক্রেতা বহন করবেন।
• রিটার্নকৃত পণ্য বিক্রেতার নিকট পৌঁছানোর পর যাচাই শেষ করে ৫-৭ কার্যদিবসের মধ্যে রিফান্ড বা রিপ্লেসমেন্ট প্রদান করা হবে।

৫. ডিজিটাল পণ্য ও লাইসেন্সের ক্ষেত্রে
ডিজিটাল লাইসেন্স কি, সফটওয়্যার বা সাবস্ক্রিপশন ডেলিভারি হওয়ার পর সাধারণত তা ফেরতযোগ্য নয়। তবে ডেলিভারির সময় কি (Key) অকার্যকর বা মেয়াদোত্তীর্ণ প্রমাণিত হলে ২৪ ঘণ্টার মধ্যে জানালে বিক্রেতা নতুন সচল কি বা রিফান্ড প্রদান করবেন।

৬. প্ল্যাটফর্ম বিরোধ নিষ্পত্তি
কোনো বিক্রেতা যদি ন্যায্য রিটার্ন বা রিফান্ডে অনীহা দেখান, তবে ক্রেতা "মাই পারচেজ" থেকে রিপোর্ট করতে পারবেন। প্ল্যাটফর্ম কর্তৃপক্ষ ক্রেতার স্বার্থ সুরক্ষায় যথাযথ ব্যবস্থা গ্রহণ করবে।`
  },

  privacy: {
    en: `Your privacy is of paramount importance to Arise Store. This Privacy Policy explains how we collect, use, store, and safeguard your personal information when you use our marketplace platform.

1. Information We Collect
When you browse, search, or place orders on Arise Store, we may collect:
• Customer Identity & Contact Data: Full name, phone number, email address, and order notes.
• Delivery Details: Shipping address, city/division, and district for courier logistics.
• Transaction References: Order references, chosen payment provider (bKash, Nagad, COD), and customer-submitted Transaction IDs (TrxID) for verification.
• Device & Technical Data: Browser type, operating system, IP address, and session timestamps to ensure security, prevent fraud, and optimize browsing speed.

2. How We Use Your Information
We collect and use your data strictly for legitimate operational purposes:
• Processing, confirming, and updating your purchases and quotes.
• Providing essential delivery details to the merchant shop and courier service delivering your parcel.
• Facilitating real-time order tracking, delivery status SMS, and payment confirmation.
• Detecting, preventing, and mitigating fraudulent transactions or platform abuse.

3. Sharing with Third Parties
• Independent Sellers: Your name, delivery address, and phone number are shared solely with the shop fulfilling your order.
• Courier Partners: Necessary shipping details are provided to licensed courier services (e.g., Steadfast, Pathao) solely for parcel delivery.
• Legal Obligations: We may disclose data if required by law enforcement or competent judicial authorities of Bangladesh.
• We NEVER sell, rent, lease, or monetize customer personal data to third-party advertising or telemarketing networks.

4. Financial Data Protection
Arise Store does NOT store or collect your mobile financial service PINs, OTPs, bank passwords, or debit/credit card CVV codes. All payments are conducted through external official apps (bKash, Nagad) or direct merchant accounts.

5. Data Security Standards
We implement industry-standard encryption (HTTPS/TLS), HttpOnly cookies, and strict CSRF tokens to protect your sessions and order history against unauthorized access.

6. Your Rights & Inquiries
You may review your order history at any time via "My Purchases" or request data corrections by contacting our privacy desk at privacy@arisesell.com.`,
    bn: `অ্যারাইজ স্টোর আপনার ব্যক্তিগত তথ্যের গোপনীয়তা ও সুরক্ষায় প্রতিশ্রুতিবদ্ধ। এই নীতিমালায় আমরা ব্যাখ্যা করছি কীভাবে আপনার তথ্য সংগৃহীত, ব্যবহৃত ও সুরক্ষিত হয়।

১. আমরা কী কী তথ্য সংগ্রহ করি
আমাদের প্ল্যাটফর্মে কেনাকাটার সময় আমরা নিম্নোক্ত তথ্যসমূহ সংগ্রহ করে থাকি:
• যোগাযোগের তথ্য: গ্রাহকের পূর্ণ নাম, সক্রিয় মোবাইল নম্বর, ইমেইল ঠিকানা (ঐচ্ছিক)।
• ডেলিভারির ঠিকানা: ফিজিক্যাল পণ্য কুরিয়ারে পৌঁছানোর জন্য গ্রাহকের জেলা, থানা ও পূর্ণাঙ্গ ডেলিভারি ঠিকানা।
• লেনদেনের রেফারেন্স: পেমেন্ট মেথড (বিকাশ/নগদ/সিওডি), অর্ডার আইডি ও ট্রানজাকশন আইডি (TrxID)।
• প্রযুক্তিগত তথ্য: ব্রাউজার ও ডিভাইসের তথ্য, আইপি অ্যাড্রেস যা প্ল্যাটফর্মের নিরাপত্তা বজায় রাখা ও প্রতারণা রোধে সহায়ক।

২. তথ্যের ব্যবহার
সংগৃহীত তথ্য শুধুমাত্র নিম্নোক্ত উদ্দেশ্যে ব্যবহৃত হয়:
• অর্ডার প্রসেসিং ও পণ্য ডেলিভারি সম্পন্ন করা।
• অর্ডার ট্র্যাকিং এবং ডেলিভারি সংক্রান্ত প্রয়োজনীয় আপডেট প্রদান করা।
• পেমেন্ট ভেরিফিকেশন ও গ্রাহক সেবা নিশ্চিত করা।
• প্ল্যাটফর্মের নিরাপত্তা নিশ্চিত করা ও জালিয়াতি রোধ করা।

৩. তথ্য আদান-প্রদান
• সংশ্লিষ্ট বিক্রেতা ও কুরিয়ার: শুধুমাত্র যে বিক্রেতার কাছ থেকে পণ্য কিনছেন, তাকে এবং ডেলিভারির কাজে নিয়োজিত কুরিয়ার সংস্থাকে (যেমন: Steadfast, Pathao) পার্সেল পৌঁছে দেওয়ার জন্য আপনার নাম, ঠিকানা ও ফোন নম্বর সরবরাহ করা হয়।
• কোনো অবস্থাতেই আমরা গ্রাহকের ব্যক্তিগত তথ্য তৃতীয় কোনো বিপণন বা বিজ্ঞাপনী সংস্থার কাছে বিক্রি বা অপব্যবহার করি না।

৪. আর্থিক তথ্যের নিরাপত্তা
অ্যারাইজ স্টোর কখনোই আপনার বিকাশ/নগদ পিন, পাসওয়ার্ড বা ওটিপি সংগ্রহ বা সংরক্ষণ করে না। সকল পেমেন্ট সরাসরি মোবাইল ওয়ালেটের মাধ্যমে সম্পন্ন হয়।

৫. তথ্যের সুরক্ষা
আমরা আধুনিক এনক্রিপশন ও সাইবার সিকিউরিটি মানদণ্ড বজায় রেখে গ্রাহকের ডাটা সুরক্ষিত রাখি।`
  },

  about: {
    en: `Welcome to Arise Store — Bangladesh's modern, transparent multi-vendor marketplace connecting you directly with verified independent merchant shops, fashion brands, and digital creators.

Powered by the AriseSell commerce ecosystem, Arise Store empowers passionate local shop owners and entrepreneurs while offering shoppers a secure, unified browsing and checkout experience for both physical lifestyle products and digital goods.

What Defines Arise Store:
• Direct-from-Merchant Shopping: Discover independent stores from across Bangladesh. Every purchase directly supports genuine local entrepreneurs and growing brands.
• Multi-Category Variety: Explore diverse collections — trendy footwear, apparel, fashion accessories, electronics, lifestyle goods, productivity software licenses, educational resources, and digital subscriptions.
• Real-Time Order & Delivery Tracking: Seamlessly track physical courier parcels with Steadfast and leading logistics partners, or monitor payment verification steps directly from your orders page.
• Verified Buyer Reviews: Every review published on our marketplace originates exclusively from real customers who placed a verified, delivered purchase.
• Strict Marketplace Standards: We actively monitor shop performance and customer feedback to ensure fair pricing, genuine products, and responsive customer service.

Our Vision:
To foster a trustworthy digital commerce economy in Bangladesh where local businesses thrive independently and customers shop with complete peace of mind.`,
    bn: `অ্যারাইজ স্টোর (Arise Store)-এ আপনাকে স্বাগতম — বাংলাদেশের আধুনিক ও নির্ভরযোগ্য মাল্টি-ভেন্ডার ই-কমার্স মার্কেটপ্লেস।

অ্যারাইজসেল (AriseSell)-এর উন্নত প্রযুক্তি সহায়তায় পরিচালিত অ্যারাইজ স্টোর দেশের শীর্ষস্থানীয় স্বাধীন উদ্যোক্তা, ফ্যাশন ব্র্যান্ড এবং ডিজিটাল নির্মাতাদের সাথে ক্রেতাদের সরাসরি সংযুক্ত করে।

আমাদের বিশেষত্ব:
• স্বাধীন শপ থেকে সরাসরি কেনাকাটা: দেশের যেকোনো প্রান্তের নির্ভরযোগ্য মার্চেন্ট শপ থেকে সহজে পছন্দের পণ্য বেছে নিন।
• বৈচিত্র্যময় পণ্যসম্ভার: প্রিমিয়াম ফ্যাশন, জুতা, পোশাক থেকে শুরু করে সফটওয়্যার লাইসেন্স ও ডিজিটাল সাবস্ক্রিপশন — সবকিছু একই প্ল্যাটফর্মে।
• স্বচ্ছ ও নিরাপদ ডেলিভারি: কুরিয়ার ট্র্যাকিং, ডেলিভারি চার্জের স্বচ্ছতা এবং সরাসরি বিক্রেতার অনুমোদিত একাউন্টে নিরাপদ লেনদেন।
• ভেরিফায়েড রিভিউ: প্রতিটি রিভিউ শুধুমাত্র আসল ক্রেতাদের বাস্তব ক্রয়ের অভিজ্ঞতার ভিত্তিতে প্রকাশিত হয়।
• ক্রেতা সুরক্ষা: বিক্রেতাদের মানদণ্ড নিয়মিত পর্যবেক্ষণ ও মনিটরিং করা হয় যাতে ক্রেতারা পান সর্বোচ্চ সেবা।

আমাদের লক্ষ্য:
বাংলাদেশের ডিজিটাল কমার্সকে আরও নির্ভরযোগ্য, স্বচ্ছ এবং উদ্যোক্তাবান্ধব করে গড়ে তোলা, যেখানে প্রতিটি লেনদেন হয় নিরাপদ ও নির্ভরযোগ্য।`
  },

  contact: {
    en: `We are here to assist you with any inquiries, order updates, or support needs across the Arise Store marketplace.

1. Marketplace Helpdesk & Platform Inquiries
For general marketplace questions, account assistance, technical issues, or reporting seller misconduct:
• Email Support: support@arisesell.com
• Live WhatsApp Support: Click the floating WhatsApp button on the bottom-right of any page to message our support team directly.
• Helpdesk Hours: Saturday to Thursday, 10:00 AM – 10:00 PM (BST).

2. Order, Sizing & Delivery Inquiries (Shop Support)
Because Arise Store is a marketplace of independent merchant shops:
• For questions regarding specific product sizes, colors, material specifications, courier dispatch status, or exchange requests, please contact the specific seller directly.
• You can find each shop's direct phone number, WhatsApp link, and address on their respective Shop Page or by clicking their shop name on any product listing.

3. Merchant Onboarding & Selling on Arise Store
Are you a business owner, manufacturer, or digital creator?
• Launch your own branded storefront on Arise Store in minutes using AriseSell.
• Manage products, payments, stock, and orders with automated courier integrations.
• Click "Open your shop" in the top navigation bar to get started today.`,
    bn: `অ্যারাইজ স্টোরে আপনার কেনাকাটা বা যেকোনো প্রয়োজনে আমরা সহায়তায় প্রস্তুত।

১. প্ল্যাটফর্ম সাপোর্ট ও হেল্পডেস্ক
মার্কেটপ্লেস সংক্রান্ত যেকোনো সাধারণ তথ্য, প্রযুক্তিগত সমস্যা বা অভিযোগের জন্য আমাদের সাথে যোগাযোগ করুন:
• ইমেইল: support@arisesell.com
• লাইভ হোয়াটসঅ্যাপ সাপোর্ট: স্ক্রিনের নিচে ডানপাশে থাকা সবুজ হোয়াটসঅ্যাপ বাটনে ক্লিক করুন।
• হেল্পডেস্ক সময়সূচী: শনিবার থেকে বৃহস্পতিবার, সকাল ১০:০০ টা থেকে রাত ১০:০০ টা।

২. নির্দিষ্ট পণ্য ও ডেলিভারি সম্পর্কিত তথ্য (শপ সাপোর্ট)
যেহেতু অ্যারাইজ স্টোর একটি মাল্টি-ভেন্ডার মার্কেটপ্লেস:
• নির্দিষ্ট পণ্যের সাইজ, স্টক, ডেলিভারি বা এক্সচেঞ্জ সংক্রান্ত যেকোনো তথ্যের জন্য সরাসরি সংশ্লিষ্ট বিক্রেতার সাথে যোগাযোগ করুন।
• প্রতিটি প্রডাক্ট পেজে বিক্রেতার নাম ও শপ পেজে তাদের সরাসরি হোয়াটসঅ্যাপ ও ফোন নম্বর দেওয়া আছে।

৩. বিক্রেতা হিসেবে যুক্ত হতে চান?
আপনি কি আপনার শপ বা পণ্য অ্যারাইজ স্টোরে বিক্রি করতে চান?
• AriseSell-এর মাধ্যমে যুক্ত হয়ে আপনার স্বাধীন শপ চালু করুন এবং খুব সহজেই সারা বাংলাদেশে পণ্য বিক্রি শুরু করুন।
• উপরের মেনুবারে "Open your shop" বাটনে ক্লিক করে আজই শুরু করুন।`
  },
};
