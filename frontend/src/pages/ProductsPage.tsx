import { useCallback, useEffect, useState } from "react";

import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { can } from "../lib/roles";
import { emptyMeta, fmtMoney, type Page } from "../lib/format";
import type { Product } from "../lib/types";
import { FieldError, Modal, Pager } from "../components/PageBits";

interface FormShape {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStock: string;
  location: string;
}

const EMPTY_FORM: FormShape = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "",
  minStock: "0",
  location: "",
};

export function ProductsPage() {
  const { user } = useAuth();
  const canManage = user ? can.manageStock(user.role) : false;

  const [items, setItems] = useState<Product[]>([]);
  const [meta, setMeta] = useState(emptyMeta());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ page: 1, search: "", category: "", lowStock: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormShape>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string[]> | null>(null);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const reload = useCallback(async (override?: Partial<typeof query>) => {
    const q = { ...query, ...override };
    setLoading(true);
    setPageError(null);
    try {
      const params = new URLSearchParams({
        page: String(q.page),
        pageSize: "20",
        ...(q.search ? { search: q.search } : {}),
        ...(q.category ? { category: q.category } : {}),
        ...(q.lowStock ? { lowStock: q.lowStock } : {}),
      });
      const data = await api.get<Page<Product>>(`/api/v1/products?${params}`);
      setItems(data.items);
      setMeta(data.meta);
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    reload({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.search, query.category, query.lowStock]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors(null);
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitPrice: String(p.unitPrice),
      currentStock: String(p.currentStock),
      minStock: String(p.minStock),
      location: p.location ?? "",
    });
    setFormErrors(null);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors(null);
    try {
      const body = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        unitPrice: form.unitPrice,
        currentStock: form.currentStock,
        minStock: form.minStock,
        location: form.location || undefined,
      };
      if (editing) {
        await api.patch(`/api/v1/products/${editing.id}`, body);
      } else {
        await api.post("/api/v1/products", body);
      }
      setFormOpen(false);
      reload({ page: 1 });
    } catch (err) {
      if (err instanceof ApiError) setFormErrors(err.body.errors ?? null);
      else setFormErrors({ form: ["Unable to save product"] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search name, SKU, category…"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
          style={{ maxWidth: 300 }}
        />
        <input
          placeholder="Category"
          value={query.category}
          onChange={(e) => setQuery((q) => ({ ...q, category: e.target.value }))}
          style={{ maxWidth: 160 }}
        />
        <select
          value={query.lowStock}
          onChange={(e) => setQuery((q) => ({ ...q, lowStock: e.target.value }))}
          style={{ maxWidth: 170 }}
        >
          <option value="">All stock levels</option>
          <option value="true">Low stock only</option>
        </select>
        {canManage && (
          <button className="btn btn-primary" onClick={openNew} style={{ marginLeft: "auto" }}>
            + New product
          </button>
        )}
      </div>

      {pageError && <div className="alert alert-danger">{pageError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th className="align-right">Unit price</th>
              <th className="align-right">Stock</th>
              <th className="align-right">Min level</th>
              <th>Location</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="empty">loading…</div></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7}><div className="empty">No products match.</div></td></tr>
            ) : (
              items.map((p) => {
                const low = p.currentStock <= p.minStock;
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="mono" style={{ color: "var(--ink-light)", fontSize: "0.72rem" }}>{p.sku}</div>
                    </td>
                    <td>{p.category}</td>
                    <td className="align-right">{fmtMoney(p.unitPrice)}</td>
                    <td className={`align-right mono ${low ? "" : ""}`} style={{ color: low ? "var(--danger)" : undefined, fontWeight: low ? 700 : undefined }}>
                      {p.currentStock}
                      {low && <span className="badge badge-low" style={{ marginLeft: "0.4rem" }}>low</span>}
                    </td>
                    <td className="align-right mono">{p.minStock}</td>
                    <td className="mono" style={{ color: "var(--ink-muted)" }}>{p.location ?? "—"}</td>
                    <td>
                      {canManage && (
                        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                          <button className="btn btn-sm" onClick={() => openEdit(p)}>edit</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pager meta={meta} onPage={(page) => reload({ page })} />

      <div className="alert">
        <strong>Stock-level changes:</strong> existing stock is adjusted through the Stock Ledger (IN/OUT movements), not by editing a product.
      </div>

      {formOpen && (
        <Modal title={editing ? "Edit product" : "New product"} onClose={() => setFormOpen(false)} wide>
          <form onSubmit={submit} style={{ display: "grid", gap: "var(--space-lg)" }}>
            <div className="form-row">
              <div className="form-group">
                <label>Product name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <FieldError message={formErrors?.name?.[0]} />
              </div>
              <div className="form-group">
                <label>SKU / code *</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                <FieldError message={formErrors?.sku?.[0]} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
                <FieldError message={formErrors?.category?.[0]} />
              </div>
              <div className="form-group">
                <label>Unit price (₹) *</label>
                <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
                <FieldError message={formErrors?.unitPrice?.[0]} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Rack / bay / shelf" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Minimum stock alert level</label>
                <input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
                <FieldError message={formErrors?.minStock?.[0]} />
              </div>
              {!editing && (
                <div className="form-group">
                  <label>Opening stock</label>
                  <input type="number" min="0" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
                </div>
              )}
            </div>
            {editing && (
              <div className="alert">
                Current stock <strong className="mono">{editing.currentStock}</strong> is managed via stock movements.
              </div>
            )}
            {formErrors?.form && <div className="alert alert-danger">{formErrors.form[0]}</div>}
            <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => setFormOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}