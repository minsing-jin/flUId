import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@genui/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@genui/renderer-react": path.resolve(__dirname, "../../packages/renderer-react/src/index.ts"),
      "@genui/widget-iframe": path.resolve(__dirname, "../../packages/widget-iframe/src/index.ts"),
      "@genui/planner-core": path.resolve(__dirname, "../../packages/planner-core/src/index.ts"),
      // Stub Node-only modules used by core default-tools (code.run_js uses node:vm)
      "node:vm": path.resolve(__dirname, "src/stubs/node-vm.ts")
    }
  },
  build: {
    target: "es2022",
    minify: "esbuild",
    cssMinify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-dom/client"]
        }
      }
    }
  },
  server: {
    port: 5173,
    host: "127.0.0.1"
  }
});
