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

	// If VITE_API_ADDRESS is explicitly configured, always honor it.
	// Fall back to same-origin only when config is missing.
	if (!configured) {
		apiAddress = origin;
	}
}

export default apiAddress.replace(/\/+$/, "");
