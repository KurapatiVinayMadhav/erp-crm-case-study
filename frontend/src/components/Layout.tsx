import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { initials, roleLabel } from "../lib/roles";

type IconProps = { size?: number };

function DashboardIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function UsersIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 20a4.5 4.5 0 0 0-4-4.47" />
    </svg>
  );
}

function PackageIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  );
}

function LedgerIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4v16" />
      <path d="M11 8L7 4L3 8" />
      <path d="M17 20V4" />
      <path d="M21 16l-4 4l-4-4" />
    </svg>
  );
}

function ChallanIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function LogOutIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5l-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

const NAV = [
  {
    section: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: <DashboardIcon /> }],
  },
  {
    section: "Operations",
    items: [
      { to: "/challans", label: "Sales Challans", icon: <ChallanIcon /> },
      { to: "/stock", label: "Stock Ledger", icon: <LedgerIcon /> },
    ],
  },
  {
    section: "Data",
    items: [
      { to: "/customers", label: "Customers", icon: <UsersIcon /> },
      { to: "/products", label: "Products & Stock", icon: <PackageIcon /> },
    ],
  },
];

const TITLES: Record<string, { kicker: string; title: string }> = {
  "/": { kicker: "Overview", title: "Operations dashboard" },
  "/customers": { kicker: "Data", title: "Customers" },
  "/products": { kicker: "Data", title: "Products & stock" },
  "/stock": { kicker: "Operations", title: "Stock movement ledger" },
  "/challans": { kicker: "Operations", title: "Sales challans" },
  "/challans/new": { kicker: "Operations", title: "New sales challan" },
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const meta =
    TITLES[pathname] ??
    (pathname.startsWith("/customers/")
      ? { kicker: "Data", title: "Customer detail" }
      : pathname.startsWith("/challans/")
        ? { kicker: "Operations", title: "Challan detail" }
        : { kicker: "Nirvana Ops", title: "Distribution console" });

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">N</span>
          <span>
            <span className="brand-name">Nirvana Ops</span>
            <span className="brand-sub">Distribution console</span>
          </span>
        </div>
        <nav>
          {NAV.map((group) => (
            <div key={group.section}>
              <span className="nav-sec">{group.section}</span>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === "/"}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          {user && (
            <div className="user-card">
              <span className="avatar">{initials(user.name)}</span>
              <span className="user-meta">
                <span className="user-name">{user.name || "Operator"}</span>
                <span className="user-role">{roleLabel(user.role)}</span>
              </span>
              <button className="logout-btn" onClick={logout} title="Sign out" aria-label="Sign out">
                <LogOutIcon />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <span>
            <span className="topbar-kicker">{meta.kicker}</span>
            <h2>{meta.title}</h2>
          </span>
          <div className="topbar-actions">
            {user && (
              <>
                <span className="role-pill">{roleLabel(user.role)}</span>
                <span
                  className="avatar"
                  style={{ width: 30, height: 30, fontSize: "0.7rem" }}
                  title={user.name}
                >
                  {initials(user.name)}
                </span>
              </>
            )}
          </div>
        </header>
        <main className="page-body">{children}</main>
      </div>
    </>
  );
}