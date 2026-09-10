import { useState } from "react";

import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

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
        <div>
          <h1>Nirvana Ops</h1>
          <p>
            Order desk for a wholesale &amp; distribution business — customers, inventory,
            stock movements and sales challans in one place.
          </p>
        </div>
      </div>
      <div className="login-right">
        <form className="login-card" onSubmit={onSubmit}>
          <div>
            <h2>Sign in</h2>
            <p className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-light)" }}>
              Role-based access · JWT
            </p>
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

          <div className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-light)" }}>
            Demo accounts — password <strong>demo@12345</strong>
            <br />
            admin@nirvana.in · sales@nirvana.in
            <br />
            warehouse@nirvana.in · accounts@nirvana.in
          </div>
        </form>
      </div>
    </div>
  );
}