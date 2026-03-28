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

	// Prefer same-origin requests whenever the runtime host differs from the configured host
	// (covers localhost dev via Vite proxy AND apex<->www mismatches in production).
	if (!configured || (configuredHost.endsWith("gentrx.ph") && originHost !== configuredHost)) {
		apiAddress = origin;
	}
	
	console.debug("[API Address] Resolution:", {
		VITE_API_ADDRESS: configured || "(not set)",
		configuredHost,
		originHost,
		origin,
		finalApiAddress: apiAddress,
	});
}

export default apiAddress.replace(/\/+$/, "");
