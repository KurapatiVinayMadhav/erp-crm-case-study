import { prisma } from "../../lib/prisma";
import { buildMeta } from "../../utils/pagination";
import { toNumber } from "../../utils/money";

export async function dashboardSummary() {
  const [customerStats, productStats, challanStats, lowStock, recentChallans, recentMovements] =
    await Promise.all([
      prisma.customer.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.$queryRawUnsafe<{ category: string; count: bigint }[]>(
        `SELECT category, COUNT(*)::int AS count FROM "Product" GROUP BY category ORDER BY count DESC`
      ),
      prisma.challan.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.product.findMany({
        where: { currentStock: { lte: prisma.product.fields.minStock } },
        orderBy: { currentStock: "asc" },
        take: 6,
        select: { id: true, name: true, sku: true, category: true, currentStock: true, minStock: true },
      }),
      prisma.challan.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          challanNumber: true,
          status: true,
          totalQuantity: true,
          createdAt: true,
          customer: { select: { id: true, name: true, businessName: true } },
        },
      }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          quantityChanged: true,
          type: true,
          reason: true,
          createdAt: true,
          product: { select: { id: true, name: true, sku: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

  const countsFor = (rows: { status: string; _count: { _all: number } }[]) =>
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = r._count._all;
      return acc;
    }, {});

  return {
    customers: {
      total: customerStats.reduce((s, r) => s + r._count._all, 0),
      byStatus: countsFor(customerStats),
    },
    products: {
      total: productStats.reduce((s, r) => s + Number(r.count), 0),
      lowStock: lowStock.map((p) => ({ ...p })),
      byCategory: productStats.map((r) => ({ category: r.category, count: Number(r.count) })),
    },
    challans: {
      total: challanStats.reduce((s, r) => s + r._count._all, 0),
      byStatus: countsFor(challanStats),
    },
    lowStock,
    recentChallans,
    recentMovements,
    meta: undefined as unknown,
  };
}

export async function lowStockPaged(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1);
  const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
  const where = { currentStock: { lte: prisma.product.fields.minStock } } as const;
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { currentStock: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, sku: true, category: true, unitPrice: true, currentStock: true, minStock: true, location: true },
    }),
    prisma.product.count({ where }),
  ]);
  return {
    items: items.map((p) => ({ ...p, unitPrice: toNumber(p.unitPrice) })),
    meta: buildMeta({ page, pageSize, skip: (page - 1) * pageSize, take: pageSize }, total),
  };
}