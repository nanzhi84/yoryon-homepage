import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/gomoku/",
  plugins: [react()],
  build: {
    outDir: "../web/dist/gomoku",
    emptyOutDir: true
  }
}));
