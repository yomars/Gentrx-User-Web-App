import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";

function read(name, fallback = "") {
  const value = process.env[name];
  if (!value) return fallback;
  return String(value).trim();
}

function runGit(command, fallback = "") {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
}

function inferRepository() {
  const explicit = read("GITHUB_REPOSITORY");
  if (explicit) return explicit;

  const remoteUrl = runGit("git remote get-url origin");
  const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/i);
  return match ? match[1] : "";
}

async function main() {
  const gitSha =
    read("VERCEL_GIT_COMMIT_SHA") ||
    read("GITHUB_SHA") ||
    runGit("git rev-parse HEAD", "unknown");

  const branch =
    read("VERCEL_GIT_COMMIT_REF") ||
    read("GITHUB_REF_NAME") ||
    runGit("git rev-parse --abbrev-ref HEAD", "unknown");

  const metadata = {
    repo: inferRepository(),
    gitSha,
    shortSha: gitSha === "unknown" ? "unknown" : gitSha.slice(0, 7),
    branch,
    builtAt: new Date().toISOString(),
    source:
      read("VERCEL", "").toLowerCase() === "1"
        ? "vercel"
        : read("GITHUB_ACTIONS", "").toLowerCase() === "true"
          ? "github-actions"
          : "local",
  };

  const outputPath = path.join(process.cwd(), "dist", "version.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

  console.log(`Build metadata written to ${outputPath}`);
  console.log(`Build SHA: ${metadata.gitSha}`);
}

main().catch((error) => {
  console.error(`Failed to write build metadata: ${error.message}`);
  process.exit(1);
});