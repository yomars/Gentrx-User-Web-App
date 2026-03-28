import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");
          if (!normalizedId.includes("node_modules")) return;

          if (normalizedId.includes("react-router")) {
            return "vendor-router";
          }

          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react-core";
          }

          if (
            normalizedId.includes("react-hook-form") ||
            normalizedId.includes("react-icons") ||
            normalizedId.includes("lucide-react")
          ) {
            return "vendor-react-ecosystem";
          }

          if (
            normalizedId.includes("@chakra-ui") ||
            normalizedId.includes("@emotion") ||
            normalizedId.includes("framer-motion")
          ) {
            return "vendor-ui";
          }

          if (
            normalizedId.includes("chart.js") ||
            normalizedId.includes("apexcharts") ||
            normalizedId.includes("recharts")
          ) {
            return "vendor-charts";
          }

          if (normalizedId.includes("swiper") || normalizedId.includes("react-slick")) {
            return "vendor-sliders";
          }

          if (normalizedId.includes("firebase")) {
            return "vendor-firebase";
          }

          if (normalizedId.includes("lottie")) {
            return "vendor-lottie";
          }

          if (normalizedId.includes("@fullcalendar")) {
            return "vendor-calendar";
          }

          if (normalizedId.includes("@react-google-maps/api")) {
            return "vendor-maps";
          }

          if (normalizedId.includes("react-calendar") || normalizedId.includes("react-date-picker") || normalizedId.includes("wojtekmaj")) {
            return "vendor-datepickers";
          }

          if (normalizedId.includes("moment")) {
            return "vendor-moment";
          }

          if (normalizedId.includes("axios")) {
            return "vendor-network";
          }

          if (normalizedId.includes("dompurify")) {
            return "vendor-sanitize";
          }

          if (normalizedId.includes("lodash")) {
            return "vendor-lodash";
          }

          return "vendor-misc";
        },
      },
    },
  },
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
