import { defineConfig } from "astro/config";
import markdoc from "@astrojs/markdoc";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";
import remarkMath from "remark-math";
import remarkCjkFriendly from "remark-cjk-friendly";
import rehypeKatex from "rehype-katex";

const shouldMountKeystatic = process.env.SKIP_KEYSTATIC !== "true";

export default defineConfig({
  site: "https://yoryon.com",
  output: "static",
  markdown: {
    shikiConfig: { theme: "github-light" },
    // remark-cjk-friendly: CommonMark 的强调闭合规则会让「**……？**汉字」这类
    // 紧邻全角标点的 ** 无法闭合而按字面输出，此插件修正 CJK 场景的解析
    remarkPlugins: [remarkCjkFriendly, remarkMath],
    rehypePlugins: [rehypeKatex]
  },
  integrations: [
    react(),
    markdoc(),
    ...(shouldMountKeystatic ? [keystatic()] : [])
  ]
});
