import type { Purchase } from "./types";

let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...options.headers,
    },
  }).catch(() => {
    throw new Error("Connection lost. Check your internet connection, then refresh this page to check the result before trying again.");
  });
  const payload = await response
    .json()
    .catch(() => ({
      error: "We could not read the response. Refresh this page to check the result before trying again.",
    }));
  if (!response.ok)
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Please check your details and try again.",
    );
  return payload;
}
export const money = (amount: string) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(amount));
export const paymentMethodLabel = (value: string) =>
  ({ bkash: "bKash", nagad: "Nagad", rocket: "Rocket" })[value] || value;
export function checkoutTotal(price: string, quantity: number): string | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(price) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    return null;
  const [whole, fraction = ""] = price.split(".");
  const total = (Number(whole) * 100 + Number(fraction.padEnd(2, "0"))) * quantity;
  return Number.isSafeInteger(total) ? (total / 100).toFixed(2) : null;
}
export function checkoutQuantity(value: string | null): number {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 100 ? quantity : 1;
}
export const stock = (product: { variants: { stock: number }[] }) =>
  product.variants.reduce((total, v) => total + v.stock, 0);
export const minimumPrice = (product: { variants: { price: string }[] }) =>
  product.variants.length
    ? product.variants.reduce(
        (best, v) => (Number(v.price) < Number(best) ? v.price : best),
        product.variants[0].price,
      )
    : "0";
export const paymentLabel = (value: string, lang: string = "en") => {
  if (lang === "bn") {
    return (
      ({
        paid: "পেমেন্ট সম্পন্ন",
        unpaid: "পেমেন্টের অপেক্ষায়",
        pending_verification: "পেমেন্ট যাচাই হচ্ছে",
        review_required: "পর্যালোচনা প্রয়োজন",
        refunded: "রিফান্ড সম্পন্ন",
        partially_refunded: "আংশিক রিফান্ড",
      })[value] || "স্ট্যাটাস পাওয়া যায়নি"
    );
  }
  return (
    ({
      paid: "Payment verified",
      unpaid: "Waiting for payment",
      pending_verification: "Checking payment",
      review_required: "Payment needs review",
      refunded: "Refunded",
      partially_refunded: "Partially refunded",
    })[value] || "Status unavailable"
  );
};

export const deliveryLabel = (value: string, lang: string = "en") => {
  if (lang === "bn") {
    return (
      ({
        awaiting_payment: "পেমেন্টের অপেক্ষায়",
        awaiting_manual: "সেলার অর্ডার প্রস্তুত করছেন",
        queued: "আইটেম তৈরি হচ্ছে",
        sent: "ব্যবহারের জন্য প্রস্তুত",
        delivered: "ডেলিভারি সম্পন্ন",
        cancelled: "বাতিল",
        needs_attention: "সেলারের সহায়তা প্রয়োজন",
        sending: "আইটেম পাঠানো হচ্ছে",
      })[value] || "স্ট্যাটাস পাওয়া যায়নি"
    );
  }
  return (
    ({
      awaiting_payment: "Waiting for payment",
      awaiting_manual: "Seller is preparing your order",
      queued: "Preparing your items",
      sent: "Ready to access",
      delivered: "Delivered",
      cancelled: "Cancelled",
      needs_attention: "Seller assistance needed",
      sending: "Preparing your items",
    })[value] || "Status unavailable"
  );
};

export function purchaseMessage(order: Purchase, lang: string = "en") {
  if (lang === "bn") {
    if (order.payment_status === "refunded")
      return {
        title: "পেমেন্ট রিফান্ড করা হয়েছে",
        description:
          "এই পেমেন্টটি রিফান্ড করা হয়েছে। রিফান্ড সংক্রান্ত কোনো তথ্য জানতে বিক্রেতার সাথে যোগাযোগ করুন।",
      };
    if (order.payment_status === "partially_refunded")
      return {
        title: "পেমেন্ট আংশিক রিফান্ড করা হয়েছে",
        description:
          "আপনার পেমেন্টের কিছু অংশ রিফান্ড করা হয়েছে। বিস্তারিত জানতে বিক্রেতার সাথে যোগাযোগ করুন।",
      };
    if (order.delivery_status === "cancelled")
      return {
        title: "অর্ডার বাতিল করা হয়েছে",
        description:
          "এই অর্ডারটি বর্তমানে বাতিল। আপনি যদি ইতিমধ্যে পেমেন্ট করে থাকেন, তবে বিক্রেতার সাথে যোগাযোগ করুন।",
      };
    if (order.payment_status === "paid") {
      if (order.ready)
        return {
          title: "আপনার অর্ডার প্রস্তুত",
          description: "নিচে আপনার ডিজিটাল আইটেম বা এক্সেস তথ্য দেখুন।",
        };
      if (order.delivery_status === "needs_attention")
        return {
          title: "ডেলিভারির জন্য মনোযোগ প্রয়োজন",
          description:
            "পেমেন্ট যাচাই সম্পন্ন হয়েছে। ডেলিভারির আপডেটের জন্য বিক্রেতার সাথে যোগাযোগ করুন।",
        };
      return order.delivery_mode === "manual" ||
        order.delivery_status === "awaiting_manual"
        ? {
            title: "আপনার অর্ডার তৈরি করা হচ্ছে",
            description:
              "পেমেন্ট যাচাই সম্পন্ন হয়েছে। বিক্রেতা আপনার ডিজিটাল আইটেম প্রস্তুত করছেন।",
          }
        : {
            title: "আপনার ডিজিটাল আইটেম তৈরি হচ্ছে",
            description:
              "পেমেন্ট যাচাই সম্পন্ন হয়েছে। আইটেম প্রস্তুত হওয়া মাত্র পেজটি স্বয়ংক্রিয়ভাবে আপডেট হবে।",
          };
    }
    if (
      order.payment &&
      new Date(order.payment.expires_at).getTime() <= Date.now()
    )
      return {
        title: "পেমেন্টের মেয়াদ শেষ হয়েছে",
        description:
          "এই পেমেন্ট রিকোয়েস্টের মেয়াদ শেষ হয়েছে। আপনি যদি টাকা পাঠিয়ে থাকেন, বিক্রেতার সাথে যোগাযোগ করুন।",
      };
    if (order.payment_status === "pending_verification")
      return {
        title: "পেমেন্ট যাচাই করা হচ্ছে",
        description:
          "আপনার ট্রানজাকশন আইডি (TrxID) জমা হয়েছে। পেমেন্ট যাচাই প্রক্রিয়াধীন। এই পেজটি স্বয়ংক্রিয়ভাবে আপডেট হবে।",
      };
    if (order.payment_status === "review_required")
      return {
        title: "পেমেন্ট পর্যালোচনার প্রয়োজন",
        description:
          "আপনার পেমেন্টটি স্বয়ংক্রিয়ভাবে নিশ্চিত করা যায়নি। ট্রানজাকশন তথ্য মিলিয়ে দেখুন বা বিক্রেতার সাথে যোগাযোগ করুন।",
      };
    if (order.payment_status === "unpaid")
      return {
        title: "পেমেন্ট সম্পন্ন করুন",
        description:
          "নিচে দেওয়া বিক্রেতার নির্দেশনা অনুযায়ী পেমেন্ট করুন, তারপর ট্রানজাকশন আইডি (TrxID) দিয়ে পেমেন্ট যাচাই করুন।",
      };
    return {
      title: "পেমেন্ট স্ট্যাটাস অনুপলব্ধ",
      description:
        "সর্বশেষ তথ্য জানতে পেজটি রিফ্রেশ করুন বা বিক্রেতার সাথে যোগাযোগ করুন।",
    };
  }

  if (order.payment_status === "refunded")
    return {
      title: "Payment refunded",
      description:
        "This payment was refunded. Contact the seller if you need help with the refund.",
    };
  if (order.payment_status === "partially_refunded")
    return {
      title: "Payment partially refunded",
      description:
        "Part of your payment was refunded. Contact the seller for details.",
    };
  if (order.delivery_status === "cancelled")
    return {
      title: "Order cancelled",
      description:
        "This order is no longer active. Contact the seller if you have already paid.",
    };
  if (order.payment_status === "paid") {
    if (order.ready)
      return {
        title: "Your order is ready",
        description: "View your digital items below.",
      };
    if (order.delivery_status === "needs_attention")
      return {
        title: "Your delivery needs attention",
        description:
          "Payment is verified. Contact the seller for an update on your delivery.",
      };
    return order.delivery_mode === "manual" ||
      order.delivery_status === "awaiting_manual"
      ? {
          title: "Your order is being prepared",
          description:
            "Payment is verified. The seller is preparing your digital items.",
        }
      : {
          title: "Preparing your digital items",
          description:
            "Payment is verified. This page updates automatically when your items are ready.",
        };
  }
  if (
    order.payment &&
    new Date(order.payment.expires_at).getTime() <= Date.now()
  )
    return {
      title: "Payment request expired",
      description:
        "This payment request has expired. Contact the seller if you have already paid.",
    };
  if (order.payment_status === "pending_verification")
    return {
      title: "Checking your payment",
      description:
        "Your transaction ID was submitted. Your payment has not been verified yet. This page updates automatically.",
    };
  if (order.payment_status === "review_required")
    return {
      title: "Your payment needs review",
      description:
        "Your payment has not been verified. Check the transaction details or contact the seller for help.",
    };
  if (order.payment_status === "unpaid")
    return {
      title: "Complete your payment",
      description:
        "Follow the seller’s payment instructions below, then enter your transaction ID to check the payment.",
    };
  return {
    title: "Payment status unavailable",
    description:
      "Refresh this page to check the latest status, or contact the seller for help.",
  };
}
