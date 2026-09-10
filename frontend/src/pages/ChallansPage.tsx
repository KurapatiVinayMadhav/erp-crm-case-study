import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { can } from "../lib/roles";
import { emptyMeta, fmtDateTime, type Page } from "../lib/format";
import type { Challan } from "../lib/types";
import { Pager } from "../components/PageBits";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge badge-draft",
  CONFIRMED: "badge badge-confirmed",
  CANCELLED: "badge badge-cancelled",
};

export function ChallansPage() {
  const { user } = useAuth();
  const canCreate = user ? can.createChallans(user.role) : false;

  const [items, setItems] = useState<Challan[]>([]);
  const [meta, setMeta] = useState(emptyMeta());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ page: 1, status: "", search: "" });
  const [pageError, setPageError] = useState<string | null>(null);

  const reload = useCallback(async (override?: Partial<typeof query>) => {
    const q = { ...query, ...override };
    setLoading(true);
    setPageError(null);
    try {
      const params = new URLSearchParams({
        page: String(q.page),
        pageSize: "20",
        ...(q.status ? { status: q.status } : {}),
        ...(q.search ? { search: q.search } : {}),
      });
      const data = await api.get<Page<Challan>>(`/api/v1/challans?${params}`);
      setItems(data.items);
      setMeta(data.meta);
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "Failed to load challans");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    reload({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.status, query.search]);

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search challan no. or customer…"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
          style={{ maxWidth: 260 }}
        />
        <select value={query.status} onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value }))} style={{ maxWidth: 150 }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        {canCreate && (
          <Link to="/challans/new" className="btn btn-primary" style={{ marginLeft: "auto" }}>
            + New challan
          </Link>
        )}
      </div>

      {pageError && <div className="alert alert-danger">{pageError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Challan no.</th>
              <th>Customer</th>
              <th className="align-right">Qty</th>
              <th>Status</th>
              <th>Created by</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="empty">loading…</div></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7}><div className="empty">No challans match.</div></td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ fontWeight: 600 }}>{c.challanNumber}</td>
                  <td>
                    <div>{c.customer.name}</div>
                    <div className="mono" style={{ color: "var(--ink-light)", fontSize: "0.72rem" }}>{c.customer.businessName}</div>
                  </td>
                  <td className="align-right mono">{c.totalQuantity}</td>
                  <td><span className={STATUS_BADGE[c.status]}>{c.status.toLowerCase()}</span></td>
                  <td>{c.createdBy.name}</td>
                  <td className="mono" style={{ color: "var(--ink-muted)" }}>{fmtDateTime(c.createdAt)}</td>
                  <td>
                    <Link to={`/challans/${c.id}`} className="btn btn-sm">view</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pager meta={meta} onPage={(page) => reload({ page })} />
    </div>
  );
}