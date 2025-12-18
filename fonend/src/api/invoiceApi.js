// src/api/invoiceApi.js
import request from "./axiosClient";

// Tạo hóa đơn
export const createInvoice = (payload) => {
  // backend thường là POST /invoices
  return request.post("/invoices", payload);
};

// Lấy danh sách hóa đơn
export const getInvoices = (params = {}) => {
  // backend thường là GET /invoices
  return request.get("/invoices", { params });
};

// Lấy chi tiết hóa đơn (nếu cần)
export const getInvoiceById = (id) => {
  return request.get(`/invoices/${id}`);
};

// Xoá hóa đơn (nếu có)
export const deleteInvoice = (id) => {
  return request.delete(`/invoices/${id}`);
};
