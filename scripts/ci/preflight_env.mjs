import process from "node:process";

const FRONTEND_REQUIRED = [
  "VITE_API_ADDRESS",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_FIREBASE_FCM_PUBLIC_KEY",
];

const DB_SPLIT_REQUIRED = [
  "DEST_DB_HOST",
  "DEST_DB_PORT",
  "DEST_DB_USER",
  "DEST_DB_PASSWORD",
  "DEST_DB_NAME",
];

function read(name) {
  const value = process.env[name];
  if (!value) return "";
  return String(value).trim();
}

function isSet(name) {
  return read(name).length > 0;
}

function assertRequired(names, scope, errors) {
  for (const name of names) {
    if (!isSet(name)) {
      errors.push(`[${scope}] Missing required env var: ${name}`);
    }
  }
}

function validateFrontend(errors) {
  assertRequired(FRONTEND_REQUIRED, "frontend", errors);

  const apiAddress = read("VITE_API_ADDRESS");
  if (apiAddress) {
    let host = "";
    try {
      host = new URL(apiAddress).host.toLowerCase();
    } catch {
      errors.push("[frontend] VITE_API_ADDRESS must be a valid absolute URL.");
      return;
    }

    if (!host.endsWith("gentrx.ph")) {
      errors.push("[frontend] VITE_API_ADDRESS must target gentrx.ph.");
    }
  }
}

function validateDb(errors) {
  const dbUrlVars = ["DEST_DATABASE_URL", "POSTGRES_URL", "POSTGRESQL_URL", "DATABASE_URL"];
  const dbUrl = dbUrlVars.map((name) => read(name)).find(Boolean);

  if (!dbUrl) {
    assertRequired(DB_SPLIT_REQUIRED, "db", errors);
  }

  const host = read("DEST_DB_HOST");
  const allowNonVultr = ["1", "true", "yes", "on"].includes(read("ALLOW_NON_VULTR_PG").toLowerCase());

  if (!allowNonVultr) {
    const hostToCheck = host || safeHostFromUrl(dbUrl);
    if (!hostToCheck || !hostToCheck.toLowerCase().includes("vultr")) {
      errors.push("[db] PostgreSQL host must be Vultr-managed (set ALLOW_NON_VULTR_PG=true only for isolated testing).");
    }
  }
}

function safeHostFromUrl(urlString) {
  if (!urlString) return "";
  try {
    return new URL(urlString).host;
  } catch {
    return "";
  }
}

function main() {
  const mode = (process.argv[2] || "all").toLowerCase();
  if (!["all", "frontend", "db"].includes(mode)) {
    console.error("Usage: node scripts/ci/preflight_env.mjs [all|frontend|db]");
    process.exit(1);
  }

  const errors = [];
  if (mode === "all" || mode === "frontend") {
    validateFrontend(errors);
  }
  if (mode === "all" || mode === "db") {
    validateDb(errors);
  }

  if (errors.length > 0) {
    console.error("Preflight failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Preflight passed for mode: ${mode}`);
}

main();
