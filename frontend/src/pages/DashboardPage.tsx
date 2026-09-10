import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import { fmtDateTime } from "../lib/format";

interface Summary {
  customers: { total: number; byStatus: Record<string, number> };
  products: { total: number; byCategory: { category: string; count: number }[] };
  challans: { total: number; byStatus: Record<string, number> };
  lowStock: {
    id: string;
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    minStock: number;
  }[];
  recentChallans: {
    id: string;
    challanNumber: string;
    status: string;
    totalQuantity: number;
    createdAt: string;
    customer: { name: string };
  }[];
  recentMovements: {
    id: string;
    quantityChanged: number;
    type: "IN" | "OUT";
    reason: string;
    createdAt: string;
    product: { name: string; sku: string };
  }[];
}

const STATUS_BADGE: Record<string, string> = {
  LEAD: "badge badge-lead",
  ACTIVE: "badge badge-active",
  INACTIVE: "badge badge-inactive",
  DRAFT: "badge badge-draft",
  CONFIRMED: "badge badge-confirmed",
  CANCELLED: "badge badge-cancelled",
};

export function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Summary>("/api/v1/dashboard/summary")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="mono" style={{ color: "var(--ink-muted)" }}>loading…</div>;

  return (
    <div style={{ display: "grid", gap: "var(--space-xl)" }}>
      <section>
        <div className="card-header">
          <h2>At a glance</h2>
          <span className="card-sub">Current day view</span>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Customers</div>
            <div className="stat-value">{data.customers.total}</div>
            <div className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-light)" }}>
              {Object.entries(data.customers.byStatus)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Products</div>
            <div className="stat-value">{data.products.total}</div>
            <div className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-light)" }}>
              {data.products.byCategory.length > 0
                ? data.products.byCategory.slice(0, 2).map((c) => `${c.category}: ${c.count}`).join(" · ")
                : "no categories yet"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Low-stock alerts</div>
            <div className="stat-value" style={{ color: data.lowStock.length ? "var(--danger)" : "var(--success)" }}>
              {data.lowStock.length}
            </div>
            <div className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-light)" }}>
              at or below reorder level
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Challans</div>
            <div className="stat-value">{data.challans.total}</div>
            <div className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-light)" }}>
              {Object.entries(data.challans.byStatus)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: "var(--space-xl)" }}>
        <div className="card">
          <div className="card-header">
            <h3>Reorder needed</h3>
            <Link to="/products" className="mono" style={{ fontSize: "0.72rem" }}>all products →</Link>
          </div>
          {data.lowStock.length === 0 ? (
            <div className="empty">Nothing below reorder level.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th className="align-right">Stock</th><th className="align-right">Min</th></tr>
                </thead>
                <tbody>
                  {data.lowStock.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div>{p.name}</div>
                        <div className="mono" style={{ color: "var(--ink-light)" }}>{p.sku}</div>
                      </td>
                      <td className="align-right mono" style={{ color: "var(--danger)" }}>{p.currentStock}</td>
                      <td className="align-right mono">{p.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent challans</h3>
            <Link to="/challans" className="mono" style={{ fontSize: "0.72rem" }}>view all →</Link>
          </div>
          {data.recentChallans.length === 0 ? (
            <div className="empty">No challans yet.</div>
          ) : (
            <div style={{ display: "grid" }}>
              {data.recentChallans.map((c) => (
                <div key={c.id} className="followup-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-md)" }}>
                  <div>
                    <div className="mono" style={{ fontSize: "0.82rem" }}>{c.challanNumber}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                      {c.customer.name} · {c.totalQuantity} qty
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span className={STATUS_BADGE[c.status] ?? "badge"}>{c.status.toLowerCase()}</span>
                    <span className="mono" style={{ fontSize: "0.68rem", color: "var(--ink-light)" }}>{fmtDateTime(c.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="card">
          <div className="card-header">
            <h3>Latest stock movements</h3>
            <Link to="/stock" className="mono" style={{ fontSize: "0.72rem" }}>full ledger →</Link>
          </div>
          {data.recentMovements.length === 0 ? (
            <div className="empty">No movements recorded yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Type</th><th className="align-right">Qty</th><th>Reason</th><th>When</th></tr>
                </thead>
                <tbody>
                  {data.recentMovements.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div>{m.product.name}</div>
                        <div className="mono" style={{ color: "var(--ink-light)" }}>{m.product.sku}</div>
                      </td>
                      <td><span className={m.type === "IN" ? "badge badge-in" : "badge badge-out"}>{m.type}</span></td>
                      <td className="align-right mono">{m.quantityChanged}</td>
                      <td style={{ color: "var(--ink-muted)" }}>{m.reason}</td>
                      <td className="mono" style={{ color: "var(--ink-muted)" }}>{fmtDateTime(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}