import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), topLevelAwait()],
  optimizeDeps: {
    include: ["pdfjs-dist"],
  },
  server: {
    proxy: {
      "/api/conversion": {
        target: "http://10.64.1.55:8180",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/conversion/, "/cxf/conversion/v1"),
      },
    },
  },
});
