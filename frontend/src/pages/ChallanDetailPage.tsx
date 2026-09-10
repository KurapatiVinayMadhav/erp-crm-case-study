import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { can } from "../lib/roles";
import { fmtDateTime, fmtMoney } from "../lib/format";
import type { Challan } from "../lib/types";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge badge-draft",
  CONFIRMED: "badge badge-confirmed",
  CANCELLED: "badge badge-cancelled",
};

export function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      setChallan(await api.get<Challan>(`/api/v1/challans/${id}`));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load challan");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!challan) return <div className="mono" style={{ color: "var(--ink-muted)" }}>loading…</div>;

  const totals = (challan.items ?? []).reduce(
    (acc, it) => ({ qty: acc.qty + it.quantity, amount: acc.amount + it.amount }),
    { qty: 0, amount: 0 }
  );

  const confirm = async () => {
    if (!window.confirm(`Confirm ${challan.challanNumber}? Stock for every line will be deducted.`)) return;
    setBusy("confirm");
    setNotice(null);
    try {
      setChallan(await api.post<Challan>(`/api/v1/challans/${challan.id}/confirm`));
      setNotice("Challan confirmed — warehouse stock has been reduced.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not confirm challan");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!window.confirm(`Cancel ${challan.challanNumber}? Stock will be returned to the product balances.`)) return;
    setBusy("cancel");
    setNotice(null);
    try {
      setChallan(await api.post<Challan>(`/api/v1/challans/${challan.id}/cancel`));
      setNotice("Challan cancelled — stock restored.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel challan");
    } finally {
      setBusy(null);
    }
  };

  const canConfirm = user ? can.confirmChallans(user.role) : false;
  const canCancel = user ? can.cancelChallans(user.role) : false;

  return (
    <div style={{ display: "grid", gap: "var(--space-xl)", maxWidth: 860 }}>
      <div className="detail-header">
        <div>
          <div className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-light)", marginBottom: "0.2rem" }}>
            SALES CHALLAN
          </div>
          <h1>{challan.challanNumber}</h1>
          <div className="challan-status-row" style={{ marginTop: "0.4rem" }}>
            <span className={STATUS_BADGE[challan.status]}>{challan.status.toLowerCase()}</span>
            <span className="mono" style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>
              created {fmtDateTime(challan.createdAt)} by {challan.createdBy.name}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn" onClick={() => window.print()}>Print / PDF</button>
          {canConfirm && challan.status === "DRAFT" && (
            <button className="btn btn-success" onClick={confirm} disabled={busy !== null}>
              {busy === "confirm" ? "Confirming…" : "Confirm challan"}
            </button>
          )}
          {canCancel && challan.status === "CONFIRMED" && (
            <button className="btn btn-danger" onClick={cancel} disabled={busy !== null}>
              {busy === "cancel" ? "Cancelling…" : "Cancel challan"}
            </button>
          )}
        </div>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Customer</h3>
          <Link to={`/customers/${challan.customer.id}`} className="mono" style={{ fontSize: "0.72rem" }}>open customer →</Link>
        </div>
        <div className="detail-grid">
          <div className="detail-field">
            <div className="detail-label">Name</div>
            <div className="detail-value">{challan.customer.name}</div>
          </div>
          <div className="detail-field">
            <div className="detail-label">Business</div>
            <div className="detail-value">{challan.customer.businessName}</div>
          </div>
          <div className="detail-field">
            <div className="detail-label">Mobile</div>
            <div className="detail-value mono">{challan.customer.mobile}</div>
          </div>
          <div className="detail-field">
            <div className="detail-label">GST</div>
            <div className="detail-value mono">{challan.customer.gstNumber ?? "—"}</div>
          </div>
          <div className="detail-field" style={{ gridColumn: "1 / -1" }}>
            <div className="detail-label">Address</div>
            <div className="detail-value">{challan.customer.address ?? "—"}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>SKU</th>
                <th className="align-right">Unit price</th>
                <th className="align-right">Qty</th>
                <th className="align-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(challan.items ?? []).map((it, i) => (
                <tr key={it.id}>
                  <td className="mono">{String(i + 1).padStart(2, "0")}</td>
                  <td style={{ fontWeight: 600 }}>{it.productName}</td>
                  <td className="mono">{it.sku}</td>
                  <td className="align-right">{fmtMoney(it.unitPrice)}</td>
                  <td className="align-right mono">{it.quantity}</td>
                  <td className="align-right mono">{fmtMoney(it.amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4}></td>
                <td className="align-right mono" style={{ fontWeight: 700 }}>Total {totals.qty}</td>
                <td className="align-right mono" style={{ fontWeight: 700 }}>{fmtMoney(totals.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-light)" }}>
        Line items keep a snapshot of product name, SKU and unit price at the time of creation. Confirming reduces
        available stock and records stock-OUT movements; cancellation restores stock.
      </div>
    </div>
  );
}