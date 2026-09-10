import { Router } from "express";

import { can, requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/http";
import { validate } from "../../middleware/validate";
import {
  customerCreateSchema,
  customerQuerySchema,
  customerUpdateSchema,
  followUpCreateSchema,
} from "./customer.schemas";
import {
  addFollowUp,
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  listFollowUps,
  updateCustomer,
} from "./customer.service";

export const customerRoutes = Router();

customerRoutes.use(requireAuth);

customerRoutes.get(
  "/",
  validate(customerQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listCustomers(req.query, req.user.id));
  })
);

customerRoutes.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getCustomer(req.params.id));
  })
);

customerRoutes.post(
  "/",
  requireRole(...can.manageCustomers),
  validate(customerCreateSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createCustomer(req.body, req.user.id));
  })
);

customerRoutes.patch(
  "/:id",
  requireRole(...can.manageCustomers),
  validate(customerUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json(await updateCustomer(req.params.id, req.body));
  })
);

customerRoutes.delete(
  "/:id",
  requireRole(...can.manageCustomers),
  asyncHandler(async (req, res) => {
    res.json(await deleteCustomer(req.params.id));
  })
);

customerRoutes.get(
  "/:id/followups",
  asyncHandler(async (req, res) => {
    res.json(await listFollowUps(req.params.id));
  })
);

customerRoutes.post(
  "/:id/followups",
  requireRole(...can.manageCustomers),
  validate(followUpCreateSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await addFollowUp(req.params.id, req.body, req.user.id));
  })
);