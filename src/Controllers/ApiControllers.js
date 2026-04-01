import axios from "axios";
import GenerateToken from "./token";
import api from "./api";
import { removeStorageItem } from "../lib/storage";
import { normalizeMediaPayload } from "../lib/media";

const handleSessionExpiration = (error) => {
  const isSessionExpired =
    error?.response?.status === 401 ||
    (error?.response?.data?.response === 401 &&
      error?.response?.data?.status === false &&
      typeof error?.response?.data?.message === "string" &&
      error.response.data.message.toLowerCase().includes("session expired"));

  if (isSessionExpired) {
    console.error(error?.response?.data?.message || "Session expired");

    removeStorageItem("user");
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }

    return new Error("Session expired. Please log-in again.");
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
    console.error(error.response.data.message);
    setTimeout(() => {
      removeStorageItem("user");
      window.location.href = "/login";
    }, 2000);

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
    console.error(error);
    throw handleSessionExpiration(error);
  }
};

const ADD = async (token, endPoint, data) => {
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
    headers: {
      Authorization: GenerateToken(token),
      "Content-Type": "multipart/form-data",
    },
    data: data,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    console.error(error);
    return handleMutationError(error);
  }
};
const ADDMulti = async (token, url, data) => {
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: url,
    headers: {
      Authorization: GenerateToken(token),
      "Content-Type": "multipart/form-data",
    },
    data: data,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    console.error(error);
    return handleMutationError(error);
  }
};

const UPDATE = async (token, endPoint, data) => {
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
    headers: {
      Authorization: GenerateToken(token),
      "Content-Type": "multipart/form-data",
    },
    data: data,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    console.error(error);
    return handleMutationError(error);
  }
};

const DELETE = async (token, endPoint, data) => {
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
    headers: {
      Authorization: GenerateToken(token),
      "Content-Type": "application/json",
    },
    data: data,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    console.error(error);
    return handleMutationError(error);
  }
};

const UPLOAD = async (token, url, data) => {
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: url,
    headers: {
      Authorization: GenerateToken(token),
      "Content-Type": "multipart/form-data",
    },
    data: data,
  };
  try {
    const response = await axios(config);
    return normalizeMediaPayload(response.data);
  } catch (error) {
    console.error(error);
    return handleMutationError(error);
  }
};

export { GET, ADD, DELETE, UPDATE, UPLOAD, ADDMulti };
