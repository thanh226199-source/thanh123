import React from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function InvoicePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => navigate(-1)}>← Quay lại</button>

      <h2 style={{ marginTop: 16 }}>Xem trước / In hóa đơn</h2>

      <p>
        Mã hóa đơn: <b>{id}</b>
      </p>

      <div style={{ marginTop: 24 }}>
        <button onClick={() => window.print()}>
          🖨 In hóa đơn
        </button>
      </div>
    </div>
  );
}
