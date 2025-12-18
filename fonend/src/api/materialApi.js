// src/api/materialApi.js
import axiosClient from "./axiosClient";

const toArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.materials)) return res.materials;
  return [];
};

export const getMaterials = async (q = "") => {
  const res = await axiosClient.get("/materials", { params: q ? { q } : undefined });
  return toArray(res);
};

export const createMaterial = (payload) => axiosClient.post("/materials", payload);
export const updateMaterial = (id, payload) => axiosClient.put(`/materials/${id}`, payload);
export const deleteMaterial = (id) => axiosClient.delete(`/materials/${id}`);
