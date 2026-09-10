import { Router } from "express";

import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/http";
import { dashboardSummary } from "./dashboard.service";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);

dashboardRoutes.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    res.json(await dashboardSummary());
  })
);