// src/api/materialApi.js
import axiosClient from "./axiosClient";

const toArray = (res) => {
  if (Array.isArray(res)) return res;

  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.materials)) return res.materials;
  if (Array.isArray(res?.results)) return res.results;

  return [];
};

export const getMaterials = async (q = "") => {
  const params = q ? { q } : {};
  const res = await axiosClient.get("/materials", { params });
  return toArray(res);
};

export const createMaterial = (payload) => axiosClient.post("/materials", payload);

/** ✅ Chỉ cho phép update 2 field: giaNhap, giaBan */
export const updateMaterial = (id, payload = {}) => {
  const onlyPrices = {
    giaNhap: payload.giaNhap,
    giaBan: payload.giaBan,
  };

  // (tuỳ chọn) nếu bạn muốn đảm bảo gửi số:
  if (onlyPrices.giaNhap !== undefined && onlyPrices.giaNhap !== null) {
    onlyPrices.giaNhap = Number(String(onlyPrices.giaNhap).replace(/[.,\s]/g, ""));
  }
  if (onlyPrices.giaBan !== undefined && onlyPrices.giaBan !== null) {
    onlyPrices.giaBan = Number(String(onlyPrices.giaBan).replace(/[.,\s]/g, ""));
  }

  return axiosClient.put(`/materials/${id}`, onlyPrices);
};

export const deleteMaterial = (id) => axiosClient.delete(`/materials/${id}`);
