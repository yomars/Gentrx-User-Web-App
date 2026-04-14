import process from "node:process";

function read(name, fallback = "") {
  const value = process.env[name];
  if (!value) return fallback;
  return String(value).trim();
}

function mustUrl(name, value) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }
}

function assertDomain(urlObj, targetEnv) {
  if (targetEnv !== "production") return;
  const host = urlObj.host.toLowerCase();
  if (!host.endsWith("gentrx.ph")) {
    throw new Error(`Production smoke target must be on gentrx.ph. Got: ${host}`);
  }
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkFrontend(targetUrl, timeoutMs, targetEnv) {
  const response = await fetchWithTimeout(targetUrl, timeoutMs);

  // Non-production targets may be access-protected and return 401 to anonymous checks.
  if (targetEnv === "preview" && response.status === 401) {
    return response.status;
  }

  if (!response.ok) {
    throw new Error(`Frontend URL responded with status ${response.status}.`);
  }

  const body = await response.text();
  if (!body.includes('id="root"') && !body.includes("id='root'")) {
    throw new Error("Frontend response does not include SPA root element.");
  }

  return response.status;
}

async function checkApi(apiHealthUrl, timeoutMs) {
  const response = await fetchWithTimeout(apiHealthUrl, timeoutMs);
  if (!response.ok) {
    throw new Error(`API health endpoint responded with status ${response.status}.`);
  }
  return response.status;
}

async function main() {
  const targetUrlRaw = read("SMOKE_TARGET_URL");
  const apiHealthUrlRaw = read("API_HEALTHCHECK_URL");
  const targetEnv = read("SMOKE_TARGET_ENV", "preview").toLowerCase();
  const timeoutMs = Number(read("SMOKE_TIMEOUT_MS", "20000"));

  if (!["preview", "production"].includes(targetEnv)) {
    throw new Error("SMOKE_TARGET_ENV must be either 'preview' or 'production'.");
  }

  if (!targetUrlRaw) {
    throw new Error("Missing required env var: SMOKE_TARGET_URL");
  }

  const targetUrl = mustUrl("SMOKE_TARGET_URL", targetUrlRaw);
  assertDomain(targetUrl, targetEnv);

  if (apiHealthUrlRaw) {
    mustUrl("API_HEALTHCHECK_URL", apiHealthUrlRaw);
  }

  console.log(`Smoke check started for ${targetEnv}: ${targetUrl}`);

  const frontendStatus = await checkFrontend(targetUrl.toString(), timeoutMs, targetEnv);
  console.log(`Frontend OK (${frontendStatus})`);

  if (apiHealthUrlRaw) {
    const apiStatus = await checkApi(apiHealthUrlRaw, timeoutMs);
    console.log(`API health OK (${apiStatus})`);
  } else {
    console.log("API health check skipped (API_HEALTHCHECK_URL not set).");
  }

  console.log("Smoke check passed.");
}

main().catch((error) => {
  console.error(`Smoke check failed: ${error.message}`);
  process.exit(1);
});
