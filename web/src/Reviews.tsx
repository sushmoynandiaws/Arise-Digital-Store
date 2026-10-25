import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "./icons.js";
import { api } from "./api";
import type { ProductReview, ProductReviewsPage, Purchase } from "./types";

function Stars({ rating }: { rating: number }) {
  return <span className="review-stars" role="img" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(value => <Star key={value} size={17} aria-hidden="true" fill={value <= rating ? "currentColor" : "none"} />)}
  </span>;
}
function ReviewCard({ review }: { review: ProductReview }) {
  return <article className="review-card">
    <div className="review-card-top"><Stars rating={review.rating} /><time dateTime={new Date(review.created_at * 1000).toISOString()}>
      {new Date(review.created_at * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
    </time></div>
    <p className="preserve-lines">{review.comment}</p>
    <div className="review-author"><strong>{review.display_name}</strong><span>Verified purchase</span></div>
  </article>;
}
export function ProductReviews({ productId }: { productId: string }) {
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
        {data.count > 0 && data.average !== null ? <><strong>{data.average.toFixed(1)}<small> / 5</small></strong><span>{data.count} {data.count === 1 ? "review" : "reviews"}<small>From verified purchases</small></span></> : <p>No reviews yet.</p>}
      </div>
      {data.reviews.length > 0 && <div className="review-list" role="region" aria-label="Customer review list" tabIndex={0}>
        {data.reviews.map(review => <ReviewCard key={review.id} review={review} />)}
      </div>}
      {data.has_more && !error && <button type="button" className="button secondary full-width" disabled={busy} onClick={() => void load()}>{busy ? "Loading…" : "Load more reviews"}</button>}
      <p className="review-guidance">After payment verification and delivery, you can leave or edit a review in <Link to="/purchases">My purchases</Link>.</p>
    </>}
  </div>;
}
export function PurchaseReview({ order }: { order: Purchase }) {
  const [review, setReview] = useState(order.review ?? null);
  const [editing, setEditing] = useState(!order.review);
  const [rating, setRating] = useState(order.review?.rating ?? 5);
  const [name, setName] = useState(order.review?.display_name || order.buyer_name?.trim() || "Verified customer");
  const [comment, setComment] = useState(order.review?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <section className="panel purchase-review" aria-labelledby="purchase-review-title">
    <h2 id="purchase-review-title">{review ? "Your review" : "How was your purchase?"}</h2>
    {review && !editing ? <><ReviewCard review={review} />{order.can_review && <button type="button" className="button secondary small" onClick={() => setEditing(true)}>Edit your review</button>}</> : <form onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      setBusy(true); setError("");
      try {
        const result = await api<ProductReview>(`/orders/${order.id}/review`, { method: "POST", body: JSON.stringify({ rating, display_name: name, comment }) });
        setReview(result); setEditing(false);
      } catch (error) { setError((error as Error).message); }
      finally { setBusy(false); }
    }}>
      <fieldset className="review-rating-input"><legend>Your rating</legend>
        {[1, 2, 3, 4, 5].map(value => <label key={value}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} required /><Star size={25} fill={value <= rating ? "currentColor" : "none"} aria-hidden="true" /><span className="sr-only">{value} {value === 1 ? "star" : "stars"}</span></label>)}
      </fieldset>
      <label className="field">Your public name<input required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="field">Your review<textarea required minLength={10} maxLength={2000} rows={4} value={comment} onChange={event => setComment(event.target.value)} placeholder="Tell others about the product and your experience." /></label>
      <p className="review-guidance">Your public name, rating, review and review date appear on the product page. Keep passwords, license keys and payment details private.</p>
      {error && <p role="alert" className="notice error">{error}</p>}
      <button className="button primary" disabled={busy || !order.can_review}>{busy ? "Saving review…" : review ? "Update review" : "Publish review"}</button>
      {review && <button type="button" className="button ghost" onClick={() => setEditing(false)}>Cancel</button>}
    </form>}
  </section>;
}
