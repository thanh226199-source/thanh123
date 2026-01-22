// ✅ VIEW BY INVOICE NO (CHO QR)
// Lưu ý: đặt route này TRƯỚC router.get("/:id") để tránh bị ăn nhầm.
// ✅ PUBLIC: xem hoá đơn theo invoiceNo (QR) - KHÔNG CẦN TOKEN
router.get("/public/:invoiceNo", async (req, res) => {
  try {
    const raw = req.params.invoiceNo;
    const invoiceNo = decodeURIComponent(raw || "").trim();

    if (!invoiceNo) {
      return res.status(400).json({ message: "Thiếu số hoá đơn (invoiceNo)" });
    }

    const invoice = await Invoice.findOne({ invoiceNo }).lean();

    if (!invoice) {
      return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
    }

    return res.json(invoice);
  } catch (err) {
    console.error("GET /invoices/public/:invoiceNo error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/by-no/:invoiceNo", async (req, res) => {
  try {
    // 1) decode để tránh lỗi do encodeURIComponent ở FE
    const raw = req.params.invoiceNo;
    const invoiceNo = decodeURIComponent(raw || "").trim();

    // 2) validate cơ bản
    if (!invoiceNo) {
      return res.status(400).json({ message: "Thiếu số hoá đơn (invoiceNo)" });
    }

    // 3) tìm đúng field invoiceNo trong MongoDB
    //    (Nếu DB của bạn lưu tên khác như soHoaDon/code thì phải đổi ở đây)
    const invoice = await Invoice.findOne({ invoiceNo }).lean();

    if (!invoice) {
      return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
    }

    // 4) trả kết quả
    return res.json(invoice);
  } catch (err) {
    console.error("GET /invoices/by-no/:invoiceNo error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});
