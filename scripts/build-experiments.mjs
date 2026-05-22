import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const expDir = resolve(root, "experiments");

let names;
try {
  names = readdirSync(expDir).filter((n) => {
    if (n.startsWith("_") || n.startsWith(".")) return false; // 跳过 _template、隐藏目录
    return statSync(resolve(expDir, n)).isDirectory();
  });
} catch (err) {
  if (err.code === "ENOENT") {
    console.log("[experiments] no experiments/ directory found, nothing to build");
    process.exit(0);
  }
  throw err;
}

for (const name of names) {
  const outDir = resolve(root, "web", "dist", name);
  console.log(`[experiments] building ${name} -> ${outDir}`);
  const res = spawnSync("npm", ["run", "build", "-w", `@yoryon/${name}`], {
    stdio: "inherit",
    shell: true, // 跨平台:Windows 下 npm 需经 shell
    env: { ...process.env, EXP_BASE: `/${name}/`, EXP_OUTDIR: outDir },
  });
  if (res.status !== 0) {
    console.error(`[experiments] build failed for ${name} (exit ${res.status})`);
    process.exit(res.status ?? 1);
  }
}

console.log(`[experiments] done: ${names.join(", ") || "(none)"}`);
