import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  X,
  ExternalLink,
  ArrowRight,
  Star,
  Zap,
} from "./icons.js";
import { api } from "./api.js";
import type { SponsoredAd, AdPlacementSlot } from "./types.js";

type PlatformSettings = {
  announcement?: string; announcement_url?: string; support_email?: string;
  hero_title?: string; hero_description?: string;
  pages?: Partial<Record<"privacy" | "returns" | "terms" | "about" | "contact", string>>;
};
type Promotions = { ads: SponsoredAd[]; settings: PlatformSettings };
const PromotionsContext = createContext<Promotions>({ ads: [], settings: {} });
export function PromotionsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Promotions>({ ads: [], settings: {} });
  useEffect(() => {
    let current = true;
    const load = () => api<Promotions>("/promotions").then(value => { if (current) setData(value); }).catch(() => {});
    void load();
    const interval = window.setInterval(load, 30000);
    window.addEventListener("arise_ads_updated", load);
    window.addEventListener("focus", load);
    return () => { current = false; window.clearInterval(interval); window.removeEventListener("arise_ads_updated", load); window.removeEventListener("focus", load); };
  }, []);
  return <PromotionsContext.Provider value={data}>{children}</PromotionsContext.Provider>;
}
export function usePlatformSettings() { return useContext(PromotionsContext).settings; }
export function useSponsoredAds() { return useContext(PromotionsContext); }
export function getActiveAdsForSlot(slot: AdPlacementSlot, ads: SponsoredAd[] = []) {
  return ads.filter(ad => ad.placement === slot && ad.status === "active" && Date.parse(ad.start_date) <= Date.now() && Date.now() < Date.parse(ad.end_date) + 86400000);
}
function recordAdImpression(id: string) {
  const node = document.querySelector(`[data-ad-id="${id}"]`);
  if (!node) return;
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
      void api(`/promotions/${id}/events`, { method: "POST", body: JSON.stringify({ kind: "impression" }) }).catch(() => {});
      observer.disconnect();
    }
  }, { threshold: 0.5 });
  observer.observe(node);
  return () => observer.disconnect();
}
function recordAdClick(id: string) {
  void api(`/promotions/${id}/events`, { method: "POST", body: JSON.stringify({ kind: "click" }), keepalive: true }).catch(() => {});
}

/** Home Hero Sponsored Banner */
export function HomeHeroSponsoredAd() {
  const { ads } = useSponsoredAds();
  const activeList = getActiveAdsForSlot("home_hero", ads);
  const ad = activeList[0];

  useEffect(() => {
    if (ad?.id) return recordAdImpression(ad.id);
  }, [ad?.id]);

  if (!ad) return null;

  const isExternal = ad.target_url.startsWith("http");

  return (
    <section data-ad-id={ad.id} className="container sponsored-hero-banner-wrap" aria-label="Featured Promotion">
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
    if (ad?.id) return recordAdImpression(ad.id);
  }, [ad?.id]);

  if (!ad) return null;

  const isExternal = ad.target_url.startsWith("http");

  return (
    <div data-ad-id={ad.id} className="top-flash-sponsored-bar">
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
    if (ad?.id) return recordAdImpression(ad.id);
  }, [ad?.id]);

  if (!ad) return null;

  const isExternal = ad.target_url.startsWith("http");

  return (
    <div data-ad-id={ad.id} className="product-card sponsored-product-card">
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
            <CheckCircle2 size={13} /> Sponsored
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
    if (ad?.id) return recordAdImpression(ad.id);
  }, [ad?.id]);

  if (!ad) return null;

  return (
    <div data-ad-id={ad.id} className="featured-shop-spotlight panel" aria-label="Featured Partner">
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
      else return recordAdImpression(ad.id);
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
    <aside data-ad-id={ad.id} className="sticky-bottom-ad-strip" role="complementary" aria-label="Sponsored Announcement">
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

