import {useEffect, useState, type ReactNode} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {api, checkoutQuantity} from "./api";
import {useLang} from "./i18n";
import type {Product} from "./types";

type Selection = {id: string; ready: boolean; reason: string; product_id: string; variant_id: string; quantity: number; summary?: string[]; proof: {id: string; url: string; revision: string; approved: boolean} | null};

async function imageData(file?: File) {
  if (!file) return "";
  if (file.size > 1000000) throw new Error("Choose an image smaller than 1 MB.");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("This image could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(file);
  });
}

export function CraftCheckout({product, children}: {product: Product; children: ReactNode}) {
  const {lang} = useLang(), bn = lang === "bn";
  const [params, setParams] = useSearchParams();
  const id = params.get("craft");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const config = product.custom_order!;
  const variant = product.variants.find(v => v.id === params.get("variant")) || product.variants.find(v => v.stock > 0);
  const quantity = checkoutQuantity(params.get("quantity"));
  const craft = config.craft;
  async function refresh() {
    if (!id) return;
    setBusy(true);
    try { setSelection(await api<Selection>(`/craft/${encodeURIComponent(id)}`)); setError(""); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  useEffect(() => {setSelection(null); void refresh();}, [id]);
  const matching = selection && selection.product_id === product.id && selection.variant_id === variant?.id && selection.quantity === quantity;
  if (id && matching && selection.ready) return <><div className="container craft-checkout-status"><p>{bn ? "কাস্টম পণ্যের নির্বাচন নিশ্চিত করা হয়েছে।" : "Custom product selection confirmed."}</p>{selection.summary?.map((text,i)=><p key={i}>{text}</p>)}<button className="button secondary" onClick={() => {const next = new URLSearchParams(params); next.delete("craft"); setParams(next);}}>{bn ? "নির্বাচন পরিবর্তন করুন" : "Change selection"}</button></div>{children}</>;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!variant || busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const answers: Record<string, string> = {};
      let bytes = 0;
      for (const field of config.fields) {
        const value = fields.get(`answer:${field.id}`);
        if (value instanceof File) {bytes += value.size; if (value.size) answers[field.id] = await imageData(value);}
        else if (value) answers[field.id] = String(value);
      }
      const artwork = fields.get("artwork");
      if (artwork instanceof File) bytes += artwork.size;
      if (bytes > 1000000) throw new Error("Keep all uploaded images together under 1 MB.");
      const result = await api<Selection>("/craft", {method: "POST", body: JSON.stringify({shop_id: product.shop_id, product_id: product.id,
        variant_id: variant.id, quantity, config_revision: config.revision, answers,
        selection: (craft?.designs || []).map(d => ({code: d.code, qty: Number(fields.get(`design:${d.code}`) || 0)})).filter(d => d.qty > 0),
        artwork: artwork instanceof File && artwork.size ? await imageData(artwork) : undefined})});
      setSelection(result);
      const next = new URLSearchParams(params); next.set("craft", result.id); setParams(next, {replace: true});
    } catch (e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  async function approve() {
    if (!selection?.proof || busy) return;
    setBusy(true); setError("");
    try {setSelection(await api<Selection>(`/craft/${id}/approve`, {method: "POST", body: JSON.stringify({proof_id: selection.proof.id, revision: selection.proof.revision})}));}
    catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  return <main id="main" className="container section craft-checkout"><h1>{bn ? "কাস্টম পণ্যের বিবরণ" : "Custom product details"}</h1><p>{product.name} · {variant?.name} × {quantity}</p>
    {variant?.pieces_per_set && <p>{variant.pieces_per_set} {bn ? "পিস প্রতি সেট" : "pieces per set"} · {variant.size} {variant.color}</p>}
    {craft?.production_days && <p>{bn ? "তৈরির সময়" : "Production time"}: {craft.production_days}{craft.production_days_to ? `–${craft.production_days_to}` : ""} {bn ? "দিন" : "days"}</p>}
    {error && <p role="alert">{error}</p>}
    {id ? <section className="panel" aria-live="polite">
      <h2>{bn ? "বিক্রেতার রিভিউ ও প্রিভিউ" : "Seller review and preview"}</h2>
      <p>{matching ? selection.reason : bn ? "আপনার নির্বাচন যাচাই করুন।" : "Check your current selection."}</p>
      {matching && selection.proof && <><img className="craft-proof" src={selection.proof.url} alt={bn ? "বিক্রেতার দেওয়া প্রিভিউ" : "Seller's print preview"}/><button className="button primary" disabled={busy || selection.proof.approved} onClick={approve}>{bn ? "এই প্রিভিউ অনুমোদন করছি" : "I approve this preview"}</button></>}
      <p>{bn ? "বিক্রেতা রিভিউ সংরক্ষণ করলে আপডেট দেখুন। অনুমোদনের পর দাম ও ডেলিভারি চার্জ রিভিউ করতে পারবেন।" : "Check for updates after the seller saves the review. Review the final price and shipping before ordering."}</p>
      <button className="button secondary" disabled={busy} onClick={refresh}>{bn ? "আপডেট দেখুন" : "Check for updates"}</button>
      <button className="button secondary" disabled={busy} onClick={() => {const next = new URLSearchParams(params); next.delete("craft"); setParams(next);}}>{bn ? "নতুন নির্বাচন করুন" : "Start a new selection"}</button>
    </section> : <form className="panel" onSubmit={submit}>
      <p>{bn ? "প্যাকেজ ও নির্বাচন মিলিয়ে জমা দিন। পরিবর্তন করলে আগের রিভিউ ও অনুমোদন প্রযোজ্য হবে না।" : "Check your package and choices before submitting. A new selection needs a new seller review and approval."}</p>
      {!!craft?.designs.length && <fieldset><legend>{bn ? "ডিজাইন নির্বাচন" : "Choose designs"}</legend>{craft.designs.map(d => <label className="field" key={d.code}>{d.image_url && <img className="craft-design" src={d.image_url} alt=""/>}{d.label}<input aria-label={`${d.label} quantity`} name={`design:${d.code}`} type="number" min="0" max="100" step="1" defaultValue="0"/></label>)}</fieldset>}
      {config.fields.map(f => <label className="field" key={f.id}>{f.label}<small>{f.question}</small>{f.type === "select" ? <select name={`answer:${f.id}`} required={f.required} defaultValue=""><option value="">{bn ? "বেছে নিন" : "Choose an option"}</option>{f.options.map(o => <option key={o.label} value={o.label}>{o.label}{Number(o.extra_price) > 0 ? ` (+${o.extra_price})` : ""}</option>)}</select> : <input name={`answer:${f.id}`} type={f.type === "image" ? "file" : f.type} accept={f.type === "image" ? "image/jpeg,image/png,image/webp" : undefined} required={f.required} min={f.minimum} max={f.maximum} maxLength={2000} step={f.type === "number" ? "any" : undefined}/>}</label>)}
      {craft?.allow_artwork && <label className="field">{bn ? "আপনার artwork (ঐচ্ছিক)" : "Your artwork (optional)"}<input type="file" name="artwork" accept="image/jpeg,image/png,image/webp"/></label>}
      <small>{bn ? "সব ছবি মিলিয়ে সর্বোচ্চ ১ MB।" : "All uploaded images together: maximum 1 MB."}</small>
      <label className="check-field"><input type="checkbox" required/>{bn ? "প্যাকেজ ও আমার নির্বাচন মিলিয়ে নিশ্চিত করছি।" : "I checked and confirm this package and my selection."}</label>
      <button className="button primary" disabled={busy || !variant}>{busy ? (bn ? "জমা হচ্ছে…" : "Submitting…") : (bn ? "নির্বাচন জমা দিন" : "Submit selection")}</button>
    </form>}
    <Link className="back-link" to={`/products/${product.id}`}>{bn ? "পণ্যে ফিরে যান" : "Back to product"}</Link>
  </main>;
}
