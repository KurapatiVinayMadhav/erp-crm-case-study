import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

/** Error that maps directly to an HTTP response. */
export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = "HttpError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
export const unauthorized = (message = "Authentication required") =>
  new HttpError(401, message);
export const forbidden = (message = "You do not have permission to do this") =>
  new HttpError(403, message);
export const notFound = (resource: string) =>
  new HttpError(404, `${resource} not found`);
export const conflict = (message: string) => new HttpError(409, message);

/** Wraps an async route handler so thrown errors reach the error middleware. */
export const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

/** Formats a Zod error into a plain object for API consumers. */
export function formatZodError(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = [];
    const msg =
      issue.message.length > 200 ? issue.message.slice(0, 197) + "..." : issue.message;
    out[key].push(msg);
  }
  return out;
}