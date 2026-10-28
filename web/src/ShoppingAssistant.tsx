import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {api, canCheckout, money} from "./api";
import {productPath} from "./product";
import {useLang} from "./i18n";
import {Bot, X, ArrowUp, Mic} from "./icons";
import type {Catalog, Product, Shop} from "./types";

type Match = {product_id: string; variant_ids: string[]; product: Product};
type Reply = {state: "results" | "out_of_stock" | "no_matches" | "unavailable" | "quota_exhausted" | "clarify" | "tracking" | "policy" | "greeting"; matches: Match[]; reply?: string; contract?: string};
type Turn = {question: string; reply?: Reply; error?: string};
type Recognition = {lang: string; continuous: boolean; interimResults: boolean; start(): void; abort(): void;
  onresult: ((event: {results: ArrayLike<ArrayLike<{transcript: string}>>}) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null};
type VoiceWindow = Window & {SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition};

function ResultCard({product, match, shop, catalog, choose, close}: {product: Product; match: Match; shop: Shop; catalog: Catalog; choose: () => void; close: () => void}) {
  const {lang} = useLang(), bn = lang === "bn";
  const variants = product.variants.filter(v => match.variant_ids.includes(v.id) && v.stock >= 0);
  const [variantId, setVariant] = useState(variants[0]?.id);
  const selected = variants.find(v => v.id === variantId);
  if (!selected) return null;
  return <article className="assistant-product">
    {product.image_url && <img src={product.image_url} alt="" loading="lazy"/>}
    <div><Link to={productPath(product,catalog)} onClick={close}>{product.name}</Link><small>{shop.name}</small>
      {product.description&&<p>{product.description.length>180?product.description.slice(0,180)+"…":product.description}</p>}
      {(product.size_chart||product.description?.length>180)&&<details className="assistant-product-details"><summary>{bn?"পণ্যের বিস্তারিত":"Product details"}</summary>{product.description.length>180&&<p className="preserve-lines">{product.description}</p>}{product.size_chart&&<p className="preserve-lines">{product.size_chart}</p>}</details>}
      <label className="field">{bn ? "অপশন" : "Option"}<select aria-label={`${product.name} ${bn ? "অপশন" : "option"}`} value={variantId} onChange={e => setVariant(e.target.value)}>{variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      <p><strong>{money(selected.price,product.currency)}</strong> · {bn ? "স্টক" : "Stock"}: {selected.stock}</p>
      {selected.stock === 0 ? <p>{bn ? "এই অপশন এখন স্টকে নেই" : "This option is out of stock"}</p> : canCheckout(product, shop) ? <Link className="button primary" to={`/checkout/${product.id}?variant=${selected.id}&quantity=1`} onClick={close}>{product.custom_order ? (bn ? "কাস্টমাইজ করুন" : "Customize") : (bn ? "চেকআউট" : "Checkout")}</Link> : <p>{product.checkout_unavailable_reason || (bn ? "কেনার নিয়ম জানতে বিক্রেতার সাথে যোগাযোগ করুন।" : "Contact the seller to check how to order.")}</p>}
      <button type="button" className="button secondary" onClick={choose}>{bn ? "এই পণ্য নিয়ে কথা বলুন" : "Ask about this product"}</button>
    </div>
  </article>;
}

export function ShoppingAssistant({catalog, shop}: {catalog: Catalog; shop: Shop}) {
  const {lang} = useLang(), bn = lang === "bn";
  const dialog = useRef<HTMLDialogElement>(null), recognition = useRef<Recognition | null>(null);
  const log = useRef<HTMLDivElement>(null), composer = useRef<HTMLTextAreaElement>(null);
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
  useEffect(() => {if(composer.current){composer.current.style.height="auto";composer.current.style.height=`${Math.min(composer.current.scrollHeight,104)}px`;}},[draft,open]);
  const close = () => setOpen(false);
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!draft.trim() || busy) return;
    recognition.current?.abort();
    const question = draft.trim(), previous = turns.map(t => t.question).slice(-4);
    const context = [...turns].reverse().find(turn => turn.reply?.matches.length)?.reply?.matches.map(match => match.product_id).slice(0,4) || [];
    const supportsContext = turns.some(turn => turn.reply?.contract === "marketplace-chat-v3");
    setDraft("");setBusy(true);composer.current?.focus();
    setTurns(current => [...current.slice(-9),{question}]);
    const controller = new AbortController(); request.current = controller;
    try {
      const reply = await api<Reply>("/assistant",{method:"POST",signal:controller.signal,body:JSON.stringify({message:question,previous_queries:previous,...(supportsContext?{context_product_ids:context}:{}),shop_id:shop?.id,selected_product_id:selected || undefined})});
      if(selected && reply.matches.length && !reply.matches.some(match => match.product_id === selected))setSelected(null);
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
    input.onerror=()=>{setListening(false);setVoiceError(bn ? "ভয়েস ইনপুট পাওয়া যায়নি। লিখে জানাতে পারেন।" : "Voice input is unavailable. You can type your message.");};
    try {setListening(true);input.start();} catch {setListening(false);setVoiceError(bn ? "মাইক্রোফোন চালু হয়নি। লিখে জানান।" : "Microphone could not start. Type your message.");}
  }
  function message(state: Reply["state"]) {
    return ({results:bn?"আপনার পছন্দ অনুযায়ী এগুলো দেখুন। কোনটি নিয়ে জানতে চান?":"Take a look at these options. Which would you like to know more about?",
      no_matches:bn?"এই নাম বা শর্তের সঙ্গে মেলাতে পারছি না। পণ্যের নাম বা অপশনটি আরেকটু জানাবেন?":"I couldn’t match that name or those requirements. Could you tell me the product name or option?",
      out_of_stock:bn?"পণ্যটি আছে, তবে এই অপশনগুলো এখন স্টকে নেই। নিচে তথ্য দেখতে পারেন।":"This product is listed, but these options are out of stock. You can still see its details below.",
      unavailable:bn?"এখন উত্তর দিতে পারছি না। একটু পরে চেষ্টা করুন বা বিক্রেতার সঙ্গে কথা বলুন।":"I can’t reply right now. Please try again shortly or contact the seller.",
      quota_exhausted:bn?"এই শপের সহকারী এখন পাওয়া যাচ্ছে না। বিক্রেতার সঙ্গে কথা বলতে পারেন।":"This shop’s assistant is unavailable right now. You can contact the seller for help.",
      clarify:bn?"কোন পণ্যটি নিয়ে জানতে চান? নাম, সাইজ বা বাজেট বলুন।":"Which product do you have in mind? Tell me its name, size or your budget.",
      tracking:bn?"My purchases খুলে আপনার অর্ডারের আপডেট দেখুন।":"Open My purchases to check your order’s updates.",
      policy:bn?"এই বিষয়ে নিশ্চিত তথ্য পাচ্ছি না। বিক্রেতার সঙ্গে কথা বলবেন?":"I don’t have verified information about that. Would you like to contact the seller?",
      greeting:bn?"হ্যালো! কী খুঁজছেন বলুন, সাহায্য করছি।":"Hi! Tell me what you’re looking for and I’ll help."})[state];
  }
  const contextProduct = catalog.products.find(p=>p.id===selected);
  const category = catalog.products.find(p=>p.shop_id===shop.id && p.category.trim())?.category;
  const suggestions = [category ? (bn?`${category} দেখাও`:`Show ${category}`) : (bn?"এই শপ সম্পর্কে বলুন":"Tell me about this shop"), bn?"ক্যাশ অন ডেলিভারি হবে?":"Is cash on delivery available?", bn?"রিটার্নের নিয়ম কী?":"What is the return policy?"];
  const prepare = (text: string) => {setDraft(text);composer.current?.focus();};
  return <>
    <button className="button primary assistant-launch" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-label={bn?"AI সহকারী":"AI assistant"}><Bot size={22}/><span>{bn?"Shop সহকারী":"Shop assistant"}<small>{shop.name}</small></span></button>
    <dialog className="assistant-drawer" ref={dialog} aria-labelledby="assistant-title" onCancel={close} onClose={close} onClick={e=>{if(e.target===e.currentTarget)close();}}>
      <header className="assistant-heading"><span className="assistant-avatar" aria-hidden="true"><Bot size={23}/></span><div><h2 id="assistant-title">{shop.name}</h2><p>{bn?"আপনার AI শপিং সহকারী":"Your AI shopping assistant"}</p></div><button type="button" className="icon-button" aria-label={bn?"বন্ধ করুন":"Close assistant"} onClick={close}><X size={20}/></button></header>
      <div className="assistant-log" ref={log} role="log" aria-live="polite" aria-relevant="additions text" aria-label={bn?"কথোপকথন":"Conversation"} aria-busy={busy}>
        {!turns.length && <div className="assistant-welcome"><div className="assistant-welcome-mark" aria-hidden="true"><Bot size={28}/></div><h3>{bn?"কী খুঁজছেন?":"What can I help you find?"}</h3><p>{bn?`${shop.name}-এ স্বাগতম! পণ্য বেছে নিতে বা শপের নিয়ম জানতে আমাকে বলুন।`:`Welcome to ${shop.name}! Ask me about products or the shop’s policies.`}</p><span className="assistant-prompt-label">{bn?"এভাবে শুরু করতে পারেন":"Try asking"}</span><div className="assistant-suggestions">{suggestions.map(text=><button key={text} type="button" onClick={()=>prepare(text)}>{text}</button>)}</div></div>}
        {turns.map((turn,index)=><section className="assistant-turn" key={index} aria-label={bn?"বার্তা":"Message"}><p className="assistant-question">{turn.question}</p>{turn.error&&<div className="assistant-response"><p role="alert">{turn.error}</p></div>}{turn.reply&&<div className="assistant-response"><span className="assistant-message-avatar" aria-hidden="true"><Bot size={16}/></span><div className="assistant-answer"><p className="preserve-lines">{turn.reply.reply || message(turn.reply.state)}</p>
          {turn.reply.matches.map(match=>{const visible=catalog.products.some(p=>p.id===match.product_id),product=match.product,owner=catalog.shops.find(s=>s.id===product?.shop_id);return visible&&product?.id===match.product_id&&owner&&product.shop_id===shop.id?<ResultCard key={`${product.id}:${match.variant_ids.join(",")}`} product={product} match={match} shop={owner} catalog={catalog} close={close} choose={()=>{setSelected(product.id);prepare(bn?"এই পণ্যের কোন অপশন স্টকে আছে?":"Which options of this product are in stock?");}}/>:null;})}
          {turn.reply.state==="tracking"&&<Link className="text-link" to="/purchases" onClick={close}>{bn?"আমার অর্ডারসমূহ":"My purchases"}</Link>}
          {turn.reply.state==="policy"&&<Link className="text-link" to={`/shops/${shop.slug}/info/contact`} onClick={close}>{bn?"বিক্রেতার সঙ্গে কথা বলুন":"Contact seller"}</Link>}
          {(turn.reply.state==="unavailable"||turn.reply.state==="quota_exhausted")&&<Link className="text-link" to={`/shops/${shop.slug}`} onClick={close}>{bn?"শপের পণ্য দেখুন":"Browse this shop"}</Link>}
        </div></div>}</section>)}
        {busy&&<div className="assistant-response assistant-typing" role="status"><span className="assistant-message-avatar" aria-hidden="true"><Bot size={16}/></span><span className="assistant-answer"><span className="assistant-input-label">{bn?"উত্তর তৈরি হচ্ছে…":"Replying…"}</span><span className="assistant-typing-dots" aria-hidden="true"><i/><i/><i/></span></span></div>}
      </div>
      <form className="assistant-compose" onSubmit={send}>
        {contextProduct&&<div className="assistant-context"><span>{contextProduct.name}</span><button type="button" className="icon-button" aria-label={bn?"নির্বাচিত পণ্য সরান":"Clear selected product"} onClick={()=>setSelected(null)}><X size={16}/></button></div>}
        <div className="assistant-input"><label className="field" htmlFor="assistant-message"><span className="assistant-input-label">{bn?"আপনার বার্তা":"Your message"}</span><textarea ref={composer} id="assistant-message" placeholder={bn?"আপনার প্রশ্ন লিখুন…":"Type your message…"} value={draft} maxLength={1000} required rows={1} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!busy&&draft.trim())e.currentTarget.form?.requestSubmit();}}}/></label>
        <div className="assistant-actions"><button type="button" className={`assistant-mic${listening?" is-listening":""}`} disabled={!voice||busy} aria-label={listening?(bn?"মাইক বন্ধ করুন":"Stop microphone"):(bn?"বাংলায় বলুন":"Speak Bangla")} title={bn?"বাংলায় বলুন":"Speak Bangla"} aria-pressed={listening} onClick={speak}><Mic size={19}/></button><button type="submit" className="assistant-send" disabled={busy||!draft.trim()} aria-label={bn?"বার্তা পাঠান":"Send message"} title={bn?"বার্তা পাঠান":"Send message"}><ArrowUp size={21}/></button></div></div>
        <details className="assistant-help"><summary>{bn?"শুধু এই শপের তথ্য · AI ও ভয়েস সম্পর্কে":"Only this shop’s information · About AI & voice"}</summary><p>{bn?"আমি AI সহকারী। অর্ডার নিশ্চিত ও পেমেন্ট করতে চেকআউট ব্যবহার করুন।":"I’m an AI assistant. Use checkout to confirm an order and make payments."}</p><p>{voice?(bn?"ভয়েসের জন্য ব্রাউজারের speech service ব্যবহৃত হয়। পাঠানোর আগে লেখা মিলিয়ে নিন।":"Voice uses your browser’s speech service. Review the transcript before sending."):(bn?"এই ব্রাউজারে ভয়েস নেই। লিখে জানান।":"Voice is unavailable in this browser. You can type your message.")}</p></details>
        {voiceError&&<p role="status">{voiceError}</p>}
      </form>
    </dialog>
  </>;
}
