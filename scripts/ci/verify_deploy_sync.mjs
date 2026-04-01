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

function mustUrl(name, value) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectExpectedSha() {
  const explicit = read("EXPECTED_GIT_SHA");
  if (explicit) return explicit;

  const remoteSha = runGit("git ls-remote origin refs/heads/main");
  if (remoteSha) {
    return remoteSha.split(/\s+/)[0];
  }

  return runGit("git rev-parse HEAD");
}

function detectExpectedRepo() {
  const explicit = read("EXPECTED_REPOSITORY") || read("GITHUB_REPOSITORY");
  if (explicit) return explicit;

  const remoteUrl = runGit("git remote get-url origin");
  const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/i);
  return match ? match[1] : "";
}

async function main() {
  const targetUrlRaw = read("VERIFY_TARGET_URL") || read("SMOKE_TARGET_URL");
  const timeoutMs = Number(read("VERIFY_TIMEOUT_MS", read("SMOKE_TIMEOUT_MS", "20000")));
  const maxAttempts = Number(read("VERIFY_MAX_ATTEMPTS", "8"));
  const retryDelayMs = Number(read("VERIFY_RETRY_DELAY_MS", "15000"));

  if (!targetUrlRaw) {
    throw new Error("Missing required env var: VERIFY_TARGET_URL or SMOKE_TARGET_URL");
  }

  const targetUrl = mustUrl("VERIFY_TARGET_URL", targetUrlRaw);
  const expectedSha = detectExpectedSha();
  if (!expectedSha) {
    throw new Error("Unable to determine expected git SHA.");
  }

  const expectedRepo = detectExpectedRepo();
  const versionUrl = new URL("version.json", targetUrl);
  let lastError = "";
  let version = null;
  let deployedSha = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    versionUrl.searchParams.set("ts", `${Date.now()}-${attempt}`);

    const response = await fetchWithTimeout(versionUrl.toString(), timeoutMs);
    if (!response.ok) {
      lastError = `Version endpoint responded with status ${response.status}.`;
    } else {
      try {
        version = await response.json();
      } catch {
        lastError = "Version endpoint did not return valid JSON.";
        version = null;
      }

      if (version) {
        deployedSha = String(version.gitSha || "").trim();
        if (!deployedSha) {
          lastError = "Live version metadata is missing gitSha.";
        } else if (expectedRepo && version.repo && version.repo !== expectedRepo) {
          lastError = `Repository mismatch. Expected ${expectedRepo}, got ${version.repo}.`;
        } else if (deployedSha !== expectedSha) {
          lastError = `Git SHA mismatch. Expected ${expectedSha}, got ${deployedSha}.`;
        } else {
          lastError = "";
          break;
        }
      }
    }

    if (attempt < maxAttempts) {
      console.log(`Verification attempt ${attempt}/${maxAttempts} failed: ${lastError}`);
      await sleep(retryDelayMs);
    }
  }

  if (lastError) {
    throw new Error(lastError);
  }

  console.log(`Deployment sync OK for ${targetUrl.origin}`);
  console.log(`Repository: ${version.repo || expectedRepo || "unknown"}`);
  console.log(`Git SHA: ${deployedSha}`);
  console.log(`Built at: ${version.builtAt || "unknown"}`);
}

main().catch((error) => {
  console.error(`Deployment sync verification failed: ${error.message}`);
  process.exit(1);
});