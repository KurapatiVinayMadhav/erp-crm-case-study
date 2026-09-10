import { Router } from "express";

import { can, requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/http";
import { validate } from "../../middleware/validate";
import { challanCreateSchema, challanQuerySchema } from "./challan.schemas";
import {
  cancelChallan,
  confirmChallan,
  createChallan,
  getChallan,
  listChallans,
} from "./challan.service";

export const challanRoutes = Router();

challanRoutes.use(requireAuth);

// Everyone with an account can read challans (sales needs them for follow-ups,
// accounts for billing, warehouse for dispatch).
challanRoutes.get(
  "/",
  validate(challanQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listChallans(req.query));
  })
);

challanRoutes.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getChallan(req.params.id));
  })
);

challanRoutes.post(
  "/",
  requireRole(...can.createChallans),
  validate(challanCreateSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createChallan(req.body, req.user.id));
  })
);

// Warehouse confirms challans after physically staging the goods.
challanRoutes.post(
  "/:id/confirm",
  requireRole(...can.confirmChallans),
  asyncHandler(async (req, res) => {
    res.json(await confirmChallan(req.params.id, req.user.id));
  })
);

// Cancellation is restricted to admins by default.
challanRoutes.post(
  "/:id/cancel",
  requireRole(...can.cancelChallans),
  asyncHandler(async (req, res) => {
    res.json(await cancelChallan(req.params.id, req.user.id));
  })
);