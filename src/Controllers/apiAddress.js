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

	// Use same-origin for localhost and for the public gentrx.ph frontend so /api and
	// /storage can be proxied through the frontend host. Direct host access is kept for
	// any explicitly configured external backend domain.
	if (
		!configured ||
		!configuredHost ||
		isLocalRuntimeHost(originHost) ||
		(originHost.endsWith("gentrx.ph") && configuredHost.endsWith("gentrx.ph"))
	) {
		apiAddress = origin;
	} else if (!configured || !configuredHost) {
		apiAddress = originHost.endsWith("gentrx.ph")
			? "https://api.gentrx.ph"
			: origin;
	}
}

export default apiAddress.replace(/\/+$/, "");
