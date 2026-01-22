// src/api/authApi.js
import axiosClient from "./axiosClient";
import { getToken, setAuth, clearAuth } from "./tokenStore";

export { getToken, setAuth, clearAuth };

/**
 * Request wrapper - an toàn tuyệt đối (không bao giờ rơi vào axiosClient({...}) => tránh lỗi apply)
 */
export const request = async ({
  method = "GET",
  url,
  data = null,
  params = null,
} = {}) => {
  if (!url) throw new Error("request: url is required");

  const m = String(method || "GET").trim().toUpperCase();

  switch (m) {
    case "GET":
      return axiosClient.get(url, params ? { params } : undefined);

    case "POST":
      return axiosClient.post(url, data);

    case "PUT":
      return axiosClient.put(url, data);

    case "DELETE":
      return axiosClient.delete(url, params ? { params } : undefined);

    default:
      throw new Error(`request: HTTP method không hợp lệ: ${method}`);
  }
};

/**
 * Login - tự bắt nhiều kiểu backend trả về token
 */
export const login = async ({ username, password }) => {
  if (!username || !password) {
    throw new Error("login: username/password is required");
  }

  const res = await axiosClient.post("/auth/login", { username, password });

  // hỗ trợ nhiều format: {token}, {accessToken}, {data:{token}}, {data:{accessToken}}
  const token =
    res?.token ||
    res?.accessToken ||
    res?.data?.token ||
    res?.data?.accessToken;

  if (!token) {
    // để debug nhanh
    console.error("Login response:", res);
    throw new Error("Login không trả token. Kiểm tra API /auth/login response.");
  }

  setAuth(token);
  return res;
};

export const register = async (payload) => {
  if (!payload) throw new Error("register: payload is required");
  return axiosClient.post("/auth/register", payload);
};

export const logout = () => {
  clearAuth();
  // ✅ để SPA điều hướng nhẹ nhàng hơn (nếu bạn dùng react-router)
  // Nếu bạn không dùng navigate ở đây thì cứ redirect như cũ:
  window.location.assign("/login");
};
