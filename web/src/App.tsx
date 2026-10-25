import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Search,
  ShoppingBag,
  Store,
  Menu,
  X,
  Check,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ChevronDown,
  LayoutGrid,
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
  Sparkles,
  Layers,
  Play,
  Monitor,
  Command,
} from "lucide-react";
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
} from "./api";
import type { Catalog, Shop, Product, Session, Quote, Purchase } from "./types";
import { productForRoute, productPath, productSection, type ProductSection } from "./product";
import { ProductReviews, PurchaseReview } from "./Reviews";

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
function useRouteShop() {
  const { catalog } = useMarket();
  const { pathname } = useLocation();
  const shopSlug = matchPath("/shops/:slug", pathname)?.params.slug ||
    matchPath("/shops/:slug/products/:productSlug", pathname)?.params.slug;
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
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>Getting things ready…</span>
    </div>
  );
}
function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <ShoppingBag />
      </div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Arise Digital Store home">
      <img src="/favicon.svg" width="38" height="38" alt="" />
      <span>
        arise<span className="brand-divider">/</span>
        <span className="brand-sub">digital store</span>
      </span>
    </Link>
  );
}
function Header() {
  const { session, refreshSession } = useMarket();
  const shop = useRouteShop();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <header className="site-header">
      <div className="top-ticker-bar">
        <div className="container ticker-inner">
          <span>Digital products from independent shops</span>
          <span>Payment verified before private delivery</span>
        </div>
      </div>
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
              <small>Digital shop</small>
            </span>
          </Link>
        ) : (
          <Brand />
        )}
        <nav className="desktop-nav" aria-label="Main navigation">
          {shop ? (
            <>
              <NavLink to={`/shops/${shop.slug}`}>Shop products</NavLink>
              {shop.support && (
                <a href={supportHref(shop.support)}>Contact seller</a>
              )}
            </>
          ) : (
            <>
              <NavLink to="/products">Explore products</NavLink>
              <NavLink to="/shops">Discover shops</NavLink>
              <NavLink to="/how-it-works">How it works</NavLink>
            </>
          )}
        </nav>
        <div className="header-actions">
          <Link
            to="/purchases"
            className="purchases-link"
            aria-label="My purchases"
          >
            <ShoppingBag size={19} />
            <span>My purchases</span>
          </Link>
          {!shop && (
            <Link className="button primary seller-nav" to="/seller">
              {session?.user ? "My shop" : "Start selling"}
              <ArrowUpRight size={16} />
            </Link>
          )}
          <button
            className="icon-button mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {shop ? (
            <>
              <Link to={`/shops/${shop.slug}`}>Shop products</Link>
              {shop.support && (
                <a href={supportHref(shop.support)}>Contact seller</a>
              )}
            </>
          ) : (
            <>
              <Link to="/products">Explore products</Link>
              <Link to="/shops">Discover shops</Link>
            </>
          )}
          <Link to="/purchases">My purchases</Link>
          {!shop && (
            <>
              <Link to="/seller">Seller dashboard</Link>
              <Link to="/how-it-works">How it works</Link>
            </>
          )}
        </nav>
      )}
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
    </header>
  );
}
function Footer() {
  const shop = useRouteShop();
  const { session } = useMarket();
  if (shop)
    return (
      <footer className="store-footer">
        <div>
          <strong>{shop.name}</strong>
          <p>Digital products, directly from this seller.</p>
        </div>
        <nav aria-label="Shop footer navigation">
          <Link to={`/shops/${shop.slug}`}>Shop products</Link>
          <Link to="/purchases">My purchases</Link>
          {shop.support && (
            <a href={supportHref(shop.support)}>Contact seller</a>
          )}
        </nav>
        <Link className="powered" to="/">
          Powered by <strong>Arise Digital Store</strong>
          <ArrowUpRight size={14} />
        </Link>
      </footer>
    );
  return (
    <footer>
      <div className="footer-top">
        <div>
          <Brand />
          <p>
            A small discovery.
            <br />A whole new possibility.
          </p>
        </div>
        <div className="footer-links">
          <div>
            <strong>Find your next thing</strong>
            <Link to="/products">All products</Link>
            <Link to="/shops">Independent shops</Link>
            <Link to="/purchases">Your purchases</Link>
          </div>
          <div>
            <strong>For sellers</strong>
            <Link to="/seller">Open your shop</Link>
            <Link to="/how-it-works">How it works</Link>
            <a href={session?.source_web || "https://arisesell.com"}>
              About AriseSell
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Arise Digital Store</span>
        <span>Made for a more digital everyday.</span>
        <span className="powered">
          Powered by <strong>AriseSell</strong>
        </span>
      </div>
    </footer>
  );
}
function CategoryIcon({
  category,
  size = 20,
}: {
  category: string;
  size?: number;
}) {
  const Icon = /learn|course|education/i.test(category)
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
  let hash = 0;
  for (const c of product.category) hash += c.charCodeAt(0);
  const tone = hash % 6;
  return (
    <div
      aria-hidden="true"
      className={`product-art art-${tone} ${large ? "large-art" : ""}`}
    >
      {product.image_url && /^https:\/\//.test(product.image_url) ? (
        <img
          src={product.image_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="art-orbit" />
      <div className="art-sheet">
        <div className="art-sheet-top">
          <span />
          <span />
          <span />
        </div>
        <CategoryIcon category={product.category} size={large ? 40 : 28} />
        <strong>{product.category}</strong>
        <span className="art-lines">
          <i />
          <i />
          <i />
        </span>
      </div>
      <span className="art-spark">
        <Sparkles size={large ? 22 : 16} />
      </span>
      <span className="art-tag">
        {product.delivery_mode === "automatic"
          ? "AUTOMATIC DIGITAL DELIVERY"
          : "DIRECT SELLER DELIVERY"}
      </span>
    </div>
  );
}
function ProductCard({ product }: { product: Product }) {
  const { catalog } = useMarket();
  const shop = catalog?.shops.find((s) => s.id === product.shop_id);
  return (
    <article className="product-card">
      <Link
        to={productPath(product, catalog!)}
        className="product-art-link"
        aria-label={`View ${product.name}`}
      >
        <Art product={product} />
        <span className="art-arrow">
          <ArrowUpRight size={19} />
        </span>
      </Link>
      <div className="product-info">
        <Link
          to={`/shops/${shop?.slug || product.shop_id}`}
          className="by-shop"
        >
          <span className="tiny-avatar">{shop?.name.slice(0, 1) || "S"}</span>
          {shop?.name || "Independent shop"}
        </Link>
        <Link to={productPath(product, catalog!)} className="product-title">
          {product.name}
        </Link>
        <div className="product-meta">
          <span>{product.category}</span>
          <span className={stock(product) > 0 ? "availability" : "sold-out"}>
            {stock(product) > 0 ? (
              product.delivery_mode === "automatic" ? (
                <>
                  <Zap size={12} />
                  Instant access
                </>
              ) : (
                "Seller delivery"
              )
            ) : (
              "Sold out"
            )}
          </span>
        </div>
        <div className="product-bottom">
          <span className="price">
            {product.variants.length > 1 && <small>From </small>}
            {money(minimumPrice(product))}
          </span>
          <Link
            className="card-buy"
            to={productPath(product, catalog!)}
            aria-label={`View ${product.name}`}
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
function ShopAvatar({ shop }: { shop: Shop }) {
  return (
    <span className="shop-avatar">
      {shop.logo_url ? (
        <img src={shop.logo_url} alt="" referrerPolicy="no-referrer" />
      ) : (
        shop.name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
function ShopCard({ shop }: { shop: Shop }) {
  const count =
    useMarket().catalog?.products.filter((p) => p.shop_id === shop.id).length ||
    0;
  return (
    <Link to={`/shops/${shop.slug}`} className="shop-card">
      <ShopAvatar shop={shop} />
      <div>
        <h3>{shop.name}</h3>
        <p>
          {count} digital {count === 1 ? "product" : "products"}
        </p>
      </div>
      <ArrowUpRight size={19} />
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
  const { catalog, catalogError, reloadCatalog } = useMarket();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const categories = [
    ...new Set(catalog?.products.map((p) => p.category) || []),
  ].slice(0, 7);
  return (
    <>
      <main id="main">
        <section className="hero container">
          <div className="hero-copy">
            <p className="hero-kicker">
              <span className="kicker-pulse" />
              Independent creator shops · Private digital delivery
            </p>
            <h1>
              Good things.
              <br />
              <span>Digitally delivered.</span>
            </h1>
            <p className="hero-description">
              Discover software, developer assets, templates, and courses directly from independent creators. Fast, secure, and delivered privately to your browser.
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
                Search digital products
              </label>
              <input
                id="home-search"
                placeholder="Search digital products, software, courses..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button aria-label="Search products">
                <ArrowRight size={22} />
              </button>
            </form>
            <div className="hero-popular">
              <span>Try searching</span>
              {["Templates", "Courses", "Software"].map((term) => (
                <Link key={term} to={`/products?q=${term}`}>
                  {term}
                  <ArrowUpRight size={12} />
                </Link>
              ))}
            </div>
            <div className="hero-note">
              <span>
                <LockKeyhole size={15} />
                Seller payment options at checkout
              </span>
              <span>
                <Zap size={15} />
                Automatic & seller delivery
              </span>
              <span>
                <Store size={15} />
                Direct Creator Purchases
              </span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="visual-grid" />
            <div className="visual-glow" />
            <div className="visual-label">
              <span />
              VERIFIED DIGITAL DELIVERY PROTOCOL
            </div>
            <div className="visual-browser">
              <div className="browser-dots">
                <i />
                <i />
                <i />
                <span>arise://delivery-vault</span>
              </div>
              <div className="browser-body">
                <div className="browser-symbol">
                  <LockKeyhole size={38} />
                </div>
                <span>Direct to your browser.</span>
                <strong>
                  Your picks.
                  <br />
                  Delivered.
                </strong>
                <div className="browser-footer">
                  <span>Zero-friction guest checkout</span>
                  <ArrowUpRight size={18} />
                </div>
              </div>
            </div>
            <div className="floating-mini mini-top">
              <div className="mini-icon">
                <Zap />
              </div>
              <div>
                <strong>Private digital items</strong>
                <span>Available after verified payment</span>
              </div>
              <ArrowUpRight size={17} />
            </div>
            <div className="floating-mini mini-bottom">
              <div className="mini-icon">
                <ShieldCheck />
              </div>
              <div>
                <strong>Authoritative Security</strong>
                <span>Direct AriseSell order verification</span>
              </div>
            </div>
          </div>
        </section>
        <section className="benefit-strip">
          <div className="container">
            <span>
              <Layers />
              One marketplace, many possibilities
            </span>
            <span>
              <Store />
              Independent digital shops
            </span>
            <span>
              <LockKeyhole />
              Private, protected delivery
            </span>
            <span>
              <RefreshCw />
              Connected with AriseSell
            </span>
          </div>
        </section>
        <section className="container section">
          <SectionTitle
            eyebrow="CATALOG CATEGORIES"
            title="Find your kind of digital."
            link="Explore everything"
            to="/products"
          />
          {categories.length > 0 ? (
            <div className="category-grid">
              {categories.map((category) => (
                <Link
                  to={`/products?category=${encodeURIComponent(category)}`}
                  className="category-card"
                  key={category}
                >
                  <CategoryIcon category={category} size={25} />
                  <span>{category}</span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          ) : catalog ? (
            <p className="muted">
              Categories will appear as sellers publish their first products.
            </p>
          ) : null}
        </section>
        <section className="container section products-section">
          <SectionTitle
            eyebrow="CURATED LISTINGS"
            title="Small upgrades. Big possibilities."
            link="View all products"
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
              {catalog.products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <Empty title="Good things are on their way.">
              <p>
                Our sellers are getting their shops ready. Check back soon, or
                be the first to open one.
              </p>
              <Link className="button primary" to="/seller">
                Open your shop
                <ArrowUpRight size={17} />
              </Link>
            </Empty>
          )}
        </section>
        <section className="container section">
          <SectionTitle
            eyebrow="INDEPENDENT CREATORS"
            title="Meet your new favorite shops."
            link="Discover all shops"
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
                SELLER PLATFORM
              </p>
              <h2>Have something good to share?</h2>
              <p>
                Bring your AriseSell shop to a whole new audience.
                <br />
                Your products, payments, and stock stay in sync.
              </p>
            </div>
            <Link to="/seller" className="button light">
              Open your shop
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
function Products({ shop }: { shop?: Shop }) {
  const { catalog, catalogError, reloadCatalog } = useMarket();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "",
    category = params.get("category") || "";
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
        (!inStock || stock(p) > 0) &&
        `${p.name} ${p.category} ${p.description} ${catalog?.shops.find((s) => s.id === p.shop_id)?.name}`
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
    value ? next.set(name, value) : next.delete(name);
    setParams(next, { replace: true });
  };
  return (
    <main id="main" className="container listing-page">
      {!shop && (
        <div className="page-intro">
          <p className="eyebrow">CURATED BY INDEPENDENT SHOPS</p>
          <h1>A good find starts here.</h1>
          <p>
            Explore digital products that help you learn, create, and do more.
          </p>
        </div>
      )}
      <div className="catalog-controls">
        <div className="catalog-search">
          <Search size={19} />
          <label className="sr-only" htmlFor="catalog-search">
            Search products
          </label>
          <input
            id="catalog-search"
            value={query}
            onChange={(e) => update("q", e.target.value)}
            placeholder={
              shop
                ? `Search ${shop.name} products…`
                : "Search products, shops, and categories…"
            }
          />
          {query && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => update("q", "")}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <label className="sort-select">
          <SlidersHorizontal size={17} />
          <span className="sr-only">Sort products</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">Recommended</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="filter-row">
        <div className="filter-chips">
          <button
            className={!category ? "chip selected" : "chip"}
            aria-pressed={!category}
            onClick={() => update("category", "")}
          >
            All products
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
        <label className="stock-filter">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          In stock only
        </label>
      </div>
      <p className="results-count" role="status">
        {products.length} {products.length === 1 ? "find" : "finds"}
        {query && <> for “{query}”</>}
      </p>
      {catalogError ? (
        <ErrorBox message={catalogError} retry={() => void reloadCatalog()} />
      ) : !catalog ? (
        <Loading />
      ) : products.length ? (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty title="No matches just yet.">
          <p>Try a different search or explore another category.</p>
          <button
            className="button secondary"
            onClick={() => {
              setParams({});
              setInStock(false);
            }}
          >
            Clear filters
          </button>
        </Empty>
      )}
    </main>
  );
}
function Shops() {
  const { catalog, catalogError, reloadCatalog } = useMarket();
  const [query, setQuery] = useState("");
  const shops = catalog?.shops.filter((s) =>
    `${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main id="main" className="container listing-page">
      <div className="page-intro">
        <p className="eyebrow">GOOD PEOPLE. GOOD PRODUCTS.</p>
        <h1>
          Independent shops.
          <br />
          Individual possibilities.
        </h1>
        <p>
          Find a shop that gets you. Discover something made for your everyday.
        </p>
      </div>
      <div className="catalog-search standalone-search">
        <Search size={20} />
        <label className="sr-only" htmlFor="shop-search">
          Search shops
        </label>
        <input
          id="shop-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find your next favorite shop…"
        />
      </div>
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
              <ShopCard shop={shop} />
              <p>{shop.description}</p>
              <Link className="text-link" to={`/shops/${shop.slug}`}>
                Visit shop
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No shops found.">
          <p>Try another name, or explore our products.</p>
        </Empty>
      )}
    </main>
  );
}
function ShopPage() {
  const { slug } = useParams();
  const { catalog, catalogError } = useMarket();
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
    <>
      <section className="shop-hero container">
        <div
          className="shop-banner"
          style={
            shop.cover_url
              ? {
                  backgroundImage: `linear-gradient(90deg,rgba(14,47,35,.92),rgba(14,47,35,.55)),url(${JSON.stringify(shop.cover_url)})`,
                }
              : undefined
          }
        >
          <div className="shop-identity">
            <ShopAvatar shop={shop} />
            <div>
              <p className="eyebrow">AN INDEPENDENT DIGITAL SHOP</p>
              <h1>{shop.name}</h1>
              <p>{shop.description}</p>
            </div>
          </div>
          {shop.support && (
            <a className="button light" href={supportHref(shop.support)}>
              Contact seller
              <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      </section>
      <Products shop={shop} />
    </>
  );
}
function supportHref(value: string) {
  return /^https:\/\//.test(value)
    ? value
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? `mailto:${value}`
      : "#seller-support";
}
function ProductPage() {
  const route = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const section = productSection(location.hash);
  const infoDialog = useRef<HTMLDialogElement>(null);
  function selectSection(value: ProductSection) {
    navigate({ pathname: location.pathname, search: location.search, hash: `#product-${value}` });
  }
  function closeSection() {
    if (section) navigate({ pathname: location.pathname, search: location.search, hash: "" }, { replace: true });
  }
  const { catalog, catalogError } = useMarket();
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
  useEffect(() => setQuantity(1), [product?.id, variant]);
  useEffect(() => {
    if (!product || !catalog) return;
    const previousTitle = document.title;
    document.title = `${product.name} | ${catalog.shops.find((shop) => shop.id === product.shop_id)?.name || "Arise Digital Store"}`;
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
  const available = Boolean(product.sales_enabled && selected && selected.stock > 0);
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
          <div className="product-assurances">
            <span><Monitor size={16} />Digital product</span>
            <span><ShieldCheck size={16} />Private delivery</span>
            <span><ShoppingBag size={16} />No shipping needed</span>
          </div>
          <div className="product-image-caption"><ShieldCheck size={18} /><span>Delivered privately to your purchase history.<small>No shipping address needed.</small></span></div>
        </div>
        <div className="product-summary">
          <div className="product-category-row">
            <span className="product-category">{product.category}</span>
          </div>
          <h1>{product.name}</h1>
          <Link className="by-shop" to={`/shops/${shop.slug}`}>
            <span className="tiny-avatar">{shop.name.slice(0, 1)}</span>
            {shop.name}
            <ArrowUpRight size={13} />
          </Link>
          <div className="detail-price">
            {selected ? money(selected.price) : money(minimumPrice(product))}
            <span>Per item · One-time payment</span>
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
                onChange={(e) => setVariant(e.target.value)}
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {money(v.price)}
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
              <span className="product-stock unavailable">{product.sales_enabled ? "Sold out" : "Purchases paused"}</span>
            )}
            <span>
              {product.delivery_mode === "automatic" ? (
                <>
                  <Zap size={14} />
                  Automatic delivery
                </>
              ) : (
                <>
                  <Package size={14} />
                  Seller delivery
                </>
              )}
            </span>
          </div>
          <div className="product-purchase-box">
            <div className="product-purchase-total" aria-live="polite" aria-atomic="true">
              <span>Total price <small>For {quantity} {quantity === 1 ? "item" : "items"}</small></span>
              <strong>{total !== null ? money(total) : "—"}</strong>
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
              Buy now
              <ArrowRight size={18} />
            </Link>
          ) : (
            <button className="button primary buy-now" disabled>
              {!available ? (product.sales_enabled ? "Currently unavailable" : "Purchases paused") : "Check quantity"}
            </button>
          )}
            </div>
            {available && !canBuy && <p role="alert" className="product-quantity-error">Choose a whole quantity between 1 and {maximum}.</p>}
            <div className="product-policy-links">
              <button type="button" onClick={() => selectSection("terms")}>Purchase terms</button>
              <button type="button" onClick={() => selectSection("delivery")}>Delivery details</button>
              <button type="button" onClick={() => selectSection("reviews")}>Reviews</button>
            </div>
          </div>
          <p className="checkout-note">
            <LockKeyhole size={14} />
            Your items stay private. Delivery follows verified payment.
          </p>
          <div className="detail-delivery">
            <Package size={19} />
            <div>
              <strong>
                {product.delivery_mode === "automatic"
                  ? "Ready after payment verification"
                  : product.delivery_estimate || "Prepared by the seller"}
              </strong>
              <p>{product.delivery_mode === "automatic"
                ? "Your items become available after your payment is verified."
                : "The seller prepares your order after payment is verified."}</p>
              <button type="button" className="text-link" onClick={() => selectSection("delivery")}>View delivery details <ExternalLink size={13} /></button>
            </div>
          </div>
          {!!shop.payment_methods?.length && <div className="product-payment-methods">
            <span>Pay with</span>
            {shop.payment_methods.map(method => <strong key={method}>{method === "bkash" ? "bKash" : method === "nagad" ? "Nagad" : method === "rocket" ? "Rocket" : method}</strong>)}
          </div>}
          <Link className="visit-shop" to={`/shops/${shop.slug}`}>
            <ShopAvatar shop={shop} />
            <span>
              <strong>{shop.name}</strong>
              <small>Visit the shop</small>
            </span>
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
      <dialog ref={infoDialog} className="product-info-dialog" aria-labelledby="product-info-title"
        onClose={closeSection} onClick={(event) => { if (event.target === event.currentTarget) closeSection(); }}>
        <div className="product-info-header">
          <h2 id="product-info-title">{section === "overview" ? "Product description" : section === "delivery" ? "Delivery details" : section === "reviews" ? "Customer reviews" : "Purchase terms"}</h2>
          <button type="button" className="icon-button" aria-label="Close product details" onClick={closeSection}><X size={20} /></button>
        </div>
        <div className="product-info-content">
          <p className="product-info-name">{product.name}</p>
          {section === "overview" &&
            <p className="preserve-lines">
              {product.description ||
                "The seller has not provided an additional description."}
            </p>}
          {section === "delivery" && <>
            <p>{product.delivery_mode === "automatic"
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
              <ArrowUpRight size={16} />
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
                Thank you. Your report has been sent for review.
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
                  What seems wrong?
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
    </main>
  );
}
function Checkout() {
  const { id } = useParams();
  const { catalog, session } = useMarket();
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
  });
  const [quantity, setQuantity] = useState(() => checkoutQuantity(params.get("quantity"))),
    [provider, setProvider] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null),
    [agreed, setAgreed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    if (shop) setProvider(shop.payment_methods?.[0] || "");
  }, [shop?.id]);
  if (!catalog) return <Loading />;
  if (!product || !variant || !shop) return <NotFound />;
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
        Back to product
      </Link>
      <div className="checkout-heading">
        <p className="eyebrow">CHECKOUT · {shop.name}</p>
        <h1>{quote ? "One last look." : "Complete your order."}</h1>
        <p>
          {quote
            ? "Review the current price and seller terms before creating your payment request."
            : "Your product, your total, and a simple way to pay."}
        </p>
        <ol className="checkout-progress" aria-label="Checkout progress">
          <li aria-current={!quote ? "step" : undefined}><span>{quote ? <Check size={14} /> : "1"}</span>Details & payment</li>
          <li aria-current={quote ? "step" : undefined}><span>2</span>Review order</li>
        </ol>
      </div>
      <div className="checkout-grid">
        <form onSubmit={submit} className="panel checkout-form">
          <div className="step-heading">
            <span>{quote ? "02" : "01"}</span>
            <h2>{quote ? "Review & confirm" : "Your details"}</h2>
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
                      ? "Full name"
                      : field === "email"
                        ? "Email address"
                        : "Phone number"}
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
                <small id="checkout-quantity-hint">{money(variant.price)} each · Up to {Math.min(variant.stock, 100)} per order</small>
              </label>
              <fieldset className="checkout-payment">
                <legend>Payment method</legend>
                <p className="form-hint muted">Choose how you’ll pay {shop.name}.</p>
                <div className="payment-options">
                {shop.payment_methods?.map((method) => (
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
                    <span className={`wallet-icon ${method}`}>
                      {method.slice(0, 1).toUpperCase()}
                    </span>
                    <strong>
                      {method === "bkash"
                        ? "bKash"
                        : method === "nagad"
                          ? "Nagad"
                          : "Rocket"}
                    </strong>
                    <CheckCircle2 size={18} />
                  </label>
                ))}
              </div>
              {!shop.payment_methods?.length && <ErrorBox message="This seller has no payment method available. Please contact the seller." />}
              <p className="form-hint muted">
                You’ll get payment instructions after reviewing and confirming your order.
              </p>
              </fieldset>
            </>
          ) : (
            <>
              <div className="review-row">
                <span>Customer</span>
                <strong>{fields.name}</strong>
              </div>
              <div className="review-row">
                <span>Payment method</span>
                <strong>{provider === "bkash" ? "bKash" : provider}</strong>
              </div>
              <div className="terms-box">
                <h3>Seller’s purchase terms</h3>
                <p className="preserve-lines">
                  {quote.snapshot.digital_config.purchase_terms}
                </p>
                <h3>Delivery</h3>
                <p className="preserve-lines">
                  {quote.snapshot.digital_config.delivery_note}
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
            <span>{quote ? "Total to pay" : "Estimated total"}<small>BDT · {quote?.snapshot.quantity ?? quantity} item{(quote?.snapshot.quantity ?? quantity) === 1 ? "" : "s"}</small></span>
            <strong>{total !== null ? money(total) : "—"}</strong>
          </div>
          <button
            className="button primary full-width"
            disabled={busy || !session || !provider || (!quote && !validQuantity) || (!!quote && !agreed)}
          >
            {busy ? (
              <>
                <LoaderCircle size={17} className="spin" />
                Please wait…
              </>
            ) : quote ? (
              <>
                Confirm & get payment instructions
                <ArrowRight size={17} />
              </>
            ) : (
              <>
                Review my order
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
          <p className="checkout-note">
            <LockKeyhole size={14} />
            Payment is verified before your digital items are delivered.
          </p>
        </form>
        <aside className="panel order-summary" aria-label="Order summary">
          <Art product={product} />
          <div className="order-summary-content">
            <span className="eyebrow">FROM {shop.name.toUpperCase()}</span>
            <h2>{quote?.snapshot.name ?? product.name}</h2>
            {product.variants.length > 1 && <p>{quote?.snapshot.variant ?? variant.name}</p>}
            <div className="summary-line">
              <span>Quantity</span>
              <strong>{quote?.snapshot.quantity ?? quantity}</strong>
            </div>
            {!quote && <div className="summary-line">
              <span>Price per item</span>
              <strong>{money(variant.price)}</strong>
            </div>}
            <div className="summary-line">
              <span>Delivery</span>
              <strong>Digital · no shipping</strong>
            </div>
            <div className="summary-total" aria-live="polite" aria-atomic="true">
              <span>{quote ? "Total to pay" : "Estimated total"}</span>
              <strong>{total !== null ? money(total) : "—"}</strong>
              <small>{quote ? "Current price confirmed by the seller." : "Price and availability are confirmed at review."}</small>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
function Purchases() {
  const { session, sessionError } = useMarket();
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
        <p className="eyebrow">ALL YOUR GOOD FINDS</p>
        <h1>Your digital shelf.</h1>
        <p>
          Payment updates, delivery details, and the things you’ve made yours.
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
            <ArrowUpRight size={15} />
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
                  {order.quantity} {order.quantity === 1 ? "item" : "items"} ·{" "}
                  {money(order.total)}
                </span>
              </div>
              <div className="purchase-status">
                <span
                  className={`pill ${order.payment_status === "paid" ? "positive" : ""}`}
                >
                  {order.delivery_status === "cancelled"
                    ? "Cancelled"
                    : order.payment_status === "paid"
                      ? deliveryLabel(order.delivery_status)
                      : paymentLabel(order.payment_status)}
                </span>
                <span>
                  {new Date(order.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="Your shelf is waiting.">
          <p>
            When you find something you love, your purchase will appear here.
          </p>
          <Link to="/products" className="button primary">
            Discover products
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
        {copied ? "Copied" : error ? "Select and copy the text" : label}
      </span>
    </button>
  );
}
function PurchasePage() {
  const { id } = useParams();
  const { session, sessionError } = useMarket();
  const [order, setOrder] = useState<Purchase | null>(null),
    [error, setError] = useState(""),
    [trx, setTrx] = useState(""),
    [busy, setBusy] = useState(false),
    [items, setItems] = useState<{ item: number; content: string }[] | null>(
      null,
    );
  const navigate = useNavigate();
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
  const paymentOpen = [
    "unpaid",
    "pending_verification",
    "review_required",
  ].includes(order.payment_status);
  const expired =
    order.payment && new Date(order.payment.expires_at).getTime() < Date.now();
  return (
    <main id="main" className="container purchase-page narrow-page">
      <Link to="/purchases" className="back-link">
        <ArrowLeft size={16} />
        My purchases
      </Link>
      <div className="purchase-page-heading">
        <span className={`purchase-hero-icon ${paid ? "positive" : ""}`}>
          {paid ? <CheckCircle2 size={32} /> : <LockKeyhole size={30} />}
        </span>
        <p className="eyebrow">{order.ref}</p>
        <h1>
          {!paid && !paymentOpen
            ? "A payment update for your order."
            : cancelled
              ? "This order has ended."
              : paid
                ? order.ready
                  ? "Your good find is ready."
                  : "Your payment is verified."
                : "One more step to make it yours."}
        </h1>
        <p>
          {!paid && !paymentOpen
            ? "Check your payment status below. Your seller can help with any questions."
            : cancelled
              ? "Start a new checkout if you’d still like this product."
              : paid
                ? order.ready
                  ? "Your private items are waiting right here."
                  : order.delivery_estimate ||
                    "The seller is preparing your digital delivery."
                : "Follow the payment instructions below. We’ll update your order when payment is verified."}
        </p>
      </div>
      {error && <ErrorBox message={error} />}
      <div className="panel purchase-panel">
        <div className="purchase-product">
          <div>
            <span className="muted">{order.shop.name}</span>
            <h2>{order.name}</h2>
            <p>
              {order.quantity} {order.quantity === 1 ? "item" : "items"}
            </p>
          </div>
          <strong className="price">{money(order.total)}</strong>
        </div>
        <div className="order-status-grid">
          <div>
            <span>Payment</span>
            <strong>{paymentLabel(order.payment_status)}</strong>
          </div>
          <div>
            <span>Delivery</span>
            <strong>{deliveryLabel(order.delivery_status)}</strong>
          </div>
        </div>
        {paymentOpen && !cancelled && order.payment && !expired && (
          <>
            <div className="payment-instructions">
              <h3>
                Pay with{" "}
                {order.payment.provider === "bkash"
                  ? "bKash"
                  : order.payment.provider}
              </h3>
              <p>
                Send the exact amount to the seller’s receiving account. Then
                enter the transaction ID below.
              </p>
              <div className="payment-account">
                <div>
                  <span>Receiving account</span>
                  <strong>{order.payment.account}</strong>
                </div>
                <CopyButton value={order.payment.account} />
              </div>
              <div className="payment-account">
                <div>
                  <span>Exact amount</span>
                  <strong>{money(order.payment.amount)}</strong>
                </div>
                <CopyButton value={order.payment.amount} />
              </div>
              <p className="muted form-hint">
                Payment request expires at{" "}
                {new Date(order.payment.expires_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </p>
              {session?.demo && (
                <p className="notice">
                  Demo only: use TrxID{" "}
                  <strong>DEMO{order.ref.replace(/\D/g, "")}</strong> to
                  simulate the test receipt. No money is transferred.
                </p>
              )}
            </div>
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
                Transaction ID
                <input
                  required
                  minLength={4}
                  maxLength={64}
                  pattern="[A-Za-z0-9]+"
                  autoComplete="off"
                  spellCheck={false}
                  value={trx}
                  onChange={(e) => setTrx(e.target.value)}
                  placeholder="Enter the TrxID from your payment"
                />
              </label>
              <button className="button primary" disabled={busy}>
                {busy ? "Checking…" : "Check my payment"}
                <ArrowRight size={17} />
              </button>
            </form>
            {order.payment.trx_id && (
              <p className="notice">
                Submitted: {order.payment.trx_id}. We’re matching it with the
                seller’s payment receipt.
              </p>
            )}
          </>
        )}
        {paymentOpen && (expired || cancelled) && (
          <div className="notice">
            <p>This payment request is no longer active.</p>
            <button
              className="button secondary"
              onClick={() => navigate("/products")}
            >
              Explore products
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        {paid && order.ready && (
          <div className="private-delivery">
            <div>
              <LockKeyhole size={24} />
              <h3>Your private delivery</h3>
              <p>
                Keep these details safe. Only you should have access to them.
              </p>
            </div>
            {items ? (
              <div className="private-items">
                {items.map((item) => (
                  <div key={item.item} className="private-item">
                    <div>
                      <strong>Item {item.item}</strong>
                      <CopyButton value={item.content} />
                    </div>
                    <pre data-private="true">{item.content}</pre>
                  </div>
                ))}
                <button className="button ghost" onClick={() => setItems(null)}>
                  Hide private items
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
                {busy ? "Opening…" : "View my items"}
                <LockKeyhole size={16} />
              </button>
            )}
          </div>
        )}
        {paid && !order.ready && (
          <div className="notice">
            <Package size={22} />
            <p>
              Your seller is preparing the delivery. This page updates
              automatically.
            </p>
          </div>
        )}
      </div>
      {(order.can_review || order.review) && <PurchaseReview key={order.id} order={order} />}
      <div className="purchase-support">
        <span>Need a hand with this purchase?</span>
        {order.shop.support ? (
          <a className="text-link" href={supportHref(order.shop.support)}>
            Contact {order.shop.name}
            <ArrowUpRight size={16} />
          </a>
        ) : (
          <Link className="text-link" to={`/shops/${order.shop.slug}`}>
            Visit seller’s shop
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </main>
  );
}
function Seller() {
  const [connection] = useSearchParams();
  const { session, sessionError, refreshSession, reloadCatalog } = useMarket();
  const [shops, setShops] = useState<Shop[] | null>(null),
    [selected, setSelected] = useState("");
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
      const result = await api<{ shop: Shop }>(
        `/seller/stores/${selected}/listing`,
        {
          method: "PUT",
          body: JSON.stringify({ ...form, published, product_ids: ids }),
        },
      );
      setData((previous) =>
        previous ? { ...previous, shop: result.shop } : previous,
      );
      setMessage(
        published
          ? "Your shop is live. Your products, prices, and availability come directly from AriseSell."
          : "Your shop is now unpublished. Your products and orders remain in AriseSell.",
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
        <p className="eyebrow">A NEW HOME FOR YOUR DIGITAL SHOP</p>
        <h1>
          Your products.
          <br />A whole new audience.
        </h1>
        <p>
          One AriseSell account. One connected shop. A little more possibility.
        </p>
      </div>
      <ol className="onboarding-steps">
        <li className={session?.user ? "complete" : "active"}>
          <span>{session?.user ? <Check size={16} /> : "1"}</span>Connect
          AriseSell
        </li>
        <li className={session?.user ? "active" : ""}>
          <span>2</span>Make it yours
        </li>
        <li className={data?.shop.published ? "complete" : ""}>
          <span>{data?.shop.published ? <Check size={16} /> : "3"}</span>Choose
          & publish
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
            <ArrowUpRight size={15} />
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
                A familiar account.
                <br />A fresh storefront.
              </h2>
              <p>
                Connect your AriseSell account to bring your shop here. Your
                product catalog, payments, and digital stock stay where you
                already manage them.
              </p>
              <a className="button primary" href="/api/auth/start">
                <img src="/favicon.svg" alt="" width="20" height="20" />
                Continue with AriseSell
                <ArrowUpRight size={17} />
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
              <h2>Let’s start with a digital shop.</h2>
              <p>
                Your account is connected. Create a digital store in AriseSell,
                then return here to publish it.
              </p>
              <a
                className="button primary"
                href={`${session.source_web}/onboarding`}
              >
                Create a digital shop
                <ArrowUpRight size={17} />
              </a>
              <button
                className="button secondary"
                onClick={() => window.location.reload()}
              >
                I’ve created my shop
                <RefreshCw size={16} />
              </button>
            </section>
          ) : (
            <>
              {shops.length > 1 && (
                <label className="field shop-picker">
                  Choose your AriseSell store
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
                        <ArrowUpRight size={15} />
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
                    <div className="seller-panel-heading">
                      <div>
                        <span className="eyebrow">YOUR OWN SHOP PAGE</span>
                        <h2 id="store-link-title">Share your store</h2>
                      </div>
                      <Store size={24} />
                    </div>
                    <p>
                      Put this link in your Facebook or Instagram bio, page
                      button, or customer chat. Customers go directly to your
                      shop and can buy as guests.
                    </p>
                    <label className="field">
                      Your store link
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
                          label="Copy store link"
                        />
                        <Link
                          className="text-link"
                          to={`/shops/${data.shop.slug}`}
                        >
                          Open storefront
                          <ArrowUpRight size={16} />
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
                          <span className="eyebrow">MAKE IT YOURS</span>
                          <h2>Your shop profile</h2>
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
                          placeholder="What do you make, curate, or help people do?"
                        />
                        <small>{form.description.length}/1,500</small>
                      </label>
                      <label className="field">
                        Support email or website
                        <input
                          required
                          maxLength={255}
                          value={form.support}
                          onChange={(e) =>
                            setForm({ ...form, support: e.target.value })
                          }
                          placeholder="hello@yourshop.com or https://…"
                        />
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
                    <section className="panel seller-panel">
                      <div className="seller-panel-heading">
                        <div>
                          <span className="eyebrow">
                            CHOOSE YOUR GOOD FINDS
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
                                    ? `${money(minimumPrice(product))} · ${stock(product)} available`
                                    : "Paused in AriseSell"}
                                </small>
                              </span>
                              <span className="delivery-tag">
                                {product.delivery_mode === "automatic"
                                  ? "Automatic"
                                  : "Manual"}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <Empty title="Your catalog is waiting.">
                          <p>
                            Add a digital product in AriseSell, then refresh
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
                            !data.payment_methods.length ||
                            !data.active
                          }
                        >
                          {busy
                            ? "Saving…"
                            : data.shop.published
                              ? "Save shop changes"
                              : "Publish my shop"}
                          <ArrowUpRight size={17} />
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
            <h3>One place to manage it all.</h3>
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
                Automatic or manual delivery
              </li>
            </ul>
          </section>
          {session?.user && data && (
            <section className="panel setup-checklist">
              <h3>Your launch checklist</h3>
              {[
                [true, "AriseSell connected"],
                [
                  form.name.trim().length >= 2 &&
                    form.description.trim().length >= 10,
                  "Shop profile ready",
                ],
                [ids.length > 0, "Products selected"],
                [data.payment_methods.length > 0, "Payment account connected"],
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
                  Connect a payment account
                  <ArrowUpRight size={14} />
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
        <p className="eyebrow">SIMPLE BY DESIGN</p>
        <h1>
          A good find.
          <br />A few easy steps.
        </h1>
        <p>
          Independent shops, digital products, and a straightforward way to make
          them yours.
        </p>
      </div>
      <div className="how-grid">
        {[
          [
            Search,
            "Find your thing",
            "Explore products and independent shops. Check the description, options, delivery details, and seller’s terms.",
          ],
          [
            LockKeyhole,
            "Make it yours",
            "Choose a product, confirm its current price and terms, and follow the seller’s payment instructions.",
          ],
          [
            Download,
            "Enjoy your good find",
            "After payment verification, automatic items become available in My purchases. Manual items are prepared by the seller.",
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
        <h2>A few things worth knowing.</h2>
        {[
          [
            "Who am I buying from?",
            "You buy directly from the shop shown on the product page. Arise Digital Store helps you discover it; the seller’s AriseSell account manages the order, payment and delivery.",
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
            "Yes. Connect and publish your shop, then use Copy store link in your seller dashboard. Share it on your Facebook or Instagram page, or send it to customers. It opens your shop directly, with your products, search and checkout. Customers can buy as guests.",
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
          Discover your next good find
          <ArrowRight size={18} />
        </Link>
      </div>
    </main>
  );
}
type AdminData = {
  catalog: Catalog;
  reports: {
    id: string;
    product_id: string;
    reason: string;
    resolved: boolean;
    created_at: number;
  }[];
  moderation: {
    kind: string;
    target_id: string;
    hidden: boolean;
    reason: string;
  }[];
};
function Admin() {
  const { session, reloadCatalog } = useMarket();
  const [data, setData] = useState<AdminData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [target, setTarget] = useState<{
      kind: string;
      id: string;
      name: string;
      hidden: boolean;
    } | null>(null);
  const load = () =>
    api<AdminData>("/admin")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (session?.user) void load();
  }, [session?.user?.id]);
  if (!session) return <Loading />;
  if (!session.user?.admin)
    return (
      <main id="main" className="container section">
        <Empty title="Administrator access required.">
          <p>Continue with an authorized AriseSell administrator account.</p>
          <a className="button primary" href="/api/auth/start">
            Continue with AriseSell
          </a>
        </Empty>
      </main>
    );
  return (
    <main id="main" className="container listing-page">
      <div className="page-intro">
        <p className="eyebrow">MARKETPLACE ADMINISTRATION</p>
        <h1>Keep the good finds good.</h1>
        <p>Review published shops, product listings, and customer reports.</p>
      </div>
      {error && <ErrorBox message={error} retry={() => void load()} />}
      <div role="status">{busy && <p>Saving moderation changes…</p>}</div>
      {data ? (
        <>
          <section className="panel admin-panel">
            <h2>Published shops</h2>
            {data.catalog.shops.map((shop) => {
              const hidden = data.moderation.some(
                (m) => m.kind === "shop" && m.target_id === shop.id && m.hidden,
              );
              return (
                <div className="admin-row" key={shop.id}>
                  <div>
                    <strong>{shop.name}</strong>
                    <p>{shop.description}</p>
                  </div>
                  <span className="pill">{hidden ? "Hidden" : "Visible"}</span>
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setReason("");
                      setTarget({
                        kind: "shop",
                        id: shop.id,
                        name: shop.name,
                        hidden: !hidden,
                      });
                    }}
                  >
                    {hidden ? "Restore" : "Hide shop"}
                  </button>
                </div>
              );
            })}
          </section>
          <section className="panel admin-panel">
            <h2>Product listings</h2>
            {data.catalog.products.map((product) => {
              const hidden = data.moderation.some(
                (m) =>
                  m.kind === "product" &&
                  m.target_id === product.id &&
                  m.hidden,
              );
              return (
                <div className="admin-row" key={product.id}>
                  <strong>{product.name}</strong>
                  <span className="pill">{hidden ? "Hidden" : "Visible"}</span>
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setReason("");
                      setTarget({
                        kind: "product",
                        id: product.id,
                        name: product.name,
                        hidden: !hidden,
                      });
                    }}
                  >
                    {hidden ? "Restore" : "Hide listing"}
                  </button>
                </div>
              );
            })}
          </section>
          <section className="panel admin-panel">
            <h2>Customer reports</h2>
            {!data.reports.length ? (
              <p>No reports have been submitted.</p>
            ) : (
              data.reports.map((report) => (
                <div className="admin-row" key={report.id}>
                  <div>
                    <strong>
                      {data.catalog.products.find(
                        (p) => p.id === report.product_id,
                      )?.name || report.product_id}
                    </strong>
                    <p>{report.reason}</p>
                  </div>
                  <button
                    className="button secondary small"
                    disabled={report.resolved || busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api(`/admin/reports/${report.id}/resolve`, {
                          method: "POST",
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {report.resolved ? "Resolved" : "Mark reviewed"}
                  </button>
                </div>
              ))
            )}
          </section>
        </>
      ) : (
        <Loading />
      )}
      {target && (
        <section className="panel moderation-form">
          <h2>
            {target.hidden ? "Hide" : "Restore"} {target.name}
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("/admin/moderation", {
                  method: "PUT",
                  body: JSON.stringify({
                    kind: target.kind,
                    target_id: target.id,
                    hidden: target.hidden,
                    reason,
                  }),
                });
                setTarget(null);
                await Promise.all([load(), reloadCatalog()]);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Reason for this action
              <textarea
                minLength={5}
                maxLength={1000}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <div className="button-row">
              <button className="button primary" disabled={busy}>
                Confirm change
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => setTarget(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
function NotFound() {
  return (
    <main id="main" className="container section">
      <Empty title="This find isn’t here anymore.">
        <p>
          The link may have changed, or the seller may have unpublished the
          product.
        </p>
        <Link className="button primary" to="/products">
          Explore products
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
      <Header />
      {sessionError && (
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
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/shops/:slug/products/:productSlug" element={<ProductPage />} />
        <Route path="/shops" element={<Shops />} />
        <Route path="/shops/:slug" element={<ShopPage />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/purchases/:id" element={<PurchasePage />} />
        <Route path="/seller" element={<Seller />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </Context.Provider>
  );
}
