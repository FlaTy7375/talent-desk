import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(root, "src");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@app": path.resolve(src, "app"),
      "@pages": path.resolve(src, "pages"),
      "@widgets": path.resolve(src, "widgets"),
      "@features": path.resolve(src, "features"),
      "@entities": path.resolve(src, "entities"),
      "@shared": path.resolve(src, "shared"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
