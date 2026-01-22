// frontend/src/pages/RegisterPage.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import { register as registerApi } from "../api/authApi";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // có thể để trống, backend optional
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);

  // Rule: chữ cái đầu HOA, >=6 ký tự, có ký tự đặc biệt
  const rules = useMemo(() => {
    const s = password || "";
    return {
      firstUpper: /^[A-Z]/.test(s),
      minLen: s.length >= 6,
      hasSpecial: /[^A-Za-z0-9]/.test(s),
    };
  }, [password]);

  const isPwdOk = rules.firstUpper && rules.minLen && rules.hasSpecial;

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const u = username.trim();
    const em = email.trim();

    if (!u) return alert("Vui lòng nhập tên đăng nhập");
    if (!password) return alert("Vui lòng nhập mật khẩu");
    if (!isPwdOk) {
      return alert(
        "Mật khẩu chưa đúng yêu cầu: Chữ cái đầu viết HOA, tối thiểu 6 ký tự, có ký tự đặc biệt."
      );
    }
    if (password !== confirm) return alert("Mật khẩu nhập lại không khớp");
    if (!agree) return alert("Vui lòng đồng ý điều khoản");

    try {
      setLoading(true);

      await registerApi({
        username: u,
        email: em || undefined,
        password,
        role: "user",
      });

      alert("✅ Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Lỗi server khi đăng ký";
      alert(`❌ ${msg}`);
      console.error("Register failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      {/* LEFT BRAND */}
      <aside className="auth__brand" aria-hidden="true">
        <div className="brand__inner">
          <div className="brand__logoWrap">
            <img src={TTQLogo} alt="TTQ" className="brand__logo" />
          </div>

          <h1 className="brand__title">TTQ Materials</h1>
          <p className="brand__desc">
            Quản lý kho, hoá đơn và khách hàng thân thiết — gọn gàng, nhanh và
            chính xác.
          </p>

          <div className="brand__footer">
            <div className="pill">Bảo mật</div>
            <div className="pill">Nhanh</div>
            <div className="pill">Dễ dùng</div>
          </div>
        </div>
      </aside>

      {/* RIGHT FORM */}
      <main className="auth__main">
        <div className="card">
          <div className="card__header">
            <div>
              <div className="card__kicker">Tạo tài khoản</div>
              <div className="card__title">Đăng ký</div>
            </div>
            <div className="card__badge">TTQ</div>
          </div>

          <form className="form" onSubmit={submit}>
            <div className="field">
              <label>Tên đăng nhập</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: thanh111"
                autoComplete="username"
              />
            </div>

            {/* nếu sau này muốn dùng email thì thêm field ở đây */}

            <div className="field">
              <label>Mật khẩu</label>
              <div className="inputWrap">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="VD: Abc@12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPass((s) => !s)}
                >
                  {showPass ? "Ẩn" : "Hiện"}
                </button>
              </div>

              <div className="hint">
                <span className={rules.firstUpper ? "ok" : ""}>
                  • Chữ cái đầu HOA
                </span>
                <span className={rules.minLen ? "ok" : ""}>• ≥ 6 ký tự</span>
                <span className={rules.hasSpecial ? "ok" : ""}>
                  • Có ký tự đặc biệt
                </span>
              </div>
            </div>

            <div className="field">
              <label>Nhập lại mật khẩu</label>
              <input
                type={showPass ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
              />
            </div>

            <div className="row">
              <label className="check">
                <input
                  type="checkbox"
                  checked={showPass}
                  onChange={(e) => setShowPass(e.target.checked)}
                />
                <span>Hiện mật khẩu</span>
              </label>

              <label className="check">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>Đồng ý điều khoản</span>
              </label>
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </button>

            <div className="bottom">
              Đã có tài khoản?{" "}
              <Link to="/login" className="bottom__link">
                Đăng nhập
              </Link>
            </div>
          </form>
        </div>
      </main>

      <style>{`
        :root{
          --bg:#f6f8fc;
          --card:#ffffff;
          --text:#0f172a;
          --muted:#64748b;
          --line:#e5e7eb;
          --blue:#2563eb;
          --blue2:#1d4ed8;
          --shadow: 0 16px 50px rgba(15, 23, 42, 0.10);
          --shadow2: 0 8px 24px rgba(15, 23, 42, 0.10);
          --radius: 18px;
        }
        *{box-sizing:border-box}
        body{margin:0;background:var(--bg);color:var(--text)}
        .auth{
          min-height:100vh;
          display:grid;
          grid-template-columns: 1.1fr 1fr;
        }

        /* LEFT */
        .auth__brand{
          position:relative;
          overflow:hidden;
          background:
            radial-gradient(1200px 600px at 20% 20%, rgba(255,255,255,.18), transparent 60%),
            linear-gradient(135deg, #0b2a7a, #2563eb);
          color:#fff;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:48px;
        }
        .brand__inner{max-width:520px;width:100%;text-align:left;}
        .brand__logoWrap{
          width:92px;height:92px;border-radius:22px;background: rgba(255,255,255,.92);
          display:flex;align-items:center;justify-content:center;
          box-shadow: 0 14px 30px rgba(0,0,0,.18);margin-bottom:22px;
        }
        .brand__logo{width:64px;height:64px;object-fit:contain}
        .brand__title{
          font-size:34px;line-height:1.15;margin:0 0 10px;
          letter-spacing:.2px;font-weight:900;
        }
        .brand__desc{
          margin:0;font-size:15px;line-height:1.7;
          color: rgba(255,255,255,.88);max-width:420px;
        }
        .brand__footer{
          display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;
        }
        .pill{
          font-size:12px;padding:8px 10px;border-radius:999px;
          background: rgba(255,255,255,.14);
          border: 1px solid rgba(255,255,255,.18);
          font-weight:600;
        }

        /* RIGHT */
        .auth__main{
          display:flex;align-items:center;justify-content:center;padding:44px;
        }
        .card{
          width:min(420px, 100%);background:var(--card);
          border:1px solid rgba(229,231,235,.9);
          border-radius: var(--radius);box-shadow: var(--shadow);
          padding:22px;
        }
        .card__header{
          display:flex;align-items:flex-start;justify-content:space-between;
          margin-bottom:14px;
        }
        .card__kicker{
          font-size:12px;color:var(--muted);font-weight:700;letter-spacing:.2px;
        }
        .card__title{
          font-size:22px;font-weight:900;margin-top:4px;color: var(--text);
        }
        .card__badge{
          width:44px;height:44px;border-radius:14px;
          background: rgba(37,99,235,.08);
          border:1px solid rgba(37,99,235,.16);
          display:flex;align-items:center;justify-content:center;
          font-weight:900;color: var(--blue);
        }

        .form{margin-top:8px}
        .field{margin-top:12px}
        .field label{
          display:block;font-size:13px;font-weight:800;
          margin-bottom:7px;color: var(--text);
        }

        input{
          width:100%;padding:12px 12px;border-radius:12px;
          border:1px solid var(--line);
          outline:none;font-size:14px;background:#fff;
          transition:border-color .12s, box-shadow .12s, background .12s;
        }
        input:focus{
          border-color: rgba(37,99,235,.55);
          box-shadow: 0 0 0 3px rgba(37,99,235,.12);
        }

        .inputWrap{
          position:relative;display:flex;align-items:center;
        }
        .pw-toggle{
          position:absolute;
          right:10px;
          top:50%;
          transform:translateY(-50%);
          border:none;
          background:transparent;
          cursor:pointer;
          font-size:12px;
          font-weight:800;
          color:var(--muted);
          padding:0;
        }
        .pw-toggle:hover{
          color:var(--blue);
        }

        .hint{
          margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;
          font-size:12px;color: var(--muted);
        }
        .hint span{
          padding:6px 10px;border-radius:999px;
          background:#f8fafc;border:1px solid #eef2f7;
        }
        .hint span.ok{
          color:#0f5132;
          background: rgba(34,197,94,.10);
          border-color: rgba(34,197,94,.18);
        }

        .row{
          margin-top:12px;display:flex;align-items:center;
          justify-content:space-between;gap:12px;flex-wrap:wrap;
        }
        .check{
          display:flex;align-items:center;gap:8px;
          font-size:13px;color: var(--muted);user-select:none;
        }
        .check input{
          width:16px;height:16px;
          accent-color: var(--blue);
        }

        .btn{
          margin-top:16px;width:100%;padding:12px 14px;
          border:none;border-radius:12px;
          background: linear-gradient(135deg, var(--blue), var(--blue2));
          color:#fff;font-weight:900;font-size:14px;
          cursor:pointer;box-shadow: var(--shadow2);
          transition: transform .06s ease, box-shadow .06s ease, filter .06s ease;
        }
        .btn:hover:not(:disabled){
          transform:translateY(-1px);
          box-shadow:0 14px 30px rgba(37,99,235,0.35);
          filter:brightness(1.03);
        }
        .btn:active:not(:disabled){
          transform:translateY(0);
          box-shadow:0 8px 18px rgba(37,99,235,0.30);
          filter:brightness(0.98);
        }
        .btn:disabled{
          opacity:.7;cursor:not-allowed;box-shadow:none;
        }

        .bottom{
          margin-top:14px;text-align:center;
          font-size:13px;color: var(--muted);
        }
        .bottom__link{
          color: var(--blue);font-weight:800;
          text-decoration:none;
        }
        .bottom__link:hover{
          text-decoration:underline;
        }

        @media (max-width: 980px){
          .auth{grid-template-columns:1fr}
          .auth__brand{display:none}
          .auth__main{padding:24px}
        }
      `}</style>
    </div>
  );
}
