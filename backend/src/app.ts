import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authRoutes } from "./modules/auth/auth.routes";
import { customerRoutes } from "./modules/customers/customer.routes";
import { productRoutes, stockRoutes } from "./modules/products/product.routes";
import { challanRoutes } from "./modules/challans/challan.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "erp-crm-api", time: new Date().toISOString() });
  });

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later" },
  });

  app.use("/api/v1", apiLimiter);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/customers", customerRoutes);
  app.use("/api/v1/products", productRoutes);
  app.use("/api/v1/stock-movements", stockRoutes);
  app.use("/api/v1/challans", challanRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}