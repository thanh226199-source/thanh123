// src/api/invoiceApi.js
import axiosClient from "./axiosClient";

export const createInvoice = (payload) => {
  if (!payload) throw new Error("createInvoice: payload is required");
  return axiosClient.post("/invoices", payload);
};

export const getInvoices = (params = {}) => {
  return axiosClient.get("/invoices", { params });
};

export const getInvoiceById = (id) => {
  if (!id) throw new Error("getInvoiceById: id is required");
  return axiosClient.get(`/invoices/${encodeURIComponent(id)}`);
};

export const deleteInvoice = (id) => {
  if (!id) throw new Error("deleteInvoice: id is required");
  return axiosClient.delete(`/invoices/${encodeURIComponent(id)}`);
};

// (optional) nếu sau này bạn cần sửa hoá đơn
export const updateInvoice = (id, payload) => {
  if (!id) throw new Error("updateInvoice: id is required");
  if (!payload) throw new Error("updateInvoice: payload is required");
  return axiosClient.put(`/invoices/${encodeURIComponent(id)}`, payload);
};
// LẤY HOÁ ĐƠN THEO SỐ HOÁ ĐƠN (CHO QR)
export const getInvoiceByNo = (invoiceNo) => {
  if (!invoiceNo) throw new Error("invoiceNo is required");
  return axiosClient.get(`/invoices/by-no/${encodeURIComponent(invoiceNo)}`);
};
