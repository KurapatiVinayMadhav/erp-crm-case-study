import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.port, () => {
  console.log(`[erp-crm] API ready on http://localhost:${env.port}/api/v1`);
  console.log(`[erp-crm] Health check: http://localhost:${env.port}/health`);
});