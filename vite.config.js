import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: "https://gentrx.com.ph",
        changeOrigin: true,
        secure: true,
      },
      "/storage": {
        target: "https://gentrx.com.ph",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
