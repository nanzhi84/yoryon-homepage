import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.EXP_BASE ?? "/",
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: false,
  },
  build: {
    outDir: process.env.EXP_OUTDIR ?? "dist",
    emptyOutDir: true,
  },
});
