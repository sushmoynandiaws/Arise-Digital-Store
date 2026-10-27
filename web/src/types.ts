export type Variant = {
  pieces_per_set?: number;
  size?: string | null;
  color?: string | null;
  id: string;
  name: string;
  price: string;
  stock: number;
};
export type Product = {
  custom_order?: {revision: string; fields: {id: string; label: string; question: string; type: "text" | "number" | "date" | "select" | "image"; required: boolean; minimum?: number; maximum?: number; options: {label: string; extra_price: string}[]}[]; craft?: {enabled: boolean; allow_mixing: boolean; allow_artwork: boolean; proof_required: boolean; production_days?: number; production_days_to?: number; designs: {code: string; label: string; image_url?: string}[]} | null} | null;
  url_slug?: string;
  id: string;
  shop_id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  variants: Variant[];
  currency: string;
  fulfilment_kind?: "physical" | "digital";
  delivery_mode: "automatic" | "manual" | "shipping";
  payment_methods?: string[];
  checkout_available?: boolean;
  checkout_unavailable_reason?: string;
  delivery_estimate: string;
  delivery_note: string;
  purchase_terms: string;
  required_buyer_fields: string[];
  warranty_type?: "warranty" | "no_warranty";
  warranty_days?: number | null;
  sales_enabled: boolean;
  selected?: boolean;
};
export type ShopSocialLinks = {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
  maps?: string;
  website?: string;
  linkedin?: string;
  youtube?: string;
};

export type ShopContact = {
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city_division?: string;
  postal_code?: string;
};

export type Shop = {
  merchant_badge?: { label: "Top Seller" | "Trusted Shop"; expires_at: number; reviewed: boolean };
  id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string;
  cover_url: string;
  support: string;
  published: boolean;
  kind?: string | null;
  commerce_mode?: "standard" | "digital";
  currency?: string;
  payment_methods?: string[];
  tagline?: string;
  social_links?: ShopSocialLinks;
  contact?: ShopContact;
  pages?: Partial<Record<"privacy" | "returns" | "terms" | "about" | "contact", string>>;
  volume_discount_enabled?: boolean;
  payment_account_types?: Record<string, "merchant" | "personal">;
};
export type Offer = {code: string; title: string; benefit: string; min_spend: string; starts_at: string; expires_at: string; active: boolean; flash: boolean; product_ids: string[]; shop_id?: string};
export type CartLine = {product_id: string; variant_id: string; quantity: number};
export type Catalog = { shops: Shop[]; products: Product[]; offers?: Offer[]; synced_at: string };
export type User = { id: string; name: string; email: string; admin: boolean; admin_role?: string; admin_permissions?: string[] };
export type Session = {
  user: User | null;
  csrf: string;
  demo: boolean;
  source_web: string;
};
export type Quote = {
  draft_id: string;
  quote_hash: string;
  snapshot: {
    items?: {product_id: string; variant_id: string; name: string; variant: string; quantity: number; unit_price: string; digital_config?: {purchase_terms: string; delivery_note: string}}[];
    unit_price?: string;
    subtotal?: string;
    discount?: string;
    coupon_code?: string | null;
    total: string;
    name: string;
    variant: string;
    quantity: number;
    fulfilment_kind?: "physical" | "digital";
    delivery_charge?: string;
    advance_amount?: string;
    buyer?: Record<string, string>;
    digital_config?: {
      purchase_terms: string;
      delivery_note: string;
      delivery_mode: string;
    };
  };
};
export type Purchase = {
  custom_summary?: string[];
  items?: Quote["snapshot"]["items"];
  fulfilment_kind?: "physical" | "digital";
  payment_method?: string;
  delivery_charge?: string;
  address?: string;
  district?: string;
  advance_amount?: string;
  seller_message?: string;
  tracking?: {provider: string; status: string; tracking: string; tracking_url?: string | null; updated_at?: string; poll_delayed?: boolean} | null;
  id: string;
  ref: string;
  shop: Shop;
  name: string;
  quantity: number;
  total: string;
  discount?: string;
  coupon_code?: string | null;
  currency: string;
  payment_status: string;
  delivery_status: string;
  delivery_mode: string;
  delivery_estimate: string;
  created_at: string;
  ready: boolean;
  ready_quantity?: number;
  product_id?: string;
  buyer_name?: string | null;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  buyer_fields?: Record<string, any> | null;
  can_review?: boolean;
  review?: ProductReview | null;
  payment: {
    provider: string;
    account: string;
    amount: string;
    trx_id: string | null;
    expires_at: string;
    account_type?: "merchant" | "personal";
    instructions?: string;
  } | null;
};
export type ProductReview = {
  id: string;
  rating: number;
  display_name: string;
  comment: string;
  created_at: number;
};
export type ProductReviewsPage = {
  count: number;
  average: number | null;
  has_more: boolean;
  reviews: ProductReview[];
};

export type AdPlacementSlot =
  | "home_hero"
  | "top_flash"
  | "sponsored_product"
  | "featured_shop"
  | "sticky_bottom";

export type SponsoredAd = {
  id: string;
  title: string;
  advertiser_name: string;
  target_url: string;
  banner_url?: string;
  badge_text?: string;
  cta_text?: string;
  placement: AdPlacementSlot;
  start_date: string;
  end_date: string;
  price_bdt: number;
  status: "active" | "paused" | "pending_payment";
  impressions: number;
  clicks: number;
  created_at: number;
};
