import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import { getLoyaltyRules } from "../api/loyaltyApi";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

export default function LoyaltyRulesPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await getLoyaltyRules();
      setRules(data);
    })();
  }, []);

  const calcExample = (bill, tier) => {
    const minBill = rules?.minBillToApply ?? 100000;
    const vndPerPoint = rules?.base?.vndPerPoint ?? 1000;

    if (bill < minBill) return { discount: 0, pay: bill, points: 0 };

    const discount = Math.round(bill * (tier.discountRate || 0));
    const pay = bill - discount;

    const basePoints = Math.floor(pay / vndPerPoint);
    const points = Math.floor(basePoints * (1 + (tier.bonusRate || 0)));

    return { discount, pay, points };
  };

  return (
    <div className="ttq-page" style={{ padding: 16 }}>
      <div className="ttq-topbar" style={{ borderRadius: 14 }}>
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-name">TTQ Loyalty</div>
            <div className="ttq-topbar-sub">Quy tắc tích điểm & ưu đãi</div>
          </div>
        </div>
        <div className="ttq-topbar-right" style={{ display: "flex", gap: 10 }}>
          <button className="ttq-btn-outline" onClick={() => navigate("/loyal-customers")}>Danh sách khách</button>
          <button className="ttq-btn-outline" onClick={() => navigate("/dashboard")}>Về trang chính</button>
        </div>
      </div>

      <div className="ttq-card" style={{ marginTop: 12 }}>
        <div className="ttq-card-head">
          <div>
            <div className="ttq-card-title">🎯 Nguyên tắc chung</div>
           
          </div>
          <span className="ttq-badge">{rules ? "ACTIVE" : "..."}</span>
        </div>

        {!rules ? (
          <div style={{ padding: 12, color: "#6b7280" }}>Đang tải quy tắc...</div>
        ) : (
          <div style={{ padding: 12, lineHeight: 1.8 }}>
            <div>✅ Điểm được tính theo <b>tổng tiền hoá đơn sau giảm</b></div>
            <div>✅ Chỉ tích điểm khi <b>đơn ≥ {money(rules.minBillToApply)}đ</b></div>
            <div>✅ <b>{money(rules.base.vndPerPoint)}đ = 1 điểm</b> cơ bản</div>
            <div>🎁 Điểm dùng để: đổi ưu đãi · xếp hạng </div>
          </div>
        )}
      </div>

      {rules ? (
        <div className="ttq-materials-grid" style={{ marginTop: 12 }}>
          {rules.tiers.map((t) => {
            const bill = t.example?.bill || 0;
            const ex = calcExample(bill, t);
            return (
              <div key={t.key} className="ttq-card">
                <div className="ttq-card-head">
                  <div>
                    <div className="ttq-card-title">{t.name}</div>
                    <div className="ttq-card-sub">
                      Điều kiện điểm: {money(t.minPoints)} – {t.key === "DIAMOND" ? "∞" : money(t.maxPoints)} · Đơn ≥ {money(rules.minBillToApply)}
                    </div>
                  </div>
                  <span className="ttq-badge">
                    Giảm {Math.round((t.discountRate || 0) * 100)}% · +{Math.round((t.bonusRate || 0) * 100)}%
                  </span>
                </div>

                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Quyền lợi</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {t.benefits.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>

                  <div style={{ fontWeight: 900, marginTop: 12 }}>Công thức</div>
                  <div style={{ color: "#374151", lineHeight: 1.8 }}>
                    <div>Giảm giá = Tổng tiền × {Math.round((t.discountRate || 0) * 100)}%</div>
                    <div>Điểm = (Tổng tiền sau giảm / {money(rules.base.vndPerPoint)}) × (1 + {Math.round((t.bonusRate || 0) * 100)}%)</div>
                  </div>

                  <div style={{ fontWeight: 900, marginTop: 12 }}>📌 Ví dụ</div>
                  <div style={{ lineHeight: 1.8 }}>
                    <div>Hoá đơn: <b>{money(bill)}đ</b></div>
                    <div>Giảm: <b>{money(ex.discount)}đ</b></div>
                    <div>Thanh toán: <b>{money(ex.pay)}đ</b></div>
                    <div>Điểm nhận: <b>{money(ex.points)} điểm</b></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="ttq-card" style={{ marginTop: 12 }}>
        <div className="ttq-card-head">
          <div>
            <div className="ttq-card-title">🔁 Quy tắc lên/xuống hạng </div>
            <div className="ttq-card-sub">Cộng dồn không reset · tụt hạng nếu lâu không mua</div>
          </div>
        </div>
        <div style={{ padding: 12, lineHeight: 1.8 }}>
          <div>✅ Lên hạng theo <b>TỔNG ĐIỂM TÍCH LŨY</b>:</div>
          <div>- Đồng: 0–999 · Bạc: 1.000–4.999 · Vàng: 5.000–9.999 · Kim cương: ≥10.000</div>
          <div style={{ marginTop: 6 }}>✅ Gợi ý giữ/tụt hạng:</div>
          <div>- Nếu <b>6 tháng</b> không phát sinh mua hàng → tụt 1 hạng</div>
          <div>- Kim cương giữ hạng nếu có ít nhất <b>1 đơn / 3 tháng</b></div>
        </div>
      </div>
    </div>
  );
}
