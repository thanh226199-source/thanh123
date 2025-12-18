import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  // ✅ Ưu tiên token mới, nhưng vẫn hỗ trợ token cũ (nếu project còn dùng)
  const token = localStorage.getItem("ttq_token") || localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
