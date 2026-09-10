import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During local development Vite proxies API calls to the Express server so
// the browser only talks to one origin. The proxy target can be overridden
// with the VITE_PROXY_TARGET env var.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});