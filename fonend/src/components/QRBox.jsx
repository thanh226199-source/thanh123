import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRBox({ value, size = 160 }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let mounted = true;

    async function gen() {
      try {
        if (!value) {
          if (mounted) setSrc("");
          return;
        }
        // tạo ảnh QR dạng base64 (data:image/png;base64,...)
        const dataUrl = await QRCode.toDataURL(value, {
          errorCorrectionLevel: "H",
          margin: 0,
          width: size,
        });
        if (mounted) setSrc(dataUrl);
      } catch (e) {
        console.error("QR generate error:", e);
        if (mounted) setSrc("");
      }
    }

    gen();
    return () => {
      mounted = false;
    };
  }, [value, size]);

  if (!value) return null;

  return (
    <img
      src={src}
      alt="QR"
      width={size}
      height={size}
      style={{
        display: "block",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fff",
      }}
    />
  );
}
