import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {api, canCheckout, money} from "./api";
import {productPath} from "./product";
import {useLang} from "./i18n";
import {Bot, X, Search, Mic} from "./icons";
import type {Catalog, Product, Shop} from "./types";

type Match = {product_id: string; variant_ids: string[]; product: Product};
type Reply = {state: "results" | "no_matches" | "unavailable" | "clarify" | "tracking" | "policy"; matches: Match[]};
type Turn = {question: string; reply?: Reply; error?: string};
type Recognition = {lang: string; continuous: boolean; interimResults: boolean; start(): void; abort(): void;
  onresult: ((event: {results: ArrayLike<ArrayLike<{transcript: string}>>}) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null};
type VoiceWindow = Window & {SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition};

function ResultCard({product, match, shop, catalog, choose, close}: {product: Product; match: Match; shop: Shop; catalog: Catalog; choose: () => void; close: () => void}) {
  const {lang} = useLang(), bn = lang === "bn";
  const variants = product.variants.filter(v => match.variant_ids.includes(v.id) && v.stock > 0);
  const [variantId, setVariant] = useState(variants[0]?.id);
  const selected = variants.find(v => v.id === variantId);
  if (!selected) return null;
  return <article className="assistant-product">
    {product.image_url && <img src={product.image_url} alt="" loading="lazy"/>}
    <div><Link to={productPath(product,catalog)} onClick={close}>{product.name}</Link><small>{shop.name}</small>
      <label className="field">{bn ? "অপশন" : "Option"}<select aria-label={`${product.name} ${bn ? "অপশন" : "option"}`} value={variantId} onChange={e => setVariant(e.target.value)}>{variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      <p><strong>{money(selected.price,product.currency)}</strong> · {bn ? "স্টক" : "Stock"}: {selected.stock}</p>
      {canCheckout(product, shop) ? <Link className="button primary" to={`/checkout/${product.id}?variant=${selected.id}&quantity=1`} onClick={close}>{product.custom_order ? (bn ? "কাস্টমাইজ করুন" : "Customize") : (bn ? "চেকআউট" : "Checkout")}</Link> : <p>{product.checkout_unavailable_reason || (bn ? "কেনার নিয়ম জানতে বিক্রেতার সাথে যোগাযোগ করুন।" : "Contact the seller to check how to order.")}</p>}
      <button type="button" className="button secondary" onClick={choose}>{bn ? "এই পণ্য নিয়ে খুঁজুন" : "Search this product"}</button>
    </div>
  </article>;
}

export function ShoppingAssistant({catalog, shop}: {catalog: Catalog; shop?: Shop}) {
  const {lang} = useLang(), bn = lang === "bn";
  const dialog = useRef<HTMLDialogElement>(null), recognition = useRef<Recognition | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [draft,setDraft] = useState(""), [turns,setTurns] = useState<Turn[]>([]);
  const [busy,setBusy] = useState(false), [listening,setListening] = useState(false), [voiceError,setVoiceError] = useState("");
  const [selected,setSelected] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const voice = (window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition;
  useEffect(() => {
    if(open && !dialog.current?.open) dialog.current?.showModal();
    if(!open) {dialog.current?.close();recognition.current?.abort();setListening(false);}
  },[open]);
  useEffect(() => () => {recognition.current?.abort();request.current?.abort();},[]);
  useEffect(() => {if(log.current)log.current.scrollTop=log.current.scrollHeight;},[turns,busy]);
  const close = () => setOpen(false);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if(!draft.trim() || busy) return;
    recognition.current?.abort();
    const question = draft.trim(), previous = turns.map(t => t.question).slice(-4);
    setDraft("");setBusy(true);
    setTurns(current => [...current.slice(-9),{question}]);
    const controller = new AbortController(); request.current = controller;
    try {
      const reply = await api<Reply>("/assistant",{method:"POST",signal:controller.signal,body:JSON.stringify({message:question,previous_queries:previous,shop_id:shop?.id,selected_product_id:selected || undefined})});
      setTurns(current => current.map((t,i) => i===current.length-1 ? {...t,reply} : t));
    } catch(error) {
      if(!controller.signal.aborted)setTurns(current => current.map((t,i) => i===current.length-1 ? {...t,error:(error as Error).message} : t));
    } finally {if(!controller.signal.aborted)setBusy(false);}
  }
  function speak() {
    if(listening) {recognition.current?.abort();setListening(false);return;}
    if(!voice) return;
    setVoiceError("");
    const input = new voice();recognition.current=input;input.lang="bn-BD";input.continuous=false;input.interimResults=false;
    input.onresult=event=>{const text=Array.from(event.results).map(result=>result[0]?.transcript||"").join(" ");setDraft(text.slice(0,1000));};
    input.onend=()=>setListening(false);
    input.onerror=()=>{setListening(false);setVoiceError(bn ? "ভয়েস ইনপুট পাওয়া যায়নি। লিখে খুঁজতে পারেন।" : "Voice input is unavailable. You can type your search.");};
    try {setListening(true);input.start();} catch {setListening(false);setVoiceError(bn ? "মাইক্রোফোন চালু হয়নি। লিখে খুঁজুন।" : "Microphone could not start. Type your search.");}
  }
  function message(state: Reply["state"]) {
    return ({results:bn?"আপনার খোঁজার সাথে মেলা পণ্যগুলো দেখুন। চেকআউটে বর্তমান দাম ও স্টক আবার যাচাই হবে।":"Here are matching products. Price and availability are checked again at checkout.",
      no_matches:bn?"এই খোঁজে স্টকে থাকা পণ্য মেলেনি। পণ্যের নাম, বাজেট বা সাইজ বদলে দেখুন।":"No in-stock match for this search. Try a different product name, budget or size.",
      unavailable:bn?"AI এখন পাওয়া যাচ্ছে না। সাধারণ product search ব্যবহার করুন বা পরে চেষ্টা করুন।":"AI search is unavailable. Use product search or try again later.",
      clarify:bn?"কী ধরনের পণ্য চান? পণ্যের নাম এবং টাকায় বাজেট লিখুন; চাইলে সাইজ বা রংও জানান।":"What type of product would you like? Give its name and a BDT budget, plus size or color if needed.",
      tracking:bn?"অর্ডার জানতে নিরাপদ tracking page খুলুন। এখানে শুধু order number দিয়ে ব্যক্তিগত তথ্য দেখানো হয় না।":"Open secure order tracking. An order number alone does not give access to private details here.",
      policy:bn?"নিয়ম shop অনুযায়ী আলাদা। সংশ্লিষ্ট shop-এর তথ্য দেখুন; delivery charge চেকআউটে যাচাই হয়।":"Policies vary by shop. Check the shop information; shipping charges are confirmed at checkout."})[state];
  }
  const contextProduct = catalog.products.find(p=>p.id===selected);
  return <>
    <button className="button primary assistant-launch" onClick={()=>setOpen(true)} aria-haspopup="dialog"><Bot size={20}/>{bn?"AI সহকারী":"AI assistant"}</button>
    <dialog className="assistant-drawer" ref={dialog} aria-labelledby="assistant-title" onCancel={close} onClose={close} onClick={e=>{if(e.target===e.currentTarget)close();}}>
      <header className="assistant-heading"><div><h2 id="assistant-title">{bn?"Arise AI সহকারী":"Arise AI assistant"}</h2><p>{shop?.name || (bn?"সব shop-এর প্রকাশিত পণ্য":"Published products across shops")}</p></div><button className="icon-button" aria-label={bn?"বন্ধ করুন":"Close assistant"} onClick={close}><X/></button></header>
      <div className="assistant-log" ref={log} role="log" aria-live="polite" aria-relevant="additions text">
        {!turns.length && <p>{bn?"যেমন: ১৫০০ টাকার মধ্যে ৪২ সাইজের জুতা দেখাও। আমি product খুঁজে দিতে পারি; নিজে order বা payment confirm করি না।":"Try: Show shoes in size 42 under 1500 taka. I can find products; I do not confirm orders or payments."}</p>}
        {turns.map((turn,index)=><section className="assistant-turn" key={index}><p className="assistant-question">{turn.question}</p>{turn.error&&<p role="alert">{turn.error}</p>}{turn.reply&&<><p>{message(turn.reply.state)}</p>
          {turn.reply.matches.map(match=>{const visible=catalog.products.some(p=>p.id===match.product_id),product=match.product,owner=catalog.shops.find(s=>s.id===product?.shop_id);return visible&&product?.id===match.product_id&&owner&&(!shop||product.shop_id===shop.id)?<ResultCard key={`${product.id}:${match.variant_ids.join(",")}`} product={product} match={match} shop={owner} catalog={catalog} close={close} choose={()=>{setSelected(product.id);setDraft(bn?"এই পণ্যের কোন সাইজ স্টকে আছে?":"Which sizes of this product are in stock?");}}/>:null;})}
          {turn.reply.state==="tracking"&&<Link className="button secondary" to="/track" onClick={close}>{bn?"অর্ডার ট্র্যাক করুন":"Track order"}</Link>}
          {turn.reply.state==="policy"&&<Link className="button secondary" to={shop?`/shops/${shop.slug}/info/terms`:"/shops"} onClick={close}>{bn?"Shop-এর তথ্য":"Shop information"}</Link>}
          {turn.reply.state==="unavailable"&&<Link className="button secondary" to={shop?`/shops/${shop.slug}`:"/products"} onClick={close}>{bn?"পণ্য খুঁজুন":"Search products"}</Link>}
        </>}</section>)}
        {busy&&<p role="status">{bn?"পণ্য খোঁজা হচ্ছে…":"Finding products…"}</p>}
      </div>
      <form className="assistant-compose" onSubmit={send}>
        {contextProduct&&<p>{bn?"নির্বাচিত পণ্য":"Selected product"}: {contextProduct.name} <button type="button" className="button secondary" onClick={()=>setSelected(null)}>{bn?"সব পণ্যে খুঁজুন":"Search all products"}</button></p>}
        <label className="field" htmlFor="assistant-message">{bn?"আপনার খোঁজ":"Your search"}<textarea id="assistant-message" value={draft} maxLength={1000} required rows={2} onChange={e=>setDraft(e.target.value)}/></label>
        <div className="assistant-actions"><button type="button" className="button secondary" disabled={!voice||busy} aria-pressed={listening} onClick={speak}><Mic size={18}/>{listening?(bn?"মাইক বন্ধ করুন":"Stop microphone"):(bn?"বাংলায় বলুন":"Speak Bangla")}</button><button className="button primary" disabled={busy||!draft.trim()}><Search size={18}/>{bn?"খুঁজুন":"Search"}</button></div>
        <small>{voice?(bn?"Voice input ব্রাউজারের speech service ব্যবহার করে। পাঠানোর আগে লেখা মিলিয়ে নিন।":"Voice input uses your browser's speech service. Review the text before sending."):(bn?"এই ব্রাউজারে voice input নেই। লিখে খুঁজুন।":"Voice input is unavailable in this browser. Type to search.")}</small>
        {voiceError&&<p role="status">{voiceError}</p>}
      </form>
    </dialog>
  </>;
}
