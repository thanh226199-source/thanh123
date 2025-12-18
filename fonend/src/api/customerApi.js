import axiosClient from "./axiosClient";

const toArray = (x) => {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.customers)) return x.customers;
  return [];
};

export const getCustomers = async (q = "") => {
  const res = await axiosClient.get("/customers", { params: q ? { q } : undefined });
  return toArray(res);
};

export const createCustomer = (payload) => axiosClient.post("/customers", payload);
export const updateCustomer = (id, payload) => axiosClient.put(`/customers/${id}`, payload);
export const deleteCustomer = (id) => axiosClient.delete(`/customers/${id}`);
