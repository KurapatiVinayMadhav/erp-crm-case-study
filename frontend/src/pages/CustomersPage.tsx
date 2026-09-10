import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { can } from "../lib/roles";
import { emptyMeta, fmtDate, type Page } from "../lib/format";
import type { Customer } from "../lib/types";
import { FieldError, Modal, Pager } from "../components/PageBits";

const STATUS_BADGE: Record<string, string> = {
  LEAD: "badge badge-lead",
  ACTIVE: "badge badge-active",
  INACTIVE: "badge badge-inactive",
};

interface FormShape {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  type: Customer["type"];
  status: Customer["status"];
  address: string;
  followUpDate: string;
  notes: string;
}

const EMPTY_FORM: FormShape = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  type: "RETAIL",
  status: "ACTIVE",
  address: "",
  followUpDate: "",
  notes: "",
};

export function CustomersPage() {
  const { user } = useAuth();
  const canManage = user ? can.manageCustomers(user.role) : false;

  const [items, setItems] = useState<Customer[]>([]);
  const [meta, setMeta] = useState(emptyMeta());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ page: 1, search: "", status: "", type: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
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
        ...(q.status ? { status: q.status } : {}),
        ...(q.type ? { type: q.type } : {}),
      });
      const data = await api.get<Page<Customer>>(`/api/v1/customers?${params}`);
      setItems(data.items);
      setMeta(data.meta);
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    reload({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.search, query.status, query.type]);

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      mobile: c.mobile,
      email: c.email ?? "",
      businessName: c.businessName,
      gstNumber: c.gstNumber ?? "",
      type: c.type,
      status: c.status,
      address: c.address ?? "",
      followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "",
      notes: c.notes ?? "",
    });
    setFormErrors(null);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors(null);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors(null);
    try {
      const body = {
        ...form,
        followUpDate: form.followUpDate || "",
        gstNumber: form.gstNumber || "",
        email: form.email || "",
      };
      if (editing) {
        await api.patch(`/api/v1/customers/${editing.id}`, body);
      } else {
        await api.post("/api/v1/customers", body);
      }
      setFormOpen(false);
      reload({ page: 1 });
    } catch (err) {
      if (err instanceof ApiError) setFormErrors(err.body.errors ?? null);
      else setFormErrors({ form: ["Unable to save customer"] });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Customer) => {
    if (!window.confirm(`Delete "${c.name}"? Their challans will block removal if any exist.`)) return;
    try {
      await api.del(`/api/v1/customers/${c.id}`);
      reload({ page: 1 });
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search name, business, mobile…"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
          style={{ maxWidth: 300 }}
        />
        <select
          value={query.status}
          onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value }))}
          style={{ maxWidth: 140 }}
        >
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          value={query.type}
          onChange={(e) => setQuery((q) => ({ ...q, type: e.target.value }))}
          style={{ maxWidth: 150 }}
        >
          <option value="">All types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
        {canManage && (
          <button className="btn btn-primary" onClick={openNew} style={{ marginLeft: "auto" }}>
            + New customer
          </button>
        )}
      </div>

      {pageError && <div className="alert alert-danger">{pageError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Business</th>
              <th>Type</th>
              <th>Status</th>
              <th>Mobile</th>
              <th>Follow-up</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><div className="empty">loading…</div></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8}><div className="empty">No customers match.</div></td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/customers/${c.id}`} style={{ fontWeight: 600 }}>
                      {c.name}
                    </Link>
                    {c.gstNumber && (
                      <div className="mono" style={{ color: "var(--ink-light)", fontSize: "0.72rem" }}>{c.gstNumber}</div>
                    )}
                  </td>
                  <td>{c.businessName}</td>
                  <td><span className={`badge badge-${c.type.toLowerCase()}`}>{c.type.toLowerCase()}</span></td>
                  <td><span className={STATUS_BADGE[c.status]}>{c.status.toLowerCase()}</span></td>
                  <td className="mono">{c.mobile}</td>
                  <td className="mono" style={{ color: "var(--ink-muted)" }}>{fmtDate(c.followUpDate)}</td>
                  <td className="mono" style={{ color: "var(--ink-muted)" }}>{fmtDate(c.updatedAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                      <Link to={`/customers/${c.id}`} className="btn btn-sm">open</Link>
                      {canManage && (
                        <>
                          <button className="btn btn-sm" onClick={() => openEdit(c)}>edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => remove(c)}>del</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pager meta={meta} onPage={(page) => reload({ page })} />

      {formOpen && (
        <Modal title={editing ? "Edit customer" : "New customer"} onClose={() => setFormOpen(false)} wide>
          <form onSubmit={submit} style={{ display: "grid", gap: "var(--space-lg)" }}>
            <div className="form-row">
              <div className="form-group">
                <label>Customer name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <FieldError message={formErrors?.name?.[0]} />
              </div>
              <div className="form-group">
                <label>Business name *</label>
                <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
                <FieldError message={formErrors?.businessName?.[0]} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Mobile *</label>
                <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
                <FieldError message={formErrors?.mobile?.[0]} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <FieldError message={formErrors?.email?.[0]} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Customer type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Customer["type"] })}>
                  <option value="RETAIL">Retail</option>
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Customer["status"] })}>
                  <option value="LEAD">Lead</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label>GST number</label>
                <input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })} maxLength={15} />
                <FieldError message={formErrors?.gstNumber?.[0]} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Follow-up date</label>
                <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Shop no., street, city, pincode" />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Preferences, payment terms…" />
            </div>
            {formErrors?.form && <div className="alert alert-danger">{formErrors.form[0]}</div>}
            <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => setFormOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create customer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}