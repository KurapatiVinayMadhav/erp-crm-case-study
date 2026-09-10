import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

import { env } from "../config/env";
import { formatZodError, HttpError } from "../utils/http";
import { ZodError } from "zod";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "Route not found"));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Validation errors from Zod.
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: formatZodError(err),
    });
  }

  // Our own HTTP errors carry an explicit status.
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message,
      ...(err.details !== undefined ? { errors: err.details } : {}),
    });
  }

  // Unique constraint violations -> 409 Conflict with a friendly message.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(", ")
        : "field";
      return res.status(409).json({ message: `A record with this ${target} already exists` });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Record not found" });
    }
  }

  // Anything else: log server-side, return a generic 500.
  if (env.nodeEnv !== "test") {
    console.error("[Unhandled error]", err);
  }
  return res.status(500).json({
    message: "Internal server error",
    ...(env.nodeEnv === "development" && err instanceof Error
      ? { details: err.message }
      : {}),
  });
}