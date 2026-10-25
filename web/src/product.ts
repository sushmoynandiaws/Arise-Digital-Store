import type { Catalog, Product } from "./types";

export const productSections = [
  { id: "overview", label: "Overview" },
  { id: "delivery", label: "Delivery" },
  { id: "terms", label: "Purchase terms" },
] as const;
export type ProductSection = (typeof productSections)[number]["id"];

export function productSection(hash: string): ProductSection {
  return productSections.find((section) => hash === `#product-${section.id}`)?.id || "overview";
}

function nameSlug(name: string) {
  return name.normalize("NFKC").toLowerCase().replace(/['’]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "digital-product";
}

export function productSlug(product: Product, products: Product[]) {
  const slug = nameSlug(product.name);
  const duplicate = products.some((other) => other.id !== product.id &&
    other.shop_id === product.shop_id && nameSlug(other.name) === slug);
  // The reserved separator cannot occur in a name slug, keeping duplicate titles unambiguous.
  return duplicate ? `${slug}~${product.id}` : slug;
}

export function productPath(product: Product, catalog: Catalog) {
  const shop = catalog.shops.find((shop) => shop.id === product.shop_id);
  return shop
    ? `/shops/${encodeURIComponent(shop.slug)}/products/${encodeURIComponent(productSlug(product, catalog.products))}`
    : `/products/${product.id}`;
}

export function productForRoute(catalog: Catalog, route: { id?: string; slug?: string; productSlug?: string }) {
  if (route.id) return catalog.products.find((product) => product.id === route.id);
  const shop = catalog.shops.find((shop) => shop.slug === route.slug);
  return shop && catalog.products.find((product) => product.shop_id === shop.id &&
    productSlug(product, catalog.products) === route.productSlug);
}
