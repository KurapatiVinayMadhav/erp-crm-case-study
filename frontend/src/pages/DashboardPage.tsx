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

type IconProps = { size?: number };

function UsersIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 20a4.5 4.5 0 0 0-4-4.47" />
    </svg>
  );
}

function PackageIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  );
}

function AlertIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function DocIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

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
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <UsersIcon />
          </span>
          <div className="stat-label">Customers</div>
          <div className="stat-value">{data.customers.total}</div>
          <div className="stat-note">
            {Object.entries(data.customers.byStatus)
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ")}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <PackageIcon />
          </span>
          <div className="stat-label">Products</div>
          <div className="stat-value">{data.products.total}</div>
          <div className="stat-note">
            {data.products.byCategory.length > 0
              ? data.products.byCategory.slice(0, 2).map((c) => `${c.category} ${c.count}`).join(" · ")
              : "no categories yet"}
          </div>
        </div>
        <div className="stat-card">
          <span className={`stat-icon ${data.lowStock.length ? "danger" : "success"}`}>
            <AlertIcon />
          </span>
          <div className="stat-label">Low-stock alerts</div>
          <div
            className="stat-value"
            style={{ color: data.lowStock.length ? "var(--danger)" : "var(--success)" }}
          >
            {data.lowStock.length}
          </div>
          <div className="stat-note">at or below reorder level</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <DocIcon />
          </span>
          <div className="stat-label">Sales challans</div>
          <div className="stat-value">{data.challans.total}</div>
          <div className="stat-note">
            {Object.entries(data.challans.byStatus)
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ")}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-lg)",
        }}
      >
        <div className="card">
          <div className="card-header">
            <h3>Reorder needed</h3>
            <Link to="/products" className="mono" style={{ fontSize: "0.7rem" }}>all products →</Link>
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
                        <div className="mono" style={{ color: "var(--ink-light)", fontSize: "0.72rem" }}>{p.sku}</div>
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
            <Link to="/challans" className="mono" style={{ fontSize: "0.7rem" }}>view all →</Link>
          </div>
          {data.recentChallans.length === 0 ? (
            <div className="empty">No challans yet.</div>
          ) : (
            <div style={{ display: "grid" }}>
              {data.recentChallans.map((c) => (
                <div
                  key={c.id}
                  className="followup-item"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-md)" }}
                >
                  <div>
                    <div className="mono" style={{ fontSize: "0.8rem", fontWeight: 500 }}>{c.challanNumber}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
                      {c.customer.name} · {c.totalQuantity} qty
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                    <span className={STATUS_BADGE[c.status] ?? "badge"}>{c.status.toLowerCase()}</span>
                    <span className="mono" style={{ fontSize: "0.64rem", color: "var(--ink-light)" }}>{fmtDateTime(c.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Latest stock movements</h3>
          <Link to="/stock" className="mono" style={{ fontSize: "0.7rem" }}>full ledger →</Link>
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
                      <div className="mono" style={{ color: "var(--ink-light)", fontSize: "0.72rem" }}>{m.product.sku}</div>
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
    </div>
  );
}