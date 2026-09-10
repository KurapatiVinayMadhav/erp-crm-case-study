import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

import { env } from "../config/env";
import { forbidden, unauthorized } from "../utils/http";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}

export interface JwtPayload extends AuthUser {
  iat: number;
  exp: number;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] }
  );
}

/** Requires a valid `Authorization: Bearer <token>` header. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(unauthorized());
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch {
    return next(unauthorized("Invalid or expired token"));
  }
}

/** Requires the authenticated user to have one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(
        forbidden(
          `This action requires the ${roles.join(" or ")} role. Your role is ${req.user.role}.`
        )
      );
    }
    return next();
  };
}

/** True when a role is allowed to run the given capability. Centralises role policy. */
export const can = {
  viewCustomers: [Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS],
  manageCustomers: [Role.ADMIN, Role.SALES],
  manageProducts: [Role.ADMIN, Role.WAREHOUSE],
  recordStock: [Role.ADMIN, Role.WAREHOUSE],
  createChallans: [Role.ADMIN, Role.SALES],
  confirmChallans: [Role.ADMIN, Role.WAREHOUSE],
  cancelChallans: [Role.ADMIN],
  viewAll: [Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS],
};