import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { can } from "../lib/roles";
import { fmtDate, fmtDateTime } from "../lib/format";
import type { Customer, FollowUp } from "../lib/types";

const TYPE_LABEL: Record<string, string> = { RETAIL: "Retail", WHOLESALE: "Wholesale", DISTRIBUTOR: "Distributor" };
const STATUS_BADGE: Record<string, string> = {
  LEAD: "badge badge-lead",
  ACTIVE: "badge badge-active",
  INACTIVE: "badge badge-inactive",
};

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canManage = user ? can.manageCustomers(user.role) : false;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    try {
      setCustomer(await api.get<Customer>(`/api/v1/customers/${id}`));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load customer");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!customer) return <div className="mono" style={{ color: "var(--ink-muted)" }}>loading…</div>;

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setPosting(true);
    try {
      await api.post<FollowUp>(`/api/v1/customers/${customer.id}/followups`, { note });
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add note");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-xl)" }}>
      <div className="detail-header">
        <div>
          <div className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-light)", marginBottom: "0.2rem" }}>
            CUSTOMER / {customer.gstNumber ?? customer.type}
          </div>
          <h1>{customer.name}</h1>
          <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className={STATUS_BADGE[customer.status]}>{customer.status.toLowerCase()}</span>
            <span className={`badge badge-${customer.type.toLowerCase()}`}>{TYPE_LABEL[customer.type]}</span>
          </div>
        </div>
        <Link to="/customers" className="btn">← All customers</Link>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Business details</h3>
          <span className="card-sub">account card</span>
        </div>
        <div className="detail-grid">
          <div className="detail-field">
            <div className="detail-label">Business</div>
            <div className="detail-value">{customer.businessName}</div>
          </div>
          <div className="detail-field">
            <div className="detail-label">Email</div>
            <div className="detail-value">{customer.email ?? "—"}</div>
          </div>
          <div className="detail-field">
            <div className="detail-label">Mobile</div>
            <div className="detail-value mono">{customer.mobile}</div>
          </div>
          <div className="detail-field">
            <div className="detail-label">Next follow-up</div>
            <div className="detail-value">{fmtDate(customer.followUpDate)}</div>
          </div>
          <div className="detail-field">
            <div className="detail-label">Created</div>
            <div className="detail-value">{fmtDate(customer.createdAt)}</div>
          </div>
          <div className="detail-field">
            <div className="detail-label">Last updated</div>
            <div className="detail-value">{fmtDateTime(customer.updatedAt)}</div>
          </div>
          <div className="detail-field" style={{ gridColumn: "1 / -1" }}>
            <div className="detail-label">Address</div>
            <div className="detail-value">{customer.address ?? "—"}</div>
          </div>
          {customer.notes && (
            <div className="detail-field" style={{ gridColumn: "1 / -1" }}>
              <div className="detail-label">Notes</div>
              <div className="detail-value">{customer.notes}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Follow-up history</h3>
          <span className="card-sub">{customer.followUps?.length ?? 0} entries</span>
        </div>

        {canManage && (
          <form onSubmit={addNote} style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-lg)", alignItems: "flex-end" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Add follow-up note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Last call summary, next steps, reminders…"
                style={{ minHeight: 56 }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={posting || !note.trim()}>
              {posting ? "Adding…" : "+ Add note"}
            </button>
          </form>
        )}

        {customer.followUps && customer.followUps.length > 0 ? (
          <div>
            {customer.followUps.map((f) => (
              <div key={f.id} className="followup-item">
                <div className="followup-meta">
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{f.createdBy.name}</span>
                  {" · "}
                  {fmtDateTime(f.createdAt)}
                </div>
                <div>{f.note}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No follow-ups logged yet.</div>
        )}
      </div>
    </div>
  );
}