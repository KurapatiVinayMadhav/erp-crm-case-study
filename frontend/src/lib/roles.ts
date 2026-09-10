export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  SALES: "Sales",
  WAREHOUSE: "Warehouse",
  ACCOUNTS: "Accounts",
};

export const roleLabel = (role: Role) => ROLE_LABEL[role] ?? role;

/** Who can do what across the UI. Mirrors backend role policy. */
export const can = {
  manageCustomers: (role: Role) => role === "ADMIN" || role === "SALES",
  manageStock: (role: Role) => role === "ADMIN" || role === "WAREHOUSE",
  createChallans: (role: Role) => role === "ADMIN" || role === "SALES",
  confirmChallans: (role: Role) => role === "ADMIN" || role === "WAREHOUSE",
  cancelChallans: (role: Role) => role === "ADMIN",
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");