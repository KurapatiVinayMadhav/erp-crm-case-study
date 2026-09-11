import { useEffect } from "react";

import type { PageMeta } from "../lib/format";

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(19,26,40,0.5)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 1rem",
        zIndex: 100,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: wide ? 720 : 480,
          padding: "var(--space-xl)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "var(--space-lg)",
          }}
        >
          <h2 style={{ fontSize: "1.2rem" }}>{title}</h2>
          <button
            className="btn btn-sm"
            onClick={onClose}
            aria-label="Close"
            style={{ padding: "0.2rem 0.5rem" }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Pager({
  meta,
  onPage,
}: {
  meta: PageMeta;
  onPage: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <button disabled={!meta.hasPrevPage} onClick={() => onPage(meta.page - 1)}>
        ← Prev
      </button>
      <span>
        Page {meta.page} of {Math.max(meta.totalPages, 1)} · {meta.total} records
      </span>
      <button disabled={!meta.hasNextPage} onClick={() => onPage(meta.page + 1)}>
        Next →
      </button>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="error-text">{message}</div>;
}

export function sectionHeader(sub: string) {
  return (
    <span className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {sub}
    </span>
  );
}