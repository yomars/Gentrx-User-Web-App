import axios from "axios";
import GenerateToken from "./token";
import api from "./api";
import { removeStorageItem } from "../lib/storage";

const handleSessionExpiration = (error) => {
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
  throw error;
};

const GET = async (endPoint) => {
  var config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `${api}/${endPoint}`,
  };
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
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

    return response.data;
  } catch (error) {
    console.error(error);
    return handleSessionExpiration(error);
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

    return response.data;
  } catch (error) {
    console.error(error);
    return handleSessionExpiration(error);
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
    return response.data;
  } catch (error) {
    console.error(error);
    return handleSessionExpiration(error);
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
    return response.data;
  } catch (error) {
    console.error(error);
    return handleSessionExpiration(error);
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

    return response.data;
  } catch (error) {
    console.error(error);
    return handleSessionExpiration(error);
  }
};

export { GET, ADD, DELETE, UPDATE, UPLOAD, ADDMulti };
