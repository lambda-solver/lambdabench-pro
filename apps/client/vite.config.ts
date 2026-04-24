import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // Base URL for GitHub Pages — set VITE_BASE_URL in .env, e.g. /lambench-pro/
  base: process.env.VITE_BASE_URL ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["@repo/domain"],
  },
  server: {
    strictPort: true,
    host: "127.0.0.1",
    port: 3000,
  },
});
