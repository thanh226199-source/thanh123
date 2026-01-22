import React, { useEffect, useState } from "react";

function formatMoneyInput(value) {
  if (value === null || value === undefined) return "";
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseMoney(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export default function EditPriceModal({
  open,
  onClose,
  onSubmit,
  initialGiaNhap = 0,
  initialGiaBan = 0,
  title = "Sửa giá",
}) {
  const [giaNhap, setGiaNhap] = useState("");
  const [giaBan, setGiaBan] = useState("");

  useEffect(() => {
    if (open) {
      setGiaNhap(formatMoneyInput(initialGiaNhap));
      setGiaBan(formatMoneyInput(initialGiaBan));
    }
  }, [open, initialGiaNhap, initialGiaBan]);

  if (!open) return null;

  const handleSave = () => {
    const giaNhapNum = parseMoney(giaNhap);
    const giaBanNum = parseMoney(giaBan);

    if (giaNhapNum <= 0 || giaBanNum <= 0) {
      alert("Giá phải > 0");
      return;
    }
    if (giaBanNum < giaNhapNum) {
      alert("Giá bán phải ≥ giá nhập");
      return;
    }

    onSubmit({ giaNhap: giaNhapNum, giaBan: giaBanNum });
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>{title}</div>
          <button style={styles.xBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          <label style={styles.label}>Giá nhập</label>
          <input
            style={styles.input}
            value={giaNhap}
            onChange={(e) => setGiaNhap(formatMoneyInput(e.target.value))}
            placeholder="VD: 100000 hoặc 100.000"
          />

          <label style={{ ...styles.label, marginTop: 12 }}>Giá bán</label>
          <input
            style={styles.input}
            value={giaBan}
            onChange={(e) => setGiaBan(formatMoneyInput(e.target.value))}
            placeholder="VD: 130000 hoặc 130.000"
          />
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Hủy</button>
          <button style={styles.okBtn} onClick={handleSave}>Lưu</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    width: "min(520px, 100%)",
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 10px 35px rgba(0,0,0,0.25)",
  },
  header: {
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #eee",
  },
  title: { fontSize: 16, fontWeight: 700 },
  xBtn: {
    border: "none",
    background: "transparent",
    fontSize: 18,
    cursor: "pointer",
  },
  body: { padding: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    fontSize: 14,
  },
  footer: {
    padding: 16,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    borderTop: "1px solid #eee",
  },
  cancelBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
  },
  okBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#7b2d2d",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
};
