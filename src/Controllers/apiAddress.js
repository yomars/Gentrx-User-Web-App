const configured = String(import.meta.env.VITE_API_ADDRESS || "").trim();

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
