import { useEffect, useState } from "react";
import { api, money } from "./api";
import { OffersEditor, type Question } from "./Commerce";
import type { Catalog } from "./types";

export function StoreOffers({
  catalog,
  onSaved,
}: {
  catalog: Catalog;
  onSaved: () => void;
}) {
  const [shop, setShop] = useState(catalog.shops[0]?.id || "");
  return (
    <>
      <label className="field">
        Shop
        <select value={shop} onChange={(event) => setShop(event.target.value)}>
          {catalog.shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
      </label>
      {shop ? (
        <OffersEditor
          key={shop}
          admin
          shopId={shop}
          products={catalog.products}
          onSaved={onSaved}
        />
      ) : (
        <p>No published shops available.</p>
      )}
    </>
  );
}
type Badge = {
  label: "Top Seller" | "Trusted Shop";
  reason: string;
  expires_at: number;
};
export function MerchantBadges({
  catalog,
  onSaved,
}: {
  catalog: Catalog;
  onSaved: () => void;
}) {
  const [data, setData] = useState<{
      content: Record<string, Badge>;
      revision: number;
    } | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      setData(await api("/admin/documents/badges"));
      setError("");
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(content: Record<string, Badge>) {
    if (!data || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setData(
        await api("/admin/documents/badges", {
          method: "PUT",
          body: JSON.stringify({ revision: data.revision, content }),
        }),
      );
      setMessage("Shop badges updated.");
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel seller-growth">
      <h2>Merchant badges</h2>
      <p>
        Review actual order history, complaints and seller service before
        granting a badge. Record the evidence and expiry. A badge is a manual
        marketplace review, not a delivery or payment guarantee.
      </p>
      <button className="text-link" onClick={() => void load()}>
        Reload badges
      </button>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {data && (
        <>
          <ul className="offer-list">
            {Object.entries(data.content).map(([id, badge]) => (
              <li key={id}>
                <strong>
                  {catalog.shops.find((shop) => shop.id === id)?.name || id}
                </strong>
                <p>
                  {badge.label} · Expires{" "}
                  {new Date(badge.expires_at * 1000).toLocaleDateString()}
                </p>
                <p>{badge.reason}</p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    const content = { ...data.content };
                    delete content[id];
                    void save(content);
                  }}
                >
                  Revoke badge
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              void save({
                ...data.content,
                [String(fields.get("shop_id"))]: {
                  label: fields.get("label") as Badge["label"],
                  reason: String(fields.get("reason")),
                  expires_at: Math.floor(
                    new Date(String(fields.get("expires_at"))).getTime() / 1000,
                  ),
                },
              });
            }}
          >
            <div className="form-grid">
              <label className="field">
                Shop
                <select name="shop_id" required>
                  {catalog.shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Badge
                <select name="label">
                  <option>Trusted Shop</option>
                  <option>Top Seller</option>
                </select>
              </label>
              <label className="field">
                Expires
                <input name="expires_at" type="datetime-local" required />
              </label>
            </div>
            <label className="field">
              Review evidence (admin only)
              <textarea name="reason" required minLength={10} maxLength={500} />
            </label>
            <button
              className="button primary"
              disabled={busy || !catalog.shops.length}
            >
              {busy ? "Saving…" : "Grant reviewed badge"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
type Insights = {
  daily: { day: number; visitors: number; page_views: number }[];
  categories: Record<string, number>;
  sales: {
    shop_id: string;
    shop_name: string;
    day: string;
    currency: string;
    orders: number;
    paid_orders: number;
    paid_total: string;
  }[];
  checked_at: string;
};
export function SalesInsights() {
  const [data, setData] = useState<Insights | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      setData(await api("/admin/analytics"));
      setError("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const shops = new Map<
    string,
    {
      name: string;
      currency: string;
      orders: number;
      paid: number;
      revenue: number;
    }
  >();
  for (const row of data?.sales || []) {
    const key = `${row.shop_id}:${row.currency}`,
      value = shops.get(key) || {
        name: row.shop_name,
        currency: row.currency,
        orders: 0,
        paid: 0,
        revenue: 0,
      };
    value.orders += row.orders;
    value.paid += row.paid_orders;
    value.revenue += Number(row.paid_total);
    shops.set(key, value);
  }
  const day = Math.floor(Date.now() / 86400000),
    days = Array.from(
      { length: 30 },
      (_, i) =>
        data?.daily.find((row) => row.day === day - 29 + i) || {
          day: day - 29 + i,
          visitors: 0,
          page_views: 0,
        },
    );
  const peak = Math.max(1, ...days.map((row) => row.visitors));
  async function download() {
    if (!data) return;
    const text = JSON.stringify(data, null, 2),
      url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "arise-store-report.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="growth-insights">
      <div className="section-heading">
        <p>Last 30 days · UTC reporting days</p>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void load()}
          >
            {busy ? "Refreshing…" : "Refresh report"}
          </button>
          <button
            className="button secondary"
            disabled={!data}
            onClick={() => void download()}
          >
            Download report
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {!data && !error && (
        <p role="status">Loading source sales and traffic…</p>
      )}
      {data && (
        <>
          <section className="panel">
            <h2>Daily visitors</h2>
            <p>
              Distinct browsers each day. Repeat visits to the same page count
              once per day. Private browsing, cleared cookies and devices affect
              counts. Do Not Track and Global Privacy Control are respected.
            </p>
            <div
              className="traffic-chart"
              role="img"
              aria-label="Daily unique browser counts; exact values are in the table below"
            >
              {days.map((row) => (
                <div
                  key={row.day}
                  title={`${new Date(row.day * 86400000).toISOString().slice(0, 10)}: ${row.visitors} visitors`}
                >
                  <span
                    style={{
                      height: `${Math.max(2, (row.visitors / peak) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <details>
              <summary>Daily traffic data</summary>
              <div className="admin-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date (UTC)</th>
                      <th>Visitors</th>
                      <th>Unique page visits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((row) => (
                      <tr key={row.day}>
                        <td>
                          {new Date(row.day * 86400000)
                            .toISOString()
                            .slice(0, 10)}
                        </td>
                        <td>{row.visitors}</td>
                        <td>{row.page_views}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <section className="panel">
            <h2>Sales by shop</h2>
            <p>
              Order totals come directly from AriseSell. Paid totals include
              shipping and discounts; refunded and partially refunded orders are
              excluded. These are recorded paid sales, not a payout balance.
            </p>
            <div className="admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th>Orders</th>
                    <th>Paid orders</th>
                    <th>Paid total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...shops.entries()].map(([id, row]) => (
                    <tr key={id}>
                      <td>{row.name}</td>
                      <td>{row.orders}</td>
                      <td>{row.paid}</td>
                      <td>{money(row.revenue.toFixed(2), row.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!shops.size && (
                <p>No marketplace sales recorded in this period.</p>
              )}
            </div>
            <p>Source checked: {new Date(data.checked_at).toLocaleString()}</p>
          </section>
          <section className="panel">
            <h2>Category interest</h2>
            <p>
              Unique product page visits by the current product category. Hidden
              or deleted products are excluded.
            </p>
            <div className="category-interest">
              {Object.entries(data.categories)
                .sort((a, b) => b[1] - a[1])
                .map(([category, views]) => (
                  <div key={category}>
                    <strong>{category}</strong>
                    <meter
                      min={0}
                      max={Math.max(1, ...Object.values(data.categories))}
                      value={views}
                    >
                      {views}
                    </meter>
                    <span>{views}</span>
                  </div>
                ))}
            </div>
            {!Object.keys(data.categories).length && (
              <p>No product visits recorded yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
export function QuestionsModeration() {
  const [items, setItems] = useState<Question[]>([]),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const data = await api<{ questions: Question[]; has_more: boolean }>(
        `/admin/questions?offset=${offset}`,
      );
      setItems(data.questions);
      setMore(data.has_more);
      setError("");
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [offset]);
  return (
    <section className="panel seller-growth">
      <h2>Product Q&A moderation</h2>
      <button className="text-link" onClick={() => void load()}>
        Refresh questions
      </button>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!items.length && <p>No questions on this page.</p>}
      {items.map((item) => (
        <form
          key={item.id}
          onSubmit={async (event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            setBusy(true);
            try {
              await api(`/admin/questions/${item.id}/visibility`, {
                method: "PUT",
                body: JSON.stringify({
                  hidden: !item.hidden,
                  reason: fields.get("reason"),
                }),
              });
              await load();
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            <strong>{item.display_name}</strong> ·{" "}
            {item.hidden
              ? "Hidden"
              : item.answer
                ? "Published"
                : "Awaiting seller"}
          </p>
          <p className="preserve-lines">{item.question}</p>
          <p className="preserve-lines">{item.answer}</p>
          <label className="field">
            Moderation reason
            <input name="reason" required minLength={10} maxLength={500} />
          </label>
          <button className="button secondary" disabled={busy}>
            {item.hidden ? "Restore visibility" : "Hide question"}
          </button>
        </form>
      ))}
      <div className="pagination">
        <button
          className="button secondary"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          Previous
        </button>
        <button
          className="button secondary"
          disabled={!more}
          onClick={() => setOffset(offset + 50)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
