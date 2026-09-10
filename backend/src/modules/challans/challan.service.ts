import { ChallanStatus, Prisma, StockMovementType } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { buildMeta, parsePagination } from "../../utils/pagination";
import { badRequest, conflict, notFound } from "../../utils/http";
import { toNumber } from "../../utils/money";
import type { ChallanCreateInput } from "./challan.schemas";

const challanSelect = {
  id: true,
  challanNumber: true,
  status: true,
  totalQuantity: true,
  createdAt: true,
  updatedAt: true,
  confirmedAt: true,
  cancelledAt: true,
  customer: {
    select: { id: true, name: true, businessName: true, mobile: true, address: true, gstNumber: true },
  },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ChallanSelect;

const challanItemSelect = {
  id: true,
  productId: true,
  productName: true,
  sku: true,
  unitPrice: true,
  quantity: true,
  amount: true,
} satisfies Prisma.ChallanItemSelect;

const challanWithItemsSelect = {
  ...challanSelect,
  items: { orderBy: { id: "asc" } as const, select: challanItemSelect },
};

function serializeItems<
  T extends { unitPrice: { toString(): string }; amount: { toString(): string } }
>(items: T[]) {
  return items.map((it) => ({
    ...it,
    unitPrice: toNumber(it.unitPrice),
    amount: toNumber(it.amount),
  }));
}

async function reduceStockForItems(
  tx: Prisma.TransactionClient,
  items: { productId: string; quantity: number; productName: string; sku: string }[],
  challanNumber: string,
  userId: string
) {
  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) continue;
    const next = toNumber(product.currentStock) - item.quantity;
    if (next < 0) {
      throw badRequest(
        `Insufficient stock for "${item.productName}" (SKU ${item.sku}): available ${toNumber(
          product.currentStock
        )}, needed ${item.quantity}`
      );
    }
    await tx.product.update({ where: { id: product.id }, data: { currentStock: next } });
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        quantityChanged: item.quantity,
        type: StockMovementType.OUT,
        reason: `Sales challan ${challanNumber}`,
        createdById: userId,
      },
    });
  }
}

/** Builds the next challan number: CHL-<YYYY>-<4-digit sequence>. */
async function nextChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CHL-${year}-`;
  const latest = await tx.challan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: "desc" },
    select: { challanNumber: true },
  });
  const lastSeq = latest ? Number(latest.challanNumber.slice(prefix.length)) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

export async function listChallans(query: Record<string, unknown>) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const status =
    typeof query.status === "string" && query.status
      ? (query.status as ChallanStatus)
      : undefined;
  const customerId = typeof query.customerId === "string" ? query.customerId : undefined;
  const search = typeof query.search === "string" ? query.search.trim() : undefined;

  const where: Prisma.ChallanWhereInput = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search
      ? {
          OR: [
            { challanNumber: { contains: search, mode: "insensitive" } },
            { customer: { name: { contains: search, mode: "insensitive" } } },
            { customer: { businessName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.challan.findMany({ where, select: challanSelect, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.challan.count({ where }),
  ]);

  return { items, meta: buildMeta({ page, pageSize, skip, take }, total) };
}

export async function getChallan(id: string) {
  const challan = await prisma.challan.findUnique({
    where: { id },
    select: challanWithItemsSelect,
  });
  if (!challan) throw notFound("Challan");
  return { ...challan, items: serializeItems(challan.items) };
}

function dedupeItems(items: { productId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const it of items) {
    merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.quantity);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Creates a challan with a product snapshot on every line.
 * A challan saved as a DRAFT does not touch stock; a challan saved directly
 * as CONFIRMED deducts stock in the same transaction.
 */
export async function createChallan(input: ChallanCreateInput, userId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw notFound("Customer");

  const items = dedupeItems(input.items);
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, sku: true, unitPrice: true, currentStock: true },
  });
  if (products.length !== ids.length) {
    const found = new Set(products.map((p) => p.id));
    throw badRequest(`Unknown product(s): ${ids.filter((id) => !found.has(id)).join(", ")}`);
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  const rows = items.map((it) => {
    const product = productMap.get(it.productId)!;
    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitPrice: product.unitPrice,
      quantity: it.quantity,
      amount: new Prisma.Decimal(product.unitPrice).mul(it.quantity),
    };
  });

  const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);
  const shouldConfirm = input.status === ChallanStatus.CONFIRMED;

  if (shouldConfirm) {
    const shortages = rows
      .map((r) => ({ sku: r.sku, name: r.productName, requested: r.quantity, available: toNumber(productMap.get(r.productId)!.currentStock) }))
      .filter((s) => s.requested > s.available);
    if (shortages.length > 0) {
      throw badRequest(
        "Not enough stock to confirm this challan. Shortages: " +
          shortages
            .map((s) => `"${s.name}" (SKU ${s.sku}) needs ${s.requested}, only ${s.available} available`)
            .join("; ")
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const challan = await tx.challan.create({
      data: {
        challanNumber: await nextChallanNumber(tx),
        customerId: customer.id,
        status: ChallanStatus.DRAFT,
        totalQuantity,
        createdById: userId,
        items: { create: rows },
      },
      select: challanWithItemsSelect,
    });

    if (!shouldConfirm) return challan;

    await reduceStockForItems(tx, challan.items, challan.challanNumber, userId);
    return tx.challan.update({
      where: { id: challan.id },
      data: { status: ChallanStatus.CONFIRMED, confirmedAt: new Date(), updatedAt: new Date() },
      select: challanWithItemsSelect,
    });
  });

  return { ...result, items: serializeItems(result.items) };
}

/** Confirms a draft challan and reduces stock; stock never goes negative. */
export async function confirmChallan(challanId: string, userId: string) {
  const challan = await prisma.challan.findUnique({
    where: { id: challanId },
    select: {
      id: true,
      challanNumber: true,
      status: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          productName: true,
          sku: true,
          product: { select: { id: true, currentStock: true } },
        },
      },
    },
  });
  if (!challan) throw notFound("Challan");

  if (challan.status !== ChallanStatus.DRAFT) {
    throw conflict(`Challan ${challan.challanNumber} is already ${challan.status.toLowerCase()}`);
  }

  const shortages = challan.items
    .map((item) => ({
      name: item.productName,
      sku: item.sku,
      requested: item.quantity,
      available: toNumber(item.product.currentStock),
    }))
    .filter((s) => s.requested > s.available);

  if (shortages.length > 0) {
    throw badRequest(
      "Not enough stock to confirm this challan. Shortages: " +
        shortages
          .map((s) => `"${s.name}" (SKU ${s.sku}) needs ${s.requested}, only ${s.available} available`)
          .join("; ")
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.challan.update({
      where: { id: challanId },
      data: { status: ChallanStatus.CONFIRMED, confirmedAt: new Date(), updatedAt: new Date() },
      select: challanWithItemsSelect,
    });
    await reduceStockForItems(tx, updated.items, updated.challanNumber, userId);
    return updated;
  });

  return { ...result, items: serializeItems(result.items) };
}

/** Cancels a confirmed challan, restoring the reserved stock. */
export async function cancelChallan(challanId: string, userId: string) {
  const challan = await prisma.challan.findUnique({
    where: { id: challanId },
    select: { id: true, challanNumber: true, status: true },
  });
  if (!challan) throw notFound("Challan");

  if (challan.status !== ChallanStatus.CONFIRMED) {
    throw conflict(
      challan.status === ChallanStatus.DRAFT
        ? `Only confirmed challans can be cancelled. ${challan.challanNumber} is a draft.`
        : `Challan ${challan.challanNumber} is already cancelled`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.challan.update({
      where: { id: challanId },
      data: { status: ChallanStatus.CANCELLED, cancelledAt: new Date(), updatedAt: new Date() },
      select: challanWithItemsSelect,
    });

    for (const item of updated.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantityChanged: item.quantity,
          type: StockMovementType.IN,
          reason: `Cancelled challan ${updated.challanNumber}`,
          createdById: userId,
        },
      });
    }

    return updated;
  });

  return { ...result, items: serializeItems(result.items) };
}