/**
 * rollback.mjs
 *
 * Identifies the last stable READY production deployment via the Vercel API
 * and rolls back to it using the Vercel CLI.
 *
 * Required env vars:
 *   VERCEL_TOKEN       – Vercel API token
 *   VERCEL_ORG_ID      – Vercel team/org ID
 *   VERCEL_PROJECT_ID  – Vercel project ID
 *
 * Optional env vars:
 *   ROLLBACK_SKIP_CONFIRM  – set to "true" to pass --yes to vercel rollback
 */

import process from "node:process";
import { execSync } from "node:child_process";

function read(name, fallback = "") {
  const value = process.env[name];
  if (!value) return fallback;
  return String(value).trim();
}

function mustRead(name) {
  const value = read(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function getLastStableDeployment(projectId, token) {
  // Fetch the 5 most recent READY production deployments.
  // deployments[0] is the current (failing) one; deployments[1] is the target.
  const url = new URL("https://api.vercel.com/v6/deployments");
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("target", "production");
  url.searchParams.set("state", "READY");
  url.searchParams.set("limit", "5");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vercel API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  const deployments = data.deployments ?? [];

  if (deployments.length < 2) {
    throw new Error(
      `Only ${deployments.length} READY production deployment(s) found. ` +
        "Cannot roll back — no previous stable deployment exists."
    );
  }

  // deployments are sorted newest-first by the API
  return deployments[1];
}

async function main() {
  const token = mustRead("VERCEL_TOKEN");
  const orgId = mustRead("VERCEL_ORG_ID");
  const projectId = mustRead("VERCEL_PROJECT_ID");
  const skipConfirm = read("ROLLBACK_SKIP_CONFIRM", "false").toLowerCase() === "true";

  // orgId is passed via VERCEL_ORG_ID env var; Vercel CLI picks it up automatically.
  console.log(`Org: ${orgId}`);
  console.log("Production smoke check failed — initiating Vercel rollback...");

  const stable = await getLastStableDeployment(projectId, token);
  const stableId = stable.uid;
  const stableUrl = stable.url;

  console.log(`Target rollback deployment: ${stableId} (https://${stableUrl})`);

  const confirmFlag = skipConfirm ? "--yes" : "";
  const cmd = `npx vercel@latest rollback ${stableId} --token "${token}" ${confirmFlag}`.trim();

  execSync(cmd, { stdio: "inherit", env: process.env });

  console.log("Rollback complete. Previous stable deployment is now live.");
}

main().catch((error) => {
  console.error(`Rollback failed: ${error.message}`);
  process.exit(1);
});
