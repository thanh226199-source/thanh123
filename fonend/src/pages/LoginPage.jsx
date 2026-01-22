// src/pages/LoginPage.jsx
import React, { useState } from "react";
import TTQLogo from "../assets/ttq-logo.png";
import { useNavigate } from "react-router-dom";
import { login } from "../api/authApi";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim())
      return alert("Vui lòng nhập đầy đủ thông tin");

    try {
      setLoading(true);
      await login({ username: username.trim(), password: password.trim() });
      navigate("/dashboard");
    } catch (e) {
      console.log("LOGIN ERROR:", e);

      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        e?.message ||
        "Đăng nhập thất bại";

      alert("❌ " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* LEFT */}
      <div className="auth-left">
        <img src={TTQLogo} alt="TTQ" className="auth-logo" />
        <h1>TTQ Materials</h1>
        <p>Hệ thống quản lý kho, hoá đơn & khách hàng thân thiết hiện đại</p>
        <div className="auth-chips">
          <span className="chip">An toàn</span>
          <span className="chip">Nhanh</span>
          <span className="chip">Chuyên nghiệp</span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <form className="auth-card" onSubmit={onSubmit}>
          <div className="auth-card-head">
            <div>
              <div className="auth-mini">Chào mừng trở lại</div>
              <h2>Đăng nhập</h2>
            </div>
            <div className="auth-badge">TTQ</div>
          </div>

          <label>Tên đăng nhập</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="VD: thanh111"
            autoComplete="username"
          />

          <label>Mật khẩu</label>
          <div className="pw-wrap">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="pw-eye"
              onClick={() => setShowPw((s) => !s)}
              aria-label="Hiện / ẩn mật khẩu"
            >
              {showPw ? "Ẩn" : "Hiện"}
            </button>
          </div>

          <div className="auth-row">
            <label className="auth-check">
              <input
                type="checkbox"
                checked={showPw}
                onChange={() => setShowPw((s) => !s)}
              />
              <span>Hiện mật khẩu</span>
            </label>

            <button
              type="button"
              className="auth-link-btn"
              onClick={() => alert("Chưa làm chức năng quên mật khẩu")}
            >
              Quên mật khẩu?
            </button>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <div className="auth-foot">
            Chưa có tài khoản?{" "}
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => navigate("/register")}
            >
              Đăng ký
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .auth-page{
          min-height:100vh;
          display:grid;
          grid-template-columns: 1.15fr 1fr;
          background:#f6f8fb;
        }

        .auth-left{
          background: linear-gradient(135deg,#0b2a6b,#2563eb);
          color:#fff;
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          padding:56px;
          text-align:center;
        }
        .auth-logo{
          width:88px;
          height:88px;
          object-fit:contain;
          background: rgba(255,255,255,.9);
          border-radius:18px;
          padding:14px;
          box-shadow: 0 18px 40px rgba(0,0,0,.18);
          margin-bottom:18px;
        }
        .auth-left h1{
          font-size:34px;
          font-weight:900;
          margin:0 0 8px;
          letter-spacing:.2px;
        }
        .auth-left p{
          opacity:.95;
          max-width:420px;
          line-height:1.55;
          margin:0 0 18px;
        }
        .auth-chips{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          justify-content:center;
        }
        .chip{
          border:1px solid rgba(255,255,255,.22);
          background: rgba(255,255,255,.10);
          padding:7px 12px;
          border-radius:999px;
          font-size:12px;
          font-weight:600;
        }

        .auth-right{
          display:flex;
          justify-content:center;
          align-items:center;
          padding:22px;
        }
        .auth-card{
          background:#fff;
          width:100%;
          max-width:390px;
          border-radius:18px;
          padding:22px 22px 18px;
          box-shadow:0 16px 42px rgba(15,23,42,.10);
          border:1px solid #e2e8f0;
        }
        .auth-card-head{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          margin-bottom:10px;
        }
        .auth-mini{
          font-size:12px;
          color:#64748b;
          font-weight:700;
        }
        .auth-card h2{
          margin:2px 0 0;
          font-size:22px;
          font-weight:900;
        }
        .auth-badge{
          font-weight:900;
          color:#1d4ed8;
          border:1px solid #dbeafe;
          background:#eff6ff;
          padding:6px 10px;
          border-radius:12px;
        }

        .auth-card label{
          font-size:13px;
          font-weight:700;
          display:block;
          margin-top:12px;
          margin-bottom:6px;
        }
        .auth-card input{
          width:100%;
          padding:11px 12px;
          border-radius:12px;
          border:1px solid #e5e7eb;
          background:#f1f5ff;
          font-size:14px;
          outline:none;
          transition:border-color .12s, box-shadow .12s, background .12s;
        }
        .auth-card input:focus{
          border-color:#93c5fd;
          box-shadow: 0 0 0 3px rgba(59,130,246,.18);
          background:#eef4ff;
        }

        .pw-wrap{
          position:relative;
        }
        .pw-eye{
          position:absolute;
          right:10px;
          top:50%;
          transform:translateY(-50%);
          border:none;
          background:transparent;
          cursor:pointer;
          font-size:12px;
          font-weight:700;
          color:#64748b;
          padding:0;
        }
        .pw-eye:hover{
          color:#1d4ed8;
        }

        .auth-row{
          margin-top:10px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        }
        .auth-check{
          display:flex;
          align-items:center;
          gap:8px;
          font-size:13px;
          color:#0f172a;
          user-select:none;
        }
        .auth-check input{
          width:14px;
          height:14px;
          margin:0;
          accent-color:#2563eb;
        }

        .auth-link-btn,
        .auth-link{
          border:none;
          background:transparent;
          padding:0;
          margin:0;
          color:#2563eb;
          font-weight:800;
          cursor:pointer;
          font-size:13px;
          white-space:nowrap;
        }
        .auth-link-btn:hover,
        .auth-link:hover{
          text-decoration:underline;
        }

        .auth-card button[type="submit"]{
          width:100%;
          margin-top:14px;
          padding:12px;
          border:none;
          border-radius:12px;
          background:linear-gradient(90deg,#2563eb,#1d4ed8);
          color:#fff;
          font-weight:900;
          cursor:pointer;
          font-size:14px;
          box-shadow:0 12px 26px rgba(37,99,235,0.35);
          transition: transform .06s ease, box-shadow .06s ease, filter .06s ease;
        }
        .auth-card button[type="submit"]:hover:not(:disabled){
          transform:translateY(-1px);
          box-shadow:0 16px 32px rgba(37,99,235,0.40);
          filter:brightness(1.03);
        }
        .auth-card button[type="submit"]:active:not(:disabled){
          transform:translateY(0);
          box-shadow:0 10px 18px rgba(37,99,235,0.30);
          filter:brightness(0.98);
        }
        .auth-card button[type="submit"]:disabled{
          opacity:.75;
          cursor:not-allowed;
          box-shadow:none;
          filter:none;
        }

        .auth-foot{
          margin-top:10px;
          font-size:13px;
          color:#334155;
          text-align:center;
        }

        @media(max-width:900px){
          .auth-page{grid-template-columns:1fr;}
          .auth-left{display:none;}
        }
      `}</style>
    </div>
  );
}
