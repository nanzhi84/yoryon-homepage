import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/digit-ocr/",
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: false
  },
  build: {
    outDir: "../web/dist/digit-ocr",
    emptyOutDir: true
  }
}));
