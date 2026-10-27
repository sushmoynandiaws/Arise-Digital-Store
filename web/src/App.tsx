import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LangProvider, useLang } from "./i18n.js";
import { generateQrMatrix } from "./qr.js";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  matchPath,
} from "react-router-dom";
import {

  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Search,
  ShoppingBag,
  Store,
  Menu,
  X,
  Check,
  CheckCircle2,
  ShieldCheck,
  Heart,
  Phone,
  Zap,
  ChevronDown,
  LayoutGrid,
  Clock,
  Mail,
  BookOpen,
  Palette,
  Code2,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  Copy,
  Package,
  LockKeyhole,
  LoaderCircle,
  Download,
  Flag,
  Plus,
  LogOut,
  Layers,
  Play,
  Command,
  Bot,
  AlertTriangle,
  Building2,
  UserCheck,
  Wallet,
  Info,
  Star,
} from "./icons.js";
import {
  api,
  setCsrf,
  money,
  checkoutTotal,
  checkoutQuantity,
  stock,
  minimumPrice,
  paymentLabel,
  deliveryLabel,
  purchaseMessage,
  paymentMethodLabel,
  productFulfilment,
  productPayments,
  canCheckout,
  shopType,
  extractAccountDigits,
} from "./api";
import type { Catalog, Shop, Product, Session, Quote, Purchase } from "./types";
import { productForRoute, productPath, productSection, type ProductSection } from "./product";
import { ProductReviews, PurchaseReview, ShopReviews } from "./Reviews";
import { shopPageSections } from "./shopPages";
import {
  PromotionsProvider,
  usePlatformSettings,
  HomeHeroSponsoredAd,
  TopFlashSponsoredAd,
  SponsoredProductCard,
  FeaturedShopSponsoredAd,
  StickyBottomSponsoredStrip,
} from "./ads.js";

type Market = {
  catalog: Catalog | null;
  catalogError: string;
  reloadCatalog: () => Promise<void>;
  session: Session | null;
  sessionError: string;
  refreshSession: () => Promise<void>;
};
const Context = createContext<Market>(null!);
const useMarket = () => useContext(Context);
const paymentLogos: Record<string, string> = {
  bkash: "/payment-methods/bkash.svg",
  nagad: "/payment-methods/nagad.svg",
  rocket: "/payment-methods/rocket.svg",
};
function useRouteShop() {
  const { catalog } = useMarket();
  const { pathname } = useLocation();
  const shopSlug =
    matchPath("/shops/:slug/*", pathname)?.params.slug ||
    matchPath("/shops/:slug", pathname)?.params.slug;
  if (shopSlug)
    return catalog?.shops.find(
      (shop) => shop.slug === shopSlug || shop.id === shopSlug,
    );
  const productId =
    matchPath("/products/:id", pathname)?.params.id ||
    matchPath("/checkout/:id", pathname)?.params.id;
  const product = catalog?.products.find((product) => product.id === productId);
  return product
    ? catalog?.shops.find((shop) => shop.id === product.shop_id)
    : undefined;
}
let boot: Promise<Session> | undefined;
function bootstrap() {
  return (boot ??= api<Session>("/session"));
}
function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="notice error">
      <p>{message}</p>
      {retry && (
        <button className="button small secondary" onClick={retry}>
          <RefreshCw size={15} />
          Try again
        </button>
      )}
    </div>
  );
}
function Loading() {
  return (
    <div className="loading" role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="loading-preview" aria-hidden="true"><span /><span /><span /></div>
    </div>
  );
}
function Empty({ title, children, heading: Heading = "h2" }: { title: string; children?: ReactNode; heading?: "h1" | "h2" }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <ShoppingBag />
      </div>
      <Heading>{title}</Heading>
      {children}
    </div>
  );
}
function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Arise Store home">
      <img src="/favicon.svg" width="38" height="38" alt="" />
      <span>
        arise<span className="brand-divider">/</span>
        <span className="brand-sub">store</span>
      </span>
    </Link>
  );
}
function savedWishlist(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem("arise_wishlist") || "[]");
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}
export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>(savedWishlist);
  useEffect(() => {
    const sync = () => setWishlist(savedWishlist());
    window.addEventListener("arise_wishlist_updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("arise_wishlist_updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleWishlist = (id: string) => {
    const next = wishlist.includes(id) ? wishlist.filter((x) => x !== id) : [...wishlist, id];
    setWishlist(next);
    try {
      localStorage.setItem("arise_wishlist", JSON.stringify(next));
      window.dispatchEvent(new Event("arise_wishlist_updated"));
    } catch {}
  };

  const isWishlisted = (id: string) => wishlist.includes(id);

  return { wishlist, toggleWishlist, isWishlisted };
}

export function WishlistModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { catalog } = useMarket();
  const { t, lang } = useLang();
  const { wishlist, toggleWishlist } = useWishlist();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  const items = (catalog?.products || []).filter((p) => wishlist.includes(p.id));

  return (
      <dialog
        ref={dialog}
        className="modal-card wishlist-modal"
        aria-labelledby="wishlist-title"
        onCancel={onClose}
        onClose={onClose}
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <Heart size={20} className="fill-heart" />
            <h2 id="wishlist-title">{t("savedItems")} ({items.length})</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close wishlist">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body wishlist-body">
          {items.length === 0 ? (
            <div className="empty-wishlist">
              <p>{t("noSavedItems")}</p>
              <Link to="/products" className="button secondary" onClick={onClose}>
                {t("browseProducts")}
              </Link>
            </div>
          ) : (
            <div className="wishlist-items-grid">
              {items.map((prod) => (
                <div key={prod.id} className="wishlist-item-row">
                  <div className="wishlist-item-art">
                    <Art product={prod} />
                  </div>
                  <div className="wishlist-item-details">
                    <Link to={productPath(prod, catalog!)} onClick={onClose} className="wishlist-item-title">
                      {prod.name}
                    </Link>
                    <span className="price">{money(minimumPrice(prod), prod.currency)}</span>
                  </div>
                  <div className="wishlist-item-actions">
                    <Link to={productPath(prod, catalog!)} onClick={onClose} className="button primary small">
                      {lang === "bn" ? "কিনুন" : "Buy"}
                    </Link>
                    <button
                      type="button"
                      className="button ghost small danger-text"
                      onClick={() => toggleWishlist(prod.id)}
                      title="Remove"
                      aria-label={`Remove ${prod.name} from wishlist`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </dialog>
  );
}

export function DynamicPaymentQR({
  provider,
  account,
  amount,
  orderRef,
}: {
  provider: string;
  account: string;
  amount: string;
  orderRef: string;
}) {
  const { t, lang } = useLang();
  const [mode, setMode] = useState<"qr" | "manual">("qr");
  const cleanAccount = account.replace(/\s+/g, "");

  const paymentString = `${provider.toLowerCase()}://payment?account=${cleanAccount}&amount=${amount}&ref=${orderRef}`;
  
  let appUrl = "";
  if (provider.toLowerCase().includes("bkash")) {
    appUrl = `bkash://payment?account=${cleanAccount}&amount=${amount}`;
  } else if (provider.toLowerCase().includes("nagad")) {
    appUrl = `nagad://payment?account=${cleanAccount}&amount=${amount}`;
  }

  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(paymentString);
    } catch {
      return [];
    }
  }, [paymentString]);

  const size = matrix.length || 29;
  const cellSize = 6;
  const qrPixelSize = size * cellSize;

  return (
    <div className="dynamic-qr-box">
      <div className="payment-mode-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "qr"}
          className={`tab-btn ${mode === "qr" ? "active" : ""}`}
          onClick={() => setMode("qr")}
        >
          {t("scanQrTitle")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "manual"}
          className={`tab-btn ${mode === "manual" ? "active" : ""}`}
          onClick={() => setMode("manual")}
        >
          {t("manualAccountTransfer")}
        </button>
      </div>

      {mode === "qr" && (
        <div className="qr-display-container">
          <div className="qr-svg-wrapper" aria-label={`Payment QR Code for ${provider}`}>
            <svg
              viewBox={`0 0 ${qrPixelSize} ${qrPixelSize}`}
              width={180}
              height={180}
              className="qr-svg-code"
            >
              <rect width="100%" height="100%" fill="#ffffff" />
              {matrix.map((row, r) =>
                row.map((dark, c) =>
                  dark ? (
                    <rect
                      key={`${r}-${c}`}
                      x={c * cellSize}
                      y={r * cellSize}
                      width={cellSize}
                      height={cellSize}
                      fill="#0f172a"
                    />
                  ) : null
                )
              )}
            </svg>
            <div className="qr-badge-pill">
              <span className={`provider-dot ${provider.toLowerCase()}`} />
              <strong>{provider.toUpperCase()} ৳{amount}</strong>
            </div>
          </div>

          <p className="qr-scan-instruction">
            {t("scanQrDesc")}
          </p>

          {appUrl && (
            <a
              href={appUrl}
              className="button primary open-app-deep-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} />
              {lang === "bn" ? `সরাসরি ${provider} অ্যাপে পে করুন` : `Open in ${provider} App`}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function TrackOrderPage() {
  const { t, lang } = useLang();
  const { session } = useMarket();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "done">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [foundOrders, setFoundOrders] = useState<Purchase[]>([]);
  const emailField = useRef<HTMLInputElement>(null);
  const otpField = useRef<HTMLInputElement>(null);
  const resultsTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (step === "otp") otpField.current?.focus();
    if (step === "done") resultsTitle.current?.focus();
    if (step === "email" && email) emailField.current?.focus();
  }, [step]);
  const ordersByShop = useMemo(() => {
    const map = new Map<string, { shop: Purchase["shop"]; orders: Purchase[] }>();
    for (const order of foundOrders) {
      const key = order.shop.id || order.shop.slug;
      if (!map.has(key)) map.set(key, { shop: order.shop, orders: [] });
      map.get(key)!.orders.push(order);
    }
    return Array.from(map.values());
  }, [foundOrders]);
  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ ok: boolean; message: string; demo_otp?: string }>("/orders/track/request-otp", {
        method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!result.ok) throw new Error(result.message || (lang === "bn" ? "কোড পাঠানো যায়নি। আবার চেষ্টা করুন।" : "We couldn’t send a code. Please try again."));
      setDemoOtp(session?.demo ? result.demo_otp || "" : "");
      setOtp("");
      setStep("otp");
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ ok: boolean; message: string; orders: Purchase[] }>("/orders/track/verify-otp", {
        method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });
      if (!result.ok) throw new Error(result.message || (lang === "bn" ? "কোড যাচাই করা যায়নি। আবার চেষ্টা করুন।" : "We couldn’t verify that code. Please try again."));
      setFoundOrders(result.orders || []);
      setStep("done");
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  const startAgain = () => { setStep("email"); setOtp(""); setDemoOtp(""); setError(""); };
  return (
    <main id="main" className="container track-order-page">
      <header className="page-intro track-intro">
        <p className="eyebrow">{lang === "bn" ? "অর্ডার ও ডেলিভারি" : "Orders & delivery"}</p>
        <h1>{t("trackTitle")}</h1>
        <p>{lang === "bn" ? "কেনাকাটার সময় দেওয়া ইমেইল দিয়ে আপনার অর্ডার খুঁজুন। পেমেন্ট ও ডেলিভারির আপডেট এক জায়গায় দেখুন।" : "Find your orders with the email you used at checkout. Check payment and delivery updates in one place."}</p>
      </header>
      <div className="track-workspace">
        <section className="panel track-primary" aria-label={lang === "bn" ? "অর্ডার অনুসন্ধান" : "Order lookup"}>
          <ol className="track-progress" aria-label={lang === "bn" ? "অর্ডার খোঁজার ধাপ" : "Order lookup progress"}>
            {[lang === "bn" ? "ইমেইল" : "Your email", lang === "bn" ? "যাচাই" : "Verify email", lang === "bn" ? "অর্ডার" : "Your orders"].map((label, index) => {
              const active = ["email", "otp", "done"].indexOf(step);
              return <li key={label} aria-current={index === active ? "step" : undefined} className={index < active ? "complete" : ""}><span>{index < active ? <Check size={14} /> : index + 1}</span>{label}</li>;
            })}
          </ol>
          {error && <ErrorBox message={error} />}
          {step === "email" && <form className="track-form" onSubmit={handleRequestOtp} aria-busy={busy}>
            <div className="track-form-heading"><Mail size={24} /><h2>{lang === "bn" ? "আপনার অর্ডার খুঁজুন" : "Find your orders"}</h2></div>
            <div className="field"><label htmlFor="track-email">{t("emailLabel")}</label>
              <input ref={emailField} id="track-email" type="email" required disabled={busy} autoComplete="email" spellCheck={false} aria-describedby="track-email-hint" value={email} onChange={event => setEmail(event.target.value)} placeholder={t("emailPlaceholder")} />
              <small id="track-email-hint">{lang === "bn" ? "অর্ডারের তথ্য দেখতে ইমেইল যাচাই করতে হবে।" : "Verify your email before viewing matching orders."}</small>
            </div>
            <button className="button primary full-width" type="submit" disabled={busy || !email.trim()}>{busy ? (lang === "bn" ? "পাঠানো হচ্ছে…" : "Sending…") : t("sendOtp")}<ArrowRight size={17} /></button>
            <p className="track-privacy-note"><LockKeyhole size={15} />{lang === "bn" ? "আপনার অর্ডারের তথ্য ব্যক্তিগত।" : "Your orders stay private."}</p>
          </form>}
          {step === "otp" && <form className="track-form" onSubmit={handleVerifyOtp} aria-busy={busy}>
            <div className="track-form-heading"><Mail size={24} /><h2>{lang === "bn" ? "ইমেইল দেখুন" : "Check your email"}</h2></div>
            <p className="track-code-destination" role="status">{lang === "bn" ? "যাচাইকরণ কোড পাঠানো হয়েছে:" : "A verification code was sent to:"}<strong>{email.trim()}</strong></p>
            {demoOtp && <p className="notice">{lang === "bn" ? "শুধু ডেমো কোড:" : "Demo code only:"} <strong>{demoOtp}</strong></p>}
            <label className="field" htmlFor="track-otp">{lang === "bn" ? "যাচাইকরণ কোড" : "Verification code"}
              <input ref={otpField} id="track-otp" type="text" inputMode="numeric" autoComplete="one-time-code" required disabled={busy} maxLength={6} value={otp} onChange={event => setOtp(event.target.value)} placeholder="1234" className="otp-input" />
            </label>
            <button className="button primary full-width" type="submit" disabled={busy || !otp.trim()}>{busy ? (lang === "bn" ? "যাচাই করা হচ্ছে…" : "Verifying…") : t("verifyOtp")}<ArrowRight size={17} /></button>
            <button className="text-link track-change-email" type="button" disabled={busy} onClick={startAgain}><ArrowLeft size={15} />{lang === "bn" ? "ইমেইল পরিবর্তন করুন" : "Change email"}</button>
          </form>}
          {step === "done" && <div className="track-results-container">
            <div className="track-results-heading"><CheckCircle2 size={24} /><div><h2 ref={resultsTitle} tabIndex={-1}>{lang === "bn" ? "আপনার অর্ডারসমূহ" : "Your orders"}</h2><p>{lang === "bn" ? `${foundOrders.length}টি অর্ডার পাওয়া গেছে` : `${foundOrders.length} ${foundOrders.length === 1 ? "order" : "orders"} found`}</p></div></div>
            {!foundOrders.length && <div className="empty"><h3>{lang === "bn" ? "কোনো অর্ডার পাওয়া যায়নি" : "No matching orders"}</h3><p>{lang === "bn" ? "অন্য ইমেইল দিয়ে চেষ্টা করুন বা এই ব্রাউজারের অর্ডার দেখুন।" : "Try another email or open purchases saved in this browser."}</p><Link className="button secondary" to="/purchases">{t("myPurchases")}</Link></div>}
            <div className="track-global-shops-container">{ordersByShop.map(group => <section key={group.shop.id || group.shop.slug} className="track-shop-card-section">
              <div className="track-shop-card-header"><div className="track-shop-identity-info"><span className="tiny-avatar">{group.shop.name.slice(0, 1)}</span><h3 className="track-shop-name">{group.shop.name}</h3></div><Link to={`/shops/${group.shop.slug}`} className="text-link">{lang === "bn" ? "শপ দেখুন" : "Visit shop"}<ArrowRight size={14} /></Link></div>
              <div className="purchase-list">{group.orders.map(order => <Link key={order.id} to={`/purchases/${order.id}`} className="track-order-row"><div><span className="order-ref">{order.ref}</span><h3>{order.name}</h3><p>{new Date(order.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}</p></div><div><strong className="price">{money(order.total, order.currency)}</strong><span className="pill">{order.payment_status === "paid" ? deliveryLabel(order.delivery_status, lang) : paymentLabel(order.payment_status, lang)}</span><span className="text-link">{lang === "bn" ? "অর্ডার দেখুন" : "View order"}<ArrowRight size={14} /></span></div></Link>)}</div>
            </section>)}</div>
            <button className="text-link" type="button" onClick={startAgain}><ArrowLeft size={15} />{lang === "bn" ? "অন্য ইমেইল দিয়ে খুঁজুন" : "Try another email"}</button>
          </div>}
        </section>
        <aside className="track-guidance" aria-label={lang === "bn" ? "অর্ডারের সহায়তা" : "Order help"}>
          <div className="track-browser-orders"><ShoppingBag size={24} /><h2>{lang === "bn" ? "এই ব্রাউজারে অর্ডার করেছেন?" : "Ordered in this browser?"}</h2><p>{lang === "bn" ? "সরাসরি আমার অর্ডারসমূহে গিয়ে পেমেন্ট ও ডেলিভারি দেখুন।" : "Open My purchases to check payment and delivery for orders already available to you."}</p><Link to="/purchases" className="button secondary">{t("myPurchases")}<ArrowRight size={16} /></Link></div>
          <div className="track-help-copy"><h3>{lang === "bn" ? "সহায়তা প্রয়োজন?" : "Need a hand?"}</h3><p>{lang === "bn" ? "অর্ডারের ইমেইল খুঁজে না পেলে এই ব্রাউজারে আমার অর্ডারসমূহ দেখুন। পেমেন্ট বা রিফান্ড নিয়ে বিক্রেতার সাথে যোগাযোগ করুন।" : "Can’t find the checkout email? Check My purchases in this browser. Contact the seller for payment or refund questions."}</p><Link className="text-link" to="/how-it-works">{t("howItWorks")}<ArrowRight size={15} /></Link></div>
        </aside>
      </div>
    </main>
  );
}

function TopAnnouncementBar() {
  const platform = usePlatformSettings();
  const shop = useRouteShop();
  const { lang } = useLang();

  const email = shop?.contact?.email;
  const waOrPhone = shop?.social_links?.whatsapp || shop?.contact?.whatsapp || shop?.contact?.phone;

  const shopSocials: { key: string; url: string; icon: ReactNode; label: string }[] = [];
  if (shop) {
    if (shop.social_links?.facebook) {
      shopSocials.push({ key: "facebook", url: shop.social_links.facebook, icon: <IconFacebook size={14} />, label: "Facebook" });
    }
    if (shop.social_links?.instagram) {
      shopSocials.push({ key: "instagram", url: shop.social_links.instagram, icon: <IconInstagram size={14} />, label: "Instagram" });
    }
    if (shop.social_links?.linkedin) {
      shopSocials.push({ key: "linkedin", url: shop.social_links.linkedin, icon: <IconLinkedin size={14} />, label: "LinkedIn" });
    }
    if (shop.social_links?.youtube) {
      shopSocials.push({ key: "youtube", url: shop.social_links.youtube, icon: <IconYouTube size={14} />, label: "YouTube" });
    }
    if (waOrPhone) {
      shopSocials.push({ key: "whatsapp", url: supportHref(waOrPhone), icon: <IconWhatsApp size={14} />, label: "WhatsApp" });
    }
  }

  return (
    <>
      <TopFlashSponsoredAd />
      <div className="site-top-bar" aria-label="Announcement & seller contact">
      <div className="site-top-bar-inner container">
        <div className="top-bar-announcement">
          <Link to={shop ? `/shops/${shop.slug}` : (platform.announcement_url || "/products")} className="announcement-pill-link">
            <span className="announcement-flash">⚡</span>
            <span>
              {shop
                ? (shop.tagline || (lang === "bn" ? `${shop.name}-এর পণ্য দেখুন` : `${shop.name} · Browse products`))
                : (platform.announcement || (lang === "bn" ? "স্বাধীন শপের পণ্য দেখুন" : "Browse products from independent shops"))}
            </span>
            <span className="announcement-arrow">→</span>
          </Link>
        </div>

        <div className="top-bar-meta">
          <div className="top-meta-item">
            <Clock size={13} className="top-meta-icon" />
            <span>
              {shop
                ? (lang === "bn" ? "সাপোর্টের জন্য বিক্রেতার সাথে যোগাযোগ করুন" : "Contact the seller for support")
                : (lang === "bn" ? "My purchases থেকে অর্ডার দেখুন" : "Follow your order in My purchases")}
            </span>
          </div>

          {email && (
            <div className="top-meta-item email-meta">
              <Mail size={13} className="top-meta-icon" />
              <a href={`mailto:${email}`}>{email}</a>
            </div>
          )}

          {shop ? (
            shopSocials.length > 0 && (
              <div className="top-bar-socials" aria-label={`${shop.name} social links`}>
                {shopSocials.map((item) => (
                  <a
                    key={item.key}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${item.label} (${shop.name})`}
                    title={`${shop.name} on ${item.label}`}
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            )
          ) : (
            <div className="top-bar-badges">
              <span className="top-trust-badge">🛡️ {lang === "bn" ? "স্বাধীন বিক্রেতা" : "Independent shops"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
  );
}

function SubNavBar() {
  const shop = useRouteShop();
  const { catalog } = useMarket();
  const { pathname, search } = useLocation();
  const { t, lang } = useLang();
  const shopSlug = shop?.slug || matchPath("/shops/:slug/*", pathname)?.params.slug || matchPath("/shops/:slug", pathname)?.params.slug;
  const shopBase = shopSlug ? `/shops/${shopSlug}` : "";
  const productsPath = shopBase || "/products";
  const productsActive = shopBase
    ? pathname === shopBase || pathname.startsWith(`${shopBase}/products/`) || pathname.startsWith("/checkout/")
    : pathname.startsWith("/products");
  const shopsActive = !shopBase && (pathname === "/shops" || pathname.startsWith("/shops/"));
  const [menu, setMenu] = useState<"categories" | "shop-types" | "help" | null>(null);
  const navigation = useRef<HTMLDivElement>(null);
  const categoriesButton = useRef<HTMLButtonElement>(null);
  const shopTypesButton = useRef<HTMLButtonElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const categories = [...new Set((catalog?.products || [])
    .filter(product => !shopBase || product.shop_id === shop?.id)
    .map(product => product.category))].filter(Boolean);
  const shopKinds = [...new Set((catalog?.shops || [])
    .map(s => s.kind || (s.commerce_mode === "digital" ? "Digital Products" : ""))
    .filter((kind): kind is string => Boolean(kind)))].sort();
  useEffect(() => setMenu(null), [pathname, search]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: MouseEvent) => {
      if (!navigation.current?.contains(event.target as Node)) setMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const prev = menu;
      setMenu(null);
      if (prev === "categories") categoriesButton.current?.focus();
      else if (prev === "shop-types") shopTypesButton.current?.focus();
      else helpButton.current?.focus();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);
  return (
    <div className="site-sub-nav" ref={navigation}>
      <nav className="sub-nav-inner container store-navigation" aria-label="Store navigation">
        <div className="navigation-primary">
          <div className={`navigation-products${productsActive ? " is-current" : ""}`}>
            <Link to={productsPath} aria-current={productsActive ? "page" : undefined} className="navigation-link">
              <LayoutGrid size={16} />{lang === "bn" ? "প্রোডাক্টস" : "Products"}
            </Link>
            <button ref={categoriesButton} type="button" className="category-pill-btn nav-category-toggle" aria-label={lang === "bn" ? "ক্যাটাগরি দেখুন" : "Browse categories"} aria-expanded={menu === "categories"} aria-controls="navigation-categories" onClick={() => setMenu(menu === "categories" ? null : "categories")}>
              <ChevronDown size={15} className={menu === "categories" ? "chevron-rotated" : ""} />
            </button>
            {menu === "categories" && <div id="navigation-categories" className="category-dropdown-menu navigation-dropdown" aria-label={lang === "bn" ? "প্রোডাক্ট ক্যাটাগরি" : "Product categories"}>
              <div className="navigation-menu-scroll">
              <p className="navigation-menu-label">{lang === "bn" ? "ক্যাটাগরি অনুযায়ী দেখুন" : "Browse by category"}</p>
              <Link to={productsPath} className="category-dropdown-item" onClick={() => setMenu(null)}>{t("allProducts")}<ArrowRight size={14} /></Link>
              {categories.map(category => <Link key={category} to={`${productsPath}?category=${encodeURIComponent(category)}`} className="category-dropdown-item" onClick={() => setMenu(null)}>{category}</Link>)}
              {!categories.length && <p className="navigation-menu-empty">{lang === "bn" ? "প্রোডাক্ট প্রকাশ হলে ক্যাটাগরি দেখা যাবে।" : "Categories appear as products are published."}</p>}
              </div>
            </div>}
          </div>
          {shopBase ? <>
            <NavLink to={`${shopBase}/reviews`} className="navigation-link">{lang === "bn" ? "রিভিউসমূহ" : "Reviews"}</NavLink>
            <NavLink to={`${shopBase}/info/about`} className="navigation-link">{lang === "bn" ? "শপ সম্পর্কে" : "About this shop"}</NavLink>
          </> : <>
            <div className={`navigation-products navigation-shops${shopsActive ? " is-current" : ""}`}>
              <Link to="/shops" aria-current={shopsActive ? "page" : undefined} className="navigation-link">
                <Store size={16} />{lang === "bn" ? "শপসমূহ" : "Shops"}
              </Link>
              <button
                ref={shopTypesButton}
                type="button"
                className="category-pill-btn nav-category-toggle"
                aria-label={lang === "bn" ? "শপ ক্যাটাগরি ব্রাউজ" : "Browse shop categories"}
                aria-expanded={menu === "shop-types"}
                aria-controls="navigation-shop-types"
                onClick={() => setMenu(menu === "shop-types" ? null : "shop-types")}
              >
                <ChevronDown size={15} className={menu === "shop-types" ? "chevron-rotated" : ""} />
              </button>
              {menu === "shop-types" && (
                <div id="navigation-shop-types" className="category-dropdown-menu navigation-dropdown" aria-label={lang === "bn" ? "শপ ক্যাটাগরি ডিরেক্টরি" : "Shop categories"}>
                  <div className="navigation-menu-scroll">
                    <p className="navigation-menu-label">{lang === "bn" ? "শপ ক্যাটাগরি অনুযায়ী খুঁজুন" : "Browse by shop category"}</p>
                    <Link to="/shops" className="category-dropdown-item" onClick={() => setMenu(null)}>
                      {lang === "bn" ? "সকল শপ" : "All shops"}
                      <ArrowRight size={14} />
                    </Link>
                    {shopKinds.map((kind) => (
                      <Link
                        key={kind}
                        to={`/shops?type=${encodeURIComponent(kind)}`}
                        className="category-dropdown-item"
                        onClick={() => setMenu(null)}
                      >
                        {kind}
                      </Link>
                    ))}
                    {!shopKinds.length && (
                      <p className="navigation-menu-empty">
                        {lang === "bn" ? "শপ যুক্ত হলে ক্যাটাগরি দেখা যাবে।" : "Categories appear as shops are registered."}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <NavLink to="/purchases" className="navigation-link"><ShoppingBag size={16} />{t("myPurchases")}</NavLink>
          </>}
        </div>
        <div className="navigation-utilities">
          {shopBase && <Link className="navigation-contact" to={`${shopBase}/info/contact`}><Mail size={15} />{lang === "bn" ? "বিক্রেতার সাথে যোগাযোগ" : "Contact seller"}</Link>}
          <div className="navigation-help">
            <button ref={helpButton} type="button" className={`navigation-help-button${["/track", "/how-it-works"].includes(pathname) ? " is-current" : ""}`} aria-expanded={menu === "help"} aria-controls="navigation-help" onClick={() => setMenu(menu === "help" ? null : "help")}>
              <BookOpen size={16} />{lang === "bn" ? "সহায়তা" : "Help"}<ChevronDown size={14} className={menu === "help" ? "chevron-rotated" : ""} />
            </button>
            {menu === "help" && <div id="navigation-help" className="category-dropdown-menu navigation-dropdown navigation-help-dropdown">
              <div className="navigation-menu-scroll">
              <p className="navigation-menu-label">{lang === "bn" ? "অর্ডার ও সহায়তা" : "Orders & support"}</p>
              {shopBase && <Link className="category-dropdown-item" to="/purchases" onClick={() => setMenu(null)}><ShoppingBag size={16} />{t("myPurchases")}</Link>}
              <Link className="category-dropdown-item" to="/track" onClick={() => setMenu(null)}><Package size={16} />{t("trackOrder")}</Link>
              <Link className="category-dropdown-item" to="/how-it-works" onClick={() => setMenu(null)}><BookOpen size={16} />{lang === "bn" ? "কেনাকাটার নির্দেশনা" : "Buying guide"}</Link>
              <Link className="category-dropdown-item" to={shopBase ? `${shopBase}/info/contact` : "/info/contact"} onClick={() => setMenu(null)}><Mail size={16} />{lang === "bn" ? "যোগাযোগ" : "Contact"}</Link>
              </div>
            </div>}
          </div>
        </div>
      </nav>
    </div>
  );
}

function Header() {
  const { session, refreshSession } = useMarket();
  const { t, lang, setLang, toggleLang } = useLang();
  const { wishlist } = useWishlist();
  const [showWishlist, setShowWishlist] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const navigate = useNavigate();
  const shop = useRouteShop();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const mobileShopSlug = shop?.slug || matchPath("/shops/:slug/*", location.pathname)?.params.slug || matchPath("/shops/:slug", location.pathname)?.params.slug;
  const mobileShopBase = mobileShopSlug ? `/shops/${mobileShopSlug}` : "";
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  useEffect(() => {
    const q = params.get("q") || params.get("search") || "";
    setHeaderSearch(q);
  }, [params]);

  const onSearchChange = (val: string) => {
    setHeaderSearch(val);
    const isCatalogPage = location.pathname === "/products" || (shop && location.pathname === `/shops/${shop.slug}`);
    if (isCatalogPage) {
      const next = new URLSearchParams(params);
      if (val.trim()) {
        next.set("q", val.trim());
      } else {
        next.delete("q");
        next.delete("search");
      }
      setParams(next, { replace: true });
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = headerSearch.trim();
    if (shop) {
      navigate(`/shops/${shop.slug}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    } else {
      navigate(`/products${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    }
  };

  return (
    <>
      <TopAnnouncementBar />
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="header-inner">
        {shop ? (
          <Link
            className="store-brand"
            to={`/shops/${shop.slug}`}
            aria-label={`${shop.name} shop home`}
          >
            <ShopAvatar shop={shop} />
            <span>
              <strong>{shop.name}</strong>
              <small>{shopType(shop)}</small>
            </span>
          </Link>
        ) : (
          <Brand />
        )}

        <form
          className="header-center-search"
          role="search"
          onSubmit={onSearchSubmit}
        >
          <Search size={16} className="header-search-icon" />
          <input
            type="search"
            placeholder={
              shop
                ? (lang === "bn" ? `${shop.name}-এর প্রোডাক্ট খুঁজুন...` : `Search in ${shop.name}...`)
                : (lang === "bn" ? "পণ্য, দোকান বা ক্যাটাগরি খুঁজুন..." : "Search products, shops, categories...")
            }
            value={headerSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={shop ? `Search ${shop.name} products` : "Search products"}
          />
          {headerSearch && (
            <button
              type="button"
              className="header-search-clear-btn"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
            >
              <X size={15} />
            </button>
          )}
        </form>

        <div className="header-actions">
          <button
            type="button"
            className="header-wishlist-btn icon-button"
            aria-label={`${t("wishlist")} (${wishlist.length})`}
            title={t("wishlist")}
            onClick={() => setShowWishlist(true)}
          >
            <Heart size={19} className={wishlist.length > 0 ? "fill-heart" : ""} />
            {wishlist.length > 0 && <span className="wishlist-badge">{wishlist.length}</span>}
          </button>

          <div className="lang-toggle-pill-group" role="group" aria-label="Language selection / ভাষা নির্বাচন">
            <button
              type="button"
              className={`lang-pill-btn ${lang === "bn" ? "active" : ""}`}
              onClick={() => setLang("bn")}
              aria-pressed={lang === "bn"}
              title="বাংলা ভাষা নির্বাচন করুন"
            >
              বাং
            </button>
            <button
              type="button"
              className={`lang-pill-btn ${lang === "en" ? "active" : ""}`}
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              title="Select English"
            >
              EN
            </button>
          </div>

          <Link
            to="/purchases"
            className="purchases-link"
            aria-label={t("myPurchases")}
          >
            <ShoppingBag size={19} />
            <span>{t("myPurchases")}</span>
          </Link>
          {!shop && (
            <Link className="button primary seller-nav" to="/seller">
              {session?.user ? "My shop" : t("openShop")}
            </Link>
          )}
          <button
            ref={menuButton}
            className="icon-button mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
          <div className="mobile-nav-content">
          <p className="mobile-navigation-label">{lang === "bn" ? "ব্রাউজ করুন" : "Browse"}</p>
          {mobileShopBase ? <>
            <NavLink to={mobileShopBase} end>{lang === "bn" ? "শপের প্রোডাক্টস" : "Shop products"}</NavLink>
            <NavLink to={`${mobileShopBase}/reviews`}>{lang === "bn" ? "রিভিউসমূহ" : "Reviews"}</NavLink>
            <NavLink to={`${mobileShopBase}/info/about`}>{lang === "bn" ? "শপ সম্পর্কে" : "About this shop"}</NavLink>
          </> : <>
            <NavLink to="/products">{lang === "bn" ? "প্রোডাক্টস" : "Products"}</NavLink>
            <NavLink to="/shops">{lang === "bn" ? "শপসমূহ" : "Shops"}</NavLink>
          </>}
          <p className="mobile-navigation-label">{lang === "bn" ? "অর্ডার ও সহায়তা" : "Orders & help"}</p>
          <NavLink to="/purchases">{t("myPurchases")}</NavLink>
          <NavLink to="/track">{t("trackOrder")}</NavLink>
          <NavLink to="/how-it-works">{lang === "bn" ? "কেনাকাটার নির্দেশনা" : "Buying guide"}</NavLink>
          <Link to={mobileShopBase ? `${mobileShopBase}/info/contact` : "/info/contact"}>{lang === "bn" ? "যোগাযোগ" : "Contact"}</Link>
          <button
            type="button"
            className="mobile-nav-action-btn"
            onClick={() => {
              setOpen(false);
              setShowWishlist(true);
            }}
          >
            <Heart size={18} className={wishlist.length > 0 ? "fill-heart" : ""} />
            <span>{t("wishlist")} ({wishlist.length})</span>
          </button>
          <div className="mobile-lang-row">
            <span className="mobile-lang-label">🌐 {lang === "bn" ? "ভাষা:" : "Language:"}</span>
            <div className="lang-toggle-pill-group" role="group" aria-label="Mobile language switcher">
              <button
                type="button"
                className={`lang-pill-btn ${lang === "bn" ? "active" : ""}`}
                onClick={() => setLang("bn")}
                aria-pressed={lang === "bn"}
              >
                বাংলা
              </button>
              <button
                type="button"
                className={`lang-pill-btn ${lang === "en" ? "active" : ""}`}
                onClick={() => setLang("en")}
                aria-pressed={lang === "en"}
              >
                EN
              </button>
            </div>
          </div>
          {!shop && (
            <>
              <Link to="/seller">{t("openShop")}</Link>
            </>
          )}
          </div>
        </nav>
      )}
      <SubNavBar />
      <WishlistModal open={showWishlist} onClose={() => setShowWishlist(false)} />
    </header>
      {session?.demo && (
        <div className="demo-bar">
          <span className="status-dot" />
          Development preview · Sample shops & products. No real payments.
        </div>
      )}
      {session?.user && (
        <div className="account-bar">
          <span>Signed in as {session.user.name}</span>
          <div>
            {session.user.admin && <Link to="/admin">Marketplace admin</Link>}
            <button
              onClick={async () => {
                try {
                  await api("/auth/logout", { method: "POST" });
                  boot = undefined;
                  await refreshSession();
                } catch {
                  window.location.reload();
                }
              }}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
function IconLinkedin({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

function IconYouTube({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function ShopContactContent({ shop, lang, support }: { shop: Shop; lang: "bn" | "en"; support: string }) {
  const waNumber = shop.contact?.whatsapp || shop.social_links?.whatsapp || (shop.support && !shop.support.includes("@") ? shop.support : "");
  const emailAddr = shop.contact?.email || (shop.support?.includes("@") ? shop.support : "");
  const phoneNum = shop.contact?.phone || (!emailAddr && shop.support && !shop.support.includes("@") ? shop.support : "");
  const fullAddress = [shop.contact?.address, shop.contact?.city_division, shop.contact?.postal_code]
    .filter(Boolean)
    .join(", ");

  let waTarget = waNumber ? supportHref(waNumber) : (support && !support.includes("@") ? supportHref(support) : "");
  if (waTarget && !/^https:\/\//i.test(waNumber || support)) {
    try {
      const u = new URL(waTarget);
      u.searchParams.set("text", `Hello ${shop.name}! I am contacting you from Arise Store.`);
      waTarget = u.toString();
    } catch {}
  }

  const customSellerNote = shop.pages?.contact?.trim();

  return (
    <div className="shop-contact-hub">
      <div className="contact-channels-grid">
        {(waNumber || (support && !support.includes("@"))) && (
          <div className="contact-channel-card card-whatsapp">
            <div className="card-top-row">
              <span className="contact-card-icon icon-whatsapp" aria-hidden="true">
                <IconWhatsApp size={22} />
              </span>
              <span className="contact-channel-status">
                <span className="online-dot" />
                {lang === "bn" ? "ইনস্ট্যান্ট চ্যাট সক্রিয়" : "Instant Chat Active"}
              </span>
            </div>
            <h3 className="contact-card-title">{lang === "bn" ? "হোয়াটসঅ্যাপ সাপোর্ট" : "WhatsApp Support"}</h3>
            <p className="contact-card-value">{waNumber || shop.support}</p>
            <p className="contact-card-desc">
              {lang === "bn"
                ? "দ্রুততম সময়ে সরাসরি সহায়তা পেতে হোয়াটসঅ্যাপে মেসেজ দিন।"
                : "Fastest response channel for inquiries and order assistance."}
            </p>
            <a
              href={waTarget || supportHref(waNumber || support)}
              target="_blank"
              rel="noopener noreferrer"
              className="button primary contact-card-btn wa-action-btn"
            >
              <IconWhatsApp size={16} aria-hidden="true" />
              <span>{lang === "bn" ? "হোয়াটসঅ্যাপে চ্যাট করুন" : "Chat on WhatsApp"}</span>
            </a>
          </div>
        )}

        {(emailAddr || (support && support.includes("@"))) && (
          <div className="contact-channel-card card-email">
            <div className="card-top-row">
              <span className="contact-card-icon icon-email" aria-hidden="true">
                <IconMail size={22} />
              </span>
              <span className="contact-channel-status text-muted-badge">
                {lang === "bn" ? "অফিশিয়াল সাপোর্ট" : "Official Support"}
              </span>
            </div>
            <h3 className="contact-card-title">{lang === "bn" ? "ইমেইল সহায়তা" : "Email Support"}</h3>
            <p className="contact-card-value">{emailAddr || support}</p>
            <p className="contact-card-desc">
              {lang === "bn"
                ? "অর্ডার ইনভয়েস, করপোরেট বা বিস্তারিত অনুসন্ধানের জন্য।"
                : "For detailed order questions, invoices, or official inquiries."}
            </p>
            <a
              href={`mailto:${emailAddr || support}`}
              className="button secondary contact-card-btn email-action-btn"
            >
              <IconMail size={16} aria-hidden="true" />
              <span>{lang === "bn" ? "ইমেইল পাঠান" : "Send Email"}</span>
            </a>
          </div>
        )}

        {phoneNum && phoneNum !== waNumber && (
          <div className="contact-channel-card card-phone">
            <div className="card-top-row">
              <span className="contact-card-icon icon-phone" aria-hidden="true">
                <IconPhone size={22} />
              </span>
              <span className="contact-channel-status text-muted-badge">
                {lang === "bn" ? "সরাসরি হটলাইন" : "Direct Hotline"}
              </span>
            </div>
            <h3 className="contact-card-title">{lang === "bn" ? "সরাসরি ফোন কল" : "Phone Call"}</h3>
            <p className="contact-card-value">{phoneNum}</p>
            <p className="contact-card-desc">
              {lang === "bn"
                ? "জরুরি বা বিশেষ প্রয়োজনে সরাসরি সেলারকে কল করুন।"
                : "Call seller directly for urgent queries or immediate assistance."}
            </p>
            <a
              href={`tel:${phoneNum.replace(/\s+/g, "")}`}
              className="button secondary contact-card-btn phone-action-btn"
            >
              <IconPhone size={16} aria-hidden="true" />
              <span>{lang === "bn" ? "সরাসরি কল দিন" : "Call Now"}</span>
            </a>
          </div>
        )}

        {fullAddress && (
          <div className="contact-channel-card card-location">
            <div className="card-top-row">
              <span className="contact-card-icon icon-location" aria-hidden="true">
                <IconMapPin size={22} />
              </span>
              <span className="contact-channel-status text-muted-badge">
                {lang === "bn" ? "ভেরিফাইড ঠিকানা" : "Verified Location"}
              </span>
            </div>
            <h3 className="contact-card-title">{lang === "bn" ? "শপের ঠিকানা" : "Store Location"}</h3>
            <p className="contact-card-value">{fullAddress}</p>
            <p className="contact-card-desc">
              {lang === "bn"
                ? "সেলার শপের রেজিস্টার্ড ব্যবসায়িক অফিস ঠিকানা।"
                : "Registered business location for this verified merchant."}
            </p>
          </div>
        )}
      </div>

      {customSellerNote && (
        <div className="contact-custom-note-panel">
          <h4>{lang === "bn" ? "সেলার থেকে বিশেষ বার্তা:" : "Message from Seller:"}</h4>
          <p className="preserve-lines">{customSellerNote}</p>
        </div>
      )}

      {shop.social_links && Object.values(shop.social_links).some(Boolean) && (
        <div className="contact-social-channels">
          <h4>{lang === "bn" ? "কমিউনিটি ও সোশ্যাল মিডিয়া চ্যানেল" : "Community & Social Channels"}</h4>
          <SocialLinks shop={shop} className="contact-social-row" />
        </div>
      )}

      {support && (
        <div className="shop-policy-support">
          <a className="button secondary" href={supportHref(support)}>
            <Phone size={16} aria-hidden="true" />
            {lang === "bn" ? "সাপোর্টে যোগাযোগ করুন" : "Contact support"}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}

function ShopInformationPage() {
  const platform = usePlatformSettings();
  const { slug, section: paramSection } = useParams();
  const { pathname } = useLocation();
  const sectionKey = paramSection || (pathname.endsWith("/contact") ? "contact" : "");
  const { catalog, catalogError, reloadCatalog } = useMarket();
  const shop = useRouteShop();
  const { lang } = useLang();
  const section = shopPageSections.find(section => section.key === sectionKey);
  const title = section ? (lang === "bn" ? section.titleBn : section.title) : "";
  const shopName = shop?.name || "Arise Store";
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} | ${shopName}`;
    return () => { document.title = previous; };
  }, [title, shopName]);
  if (slug && catalogError && !catalog) return <main id="main" className="container section"><ErrorBox message={catalogError} retry={() => void reloadCatalog()} /></main>;
  if (slug && !catalog) return <Loading />;
  if (!section || (slug && !shop)) return <NotFound />;
  const text = (shop ? shop.pages?.[section.key]?.trim() || (section.key === "about" ? shop.description : "") : platform.pages?.[section.key]?.trim());
  const support = shop?.support || (!shop ? platform.support_email || "" : "");
  return (
    <main id="main" className="container narrow-page shop-policy-page">
      <Link className="text-link" to={shop ? `/shops/${shop.slug}` : "/"}>
        <ArrowLeft size={16} aria-hidden="true" />
        {shop ? (lang === "bn" ? "শপে ফিরে যান" : "Back to shop") : (lang === "bn" ? "হোমে ফিরে যান" : "Back to home")}
      </Link>
      <div className="page-intro">
        <p className="eyebrow">{shopName}</p>
        <h1>{title}</h1>
      </div>
      <article className="panel shop-policy-content">
        {text ? <p className="preserve-lines">{text}</p> : (
          (!shop || section.key !== "contact") && <p className="muted">{lang === "bn"
            ? "এই তথ্য এখনও যোগ করা হয়নি। বিস্তারিত জানতে যোগাযোগ করুন।"
            : "This information has not been added yet. Contact support for details."}</p>
        )}
        {section.key === "contact" && shop ? (
          <ShopContactContent shop={shop} lang={lang} support={support} />
        ) : (
          <>
            {section.key === "contact" && shop && <ShopContactChips shop={shop} />}
            {support && <div className="shop-policy-support">
              <a className="button secondary" href={supportHref(support)}>
                <Phone size={16} aria-hidden="true" />{lang === "bn" ? "সাপোর্টে যোগাযোগ করুন" : "Contact support"}<ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>}
          </>
        )}
      </article>
    </main>
  );
}

function Footer() {
  const shop = useRouteShop();
  const { pathname } = useLocation();
  const shopSlug = shop?.slug ||
    matchPath("/shops/:slug/*", pathname)?.params.slug ||
    matchPath("/shops/:slug", pathname)?.params.slug;
  const { catalog } = useMarket();
  const { t, lang } = useLang();

  if (shop || shopSlug) {
    const slug = shop?.slug || shopSlug!;
    const shopName = shop?.name || slug;
    const fullAddress = [shop?.contact?.address, shop?.contact?.city_division, shop?.contact?.postal_code]
      .filter(Boolean)
      .join(", ");
    const phone = shop?.contact?.whatsapp || shop?.contact?.phone;
    const email = shop?.contact?.email;

    const productsList = (catalog?.products || [])
      .filter((p) => (shop ? p.shop_id === shop.id : false) && p.sales_enabled)
      .slice(0, 5);

    const shopSocials: { key: string; label: string; url: string; icon: ReactNode }[] = [
      shop?.social_links?.facebook && { key: "facebook", label: "Facebook", url: shop.social_links.facebook, icon: <IconFacebook size={14} /> },
      shop?.social_links?.instagram && { key: "instagram", label: "Instagram", url: shop.social_links.instagram, icon: <IconInstagram size={14} /> },
      shop?.social_links?.tiktok && { key: "tiktok", label: "TikTok", url: shop.social_links.tiktok, icon: <IconTikTok size={14} /> },
      shop?.social_links?.linkedin && { key: "linkedin", label: "LinkedIn", url: shop.social_links.linkedin, icon: <IconLinkedin size={14} /> },
      shop?.social_links?.youtube && { key: "youtube", label: "YouTube", url: shop.social_links.youtube, icon: <IconYouTube size={14} /> },
      shop?.social_links?.website && { key: "website", label: "Website", url: shop.social_links.website, icon: <IconGlobe size={14} /> },
      (shop?.social_links?.whatsapp || phone) && {
        key: "whatsapp",
        label: "WhatsApp",
        url: supportHref(shop?.social_links?.whatsapp || phone || ""),
        icon: <IconWhatsApp size={14} />,
      },
    ].filter(Boolean) as { key: string; label: string; url: string; icon: ReactNode }[];

    return (
      <footer className="dark-theme-footer store-footer">
        <div className="dark-footer-inner store-footer-card container">
          <div className="dark-footer-grid">
            {/* Column 1: Shop Brand & Dynamic Contact Info */}
            <div className="dark-footer-col dark-brand-col">
              <div className="dark-footer-brand-header">
                {shop ? (
                  <div className="dark-shop-avatar-wrap">
                    <ShopAvatar shop={shop} />
                  </div>
                ) : (
                  <div className="dark-logo-icon">
                    <span className="logo-sparkle">✦</span>
                  </div>
                )}
                <div className="dark-brand-title-wrap">
                  <strong className="dark-brand-name">{shopName}</strong>
                  {shop && (
                    <span className="seller-verified-badge dark-verified-badge" title="Connected through AriseSell">
                      <ShieldCheck size={12} /> {lang === "bn" ? "AriseSell শপ" : "AriseSell shop"}
                    </span>
                  )}
                </div>
              </div>
              <p className="dark-brand-tagline">
                {shop?.tagline || shop?.description || (lang === "bn" ? "এই শপের পণ্য দেখুন এবং প্রয়োজনে বিক্রেতার সাথে যোগাযোগ করুন।" : "Browse this shop’s products and contact the seller for help.")}
              </p>
              <div className="dark-contact-list">
                {fullAddress && (
                  <div className="dark-contact-item">
                    <span className="dark-contact-icon"><IconMapPin size={16} /></span>
                    <span><strong>{lang === "bn" ? "ঠিকানা:" : "Address:"}</strong> {fullAddress}</span>
                  </div>
                )}
                {phone && (
                  <div className="dark-contact-item">
                    <span className="dark-contact-icon"><IconWhatsApp size={16} /></span>
                    <a href={supportHref(phone)} target="_blank" rel="noopener noreferrer" className="dark-contact-link">
                      <strong>{lang === "bn" ? "হোয়াটসঅ্যাপ (মেসেজ):" : "WhatsApp (Message only):"}</strong> {phone}
                    </a>
                  </div>
                )}
                {email && (
                  <div className="dark-contact-item">
                    <span className="dark-contact-icon"><IconMail size={16} /></span>
                    <a href={`mailto:${email}`} className="dark-contact-link">
                      <strong>{lang === "bn" ? "ইমেইল:" : "Email:"}</strong> {email}
                    </a>
                  </div>
                )}
                {!fullAddress && !phone && !email && shop?.support && (
                  <div className="dark-contact-item">
                    <span className="dark-contact-icon"><IconGlobe size={16} /></span>
                    <a href={supportHref(shop.support)} target="_blank" rel="noopener noreferrer" className="dark-contact-link">
                      <strong>{lang === "bn" ? "সাপোর্ট:" : "Support:"}</strong> {shop.support}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Recent Products in this Shop */}
            <div className="dark-footer-col dark-products-col">
              <span className="dark-footer-heading">{lang === "bn" ? "শপ প্রোডাক্টসমূহ" : "Recent products"}</span>
              <ul className="dark-footer-links-list">
                {productsList.length > 0 ? (
                  productsList.map((p) => (
                    <li key={p.id}>
                      <Link to={catalog ? productPath(p, catalog) : `/products/${p.id}`} className="dark-product-link">
                        <span className="bullet-dot">›</span>
                        <span className="product-link-text">{p.name}</span>
                      </Link>
                    </li>
                  ))
                ) : (
                  <li>
                    <Link to={`/shops/${slug}`} className="dark-product-link">
                      <span className="bullet-dot">›</span>
                      <span>{lang === "bn" ? "সব প্রোডাক্ট দেখুন" : "View all products"}</span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Column 3: Shop Social Links & Seller Community Shortcuts */}
            <div className="dark-footer-col dark-social-col">
              <span className="dark-footer-heading">{lang === "bn" ? "সোশ্যাল মিডিয়া ও সাপোর্ট" : "Community & social"}</span>
              <div className="dark-social-pills-row footer-platform-links">
                {shopSocials.map((item) => (
                  <a
                    key={item.key}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dark-social-pill"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                ))}
                {shop && (
                  <Link to={`/shops/${slug}/reviews`} className="dark-social-pill">
                    <Star size={14} />
                    <span>{lang === "bn" ? "গ্রাহক রিভিউসমূহ" : "Customer reviews"}</span>
                  </Link>
                )}
                {shopSocials.length <= 2 && (
                  <Link to="/shops" className="dark-social-pill">
                    <Store size={14} />
                    <span>{lang === "bn" ? "সকল শপ ব্রাউজ করুন" : "Browse All Shops"}</span>
                  </Link>
                )}
                {shopSocials.length === 0 && (
                  <Link to="/seller" className="dark-social-pill">
                    <Store size={14} />
                    <span>{lang === "bn" ? "নিজের শপ খুলুন" : "Open Your Shop"}</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Column 4: Shop Useful Links */}
            <div className="dark-footer-col dark-links-col">
              <span className="dark-footer-heading">{lang === "bn" ? "প্রয়োজনীয় লিংকসমূহ" : "Useful links"}</span>
              <ul className="dark-footer-links-list">
                {shopPageSections.map(section => (
                  <li key={section.key}>
                    <Link to={`/shops/${slug}/info/${section.key}`} className="dark-footer-link-btn">
                      {lang === "bn" ? section.titleBn : section.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/track" className="dark-footer-link-btn highlight-link">
                    {lang === "bn" ? "অর্ডার ট্র্যাক" : "Track Order"}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Sub-bottom Bar */}
          <div className="dark-footer-subbottom">
            <span className="dark-copyright">
              © {new Date().getFullYear()} {shopName}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
            </span>
            <span className="dark-powered">
              {lang === "bn" ? "অর্ডার পরিচালনায় " : "Orders managed via "}
              <strong>AriseSell</strong>
            </span>
          </div>
        </div>
      </footer>
    );
  }

  // Marketplace Level Footer (When not inside a specific shop)
  const trendingProducts = (catalog?.products || []).filter((p) => p.sales_enabled).slice(0, 5);

  return (
    <footer className="dark-theme-footer store-footer">
      <div className="dark-footer-inner store-footer-card container">
        <div className="dark-footer-grid">
          {/* Column 1: Marketplace Brand */}
          <div className="dark-footer-col dark-brand-col">
            <div className="dark-footer-brand-header">
              <div className="dark-logo-icon">
                <span className="logo-sparkle">✦</span>
              </div>
              <div className="dark-brand-title-wrap">
                <strong className="dark-brand-name">Arise Store</strong>
              </div>
            </div>
            <p className="dark-brand-tagline">
              {lang === "bn"
                ? "স্বাধীন শপের পণ্য দেখুন। পেমেন্ট, স্টক ও ডেলিভারি বিক্রেতা AriseSell-এ পরিচালনা করেন।"
                : "Products from independent shops. Payments, stock and delivery are managed by each seller in AriseSell."}
            </p>
            <div className="dark-contact-list">
              <div className="dark-contact-item">
                <Store size={16} className="dark-contact-icon" />
                <span>{lang === "bn" ? "স্বাধীন শপ থেকে সরাসরি কেনাকাটা" : "Buy directly from independent shops"}</span>
              </div>
              <div className="dark-contact-item">
                <Package size={16} className="dark-contact-icon" />
                <span>{lang === "bn" ? "অর্ডার থেকে ডেলিভারি স্ট্যাটাস দেখুন" : "Track payment and delivery in your orders"}</span>
              </div>
              <div className="dark-contact-item">
                <LockKeyhole size={16} className="dark-contact-icon" />
                <span>{lang === "bn" ? "বিক্রেতার পেমেন্ট পদ্ধতি" : "Seller-configured payment methods"}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Trending Marketplace Products */}
          <div className="dark-footer-col dark-products-col">
            <span className="dark-footer-heading">{lang === "bn" ? "জনপ্রিয় প্রোডাক্টসমূহ" : "Recent products"}</span>
            <ul className="dark-footer-links-list">
              {trendingProducts.length > 0 ? (
                trendingProducts.map((p) => (
                  <li key={p.id}>
                    <Link to={catalog ? productPath(p, catalog) : `/products/${p.id}`} className="dark-product-link">
                      <span className="bullet-dot">›</span>
                      <span className="product-link-text">{p.name}</span>
                    </Link>
                  </li>
                ))
              ) : (
                <li><Link to="/products" className="dark-product-link">{lang === "bn" ? "সব প্রোডাক্ট দেখুন" : "Browse all products"}</Link></li>
              )}
            </ul>
          </div>

          {/* Column 3: Platform Community & Shortcuts */}
          <div className="dark-footer-col dark-social-col">
            <span className="dark-footer-heading">{lang === "bn" ? "মার্কেটপ্লেস ও প্ল্যাটফর্ম" : "Marketplace & platform"}</span>
            <div className="dark-social-pills-row footer-platform-links">
              <Link to="/seller" className="dark-social-pill">
                <Store size={14} />
                <span>{lang === "bn" ? "নিজের শপ খুলুন" : "Open Your Shop"}</span>
              </Link>
              <Link to="/shops" className="dark-social-pill">
                <LayoutGrid size={14} />
                <span>{lang === "bn" ? "সকল শপ ব্রাউজ করুন" : "Browse All Shops"}</span>
              </Link>
              <Link to="/track" className="dark-social-pill">
                <Package size={14} />
                <span>{lang === "bn" ? "অর্ডার ট্র্যাক করুন" : "Track Orders"}</span>
              </Link>
              <Link to="/how-it-works" className="dark-social-pill">
                <BookOpen size={14} />
                <span>{lang === "bn" ? "কীভাবে কাজ করে" : "How It Works"}</span>
              </Link>
            </div>
          </div>

          {/* Column 4: Marketplace Useful Links */}
          <div className="dark-footer-col dark-links-col">
            <span className="dark-footer-heading">{lang === "bn" ? "প্রয়োজনীয় লিংকসমূহ" : "Useful links"}</span>
            <ul className="dark-footer-links-list">
              {shopPageSections.map(section => (
                <li key={section.key}>
                  <Link to={`/info/${section.key}`} className="dark-footer-link-btn">
                    {lang === "bn" ? section.titleBn : section.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/track" className="dark-footer-link-btn highlight-link">
                  {lang === "bn" ? "অর্ডার ট্র্যাক" : "Track Order"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Sub-bottom Bar */}
        <div className="dark-footer-subbottom">
          <span className="dark-copyright">
            © {new Date().getFullYear()} Arise Store. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
          </span>
          <span className="dark-powered">
            {lang === "bn" ? "অর্ডার পরিচালনায় " : "Orders managed via "}
            <strong>AriseSell</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}
export function resolveImageUrl(
  url: string | null | undefined,
  sourceWeb?: string,
  shopSlug?: string,
  productName?: string,
): string | null {
  const base = (sourceWeb || "https://arisesell.com").replace(/\/+$/, "");
  const toSlug = (text: string) =>
    text
      .normalize("NFKC")
      .toLowerCase()
      .replace(/['\u2019]/g, "")
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");

  if (!url) {
    if (shopSlug && productName) {
      const slug = toSlug(productName);
      if (slug) return `${base}/${encodeURIComponent(shopSlug)}/${encodeURIComponent(slug)}`;
    }
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    if (shopSlug && productName) {
      const slug = toSlug(productName);
      if (slug) return `${base}/${encodeURIComponent(shopSlug)}/${encodeURIComponent(slug)}`;
    }
    return null;
  }
  // When an internal unsigned upload path is received, resolve to the public permanent store route
  if (/^\/?api\/v1\/catalog\/image-assets\/[0-9a-fA-F-]{36}\/content$/i.test(trimmed)) {
    if (shopSlug && productName) {
      const slug = toSlug(productName);
      if (slug) return `${base}/${encodeURIComponent(shopSlug)}/${encodeURIComponent(slug)}`;
    }
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return `${base}${trimmed}`;
  }
  return null;
}
function CategoryIcon({
  category,
  size = 20,
}: {
  category: string;
  size?: number;
}) {
  const Icon = /ai|gpt|chatgpt|openai|bot|intelligence/i.test(category)
    ? Bot
    : /learn|course|education|udemy|academy/i.test(category)
      ? BookOpen
      : /design|template/i.test(category)
        ? Palette
        : /develop|code|software/i.test(category)
          ? Code2
          : /photo|video|creative/i.test(category)
            ? Play
            : /productiv/i.test(category)
              ? Command
              : Layers;
  return <Icon size={size} />;
}
function Art({
  product,
  large = false,
}: {
  product: Product;
  large?: boolean;
}) {
  const { session, catalog } = useMarket();
  const [imgFailed, setImgFailed] = useState(false);
  const shop = catalog?.shops.find((s) => s.id === product.shop_id);
  const imageUrl = resolveImageUrl(product.image_url, session?.source_web, shop?.slug, product.name);
  let hash = 0;
  for (const c of product.category) hash += c.charCodeAt(0);
  const tone = hash % 6;

  const isAi = /ai|gpt|chatgpt|openai|claude|gemini/i.test(
    `${product.name} ${product.category}`,
  );
  const isEducation = /learn|course|education|udemy|coursera|tutorial/i.test(
    `${product.name} ${product.category}`,
  );

  return (
    <div
      aria-hidden="true"
      className={`product-art art-${tone} ${large ? "large-art" : ""}`}
    >
      {imageUrl && !imgFailed ? (
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            setImgFailed(true);
          }}
        />
      ) : null}
      {(!imageUrl || imgFailed) && <div className="art-digital-badge">
        <div className="art-emblem">
          {isAi ? (
            <Bot size={large ? 44 : 32} />
          ) : isEducation ? (
            <BookOpen size={large ? 44 : 32} />
          ) : (
            <CategoryIcon category={product.category} size={large ? 44 : 32} />
          )}
        </div>
        <span className="art-brand-pill">
          {product.category || "Product"}
        </span>
      </div>}
    </div>
  );
}
function ProductCard({ product }: { product: Product }) {
  const { catalog } = useMarket();
  const { lang } = useLang();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wish = isWishlisted(product.id);
  const shop = catalog?.shops.find((s) => s.id === product.shop_id);
  return (
    <article className="product-card">
      <div className="product-card-visual-wrapper">
        <Link
          to={productPath(product, catalog!)}
          className="product-art-link"
          aria-label={`View ${product.name}`}
        >
          <Art product={product} />
        </Link>
        <button
          type="button"
          className={`card-wishlist-btn ${wish ? "active" : ""}`}
          aria-label={wish ? "Remove from wishlist" : "Save to wishlist"}
          title={wish ? "In your wishlist" : "Save for later"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
        >
          <Heart size={16} className={wish ? "fill-heart" : ""} />
        </button>
      </div>
      <div className="product-info">
        <span className="card-category">{product.category}</span>
        <Link to={productPath(product, catalog!)} className="product-title">
          {product.name}
        </Link>
        <Link
          to={`/shops/${shop?.slug || product.shop_id}`}
          className="by-shop"
        >
          <span className="tiny-avatar">{shop?.name.slice(0, 1) || "S"}</span>
          {shop?.name || "Independent shop"}
        </Link>
        <div className="product-meta">
          <span className={product.sales_enabled && stock(product) > 0 ? "availability" : "sold-out"}>
            {!product.sales_enabled ? (lang === "bn" ? "ক্রয় সাময়িক বন্ধ" : "Purchases paused") : stock(product) > 0 ? (
              productFulfilment(product) === "physical" ? <>Physical delivery</> : product.delivery_mode === "automatic" ? (
                <>
                  <Zap size={12} />
                  {lang === "bn" ? "অটো ডেলিভারি" : "Automatic delivery"}
                </>
              ) : (
                lang === "bn" ? "ম্যানুয়াল ডেলিভারি" : "Seller-prepared delivery"
              )
            ) : (
              lang === "bn" ? "স্টক শেষ" : "Sold out"
            )}
          </span>
        </div>
        <div className="product-bottom">
          <span className="price">
            {product.variants.length > 1 && <small>{lang === "bn" ? "শুরু " : "From "}</small>}
            {money(minimumPrice(product), product.currency)}
          </span>
          <Link className="card-buy" to={productPath(product, catalog!)} aria-label={`View options for ${product.name}`}><ArrowUpRight size={19} /></Link>
        </div>
      </div>
    </article>
  );
}
function IconFacebook({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconInstagram({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconTikTok({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.48c.84-.84 1.34-1.98 1.38-3.18V8.92a8.27 8.27 0 0 0 4.39 1.25V6.69z" />
    </svg>
  );
}

function IconWhatsApp({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.41a8.16 8.16 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.53c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.3z" />
    </svg>
  );
}

function IconMapPin({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconMail({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconPhone({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconGlobe({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function SocialLinks({ shop, className = "shop-social-links" }: { shop: Shop; className?: string }) {
  const links = shop.social_links;
  if (!links) return null;

  const items: { key: string; label: string; url: string; icon: ReactNode }[] = [
    { key: "facebook", label: "Facebook", url: links.facebook || "", icon: <IconFacebook size={18} /> },
    { key: "instagram", label: "Instagram", url: links.instagram || "", icon: <IconInstagram size={18} /> },
    { key: "tiktok", label: "TikTok", url: links.tiktok || "", icon: <IconTikTok size={18} /> },
    { key: "whatsapp", label: "WhatsApp", url: links.whatsapp || "", icon: <IconWhatsApp size={18} /> },
    { key: "maps", label: "Google Maps", url: links.maps || "", icon: <IconMapPin size={18} /> },
    { key: "website", label: "Website", url: links.website || "", icon: <IconGlobe size={18} /> },
  ].filter((item) => Boolean(item.url));

  if (items.length === 0) return null;

  return (
    <div className={className} aria-label={`${shop.name} social links`}>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`social-pill social-${item.key}`}
          aria-label={`${item.label} (${shop.name})`}
          title={`${shop.name} on ${item.label}`}
        >
          <span className="social-icon" aria-hidden="true">{item.icon}</span>
          <span className="social-text">{item.label}</span>
        </a>
      ))}
    </div>
  );
}

export function ShopContactChips({ shop, className = "shop-contact-chips" }: { shop: Shop; className?: string }) {
  const contact = shop.contact;
  if (!contact) return null;

  const fullAddress = [contact.address, contact.city_division, contact.postal_code]
    .filter(Boolean)
    .join(", ");

  const hasAny = Boolean(contact.email || contact.phone || contact.whatsapp || fullAddress);
  if (!hasAny) return null;

  return (
    <div className={className} aria-label={`${shop.name} contact details`}>
      {contact.whatsapp && (
        <a
          href={supportHref(contact.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="contact-chip contact-whatsapp"
          title="Chat on WhatsApp"
        >
          <span aria-hidden="true"><IconWhatsApp size={15} /></span>
          <span>{contact.whatsapp}</span>
        </a>
      )}
      {contact.email && (
        <a
          href={`mailto:${contact.email}`}
          className="contact-chip contact-email"
          title="Send email"
        >
          <span aria-hidden="true"><IconMail size={15} /></span>
          <span>{contact.email}</span>
        </a>
      )}
      {contact.phone && contact.phone !== contact.whatsapp && (
        <a
          href={`tel:${contact.phone.replace(/\s+/g, "")}`}
          className="contact-chip contact-phone"
          title="Call store phone"
        >
          <span aria-hidden="true"><IconPhone size={15} /></span>
          <span>{contact.phone}</span>
        </a>
      )}
      {fullAddress && (
        <span className="contact-chip contact-address" title="Store Location">
          <span aria-hidden="true"><IconMapPin size={15} /></span>
          <span>{fullAddress}</span>
        </span>
      )}
    </div>
  );
}

function ShopAvatar({ shop }: { shop: Shop }) {
  const { session } = useMarket();
  const logo = resolveImageUrl(shop.logo_url, session?.source_web, shop.slug);
  return (
    <span className="shop-avatar">
      {logo ? (
        <img src={logo} alt={shop.name} referrerPolicy="no-referrer" />
      ) : (
        shop.name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
function ShopCard({ shop, heading: Heading = "h3" }: { shop: Shop; heading?: "h2" | "h3" }) {
  const count =
    useMarket().catalog?.products.filter((p) => p.shop_id === shop.id).length ||
    0;
  return (
    <Link to={`/shops/${shop.slug}`} className="shop-card">
      <ShopAvatar shop={shop} />
      <div>
        <Heading>{shop.name}</Heading>
        <small>{shopType(shop)}</small>
        <p>
          {count} {count === 1 ? "product" : "products"}
        </p>
      </div>
    </Link>
  );
}
function SectionTitle({
  eyebrow,
  title,
  link,
  to,
}: {
  eyebrow?: string;
  title: string;
  link?: string;
  to?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {link && to && (
        <Link to={to} className="text-link">
          {link}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
function Home() {
  const platform = usePlatformSettings();
  const { catalog, catalogError, reloadCatalog } = useMarket();
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const categories = [
    ...new Set(catalog?.products.map((p) => p.category) || []),
  ].slice(0, 6);
  const discoveryProducts = [...(catalog?.products || [])]
    .sort((a, b) =>
      Number(b.sales_enabled && stock(b) > 0) - Number(a.sales_enabled && stock(a) > 0) ||
      Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)))
    .slice(0, 3);
  return (
    <>
      <main id="main">
        <section className="hero container">
          <div className="hero-copy">
            <p className="eyebrow">{lang === "bn" ? "মাল্টি-ভেন্ডর মার্কেটপ্লেস" : "MULTI-CATEGORY MARKETPLACE"}</p>
            <h1>
              {platform.hero_title || (lang === "bn" ? (
                <>স্বাধীন শপ থেকে<br />আপনার পছন্দের পণ্য</>
              ) : (
                <>Products<br />from independent shops</>
              ))}
            </h1>
            <p className="hero-description">
              {platform.hero_description || (lang === "bn"
                ? "স্বাধীন শপগুলোর ফ্যাশন, গ্যাজেট, নিত্যপণ্য ও ডিজিটাল সেবা—সব এক জায়গায়।"
                : "Find software, templates, design assets and courses from independent shops.")}
            </p>
            <form
              className="hero-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/products?q=${encodeURIComponent(query)}`);
              }}
            >
              <Search size={21} />
              <label className="sr-only" htmlFor="home-search">
                {lang === "bn" ? "পণ্য খুঁজুন" : "Search products"}
              </label>
              <input
                id="home-search"
                placeholder={lang === "bn" ? "পণ্য খুঁজুন..." : "Search products"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button aria-label={lang === "bn" ? "প্রোডাক্ট খুঁজুন" : "Search products"}>
                <ArrowRight size={22} />
              </button>
            </form>
            <div className="hero-popular">
              <span>{lang === "bn" ? "এক্সপ্লোর করুন:" : "Explore"}</span>
              {categories.slice(0, 3).map((category) => (
                <Link key={category} to={`/products?category=${encodeURIComponent(category)}`}>
                  {category}
                </Link>
              ))}
            </div>
          </div>
          <aside className="discovery-shelf" aria-labelledby="discovery-title">
            <div className="discovery-heading"><h2 id="discovery-title">{lang === "bn" ? "ক্যাটালগ থেকে" : "Inside the catalog"}</h2><Link to="/products">{lang === "bn" ? "সব দেখুন" : "View all"}<ArrowUpRight size={16} /></Link></div>
            {catalog?.products.length ? <div className="discovery-picks">
              {discoveryProducts.map(product => <Link className="discovery-pick" key={product.id} to={productPath(product, catalog)}>
                <Art product={product} />
                <span className="discovery-pick-info"><small>{product.category}</small><strong>{product.name}</strong><span>{product.variants.length > 1 ? (lang === "bn" ? "শুরু " : "From ") : ""}{money(minimumPrice(product), product.currency)}</span></span>
              </Link>)}
            </div> : catalog ? <p className="discovery-empty">{lang === "bn" ? "এখনও কোনো প্রোডাক্ট প্রকাশ করা হয়নি।" : "No products are published yet."}</p> : catalogError ? <p className="discovery-empty">{lang === "bn" ? "প্রোডাক্ট লোড করা যায়নি। নিচে পুনরায় চেষ্টা করুন।" : "Products could not be loaded. Use Try again in the product section below."}</p> : <Loading />}
          </aside>
        </section>
        <HomeHeroSponsoredAd />
        <section className="container section marketplace-categories">
          <SectionTitle
            title={lang === "bn" ? "ক্যাটাগরি ব্রাউজ করুন" : "Browse categories"}
            link={lang === "bn" ? "সব প্রোডাক্ট দেখুন" : "Browse all products"}
            to="/products"
          />
          {categories.length > 0 ? (
            <div className="category-grid">
              {categories.map((category) => {
                const items = catalog!.products.filter(product => product.category === category);
                const cover = items.find(product => product.sales_enabled && stock(product) > 0 && product.image_url)
                  || items.find(product => product.image_url) || items[0];
                return (
                <Link
                  to={`/products?category=${encodeURIComponent(category)}`}
                  className="category-card"
                  key={category}
                >
                  <Art key={cover.id} product={cover} />
                  <span><strong>{category}</strong><small>{items.length} {lang === "bn" ? "টি প্রোডাক্ট" : items.length === 1 ? "product" : "products"}</small></span>
                  <ArrowUpRight size={18} />
                </Link>
              );})}
            </div>
          ) : catalog ? (
            <p className="muted">
              Categories will appear as sellers publish their first products.
            </p>
          ) : null}
        </section>
        <section className="container section products-section">
          <SectionTitle
            title={lang === "bn" ? "সকল ক্যাটাগরির বিশ্বস্ত প্রোডাক্ট" : "Explore products across all categories"}
            link={lang === "bn" ? "সব প্রোডাক্ট দেখুন" : "View all products"}
            to="/products"
          />
          {catalogError ? (
            <ErrorBox
              message={catalogError}
              retry={() => void reloadCatalog()}
            />
          ) : !catalog ? (
            <Loading />
          ) : catalog.products.length ? (
            <div className="product-grid">
              <SponsoredProductCard />
              {catalog.products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <Empty title="No products yet">
              <p>
                Products appear here when shops publish them. Browse the shops or return later.
              </p>
              <Link className="button primary" to="/shops">
                Browse shops
                <ArrowRight size={17} />
              </Link>
            </Empty>
          )}
        </section>
        <nav className="container order-tools" aria-label={lang === "bn" ? "অর্ডারের শর্টকাট" : "Order shortcuts"}>
          <div><ShoppingBag size={20} /><span>{lang === "bn" ? "ইতিমধ্যে অর্ডার করেছেন?" : "Already placed an order?"}</span></div>
          <Link to="/purchases">{t("myPurchases")}<ArrowRight size={15} /></Link>
          <Link to="/track">{t("trackOrder")}<ArrowRight size={15} /></Link>
          <Link to="/how-it-works">{t("howItWorks")}<ArrowRight size={15} /></Link>
        </nav>
        <section className="container section">
          <SectionTitle
            title={lang === "bn" ? "স্বাধীন শপসমূহ" : "Independent shops"}
            link={lang === "bn" ? "সব শপ দেখুন" : "Browse all shops"}
            to="/shops"
          />
          <div className="shop-grid">
            {catalog?.shops.slice(0, 3).map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        </section>
        <section className="container section">
          <div className="seller-banner">
            <div className="seller-banner-art" aria-hidden="true">
              <Store size={54} />
              <span className="seller-art-plus">+</span>
              <span className="seller-art-ring" />
            </div>
            <div>
              <p className="eyebrow">
                {lang === "bn" ? "স্বাধীন সেলারদের জন্য" : "For independent sellers"}
              </p>
              <h2>{lang === "bn" ? "আপনার পণ্য বিক্রি করুন" : "Sell your products"}</h2>
              <p>
                {lang === "bn" ? (
                  "এই মার্কেটপ্লেসে আপনার AriseSell পণ্য প্রকাশ করুন। আপনার পণ্য, পেমেন্ট ও স্টক সবসময় সিঙ্ক থাকবে।"
                ) : (
                  <>
                    Publish your AriseSell products on this marketplace.
                    <br />
                    Your products, payments, and stock stay in sync.
                  </>
                )}
              </p>
            </div>
            <Link to="/seller" className="button light">
              {t("openShop")}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
function Products({ shop }: { shop?: Shop }) {
  const { catalog, catalogError, reloadCatalog } = useMarket();
  const { lang } = useLang();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || params.get("search") || "",
    category = params.get("category") || "",
    storeType = params.get("store_type") || "";
  const [sort, setSort] = useState("recommended"),
    [inStock, setInStock] = useState(false);
  const list = (catalog?.products || []).filter(
    (p) => !shop || p.shop_id === shop.id,
  );
  const categories = [...new Set(list.map((p) => p.category))];
  const products = list
    .filter(
      (p) =>
        (!category || p.category === category) &&
        (!storeType || catalog?.shops.find(s => s.id === p.shop_id)?.kind === storeType) &&
        (!inStock || stock(p) > 0) &&
        `${p.name} ${p.category} ${p.description} ${catalog?.shops.find((s) => s.id === p.shop_id)?.name} ${catalog?.shops.find((s) => s.id === p.shop_id)?.kind || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? Number(minimumPrice(a)) - Number(minimumPrice(b))
        : sort === "high"
          ? Number(minimumPrice(b)) - Number(minimumPrice(a))
          : 0,
    );
  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (name === "q") next.delete("search");
    value ? next.set(name, value) : next.delete(name);
    setParams(next, { replace: true });
  };
  const Container = shop ? "section" : "main";
  return (
    <Container id={shop ? undefined : "main"} className="container listing-page" aria-label={shop ? "Shop products" : undefined}>
      {!shop && (
        <div className="page-intro">
          <p className="eyebrow">{lang === "bn" ? "মার্কেটপ্লেস এক্সপ্লোর করুন" : "Explore the marketplace"}</p>
          <h1>{lang === "bn" ? "সকল প্রোডাক্ট" : "All products"}</h1>
          <p>
            {lang === "bn"
              ? "প্রোডাক্ট খুঁজুন, ক্যাটাগরি ফিল্টার করুন এবং স্বাধীন শপগুলোর দাম তুলনা করুন।"
              : "Search products, filter by category, and compare prices from independent shops."}
          </p>
        </div>
      )}
      <div className="catalog-search-row">
        <label className="catalog-search"><Search size={18} /><span className="sr-only">{shop ? `Search ${shop.name} catalog` : "Search the catalog"}</span><input type="search" value={query} placeholder={lang === "bn" ? "প্রোডাক্ট বা ক্যাটাগরি খুঁজুন" : "Search products or categories"} onChange={event => update("q", event.target.value)} /></label>
        <p className="catalog-context">{shop ? shop.name : (lang === "bn" ? "স্বাধীন বিক্রেতাদের পণ্যসমূহ" : "Products from independent sellers")}</p>
      </div>
      <div className="catalog-toolbar-row">
        {!shop && <label className="field">Shop type<select value={storeType} onChange={e => update("store_type", e.target.value)}>
          <option value="">All shop types</option>
          {[...new Set((catalog?.shops || []).map(s => s.kind).filter((kind): kind is string => Boolean(kind)))].sort().map(kind => <option key={kind} value={kind}>{kind}</option>)}
        </select></label>}
        <div className="filter-chips">
          <button
            className={!category ? "chip selected" : "chip"}
            aria-pressed={!category}
            onClick={() => update("category", "")}
          >
            {lang === "bn" ? "সকল প্রোডাক্ট" : "All products"}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "chip selected" : "chip"}
              aria-pressed={category === c}
              onClick={() => update("category", c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="catalog-controls-right">
          <label className="sort-select">
            <SlidersHorizontal size={16} />
            <span className="sr-only">Sort products</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recommended">{lang === "bn" ? "ডিফল্ট ক্রম" : "Default order"}</option>
              <option value="low">{lang === "bn" ? "দাম: কম থেকে বেশি" : "Price: low to high"}</option>
              <option value="high">{lang === "bn" ? "দাম: বেশি থেকে কম" : "Price: high to low"}</option>
            </select>
          </label>
          <label className="stock-filter">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            {lang === "bn" ? "শুধুমাত্র স্টকে আছে" : "In stock only"}
          </label>
        </div>
      </div>

      {query && (
        <div className="active-filter-banner">
          <span>
            {lang === "bn" ? `খোঁজা হচ্ছে: "${query}"` : `Showing results for: "${query}"`}
            <span className="active-count"> ({products.length} {products.length === 1 ? (lang === "bn" ? "টি প্রোডাক্ট পাওয়া গেছে" : "product found") : (lang === "bn" ? "টি প্রোডাক্ট পাওয়া গেছে" : "products found")})</span>
          </span>
          <button
            type="button"
            className="clear-search-pill"
            onClick={() => update("q", "")}
          >
            <X size={14} />
            <span>{lang === "bn" ? "মুছুন" : "Clear"}</span>
          </button>
        </div>
      )}
      <p className="results-count" role="status">
        {products.length} {products.length === 1 ? (lang === "bn" ? "টি প্রোডাক্ট" : "product") : (lang === "bn" ? "টি প্রোডাক্ট" : "products")}
        {query && <> {lang === "bn" ? `খোঁজা হচ্ছে: “${query}”` : `for “${query}”`}</>}
      </p>
      {catalogError ? (
        <ErrorBox message={catalogError} retry={() => void reloadCatalog()} />
      ) : !catalog ? (
        <Loading />
      ) : products.length ? (
        <div className="product-grid">
          {!shop && !query && !category && <SponsoredProductCard />}
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty title={lang === "bn" ? "কোনো প্রোডাক্ট পাওয়া যায়নি" : "No products found"}>
          <p>{lang === "bn" ? "অন্য কোনো সার্চ করুন, অন্য ক্যাটাগরি বেছে নিন অথবা ফিল্টার মুছুন।" : "Try another search, choose a different category, or clear your filters."}</p>
          <button
            className="button secondary"
            onClick={() => {
              setParams({});
              setInStock(false);
            }}
          >
            {lang === "bn" ? "ফিল্টার মুছুন" : "Clear filters"}
          </button>
        </Empty>
      )}
    </Container>
  );
}
function Shops() {
  const { catalog, catalogError, reloadCatalog } = useMarket();
  const { lang } = useLang();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const storeType = params.get("type") || params.get("store_type") || "";
  const setStoreType = (val: string) => {
    const next = new URLSearchParams(params);
    if (val) {
      next.set("type", val);
    } else {
      next.delete("type");
      next.delete("store_type");
    }
    setParams(next);
  };
  const shopKinds = [...new Set((catalog?.shops || [])
    .map(s => s.kind || (s.commerce_mode === "digital" ? "Digital Products" : ""))
    .filter((kind): kind is string => Boolean(kind)))].sort();
  const shops = catalog?.shops.filter((s) => {
    const kind = s.kind || (s.commerce_mode === "digital" ? "Digital Products" : "");
    const matchesType = !storeType || kind.toLowerCase() === storeType.toLowerCase() || s.kind?.toLowerCase() === storeType.toLowerCase();
    const matchesQuery = `${s.name} ${s.description} ${s.kind || ""}`.toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesQuery;
  });
  return (
    <main id="main" className="container listing-page">
      <div className="page-intro">
        <p className="eyebrow">{lang === "bn" ? "শপ ডিরেক্টরি" : "Shop directory"}</p>
        <h1>
          {lang === "bn" ? "স্বাধীন শপসমূহ" : "Independent shops"}
        </h1>
        <p>
          {lang === "bn" ? "স্বাধীন শপ এবং তাদের পণ্যগুলো ব্রাউজ করুন।" : "Browse independent shops and their products."}
        </p>
      </div>
      <div className="catalog-search standalone-search">
        <Search size={20} />
        <label className="sr-only" htmlFor="shop-search">
          {lang === "bn" ? "শপ খুঁজুন" : "Search shops"}
        </label>
        <input
          id="shop-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === "bn" ? "শপের নাম বা বিবরণ দিয়ে খুঁজুন..." : "Search shop names or descriptions"}
        />
      </div>
      {shopKinds.length > 0 && (
        <div className="catalog-toolbar-row">
          <div className="filter-chips" role="group" aria-label={lang === "bn" ? "শপ ক্যাটাগরি ফিল্টার" : "Shop category filter"}>
            <button
              type="button"
              className={!storeType ? "chip selected" : "chip"}
              aria-pressed={!storeType}
              onClick={() => setStoreType("")}
            >
              {lang === "bn" ? "সকল শপ" : "All shops"}
            </button>
            {shopKinds.map((kind) => (
              <button
                type="button"
                key={kind}
                className={storeType.toLowerCase() === kind.toLowerCase() ? "chip selected" : "chip"}
                aria-pressed={storeType.toLowerCase() === kind.toLowerCase()}
                onClick={() => setStoreType(storeType.toLowerCase() === kind.toLowerCase() ? "" : kind)}
              >
                {kind}
              </button>
            ))}
          </div>
        </div>
      )}
      <FeaturedShopSponsoredAd />
      {catalogError ? (
        <ErrorBox message={catalogError} retry={() => void reloadCatalog()} />
      ) : !catalog ? (
        <Loading />
      ) : shops?.length ? (
        <div className="shop-grid large-shop-grid">
          {shops.map((shop) => (
            <div className="shop-discovery" key={shop.id}>
              <div className="shop-cover-pattern" aria-hidden="true">
                <Layers size={44} />
                <span />
                <i />
              </div>
              <ShopCard shop={shop} heading="h2" />
              <p>{shop.description}</p>
              <Link className="text-link" to={`/shops/${shop.slug}`}>
                {lang === "bn" ? "শপে যান" : "Visit shop"}
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No shops found">
          <p>Try another shop name or browse all products.</p>
          <Link className="button secondary" to="/products">Browse products</Link>
        </Empty>
      )}
    </main>
  );
}
function ShopPage() {
  const { slug } = useParams();
  const { catalog, catalogError } = useMarket();
  const { lang } = useLang();
  if (catalogError)
    return (
      <main id="main" className="container section">
        <ErrorBox message={catalogError} />
      </main>
    );
  if (!catalog) return <Loading />;
  const shop = catalog.shops.find((s) => s.slug === slug || s.id === slug);
  if (!shop) return <NotFound />;

  return (
    <main id="main" className="shop-page">
      <section className="shop-hero container">
        <nav className="breadcrumbs shop-page-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">{lang === "bn" ? "হোম" : "Home"}</Link>
          <span>/</span>
          <Link to="/shops">{lang === "bn" ? "স্বাধীন শপসমূহ" : "Shops"}</Link>
          <span>/</span>
          <h1 className="breadcrumb-current" aria-current="page">{shop.name}</h1>
        </nav>
      </section>
      <Products shop={shop} />
      <WhatsAppFloatingButton shop={shop} />
    </main>
  );
}

function ShopReviewsPage() {
  const { slug } = useParams();
  const { catalog, catalogError } = useMarket();
  const { lang } = useLang();
  if (catalogError)
    return (
      <main id="main" className="container section">
        <ErrorBox message={catalogError} />
      </main>
    );
  if (!catalog) return <Loading />;
  const shop = catalog.shops.find((s) => s.slug === slug || s.id === slug);
  if (!shop) return <NotFound />;

  return (
    <main id="main" className="shop-reviews-page">
      <div className="container shop-reviews-container">
        <nav className="breadcrumbs shop-reviews-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">{lang === "bn" ? "হোম" : "Home"}</Link>
          <span>/</span>
          <Link to="/shops">{lang === "bn" ? "স্বাধীন শপসমূহ" : "Shops"}</Link>
          <span>/</span>
          <Link to={`/shops/${shop.slug}`}>{shop.name}</Link>
          <span>/</span>
          <span aria-current="page">{lang === "bn" ? "রিভিউসমূহ" : "Reviews"}</span>
        </nav>
        <div className="shop-reviews-page-header">
          <Link to={`/shops/${shop.slug}`} className="back-link">
            <ArrowLeft size={16} />
            {lang === "bn" ? `${shop.name}-এর শপে ফিরে যান` : `Back to ${shop.name}`}
          </Link>
        </div>
        <ShopReviews shop={shop} catalog={catalog} lang={lang} />
      </div>
      <WhatsAppFloatingButton shop={shop} />
    </main>
  );
}
function supportHref(value: string) {
  if (/^https:\/\//.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10) {
    let clean = digits;
    if (digits.startsWith("88001")) {
      clean = "8801" + digits.slice(5);
    } else if (digits.length === 11 && digits.startsWith("01")) {
      clean = `88${digits}`;
    }
    return `https://wa.me/${clean}`;
  }
  return "#seller-support";
}

export function extractDownloadLinks(content: string): { url: string; label: string; isFile: boolean }[] {
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/gi;
  const matches = content.match(urlRegex) || [];
  return Array.from(new Set(matches)).map((url) => {
    const cleanUrl = url.replace(/[.,;!?)]+$/, "");
    const isFile = /\.(zip|rar|7z|tar|gz|pdf|epub|apk|exe|dmg|iso|mp4|docx?|xlsx?|pptx?)(?:\?.*)?$/i.test(cleanUrl);
    const isDrive = /drive\.google\.com|dropbox\.com|mega\.nz|onedrive\.live\.com/i.test(cleanUrl);
    let label = "Access Download Link";
    if (isFile) {
      const filename = cleanUrl.split("/").pop()?.split("?")[0] || "File";
      label = `Download ${filename}`;
    } else if (isDrive) {
      label = "Open Cloud Download";
    }
    return { url: cleanUrl, label, isFile };
  });
}

function WhatsAppFloatingButton({
  shop,
  product,
  order,
}: {
  shop?: Shop;
  product?: Product;
  order?: Purchase;
}) {
  const supportShop = shop || order?.shop;
  const contact = supportShop?.social_links?.whatsapp || supportShop?.contact?.whatsapp || supportShop?.support || "";
  let targetUrl = supportHref(contact);
  if (!/^https:\/\/(?:wa\.me|(?:api|web)\.whatsapp\.com)(?:\/|$)/i.test(targetUrl)) return null;

  if (!/^https:\/\//i.test(contact)) {
    let text = "Hello! I am contacting you from Arise Store.";
    if (order) {
      text = `Hello! I need help with my order *${order.ref}* (${order.name}) on Arise Store.`;
    } else if (product) {
      text = `Hello! I have a question about *${product.name}* on Arise Store.`;
    } else if (supportShop) {
      text = `Hello! I have a question regarding *${supportShop.name}* on Arise Store.`;
    }
    const url = new URL(targetUrl);
    url.searchParams.set("text", text);
    targetUrl = url.toString();
  }

  return (
    <aside className="whatsapp-floating-container" aria-label="WhatsApp live chat support">
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-floating-btn"
        title="Chat on WhatsApp"
        aria-label="Chat directly with seller on WhatsApp"
      >
        <span className="whatsapp-icon-wrapper" aria-hidden="true">
          <svg className="whatsapp-svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.41a8.16 8.16 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.53c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.3z"/>
          </svg>
        </span>
        <span className="whatsapp-label">WhatsApp Support</span>
      </a>
    </aside>
  );
}
function ProductPage() {
  const route = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const section = productSection(location.hash);
  const infoDialog = useRef<HTMLDialogElement>(null);
  function selectSection(value: ProductSection) {
    if (value === "reviews") {
      const el = document.getElementById("customer-reviews");
      if (el) {
        el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        el.focus({ preventScroll: true });
        return;
      }
    }
    navigate({ pathname: location.pathname, search: location.search, hash: `#product-${value}` });
  }
  function closeSection() {
    if (section) navigate({ pathname: location.pathname, search: location.search, hash: "" }, { replace: true });
  }
  const { catalog, catalogError } = useMarket();
  const { t, lang } = useLang();
  const { wishlist, toggleWishlist, isWishlisted } = useWishlist();
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [report, setReport] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const product = catalog ? productForRoute(catalog, route) : undefined;
  useEffect(() => {
    const dialog = infoDialog.current;
    if (!dialog) return;
    if (section && !dialog.open) dialog.showModal();
    if (!section && dialog.open) dialog.close();
    const previousOverflow = document.body.style.overflow;
    if (section) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [section, product?.id]);
  useEffect(() => {
    if (!product || !catalog) return;
    const previousTitle = document.title;
    document.title = `${product.name} | ${catalog.shops.find((shop) => shop.id === product.shop_id)?.name || "Arise Store"}`;
    const canonical = productPath(product, catalog);
    if (location.pathname !== canonical) navigate(canonical + location.search + location.hash, { replace: true });
    return () => { document.title = previousTitle; };
  }, [product?.id, product?.name, catalog, location.pathname, location.search, location.hash, navigate]);
  useEffect(
    () =>
      setVariant(
        product?.variants.find((v) => v.stock > 0)?.id ||
          product?.variants[0]?.id ||
          "",
      ),
    [product?.id],
  );
  if (catalogError)
    return (
      <main id="main" className="container section">
        <ErrorBox message={catalogError} />
      </main>
    );
  if (!catalog) return <Loading />;
  if (!product) return <NotFound />;
  const shop = catalog.shops.find((s) => s.id === product.shop_id)!;
  const selected = product.variants.find((v) => v.id === variant) ||
    product.variants.find((v) => v.stock > 0) || product.variants[0];
  const digital = productFulfilment(product) === "digital";
  const available = Boolean(canCheckout(product, shop) && selected && selected.stock > 0);
  const maximum = Math.min(selected?.stock ?? 0, 100);
  const total = selected ? checkoutTotal(selected.price, quantity) : null;
  const canBuy = available && total !== null && quantity <= maximum;
  return (
    <main id="main" className="container detail-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to={`/shops/${shop.slug}`}>{shop.name}</Link>
        <span>/</span>
        <Link
          to={`/shops/${shop.slug}?category=${encodeURIComponent(product.category)}`}
        >
          {product.category}
        </Link>
        <span>/</span>
        <span aria-current="page">{product.name}</span>
      </nav>
      <div className="product-detail">
        <div className="product-visual">
          <Art product={product} large />

        </div>
        <div className="product-summary">
          <div className="product-category-row">
            <span className="product-category">{product.category}</span>
          </div>
          <h1>{product.name}</h1>
          <Link className="by-shop" to={`/shops/${shop.slug}`}>
            <span className="tiny-avatar">{shop.name.slice(0, 1)}</span>
            {shop.name}
          </Link>
          <div className="detail-price">
            {selected ? money(selected.price) : money(minimumPrice(product), product.currency)}
            <span>Price per item</span>
          </div>
          {product.description && <div className="product-brief">
            <h2>Product description</h2>
            <p className="preserve-lines">{product.description}</p>
            <button type="button" className="text-link" onClick={() => selectSection("overview")}>Read full description <ExternalLink size={14} /></button>
          </div>}
          {product.variants.length > 1 && (
            <label className="field">
              Choose your option
              <select
                value={variant}
                onChange={(e) => { setVariant(e.target.value); setQuantity(1); }}
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {money(v.price, product.currency)}
                    {!v.stock ? " · Sold out" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="detail-availability">
            {available ? (
              <span className="product-stock">
                <span className="status-dot" />
                {selected!.stock} in stock
              </span>
            ) : (
              <span className="product-stock unavailable">{selected?.stock ? "Checkout unavailable" : product.sales_enabled ? "Sold out" : "Purchases paused"}</span>
            )}
            <span>
              {!digital ? <><Package size={14} />Physical delivery</> : product.delivery_mode === "automatic" ? (
                <>
                  <Zap size={14} />
                  Automatic delivery
                </>
              ) : (
                <>
                  <Package size={14} />
                  Seller-prepared delivery
                </>
              )}
            </span>
          </div>

          <div className="product-trust-stats-badges">
            <div className="trust-stat-badge">
              <Package size={18} />
              <div>
                <strong>{lang === "bn" ? "ডেলিভারি" : "Delivery"}</strong>
                <small>{product.delivery_estimate || (digital ? (lang === "bn" ? "পেমেন্ট যাচাইয়ের পর" : "After payment verification") : (lang === "bn" ? "চেকআউটে ডেলিভারি চার্জ দেখুন" : "Shipping confirmed at checkout"))}</small>
              </div>
            </div>
            {product.warranty_type && <div className="trust-stat-badge">
              <ShieldCheck size={18} />
              <div>
                <strong>{lang === "bn" ? "ওয়ারেন্টি" : "Warranty"}</strong>
                <small>{product.warranty_type === "no_warranty"
                  ? (lang === "bn" ? "ওয়ারেন্টি নেই" : "No warranty")
                  : product.warranty_days
                    ? (lang === "bn" ? `${product.warranty_days} দিন` : `${product.warranty_days} days`)
                    : (lang === "bn" ? "বিক্রেতার শর্ত দেখুন" : "See seller’s terms")}</small>
              </div>
            </div>}
          </div>
          {product.checkout_unavailable_reason && <p role="status">{product.checkout_unavailable_reason}</p>}


          <div className="product-purchase-box">
            <div className="product-purchase-total" aria-live="polite" aria-atomic="true">
              <span>
                {lang === "bn" ? "মোট মূল্য" : "Total price"} <small>{lang === "bn" ? `${quantity}টি আইটেম` : `For ${quantity} ${quantity === 1 ? "item" : "items"}`}</small>
              </span>
              <div className="total-price-display">
                <strong>{total !== null ? money(total, product.currency) : "—"}</strong>
              </div>
            </div>
            <div className="product-purchase-actions">
              <div className="product-quantity" role="group" aria-label="Product quantity">
                <button type="button" aria-label="Decrease quantity" disabled={!available || quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <input aria-label="Quantity" type="number" min={1} max={Math.max(1, maximum)} step={1}
                  disabled={!available} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                <button type="button" aria-label="Increase quantity" disabled={!available || quantity >= maximum}
                  onClick={() => setQuantity(Math.min(maximum, quantity + 1))}>+</button>
              </div>
          {canBuy && selected ? (
            <Link
              className="button primary buy-now"
              to={`/checkout/${product.id}?variant=${selected.id}&quantity=${quantity}`}
            >
              {lang === "bn" ? "এখনই কিনুন" : "Buy now"}
              <ArrowRight size={18} />
            </Link>
          ) : (
            <button className="button primary buy-now" disabled>
              {!available ? (product.sales_enabled ? (lang === "bn" ? "বর্তমানে স্টক নেই" : "Currently unavailable") : (lang === "bn" ? "বিক্রি সাময়িকভাবে বন্ধ" : "Purchases paused")) : (lang === "bn" ? "পরিমাণ চেক করুন" : "Check quantity")}
            </button>
          )}
              <button
                type="button"
                className={`button secondary button-wishlist ${isWishlisted(product.id) ? "active" : ""}`}
                onClick={() => toggleWishlist(product.id)}
                title={isWishlisted(product.id) ? "Remove from wishlist" : "Save for later"}
              >
                <Heart size={18} className={isWishlisted(product.id) ? "fill-heart" : ""} />
                <span>{isWishlisted(product.id) ? (lang === "bn" ? "উইশলিস্টে যুক্ত" : "Saved") : (lang === "bn" ? "পরে কিনুন" : "Save")}</span>
              </button>
            </div>
            {available && !canBuy && <p role="alert" className="product-quantity-error">Choose a whole quantity between 1 and {maximum}.</p>}
            <div className="product-policy-links">
              <button type="button" onClick={() => selectSection("terms")}>{lang === "bn" ? "ক্রয়ের শর্তাবলী" : "Purchase terms"}</button>
              <button type="button" onClick={() => selectSection("delivery")}>{lang === "bn" ? "ডেলিভারি বিবরণ" : "Delivery details"}</button>
              <button type="button" onClick={() => selectSection("reviews")}>{lang === "bn" ? "রিভিউসমূহ" : "Reviews"}</button>
            </div>
          </div>
        </div>
          <section id="customer-reviews" tabIndex={-1} className="product-visual-reviews" aria-label="Customer reviews">
            <h2 className="product-reviews-heading">Customer reviews</h2>
            {location.pathname === productPath(product, catalog) && <ProductReviews key={product.id} productId={product.id} />}
          </section>
      </div>
      <dialog ref={infoDialog} className="product-info-dialog" aria-labelledby="product-info-title"
        onCancel={(event) => { event.preventDefault(); closeSection(); }} onClick={(event) => { if (event.target === event.currentTarget) closeSection(); }}>
        <div className="product-info-header">
          <h2 id="product-info-title">{section === "overview" ? (lang === "bn" ? "পণ্যের বিবরণ" : "Product description") : section === "delivery" ? (lang === "bn" ? "ডেলিভারি বিবরণ" : "Delivery details") : section === "reviews" ? (lang === "bn" ? "গ্রাহক রিভিউ" : "Customer reviews") : (lang === "bn" ? "ক্রয়ের শর্তাবলী" : "Purchase terms")}</h2>
          <button type="button" className="icon-button" aria-label="Close product details" onClick={closeSection}><X size={20} /></button>
        </div>
        <div className="product-info-content">
          <p className="product-info-name">{product.name}</p>
          {section === "overview" &&
            <p className="preserve-lines">
              {product.description ||
                "No additional description is available. Contact the seller if you need more information."}
            </p>}
          {section === "delivery" && <>
            <p>{!digital ? "Enter your delivery address at checkout to confirm the seller’s shipping charge. Track your shipment in My purchases."
              : product.delivery_mode === "automatic"
              ? "Once your payment is verified, open My purchases to access your items privately."
              : product.delivery_estimate || "Once your payment is verified, the seller prepares your items. Follow your order in My purchases for updates."}</p>
            {product.delivery_note &&
              <div className="product-delivery-instructions"><h3>Seller’s delivery instructions</h3><p className="preserve-lines">{product.delivery_note}</p></div>}
          </>}
          {section === "terms" && <p className="preserve-lines">{product.purchase_terms || "Contact the seller to confirm purchase terms before ordering."}</p>}
          {section === "reviews" && <ProductReviews key={product.id} productId={product.id} />}
        </div>
      </dialog>
        <aside className="product-support" aria-label="Seller support">
          {shop.support ? (
            <a className="text-link" href={supportHref(shop.support)}>
              Contact {shop.name}
            </a>
          ) : (
            <p className="muted">
              Check the shop profile for support information.
            </p>
          )}
          <details className="report-product">
            <summary>
              <Flag size={14} />
              Report this listing
            </summary>
            {sent ? (
              <p role="status">
                Report submitted. The marketplace team will review it.
              </p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    await api("/reports", {
                      method: "POST",
                      body: JSON.stringify({
                        product_id: product.id,
                        reason: report,
                      }),
                    });
                    setSent(true);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label className="field">
                  Describe the issue
                  <textarea
                    minLength={10}
                    maxLength={1000}
                    required
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                  />
                </label>
                {error && <ErrorBox message={error} />}
                <button className="button secondary small" disabled={busy}>
                  {busy ? "Sending…" : "Send report"}
                </button>
              </form>
            )}
          </details>
        </aside>
        <WhatsAppFloatingButton shop={shop} product={product} />
    </main>
  );
}
function Checkout() {
  const { id } = useParams();
  const { catalog, session } = useMarket();
  const { lang, t } = useLang();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const product = catalog?.products.find((p) => p.id === id);
  const variant =
    product?.variants.find((v) => v.id === params.get("variant")) ||
    product?.variants.find((v) => v.stock > 0);
  const shop = catalog?.shops.find((s) => s.id === product?.shop_id);
  const [fields, setFields] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    phone: "",
    note: "",
    address: "",
    district: "",
    landmark: "",
    alt_phone: "",
  });
  const [quantity, setQuantity] = useState(() => checkoutQuantity(params.get("quantity"))),
    [provider, setProvider] = useState("");
  const [couponCode, setCouponCode] = useState(() => (params.get("coupon") || "").trim().toUpperCase());
  const [quote, setQuote] = useState<Quote | null>(null),
    [agreed, setAgreed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    if (shop && product) setProvider(productPayments(product, shop)[0] || "");
  }, [shop?.id, product?.id]);
  if (!catalog) return <Loading />;
  if (!product || !variant || !shop) return <NotFound />;
  const digital = productFulfilment(product) === "digital";
  const paymentMethods = productPayments(product, shop);
  if (!canCheckout(product, shop)) return <main id="main" className="container section"><h1>Checkout unavailable</h1><p>{product.checkout_unavailable_reason || "Contact the seller to confirm how to order this product."}</p><Link className="button secondary" to={productPath(product, catalog)}>Back to product</Link></main>;
  const required = new Set(["name", ...product.required_buyer_fields]);
  const estimatedTotal = checkoutTotal(variant.price, quantity);
  const validQuantity = estimatedTotal !== null && quantity <= Math.min(variant.stock, 100);
  const total = quote?.snapshot.total ?? (validQuantity ? estimatedTotal : null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !product || !variant || !shop || (!quote && !validQuantity)) return;
    setBusy(true);
    setError("");
    try {
      if (!quote) {
        const result = await api<Quote>("/checkout/quote", {
          method: "POST",
          body: JSON.stringify({
            shop_id: shop.id,
            product_id: product.id,
            variant_id: variant.id,
            quantity,
            provider,
            coupon_code: couponCode.trim().toUpperCase() || undefined,
            buyer: fields,
          }),
        });
        setQuote(result);
        key.current = crypto.randomUUID();
      } else {
        const result = await api<Purchase>("/checkout/accept", {
          method: "POST",
          body: JSON.stringify({
            shop_id: shop.id,
            product_id: product.id,
            draft_id: quote.draft_id,
            quote_hash: quote.quote_hash,
            idempotency_key: key.current,
            provider,
            accepted: true,
          }),
        });
        navigate(`/purchases/${result.id}`, { replace: true });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="container checkout-page">
      <Link to={productPath(product, catalog!)} className="back-link">
        <ArrowLeft size={16} />
        {lang === "bn" ? "প্রোডাক্টে ফিরে যান" : "Back to product"}
      </Link>
      <div className="checkout-heading">
        <p className="eyebrow">{lang === "bn" ? "চেকআউট" : "Checkout"} · {shop.name}</p>
        <h1>{quote ? (lang === "bn" ? "অর্ডারটি রিভিউ করুন" : "Review your order") : (lang === "bn" ? "চেকআউট" : "Checkout")}</h1>
        <p>
          {quote
            ? (digital ? (lang === "bn" ? "পেমেন্ট রিকোয়েস্ট তৈরির আগে পণ্যের বর্তমান মূল্য এবং বিক্রেতার শর্তাবলী মিলিয়ে দেখুন।" : "Review the current price and seller terms before creating your payment request.") : "Review the delivery address, shipping charge and order total before confirming.")
            : (lang === "bn" ? "আপনার যোগাযোগের তথ্য লিখুন এবং পেমেন্ট মাধ্যম নির্বাচন করুন।" : "Enter your details and choose a payment method.")}
        </p>
        <ol className="checkout-progress" aria-label="Checkout progress">
          <li aria-current={!quote ? "step" : undefined}><span>{quote ? <Check size={14} /> : "1"}</span>{lang === "bn" ? "তথ্য ও পেমেন্ট" : "Details & payment"}</li>
          <li aria-current={quote ? "step" : undefined}><span>2</span>{lang === "bn" ? "অর্ডার রিভিউ" : "Review order"}</li>
        </ol>
      </div>
      <div className="checkout-grid">
        <form onSubmit={submit} className="panel checkout-form">
          <div className="step-heading">
            <span>{quote ? "02" : "01"}</span>
            <h2>{quote ? (lang === "bn" ? "অর্ডারের বিবরণ" : "Order details") : (lang === "bn" ? "যোগাযোগের তথ্য" : "Contact details")}</h2>
          </div>
          {!quote ? (
            <>
              <p className="muted form-hint">
                {session?.user
                  ? `Signed in as ${session.user.email}`
                  : "Checking out as a guest. Keep this browser to access your purchases."}
              </p>
              {(["name", "email", "phone"] as const)
                .filter((field) => required.has(field))
                .map((field) => (
                  <label className="field" key={field}>
                    {field === "name"
                      ? (lang === "bn" ? "পূর্ণ নাম" : "Full name")
                      : field === "email"
                        ? (lang === "bn" ? "ইমেইল অ্যাড্রেস" : "Email address")
                        : (lang === "bn" ? "ফোন নম্বর" : "Phone number")}
                    <input
                      required
                      name={field}
                      autoComplete={
                        field === "name"
                          ? "name"
                          : field === "email"
                            ? "email"
                            : "tel"
                      }
                      type={
                        field === "email"
                          ? "email"
                          : field === "phone"
                            ? "tel"
                            : "text"
                      }
                      maxLength={
                        field === "email" ? 255 : field === "phone" ? 32 : 100
                      }
                      value={fields[field]}
                      onChange={(e) =>
                        setFields({ ...fields, [field]: e.target.value })
                      }
                    />
                  </label>
                ))}
              {!digital && (["address", "district", "landmark", "alt_phone"] as const).filter(field => required.has(field)).map(field => (
                <label className="field" key={field}>
                  {({address: "Full delivery address", district: "District", landmark: "Nearby landmark", alt_phone: "Alternative mobile number"})[field]}
                  <input name={field} required autoComplete={field === "address" ? "street-address" : field === "district" ? "address-level2" : field === "alt_phone" ? "tel" : "off"}
                    type={field === "alt_phone" ? "tel" : "text"} maxLength={field === "address" ? 4000 : field === "alt_phone" ? 32 : 128}
                    value={fields[field]} onChange={e => setFields({...fields, [field]: e.target.value})} />
                </label>
              ))}
              <label className="field">
                {!digital && <span>Order note (optional)</span>}
                {digital && (product.delivery_mode === "manual"
                  ? "Delivery details (optional)"
                  : "Order note (optional)")}
                <textarea
                  name="note"
                  rows={2}
                  maxLength={500}
                  placeholder={
                    product.delivery_mode === "manual"
                      ? "Enter the email address or username needed for delivery. Do not include passwords."
                      : "Add any instructions for the seller"
                  }
                  value={fields.note}
                  onChange={(e) =>
                    setFields({ ...fields, note: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Promo code / Coupon (optional)
                <div className="coupon-input-row">
                  <input
                    type="text"
                    name="coupon_code"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={32}
                    placeholder="e.g. SAVE10 or EID2026"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setError("");
                    }}
                  />
                  {couponCode.trim() && (
                    <button
                      type="button"
                      className="coupon-clear-button"
                      aria-label="Clear coupon code"
                      onClick={() => {
                        setCouponCode("");
                        setError("");
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <small className="form-hint">Discounts are calculated and verified when you click Review order.</small>
              </label>
              <label className="field">
                Quantity
                <input
                  type="number"
                  aria-label="Quantity"
                  aria-describedby="checkout-quantity-hint"
                  min={1}
                  max={Math.min(variant.stock, 100)}
                  step={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
                <small id="checkout-quantity-hint">{money(variant.price, product.currency)} each · Up to {Math.min(variant.stock, 100)} per order</small>
              </label>
              <fieldset className="checkout-payment">
                <legend>{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment method"}</legend>
                <p className="form-hint muted">{lang === "bn" ? `কীভাবে ${shop.name}-কে পেমেন্ট করবেন তা নির্বাচন করুন।` : `Choose how you’ll pay ${shop.name}.`}</p>
                <div className="payment-options">
                {paymentMethods.map((method) => (
                  <label
                    key={method}
                    className={
                      provider === method
                        ? "payment-method chosen"
                        : "payment-method"
                    }
                  >
                    <input
                      type="radio"
                      name="provider"
                      required
                      value={method}
                      checked={provider === method}
                      onChange={() => setProvider(method)}
                    />
                    {paymentLogos[method] ? (
                      <>
                        <img className="payment-logo" src={paymentLogos[method]} alt="" />
                        <strong>{paymentMethodLabel(method)}</strong>
                      </>
                    ) : (
                      <strong>{paymentMethodLabel(method)}</strong>
                    )}
                    <CheckCircle2 size={18} />
                  </label>
                ))}
              </div>
              {!paymentMethods.length && <ErrorBox message="This seller has no payment method available. Please contact the seller." />}
              <p className="form-hint muted">
                You’ll get payment instructions after reviewing and confirming your order.
              </p>
              </fieldset>
            </>
          ) : (
            <>
              {!digital && <div className="review-row"><span>Delivery address</span><strong className="preserve-lines">{quote.snapshot.buyer?.address || fields.address}, {quote.snapshot.buyer?.district || fields.district}</strong></div>}
              <div className="review-row">
                <span>Customer</span>
                <strong>{fields.name}</strong>
              </div>
              {fields.email && (
                <div className="review-row">
                  <span>Email</span>
                  <strong>{fields.email}</strong>
                </div>
              )}
              {fields.phone && (
                <div className="review-row">
                  <span>Phone</span>
                  <strong>{fields.phone}</strong>
                </div>
              )}
              {fields.note && (
                <div className="review-row">
                  <span>Delivery note</span>
                  <strong className="preserve-lines">{fields.note}</strong>
                </div>
              )}
              <div className="review-row">
                <span>Payment method</span>
                <strong>{paymentMethodLabel(provider)}</strong>
              </div>
              {quote.snapshot.coupon_code && Number(quote.snapshot.discount || "0") > 0 && (
                <div className="review-row discount-row">
                  <span>Coupon discount ({quote.snapshot.coupon_code})</span>
                  <strong className="discount-value">- {money(quote.snapshot.discount!, product.currency)}</strong>
                </div>
              )}
              <div className="terms-box">
                {!digital && Number(quote.snapshot.advance_amount || 0) > 0 && <p>Required advance: {money(quote.snapshot.advance_amount!, product.currency)}. The seller verifies payment before dispatch. Further verification may be required after the source checks the order.</p>}
                <h3>Seller’s purchase terms</h3>
                <p className="preserve-lines">
                  {quote.snapshot.digital_config?.purchase_terms || product.purchase_terms || "Contact the seller for purchase terms."}
                </p>
                <h3>Delivery</h3>
                <p className="preserve-lines">
                  {digital ? quote.snapshot.digital_config?.delivery_note : "Delivery to the address shown above. Shipping charges are included in the confirmed total."}
                </p>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                />
                I’ve read and accept this seller’s purchase and delivery terms.
              </label>
            </>
          )}
          {error && <ErrorBox message={error} />}
          <div className="checkout-payable" aria-live="polite" aria-atomic="true">
            <span>{quote ? (lang === "bn" ? "মোট প্রদেয় টাকা" : "Total to pay") : (lang === "bn" ? "মোট আনুমানিক মূল্য" : "Estimated total")}<small>BDT · {quote?.snapshot.quantity ?? quantity} {lang === "bn" ? "টি আইটেম" : `item${(quote?.snapshot.quantity ?? quantity) === 1 ? "" : "s"}`}</small></span>
            <strong>{total !== null ? money(total, product.currency) : "—"}</strong>
          </div>
          <button
            className="button primary full-width"
            disabled={busy || !session || !provider || (!quote && !validQuantity) || (!!quote && !agreed)}
          >
            {busy ? (
              <>
                <LoaderCircle size={17} className="spin" />
                {quote ? "Creating your order…" : "Checking price and availability…"}
              </>
            ) : quote ? (
              <>
                Confirm order
                <ArrowRight size={17} />
              </>
            ) : (
              <>
                Review order
                <ArrowRight size={17} />
              </>
            )}
          </button>
          {quote && (
            <button
              className="button ghost full-width"
              type="button"
              disabled={busy}
              onClick={() => {
                setQuote(null);
                setAgreed(false);
              }}
            >
              Edit order details
            </button>
          )}
        </form>
        <aside className="panel order-summary" aria-label="Order summary">
          <Art product={product} />
          <div className="order-summary-content">
            <span className="eyebrow">From {shop.name} · {shopType(shop)}</span>
            <h2>{quote?.snapshot.name ?? product.name}</h2>
            {product.variants.length > 1 && <p>{quote?.snapshot.variant ?? variant.name}</p>}
            <div className="summary-line">
              <span>Quantity</span>
              <strong>{quote?.snapshot.quantity ?? quantity}</strong>
            </div>
            {!quote && <div className="summary-line">
              <span>Price per item</span>
              <strong>{money(variant.price, product.currency)}</strong>
            </div>}
            <div className="summary-line">
              <span>Delivery</span>
              <strong>{digital ? "Digital · no shipping" : quote?.snapshot.delivery_charge !== undefined ? money(quote.snapshot.delivery_charge, product.currency) : "Calculated at review"}</strong>
            </div>
            {quote?.snapshot.discount && Number(quote.snapshot.discount) > 0 ? (
              <>
                <div className="summary-line">
                  <span>Subtotal</span>
                  <strong>{money(quote.snapshot.subtotal || (Number(variant.price) * (quote.snapshot.quantity || quantity)).toFixed(2))}</strong>
                </div>
                <div className="summary-line discount-line">
                  <span>
                    Discount <span className="coupon-code-badge">{quote.snapshot.coupon_code}</span>
                  </span>
                  <strong className="discount-amount">- {money(quote.snapshot.discount)}</strong>
                </div>
              </>
            ) : null}
            <div className="summary-total" aria-live="polite" aria-atomic="true">
              <span>{quote ? (digital ? "Total to pay" : "Order total") : (digital ? "Estimated total" : "Products subtotal")}</span>
              <strong>{total !== null ? money(total, product.currency) : "—"}</strong>
              <small>{quote ? "Current price confirmed by the seller." : digital ? "Price and availability are confirmed at review." : "Shipping and any required advance are confirmed by the source at review."}</small>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
function Purchases() {
  const { session, sessionError } = useMarket();
  const { lang, t } = useLang();
  const [orders, setOrders] = useState<Purchase[] | null>(null),
    [error, setError] = useState("");
  const load = () => {
    setError("");
    api<{ orders: Purchase[] }>("/orders")
      .then((r) => setOrders(r.orders))
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    if (session) load();
  }, [session?.csrf]);
  return (
    <main id="main" className="container listing-page narrow-page">
      <div className="page-intro">
        <h1>{t("myPurchases")}</h1>
        <p>
          {lang === "bn" ? "পেমেন্ট, ডেলিভারি স্ট্যাটাস এবং আপনার অর্ডার দেখুন।" : "Track payments, check delivery status, and access your purchases."}
        </p>
      </div>
      {!session?.user && (
        <div className="notice">
          <LockKeyhole size={18} />
          <p>
            Guest purchases stay in this browser until you sign in, sign out, or
            clear cookies. Sign in before checkout to connect future purchases
            to your account.
          </p>
          <a
            className="text-link"
            href="/api/auth/start?return_to=%2Fpurchases"
          >
            Continue with AriseSell
          </a>
        </div>
      )}
      {error || sessionError ? (
        <ErrorBox message={error || sessionError} retry={load} />
      ) : !orders ? (
        <Loading />
      ) : orders.length ? (
        <div className="purchase-list">
          {orders.map((order) => (
            <Link
              key={order.id}
              className="purchase-card"
              to={`/purchases/${order.id}`}
            >
              <span className="purchase-icon">
                <Package />
              </span>
              <div>
                <span className="order-ref">
                  {order.ref} · {order.shop.name}
                </span>
                <h2>{order.name}</h2>
                <span>
                  {order.quantity} {order.quantity === 1 ? (lang === "bn" ? "টি আইটেম" : "item") : (lang === "bn" ? "টি আইটেম" : "items")} ·{" "}
                  {money(order.total, order.currency)}
                </span>
              </div>
              <div className="purchase-status">
                <span
                  className={`pill ${order.payment_status === "paid" ? "positive" : ""}`}
                >
                  {order.delivery_status === "cancelled"
                    ? (lang === "bn" ? "বাতিল" : "Cancelled")
                    : order.payment_status === "paid"
                      ? deliveryLabel(order.delivery_status, lang)
                      : paymentLabel(order.payment_status, lang)}
                </span>
                <span>
                  {new Date(order.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="No purchases yet">
          <p>
            Orders placed in this browser or with your signed-in account appear here.
          </p>
          <Link to="/products" className="button primary">
            Browse products
            <ArrowRight size={17} />
          </Link>
        </Empty>
      )}
    </main>
  );
}
function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState(false);
  return (
    <button
      type="button"
      className={`button secondary small ${copied ? "copied" : ""}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setError(false);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setError(true);
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span aria-live="polite">
        {copied ? "Copied" : error ? "Copy manually" : label}
      </span>
    </button>
  );
}


export function detectPaymentAccountType(payment: any, shop?: Shop | null): "merchant" | "personal" {
  if (!payment) return "personal";

  // 1. Direct explicit property from AriseSell
  const direct = (payment.account_type || payment.type || payment.wallet_type || payment.number_type || "").toString().toLowerCase();
  if (direct.includes("merchant") || direct.includes("payment")) return "merchant";
  if (direct.includes("personal") || direct.includes("send_money") || direct.includes("uddokta")) return "personal";

  // 2. Account name or title (e.g. "Nagad Personal / Uddokta Number" as in AriseSell integration)
  const name = (payment.account_name || payment.title || payment.label || payment.name || "").toString().toLowerCase();
  if (name.includes("merchant") || name.includes("মার্চেন্ট")) return "merchant";
  if (name.includes("personal") || name.includes("uddokta") || name.includes("পার্সোনাল") || name.includes("উদ্যোক্তা")) return "personal";

  // 3. Instructions or note text from AriseSell
  const text = (payment.instructions || payment.note || "").toString().toLowerCase();
  if (text.includes("merchant") || text.includes("মার্চেন্ট") || text.includes("make payment") || text.includes("পেমেন্ট")) {
    return "merchant";
  }
  if (text.includes("personal") || text.includes("পার্সোনাল") || text.includes("send money") || text.includes("সেন্ড মানি") || text.includes("uddokta") || text.includes("উদ্যোক্তা")) {
    return "personal";
  }

  // 4. Shop metadata from AriseSell
  if (shop?.payment_account_types && payment.provider) {
    const val = shop.payment_account_types[payment.provider.toLowerCase()];
    if (val === "merchant" || val === "personal") return val;
  }


  return "personal";
}

export function PaymentInstructionCard({
  order,
  session,
  remainingSeconds,
}: {
  order: Purchase;
  session?: Session | null;
  remainingSeconds: number | null;
}) {
  const { t, lang } = useLang();
  const payment = order.payment || ((Number(order.advance_amount || 0) > 0 || order.delivery_status === "awaiting_advance") && order.payment_status !== "paid" ? {
    provider: order.payment_method && order.payment_method !== "cod"
      ? order.payment_method
      : (order.shop?.payment_methods && order.shop.payment_methods.find(m => m !== "cod")) || (order.shop?.payment_methods && order.shop.payment_methods[0]) || "bkash",
    account: extractAccountDigits(order.shop?.contact?.phone || order.shop?.contact?.whatsapp || order.shop?.support) || "Contact seller",
    amount: order.advance_amount || order.total,
    trx_id: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    instructions: order.seller_message || undefined,
  } : null);

  if (!payment) return null;
  const provider = paymentMethodLabel(payment.provider);
  const accountType = detectPaymentAccountType(payment, order.shop);
  const isMerchant = accountType === "merchant";

  return (
    <div className="payment-instruction-card">
      <div className="payment-card-header">
        <div className="payment-provider-badge">
          <span className={`provider-dot ${payment.provider.toLowerCase()}`} />
          <h3>{t("payWith")} {provider}</h3>
        </div>
        <div className={`account-type-badge ${isMerchant ? "merchant" : "personal"}`}>
          {isMerchant ? <Building2 size={15} /> : <UserCheck size={15} />}
          <span>{isMerchant ? t("merchantAccount") : t("personalAccount")}</span>
        </div>
      </div>

      <div
        className={`payment-type-alert ${isMerchant ? "merchant-alert" : "personal-alert"}`}
        role="alert"
      >
        <div className="alert-icon-wrap">
          {isMerchant ? <AlertTriangle size={22} /> : <Info size={22} />}
        </div>
        <div className="alert-content">
          <strong>
            {isMerchant
              ? (lang === "bn" ? "মার্চেন্ট একাউন্ট সতর্কতা:" : "Merchant Account Notice:")
              : (lang === "bn" ? "পার্সোনাল একাউন্ট সতর্কতা:" : "Personal Account Notice:")}
          </strong>
          <p>{isMerchant ? t("merchantAlert") : t("personalAlert")}</p>
          <div className="action-pill-highlight">
            {lang === "bn" ? "প্রয়োজনীয় অপশন: " : "Required Option: "}
            <strong>{isMerchant ? t("makePaymentOption") : t("sendMoneyOption")}</strong>
          </div>
        </div>
      </div>

      {payment.account && (payment.provider.toLowerCase().includes("bkash") || payment.provider.toLowerCase().includes("nagad")) && (
        <DynamicPaymentQR
          provider={payment.provider}
          account={payment.account}
          amount={payment.amount}
          orderRef={order.ref}
        />
      )}

      <div className="payment-steps-container">
        <h4 className="payment-steps-heading">
          {lang === "bn"
            ? `কীভাবে ${provider} দিয়ে টাকা পাঠাবেন (ধাপে ধাপে):`
            : `How to complete payment via ${provider} (Step-by-step):`}
        </h4>
        <ol className="payment-steps-list">
          <li className="payment-step-item">
            <div className="step-indicator">1</div>
            <div className="step-body">
              <strong>{t("stepOpenWallet")}</strong>
              <p className="muted">
                {lang === "bn"
                  ? `আপনার ফোনে ${provider} অ্যাপটি ওপেন করুন অথবা USSD ডায়াল করুন`
                  : `Open the ${provider} mobile app on your smartphone`}
              </p>
            </div>
          </li>

          <li className="payment-step-item highlight-step">
            <div className="step-indicator">2</div>
            <div className="step-body">
              <strong>{t("stepSelectPaymentOption")}</strong>
              <div className="step-action-tag">
                {isMerchant ? (
                  <span className="action-choice merchant">
                    👉 <strong>Payment</strong> / <strong>পেমেন্ট</strong>
                  </span>
                ) : (
                  <span className="action-choice personal">
                    👉 <strong>Send Money</strong> / <strong>সেন্ড মানি</strong>
                  </span>
                )}
              </div>
              <p className="step-warning-sub">
                {isMerchant
                  ? (lang === "bn" ? "মার্চেন্ট নম্বরে সেন্ড মানি (Send Money) করলে পেমেন্ট হবে না।" : "Do NOT use Send Money for merchant accounts.")
                  : (lang === "bn" ? "পার্সোনাল নম্বরে পেমেন্ট (Payment) অপশন কাজ করবে না।" : "Do NOT use Payment option for personal accounts.")}
              </p>
            </div>
          </li>

          <li className="payment-step-item">
            <div className="step-indicator">3</div>
            <div className="step-body">
              <strong>{t("receivingAccount")}</strong>
              <div className="step-data-row">
                <span className="step-data-val">{payment.account}</span>
                <CopyButton value={payment.account} label={t("copyBtn")} />
              </div>
            </div>
          </li>

          <li className="payment-step-item">
            <div className="step-indicator">4</div>
            <div className="step-body">
              <strong>{t("exactAmount")}</strong>
              <div className="step-data-row">
                <span className="step-data-val amount-highlight">{money(payment.amount)}</span>
                <CopyButton value={payment.amount} label={t("copyBtn")} />
              </div>
              <small className="muted">
                {lang === "bn"
                  ? "ঠিক এই টাকার পরিমাণ পাঠাবেন (কম বা বেশি পাঠালে ভেরিফিকেশন হবে না)"
                  : "Send the exact specified amount to prevent verification failures"}
              </small>
            </div>
          </li>

          <li className="payment-step-item">
            <div className="step-indicator">5</div>
            <div className="step-body">
              <strong>{lang === "bn" ? "রেফারেন্স নম্বর (Reference)" : "Order Reference (Ref)"}</strong>
              <div className="step-data-row">
                <span className="step-data-val ref-code">{order.ref}</span>
                <CopyButton value={order.ref} label={t("copyBtn")} />
              </div>
              <small className="muted">
                {lang === "bn"
                  ? "রেফারেন্সে এই কোডটি লিখুন যাতে অর্ডার সাথে সাথে নিশ্চিত করা যায়"
                  : "Enter this reference code in the reference field"}
              </small>
            </div>
          </li>

          <li className="payment-step-item">
            <div className="step-indicator">6</div>
            <div className="step-body">
              <strong>{t("stepSubmitTrxId")}</strong>
              <p className="muted">
                {lang === "bn"
                  ? "লেনদেন শেষে প্রাপ্ত TrxID (Transaction ID) টি কপি করে নিচের বক্সে বসিয়ে সাবমিট করুন।"
                  : "After confirming the transaction, copy the TrxID from your SMS or app and submit below."}
              </p>
            </div>
          </li>
        </ol>
      </div>

      {remainingSeconds !== null && (
        <p className="payment-expiry-note">
          <Clock size={18} aria-hidden="true" />
          <span>{lang === "bn" ? "পেমেন্টের বাকি সময়:" : "Time left to pay:"}</span>
          <strong role="timer" aria-live="off">
            {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}
          </strong>
        </p>
      )}

      {session?.demo && (
        <p className="notice">
          Demo only: use TrxID{" "}
          <strong>DEMO{order.ref.replace(/\D/g, "")}</strong> to
          simulate the test receipt. No money is transferred.
        </p>
      )}
    </div>
  );
}
function PurchasePage() {
  const { id } = useParams();
  const { session, sessionError } = useMarket();
  const { t, lang } = useLang();
  const [order, setOrder] = useState<Purchase | null>(null),
    [error, setError] = useState(""),
    [trx, setTrx] = useState(""),
    [busy, setBusy] = useState(false),
    [items, setItems] = useState<{ item: number; content: string }[] | null>(
      null,
    );
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now);
  const paymentDeadline = order?.payment ? Date.parse(order.payment.expires_at) : (Number(order?.advance_amount || 0) > 0 ? Date.now() + 86400000 : NaN);
  const paymentOpen = !!order && (["unpaid", "pending_verification", "review_required"].includes(order.payment_status) || order.delivery_status === "awaiting_advance");
  const ticking = paymentOpen && order?.delivery_status !== "cancelled" && paymentDeadline > now;
  useEffect(() => {
    if (!ticking) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, [paymentDeadline, ticking]);
  const load = () =>
    api<Purchase>(`/orders/${id}`).then((o) => {
      setOrder(o);
      setError("");
    });
  useEffect(() => {
    if (!session) return;
    let current = true;
    const update = () =>
      api<Purchase>(`/orders/${id}`)
        .then((o) => {
          if (current) {
            setOrder(o);
            setError("");
          }
        })
        .catch((e) => {
          if (current) setError(e.message);
        });
    void update();
    const interval = setInterval(update, 7000);
    return () => {
      current = false;
      clearInterval(interval);
    };
  }, [id, session?.csrf]);
  if (!order)
    return (
      <main id="main" className="container section">
        {error || sessionError ? (
          <ErrorBox
            message={error || sessionError}
            retry={() => void load().catch((e) => setError(e.message))}
          />
        ) : (
          <Loading />
        )}
      </main>
    );
  const paid = order.payment_status === "paid",
    cancelled = order.delivery_status === "cancelled";
  const expired = paymentDeadline <= now;
  const remainingSeconds = Number.isFinite(paymentDeadline)
    ? Math.max(0, Math.ceil((paymentDeadline - now) / 1000))
    : null;
  const message = purchaseMessage(order, lang);
  return (
    <main id="main" className="container purchase-page narrow-page">
      <Link to="/purchases" className="back-link">
        <ArrowLeft size={16} />
        {lang === "bn" ? "আমার অর্ডারসমূহ" : "My purchases"}
      </Link>
      <div className="purchase-page-heading">
        <span className={`purchase-hero-icon ${paid && !cancelled ? "positive" : ""}`}>
          {paid && !cancelled ? <CheckCircle2 size={32} /> : <LockKeyhole size={30} />}
        </span>
        <p className="eyebrow">{order.ref}</p>
        <h1>{message.title}</h1>
        <p>{message.description}</p>
        {paid && !order.ready && !cancelled && order.delivery_estimate && <p className="preserve-lines">{order.delivery_estimate}</p>}
      </div>
      {error && <ErrorBox message={error} />}
      <div className="panel purchase-panel">
        <div className="purchase-product">
          <div>
            <span className="muted">{order.shop.name}</span>
            <h2>{order.name}</h2>
            <p>
              {order.quantity} {order.quantity === 1 ? (lang === "bn" ? "টি আইটেম" : "item") : (lang === "bn" ? "টি আইটেম" : "items")}
              {order.coupon_code && <span className="order-coupon-pill"> · {lang === "bn" ? `কুপন ${order.coupon_code}` : `Coupon ${order.coupon_code}`}</span>}
            </p>
          </div>
          <div className="purchase-pricing-col">
            <strong className="price">{money(order.total, order.currency)}</strong>
            {order.discount && Number(order.discount) > 0 && (
              <span className="purchase-discount-tag">{lang === "bn" ? "ছাড়: -" : "Discount: -"}{money(order.discount)}</span>
            )}
          </div>
        </div>
        <div className="order-status-grid">
          <div>
            <span>{lang === "bn" ? "পেমেন্ট" : "Payment"}</span>
            <strong>{paymentLabel(order.payment_status, lang)}</strong>
          </div>
          <div>
            <span>{lang === "bn" ? "ডেলিভারি" : "Delivery"}</span>
            <strong>{deliveryLabel(order.delivery_status, lang)}</strong>
          </div>
        </div>
        {(order.buyer_name || order.buyer_email || order.buyer_phone || order.buyer_fields?.note) && (
          <div className="purchase-buyer-info">
            <span className="buyer-details-label">
              {lang === "bn" ? "ক্রেতার তথ্য" : "Customer details"}
            </span>
            <div className="buyer-summary-grid">
              {order.buyer_name && (
                <div>
                  <span className="muted">{lang === "bn" ? "নাম: " : "Name: "}</span>
                  <strong>{order.buyer_name}</strong>
                </div>
              )}
              {order.buyer_email && (
                <div>
                  <span className="muted">{lang === "bn" ? "ইমেইল: " : "Email: "}</span>
                  <strong>{order.buyer_email}</strong>
                </div>
              )}
              {order.buyer_phone && (
                <div>
                  <span className="muted">{lang === "bn" ? "ফোন: " : "Phone: "}</span>
                  <strong>{order.buyer_phone}</strong>
                </div>
              )}
            </div>
            {order.buyer_fields?.note && (
              <p className="preserve-lines buyer-note">
                <span className="muted">{lang === "bn" ? "নোট / বিবরণ: " : "Note / details: "}</span>
                <strong>{String(order.buyer_fields.note)}</strong>
              </p>
            )}
          </div>
        )}
        {paymentOpen && !cancelled && (order.payment || (Number(order.advance_amount || 0) > 0 && order.payment_status !== "paid")) && !expired && (
          <>
            <PaymentInstructionCard order={order} session={session} remainingSeconds={remainingSeconds} />
            <form
              className="proof-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const next = await api<Purchase>(`/orders/${id}/proof`, {
                    method: "POST",
                    body: JSON.stringify({ trx_id: trx.trim() }),
                  });
                  setOrder(next);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                {lang === "bn" ? "ট্রানজাকশন আইডি (TrxID)" : "Transaction ID"}
                <input
                  required
                  minLength={4}
                  maxLength={64}
                  pattern="[A-Za-z0-9]+"
                  autoComplete="off"
                  spellCheck={false}
                  value={trx}
                  onChange={(e) => setTrx(e.target.value)}
                  placeholder={lang === "bn" ? "পেমেন্ট রসিদ থেকে প্রাপ্ত TrxID লিখুন" : "Enter the TrxID from your payment receipt"}
                />
              </label>
              <button className="button primary" disabled={busy}>
                {busy ? (lang === "bn" ? "যাচাই করা হচ্ছে…" : "Checking…") : (lang === "bn" ? "পেমেন্ট চেক করুন" : "Check payment")}
                <ArrowRight size={17} />
              </button>
            </form>
            {(order.payment?.trx_id || trx) && (
              <p className="notice">
                {lang === "bn"
                  ? `সাবমিট করা হয়েছে: ${order.payment?.trx_id || trx}। বিক্রেতার পেমেন্ট রিসিটের সাথে এটি মেলানো হচ্ছে।`
                  : `Submitted: ${order.payment?.trx_id || trx}. We're matching it with the seller's payment receipt.`}
              </p>
            )}
          </>
        )}
        {paymentOpen && (expired || cancelled) && (
          <div className="notice">
            <p>{lang === "bn" ? "এই পেমেন্ট রিকোয়েস্টটির মেয়াদ শেষ হয়েছে। অনুগ্রহ করে এই নম্বরে টাকা পাঠাবেন না।" : "This payment request is no longer active. Do not send payment using these details."}</p>
            <button
              className="button secondary"
              onClick={() => navigate("/products")}
            >
              {lang === "bn" ? "প্রোডাক্ট ব্রাউজ করুন" : "Browse products"}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        {order.fulfilment_kind === "physical" && <section className="purchase-buyer-info" aria-label="Delivery details">
          <h3>Delivery details</h3><p className="preserve-lines">{order.address}, {order.district}</p>
          <p>Payment method: {paymentMethodLabel(order.payment_method || "cod")}</p>
          {order.delivery_charge !== undefined && <p>Delivery charge: {money(order.delivery_charge, order.currency)}</p>}
          {Number(order.advance_amount || 0) > 0 && (
            <p className="advance-order-info">
              <strong>{lang === "bn" ? "প্রয়োজনীয় অগ্রিম:" : "Required advance:"}</strong> {money(order.advance_amount!, order.currency)}
              {order.payment_status === "paid" ? (
                <span className="badge-paid"> {lang === "bn" ? "(পরিশোধিত)" : "(Paid)"}</span>
              ) : (
                <span> {lang === "bn" ? "— উপরে দেওয়া অ্যাকাউন্টে অগ্রিম পাঠিয়ে TrxID সাবমিট করুন।" : "— Please pay the advance using the instructions above and submit your TrxID."}</span>
              )}
            </p>
          )}
          {order.tracking ? <p>{order.tracking.provider} · Tracking number: {order.tracking.tracking} · {order.tracking.status}</p> : <p>Courier tracking will appear when the seller books delivery.</p>}
          {order.tracking?.tracking_url?.startsWith("https://") && <a className="button secondary" href={order.tracking.tracking_url} target="_blank" rel="noopener noreferrer">Track with courier<ExternalLink size={16} /></a>}
        </section>}
        {order.fulfilment_kind !== "physical" && paid && order.ready && !cancelled && (
          <div className="private-delivery">
            <div>
              <LockKeyhole size={24} />
              <h3>{lang === "bn" ? "আপনার ডিজিটাল পণ্য" : "Your digital items"}</h3>
              <p>
                {lang === "bn" ? "আপনার পাসওয়ার্ড, লাইসেন্স কী ও এক্সেস তথ্য সবসময় গোপন ও নিরাপদ রাখুন।" : "Keep your passwords, license keys and access details private."}
              </p>
            </div>
            {items ? (
              <div className="private-items">
                {items.map((item) => {
                  const downloadLinks = extractDownloadLinks(item.content);
                  return (
                    <div key={item.item} className="private-item">
                      <div className="private-item-header">
                        <strong>{lang === "bn" ? `আইটেম ${item.item}` : `Item ${item.item}`}</strong>
                        <CopyButton value={item.content} />
                      </div>
                      {downloadLinks.length > 0 && (
                        <div className="private-item-downloads">
                          {downloadLinks.map((dl, idx) => (
                            <a
                              key={idx}
                              href={dl.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={dl.isFile ? true : undefined}
                              className="button primary download-action-btn"
                            >
                              <Download size={16} />
                              <span>{dl.label}</span>
                              <ExternalLink size={14} />
                            </a>
                          ))}
                        </div>
                      )}
                      <pre data-private="true">{item.content}</pre>
                    </div>
                  );
                })}
                <button className="button ghost" onClick={() => setItems(null)}>
                  {lang === "bn" ? "তথ্য লুকান" : "Hide my items"}
                </button>
              </div>
            ) : (
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const result = await api<{
                      items: { item: number; content: string }[];
                    }>(`/orders/${id}/reveal`, { method: "POST" });
                    setItems(result.items);
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? (lang === "bn" ? "খোলা হচ্ছে…" : "Opening…") : (lang === "bn" ? "আমার আইটেম দেখুন" : "View my items")}
                <LockKeyhole size={16} />
              </button>
            )}
          </div>
        )}
        {paid && !order.ready && !cancelled && (
          <div className="notice">
            <Package size={22} />
            <p>
              {order.delivery_status === "needs_attention" ? "Contact the seller using the support details below." : "Check the delivery status above for updates. This page refreshes automatically."}
            </p>
          </div>
        )}
      </div>

      {(order.can_review || order.review) && <PurchaseReview key={order.id} order={order} />}
      <div className="purchase-support">
        <span>{lang === "bn" ? "এই অর্ডার সংক্রান্ত সহায়তার প্রয়োজন?" : "Need help with this order?"}</span>
        {order.shop.support ? (
          <a className="text-link" href={supportHref(order.shop.support)}>
            {lang === "bn" ? `${order.shop.name}-এর সাথে যোগাযোগ করুন` : `Contact ${order.shop.name}`}
          </a>
        ) : (
          <Link className="text-link" to={`/shops/${order.shop.slug}`}>
            {lang === "bn" ? "বিক্রেতার শপে যান" : "Visit seller’s shop"}
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
      <WhatsAppFloatingButton shop={order.shop} order={order} />
    </main>
  );
}
function Seller() {
  const [connection] = useSearchParams();
  const { session, sessionError, refreshSession, reloadCatalog } = useMarket();
  const { t, lang } = useLang();
  const [shops, setShops] = useState<Shop[] | null>(null),
    [selected, setSelected] = useState("");
  const [paymentAccountTypesUpdated, setPaymentAccountTypesUpdated] = useState(0);
  const [data, setData] = useState<{
    shop: Shop;
    products: Product[];
    payment_methods: string[];
    active: boolean;
  } | null>(null);
  const [form, setForm] = useState({
      name: "",
      description: "",
      support: "",
      logo_url: "",
      cover_url: "",
      pages: {} as NonNullable<Shop["pages"]>,
    }),
    [ids, setIds] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [synced, setSynced] = useState("");
  useEffect(() => {
    if (!session?.user) return;
    let current = true;
    api<{ shops: Shop[] }>("/seller")
      .then((r) => {
        if (current) {
          setShops(r.shops);
          setSelected(r.shops[0]?.id || "");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [session?.user?.id]);
  const sync = async () => {
    if (!selected) return;
    setError("");
    const result = await api<NonNullable<typeof data>>(
      `/seller/stores/${selected}/catalog`,
    );
    setData(result);
    setForm({
      name: result.shop.name,
      description: result.shop.description,
      support: result.shop.support,
      logo_url: result.shop.logo_url,
      cover_url: result.shop.cover_url,
      pages: result.shop.pages || {},
    });
    setIds(
      result.products
        .filter((p) => p.selected && p.sales_enabled)
        .map((p) => p.id),
    );
    setSynced(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    );
  };
  useEffect(() => {
    let current = true;
    if (!selected) return;
    setData(null);
    setMessage("");
    api<NonNullable<typeof data>>(`/seller/stores/${selected}/catalog`)
      .then((result) => {
        if (current) {
          setData(result);
          setForm({
            name: result.shop.name,
            description: result.shop.description,
            support: result.shop.support,
            logo_url: result.shop.logo_url,
            cover_url: result.shop.cover_url,
            pages: result.shop.pages || {},
          });
          setIds(
            result.products
              .filter((p) => p.selected && p.sales_enabled)
              .map((p) => p.id),
          );
          setSynced(
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [selected]);
  async function save(published: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let supportPayload = form.support.trim();
      const bdPhone = supportPayload.replace(/\D/g, "").match(/^(?:88)?(01[3-9]\d{8})$/);
      if (bdPhone) {
        supportPayload = `https://wa.me/88${bdPhone[1]}`;
      }
      const result = await api<{ shop: Shop }>(
        `/seller/stores/${selected}/listing`,
        {
          method: "PUT",
          body: JSON.stringify({ ...form, support: supportPayload, published, product_ids: ids }),
        },
      );
      setData((previous) =>
        previous ? { ...previous, shop: result.shop } : previous,
      );
      setMessage(
        published
          ? "Your shop is published. Products, prices and stock are updated from AriseSell."
          : "Your shop is unpublished. Existing products and orders remain in AriseSell.",
      );
      await reloadCatalog();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="container seller-page">
      <div className="page-intro">
        <p className="eyebrow">Seller workspace</p>
        <h1>{session?.user ? "Manage your shop" : <>Sell your products</>}</h1>
        <p>{session?.user ? "Update your profile, choose products, and share your shop link." : "Connect your AriseSell account to publish your products here."}</p>
      </div>
      <ol className="onboarding-steps">
        <li className={session?.user ? "complete" : "active"}>
          <span>{session?.user ? <Check size={16} /> : "1"}</span>Connect
          AriseSell
        </li>
        <li className={session?.user ? "active" : ""}>
          <span>2</span>Set up your shop
        </li>
        <li className={data?.shop.published ? "complete" : ""}>
          <span>{data?.shop.published ? <Check size={16} /> : "3"}</span>Publish products
        </li>
      </ol>
      {sessionError && (
        <ErrorBox message={sessionError} retry={() => void refreshSession()} />
      )}
      {connection.get("connection") === "retry" && (
        <div className="notice error" role="alert">
          <p>
            Your connection expired or could not be verified. Start again to
            connect securely.
          </p>
          <a href="/api/auth/start" className="text-link">
            Try connecting again
          </a>
        </div>
      )}
      <div className="seller-layout">
        <div>
          {!session ? (
            <Loading />
          ) : !session.user ? (
            <section className="panel connect-panel">
              <div className="connect-icon">
                <Store size={34} />
              </div>
              <h2>
                Connect your AriseSell account
              </h2>
              <p>
                Connect your AriseSell account to bring your shop here. Your
                product catalog, payments, and stock stay where you
                already manage them.
              </p>
              <a className="button primary" href="/api/auth/start">
                <img src="/favicon.svg" alt="" width="20" height="20" />
                Continue with AriseSell
                <ArrowRight size={17} />
              </a>
              <p className="form-hint muted">
                New to AriseSell? You can create an account in the next step.
              </p>
              <div className="connect-benefits">
                <span>
                  <CheckCircle2 size={16} />
                  No duplicate catalog
                </span>
                <span>
                  <CheckCircle2 size={16} />
                  Payments go to your account
                </span>
                <span>
                  <CheckCircle2 size={16} />
                  Manage orders in AriseSell
                </span>
              </div>
            </section>
          ) : !shops ? (
            <Loading />
          ) : !shops.length ? (
            <section className="panel connect-panel">
              <Store size={36} />
              <h2>Create a shop in AriseSell</h2>
              <p>
                Your account is connected. Create a store in AriseSell,
                then return here to publish it.
              </p>
              <a
                className="button primary"
                href={`${session.source_web}/onboarding`}
              >
                Create a shop
                <ArrowRight size={17} />
              </a>
              <button
                className="button secondary"
                onClick={() => window.location.reload()}
              >
                Refresh shop list
                <RefreshCw size={16} />
              </button>
            </section>
          ) : (
            <>
              {shops.length > 1 && (
                <label className="field shop-picker">
                  Choose your AriseSell shop
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {error && (
                <ErrorBox
                  message={error}
                  retry={() => void sync().catch((e) => setError(e.message))}
                />
              )}
              <div role="status">
                {message && (
                  <div className="notice success">
                    <CheckCircle2 size={20} />
                    <p>{message}</p>
                    {data?.shop.published && (
                      <Link
                        className="text-link"
                        to={`/shops/${data.shop.slug}`}
                      >
                        View shop
                      </Link>
                    )}
                  </div>
                )}
              </div>
              {data ? (
                <>
                  <section
                    className="panel store-link-panel"
                    aria-labelledby="store-link-title"
                  >
                    <p className="eyebrow">{shopType(data.shop)}</p>
                    <div className="seller-panel-heading">
                      <div>
                        <span className="eyebrow">Your storefront</span>
                        <h2 id="store-link-title">Share your shop</h2>
                      </div>
                      <Store size={24} />
                    </div>
                    <p>
                      Put this link in your Facebook or Instagram bio, page
                      button, or customer chat. Customers go directly to your
                      shop and can buy as guests.
                    </p>
                    <label className="field">
                      Shop link
                      <input
                        type="url"
                        readOnly
                        value={`${window.location.origin}/shops/${data.shop.slug}`}
                        onFocus={(event) => event.currentTarget.select()}
                      />
                    </label>
                    {data.shop.published ? (
                      <div className="button-row">
                        <CopyButton
                          key={data.shop.id}
                          value={`${window.location.origin}/shops/${data.shop.slug}`}
                          label="Copy shop link"
                        />
                        <Link
                          className="text-link"
                          to={`/shops/${data.shop.slug}`}
                        >
                          Open storefront
                        </Link>
                      </div>
                    ) : (
                      <p className="muted">
                        Publish your shop below to make this link available to
                        customers.
                      </p>
                    )}
                  </section>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save(true);
                    }}
                  >
                    <section className="panel seller-panel">
                      <div className="seller-panel-heading">
                        <div>
                          <span className="eyebrow">Shop settings</span>
                          <h2>Shop profile</h2>
                        </div>
                        <span
                          className={`pill ${data.shop.published ? "positive" : ""}`}
                        >
                          {data.shop.published ? "Published" : "Not published"}
                        </span>
                      </div>
                      <label className="field">
                        Shop name
                        <input
                          required
                          minLength={2}
                          maxLength={100}
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Tell customers about your shop
                        <textarea
                          required
                          minLength={10}
                          maxLength={1500}
                          rows={4}
                          value={form.description}
                          onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                          }
                          placeholder="Describe the products you sell and who they are for."
                        />
                        <small>{form.description.length}/1,500</small>
                      </label>
                      <label className="field">
                        Support email, WhatsApp or website
                        <input
                          required
                          maxLength={255}
                          value={form.support}
                          onChange={(e) =>
                            setForm({ ...form, support: e.target.value })
                          }
                          placeholder="hello@yourshop.com, 01XXXXXXXXX or https://wa.me/…"
                        />
                        <span className="form-hint">
                          {lang === "bn"
                            ? "কাস্টমার সাপোর্টের জন্য আপনার ইমেইল, হোয়াটসঅ্যাপ নম্বর বা লিঙ্ক দিন।"
                            : "Enter your support email, WhatsApp number, or support link."}
                        </span>
                      </label>
                      <details className="branding-details">
                        <summary>
                          Logo & cover image <span>Optional</span>
                          <ChevronDown size={15} />
                        </summary>
                        <label className="field">
                          Logo URL
                          <input
                            type="url"
                            value={form.logo_url}
                            placeholder="https://…"
                            onChange={(e) =>
                              setForm({ ...form, logo_url: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          Cover image URL
                          <input
                            type="url"
                            value={form.cover_url}
                            placeholder="https://…"
                            onChange={(e) =>
                              setForm({ ...form, cover_url: e.target.value })
                            }
                          />
                        </label>
                      </details>
                    </section>
                    <section className="panel seller-panel" aria-labelledby="shop-information-title">
                      <div className="seller-panel-heading">
                        <div><span className="eyebrow">Useful links</span><h2 id="shop-information-title">Shop information & policies</h2></div>
                        <BookOpen size={24} aria-hidden="true" />
                      </div>
                      <p className="muted">Customers can read these sections from your shop footer. Write in English or Bangla. Only add policies and promises your shop follows.</p>
                      <div className="shop-page-editors">
                        {shopPageSections.map(section => (
                          <details key={section.key} className="branding-details shop-page-editor">
                            <summary>{section.title}<span>{form.pages[section.key]?.trim() ? "Added" : "Optional"}</span><ChevronDown size={15} aria-hidden="true" /></summary>
                            <div className="field">
                              <label htmlFor={`shop-page-${section.key}`}>{section.title}</label>
                              <textarea id={`shop-page-${section.key}`} rows={6} maxLength={3000} disabled={busy}
                                value={form.pages[section.key] || ""}
                                aria-describedby={`shop-page-${section.key}-hint`}
                                onChange={event => setForm({ ...form, pages: { ...form.pages, [section.key]: event.target.value } })} />
                              <span className="form-hint" id={`shop-page-${section.key}-hint`}>{section.hint} Up to 3,000 characters. Your text appears as written.</span>
                            </div>
                          </details>
                        ))}
                      </div>
                      <p className="muted">Use {data.shop.published ? "Save shop changes" : "Publish shop"} below to save this information with your shop.</p>
                    </section>

                    <section className="panel seller-panel" aria-labelledby="shop-payment-settings-title">
                      <p className="muted">Your AriseSell shop controls payment accounts, shipping charges and fulfillment.</p>
                      <div className="seller-panel-heading">
                        <div>
                          <span className="eyebrow">{lang === "bn" ? "পেমেন্ট সেটআপ · AriseSell অটো-সিঙ্ক" : "Payment Setup · AriseSell Auto-Sync"}</span>
                          <h2 id="shop-payment-settings-title">{lang === "bn" ? "সংযুক্ত পেমেন্ট একাউন্ট ও নির্দেশনা" : "Connected Payment Accounts & Instructions"}</h2>
                        </div>
                        <Wallet size={24} aria-hidden="true" />
                      </div>
                      <p className="muted">
                        {lang === "bn"
                          ? "আপনার ওয়ালেটের ধরন (পার্সোনাল নাকি মার্চেন্ট) AriseSell থেকে স্বয়ংক্রিয়ভাবে শনাক্ত ও সিঙ্ক করা হয়েছে। আলাদাভাবে সিলেক্ট করার প্রয়োজন নেই—চেকআউটে ক্রেতারা সরাসরি সঠিক নির্দেশনা দেখতে পাবেন।"
                          : "Wallet types (Personal vs Merchant) are automatically detected and synced from your connected AriseSell store. No manual selection required—customers automatically receive the exact instructions during checkout."}
                      </p>
                      <div className="seller-payment-methods-list">
                        {data.payment_methods.map((providerKey) => {
                          const pKey = providerKey.toLowerCase();
                          const currentType = detectPaymentAccountType({provider: pKey}, data.shop);
                          return (
                            <div key={pKey} className="seller-payment-method-row">
                              <div className="payment-method-header-bar">
                                <div className="payment-method-info">
                                  <span className={`provider-dot ${pKey}`} />
                                  <strong>{paymentMethodLabel(pKey)}</strong>
                                  <span className="arisesell-sync-tag">
                                    <Check size={12} />
                                    {lang === "bn" ? "AriseSell থেকে অটো-ডিটেক্টেড" : "Auto-synced from AriseSell"}
                                  </span>
                                </div>
                                <span className={`account-type-badge ${currentType}`}>
                                  {pKey === "cod" ? <Package size={13} /> : currentType === "merchant" ? <Building2 size={13} /> : <UserCheck size={13} />}
                                  {pKey === "cod" ? paymentMethodLabel(pKey) : currentType === "merchant" ? t("merchantAccount") : t("personalAccount")}
                                </span>
                              </div>
                              <div className="payment-type-auto-info">
                                {pKey === "cod" ? <p>Check your order for delivery charges and any source-required advance.</p> : currentType === "merchant" ? (
                                  <div className="auto-detected-hint merchant">
                                    <Building2 size={15} />
                                    <span>
                                      {lang === "bn"
                                        ? "মার্চেন্ট একাউন্ট হিসেবে শনাক্ত। চেকআউটে ক্রেতারা স্বয়ংক্রিয়ভাবে 'পেমেন্ট করুন' (Make Payment) নির্দেশনা ও সেন্ড মানি না করার স্পষ্ট সতর্কতা দেখতে পাবেন।"
                                        : "Detected as Merchant Account in AriseSell. Buyers are automatically instructed to use 'Make Payment' and warned not to Send Money."}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="auto-detected-hint personal">
                                    <UserCheck size={15} />
                                    <span>
                                      {lang === "bn"
                                        ? "পার্সোনাল / উদ্যোক্তা নম্বর হিসেবে শনাক্ত। চেকআউটে ক্রেতারা স্বয়ংক্রিয়ভাবে 'সেন্ড মানি করুন' (Send Money) নির্দেশনা ও পেমেন্ট অপশন না ব্যবহারের সতর্কতা দেখতে পাবেন।"
                                        : "Detected as Personal / Uddokta Number in AriseSell. Buyers are automatically instructed to use 'Send Money' and warned not to use Payment."}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="sync-bar payment-sync-bar">
                        <span className="muted form-hint">
                          {lang === "bn"
                            ? "পেমেন্ট নম্বর পরিবর্তন বা ওয়ালেট সেটিংস পরিচালনা করতে AriseSell ড্যাশবোর্ড ব্যবহার করুন।"
                            : "Payment numbers and account credentials are managed directly inside AriseSell."}
                        </span>
                        <a
                          className="text-link"
                          href={`${session.source_web}/console/${data.shop.slug}/integrations`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {lang === "bn" ? "AriseSell-এ পেমেন্ট নম্বর ও ওয়ালেট ম্যানেজ করুন" : "Manage payment numbers in AriseSell"}
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </section>
                    <section className="panel seller-panel">
                      <div className="seller-panel-heading">
                        <div>
                          <span className="eyebrow">
                            Your catalog
                          </span>
                          <h2>Products to publish</h2>
                        </div>
                        <a
                          className="text-link"
                          href={`${session.source_web}/console/${data.shop.slug}/products`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Manage in AriseSell
                          <ExternalLink size={14} />
                        </a>
                      </div>
                      <p className="muted">
                        Choose which products appear here. Edit products, stock,
                        prices, and delivery settings in AriseSell.
                      </p>
                      <p className="publication-hint">Select products from your active AriseSell shop to publish. Customers can order when the source payment and delivery setup supports checkout.</p>
                      <div className="sync-bar">
                        <span>
                          <RefreshCw size={14} />
                          Synced at {synced}
                        </span>
                        <button
                          type="button"
                          className="text-link"
                          disabled={busy}
                          onClick={() =>
                            void sync().catch((e) => setError(e.message))
                          }
                        >
                          Refresh from AriseSell
                        </button>
                      </div>
                      {data.products.length ? (
                        <div className="seller-products">
                          {data.products.map((product) => (
                            <label
                              key={product.id}
                              className={
                                !product.sales_enabled
                                  ? "seller-product paused"
                                  : "seller-product"
                              }
                            >
                              <input
                                type="checkbox"
                                disabled={!product.sales_enabled || busy}
                                checked={ids.includes(product.id)}
                                onChange={(e) =>
                                  setIds((previous) =>
                                    e.target.checked
                                      ? [...previous, product.id]
                                      : previous.filter(
                                          (id) => id !== product.id,
                                        ),
                                  )
                                }
                              />
                              <span className="seller-product-art">
                                <CategoryIcon category={product.category} />
                              </span>
                              <span>
                                <strong>{product.name}</strong>
                                <small>
                                  {product.sales_enabled
                                    ? `${money(minimumPrice(product), product.currency)} · ${stock(product)} available`
                                  : "Paused in AriseSell"}
                                </small>
                                {product.checkout_unavailable_reason && <small>{product.checkout_unavailable_reason}</small>}
                              </span>
                              <span className="delivery-tag">
                                {productFulfilment(product) === "physical" ? "Physical delivery" : product.delivery_mode === "automatic" ? "Automatic" : "Manual"}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <Empty title="No products in your catalog">
                          <p>
                            Add a product in AriseSell, then refresh
                            here.
                          </p>
                        </Empty>
                      )}
                      <div className="seller-submit">
                        <span>
                          {ids.length}{" "}
                          {ids.length === 1 ? "product" : "products"} selected
                        </span>
                        <button
                          className="button primary"
                          disabled={
                            busy ||
                            !ids.length ||
                            !data.active
                          }
                        >
                          {busy
                            ? "Saving…"
                            : data.shop.published
                              ? "Save shop changes"
                              : "Publish shop"}
                          <ArrowRight size={17} />
                        </button>
                      </div>
                      {data.shop.published && (
                        <button
                          className="button ghost danger-text"
                          type="button"
                          disabled={busy}
                          onClick={() => void save(false)}
                        >
                          Unpublish shop
                        </button>
                      )}
                    </section>
                  </form>
                </>
              ) : !error ? (
                <Loading />
              ) : null}
            </>
          )}
        </div>
        <aside className="seller-sidebar">
          <section className="panel">
            <span className="aside-icon">
              <Layers size={26} />
            </span>
            <h3>Manage products in AriseSell</h3>
            <p>
              Your marketplace shop is connected to AriseSell. There’s no second
              inventory to keep updated.
            </p>
            <ul className="check-list">
              <li>
                <Check size={16} />
                Product details & pricing
              </li>
              <li>
                <Check size={16} />
                Live stock availability
              </li>
              <li>
                <Check size={16} />
                Verified payments
              </li>
              <li>
                <Check size={16} />
                Source-configured delivery
              </li>
            </ul>
          </section>
          {session?.user && data && (
            <section className="panel setup-checklist">
              <h3>Publication checklist</h3>
              {[
                [true, "AriseSell connected"],
                [
                  form.name.trim().length >= 2 &&
                    form.description.trim().length >= 10,
                  "Shop profile ready",
                ],
                [ids.length > 0, "Products selected"],
                [data.payment_methods.length > 0, "Source payment method configured"],
              ].map(([done, label]) => (
                <p key={String(label)}>
                  <span className={done ? "check-done" : "check-pending"}>
                    {done ? <Check size={13} /> : <span />}
                  </span>
                  {label}
                </p>
              ))}
              {!data.payment_methods.length && (
                <a
                  className="text-link"
                  href={`${session.source_web}/console/${data.shop.slug}/integrations`}
                >
                  Configure payments in AriseSell
                </a>
              )}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
function HowItWorks() {
  return (
    <main id="main" className="container listing-page">
      <div className="page-intro">
        <p className="eyebrow">How it works</p>
        <h1>
          How to buy products
        </h1>
        <p>
          Independent shops, products, and a straightforward way to make
          them yours.
        </p>
      </div>
      <div className="how-grid">
        {[
          [
            Search,
            "Choose a product",
            "Browse products and independent shops. Check the description, options, delivery details, and seller’s terms.",
          ],
          [
            LockKeyhole,
            "Review and pay",
            "Choose a product, confirm its current price and terms, and follow the seller’s payment instructions.",
          ],
          [
            Download,
            "Follow your order",
            "Follow your order in My purchases. Physical orders show delivery and courier tracking. Digital items become available after verified payment and preparation.",
          ],
        ].map(([Icon, title, text]) => {
          const I = Icon as typeof Search;
          return (
            <section className="panel" key={String(title)}>
              <span className="aside-icon">
                <I size={28} />
              </span>
              <h2>{title as string}</h2>
              <p>{text as string}</p>
            </section>
          );
        })}
      </div>
      <div className="faq-section">
        <h2>Frequently asked questions</h2>
        {[
          [
            "Who am I buying from?",
            "You buy directly from the shop shown on the product page. Arise Store helps you discover it; the seller’s AriseSell account manages the order, payment and delivery.",
          ],
          [
            "Do I need an account?",
            "You can check out as a guest. Keep the same browser to find guest purchases. Sign in with AriseSell before checkout to connect purchases to your account.",
          ],
          [
            "What happens after I enter a TrxID?",
            "AriseSell matches the transaction with the seller’s payment records. Entering a transaction ID alone does not mark an order as paid.",
          ],
          [
            "What if I need help or a refund?",
            "Contact the seller using the support details on the shop or purchase page. Review the product’s purchase terms before buying; eligibility and support depend on that seller’s policy.",
          ],
          [
            "How do I sell here?",
            "Choose Start selling and Continue with AriseSell. Connect your account, complete your shop profile, select your active products, and publish.",
          ],
          [
            "Can I share a link to just my shop?",
            "Yes. Connect and publish your shop, then use Copy shop link in your seller dashboard. Share it on your Facebook or Instagram page, or send it to customers. It opens your shop directly, with your products, search and checkout. Customers can buy as guests.",
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <Plus size={18} />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      <div className="centered-cta">
        <Link to="/products" className="button primary">
          Browse products
          <ArrowRight size={18} />
        </Link>
      </div>
    </main>
  );
}
const AdminConsole = lazy(() => import("./Admin"));
function AdminEntry() {
  const { session, sessionError, refreshSession, reloadCatalog } = useMarket();
  if (!session) return <main id="main" className="container section">{sessionError ? <ErrorBox message={sessionError} retry={() => void refreshSession()} /> : <Loading />}</main>;
  if (!session.user?.admin) return <main id="main" className="container section"><Empty title="Administrator access required" heading="h1"><p>Continue with an authorized AriseSell administrator account.</p><a className="button primary" href="/api/auth/start?return_to=/admin">Continue with AriseSell</a><Link className="text-link" to="/">Return to marketplace</Link></Empty></main>;
  return <Suspense fallback={<Loading />}><AdminConsole key={session.user.id} user={session.user} sourceWeb={session.source_web} reloadCatalog={reloadCatalog} onSignOut={async () => { await api("/auth/logout", { method: "POST" }); await refreshSession(); }} /></Suspense>;
}
function NotFound() {
  return (
    <main id="main" className="container section">
      <Empty title="Page not found" heading="h1">
        <p>
          This page may have moved, or the product or shop is no longer available. Browse products to continue.
        </p>
        <Link className="button primary" to="/products">
          Browse products
          <ArrowRight size={17} />
        </Link>
      </Empty>
    </main>
  );
}
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.querySelector<HTMLElement>("#main");
    heading?.setAttribute("tabindex", "-1");
  }, [pathname]);
  return null;
}
export default function App() {
  const { pathname } = useLocation();
  const adminRoute = /^\/admin(?:\/|$)/.test(pathname);
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [catalogError, setCatalogError] = useState("");
  const [session, setSession] = useState<Session | null>(null),
    [sessionError, setSessionError] = useState("");
  const catalogRevision = useRef(0);
  const reloadCatalog = async () => {
    const revision = ++catalogRevision.current;
    try {
      const data = await api<Catalog>("/catalog");
      if (revision !== catalogRevision.current) return;
      setCatalog(data);
      setCatalogError("");
    } catch (e) {
      if (revision === catalogRevision.current)
        setCatalogError((e as Error).message);
    }
  };
  const refreshSession = async () => {
    try {
      const data = await api<Session>("/session");
      setCsrf(data.csrf);
      setSession(data);
      setSessionError("");
    } catch (e) {
      setSessionError((e as Error).message);
    }
  };
  useEffect(() => {
    let current = true;
    bootstrap()
      .then((data) => {
        if (current) {
          setCsrf(data.csrf);
          setSession(data);
        }
      })
      .catch((e) => {
        if (current) setSessionError(e.message);
      });
    void reloadCatalog();
    const interval = setInterval(() => {
      if (!document.hidden) void reloadCatalog();
    }, 30000);
    const focus = () => void reloadCatalog();
    window.addEventListener("focus", focus);
    return () => {
      current = false;
      clearInterval(interval);
      window.removeEventListener("focus", focus);
    };
  }, []);
  return (
    <LangProvider>
      <PromotionsProvider>
      <Context.Provider
        value={{
          catalog,
          catalogError,
          reloadCatalog,
          session,
          sessionError,
          refreshSession,
        }}
      >
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <ScrollToTop />
        {!adminRoute && <Header />}
        {!adminRoute && sessionError && (
          <div className="container">
            <ErrorBox
              message={sessionError}
              retry={() => void refreshSession()}
            />
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductPage key={pathname} />} />
          <Route path="/shops/:slug/products/:productSlug" element={<ProductPage key={pathname} />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/shops/:slug" element={<ShopPage />} />
          <Route path="/shops/:slug/reviews" element={<ShopReviewsPage />} />
          <Route path="/shops/:slug/info/:section" element={<ShopInformationPage />} />
          <Route path="/shops/:slug/contact" element={<ShopInformationPage />} />
          <Route path="/info/:section" element={<ShopInformationPage />} />
          <Route path="/track" element={<TrackOrderPage />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/:id" element={<PurchasePage />} />
          <Route path="/seller" element={<Seller />} />
          <Route path="/admin/*" element={<AdminEntry />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {!adminRoute && <><Footer /><StickyBottomSponsoredStrip /></>}
      </Context.Provider>
      </PromotionsProvider>
    </LangProvider>
  );
}
