import { Router } from "express";

import { can, requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/http";
import { validate } from "../../middleware/validate";
import {
  productCreateSchema,
  productQuerySchema,
  productUpdateSchema,
  stockMovementCreateSchema,
  stockQuerySchema,
} from "./product.schemas";
import {
  adjustStock,
  createProduct,
  getProduct,
  listProducts,
  listStockMovements,
  updateProduct,
} from "./product.service";

export const productRoutes = Router();
export const stockRoutes = Router();

productRoutes.use(requireAuth);

productRoutes.get(
  "/",
  validate(productQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listProducts(req.query));
  })
);

productRoutes.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getProduct(req.params.id));
  })
);

productRoutes.post(
  "/",
  requireRole(...can.manageProducts),
  validate(productCreateSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createProduct(req.body));
  })
);

productRoutes.patch(
  "/:id",
  requireRole(...can.manageProducts),
  validate(productUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json(await updateProduct(req.params.id, req.body));
  })
);

// Stock movements -------------------------------------------------------

stockRoutes.use(requireAuth);

stockRoutes.get(
  "/",
  validate(stockQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listStockMovements(req.query));
  })
);

stockRoutes.post(
  "/",
  requireRole(...can.recordStock),
  validate(stockMovementCreateSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await adjustStock(req.body, req.user.id));
  })
);