/**
 * configure_branch_protection.mjs
 *
 * One-time script to configure GitHub branch protection rules for `main`.
 * Sets required status checks that must pass before a PR can be merged.
 *
 * Run once after the ci-gate workflow is committed and the first CI run has
 * completed (so GitHub recognises the check names shown below).
 *
 * Required env vars:
 *   GITHUB_TOKEN  – Personal access token or fine-grained token with
 *                   "administration: write" and "pull_requests: write"
 *                   repository permissions.
 *   GITHUB_REPO   – Repository slug in "owner/repo" form, e.g. "acme/gentrx-web"
 *
 * Optional env vars:
 *   GITHUB_BRANCH – Branch to protect (default: "main")
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_... GITHUB_REPO=owner/repo node scripts/ci/configure_branch_protection.mjs
 */

import process from "node:process";

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

async function githubApi(method, path, body, token) {
  const url = `https://api.github.com${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub API ${method} ${path} — ${response.status}: ${text}`);
  }

  return JSON.parse(text);
}

async function main() {
  const token = mustRead("GITHUB_TOKEN");
  const repo = mustRead("GITHUB_REPO");
  const branch = read("GITHUB_BRANCH", "main");

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    throw new Error('GITHUB_REPO must be in "owner/repo" format.');
  }

  console.log(`Configuring branch protection for ${owner}/${repoName} → ${branch}`);

  // Required status checks must match the workflow job names shown in GitHub's
  // Checks UI:  "<workflow-file-name> / <job-id>"
  const requiredChecks = [
    "CI Gate / build-check",
    "CI Gate / lint-check",
  ];

  const protectionPayload = {
    required_status_checks: {
      strict: true, // branch must be up-to-date with base before merge
      contexts: requiredChecks,
    },
    enforce_admins: true, // rules apply to admins too
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: 1,
    },
    restrictions: null, // no user/team push restrictions (beyond the workflow gate)
    allow_force_pushes: false,
    allow_deletions: false,
  };

  const result = await githubApi(
    "PUT",
    `/repos/${owner}/${repoName}/branches/${branch}/protection`,
    protectionPayload,
    token
  );

  console.log("Branch protection configured successfully.");
  console.log(`Required checks: ${requiredChecks.join(", ")}`);
  console.log(`Require up-to-date branch: ${result.required_status_checks?.strict}`);
  console.log(`Required reviewers: ${result.required_pull_request_reviews?.required_approving_review_count}`);
  console.log(`Enforced for admins: ${result.enforce_admins?.enabled}`);
}

main().catch((error) => {
  console.error(`Branch protection setup failed: ${error.message}`);
  process.exit(1);
});
