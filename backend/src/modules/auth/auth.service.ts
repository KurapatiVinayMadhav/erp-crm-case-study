import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { signToken } from "../../middleware/auth";
import { unauthorized } from "../../utils/http";
import type { LoginInput } from "./auth.schemas";

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
};

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });

  if (!user || !user.active) {
    throw unauthorized("Invalid email or password");
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw unauthorized("Invalid email or password");
  }

  const authUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = signToken(authUser);
  return { token, user: authUser };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUser,
  });
  if (!user) throw unauthorized("Account not found");
  return user;
}

/** Seed-time helper: create a user with a hashed password. */
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
  active?: boolean;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
      active: data.active ?? true,
    },
    select: publicUser,
  });
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}