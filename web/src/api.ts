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
  });
  const payload = await response
    .json()
    .catch(() => ({
      error: "The server returned an unreadable response. Please retry.",
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
export function checkoutTotal(price: string, quantity: number): string | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(price) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    return null;
  const [whole, fraction = ""] = price.split(".");
  const total = (Number(whole) * 100 + Number(fraction.padEnd(2, "0"))) * quantity;
  return Number.isSafeInteger(total) ? (total / 100).toFixed(2) : null;
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
  })[value] || "Checking payment";
export const deliveryLabel = (value: string) =>
  ({
    awaiting_payment: "Waiting for payment",
    awaiting_manual: "Seller is preparing your order",
    queued: "Preparing your items",
    sent: "Items ready",
    delivered: "Delivered",
    cancelled: "Cancelled",
    needs_attention: "Seller assistance needed",
    sending: "Preparing your items",
  })[value] || "Preparing your order";
