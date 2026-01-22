// src/api/reportApi.js
import axios from "axios";
import { getToken } from "./authApi";

/**
 * ✅ Ưu tiên:
 * 1) REACT_APP_API_BASE_URL (mở điện thoại / deploy)
 * 2) Nếu không có env => dùng "/api" (CRA proxy khi dev trên PC)
 *
 * Ví dụ .env (frontend):
 * REACT_APP_API_BASE_URL=http://192.168.1.3:5000/api
 */
const API_BASE =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_BASE_URL) ||
  "/api";

// ===== helpers =====
function authHeader() {
  const token = getToken?.();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** ✅ GET wrapper: TRẢ VỀ AXIOS RESPONSE (để UI dùng res.data như cũ) */
async function apiGet(path, { params, responseType } = {}) {
  return axios.get(`${API_BASE}${path}`, {
    params,
    responseType,
    headers: authHeader(),
  });
}

/** ✅ download blob */
function downloadBlob(res, filename) {
  const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data]);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/** ✅ filename không undefined + không lỗi ký tự */
function safeName(name, fallback = "ALL") {
  const s = name ? String(name) : fallback;
  return s.replace(/[^\w\-]/g, "_");
}

// ===== Tổng hợp =====
export function getReportSummary({ from, to }) {
  return apiGet("/reports/summary", { params: { from, to } });
}

export async function exportReportSummaryExcel({ from, to }) {
  const res = await apiGet("/reports/summary/export", {
    params: { from, to },
    responseType: "blob",
  });
  downloadBlob(res, `BaoCaoTongHop_${safeName(from)}_${safeName(to)}.xlsx`);
}

// ===== Nhập kho =====
export function getReportStockIn({ from, to }) {
  return apiGet("/reports/stockin", { params: { from, to } });
}

export async function exportReportStockInExcel({ from, to }) {
  const res = await apiGet("/reports/stockin/export", {
    params: { from, to },
    responseType: "blob",
  });
  downloadBlob(res, `BaoCaoNhapKho_${safeName(from)}_${safeName(to)}.xlsx`);
}

// ===== Đơn đã bán =====
export function getReportSales({ from, to }) {
  return apiGet("/reports/sales", { params: { from, to } });
}

export async function exportReportSalesExcel({ from, to }) {
  const res = await apiGet("/reports/sales/export", {
    params: { from, to },
    responseType: "blob",
  });
  downloadBlob(res, `BaoCaoDonDaBan_${safeName(from)}_${safeName(to)}.xlsx`);
}

// =====================================================
// ✅ BÁO CÁO CHI TIẾT (mới)
// Backend: GET /api/reports/sales-analytics?from&to&top
// =====================================================
export function getSalesAnalytics({ from, to, top = 10 }) {
  return apiGet("/reports/sales-analytics", {
    params: { from, to, top },
  });
}
