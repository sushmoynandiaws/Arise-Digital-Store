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
export const paymentLabel = (value: string) =>
  ({
    paid: "Payment verified",
    unpaid: "Waiting for payment",
    pending_verification: "Checking payment",
    review_required: "Payment needs review",
    refunded: "Refunded",
    partially_refunded: "Partially refunded",
  })[value] || "Status unavailable";
export const deliveryLabel = (value: string) =>
  ({
    awaiting_payment: "Waiting for payment",
    awaiting_manual: "Seller is preparing your order",
    queued: "Preparing your items",
    sent: "Ready to access",
    delivered: "Delivered",
    cancelled: "Cancelled",
    needs_attention: "Seller assistance needed",
    sending: "Preparing your items",
  })[value] || "Status unavailable";

export function purchaseMessage(order: Purchase) {
  if (order.payment_status === "refunded")
    return { title: "Payment refunded", description: "This payment was refunded. Contact the seller if you need help with the refund." };
  if (order.payment_status === "partially_refunded")
    return { title: "Payment partially refunded", description: "Part of your payment was refunded. Contact the seller for details." };
  if (order.delivery_status === "cancelled")
    return { title: "Order cancelled", description: "This order is no longer active. Contact the seller if you have already paid." };
  if (order.payment_status === "paid") {
    if (order.ready)
      return { title: "Your order is ready", description: "View your digital items below." };
    if (order.delivery_status === "needs_attention")
      return { title: "Your delivery needs attention", description: "Payment is verified. Contact the seller for an update on your delivery." };
    return order.delivery_mode === "manual" || order.delivery_status === "awaiting_manual"
      ? { title: "Your order is being prepared", description: "Payment is verified. The seller is preparing your digital items." }
      : { title: "Preparing your digital items", description: "Payment is verified. This page updates automatically when your items are ready." };
  }
  if (order.payment && new Date(order.payment.expires_at).getTime() <= Date.now())
    return { title: "Payment request expired", description: "This payment request has expired. Contact the seller if you have already paid." };
  if (order.payment_status === "pending_verification")
    return { title: "Checking your payment", description: "Your transaction ID was submitted. Your payment has not been verified yet. This page updates automatically." };
  if (order.payment_status === "review_required")
    return { title: "Your payment needs review", description: "Your payment has not been verified. Check the transaction details or contact the seller for help." };
  if (order.payment_status === "unpaid")
    return { title: "Complete your payment", description: "Follow the seller’s payment instructions below, then enter your transaction ID to check the payment." };
  return { title: "Payment status unavailable", description: "Refresh this page to check the latest status, or contact the seller for help." };
}
