import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import { deleteEmployee, getEmployees } from "../api/employeeApi";

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const isAdmin = user?.role === "admin";

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getEmployees(keyword);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Lỗi tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa nhân viên này?")) return;
    try {
      await deleteEmployee(id);
      fetchData();
    } catch (e) {
      alert(e?.response?.data?.message || "Xóa thất bại");
    }
  };

  return (
    <div className="ttq-app">
      {/* topbar */}
      <div className="ttq-topbar">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-title">TTQ Materials</div>
            <div className="ttq-topbar-sub">Quản lý nhân viên • {user?.username || "bạn"}</div>
          </div>
        </div>
        <div className="ttq-topbar-right">
          <span className="ttq-pill">API: 5000</span>
          <button className="ttq-btn-outline" onClick={() => navigate("/dashboard")} type="button">
            Về trang chủ
          </button>
        </div>
      </div>

      <div className="ttq-page">
        <div className="ttq-page-head">
          <div className="ttq-title-wrap">
            <h1 className="ttq-h1">Danh sách nhân viên</h1>
            <div className="ttq-hint">Tìm theo tên, SĐT, email, role.</div>
          </div>

          <div className="ttq-search-wrap">
            <div className="ttq-search-group">
              <input
                className="ttq-search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm nhân viên..."
              />
              <button className="ttq-btn-outline" type="button" onClick={fetchData}>
                Tìm
              </button>

              {isAdmin ? (
                <Link className="ttq-btnLink" to="/employees/create">
                  + Tạo nhân viên
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="ttq-card">
          <div className="ttq-card-head">
            <div>
              <div className="ttq-card-title">Nhân viên</div>
              <div className="ttq-card-sub">Tổng: {rows.length}</div>
            </div>
          </div>

          <div className="ttq-table-wrap">
            {loading ? (
              <div className="ttq-empty">Đang tải...</div>
            ) : rows.length === 0 ? (
              <div className="ttq-empty">Chưa có nhân viên.</div>
            ) : (
              <table className="ttq-table">
                <thead>
                  <tr>
                    <th>Họ tên</th>
                    <th className="ttq-hide-md">Email</th>
                    <th>SĐT</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="ttq-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e._id}>
                      <td>
                        <div className="ttq-wrap" title={e.fullName}>
                          {e.fullName}
                        </div>
                      </td>
                      <td className="ttq-hide-md">
                        <div className="ttq-wrap" title={e.email}>
                          {e.email || "-"}
                        </div>
                      </td>
                      <td>{e.phone || "-"}</td>
                      <td>{e.role}</td>
                      <td>{e.status}</td>
                      <td className="ttq-center">
                        {isAdmin ? (
                          <div className="ttq-row-actions">
                            <Link className="ttq-btn-sm" to={`/employees/create?id=${e._id}`}>
                              Sửa
                            </Link>
                            <button className="ttq-btn-sm ttq-btn-sm-danger" onClick={() => onDelete(e._id)}>
                              Xóa
                            </button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
