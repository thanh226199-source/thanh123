// src/pages/DashboardPage.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";

export default function DashboardPage() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [openMenu, setOpenMenu] = useState("materials"); // materials | invoices | loyalty | reports

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  const MenuItem = ({ id, title, desc, icon, children }) => {
    const isOpen = openMenu === id;
    return (
      <div className={`ttq-menu-card ${isOpen ? "active" : ""}`}>
        <button
          type="button"
          className="ttq-menu-head"
          onClick={() => setOpenMenu(isOpen ? "" : id)}
        >
          <div className="ttq-menu-head-left">
            <div className="ttq-menu-titleRow">
              <span className="ttq-menu-icon">{icon}</span>
              <span className="ttq-menu-title">{title}</span>
            </div>
            <div className="ttq-menu-desc">{desc}</div>
          </div>
          <div className={`ttq-chevron ${isOpen ? "open" : ""}`}>▾</div>
        </button>

        {isOpen ? <div className="ttq-menu-body">{children}</div> : null}
      </div>
    );
  };

  const MenuLink = ({ to, children }) => (
    <Link className="ttq-menu-link" to={to}>
      {children}
      <span className="ttq-menu-arrow">→</span>
    </Link>
  );

  const ActionCard = ({ title, desc, to, icon, badge, variant = "default" }) => {
    return (
      <Link className={`ttq-action-card ${variant}`} to={to}>
        <div className="ttq-action-top">
          <div className="ttq-action-icon">{icon}</div>
          {badge ? <div className="ttq-badgeSoft">{badge}</div> : null}
        </div>
        <div className="ttq-action-title">{title}</div>
        <div className="ttq-action-desc">{desc}</div>
        <div className="ttq-action-go">Mở →</div>
      </Link>
    );
  };

  return (
    <div className="ttq-dash-page">
      {/* TOPBAR */}
      <header className="ttq-topbar">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-title">TTQ Materials</div>
            <div className="ttq-topbar-sub">
              Quản lý vật liệu xây dựng •{" "}
              {user?.username ? `Xin chào, ${user.username}` : "Dashboard"}
            </div>
            <div className="ttq-topbar-date">{todayLabel}</div>
          </div>
        </div>

        <div className="ttq-topbar-right">
          <div className="ttq-pill-group">
            <div className="ttq-pill">
              <span className="dot dot-blue" />
              API: <b>5000</b>
            </div>
            <div className="ttq-pill">
              <span className="dot dot-green" />
              Môi trường: <b>Localhost</b>
            </div>
          </div>
          <button
            className="ttq-btn-outline"
            onClick={handleLogout}
            type="button"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="ttq-dash-body">
        {/* SIDEBAR */}
        <aside className="ttq-sidebar">
          <div className="ttq-sidebar-title">Chức năng</div>

          <MenuItem
            id="materials"
            title="Kho Hàng"
            desc="Thêm – sửa – xoá, tồn kho, giá nhập/bán"
            icon="🧱"
          >
            <MenuLink to="/materials">Kho Hàng</MenuLink>
            <button
              className="ttq-menu-link"
              onClick={() => navigate("/stock/in")}
              type="button"
            >
              Nhập kho <span className="ttq-menu-arrow">→</span>
            </button>
          </MenuItem>

          <MenuItem
            id="invoices"
            title="Hóa đơn"
            desc="Lập – tra cứu – in hóa đơn"
            icon="🧾"
          >
            <MenuLink to="/invoices">Danh sách hóa đơn</MenuLink>
            <MenuLink to="/invoices/create">Tạo hóa đơn</MenuLink>
          </MenuItem>

          <MenuItem
            id="loyalty"
            title="Khách hàng thân thiết"
            desc="Tích điểm, xếp hạng thành viên, ưu đãi"
            icon="⭐"
          >
            <MenuLink to="/loyal-customers">Danh sách khách hàng</MenuLink>
          </MenuItem>

          <MenuItem
            id="reports"
            title="Báo cáo"
            desc="Doanh thu, nhập – xuất – tồn"
            icon="📊"
          >
            <MenuLink to="/reports">Xem báo cáo</MenuLink>
          </MenuItem>

          <div className="ttq-sidebar-footer">
            <div className="ttq-note">
              Gợi ý: bạn có thể mở rộng thêm <b>báo cáo</b>,{" "}
              <b>khách hàng thân thiết</b>, <b>hóa đơn</b>.
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="ttq-main">
          {/* Hero */}
          <div className="ttq-heroCard">
            <div>
              <div className="ttq-heroTitle">Trang chính</div>
              <div className="ttq-heroSub">
                Trung tâm thao tác nhanh: nhập/xuất kho, quản lý vật liệu, hóa
                đơn, khách hàng, báo cáo.
              </div>
            </div>

            <div className="ttq-heroRight">
              <div className="ttq-miniStat">
                <div className="ttq-miniStatTop">Hệ thống</div>
                <div className="ttq-miniStatVal">MongoDB + JWT</div>
              </div>
              <div className="ttq-miniStat">
                <div className="ttq-miniStatTop">Phân quyền</div>
                <div className="ttq-miniStatVal">Role-based</div>
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <section className="ttq-grid">
            <ActionCard
              title="Kho Hàng"
              desc="Xem danh sách, thêm/sửa/xoá vật liệu"
              to="/materials"
              icon="🧱"
              badge="Core"
              variant="primary"
            />
            <ActionCard
              title="Nhập kho"
              desc="Tạo phiếu nhập, tăng tồn kho"
              to="/stock/in"
              icon="📥"
              variant="soft"
            />
            <ActionCard
              title="Báo cáo"
              desc="Doanh thu – nhập/xuất/tồn"
              to="/reports"
              icon="📊"
              variant="outline"
            />
          </section>

          {/* MODULE PANELS */}
          <section className="ttq-grid2pro">
            <div className="ttq-panel">
              <div className="ttq-panelTitle">Hóa đơn</div>
              <div className="ttq-panelDesc">
                Tạo hóa đơn, tra cứu lịch sử bán hàng.
              </div>
              <div className="ttq-panelActions">
                <Link className="ttq-btnLink" to="/invoices/create">
                  Tạo hóa đơn
                </Link>
                <Link className="ttq-btnLink ghost" to="/invoices">
                  Danh sách
                </Link>
              </div>
            </div>

            <div className="ttq-panel">
              <div className="ttq-panelTitle">Khách hàng thân thiết</div>
              <div className="ttq-panelDesc">
                Tích điểm, hạng thành viên, ưu đãi.
              </div>
              <div className="ttq-panelActions">
                <Link className="ttq-btnLink" to="/loyal-customers">
                  Danh sách
                </Link>
                <Link className="ttq-btnLink ghost" to="/loyal-customers/rules">
                  Quy tắc
                </Link>
              </div>
            </div>

            {/* Thay thế panel Nhân viên bằng Kho hàng & tồn kho */}
            <div className="ttq-panel">
              <div className="ttq-panelTitle">Kho hàng & tồn kho</div>
              <div className="ttq-panelDesc">
                Kiểm tra nhanh tồn kho, nhập – xuất gần đây.
              </div>
              <div className="ttq-panelActions">
                <Link className="ttq-btnLink" to="/materials">
                  Đi tới Kho Hàng
                </Link>
                <Link className="ttq-btnLink ghost" to="/stock/in">
                  Nhập kho
                </Link>
              </div>
            </div>
          </section>

          {/* DATA CENTER */}
          <section className="ttq-center-card">
            <div className="ttq-center-title">Trung tâm dữ liệu</div>
            <div className="ttq-center-sub">
              Import/Export giúp nhập dữ liệu nhanh và xuất báo cáo cho quản lý.
            </div>

            <div className="ttq-center-actions">
              <button
                className="ttq-btn"
                type="button"
                onClick={() =>
                  alert("Bạn muốn import Excel/CSV loại dữ liệu nào?")
                }
              >
                Import Excel/CSV
              </button>
              <button
                className="ttq-btn-outline"
                type="button"
                onClick={() =>
                  alert("Bạn muốn export báo cáo (PDF/Excel) loại nào?")
                }
              >
                Export báo cáo
              </button>

              <button
                className="ttq-btn-ghost"
                type="button"
                onClick={() => navigate("/materials")}
              >
                Đi tới Kho Hàng →
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* STYLE RIÊNG CHO DASHBOARD */}
      <style>{`
  :root{
    --bg:#f6f8fc;
    --card:#ffffff;
    --line:#e5e7eb;
    --muted:#64748b;
    --text:#0f172a;
    --brand:#0ea5e9;
    --dark:#111827;
  }

  .ttq-dash-page{
    background:var(--bg);
    min-height:100vh;
  }
  .container{ max-width: 1150px; margin: 0 auto; }

  /* TOPBAR */
  .ttq-topbar{
    position: sticky;
    top:0;
    z-index:20;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    padding: 12px 16px;
    border-radius: 14px;
    border:1px solid rgba(229,231,235,0.85);
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(12px);
    box-shadow: 0 14px 30px rgba(15,23,42,0.06);
    margin: 8px 16px 0;
  }
  .ttq-topbar-left{
    display:flex; align-items:center; gap:10px;
  }
  .ttq-topbar-logo{
    width:44px; height:44px; object-fit:contain;
    border-radius:12px; background:#fff;
    border:1px solid #eef2f7;
  }
  .ttq-topbar-title{
    font-weight:900; color:var(--text); line-height:1.1;
  }
  .ttq-topbar-sub{
    font-size:12px; color:#6b7280; margin-top:2px;
  }
  .ttq-topbar-date{
    font-size:11px; color:#94a3b8; margin-top:2px;
  }

  .ttq-topbar-right{
    display:flex; gap:10px; align-items:center; flex-wrap:wrap;
  }
  .ttq-pill-group{
    display:flex; gap:8px; flex-wrap:wrap;
  }
  .ttq-pill{
    font-size:11px;
    padding:6px 10px;
    border-radius:999px;
    border:1px solid #e2e8f0;
    background:#f8fafc;
    display:flex;
    align-items:center;
    gap:6px;
    color:#0f172a;
  }
  .dot{
    width:8px; height:8px; border-radius:999px;
    display:inline-block;
  }
  .dot-blue{ background:#38bdf8; }
  .dot-green{ background:#22c55e; }

  .ttq-btn-outline{
    padding:8px 12px;
    border-radius:10px;
    border:1px solid var(--line);
    background:#fff;
    cursor:pointer;
    font-weight:800;
    font-size:13px;
    color:var(--text);
  }
  .ttq-btn-outline:hover{ filter:brightness(0.97); }

  /* === THÂN TRANG: FLEX 2 CỘT, CAO BẰNG NHAU === */
  .ttq-dash-body{
    max-width:1150px;
    margin: 10px auto 18px;
    padding: 0 8px 16px;
    display:flex;
    gap:18px;
    align-items:stretch;        /* 2 cột cùng chiều cao */
  }

  @media (max-width: 980px){
    .ttq-dash-body{
      flex-direction:column;
    }
  }

  /* SIDEBAR */
  .ttq-sidebar{
    flex:0 0 260px;            /* rộng ~260px */
    background:var(--card);
    border-radius:16px;
    border:1px solid var(--line);
    padding:14px;
    box-shadow: 0 10px 24px rgba(15,23,42,0.05);
    align-self:stretch;         /* kéo cao bằng main */
    display:flex;
    flex-direction:column;
  }

  @media (max-width: 980px){
    .ttq-sidebar{
      width:100%;
      align-self:auto;
    }
  }

  .ttq-sidebar-title{
    font-size:13px;
    font-weight:900;
    color:var(--text);
    margin-bottom:8px;
  }

  .ttq-menu-card{
    border-radius:12px;
    border:1px solid #e5e7eb;
    background:#f9fafb;
    margin-bottom:8px;
    overflow:hidden;
    transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.1s;
  }
  .ttq-menu-card.active{
    border-color: rgba(14,165,233,.45);
    box-shadow: 0 8px 20px rgba(15,23,42,0.05);
    background:#fff;
    transform: translateY(-1px);
  }
  .ttq-menu-head{
    width:100%;
    border:0;
    background:transparent;
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:10px 10px;
    cursor:pointer;
  }
  .ttq-menu-head-left{
    display:flex;
    flex-direction:column;
    gap:4px;
    text-align:left;
  }
  .ttq-menu-titleRow{
    display:flex;
    align-items:center;
    gap:8px;
  }
  .ttq-menu-icon{
    width:26px; height:26px;
    display:flex; align-items:center; justify-content:center;
    border-radius:999px;
    background:#e0f2fe;
    font-size:15px;
  }
  .ttq-menu-title{
    font-size:13px;
    font-weight:900;
    color:var(--text);
  }
  .ttq-menu-desc{
    font-size:11px;
    color:#6b7280;
  }
  .ttq-chevron{
    font-size:11px;
    color:#9ca3af;
    transition: transform 0.2s ease;
  }
  .ttq-chevron.open{
    transform: rotate(180deg);
  }

  .ttq-menu-body{
    border-top:1px dashed #e5e7eb;
    padding:6px 8px 8px;
    display:flex;
    flex-direction:column;
    gap:4px;
  }
  .ttq-menu-link{
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:6px 8px;
    border-radius:9px;
    font-size:12px;
    text-decoration:none;
    color:#0f172a;
    background:#f9fafb;
    border:1px solid transparent;
    cursor:pointer;
  }
  .ttq-menu-link:hover{
    border-color:#bfdbfe;
    background:#eff6ff;
  }
  .ttq-menu-arrow{
    font-size:11px;
    color:#64748b;
  }

  .ttq-sidebar-footer{
    margin-top:auto;           /* đẩy ghi chú xuống đáy sidebar */
    padding-top:8px;
    border-top:1px dashed #e5e7eb;
  }
  .ttq-note{
    font-size:11px;
    color:#94a3b8;
  }

  /* MAIN */
  .ttq-main{
    flex:1;
    display:flex;
    flex-direction:column;
    gap:12px;
    margin-top:0;
  }

  /* HERO BỚT CHÓI, CHỮ RÕ HƠN */
  .ttq-heroCard{
    background:
      radial-gradient(circle at top left, rgba(255,255,255,0.25), transparent 55%),
      linear-gradient(135deg,#0d8ad4 0%,#2563eb 45%,#1d4ed8 100%);
    color:#e0f2fe;
    border-radius:18px;
    padding:16px 18px;
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:12px;
    box-shadow: 0 16px 40px rgba(37,99,235,0.35);
  }
  .ttq-heroTitle{
    font-size:20px;
    font-weight:900;
    color:#f9fbff;
    text-shadow:0 1px 2px rgba(15,23,42,0.45);
  }
  .ttq-heroSub{
    margin-top:6px;
    font-size:13px;
    max-width:520px;
    color:#e5f2ff;                /* sáng hơn */
    text-shadow:0 1px 2px rgba(15,23,42,0.45);
  }
  .ttq-heroRight{
    display:flex;
    gap:10px;
    flex-wrap:wrap;
  }
  .ttq-miniStat{
    min-width:130px;
    padding:10px 12px;
    border-radius:12px;
    background:rgba(15,23,42,0.45);
    border:1px solid rgba(148,163,184,0.4);
  }
  .ttq-miniStatTop{
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:.05em;
    color:#bfdbfe;
  }
  .ttq-miniStatVal{
    margin-top:4px;
    font-size:13px;
    font-weight:900;
    color:#e5f2ff;
  }

  /* ACTION CARDS */
  .ttq-grid{
    margin-top:4px;
    display:grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap:12px;
  }
  @media (max-width: 900px){
    .ttq-grid{ grid-template-columns: repeat(2,minmax(0,1fr)); }
  }
  @media (max-width: 640px){
    .ttq-grid{ grid-template-columns: 1fr; }
  }

  .ttq-action-card{
    border-radius:16px;
    padding:14px;
    border:1px solid #e5e7eb;
    background:#ffffff;
    text-decoration:none;
    color:var(--text);
    display:flex;
    flex-direction:column;
    gap:6px;
    box-shadow: 0 10px 24px rgba(15,23,42,0.04);
    transition: transform 0.1s ease, box-shadow 0.15s ease, border-color 0.15s;
  }
  .ttq-action-card:hover{
    transform: translateY(-2px);
    box-shadow: 0 18px 40px rgba(15,23,42,0.08);
    border-color:#bfdbfe;
  }

  /* Kho Hàng primary: fix màu chữ luôn tối, nhìn rõ */
  .ttq-action-card.primary{
    background:linear-gradient(135deg,#e0f2fe,#ffffff);
    border-color:#bfdbfe;
  }
  .ttq-action-card.primary .ttq-action-title,
  .ttq-action-card.primary .ttq-action-desc,
  .ttq-action-card.primary .ttq-action-go{
    color:#0f172a;
  }
  .ttq-action-card.primary .ttq-action-icon{
    background:#0ea5e9;
    color:#f9fafb;
  }

  .ttq-action-card.soft{
    background:#f9fafb;
  }
  .ttq-action-card.outline{
    background:#ffffff;
    border-style:dashed;
  }
  .ttq-action-top{
    display:flex;
    justify-content:space-between;
    align-items:center;
  }
  .ttq-action-icon{
    width:32px; height:32px;
    border-radius:999px;
    display:flex; align-items:center; justify-content:center;
    background:#e0f2fe;
    font-size:18px;
  }
  .ttq-badgeSoft{
    font-size:11px;
    padding:4px 8px;
    border-radius:999px;
    background:#f1f5f9;
    border:1px solid #e2e8f0;
    font-weight:800;
    color:#0f172a;
  }
  .ttq-action-title{
    margin-top:8px;
    font-size:15px;
    font-weight:900;
    color:#0f172a;
  }
  .ttq-action-desc{
    font-size:12px;
    color:#64748b;
  }
  .ttq-action-go{
    margin-top:10px;
    font-size:12px;
    color:#0f172a;
    font-weight:800;
  }

  /* PANELS */
  .ttq-grid2pro{
    margin-top:4px;
    display:grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap:12px;
  }
  @media (max-width: 900px){
    .ttq-grid2pro{ grid-template-columns: repeat(2,minmax(0,1fr)); }
  }
  @media (max-width: 640px){
    .ttq-grid2pro{ grid-template-columns: 1fr; }
  }

  .ttq-panel{
    border-radius:16px;
    border:1px solid #e5e7eb;
    background:#ffffff;
    padding:14px;
    box-shadow: 0 10px 24px rgba(15,23,42,0.03);
    display:flex;
    flex-direction:column;
    gap:8px;
  }
  .ttq-panelTitle{
    font-size:14px;
    font-weight:900;
    color:var(--text);
  }
  .ttq-panelDesc{
    font-size:12px;
    color:#6b7280;
  }
  .ttq-panelActions{
    margin-top:4px;
    display:flex;
    flex-wrap:wrap;
    gap:8px;
  }
  .ttq-btnLink{
    font-size:12px;
    font-weight:800;
    padding:7px 10px;
    border-radius:999px;
    border:0;
    background:#0f172a;
    color:#fff;
    text-decoration:none;
  }
  .ttq-btnLink.ghost{
    background:#f9fafb;
    color:#0f172a;
    border:1px solid #e5e7eb;
  }

  /* DATA CENTER */
  .ttq-center-card{
    margin-top:6px;
    border-radius:16px;
    border:1px solid #e5e7eb;
    background:#ffffff;
    padding:14px 16px;
    box-shadow: 0 10px 24px rgba(15,23,42,0.03);
    text-align:center;
  }
  .ttq-center-title{
    font-weight:900;
    color:var(--text);
  }
  .ttq-center-sub{
    margin-top:4px;
    font-size:12px;
    color:#6b7280;
  }
  .ttq-center-actions{
    margin-top:10px;
    display:flex;
    flex-wrap:wrap;
    gap:8px;
    justify-content:center;
  }
  .ttq-btn{
    padding:8px 12px;
    border-radius:10px;
    border:0;
    background:var(--brand);
    color:#fff;
    font-size:13px;
    font-weight:800;
    cursor:pointer;
  }
  .ttq-btn-ghost{
    padding:8px 12px;
    border-radius:10px;
    border:0;
    background:transparent;
    color:#0f172a;
    font-size:13px;
    font-weight:800;
    cursor:pointer;
  }
`}</style>
    </div>
  );
}
