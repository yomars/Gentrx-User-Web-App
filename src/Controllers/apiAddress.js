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

	// Local dev relies on same-origin so Vite/Nginx proxies can handle /api and /storage.
	// In hosted environments, always prefer an explicit API host when configured.
	if (isLocalRuntimeHost(originHost)) {
		apiAddress = origin;
	} else if (!configured || !configuredHost) {
		apiAddress = originHost.endsWith("gentrx.ph")
			? "https://api.gentrx.ph"
			: origin;
	}
}

export default apiAddress.replace(/\/+$/, "");
