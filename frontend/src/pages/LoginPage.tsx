import { useState } from "react";

import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

const FEATURES = [
  "Customer CRM with follow-up tracking",
  "Inventory control with stock movement ledger",
  "Sales challans — draft, confirm, cancel",
];

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in right now");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-left">
        <div className="login-left-inner">
          <span className="brand-mark">N</span>
          <div>
            <h1>Nirvana Ops</h1>
            <p className="login-tagline">
              The order desk for a wholesale &amp; distribution business — customers,
              inventory, stock movements and sales challans in one place.
            </p>
          </div>
          <ul className="login-features">
            {FEATURES.map((f) => (
              <li key={f}>
                <span className="feature-dot" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={onSubmit}>
          <div style={{ display: "grid", gap: "0.15rem" }}>
            <span className="brand-mark">N</span>
            <h2>Sign in to console</h2>
            <span className="login-sub">Role-based access · JWT</span>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="you@company.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <div className="demo-hint">
            <div style={{ marginBottom: "0.3rem" }}>
              Demo password: <span className="mono">demo@12345</span>
            </div>
            <div className="mono">admin@nirvana.in &nbsp;·&nbsp; Admin</div>
            <div className="mono">sales@nirvana.in &nbsp;·&nbsp; Sales</div>
            <div className="mono">warehouse@nirvana.in &nbsp;·&nbsp; Warehouse</div>
            <div className="mono">accounts@nirvana.in &nbsp;·&nbsp; Accounts</div>
          </div>
        </form>
      </div>
    </div>
  );
}