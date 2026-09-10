import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { buildMeta, parsePagination } from "../../utils/pagination";
import { notFound } from "../../utils/http";
import type { CustomerCreateInput, CustomerUpdateInput, FollowUpCreateInput } from "./customer.schemas";

const customerSelect = {
  id: true,
  name: true,
  mobile: true,
  email: true,
  businessName: true,
  gstNumber: true,
  type: true,
  address: true,
  status: true,
  followUpDate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { challans: true } },
} satisfies Prisma.CustomerSelect;

export async function listCustomers(query: Record<string, unknown>, userId: string) {
  void userId;
  const { page, pageSize, skip, take } = parsePagination(query);

  const search = typeof query.search === "string" ? query.search.trim() : undefined;
  const status = typeof query.status === "string" && query.status ? (query.status as Prisma.EnumCustomerStatusFilter["equals"]) : undefined;
  const type = typeof query.type === "string" && query.type ? (query.type as Prisma.EnumCustomerTypeFilter["equals"]) : undefined;

  const where: Prisma.CustomerWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { businessName: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search } },
            { email: { contains: search, mode: "insensitive" } },
            { gstNumber: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: customerSelect,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, meta: buildMeta({ page, pageSize, skip, take }, total) };
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      ...customerSelect,
      followUps: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          note: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!customer) throw notFound("Customer");
  return customer;
}

export async function createCustomer(input: CustomerCreateInput, userId: string) {
  return prisma.customer.create({
    data: {
      ...input,
      createdById: userId,
      followUpDate: input.followUpDate ?? null,
    },
    select: customerSelect,
  });
}

export async function updateCustomer(id: string, input: CustomerUpdateInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw notFound("Customer");

  return prisma.customer.update({
    where: { id },
    data: {
      ...input,
      followUpDate: input.followUpDate !== undefined ? input.followUpDate : existing.followUpDate,
    },
    select: customerSelect,
  });
}

export async function deleteCustomer(id: string) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw notFound("Customer");
  await prisma.customer.delete({ where: { id } });
  return { deleted: true };
}

export async function addFollowUp(customerId: string, input: FollowUpCreateInput, userId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw notFound("Customer");

  const followUp = await prisma.followUp.create({
    data: {
      customerId,
      note: input.note,
      createdById: userId,
    },
    select: {
      id: true,
      note: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  // Touch the customer so it shows up first in the "recently updated" list.
  await prisma.customer.update({ where: { id: customerId }, data: { notes: customer.notes } });
  return followUp;
}

export async function listFollowUps(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw notFound("Customer");

  return prisma.followUp.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      note: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
}