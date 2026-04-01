const DEFAULT_API_ADDRESS = "https://api.gentrx.ph";
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

let apiAddress = configured || DEFAULT_API_ADDRESS;

if (typeof window !== "undefined") {
	const originHost = window.location.host.toLowerCase();
	const configuredHost = getHost(apiAddress);

	// Use same-origin only for localhost development where Vite proxy can forward
	// /api and /storage. Production must use the explicit API domain.
	if (isLocalRuntimeHost(originHost)) {
		apiAddress = window.location.origin;
	} else if (!configuredHost) {
		apiAddress = DEFAULT_API_ADDRESS;
	}
}

export default apiAddress.replace(/\/+$/, "");
