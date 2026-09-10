import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { initials, roleLabel } from "../lib/roles";

const NAV = [
  { to: "/", idx: "01", label: "Dashboard" },
  { to: "/customers", idx: "02", label: "Customers" },
  { to: "/products", idx: "03", label: "Products & Stock" },
  { to: "/stock", idx: "04", label: "Stock Ledger" },
  { to: "/challans", idx: "05", label: "Sales Challans" },
];

const TITLES: Record<string, string> = {
  "/": "Operations dashboard",
  "/customers": "Customers",
  "/products": "Products & stock",
  "/stock": "Stock movement ledger",
  "/challans": "Sales challans",
  "/challans/new": "New sales challan",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/customers/")
      ? "Customer"
      : pathname.startsWith("/challans/")
        ? "Challan"
        : "Nirvana Ops");

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Nirvana Ops</h1>
          <span>Distribution console</span>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              <span className="nav-idx">{item.idx}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {user && (
            <>
              <span className="user-name">{user.name || "Operator"}</span>
              <span className="user-role">{roleLabel(user.role)}</span>
              <button className="btn btn-sm" onClick={logout} style={{ marginTop: "0.5rem" }}>
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <h2>{title}</h2>
          <div className="topbar-actions">
            {user && (
              <span
                style={{
                  width: 26,
                  height: 26,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
                title={user.name}
              >
                {initials(user.name)}
              </span>
            )}
          </div>
        </header>
        <main className="page-body">{children}</main>
      </div>
    </>
  );
}