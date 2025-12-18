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

  const [openMenu, setOpenMenu] = useState("materials"); // materials | staff | invoices | loyalty | reports

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

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
    <div className="ttq-dash">
      {/* TOPBAR */}
      <header className="ttq-topbar">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-title">TTQ Materials</div>
            <div className="ttq-topbar-sub">
              Quản lý vật liệu xây dựng • {user?.username ? `Xin chào, ${user.username}` : "Dashboard"}
            </div>
          </div>
        </div>

        <div className="ttq-topbar-right">
          <div className="ttq-pill">API: 5000</div>
          <button className="ttq-btn-outline" onClick={handleLogout} type="button">
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
            <button className="ttq-menu-link" onClick={() => navigate("/stock/in")} type="button">
              Nhập kho <span className="ttq-menu-arrow">→</span>
            </button>
            
          </MenuItem>

          <MenuItem
            id="staff"
            title="Quản lý nhân viên"
            desc="Tài khoản, vai trò, phân quyền"
            icon="👤"
          >
            <MenuLink to="/employees">Danh sách nhân viên</MenuLink>
            <MenuLink to="/employees/create">Tạo nhân viên</MenuLink>
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
            desc="Tích điểm, Xếp  hạng thành viên, ưu đãi"
            icon="⭐"
          >
            <MenuLink to="/loyal-customers">Danh sách khách hàng</MenuLink>
            <MenuLink to="/loyal-customers/rules">Quy tắc tích điểm</MenuLink>
          </MenuItem>

          <MenuItem
            id="reports"
            title="Báo cáo"
            desc="Doanh thu, nhập–xuất–tồn"
            icon="📊"
          >
            <MenuLink to="/reports">Xem báo cáo</MenuLink>
          </MenuItem>

          <div className="ttq-sidebar-footer">
            <div className="ttq-note">
              Gợi ý: Bạn có thể mở rộng thêm <b>báo cáo</b>, <b>khách hàng thân thiết</b>, <b>hóa đơn</b>.
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="ttq-main">
          {/* header card */}
          <div className="ttq-heroCard">
            <div>
              <div className="ttq-heroTitle">Trang chính</div>
              <div className="ttq-heroSub">
                Trung tâm thao tác nhanh: nhập/xuất kho, quản lý vật liệu, hóa đơn, khách hàng, báo cáo.
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

          {/* SECOND GRID */}
          <section className="ttq-grid2pro">
            <div className="ttq-panel">
              <div className="ttq-panelTitle">Hóa đơn</div>
              <div className="ttq-panelDesc">Tạo hóa đơn, tra cứu lịch sử bán hàng.</div>
              <div className="ttq-panelActions">
                <Link className="ttq-btnLink" to="/invoices/create">Tạo hóa đơn</Link>
                <Link className="ttq-btnLink ghost" to="/invoices">Danh sách</Link>
              </div>
            </div>

            <div className="ttq-panel">
              <div className="ttq-panelTitle">Khách hàng thân thiết</div>
              <div className="ttq-panelDesc">Tích điểm, hạng thành viên, ưu đãi.</div>
              <div className="ttq-panelActions">
                <Link className="ttq-btnLink" to="/loyal-customers">Danh sách</Link>
                <Link className="ttq-btnLink ghost" to="/loyal-customers/rules">Quy tắc</Link>
              </div>
            </div>

            <div className="ttq-panel">
              <div className="ttq-panelTitle">Nhân viên</div>
              <div className="ttq-panelDesc">Quản lý tài khoản, vai trò, phân quyền.</div>
              <div className="ttq-panelActions">
                <Link className="ttq-btnLink" to="/employees">Danh sách</Link>
                <Link className="ttq-btnLink ghost" to="/employees/create">Tạo mới</Link>
              </div>
            </div>
          </section>

          {/* FOOT CARD */}
          <section className="ttq-center-card">
            <div className="ttq-center-title">Trung tâm dữ liệu</div>
            <div className="ttq-center-sub">
              Import/Export giúp nhập dữ liệu nhanh và xuất báo cáo cho quản lý.
            </div>

            <div className="ttq-center-actions">
              <button className="ttq-btn" type="button" onClick={() => alert("Bạn muốn import Excel/CSV loại nào?")}>
                Import Excel/CSV
              </button>
              <button className="ttq-btn-outline" type="button" onClick={() => alert("Bạn muốn export PDF hay Excel?")}>
                Export báo cáo
              </button>

              <button className="ttq-btn-ghost" type="button" onClick={() => navigate("/materials")}>
                Đi tới Kho Hàng →
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
