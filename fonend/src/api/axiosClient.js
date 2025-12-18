// src/api/axiosClient.js
import axios from "axios";
import { getToken, clearAuth } from "./authApi";

const request = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ===== REQUEST INTERCEPTOR =====
request.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== RESPONSE INTERCEPTOR =====
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("AXIOS ERROR:", {
      message: error?.message,
      code: error?.code,
      url: error?.config?.baseURL + error?.config?.url,
    });

    if (error?.response?.status === 401) {
      clearAuth();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default request;
export { request };
