const DEFAULT_API_ADDRESS = "https://gentrx.com.ph";
const configured = String(import.meta.env.VITE_API_ADDRESS || "").trim();

function getHost(urlString) {
	try {
		return new URL(urlString).host.toLowerCase();
	} catch {
		return "";
	}
}

let apiAddress = configured || DEFAULT_API_ADDRESS;

if (typeof window !== "undefined") {
	const origin = window.location.origin;
	const originHost = window.location.host.toLowerCase();
	const configuredHost = getHost(apiAddress);
	const isLocalhost =
		originHost.includes("localhost") ||
		originHost.startsWith("127.0.0.1") ||
		originHost.startsWith("0.0.0.0");

	// Only use same-origin in local development so Vite's /api and /storage proxies work.
	if (isLocalhost) {
		apiAddress = origin;
	}
}

export default apiAddress.replace(/\/+$/, "");
