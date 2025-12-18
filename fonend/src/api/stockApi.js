// src/api/stockApi.js
import axiosClient from "./axiosClient";

const normalizeArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.history)) return res.history;
  return [];
};

// ✅ BACKEND: /stock/in & /stock/out (không có "s")
export const createStockIn = (payload) => axiosClient.post("/stock/in", payload);
export const createStockOut = (payload) => axiosClient.post("/stock/out", payload);

export const getStockInHistory = async (params = {}) => {
  const res = await axiosClient.get("/stock/in", { params });
  return normalizeArray(res);
};

export const getStockOutHistory = async (params = {}) => {
  const res = await axiosClient.get("/stock/out", { params });
  return normalizeArray(res);
};

// ✅ giữ alias để chỗ khác không bị vỡ import
export const stockIn = (payload) => createStockIn(payload);
export const stockOut = (payload) => createStockOut(payload);

// nếu project có dùng getStockHistory thì gộp IN/OUT
export const getStockHistory = async () => {
  const [ins, outs] = await Promise.all([getStockInHistory(), getStockOutHistory()]);
  return [...ins, ...outs].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
};
