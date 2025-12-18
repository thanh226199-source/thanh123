// src/api/reportApi.js
import axios from "axios";
import { getToken } from "./authApi";

const API = "http://localhost:5000/api";

function authHeader() {
  const token = getToken?.();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function downloadBlob(res, filename) {
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ✅ helper: đảm bảo filename không bị undefined
function safeName(name, fallback = "ALL") {
  return name ? String(name) : fallback;
}

// ===== Tổng hợp =====
export function getReportSummary({ from, to }) {
  return axios.get(`${API}/reports/summary`, {
    params: { from, to },
    headers: authHeader(),
  });
}

export async function exportReportSummaryExcel({ from, to }) {
  const res = await axios.get(`${API}/reports/summary/export`, {
    params: { from, to },
    responseType: "blob",
    headers: authHeader(),
  });
  downloadBlob(res, `BaoCaoTongHop_${safeName(from)}_${safeName(to)}.xlsx`);
}

// ===== Nhập kho =====
export function getReportStockIn({ from, to }) {
  return axios.get(`${API}/reports/stockin`, {
    params: { from, to },
    headers: authHeader(),
  });
}

export async function exportReportStockInExcel({ from, to }) {
  const res = await axios.get(`${API}/reports/stockin/export`, {
    params: { from, to },
    responseType: "blob",
    headers: authHeader(),
  });
  downloadBlob(res, `BaoCaoNhapKho_${safeName(from)}_${safeName(to)}.xlsx`);
}

// ===== Đơn đã bán =====
export function getReportSales({ from, to }) {
  return axios.get(`${API}/reports/sales`, {
    params: { from, to },
    headers: authHeader(),
  });
}

export async function exportReportSalesExcel({ from, to }) {
  const res = await axios.get(`${API}/reports/sales/export`, {
    params: { from, to },
    responseType: "blob",
    headers: authHeader(),
  });
  downloadBlob(res, `BaoCaoDonDaBan_${safeName(from)}_${safeName(to)}.xlsx`);
}

// =====================================================
// ✅ BÁO CÁO CHI TIẾT (mới):
// - số khách mua
// - top mặt hàng bán nhiều
// - COGS + profit
// Backend endpoint: GET /api/reports/sales-analytics?from&to&top
// =====================================================
export function getSalesAnalytics({ from, to, top = 10 }) {
  return axios.get(`${API}/reports/sales-analytics`, {
    params: { from, to, top },
    headers: authHeader(),
  });
}
