import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

export type Source = "body" | "query" | "params";

/**
 * Validates a request section against a Zod schema before the handler runs.
 * Throws a 400 with a structured `errors` map when validation fails.
 */
export function validate(schema: ZodTypeAny, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(result.error);
    }
    // Replace the validated section with its parsed (defaulted) value.
    (req as unknown as Record<string, unknown>)[source] = result.data;
    return next();
  };
}