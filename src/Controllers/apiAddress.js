const configured = String(import.meta.env.VITE_API_ADDRESS || "").trim();

function isLocalRuntimeHost(host) {
	return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}

function getHost(urlString) {
	try {
		return new URL(urlString).host.toLowerCase();
	} catch {
		return "";
	}
}

let apiAddress = configured;

if (typeof window !== "undefined") {
	const origin = window.location.origin;
	const originHost = window.location.host.toLowerCase();
	const configuredHost = getHost(configured);

	// Use same-origin only for local development. In production we keep the configured
	// API host so apex/www canonical redirects do not create rewrite loops.
	if (!configured || !configuredHost || isLocalRuntimeHost(originHost)) {
		apiAddress = origin;
	}
}

export default apiAddress.replace(/\/+$/, "");
