export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const emptyMeta = (): PageMeta => ({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
});

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export const fmtMoney = (n: number | undefined | null) =>
  Number.isFinite(n)
    ? n!.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
    : "—";

export const fmtDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
};

/** today as YYYY-MM-DD for <input type="date"> defaults. */
export const todayInput = () => new Date().toISOString().slice(0, 10);