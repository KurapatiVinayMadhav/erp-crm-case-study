import { Prisma, StockMovementType } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { buildMeta, parsePagination } from "../../utils/pagination";
import { badRequest, conflict, notFound } from "../../utils/http";
import { toNumber } from "../../utils/money";
import type {
  ProductCreateInput,
  ProductUpdateInput,
  StockMovementCreateInput,
} from "./product.schemas";

const productSelect = {
  id: true,
  name: true,
  sku: true,
  category: true,
  unitPrice: true,
  currentStock: true,
  minStock: true,
  location: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

function serializeProduct<T extends { unitPrice: { toString(): string } }>(p: T) {
  return { ...p, unitPrice: toNumber(p.unitPrice) };
}

export async function listProducts(query: Record<string, unknown>) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const search = typeof query.search === "string" ? query.search.trim() : undefined;
  const category = typeof query.category === "string" ? query.category.trim() : undefined;
  const lowStockRaw =
    (typeof query.lowStock === "string" && query.lowStock) || undefined;

  const where: Prisma.ProductWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
    ...(lowStockRaw === "true" || lowStockRaw === "1"
      ? { currentStock: { lte: prisma.product.fields.minStock } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productSelect,
      orderBy: [{ currentStock: "asc" }, { name: "asc" }],
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return { items: items.map(serializeProduct), meta: buildMeta({ page, pageSize, skip, take }, total) };
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw notFound("Product");
  return serializeProduct(product);
}

export async function createProduct(input: ProductCreateInput) {
  try {
    const product = await prisma.product.create({
      data: {
        name: input.name,
        sku: input.sku,
        category: input.category,
        unitPrice: input.unitPrice,
        currentStock: input.currentStock,
        minStock: input.minStock,
        location: input.location ?? null,
      },
      select: productSelect,
    });
    return serializeProduct(product);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw conflict(`A product with SKU "${input.sku}" already exists`);
    }
    throw err;
  }
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound("Product");

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        sku: input.sku,
        category: input.category,
        unitPrice: input.unitPrice,
        minStock: input.minStock,
        location: input.location !== undefined ? input.location ?? null : undefined,
        // currentStock intentionally NOT editable via this endpoint; use stock movements.
      },
      select: productSelect,
    });
    return serializeProduct(product);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw conflict(`A product with SKU "${input.sku}" already exists`);
    }
    throw err;
  }
}

export async function adjustStock(
  input: StockMovementCreateInput,
  userId: string,
  opts: { source?: string } = {}
) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw notFound("Product");

  const delta = input.type === StockMovementType.IN ? input.quantityChanged : -input.quantityChanged;
  const nextStock = toNumber(product.currentStock) + delta;

  if (nextStock < 0) {
    throw badRequest(
      `Insufficient stock for "${product.name}" (SKU ${product.sku}). ` +
        `Available: ${product.currentStock}, requested out: ${input.quantityChanged}`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: product.id },
      data: { currentStock: nextStock },
      select: productSelect,
    });
    const movement = await tx.stockMovement.create({
      data: {
        productId: product.id,
        quantityChanged: input.quantityChanged,
        type: input.type,
        reason: opts.source ? `${opts.source}: ${input.reason}` : input.reason,
        createdById: userId,
      },
      select: {
        id: true,
        productId: true,
        quantityChanged: true,
        type: true,
        reason: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, role: true } },
        product: { select: { id: true, name: true, sku: true, currentStock: true } },
      },
    });
    return { updated, movement };
  });

  return {
    product: {
      id: result.updated.id,
      name: result.movement.product.name,
      sku: result.movement.product.sku,
      currentStock: toNumber(result.movement.product.currentStock),
    },
    movement: {
      id: result.movement.id,
      productId: result.movement.productId,
      quantityChanged: result.movement.quantityChanged,
      type: result.movement.type,
      reason: result.movement.reason,
      createdAt: result.movement.createdAt,
      createdBy: result.movement.createdBy,
      product: {
        id: result.movement.product.id,
        name: result.movement.product.name,
        sku: result.movement.product.sku,
      },
    },
  };
}

export async function listStockMovements(query: Record<string, unknown>) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const productId = typeof query.productId === "string" && query.productId ? query.productId : undefined;
  const type = typeof query.type === "string" && query.type ? (query.type as StockMovementType) : undefined;

  const where: Prisma.StockMovementWhereInput = {
    ...(productId ? { productId } : {}),
    ...(type ? { type } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        quantityChanged: true,
        type: true,
        reason: true,
        createdAt: true,
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { items, meta: buildMeta({ page, pageSize, skip, take }, total) };
}