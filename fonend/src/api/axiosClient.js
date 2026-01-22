// src/api/axiosClient.js
import axios from "axios";
import { getToken, clearAuth } from "./tokenStore";

/**
 * Ưu tiên:
 * 1) REACT_APP_API_BASE_URL (khi mở bằng điện thoại / build / không dùng proxy)
 * 2) Nếu không có env => dùng "/api" (CRA proxy khi dev trên PC)
 *
 * Ví dụ .env (frontend):
 * REACT_APP_API_BASE_URL=http://192.168.1.15:5000/api
 */
const API_BASE = process.env.REACT_APP_API_BASE_URL || "/api";

const axiosClient = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  withCredentials: false,
});

// ✅ Request: tự gắn token, nhưng cho phép bỏ token bằng config.skipAuth = true
axiosClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    // Cho phép gọi public API không cần token
    if (config.skipAuth) return config;

    const token = typeof getToken === "function" ? getToken() : "";
    if (token) config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response: trả về res.data, và xử lý lỗi hợp lý cho public page
axiosClient.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const status = error?.response?.status;
    const isTimeout = error?.code === "ECONNABORTED";
    const isAbort =
      error?.code === "ERR_CANCELED" ||
      error?.name === "CanceledError" ||
      String(error?.message || "").toLowerCase().includes("canceled");

    const fullUrl =
      (error?.config?.baseURL || "") + (error?.config?.url || "");

    console.error("AXIOS ERROR:", {
      message: error?.message,
      url: fullUrl,
      method: error?.config?.method,
      status,
      data: error?.response?.data,
      isTimeout,
      isAbort,
      skipAuth: error?.config?.skipAuth,
    });

    if (isTimeout) {
      return Promise.reject(
        new Error("Request timeout (quá thời gian chờ). Vui lòng thử lại.")
      );
    }
    if (isAbort) return Promise.reject(error);

    // ✅ Nếu 401:
    // - KHÔNG đá login nếu request là public (skipAuth) hoặc đang đứng ở trang public invoices/view
    const isPublicPage =
      window.location.pathname.startsWith("/invoices/view/");

    if (status === 401 && !error?.config?.skipAuth && !isPublicPage) {
      if (typeof clearAuth === "function") clearAuth();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
