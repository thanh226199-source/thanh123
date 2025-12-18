// src/api/authApi.js
import axiosClient from "./axiosClient";

const TOKEN_KEY = "token";

export const getToken = () => localStorage.getItem(TOKEN_KEY) || "";

export const setAuth = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

export const clearAuth = () => setAuth("");

// ✅ EXPORT request để các file customerApi/materialApi không bị vỡ import
// axiosClient của bạn đã tự gắn token + chống cache + xử lý 401
export const request = async ({ method = "GET", url, data, params }) => {
  const m = String(method || "GET").toLowerCase();

  if (m === "get") return axiosClient.get(url, { params });
  if (m === "post") return axiosClient.post(url, data);
  if (m === "put") return axiosClient.put(url, data);
  if (m === "delete") return axiosClient.delete(url, { params });

  // fallback
  return axiosClient({ method, url, data, params });
};

export const login = async ({ username, password }) => {
  const data = await axiosClient.post("/auth/login", { username, password });

  const token = data?.token || data?.accessToken || data?.data?.token;
  if (!token) throw new Error("Login không trả token. Kiểm tra Response /auth/login.");
  setAuth(token);

  return data;
};

export const register = (payload) => axiosClient.post("/auth/register", payload);

export const logout = async () => {
  clearAuth();
  window.location.href = "/login";
};
