// src/api/customerApi.js
import axiosClient from "./axiosClient";

const toArray = (res) => {
  // axiosClient đã return response.data
  if (Array.isArray(res)) return res;

  // các kiểu backend hay trả
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.customers)) return res.customers;

  // trường hợp trả { results: [] }
  if (Array.isArray(res?.results)) return res.results;

  return [];
};

export const getCustomers = async (q = "") => {
  const params = q ? { q } : {};
  const res = await axiosClient.get("/customers", { params });
  return toArray(res);
};

export const createCustomer = (payload) => axiosClient.post("/customers", payload);
export const updateCustomer = (id, payload) => axiosClient.put(`/customers/${id}`, payload);
export const deleteCustomer = (id) => axiosClient.delete(`/customers/${id}`);
