import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { can } from "../lib/roles";
import { fmtMoney, type Page } from "../lib/format";
import type { Challan, Customer, Product } from "../lib/types";

interface Row {
  key: number;
  productId: string;
  quantity: string;
}

export function ChallanCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!user) throw new Error("logged out");

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows] = useState<Row[]>([{ key: 1, productId: "", quantity: "" }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const canCreate = can.createChallans(user.role);

  useEffect(() => {
    api
      .get<Page<Product>>("/api/v1/products?pageSize=100&lowStock=false")
      .then((d) => setProducts(d.items))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ pageSize: "20", ...(customerSearch.trim() ? { search: customerSearch.trim() } : {}) });
    api
      .get<Page<Customer>>(`/api/v1/customers?${params}`)
      .then((d) => setCustomers(d.items))
      .catch(() => setCustomers([]));
  }, [customerSearch]);

  const visibleProducts = productSearch.trim()
    ? products.filter((p) => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  const addRow = () => setRows((r) => [...r, { key: Date.now(), productId: "", quantity: "" }]);
  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removeRow = (key: number) => setRows((r) => (r.length > 1 ? r.filter((row) => row.key !== key) : r));

  const productOf = (id: string) => products.find((p) => p.id === id);

  const lineTotal = rows.reduce((sum, r) => {
    const p = productOf(r.productId);
    const qty = Number(r.quantity) || 0;
    return sum + (p ? p.unitPrice * qty : 0);
  }, 0);
  const totalQty = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  const submit = useCallback(
    async (status: "DRAFT" | "CONFIRMED") => {
      setError(null);
      setErrors(null);
      setSaving(status);

      const items = rows
        .filter((r) => r.productId && Number(r.quantity) > 0)
        .map((r) => ({ productId: r.productId, quantity: Number(r.quantity) }));

      if (!customerId) {
        setError("Pick a customer first");
        setSaving(null);
        return;
      }
      if (items.length === 0) {
        setError("Add at least one line item with a quantity");
        setSaving(null);
        return;
      }

      try {
        const created = await api.post<Challan>("/api/v1/challans", { customerId, items, status });
        navigate(`/challans/${created.id}`);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
          setErrors(err.body.errors ?? null);
        } else {
          setError("Unable to create challan");
        }
        setSaving(null);
      }
    },
    [customerId, rows, navigate]
  );

  if (!canCreate) {
    return (
      <div className="alert alert-warning">
        Only Admin and Sales users can create challans. Your role is {user.role}.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)", maxWidth: 880 }}>
      <Link to="/challans" className="btn" style={{ justifySelf: "start" }}>← All challans</Link>

      <div className="card">
        <div className="card-header">
          <h3>1 · Customer</h3>
          <span className="card-sub">ship-to</span>
        </div>
        <div style={{ display: "grid", gap: "var(--space-md)" }}>
          <input
            placeholder="Search customer by name or business…"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />
          {customers.length === 0 ? (
            <div className="empty">No customers found — add a customer first.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th></th><th>Customer</th><th>Business</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} style={{ cursor: "pointer", background: customerId === c.id ? "var(--warning-bg)" : undefined }}>
                      <td>
                        <input
                          type="radio"
                          name="customer"
                          checked={customerId === c.id}
                          onChange={() => setCustomerId(c.id)}
                        />
                      </td>
                      <td onClick={() => setCustomerId(c.id)}>{c.name}</td>
                      <td onClick={() => setCustomerId(c.id)}>{c.businessName}</td>
                      <td onClick={() => setCustomerId(c.id)} className="mono">{c.status.toLowerCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>2 · Line items</h3>
          <button type="button" className="btn btn-sm" onClick={addRow}>+ Add line</button>
        </div>

        <div style={{ display: "grid", gap: "var(--space-md)" }}>
          <input
            placeholder="Filter products…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          {rows.map((row, idx) => {
            const p = productOf(row.productId);
            return (
              <div key={row.key} style={{ border: "1px solid var(--hairline-light)", borderRadius: "var(--radius)", padding: "var(--space-md)" }}>
                <div className="form-row" style={{ gridTemplateColumns: "2fr 1fr auto" }}>
                  <div className="form-group">
                    <label>Product</label>
                    <select value={row.productId} onChange={(e) => updateRow(row.key, { productId: e.target.value })}>
                      <option value="">Select product…</option>
                      {visibleProducts.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.name} · {pr.sku} · stock {pr.currentStock} · {fmtMoney(pr.unitPrice)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ justifyContent: "flex-end", flexDirection: "row", alignItems: "center" }}>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeRow(row.key)}>
                      remove
                    </button>
                  </div>
                </div>
                {p && (
                  <div className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-light)", marginTop: "0.3rem" }}>
                    line {idx + 1} · unit {fmtMoney(p.unitPrice)} · amount {fmtMoney((Number(row.quantity) || 0) * p.unitPrice)}
                    {p.currentStock <= p.minStock && <span className="badge badge-low" style={{ marginLeft: "0.5rem" }}>low stock</span>}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--hairline)", paddingTop: "var(--space-md)" }}>
            <div className="mono" style={{ fontSize: "0.9rem" }}>
              Total qty <strong>{totalQty}</strong> · Total value <strong>{fmtMoney(lineTotal)}</strong>
            </div>
          </div>
        </div>
      </div>

      {errors?.items && (
        <div className="alert alert-danger">
          {Array.isArray(errors.items)
            ? errors.items.map((e, i) => <div key={i}>{e}</div>)
            : String(errors.items)}
        </div>
      )}
      {errors?.customerId && <div className="alert alert-danger">{String(errors.customerId)}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: "flex", gap: "var(--space-md)" }}>
        <button className="btn" onClick={() => submit("DRAFT")} disabled={saving !== null}>
          {saving === "DRAFT" ? "Saving draft…" : "Save as draft"}
        </button>
        <button className="btn btn-primary" onClick={() => submit("CONFIRMED")} disabled={saving !== null}>
          {saving === "CONFIRMED" ? "Confirming…" : "Save & confirm"}
        </button>
        <span className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-light)", alignSelf: "center" }}>
          A confirmed challan immediately deducts stock; this cannot be undone except by an admin cancellation.
        </span>
      </div>
    </div>
  );
}