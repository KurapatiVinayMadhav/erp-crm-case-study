/** Prisma returns Decimal objects; expose them as plain JSON numbers. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value.toString());
}

export function toMoney(value: unknown): number {
  return toNumber(value);
}