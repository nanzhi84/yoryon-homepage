import { defineConfig } from "astro/config";
import markdoc from "@astrojs/markdoc";
import node from "@astrojs/node";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";

export default defineConfig({
  site: "https://yoryon.dev",
  adapter: node({
    mode: "standalone"
  }),
  integrations: [react(), markdoc(), keystatic()]
});
