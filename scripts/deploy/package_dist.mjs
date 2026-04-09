import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const outputDir = process.argv[2] || "artifacts";

  if (!(await exists("dist"))) {
    throw new Error("dist folder was not found. Run npm run build first.");
  }

  await fs.mkdir(outputDir, { recursive: true });

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const bundlePath = path.join(outputDir, `gentrx-user-web-dist-${stamp}.tar.gz`);

  const filesToPack = [
    "dist",
    "scripts/deploy/ecosystem.user-web.cjs",
    "scripts/deploy/gentrx-user-web.nginx.conf",
  ];

  run("tar", ["-czf", bundlePath, ...filesToPack]);

  console.log(`Bundle created: ${bundlePath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
