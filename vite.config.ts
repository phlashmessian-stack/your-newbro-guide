import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separate chunks by functionality for easy post-deploy editing
        manualChunks(id: string) {
          // Vendor libs
          if (id.includes("node_modules")) {
            if (id.includes("react-dom")) return "vendor-react-dom";
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@tanstack")) return "vendor-query";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("lucide")) return "vendor-icons";
            if (id.includes("react")) return "vendor-react";
            return "vendor-misc";
          }
          // App pages
          if (id.includes("/pages/Landing")) return "page-landing";
          if (id.includes("/pages/Dashboard")) return "page-dashboard";
          if (id.includes("/pages/Admin")) return "page-admin";
          if (id.includes("/pages/NotFound")) return "page-notfound";
          // Admin components
          if (id.includes("/components/admin/")) return "admin-components";
          // Dashboard components
          if (id.includes("/components/dashboard/")) return "dashboard-components";
          // UI library
          if (id.includes("/components/ui/")) return "ui-components";
          // Auth & hooks
          if (id.includes("/contexts/") || id.includes("/hooks/")) return "app-logic";
          // Lib utils
          if (id.includes("/lib/")) return "app-lib";
        },
        // Readable filenames (no hashes for easier editing)
        chunkFileNames: "js/[name].js",
        entryFileNames: "js/[name].js",
        assetFileNames: (assetInfo: { name?: string }) => {
          const name = assetInfo.name || "";
          if (name.endsWith(".css")) return "css/[name][extname]";
          if (/\.(png|jpg|jpeg|gif|svg|ico|webp)$/.test(name)) return "images/[name][extname]";
          if (/\.(woff2?|ttf|eot)$/.test(name)) return "fonts/[name][extname]";
          return "assets/[name][extname]";
        },
      },
    },
  },
}));
