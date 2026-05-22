import { spawnSync } from "node:child_process";

process.env.SKIP_KEYSTATIC = "true";

const result = spawnSync("astro", ["build"], {
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
