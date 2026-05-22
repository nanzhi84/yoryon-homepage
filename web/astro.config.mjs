import { defineConfig } from "astro/config";
import markdoc from "@astrojs/markdoc";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const shouldMountKeystatic = process.env.SKIP_KEYSTATIC !== "true";

export default defineConfig({
  site: "https://yoryon.com",
  output: "static",
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex]
  },
  integrations: [
    react(),
    markdoc(),
    ...(shouldMountKeystatic ? [keystatic()] : [])
  ]
});
