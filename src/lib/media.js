import apiAddress from "../Controllers/apiAddress";
import imageBaseURL from "../Controllers/image";

const MEDIA_KEY_PATTERN = /(image|signature|file|pdf|logo|favicon|thumb)/i;

const FIELD_ALIASES = {
  image_path: "image",
  signature_path: "signature",
  file_path: "file",
  pdf_path: "pdf_file",
  thumb_image_path: "clinic_thumb_image",
};

export const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

export const normalizeStoragePath = (value) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Keep external URLs that are not served under /storage.
  if (isAbsoluteUrl(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const path = parsed.pathname.replace(/^\/+/, "");
      const index = path.toLowerCase().indexOf("storage/");
      if (index === -1) return trimmed;
      return path.slice(index + "storage/".length);
    } catch {
      return trimmed;
    }
  }

  if (/^\/?storage\//i.test(trimmed)) {
    return trimmed.replace(/^\/?storage\/+/, "");
  }

  return trimmed.replace(/^\/+/, "");
};

const joinUrl = (base, path) => `${String(base || "").replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;

export const resolveMediaUrl = (value) => {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (isAbsoluteUrl(trimmed)) return trimmed;

  if (trimmed.startsWith("/api/") || trimmed.startsWith("/storage/")) {
    return new URL(trimmed, apiAddress).toString();
  }

  return joinUrl(imageBaseURL, normalizeStoragePath(trimmed));
};

export const resolveAttachmentUrl = (record, extraKeys = []) => {
  const keys = [
    "signed_url",
    "file_url",
    "pdf_url",
    "public_url",
    "file",
    "file_path",
    "pdf_file",
    "pdf_path",
    ...extraKeys,
  ];

  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) {
      return resolveMediaUrl(value);
    }
  }

  return "";
};

const maybeNormalizeMediaValue = (key, value) => {
  if (typeof value !== "string") return value;
  if (!MEDIA_KEY_PATTERN.test(key)) return value;

  // Keep signed/private URLs exactly as-is.
  if (key.toLowerCase() === "signed_url") return value;

  return normalizeStoragePath(value);
};

export const normalizeMediaPayload = (payload) => {
  if (Array.isArray(payload)) {
    payload.forEach((item) => normalizeMediaPayload(item));
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  Object.entries(FIELD_ALIASES).forEach(([sourceKey, targetKey]) => {
    if (typeof payload[sourceKey] === "string" && !payload[targetKey]) {
      payload[targetKey] = payload[sourceKey];
    }
  });

  Object.keys(payload).forEach((key) => {
    const value = payload[key];

    if (Array.isArray(value) || (value && typeof value === "object")) {
      normalizeMediaPayload(value);
      return;
    }

    payload[key] = maybeNormalizeMediaValue(key, value);
  });

  return payload;
};
