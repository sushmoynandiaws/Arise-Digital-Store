import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { api, deliveryLabel, money, paymentLabel, stock, shopType, productFulfilment } from "./api";
import { shopPageSections } from "./shopPages";
import type { Catalog, Shop, SponsoredAd, User } from "./types";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  ExternalLink,
  Flag,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  X,
} from "./icons";
import "./admin.css";

type Report = {
  id: string;
  product_id: string;
  reason: string;
  created_at: number;
  resolved: boolean;
};
type Base = {
  catalog: Catalog;
  reports: Report[];
  moderation: {
    kind: string;
    target_id: string;
    hidden: boolean;
    reason: string;
  }[];
  role: string;
  permissions: string[];
  checked_at: number;
};
type Document<T> = { revision: number; content: T; updated_at?: number };
type Settings = {
  announcement?: string;
  announcement_url?: string;
  hero_title?: string;
  hero_description?: string;
  support_email?: string;
  pages?: Shop["pages"];
};
type Order = {
  fulfilment_kind?: "physical" | "digital";
  id: string;
  ref: string;
  shop_name: string;
  name: string;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  total: string | null;
  currency: string;
  payment_status: string;
  delivery_status: string;
  created_at: string;
};
type Orders = {
  orders: Order[];
  has_more: boolean;
  summary: {
    total: number;
    paid: number;
    payment_issues: number;
    delivery_issues: number;
  };
  checked_at: string;
};
type Note = {
  id: string;
  target_type: "report" | "order";
  target_id: string;
  actor: string;
  content: string;
  created_at: number;
};
type Review = {
  id: string;
  product_id: string;
  display_name: string;
  rating: number;
  comment: string;
  hidden: boolean;
  reason: string;
  created_at: number;
};
type Action = {
  id: string;
  kind: "shop" | "product" | "review";
  name: string;
  hidden: boolean;
};

function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [revision, bump] = useState(0);
  const previousPath = useRef<string | null>(null);
  useEffect(() => {
    let current = true;
    if (previousPath.current !== path) setData(null);
    previousPath.current = path;
    setError("");
    if (path)
      void api<T>(path)
        .then((value) => {
          if (current) setData(value);
        })
        .catch((e: Error) => {
          if (current) {
            setData(null);
            setError(e.message);
          }
        });
    return () => {
      current = false;
    };
  }, [path, revision]);
  return { data, error, reload: () => bump((value) => value + 1) };
}
function State({
  error,
  retry,
  children,
}: {
  error?: string;
  retry?: () => void;
  children?: ReactNode;
}) {
  if (error)
    return (
      <div className="admin-state admin-error" role="alert">
        <Flag size={24} />
        <h2>Could not load this view</h2>
        <p>{error}</p>
        {retry && (
          <button className="button secondary" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  return (
    <div className="admin-state" role="status">
      {children || (
        <>
          <RefreshCw size={24} />
          <p>Loading workspace…</p>
        </>
      )}
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <div className="admin-empty">{children}</div>;
}
function Stamp({ value }: { value: string | number }) {
  return (
    <time
      dateTime={new Date(
        typeof value === "number" ? value * 1000 : value,
      ).toISOString()}
    >
      {new Date(
        typeof value === "number" ? value * 1000 : value,
      ).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Dhaka",
      })}
    </time>
  );
}
function Pager({
  offset,
  more,
  change,
}: {
  offset: number;
  more: boolean;
  change: (value: number) => void;
}) {
  return (
    <div className="admin-pagination">
      <button
        className="button secondary"
        disabled={!offset}
        onClick={() => change(Math.max(0, offset - 50))}
      >
        <ArrowLeft size={16} />
        Previous
      </button>
      <span>Page {offset / 50 + 1}</span>
      <button
        className="button secondary"
        disabled={!more}
        onClick={() => change(offset + 50)}
      >
        Next
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
function Stats({ values }: { values: [string, number][] }) {
  return (
    <div className="admin-stats">
      {values.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

const sections = [
  ["", "Overview", "catalog", LayoutGrid, "Review what needs attention and keep your marketplace running."],
  ["shops", "Shops", "catalog", Store, "Review storefront visibility and seller information."],
  ["products", "Products", "catalog", Package, "Review source listings and manage marketplace visibility."],
  ["orders", "Orders", "orders", Package, "Find orders and inspect their payment and delivery evidence."],
  ["payments", "Payment issues", "orders", Clock, "Review payments that need attention and open the related order."],
  ["support", "Support & reports", "reports", Flag, "Review customer reports and record the resolution."],
  ["reviews", "Reviews", "reviews", ShieldCheck, "Moderate customer reviews with a recorded reason."],
  ["campaigns", "Campaigns", "campaigns", Plus, "Schedule and manage sponsored placements across the marketplace."],
  ["content", "Website content", "content", LayoutGrid, "Edit announcements, homepage text and marketplace information pages."],
  ["activity", "Activity log", "activity", Clock, "Review the recorded history of administrator actions."],
  ["access", "Team access", "access", LockKeyhole, "Review marketplace roles for existing AriseSell administrators."],
  ["health", "System health", "health", RefreshCw, "Check the availability of connected marketplace services."],
] as const;

export default function Admin({
  user,
  sourceWeb,
  reloadCatalog,
  onSignOut,
}: {
  user: User;
  sourceWeb: string;
  reloadCatalog: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const base = useResource<Base>("/admin"),
    [menu, setMenu] = useState(false),
    [signingOut, setSigningOut] = useState(false),
    [signOutError, setSignOutError] = useState("");
  const [target, setTarget] = useState<Action | null>(null);
  const path = useLocation().pathname.replace(/^\/admin\/?/, "");
  const current = sections.find((section) => section[0] === path);
  useEffect(() => {
    setMenu(false);
  }, [path]);
  useEffect(() => {
    const reload = () => base.reload();
    const timer = window.setInterval(reload, 60000);
    window.addEventListener("focus", reload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, []);
  if (!base.data)
    return (
      <main id="main" className="admin-boot">
        <Link className="text-link" to="/">
          ← Marketplace
        </Link>
        <State error={base.error} retry={base.reload} />
      </main>
    );
  const data = base.data,
    allowed = (permission: string) => data.permissions.includes(permission);
  const refresh = () => {
    base.reload();
    void reloadCatalog();
  };
  const item = current && allowed(current[2]) ? current : null;
  return (
    <div className="admin-workspace">
      <button
        className="admin-mobile-toggle button secondary"
        aria-expanded={menu}
        aria-controls="admin-nav"
        onClick={() => setMenu(!menu)}
      >
        {menu ? <X size={20} /> : <Menu size={20} />}Admin menu
      </button>
      <aside className={`admin-sidebar ${menu ? "is-open" : ""}`}>
        <Link to="/admin" className="admin-brand">
          <span>
            <ShieldCheck size={24} />
          </span>
          <div>
            arise<strong>Marketplace admin</strong>
          </div>
        </Link>
        <div className="admin-sidebar-label">Workspace</div>
        <nav id="admin-nav" aria-label="Administration">
          {sections
            .filter((section) => allowed(section[2]))
            .map(([route, label, , Icon]) => (
              <NavLink key={route} to={`/admin${route ? `/${route}` : ""}`} end>
                <Icon size={18} />
                <span>{label}</span>
                {route === "support" &&
                  data.reports.some((r) => !r.resolved) && (
                    <b>{data.reports.filter((r) => !r.resolved).length}</b>
                  )}
              </NavLink>
            ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/">
            <ArrowLeft size={16} />
            View marketplace
          </Link>
          <a href={sourceWeb} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} />
            Open AriseSell
          </a>
          <div className="admin-identity">
            <span>{user.name.slice(0, 1)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{data.role}</small>
            </div>
          </div>
          <button
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              setSignOutError("");
              try {
                await onSignOut();
              } catch (e) {
                setSignOutError((e as Error).message);
                setSigningOut(false);
              }
            }}
          >
            <LogOut size={16} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          {signOutError && <p role="alert">{signOutError}</p>}
        </div>
      </aside>
      <main id="main" className="admin-main">
        <header className="admin-topline">
          <span>
            <i />
            Administrator workspace
          </span>
          <span>
            Checked <Stamp value={data.checked_at} />
          </span>
        </header>
        <div className="admin-page-title">
          <div>
            <p className="eyebrow">Marketplace operations</p>
            <h1>{item?.[1] || "Page unavailable"}</h1>
            <p>
              {item?.[4] || "Choose an available workspace from the navigation."}
            </p>
          </div>
          <button className="button secondary" onClick={base.reload}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
        {!item ? (
          <State>
            <LockKeyhole size={28} />
            <h2>This view is unavailable for your role</h2>
            <Link className="button secondary" to="/admin">
              Go to overview
            </Link>
          </State>
        ) : path === "" ? (
          <Overview data={data} />
        ) : path === "shops" || path === "products" ? (
          <CatalogView
            data={data}
            kind={path === "shops" ? "shop" : "product"}
            canModerate={allowed("moderate")}
            onModerate={setTarget}
          />
        ) : path === "orders" || path === "payments" ? (
          <OrderView issuesOnly={path === "payments"} sourceWeb={sourceWeb} />
        ) : path === "support" ? (
          <Reports data={data} refresh={refresh} />
        ) : path === "reviews" ? (
          <Reviews data={data} onModerate={setTarget} />
        ) : path === "campaigns" ? (
          <Campaigns />
        ) : path === "content" ? (
          <Content />
        ) : path === "activity" ? (
          <Activity />
        ) : path === "access" ? (
          <Access user={user} />
        ) : (
          <Health />
        )}
        <footer className="admin-footnote">
          <ShieldCheck size={14} />
          Administrator actions are checked on the server. Payment and delivery
          remain managed by AriseSell.
        </footer>
      </main>
      {target && (
        <ModerationDialog
          target={target}
          close={() => setTarget(null)}
          saved={refresh}
        />
      )}
    </div>
  );
}

function Overview({ data }: { data: Base }) {
  const open = data.reports.filter((r) => !r.resolved),
    hidden = data.moderation.filter((m) => m.hidden);
  const out = data.catalog.products.filter((p) => stock(p) === 0);
  return (
    <>
      <Stats
        values={[
          ["Published shops", data.catalog.shops.length],
          ["Source listings", data.catalog.products.length],
          ["Unresolved reports", open.length],
          ["Hidden shops / listings", hidden.length],
        ]}
      />
      <section className="admin-panel admin-attention">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-kicker">Attention queue</span>
            <h2>Start with the exceptions</h2>
          </div>
          <span className="admin-count">{open.length + out.length}</span>
        </div>
        {open.length > 0 && (
          <Link to="/admin/support" className="admin-attention-row">
            <span className="admin-attention-icon">
              <Flag size={20} />
            </span>
            <div>
              <strong>
                {open.length} customer{" "}
                {open.length === 1 ? "report needs" : "reports need"} a response
              </strong>
              <p>Review the listing and record how the issue was resolved.</p>
            </div>
            <ArrowRight size={20} />
          </Link>
        )}
        {out.length > 0 && (
          <Link to="/admin/products" className="admin-attention-row">
            <span className="admin-attention-icon neutral">
              <Package size={20} />
            </span>
            <div>
              <strong>
                {out.length} {out.length === 1 ? "listing is" : "listings are"}{" "}
                out of stock
              </strong>
              <p>
                Stock is supplied by AriseSell and can be reviewed in the
                catalog.
              </p>
            </div>
            <ArrowRight size={20} />
          </Link>
        )}
        {open.length === 0 && out.length === 0 && (
          <Empty>
            <Check size={22} />
            <h3>No catalog or report issues waiting</h3>
            <p>Check payment issues for orders requiring follow-up.</p>
          </Empty>
        )}
      </section>
      <div className="admin-two-col">
        <section className="admin-panel">
          <h2>Marketplace health</h2>
          <dl className="admin-details">
            <div>
              <dt>Catalog</dt>
              <dd>Loaded from AriseSell</dd>
            </div>
            <div>
              <dt>Shop visibility</dt>
              <dd>
                {
                  data.catalog.shops.filter(
                    (s) =>
                      !hidden.some(
                        (h) => h.kind === "shop" && h.target_id === s.id,
                      ),
                  ).length
                }{" "}
                visible in this feed
              </dd>
            </div>
            <div>
              <dt>Your permissions</dt>
              <dd>{data.role}</dd>
            </div>
          </dl>
          {data.permissions.includes("health") && (
            <Link className="text-link" to="/admin/health">
              View connection details →
            </Link>
          )}
        </section>
        <section className="admin-panel">
          <h2>Keep commerce in sync</h2>
          <p>
            Order totals, payment verification, inventory and delivery
            come from AriseSell.
          </p>
          {data.permissions.includes("orders") && (
            <Link className="button primary" to="/admin/orders">
              Review orders
              <ArrowRight size={16} />
            </Link>
          )}
        </section>
      </div>
    </>
  );
}

function CatalogView({
  data,
  kind,
  canModerate,
  onModerate,
}: {
  data: Base;
  kind: "shop" | "product";
  canModerate: boolean;
  onModerate: (action: Action) => void;
}) {
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("all");
  const source = kind === "shop" ? data.catalog.shops : data.catalog.products;
  const rows = source.filter((row) => {
    const hidden = data.moderation.some(
      (m) => m.kind === kind && m.target_id === row.id && m.hidden,
    );
    return (
      (filter === "all" || (filter === "hidden") === hidden) &&
      `${row.name} ${row.id}`.toLowerCase().includes(q.toLowerCase())
    );
  });
  return (
    <section className="admin-panel">
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={18} />
          <span className="sr-only">
            Search {kind === "shop" ? "shops" : "products"}
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${kind === "shop" ? "shops" : "products"} by name or ID`}
          />
        </label>
        <label>
          Visibility
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      </div>
      <p className="admin-result-count">
        {rows.length} results · Publication and stock settings remain owned by
        the seller.
      </p>
      {!rows.length ? (
        <Empty>
          No matching {kind === "shop" ? "shops" : "products"}. Try another
          search or visibility filter.
        </Empty>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{kind === "shop" ? "Shop" : "Product"}</th>
                <th>{kind === "shop" ? "Contact" : "Shop / stock"}</th>
                <th>Visibility</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const moderation = data.moderation.find(
                    (m) => m.kind === kind && m.target_id === row.id,
                  ),
                  hidden = !!moderation?.hidden;
                const product = "variants" in row ? row : null;
                const shop =
                  "slug" in row
                    ? row
                    : data.catalog.shops.find((s) => s.id === row.shop_id);
                return (
                  <tr key={row.id} className="admin-row">
                    <td>
                      <strong>{row.name}</strong>
                      <small>{product ? productFulfilment(product) : shop ? shopType(shop) : "Shop"}</small>
                      <small>{row.id}</small>
                      {moderation?.reason && (
                        <small>Reason: {moderation.reason}</small>
                      )}
                    </td>
                    <td>
                      {product ? (
                        <>
                          {shop?.name}
                          <small>{stock(product)} units available</small>
                        </>
                      ) : (
                        shop?.support || "No support contact"
                      )}
                    </td>
                    <td>
                      <span
                        className={`admin-status ${hidden ? "warning" : "positive"}`}
                      >
                        {hidden ? "Hidden" : "Visible"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        {shop && (
                          <Link
                            className="button ghost small"
                            to={`/shops/${shop.slug}`}
                          >
                            View shop
                            <ExternalLink size={14} />
                          </Link>
                        )}
                        {canModerate && (
                          <button
                            className="button secondary small"
                            onClick={() =>
                              onModerate({
                                id: row.id,
                                kind,
                                name: row.name,
                                hidden: !hidden,
                              })
                            }
                          >
                            {hidden
                              ? "Restore"
                              : kind === "shop"
                                ? "Hide shop"
                                : "Hide listing"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ModerationDialog({
  target,
  close,
  saved,
}: {
  target: Action;
  close: () => void;
  saved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const label = target.hidden
    ? target.kind === "shop"
      ? "Hide shop"
      : target.kind === "review"
        ? "Hide review"
        : "Hide listing"
    : "Restore";
  const dismiss = () => ref.current?.close();
  useEffect(() => {
    ref.current?.showModal();
    ref.current?.querySelector("textarea")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-dialog"
      aria-labelledby="admin-dialog-title"
      onClose={close}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(
              target.kind === "review"
                ? `/admin/reviews/${target.id}/visibility`
                : "/admin/moderation",
              {
                method: "PUT",
                body: JSON.stringify(
                  target.kind === "review"
                    ? { hidden: target.hidden, reason }
                    : {
                        kind: target.kind,
                        target_id: target.id,
                        hidden: target.hidden,
                        reason,
                      },
                ),
              },
            );
            saved();
            dismiss();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <div className="admin-dialog-header">
          <h2 id="admin-dialog-title">{label}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close moderation"
            disabled={busy}
            onClick={dismiss}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          <strong>{target.name}</strong>
        </p>
        <p>
          {target.hidden
            ? "This hides the item from the marketplace. Existing orders and inventory are not deleted."
            : "This removes the marketplace restriction. Source publication and availability settings still apply."}
        </p>
        <label className="field">
          Reason for this action
          <textarea
            required
            minLength={5}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </label>
        {error && (
          <p className="admin-inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={dismiss}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : label}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function OrderView({
  issuesOnly,
  sourceWeb,
}: {
  issuesOnly: boolean;
  sourceWeb: string;
}) {
  const [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [offset, setOffset] = useState(0),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<Order | null>(null);
  const resource = useResource<Orders>(
    `/admin/orders?offset=${offset}&q=${encodeURIComponent(search)}`,
  );
  const data = resource.data;
  const rows = data?.orders.filter(
    (o) =>
      (!issuesOnly ||
        ["pending_verification", "review_required"].includes(
          o.payment_status,
        ) ||
        o.delivery_status === "needs_attention") &&
      (status === "all" || status === o.payment_status),
  );
  return (
    <>
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setOffset(0);
          setSearch(q);
          resource.reload();
        }}
      >
        <label className="admin-search">
          <Search size={18} />
          <span className="sr-only">Search orders</span>
          <input
            value={q}
            maxLength={100}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Order reference or customer name"
          />
        </label>
        <button className="button primary">Search orders</button>
        <label>
          Payment status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {[
              "unpaid",
              "pending_verification",
              "review_required",
              "paid",
              "refunded",
              "partially_refunded",
            ].map((value) => (
              <option key={value} value={value}>
                {paymentLabel(value)}
              </option>
            ))}
          </select>
        </label>
      </form>
      {!data ? (
        <State error={resource.error} retry={resource.reload} />
      ) : (
        <>
          <Stats
            values={[
              ["Matching orders", data.summary.total],
              ["Verified paid", data.summary.paid],
              ["Payment follow-up", data.summary.payment_issues],
              ["Delivery attention", data.summary.delivery_issues],
            ]}
          />
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>
                  {issuesOnly ? "Orders needing follow-up" : "Order monitoring"}
                </h2>
                <p>
                  AriseSell source · checked <Stamp value={data.checked_at} />
                </p>
              </div>
              <button className="button secondary" onClick={resource.reload}>
                <RefreshCw size={16} />
                Refresh orders
              </button>
            </div>
            {!rows?.length ? (
              <Empty>No matching orders on this page.</Empty>
            ) : (
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer / shop</th>
                      <th>Total</th>
                      <th>Payment / delivery</th>
                      <th>Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.ref}</strong>
                          <small>{o.name}</small>
                          {o.fulfilment_kind && <small>{o.fulfilment_kind === "physical" ? "Physical delivery" : "Digital delivery"}</small>}
                          <small>
                            <Stamp value={o.created_at} />
                          </small>
                        </td>
                        <td>
                          {o.buyer_name}
                          <small>{o.buyer_email}</small>
                          <small>{o.shop_name}</small>
                        </td>
                        <td>
                          {o.total === null ? "Unavailable" : money(o.total)}
                        </td>
                        <td>
                          <span
                            className={`admin-status ${o.payment_status === "paid" ? "positive" : "warning"}`}
                          >
                            {paymentLabel(o.payment_status)}
                          </span>
                          <small>{deliveryLabel(o.delivery_status)}</small>
                        </td>
                        <td>
                          <button
                            className="button secondary small"
                            onClick={() => setSelected(o)}
                          >
                            Add support note
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager offset={offset} more={data.has_more} change={setOffset} />
            <p className="admin-caption">
              Filters apply to the current page; the search and summary cover
              all matching source orders. Payment status is never changed here.
            </p>
          </section>
        </>
      )}
      {selected && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Follow-up · {selected.ref}</h2>
            <button
              className="icon-button"
              aria-label="Close order notes"
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </button>
          </div>
          <Notes key={selected.id} targetType="order" targetId={selected.id} />
          <a
            className="text-link"
            href={sourceWeb}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open AriseSell for payment or delivery actions
            <ExternalLink size={14} />
          </a>
        </section>
      )}
    </>
  );
}

function Reports({ data, refresh }: { data: Base; refresh: () => void }) {
  const [filter, setFilter] = useState("open"),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState<Report | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const rows = data.reports.filter(
    (r) =>
      (filter === "all" || r.resolved === (filter === "resolved")) &&
      `${r.reason} ${r.product_id}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <section className="admin-panel">
        <div className="admin-toolbar">
          <label className="admin-search">
            <Search size={18} />
            <span className="sr-only">Search reports</span>
            <input
              placeholder="Search report or product ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label>
            Status
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="open">Unresolved</option>
              <option value="resolved">Resolved</option>
              <option value="all">All reports</option>
            </select>
          </label>
        </div>
        {error && (
          <p className="admin-inline-error" role="alert">
            {error}
          </p>
        )}
        {!rows.length ? (
          <Empty>No reports in this view.</Empty>
        ) : (
          rows.map((report) => (
            <article className="admin-report admin-row" key={report.id}>
              <div>
                <span
                  className={`admin-status ${report.resolved ? "positive" : "warning"}`}
                >
                  {report.resolved ? "Resolved" : "Needs review"}
                </span>
                <h3>
                  {data.catalog.products.find((p) => p.id === report.product_id)
                    ?.name || report.product_id}
                </h3>
                <p>{report.reason}</p>
                <small>
                  <Stamp value={report.created_at} />
                </small>
              </div>
              <div className="admin-row-actions">
                <button
                  className="button secondary small"
                  onClick={() => setSelected(report)}
                >
                  Internal notes
                </button>
                <button
                  className="button primary small"
                  disabled={report.resolved || !!busy}
                  onClick={async () => {
                    setBusy(report.id);
                    setError("");
                    try {
                      await api(`/admin/reports/${report.id}/resolve`, {
                        method: "POST",
                      });
                      refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {busy === report.id
                    ? "Resolving…"
                    : report.resolved
                      ? "Resolved"
                      : "Resolve report"}
                </button>
              </div>
            </article>
          ))
        )}
        <p className="admin-caption">
          Latest 200 reports. Notes are internal and are not sent to customers.
        </p>
      </section>
      {selected && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Report notes</h2>
            <button
              className="icon-button"
              aria-label="Close report notes"
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </button>
          </div>
          <p>{selected.reason}</p>
          <Notes key={selected.id} targetType="report" targetId={selected.id} />
        </section>
      )}
    </>
  );
}

function Notes({
  targetType,
  targetId,
}: {
  targetType: "report" | "order";
  targetId: string;
}) {
  const resource = useResource<{ notes: Note[] }>(
      `/admin/notes?target_type=${targetType}&target_id=${targetId}`,
    ),
    [content, setContent] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const notes = resource.data?.notes.filter(
    (n) => n.target_type === targetType && n.target_id === targetId,
  );
  return (
    <div className="admin-notes">
      {resource.error && <p role="alert">{resource.error}</p>}
      {notes?.map((n) => (
        <article key={n.id}>
          <p className="preserve-lines">{n.content}</p>
          <small>
            {n.actor} · <Stamp value={n.created_at} />
          </small>
        </article>
      ))}
      {notes?.length === 0 && <p>No internal notes yet.</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/admin/notes", {
              method: "POST",
              body: JSON.stringify({
                target_type: targetType,
                target_id: targetId,
                content,
              }),
            });
            setContent("");
            resource.reload();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Internal support note
          <textarea
            rows={3}
            required
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Record the issue and next step. Do not include passwords or delivery credentials."
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save note"}
        </button>
      </form>
    </div>
  );
}

function Reviews({
  data,
  onModerate,
}: {
  data: Base;
  onModerate: (action: Action) => void;
}) {
  const [offset, setOffset] = useState(0),
    [filter, setFilter] = useState("all");
  const resource = useResource<{ reviews: Review[]; has_more: boolean }>(
    `/admin/reviews?offset=${offset}`,
  );
  useEffect(() => {
    resource.reload();
  }, [data]);
  if (!resource.data)
    return <State error={resource.error} retry={resource.reload} />;
  const rows = resource.data.reviews.filter(
    (r) => filter === "all" || r.hidden === (filter === "hidden"),
  );
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Verified purchase reviews</h2>
          <p>
            Moderation changes visibility. Customer ratings and comments cannot
            be rewritten.
          </p>
        </div>
        <label>
          Visibility
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      </div>
      {!rows.length ? (
        <Empty>No reviews in this view.</Empty>
      ) : (
        rows.map((r) => (
          <article key={r.id} className="admin-report">
            <div>
              <span className="admin-status">
                {r.rating} / 5 · {r.hidden ? "Hidden" : "Public"}
              </span>
              <h3>{r.display_name}</h3>
              <small>
                {data.catalog.products.find((p) => p.id === r.product_id)
                  ?.name || r.product_id}
              </small>
              <p className="preserve-lines">{r.comment}</p>
              <small>
                <Stamp value={r.created_at} />
                {r.reason && ` · ${r.reason}`}
              </small>
            </div>
            <button
              className="button secondary small"
              onClick={() =>
                onModerate({
                  id: r.id,
                  kind: "review",
                  name: `Review by ${r.display_name}`,
                  hidden: !r.hidden,
                })
              }
            >
              {r.hidden ? "Restore" : "Hide review"}
            </button>
          </article>
        ))
      )}
      <Pager offset={offset} more={resource.data.has_more} change={setOffset} />
    </section>
  );
}

const placements = {
  home_hero: "Home hero",
  top_flash: "Top announcement",
  sponsored_product: "Sponsored product",
  featured_shop: "Featured shop",
  sticky_bottom: "Bottom strip",
};
function Campaigns() {
  const resource = useResource<Document<SponsoredAd[]>>(
      "/admin/documents/campaigns",
    ),
    [editing, setEditing] = useState<SponsoredAd | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function save(ads: SponsoredAd[]) {
    if (!resource.data) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/admin/documents/campaigns", {
        method: "PUT",
        body: JSON.stringify({
          revision: resource.data.revision,
          content: ads,
        }),
      });
      setEditing(null);
      setNotice("Campaign changes saved.");
      resource.reload();
      window.dispatchEvent(new Event("arise_ads_updated"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!resource.data)
    return <State error={resource.error} retry={resource.reload} />;
  const ads = resource.data.content;
  return (
    <>
      <div className="admin-panel-heading">
        <div>
          <h2>Sponsored campaigns</h2>
          <p>
            Campaign fees are booked amounts, not verified revenue. Events count
            once per browser, campaign and day.
          </p>
        </div>
        <button
          className="button primary"
          disabled={busy}
          onClick={() =>
            setEditing({
              id: crypto.randomUUID(),
              title: "",
              advertiser_name: "",
              target_url: "/products",
              banner_url: "",
              badge_text: "Sponsored",
              cta_text: "View details",
              placement: "home_hero",
              start_date: new Date().toISOString().slice(0, 10),
              end_date: new Date(Date.now() + 30 * 86400000)
                .toISOString()
                .slice(0, 10),
              price_bdt: 0,
              status: "paused",
              impressions: 0,
              clicks: 0,
              created_at: Date.now(),
            })
          }
        >
          <Plus size={16} />
          Create campaign
        </button>
      </div>
      {error && (
        <p className="admin-inline-error" role="alert">
          {error}
          <button className="button ghost small" onClick={resource.reload}>
            Reload latest campaigns
          </button>
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {editing && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>
              {ads.some((a) => a.id === editing.id)
                ? "Edit campaign"
                : "New campaign"}
            </h2>
            <button
              className="icon-button"
              aria-label="Close campaign editor"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              <X size={20} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const updated = ads.some((a) => a.id === editing.id)
                ? ads.map((a) => (a.id === editing.id ? editing : a))
                : [...ads, editing];
              void save(updated);
            }}
          >
            <div className="admin-form-grid">
              {(
                [
                  ["title", "Campaign title", 160],
                  ["advertiser_name", "Advertiser name", 100],
                  ["target_url", "Destination URL", 2000],
                  ["banner_url", "Banner URL (HTTPS, optional)", 2000],
                  ["badge_text", "Badge text", 40],
                  ["cta_text", "Button text", 40],
                ] as const
              ).map(([key, label, max]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    required={key !== "banner_url" && key !== "badge_text"}
                    maxLength={max}
                    value={editing[key] || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label className="field">
                Placement
                <select
                  value={editing.placement}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      placement: e.target.value as SponsoredAd["placement"],
                    })
                  }
                >
                  {Object.entries(placements).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Status
                <select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as SponsoredAd["status"],
                    })
                  }
                >
                  <option value="paused">Paused</option>
                  <option value="pending_payment">Pending payment</option>
                  <option value="active">Active</option>
                </select>
              </label>
              <label className="field">
                Start date (UTC)
                <input
                  required
                  type="date"
                  value={editing.start_date}
                  onChange={(e) =>
                    setEditing({ ...editing, start_date: e.target.value })
                  }
                />
              </label>
              <label className="field">
                End date (UTC)
                <input
                  required
                  type="date"
                  min={editing.start_date}
                  value={editing.end_date}
                  onChange={(e) =>
                    setEditing({ ...editing, end_date: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Booked fee (BDT)
                <input
                  required
                  type="number"
                  min={0}
                  max={10000000}
                  step="0.01"
                  value={editing.price_bdt}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      price_bdt: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save campaign"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="admin-panel">
        {!ads.length ? (
          <Empty>
            <h3>No campaigns yet</h3>
            <p>
              Create a campaign and activate it when it is ready to publish.
            </p>
          </Empty>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Placement / dates</th>
                  <th>Booked fee</th>
                  <th>Views / clicks</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id}>
                    <td>
                      <strong>{ad.title}</strong>
                      <small>{ad.advertiser_name}</small>
                      <small>{ad.target_url}</small>
                    </td>
                    <td>
                      {placements[ad.placement]}
                      <small>
                        {ad.start_date} → {ad.end_date}
                      </small>
                    </td>
                    <td>{money(String(ad.price_bdt))}</td>
                    <td>
                      {ad.impressions || 0} / {ad.clicks || 0}
                    </td>
                    <td>
                      <span className="admin-status">
                        {ad.status === "active" &&
                        Date.parse(ad.end_date) + 86400000 <= Date.now()
                          ? "Expired"
                          : ad.status === "active" &&
                              Date.parse(ad.start_date) > Date.now()
                            ? "Scheduled"
                            : ad.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="button secondary small"
                          disabled={busy}
                          onClick={() => setEditing(ad)}
                        >
                          Edit
                        </button>
                        <button
                          className="button secondary small"
                          disabled={busy}
                          onClick={() =>
                            void save(
                              ads.map((a) =>
                                a.id === ad.id
                                  ? {
                                      ...a,
                                      status:
                                        a.status === "active"
                                          ? "paused"
                                          : "active",
                                    }
                                  : a,
                              ),
                            )
                          }
                        >
                          {ad.status === "active" ? "Pause" : "Activate"}
                        </button>
                        <button
                          className="button ghost small"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete campaign “${ad.title}”? This removes it from public placements.`,
                              )
                            )
                              void save(ads.filter((a) => a.id !== ad.id));
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Content() {
  const resource = useResource<Document<Settings>>("/admin/documents/settings");
  if (!resource.data)
    return <State error={resource.error} retry={resource.reload} />;
  return (
    <ContentForm
      document={resource.data}
      reload={resource.reload}
    />
  );
}
function ContentForm({
  document,
  reload,
}: {
  document: Document<Settings>;
  reload: () => void;
}) {
  const [settings, setSettings] = useState(document.content),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => setSettings(document.content), [document.revision]);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setSaved(false);
        try {
          await api("/admin/documents/settings", {
            method: "PUT",
            body: JSON.stringify({
              revision: document.revision,
              content: settings,
            }),
          });
          setSaved(true);
          window.dispatchEvent(new Event("arise_ads_updated"));
          reload();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <section className="admin-panel">
        <h2>Marketplace content</h2>
        <p>
          These settings apply to the marketplace. Each seller keeps control of
          their shop pages.
        </p>
        <div className="admin-form-grid">
          {(
            [
              ["announcement", "Announcement", 160],
              ["announcement_url", "Announcement link", 2000],
              ["hero_title", "Homepage heading", 160],
              ["hero_description", "Homepage description", 500],
              ["support_email", "Platform support email", 255],
            ] as const
          ).map(([key, label, max]) => (
            <label className="field" key={key}>
              {label}
              <input
                type={key === "support_email" ? "email" : "text"}
                maxLength={max}
                value={settings[key] || ""}
                onChange={(e) =>
                  setSettings({ ...settings, [key]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Platform information pages</h2>
        <p>
          Plain text only. Write the actual platform policies and support
          information.
        </p>
        {shopPageSections.map((section) => (
          <label className="field" key={section.key}>
            {section.title}
            <textarea
              rows={5}
              maxLength={3000}
              value={settings.pages?.[section.key] || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  pages: { ...settings.pages, [section.key]: e.target.value },
                })
              }
            />
          </label>
        ))}
      </section>
      {error && (
        <p className="admin-inline-error" role="alert">
          {error}
          <button type="button" className="button ghost small" onClick={reload}>
            Reload latest content
          </button>
        </p>
      )}
      {saved && (
        <p className="notice" role="status">
          Website content saved.
        </p>
      )}
      <div className="admin-form-actions">
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save website content"}
        </button>
      </div>
    </form>
  );
}

function Activity() {
  const [offset, setOffset] = useState(0);
  const resource = useResource<{
    activity: {
      id: string;
      actor: string;
      action: string;
      target: string;
      detail: string;
      created_at: number;
    }[];
    has_more: boolean;
  }>(`/admin/activity?offset=${offset}`);
  if (!resource.data)
    return <State error={resource.error} retry={resource.reload} />;
  return (
    <section className="admin-panel">
      <h2>Administrator activity</h2>
      <p>
        Append-only history of marketplace changes. Customer secrets are not
        included.
      </p>
      {!resource.data.activity.length ? (
        <Empty>No administrator changes recorded yet.</Empty>
      ) : (
        <div className="admin-timeline">
          {resource.data.activity.map((a) => (
            <article key={a.id}>
              <span className="admin-timeline-dot" />
              <div>
                <strong>{a.action.replaceAll(".", " · ")}</strong>
                <p>{a.detail}</p>
                <small>Target: {a.target}</small>
                <small>
                  Actor: {a.actor} · <Stamp value={a.created_at} />
                </small>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pager offset={offset} more={resource.data.has_more} change={setOffset} />
    </section>
  );
}

function Access({ user }: { user: User }) {
  const resource = useResource<{
      users: (User & { marketplace_role: string })[];
    }>("/admin/access"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  if (!resource.data)
    return <State error={resource.error} retry={resource.reload} />;
  return (
    <>
      <section className="admin-panel">
        <h2>Administrator permissions</h2>
        <p>
          Only active AriseSell administrators are listed. These roles limit
          marketplace access; they cannot promote a regular account.
        </p>
        <div className="admin-role-grid">
          <div>
            <strong>Owner</strong>
            <p>Full marketplace administration.</p>
          </div>
          <div>
            <strong>Moderator</strong>
            <p>Catalog moderation, reports and reviews.</p>
          </div>
          <div>
            <strong>Support</strong>
            <p>Read orders and catalog, resolve reports, add support notes.</p>
          </div>
        </div>
        {error && (
          <p className="admin-inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Account</th>
                <th>Marketplace role</th>
              </tr>
            </thead>
            <tbody>
              {resource.data.users.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.name}</strong>
                    {member.id === user.id && <small>Your account</small>}
                  </td>
                  <td>
                    {member.email}
                    <small>{member.id}</small>
                  </td>
                  <td>
                    <label>
                      <span className="sr-only">Role for {member.name}</span>
                      <select
                        value={member.marketplace_role}
                        disabled={member.id === user.id || !!busy}
                        onChange={async (e) => {
                          const role = e.target.value;
                          if (
                            !window.confirm(
                              `Change ${member.name}'s marketplace role to ${role}?`,
                            )
                          )
                            return;
                          setBusy(member.id);
                          setError("");
                          try {
                            await api(`/admin/access/${member.id}`, {
                              method: "PUT",
                              body: JSON.stringify({ role }),
                            });
                            resource.reload();
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setBusy("");
                          }
                        }}
                      >
                        {["owner", "moderator", "support", "blocked"].map(
                          (role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Health() {
  const resource = useResource<{
    metadata: string;
    source: string;
    source_ms: number;
    synced_at: string | null;
    checked_at: number;
  }>("/admin/health");
  if (!resource.data)
    return <State error={resource.error} retry={resource.reload} />;
  const data = resource.data;
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Connection health</h2>
          <p>
            Live connection checks without credentials or infrastructure
            addresses.
          </p>
        </div>
        <button className="button secondary" onClick={resource.reload}>
          <RefreshCw size={16} />
          Run checks
        </button>
      </div>
      <dl className="admin-details">
        <div>
          <dt>Marketplace metadata</dt>
          <dd>
            <span className="admin-status positive">{data.metadata}</span>
          </dd>
        </div>
        <div>
          <dt>AriseSell catalog</dt>
          <dd>
            <span
              className={`admin-status ${data.source === "connected" ? "positive" : "warning"}`}
            >
              {data.source}
            </span>
          </dd>
        </div>
        <div>
          <dt>Source response</dt>
          <dd>{data.source_ms} ms</dd>
        </div>
        <div>
          <dt>Source sync timestamp</dt>
          <dd>
            {data.synced_at ? (
              <Stamp value={data.synced_at} />
            ) : (
              "Not supplied by source"
            )}
          </dd>
        </div>
        <div>
          <dt>Checked at (Bangladesh)</dt>
          <dd>
            <Stamp value={data.checked_at} />
          </dd>
        </div>
      </dl>
      <p>
        For per-order payment or delivery failures, use Payment issues. No
        payment retry or service restart is triggered by these checks.
      </p>
    </section>
  );
}
