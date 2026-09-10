import { Router } from "express";

import { asyncHandler } from "../../utils/http";
import { validate } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { loginSchema } from "./auth.schemas";
import { login, me } from "./auth.service";

export const authRoutes = Router();

authRoutes.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    res.json(await login(req.body));
  })
);

authRoutes.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await me(req.user.id) });
  })
);