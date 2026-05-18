import axios from "axios";
import GenerateToken from "./token";
import api from "./api";
import { normalizeMediaPayload } from "../lib/media";
import { getStorageJSON } from "../lib/storage";

const extractCandidateToken = (value) => {
  if (!value || typeof value !== "object") return "";
  return (
    value.token ||
    value.api_token ||
    value.access_token ||
    value.accessToken ||
    value.data?.token ||
    ""
  );
};

const normalizeTokenString = (tokenValue) => {
  const initial = typeof tokenValue === "string" ? tokenValue.trim() : "";
  if (!initial) return "";

  const withoutBearer = initial.replace(/^Bearer\s+/i, "").trim();
  const withoutQuotes = withoutBearer.replace(/^"|"$/g, "").trim();
  return withoutQuotes;
};

const ensureAuthToken = (token) => {
  let value = normalizeTokenString(token);

  if (!value || value.toLowerCase() === "undefined" || value.toLowerCase() === "null") {
    const latestUser = getStorageJSON("user");
    value = normalizeTokenString(extractCandidateToken(latestUser));
  }

  if (
    !value ||
    value.toLowerCase() === "undefined" ||
    value.toLowerCase() === "null"
  ) {
    throw new Error("Session token missing. Please log-in again.");
  }

  return value;
};

const sanitizePayload = (data) => {
  if (!data || typeof data !== "object" || data instanceof FormData) {
    return data;
  }

  const sanitized = {};
  Object.entries(data).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim().toLowerCase() === "undefined")
    ) {
      return;
    }
    sanitized[key] = value;
  });

  return sanitized;
};

const withAuthPayloadFallback = (data, token) => {
  if (!token || !data || typeof data !== "object" || data instanceof FormData) {
    return data;
  }

  if (Object.prototype.hasOwnProperty.call(data, "auth_token")) {
    return data;
  }

  return {
    ...data,
    auth_token: token,
  };
};

const handleSessionExpiration = (error) => {
  const reqMethod = String(error?.config?.method || "").toUpperCase();
  const reqUrl = error?.config?.url || "";
  const status = error?.response?.status;

  // Only treat a 401 as "session expired" when the response body explicitly
  // carries the session-expired message.  A plain 401 from a legacy endpoint
  // that doesn't recognise the patient token should NOT be treated as an
  // expired session — it just means that particular endpoint is incompatible
  // and should show an error without triggering logout.
  const hasExplicitSessionExpiredBody =
    error?.response?.data?.response === 401 &&
    error?.response?.data?.status === false &&
    typeof error?.response?.data?.message === "string" &&
    error.response.data.message.toLowerCase().includes("session expired");

  if (hasExplicitSessionExpiredBody) {
    return new Error("Session expired. Please log-in again.");
  }

  if (status === 405) {
    return new Error(
      `Method Not Allowed (405): ${reqMethod} ${reqUrl}. Backend route/method is not enabled.`
    );
  }

  if (error?.response?.data?.message) {
    return new Error(String(error.response.data.message));
  }

  return error instanceof Error
    ? error
    : new Error(error?.response?.data?.message || "Request failed");
};

const handleMutationError = (error) => {
  if (
    error.response &&
    error.response.data &&
    error.response.data.response === 401 &&
    error.response.data.status === false &&
    error.response.data.message === "Session expired. Please log in again."
  ) {
    return {
      sessionExpired: true,
      message: "Session expired. Please log-in again.",
    };
  }
  throw handleSessionExpiration(error);
};

const GET = async (endPoint) => {
  var config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    throw handleSessionExpiration(error);
  }
};

const GET_AUTH = async (token, endPoint) => {
  const safeToken = ensureAuthToken(token);
  var config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
    headers: {
      Authorization: GenerateToken(safeToken),
    },
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    throw handleSessionExpiration(error);
  }
};

const ADD = async (token, endPoint, data) => {
  const safeToken = ensureAuthToken(token);
  const safeData = sanitizePayload(withAuthPayloadFallback(data, safeToken));
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
    headers: {
      Authorization: GenerateToken(safeToken),
      "Content-Type": "multipart/form-data",
    },
    data: safeData,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    return handleMutationError(error);
  }
};
const ADDMulti = async (token, url, data) => {
  const safeToken = ensureAuthToken(token);
  const safeData = sanitizePayload(withAuthPayloadFallback(data, safeToken));
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: url,
    headers: {
      Authorization: GenerateToken(safeToken),
      "Content-Type": "multipart/form-data",
    },
    data: safeData,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    return handleMutationError(error);
  }
};

const UPDATE = async (token, endPoint, data) => {
  const safeToken = ensureAuthToken(token);
  const safeData = sanitizePayload(withAuthPayloadFallback(data, safeToken));
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
    headers: {
      Authorization: GenerateToken(safeToken),
      "Content-Type": "multipart/form-data",
    },
    data: safeData,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    return handleMutationError(error);
  }
};

const DELETE = async (token, endPoint, data) => {
  const safeToken = ensureAuthToken(token);
  const safeData = sanitizePayload(withAuthPayloadFallback(data, safeToken));
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
    headers: {
      Authorization: GenerateToken(safeToken),
      "Content-Type": "application/json",
    },
    data: safeData,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    return handleMutationError(error);
  }
};

const POST_JSON = async (token, endPoint, data) => {
  const safeToken = ensureAuthToken(token);
  const safeData = sanitizePayload(withAuthPayloadFallback(data, safeToken));
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
    headers: {
      Authorization: GenerateToken(safeToken),
      "Content-Type": "application/json",
    },
    data: safeData,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    return handleMutationError(error);
  }
};

const UPLOAD = async (token, url, data) => {
  const safeToken = ensureAuthToken(token);
  const safeData = sanitizePayload(withAuthPayloadFallback(data, safeToken));
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: url,
    headers: {
      Authorization: GenerateToken(safeToken),
      "Content-Type": "multipart/form-data",
    },
    data: safeData,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    return handleMutationError(error);
  }
};

export { GET, GET_AUTH, ADD, DELETE, UPDATE, UPLOAD, ADDMulti, POST_JSON };
