import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  // Default to live VPS data (https://arise-digital-store.vercel.app) or local backend if VITE_API_URL is configured
  const apiTarget = env.VITE_API_URL || "https://arise-digital-store.vercel.app";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: "localhost",
        },
      },
    },
    build: { sourcemap: false },
  };
});
