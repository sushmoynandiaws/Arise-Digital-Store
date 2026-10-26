import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Star, CheckCircle2, ExternalLink } from "./icons";
import { api } from "./api";
import { useLang } from "./i18n";
import { productPath } from "./product";
import type { Catalog, Product, ProductReview, ProductReviewsPage, Purchase, Shop } from "./types";

function Stars({ rating }: { rating: number }) {
  return <span className="review-stars" role="img" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(value => <Star key={value} size={17} aria-hidden="true" fill={value <= rating ? "currentColor" : "none"} />)}
  </span>;
}
function ReviewCard({ review }: { review: ProductReview }) {
  const { lang } = useLang();
  return <article className="review-card">
    <div className="review-card-top"><Stars rating={review.rating} /><time dateTime={new Date(review.created_at * 1000).toISOString()}>
      {new Date(review.created_at * 1000).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
    </time></div>
    <p className="preserve-lines">{review.comment}</p>
    <div className="review-author"><strong>{review.display_name}</strong><span>{lang === "bn" ? "ভেরিফাইড বায়ার" : "Verified purchase"}</span></div>
  </article>;
}
export function ProductReviews({ productId }: { productId: string }) {
  const { lang } = useLang();
  const [data, setData] = useState<ProductReviewsPage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    api<ProductReviewsPage>(`/products/${productId}/reviews`).then(result => { if (current) setData(result); })
      .catch(error => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [productId]);
  async function load() {
    setBusy(true); setError("");
    try {
      const result = await api<ProductReviewsPage>(`/products/${productId}/reviews?offset=${data?.reviews.length ?? 0}`);
      setData(previous => ({ ...result, reviews: [...(previous?.reviews ?? []), ...result.reviews] }));
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="product-reviews">
    {error && <div role="alert" className="notice error"><p>{error}</p><button type="button" className="button secondary small" disabled={busy} onClick={() => void load()}>Retry reviews</button></div>}
    {!data && !error && <p role="status">Loading reviews…</p>}
    {data && <>
      <div className="review-summary">
        {data.count > 0 && data.average !== null ? <><strong>{data.average.toFixed(1)}<small> / 5</small></strong><span>{data.count} {data.count === 1 ? (lang === "bn" ? "টি রিভিউ" : "review") : (lang === "bn" ? "টি রিভিউ" : "reviews")}<small>{lang === "bn" ? "ভেরিফাইড বায়ারদের রিভিউ" : "From verified purchases"}</small></span></> : <p>{lang === "bn" ? "এখনও কোনো রিভিউ নেই।" : "No reviews yet."}</p>}
      </div>
      {data.reviews.length > 0 && <div className="review-list" role="region" aria-label="Customer review list" tabIndex={0}>
        {data.reviews.map(review => <ReviewCard key={review.id} review={review} />)}
      </div>}
      {data.has_more && !error && <button type="button" className="button secondary full-width" disabled={busy} onClick={() => void load()}>{busy ? (lang === "bn" ? "লোড হচ্ছে…" : "Loading…") : (lang === "bn" ? "আরো রিভিউ দেখুন" : "Load more reviews")}</button>}
      <p className="review-guidance">{lang === "bn" ? <>পেমেন্ট যাচাই ও ডেলিভারির পর আপনি <Link to="/purchases">আমার অর্ডারসমূহ</Link> পেজে রিভিউ দিতে বা পরিবর্তন করতে পারবেন।</> : <>After payment verification and delivery, you can leave or edit a review in <Link to="/purchases">My purchases</Link>.</>}</p>
    </>}
  </div>;
}
export function PurchaseReview({ order }: { order: Purchase }) {
  const { lang } = useLang();
  const [review, setReview] = useState(order.review ?? null);
  const [editing, setEditing] = useState(!order.review);
  const [rating, setRating] = useState(order.review?.rating ?? 5);
  const [name, setName] = useState(order.review?.display_name || order.buyer_name?.trim() || "Verified customer");
  const [comment, setComment] = useState(order.review?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <section className="panel purchase-review" aria-labelledby="purchase-review-title">
    <h2 id="purchase-review-title">{review ? (lang === "bn" ? "আপনার রিভিউ" : "Your review") : (lang === "bn" ? "আপনার ক্রয়ের অভিজ্ঞতা কেমন ছিল?" : "How was your purchase?")}</h2>
    {review && !editing ? <><ReviewCard review={review} />{order.can_review && <button type="button" className="button secondary small" onClick={() => setEditing(true)}>{lang === "bn" ? "রিভিউ পরিবর্তন করুন" : "Edit your review"}</button>}</> : <form onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      setBusy(true); setError("");
      try {
        const result = await api<ProductReview>(`/orders/${order.id}/review`, { method: "POST", body: JSON.stringify({ rating, display_name: name, comment }) });
        setReview(result); setEditing(false);
      } catch (error) { setError((error as Error).message); }
      finally { setBusy(false); }
    }}>
      <fieldset className="review-rating-input"><legend>{lang === "bn" ? "আপনার রেটিং" : "Your rating"}</legend>
        {[1, 2, 3, 4, 5].map(value => <label key={value}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} required /><Star size={25} fill={value <= rating ? "currentColor" : "none"} aria-hidden="true" /><span className="sr-only">{value} {value === 1 ? "star" : "stars"}</span></label>)}
      </fieldset>
      <label className="field">{lang === "bn" ? "আপনার নাম (পাবলিক)" : "Your public name"}<input required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="field">{lang === "bn" ? "আপনার রিভিউ" : "Your review"}<textarea required minLength={10} maxLength={2000} rows={4} value={comment} onChange={event => setComment(event.target.value)} placeholder={lang === "bn" ? "প্রোডাক্ট এবং আপনার অভিজ্ঞতা কেমন ছিল তা লিখুন..." : "Tell others about the product and your experience."} /></label>
      <p className="review-guidance">Your public name, rating, review and review date appear on the product page. Keep passwords, license keys and payment details private.</p>
      {error && <p role="alert" className="notice error">{error}</p>}
      <button className="button primary" disabled={busy || !order.can_review}>{busy ? (lang === "bn" ? "সংরক্ষণ করা হচ্ছে…" : "Saving review…") : review ? (lang === "bn" ? "রিভিউ আপডেট করুন" : "Update review") : (lang === "bn" ? "রিভিউ প্রকাশ করুন" : "Publish review")}</button>
      {review && <button type="button" className="button ghost" onClick={() => setEditing(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</button>}
    </form>}
  </section>;
}

export type ShopProductReview = ProductReview & {
  product: Product;
};

export function ShopReviews({
  shop,
  catalog,
  lang = "en",
}: {
  shop: Shop;
  catalog: Catalog | null;
  lang?: string;
}) {
  const [reviews, setReviews] = useState<ShopProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterProduct, setFilterProduct] = useState<string>("all");

  const shopProducts = useMemo(() => {
    return (catalog?.products || []).filter((p) => p.shop_id === shop.id);
  }, [catalog, shop.id]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");

    if (shopProducts.length === 0) {
      setReviews([]);
      setLoading(false);
      return;
    }

    Promise.all(
      shopProducts.map(async (prod) => {
        try {
          const res = await api<ProductReviewsPage>(`/products/${prod.id}/reviews`);
          return (res.reviews || []).map((r) => ({
            ...r,
            product: prod,
          }));
        } catch {
          return [];
        }
      })
    )
      .then((results) => {
        if (!current) return;
        const all = results.flat();
        all.sort((a, b) => b.created_at - a.created_at);
        setReviews(all);
        setLoading(false);
      })
      .catch((err) => {
        if (!current) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [shop.id, shopProducts]);

  const filteredReviews = useMemo(() => {
    if (filterProduct === "all") return reviews;
    return reviews.filter((r) => r.product.id === filterProduct);
  }, [reviews, filterProduct]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const productsWithReviews = useMemo(() => {
    const map = new Map<string, { product: Product; count: number }>();
    for (const r of reviews) {
      if (!map.has(r.product.id)) {
        map.set(r.product.id, { product: r.product, count: 0 });
      }
      map.get(r.product.id)!.count++;
    }
    return Array.from(map.values());
  }, [reviews]);

  return (
    <section id="customer-reviews" className="shop-reviews-section" aria-label="Shop customer reviews">
      <div className="section-header shop-reviews-header">
        <div>
          <h1>
            {lang === "bn" ? `${shop.name}-এর গ্রাহক রিভিউসমূহ` : `Customer reviews for ${shop.name}`}
          </h1>
          <p className="muted">
            {lang === "bn"
              ? "এই শপের প্রোডাক্টগুলোর আসল ক্রেতাদের দেওয়া ভেরিফাইড রিভিউ।"
              : "Genuine verified feedback left by real buyers for products sold by this shop."}
          </p>
        </div>

        {reviews.length > 0 && averageRating && (
          <div className="shop-reviews-score-card">
            <div className="shop-reviews-score-top">
              <span className="score-number">{averageRating}</span>
              <div className="score-details">
                <Stars rating={Math.round(Number(averageRating))} />
                <span className="score-total">
                  {reviews.length} {reviews.length === 1 ? (lang === "bn" ? "টি রিভিউ" : "review") : (lang === "bn" ? "টি রিভিউ" : "reviews")}
                </span>
              </div>
            </div>
            <span className="score-badge">
              <CheckCircle2 size={13} />
              {lang === "bn" ? "১০০% ভেরিফাইড পারচেজ" : "100% Verified Purchases"}
            </span>
          </div>
        )}
      </div>

      {loading && <p className="loading-text" role="status">{lang === "bn" ? "রিভিউ লোড হচ্ছে…" : "Loading customer reviews…"}</p>}
      {error && (
        <div role="alert" className="notice error">
          <p>{error}</p>
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="empty-reviews-box">
          <div className="empty-reviews-icon">⭐</div>
          <h3>{lang === "bn" ? "এখনও কোনো রিভিউ জমা পড়েনি" : "No reviews yet for this shop"}</h3>
          <p>
            {lang === "bn"
              ? `শুধুমাত্র ${shop.name} থেকে পণ্য কিনেছেন এমন ক্রেতারা পেমেন্ট ও ডেলিভারির পর মাই পারচেজ পেজ থেকে রিভিউ দিতে পারেন।`
              : `Only verified buyers who completed a purchase from ${shop.name} can submit reviews from My purchases after delivery.`}
          </p>
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <>
          {productsWithReviews.length > 1 && (
            <div className="shop-review-filters" role="group" aria-label="Filter reviews by product">
              <span className="filter-label">{lang === "bn" ? "প্রোডাক্ট অনুযায়ী দেখুন:" : "Filter by product:"}</span>
              <div className="review-filter-chips">
                <button
                  type="button"
                  className={`review-filter-chip ${filterProduct === "all" ? "active" : ""}`}
                  onClick={() => setFilterProduct("all")}
                >
                  {lang === "bn" ? "সকল প্রোডাক্ট" : "All Products"} ({reviews.length})
                </button>
                {productsWithReviews.map(({ product, count }) => (
                  <button
                    key={product.id}
                    type="button"
                    className={`review-filter-chip ${filterProduct === product.id ? "active" : ""}`}
                    onClick={() => setFilterProduct(product.id)}
                  >
                    {product.name} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="shop-reviews-grid">
            {filteredReviews.map((review) => (
              <article key={review.id} className="shop-review-card">
                <div className="shop-review-product-tag">
                  <div className="product-tag-left">
                    <span className="tag-caption">{lang === "bn" ? "রিভিউকৃত প্রোডাক্ট:" : "Review for:"}</span>
                    <Link
                      to={catalog ? productPath(review.product, catalog) : `/products/${review.product.id}`}
                      className="product-tag-link"
                    >
                      <strong className="tag-product-name">{review.product.name}</strong>
                      <span className="tag-product-category">· {review.product.category}</span>
                      <ExternalLink size={13} aria-hidden="true" />
                    </Link>
                  </div>
                  <div className="product-tag-rating">
                    <Stars rating={review.rating} />
                  </div>
                </div>

                <p className="shop-review-comment preserve-lines">{review.comment}</p>

                <div className="shop-review-footer">
                  <div className="review-author-info">
                    <strong>{review.display_name}</strong>
                    <span className="verified-buyer-pill">
                      <CheckCircle2 size={12} />
                      {lang === "bn" ? "ভেরিফাইড পারচেজ" : "Verified purchase"}
                    </span>
                  </div>
                  <time dateTime={new Date(review.created_at * 1000).toISOString()} className="review-date">
                    {new Date(review.created_at * 1000).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <p className="review-guidance">
        {lang === "bn"
          ? "পেমেন্ট ভেরিফিকেশন ও ডেলিভারি পাওয়ার পর, আপনি 'মাই পারচেজ' পেজ থেকে আপনার অর্ডারকৃত প্রোডাক্টের রিভিউ দিতে বা এডিট করতে পারবেন।"
          : "After payment verification and delivery, you can leave or edit a review for your purchased products in My purchases."}
      </p>
    </section>
  );
}
