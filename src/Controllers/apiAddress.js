const configured = String(import.meta.env.VITE_API_ADDRESS || "").trim();

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

	// On gentrx.ph, prefer same-origin requests to avoid apex<->www CORS/redirect issues.
	if (!configured || (originHost.endsWith("gentrx.ph") && configuredHost.endsWith("gentrx.ph") && originHost !== configuredHost)) {
		apiAddress = origin;
	}
}

export default apiAddress.replace(/\/+$/, "");
