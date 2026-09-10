import { badRequest } from "./http";

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export const MAX_PAGE_SIZE = 100;

/** Parses ?page & ?pageSize from query params with sane defaults and bounds. */
export function parsePagination(query: Record<string, unknown>): Pagination {
  const rawPage = query.page;
  const rawSize = query.pageSize ?? query.limit;

  let page = rawPage === undefined ? 1 : Number(rawPage);
  let pageSize = rawSize === undefined ? 20 : Number(rawSize);

  if (!Number.isInteger(page) || page < 1) {
    throw badRequest("`page` must be a positive integer");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw badRequest(`\`pageSize\` must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function buildMeta(p: Pagination, total: number): PageMeta {
  const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / p.pageSize));
  return {
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages,
    hasNextPage: p.page < totalPages,
    hasPrevPage: p.page > 1,
  };
}