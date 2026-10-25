import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Megaphone,
  Eye,
  TrendingUp,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  X,
  ExternalLink,
  ArrowRight,
  Star,
  Zap,
} from "./icons.js";
import { useLang } from "./i18n.js";
import { money } from "./api.js";
import type { SponsoredAd, AdPlacementSlot } from "./types.js";

const ADS_STORAGE_KEY = "arise_sponsored_ads_v1";

export const DEFAULT_ADS: SponsoredAd[] = [
  {
    id: "ad-hero-1",
    title: "NordVPN 2-Year Ultimate Security — 70% OFF + 3 Months Free",
    advertiser_name: "CyberSecurity BD",
    target_url: "/products",
    banner_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80",
    badge_text: "Sponsored Deal",
    cta_text: "Claim 70% Discount",
    placement: "home_hero",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    price_bdt: 3500,
    status: "active",
    impressions: 142,
    clicks: 19,
    created_at: Date.now() - 86400000 * 5,
  },
  {
    id: "ad-prod-1",
    title: "Canva Pro Lifetime License with 1-Year Warranty & Instant Delivery",
    advertiser_name: "Creative Studio Pro",
    target_url: "/products",
    banner_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    badge_text: "Featured Ad",
    cta_text: "Order Canva Pro",
    placement: "sponsored_product",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    price_bdt: 2000,
    status: "active",
    impressions: 98,
    clicks: 14,
    created_at: Date.now() - 86400000 * 3,
  },
  {
    id: "ad-flash-1",
    title: "⚡ Flash Offer: Verified Netflix & Spotify Family Slots available at ৳199 only!",
    advertiser_name: "Digital Stream BD",
    target_url: "/shops",
    badge_text: "Sponsored",
    cta_text: "Grab Now",
    placement: "top_flash",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    price_bdt: 1500,
    status: "active",
    impressions: 310,
    clicks: 42,
    created_at: Date.now() - 86400000 * 2,
  },
  {
    id: "ad-shop-1",
    title: "Cloud Software & Dev Hub — Top Rated Digital Vendor on Arise",
    advertiser_name: "Cloud Software",
    target_url: "/shops/cloud-software",
    banner_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80",
    badge_text: "Partner of the Month",
    cta_text: "Explore Store",
    placement: "featured_shop",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    price_bdt: 4000,
    status: "active",
    impressions: 85,
    clicks: 11,
    created_at: Date.now() - 86400000 * 7,
  },
  {
    id: "ad-sticky-1",
    title: "🎁 Limited Promo: Use coupon code 'ARISE10' for 10% instant off on all software purchases!",
    advertiser_name: "Marketplace Sponsor",
    target_url: "/products",
    badge_text: "Special Promo",
    cta_text: "Browse Deals",
    placement: "sticky_bottom",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    price_bdt: 2500,
    status: "active",
    impressions: 430,
    clicks: 58,
    created_at: Date.now() - 86400000 * 1,
  },
];

export function getSponsoredAds(): SponsoredAd[] {
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(DEFAULT_ADS));
      return DEFAULT_ADS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return DEFAULT_ADS;
}

export function saveSponsoredAds(ads: SponsoredAd[]): void {
  try {
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
    window.dispatchEvent(new Event("arise_ads_updated"));
  } catch {}
}

export function getActiveAdsForSlot(
  slot: AdPlacementSlot,
  allAds?: SponsoredAd[],
): SponsoredAd[] {
  const ads = allAds || getSponsoredAds();
  const now = Date.now();
  return ads.filter((ad) => {
    if (ad.placement !== slot || ad.status !== "active") return false;
    if (ad.start_date) {
      const s = new Date(ad.start_date).getTime();
      if (!isNaN(s) && s > now) return false;
    }
    if (ad.end_date) {
      const e = new Date(ad.end_date).getTime() + 86400000;
      if (!isNaN(e) && e < now) return false;
    }
    return true;
  });
}

export function recordAdImpression(adId: string): void {
  try {
    const ads = getSponsoredAds();
    const idx = ads.findIndex((a) => a.id === adId);
    if (idx !== -1) {
      ads[idx].impressions = (ads[idx].impressions || 0) + 1;
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
    }
  } catch {}
}

export function recordAdClick(adId: string): void {
  try {
    const ads = getSponsoredAds();
    const idx = ads.findIndex((a) => a.id === adId);
    if (idx !== -1) {
      ads[idx].clicks = (ads[idx].clicks || 0) + 1;
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
    }
  } catch {}
}

export function useSponsoredAds() {
  const [ads, setAds] = useState<SponsoredAd[]>(getSponsoredAds);

  useEffect(() => {
    const handler = () => setAds(getSponsoredAds());
    window.addEventListener("arise_ads_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("arise_ads_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return { ads, reloadAds: () => setAds(getSponsoredAds()) };
}

/** Home Hero Sponsored Banner */
export function HomeHeroSponsoredAd() {
  const { ads } = useSponsoredAds();
  const activeList = getActiveAdsForSlot("home_hero", ads);
  const ad = activeList[0];

  useEffect(() => {
    if (ad?.id) recordAdImpression(ad.id);
  }, [ad?.id]);

  if (!ad) return null;

  const isExternal = ad.target_url.startsWith("http");

  return (
    <section className="container sponsored-hero-banner-wrap" aria-label="Featured Promotion">
      <div className="sponsored-hero-banner">
        <div className="sponsored-hero-content">
          <div className="sponsored-hero-badges">
            <span className="sponsored-pill gold">
              <Zap size={12} />
              {ad.badge_text || "Sponsored"}
            </span>
            <span className="sponsored-advertiser-label">
              By {ad.advertiser_name}
            </span>
          </div>
          <h2 className="sponsored-hero-title">{ad.title}</h2>
          <div className="sponsored-hero-actions">
            {isExternal ? (
              <a
                href={ad.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="button primary sponsored-cta-btn"
                onClick={() => recordAdClick(ad.id)}
              >
                {ad.cta_text || "Check Deal"}
                <ExternalLink size={16} />
              </a>
            ) : (
              <Link
                to={ad.target_url}
                className="button primary sponsored-cta-btn"
                onClick={() => recordAdClick(ad.id)}
              >
                {ad.cta_text || "Check Deal"}
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
        {ad.banner_url && (
          <div className="sponsored-hero-media" aria-hidden="true">
            <img src={ad.banner_url} alt="" loading="lazy" />
          </div>
        )}
      </div>
    </section>
  );
}

/** Top Flash Sponsored Announcement Pill */
export function TopFlashSponsoredAd() {
  const { ads } = useSponsoredAds();
  const activeList = getActiveAdsForSlot("top_flash", ads);
  const ad = activeList[0];

  useEffect(() => {
    if (ad?.id) recordAdImpression(ad.id);
  }, [ad?.id]);

  if (!ad) return null;

  const isExternal = ad.target_url.startsWith("http");

  return (
    <div className="top-flash-sponsored-bar">
      <div className="container top-flash-inner">
        <span className="sponsored-ad-tag">{ad.badge_text || "Ad"}</span>
        <span className="top-flash-title">{ad.title}</span>
        {isExternal ? (
          <a
            href={ad.target_url}
            target="_blank"
            rel="noopener noreferrer"
            className="top-flash-link"
            onClick={() => recordAdClick(ad.id)}
          >
            {ad.cta_text || "Learn More"} &rarr;
          </a>
        ) : (
          <Link
            to={ad.target_url}
            className="top-flash-link"
            onClick={() => recordAdClick(ad.id)}
          >
            {ad.cta_text || "Learn More"} &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}

/** Sponsored Product Card for Product Grids */
export function SponsoredProductCard() {
  const { ads } = useSponsoredAds();
  const activeList = getActiveAdsForSlot("sponsored_product", ads);
  const ad = activeList[0];

  useEffect(() => {
    if (ad?.id) recordAdImpression(ad.id);
  }, [ad?.id]);

  if (!ad) return null;

  const isExternal = ad.target_url.startsWith("http");

  return (
    <div className="product-card sponsored-product-card">
      <div className="product-art-wrapper sponsored-art-wrapper">
        {ad.banner_url ? (
          <img
            src={ad.banner_url}
            alt={ad.title}
            className="sponsored-card-img"
            loading="lazy"
          />
        ) : (
          <div className="sponsored-card-fallback-art">
            <Zap size={32} />
          </div>
        )}
        <span className="sponsored-card-pill">
          <Star size={12} />
          {ad.badge_text || "Sponsored"}
        </span>
      </div>
      <div className="product-card-body">
        <div className="product-category-row">
          <small className="sponsored-seller-name">{ad.advertiser_name}</small>
        </div>
        <h3 className="product-card-title">{ad.title}</h3>
        <div className="product-card-footer sponsored-card-footer">
          <span className="sponsored-verified-badge">
            <CheckCircle2 size={13} /> Verified Sponsor
          </span>
          {isExternal ? (
            <a
              href={ad.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="button primary small"
              onClick={() => recordAdClick(ad.id)}
            >
              {ad.cta_text || "View"}
            </a>
          ) : (
            <Link
              to={ad.target_url}
              className="button primary small"
              onClick={() => recordAdClick(ad.id)}
            >
              {ad.cta_text || "View"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Featured Shop Spotlight for /shops */
export function FeaturedShopSponsoredAd() {
  const { ads } = useSponsoredAds();
  const activeList = getActiveAdsForSlot("featured_shop", ads);
  const ad = activeList[0];

  useEffect(() => {
    if (ad?.id) recordAdImpression(ad.id);
  }, [ad?.id]);

  if (!ad) return null;

  return (
    <div className="featured-shop-spotlight panel" aria-label="Featured Partner">
      <div className="featured-shop-content">
        <div className="featured-shop-header">
          <span className="sponsored-pill purple">
            <Star size={13} />
            {ad.badge_text || "Featured Partner"}
          </span>
          <span className="featured-advertiser-title">{ad.advertiser_name}</span>
        </div>
        <h3>{ad.title}</h3>
        <Link
          to={ad.target_url}
          className="button primary"
          onClick={() => recordAdClick(ad.id)}
        >
          {ad.cta_text || "Visit Featured Shop"}
          <ArrowRight size={16} />
        </Link>
      </div>
      {ad.banner_url && (
        <div className="featured-shop-art" aria-hidden="true">
          <img src={ad.banner_url} alt="" loading="lazy" />
        </div>
      )}
    </div>
  );
}

/** Sticky Bottom Promo Strip */
export function StickyBottomSponsoredStrip() {
  const { ads } = useSponsoredAds();
  const activeList = getActiveAdsForSlot("sticky_bottom", ads);
  const ad = activeList[0];
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!ad) return;
    try {
      const isDismissed = sessionStorage.getItem(`arise_ad_dismissed_${ad.id}`);
      if (isDismissed) setDismissed(true);
      else recordAdImpression(ad.id);
    } catch {}
  }, [ad?.id]);

  if (!ad || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`arise_ad_dismissed_${ad.id}`, "1");
    } catch {}
  };

  const isExternal = ad.target_url.startsWith("http");

  return (
    <aside className="sticky-bottom-ad-strip" role="complementary" aria-label="Sponsored Announcement">
      <div className="container sticky-bottom-ad-inner">
        <div className="sticky-ad-left">
          <span className="sponsored-pill sm">
            <Zap size={11} />
            {ad.badge_text || "Promo"}
          </span>
          <p className="sticky-ad-title">{ad.title}</p>
        </div>
        <div className="sticky-ad-right">
          {isExternal ? (
            <a
              href={ad.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="button primary small"
              onClick={() => recordAdClick(ad.id)}
            >
              {ad.cta_text || "Claim Offer"}
            </a>
          ) : (
            <Link
              to={ad.target_url}
              className="button primary small"
              onClick={() => recordAdClick(ad.id)}
            >
              {ad.cta_text || "Claim Offer"}
            </Link>
          )}
          <button
            type="button"
            className="sticky-ad-close-btn"
            onClick={handleDismiss}
            aria-label="Dismiss promotion"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Admin Sponsored Ads Management Panel */
export function AdminSponsoredAdsManager() {
  const { ads, reloadAds } = useSponsoredAds();
  const { lang } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    advertiser_name: "",
    target_url: "/products",
    banner_url: "",
    badge_text: "Sponsored",
    cta_text: "View Deal",
    placement: "home_hero" as AdPlacementSlot,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    price_bdt: 2500,
    status: "active" as "active" | "paused" | "pending_payment",
  });

  const totalRevenue = ads.reduce((sum, a) => sum + (Number(a.price_bdt) || 0), 0);
  const activeCount = ads.filter((a) => a.status === "active").length;
  const totalImpressions = ads.reduce((sum, a) => sum + (a.impressions || 0), 0);
  const totalClicks = ads.reduce((sum, a) => sum + (a.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({
      title: "",
      advertiser_name: "",
      target_url: "/products",
      banner_url: "",
      badge_text: "Sponsored",
      cta_text: "View Deal",
      placement: "home_hero",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      price_bdt: 2500,
      status: "active",
    });
    setShowForm(true);
  };

  const handleEdit = (ad: SponsoredAd) => {
    setEditingId(ad.id);
    setForm({
      title: ad.title,
      advertiser_name: ad.advertiser_name,
      target_url: ad.target_url,
      banner_url: ad.banner_url || "",
      badge_text: ad.badge_text || "Sponsored",
      cta_text: ad.cta_text || "View Deal",
      placement: ad.placement,
      start_date: ad.start_date || "",
      end_date: ad.end_date || "",
      price_bdt: ad.price_bdt || 0,
      status: ad.status,
    });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.advertiser_name.trim()) return;

    if (editingId) {
      const updated = ads.map((a) =>
        a.id === editingId
          ? {
              ...a,
              ...form,
            }
          : a,
      );
      saveSponsoredAds(updated);
    } else {
      const newAd: SponsoredAd = {
        id: `ad-${Date.now()}`,
        ...form,
        impressions: 0,
        clicks: 0,
        created_at: Date.now(),
      };
      saveSponsoredAds([newAd, ...ads]);
    }
    setShowForm(false);
    reloadAds();
  };

  const handleToggleStatus = (id: string) => {
    const updated = ads.map((a) =>
      a.id === id
        ? {
            ...a,
            status:
              a.status === "active"
                ? ("paused" as const)
                : ("active" as const),
          }
        : a,
    );
    saveSponsoredAds(updated);
    reloadAds();
  };

  const handleDelete = (id: string) => {
    if (confirm(lang === "bn" ? "এই বিজ্ঞাপনটি মুছে ফেলতে চান?" : "Delete this ad campaign?")) {
      const updated = ads.filter((a) => a.id !== id);
      saveSponsoredAds(updated);
      reloadAds();
    }
  };

  return (
    <section className="panel admin-panel ads-manager-panel" aria-labelledby="ads-manager-title">
      <div className="ads-manager-header">
        <div>
          <span className="eyebrow">Monetization & Promotion</span>
          <h2 id="ads-manager-title">
            {lang === "bn" ? "বিজ্ঞাপন ও স্পন্সরড ক্যাম্পেইন ম্যানেজার" : "Sponsored Ads & Monetization"}
          </h2>
          <p className="muted">
            {lang === "bn"
              ? "বিজ্ঞাপনদাতা ও সেলারদের পেইড ব্যানার, ফ্ল্যাশ ঘোষণা এবং স্পন্সরড প্রোডাক্ট নিয়ন্ত্রণ করুন।"
              : "Manage paid ad campaigns, hero banners, sponsored listings, and track platform earnings."}
          </p>
        </div>
        <button type="button" className="button primary" onClick={handleOpenNew}>
          <Plus size={16} />
          {lang === "bn" ? "+ নতুন ক্যাম্পেইন তৈরি" : "+ Create Ad Campaign"}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="ads-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon gold"><TrendingUp size={20} /></div>
          <div>
            <span className="metric-label">{lang === "bn" ? "মোট অ্যাড রেভিনিউ" : "Ad Revenue"}</span>
            <strong className="metric-value">{money(String(totalRevenue))}</strong>
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-icon purple"><Megaphone size={20} /></div>
          <div>
            <span className="metric-label">{lang === "bn" ? "সক্রিয় ক্যাম্পেইন" : "Active Ads"}</span>
            <strong className="metric-value">{activeCount} / {ads.length}</strong>
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-icon blue"><Eye size={20} /></div>
          <div>
            <span className="metric-label">{lang === "bn" ? "টোটাল ইম্প্রেশন (ভিউ)" : "Impressions"}</span>
            <strong className="metric-value">{totalImpressions.toLocaleString()}</strong>
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-icon green"><Zap size={20} /></div>
          <div>
            <span className="metric-label">{lang === "bn" ? "ক্লিক ও CTR" : "Clicks & CTR"}</span>
            <strong className="metric-value">{totalClicks} ({avgCtr}%)</strong>
          </div>
        </div>
      </div>

      {/* Form Modal / Drawer */}
      {showForm && (
        <div className="ad-form-card panel">
          <div className="ad-form-header">
            <h3>{editingId ? "Edit Ad Campaign" : "Create New Sponsored Ad"}</h3>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSave} className="ad-editor-form">
            <div className="form-grid-2">
              <label className="field">
                Campaign Title *
                <input
                  required
                  placeholder="e.g. NordVPN Eid Mega Sale"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label className="field">
                Advertiser / Shop Name *
                <input
                  required
                  placeholder="e.g. CyberSecurity BD"
                  value={form.advertiser_name}
                  onChange={(e) => setForm({ ...form, advertiser_name: e.target.value })}
                />
              </label>
            </div>

            <div className="form-grid-2">
              <label className="field">
                Placement Slot *
                <select
                  value={form.placement}
                  onChange={(e) => setForm({ ...form, placement: e.target.value as AdPlacementSlot })}
                >
                  <option value="home_hero">1. Home Hero Banner (হোমপেজ প্রিমিয়াম ব্যানার)</option>
                  <option value="top_flash">2. Top Announcement Bar (সাইটের একদম উপরে ফ্ল্যাশ বার)</option>
                  <option value="sponsored_product">3. Sponsored Product Card (প্রোডাক্ট গ্রিডে সবার উপরে)</option>
                  <option value="featured_shop">4. Featured Shop Spotlight (শপস পেজে স্পটলাইট)</option>
                  <option value="sticky_bottom">5. Sticky Bottom Promo Strip (নিচে ভেসে থাকা বার)</option>
                </select>
              </label>
              <label className="field">
                Target URL (Where clicks go) *
                <input
                  required
                  placeholder="/products, /shops/slug or https://..."
                  value={form.target_url}
                  onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                />
              </label>
            </div>

            <div className="form-grid-2">
              <label className="field">
                Banner / Art Image URL (Optional)
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={form.banner_url}
                  onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                />
              </label>
              <label className="field">
                Badge Tag Text
                <input
                  placeholder="e.g. Sponsored, Featured Deal, বিজ্ঞাপন"
                  value={form.badge_text}
                  onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                />
              </label>
            </div>

            <div className="form-grid-3">
              <label className="field">
                CTA Button Text
                <input
                  placeholder="e.g. Buy Now, Grab Deal"
                  value={form.cta_text}
                  onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                />
              </label>
              <label className="field">
                Start Date
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </label>
              <label className="field">
                End Date (Auto-expiry)
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </label>
            </div>

            <div className="form-grid-2">
              <label className="field">
                Price Paid / Revenue (BDT ৳)
                <input
                  type="number"
                  min={0}
                  value={form.price_bdt}
                  onChange={(e) => setForm({ ...form, price_bdt: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="field">
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                >
                  <option value="active">Active / Live on Storefront</option>
                  <option value="paused">Paused (Temporarily Hidden)</option>
                  <option value="pending_payment">Pending Payment (Draft)</option>
                </select>
              </label>
            </div>

            <div className="button-row">
              <button type="submit" className="button primary">
                <Check size={16} />
                {editingId ? "Update Campaign" : "Save & Launch Campaign"}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns List Table */}
      <div className="ad-campaigns-table-wrap">
        <table className="ad-campaigns-table">
          <thead>
            <tr>
              <th>Campaign / Advertiser</th>
              <th>Placement Slot</th>
              <th>Dates & Duration</th>
              <th>Revenue</th>
              <th>Performance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => {
              const slotLabels: Record<AdPlacementSlot, string> = {
                home_hero: "Home Hero Banner",
                top_flash: "Top Flash Bar",
                sponsored_product: "Sponsored Product",
                featured_shop: "Featured Shop",
                sticky_bottom: "Sticky Bottom Bar",
              };
              const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
              const isExpired = ad.end_date && new Date(ad.end_date).getTime() + 86400000 < Date.now();

              return (
                <tr key={ad.id} className={ad.status !== "active" || isExpired ? "inactive-row" : ""}>
                  <td>
                    <strong>{ad.title}</strong>
                    <span className="table-sub">{ad.advertiser_name} &middot; <span className="target-url-text">{ad.target_url}</span></span>
                  </td>
                  <td>
                    <span className="slot-badge">{slotLabels[ad.placement]}</span>
                  </td>
                  <td>
                    <span className="table-dates">
                      {ad.start_date || "Anytime"} &rarr; {ad.end_date || "Forever"}
                      {isExpired && <span className="expired-tag"> (Expired)</span>}
                    </span>
                  </td>
                  <td>
                    <strong>{money(String(ad.price_bdt))}</strong>
                  </td>
                  <td>
                    <div className="perf-cell">
                      <span><Eye size={12} /> {ad.impressions} views</span>
                      <span><Zap size={12} /> {ad.clicks} clicks ({ctr}%)</span>
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${ad.status === "active" && !isExpired ? "positive" : ""}`}>
                      {isExpired ? "Expired" : ad.status === "active" ? "Active" : ad.status === "paused" ? "Paused" : "Pending"}
                    </span>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => handleToggleStatus(ad.id)}
                        title={ad.status === "active" ? "Pause Ad" : "Activate Ad"}
                      >
                        {ad.status === "active" ? "Pause" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => handleEdit(ad)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button ghost small danger-text"
                        onClick={() => handleDelete(ad.id)}
                        aria-label="Delete ad"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
