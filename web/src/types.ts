export type Variant = {
  id: string;
  name: string;
  price: string;
  stock: number;
};
export type Product = {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  variants: Variant[];
  currency: string;
  delivery_mode: "automatic" | "manual";
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
  id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string;
  cover_url: string;
  support: string;
  published: boolean;
  payment_methods?: string[];
  tagline?: string;
  social_links?: ShopSocialLinks;
  contact?: ShopContact;
};
export type Catalog = { shops: Shop[]; products: Product[]; synced_at: string };
export type User = { id: string; name: string; email: string; admin: boolean };
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
    unit_price?: string;
    subtotal?: string;
    discount?: string;
    coupon_code?: string | null;
    total: string;
    name: string;
    variant: string;
    quantity: number;
    digital_config: {
      purchase_terms: string;
      delivery_note: string;
      delivery_mode: string;
    };
  };
};
export type Purchase = {
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
