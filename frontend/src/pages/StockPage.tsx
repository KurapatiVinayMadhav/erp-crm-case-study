import { useCallback, useEffect, useState } from "react";

import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { can } from "../lib/roles";
import { emptyMeta, fmtDateTime, type Page } from "../lib/format";
import type { Product, StockMovement } from "../lib/types";
import { FieldError, Pager } from "../components/PageBits";

export function StockPage() {
  const { user } = useAuth();
  const canManage = user ? can.manageStock(user.role) : false;

  const [items, setItems] = useState<StockMovement[]>([]);
  const [meta, setMeta] = useState(emptyMeta());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ page: 1, type: "" });
  const [products, setProducts] = useState<Product[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "", type: "IN", reason: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string[]> | null>(null);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async (override?: Partial<typeof query>) => {
    const q = { ...query, ...override };
    setLoading(true);
    setPageError(null);
    try {
      const params = new URLSearchParams({
        page: String(q.page),
        pageSize: "20",
        ...(q.type ? { type: q.type } : {}),
      });
      const data = await api.get<Page<StockMovement>>(`/api/v1/stock-movements?${params}`);
      setItems(data.items);
      setMeta(data.meta);
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    reload({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.type]);

  useEffect(() => {
    if (formOpen) {
      api
        .get<Page<Product>>("/api/v1/products?pageSize=100")
        .then((d) => setProducts(d.items))
        .catch(() => setProducts([]));
    }
  }, [formOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors(null);
    setNotice(null);
    try {
      const res = await api.post<{ product: { name: string; currentStock: number } }>("/api/v1/stock-movements", {
        productId: form.productId,
        quantityChanged: form.quantity,
        type: form.type,
        reason: form.reason,
      });
      setNotice(`${form.type === "IN" ? "Stock in" : "Stock out"} for ${res.product.name} — new balance ${res.product.currentStock}`);
      setForm({ productId: "", quantity: "", type: "IN", reason: "" });
      setFormOpen(false);
      reload({ page: 1 });
    } catch (err) {
      if (err instanceof ApiError) setFormErrors(err.body.errors ?? null);
      else setFormErrors({ form: ["Unable to record movement"] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center" }}>
        <select value={query.type} onChange={(e) => setQuery((q) => ({ ...q, type: e.target.value }))} style={{ maxWidth: 150 }}>
          <option value="">All movements</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setFormOpen(true)} style={{ marginLeft: "auto" }}>
            + Record movement
          </button>
        )}
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {pageError && <div className="alert alert-danger">{pageError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th className="align-right">Qty</th>
              <th>Reason</th>
              <th>Recorded by</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="empty">loading…</div></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6}><div className="empty">No movements recorded yet.</div></td></tr>
            ) : (
              items.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.product.name}</div>
                    <div className="mono" style={{ color: "var(--ink-light)", fontSize: "0.72rem" }}>{m.product.sku}</div>
                  </td>
                  <td><span className={m.type === "IN" ? "badge badge-in" : "badge badge-out"}>{m.type}</span></td>
                  <td className="align-right mono">{m.quantityChanged}</td>
                  <td style={{ color: "var(--ink-muted)" }}>{m.reason}</td>
                  <td>{m.createdBy.name}</td>
                  <td className="mono" style={{ color: "var(--ink-muted)" }}>{fmtDateTime(m.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pager meta={meta} onPage={(page) => reload({ page })} />

      {formOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(23,21,15,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "15vh 1rem", zIndex: 100 }}
          onClick={() => setFormOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: "var(--radius)", width: "100%", maxWidth: 460, padding: "var(--space-xl)" }}
          >
            <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-lg)" }}>Record stock movement</h2>
            <div style={{ display: "grid", gap: "var(--space-md)" }}>
              <div className="form-group">
                <label>Product *</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.sku} (in stock: {p.currentStock})
                    </option>
                  ))}
                </select>
                <FieldError message={formErrors?.productId?.[0]} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "IN" | "OUT" })}>
                    <option value="IN">IN — goods received</option>
                    <option value="OUT">OUT — goods issued / damaged</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                  <FieldError message={formErrors?.quantityChanged?.[0]} />
                </div>
              </div>
              <div className="form-group">
                <label>Reason *</label>
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Supplier delivery, damaged stock, other adjustments…" required />
                <FieldError message={formErrors?.reason?.[0]} />
              </div>
              {formErrors?.form && <div className="alert alert-danger">{formErrors.form[0]}</div>}
              <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className="btn" onClick={() => setFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Record movement"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}