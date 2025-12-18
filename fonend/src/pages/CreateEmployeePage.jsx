import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import { createEmployee, getEmployees, updateEmployee } from "../api/employeeApi";

const empty = {
  fullName: "",
  phone: "",
  email: "",
  username: "",
  role: "staff",
  status: "active",
  note: "",
};

export default function CreateEmployeePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id"); // nếu có id => sửa

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      alert("Bạn không có quyền admin.");
      navigate("/employees");
      return;
    }

    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const list = await getEmployees("");
        const found = list.find((x) => x._id === id);
        if (found) setForm({ ...empty, ...found });
      } catch (e) {
        alert("Không tải được dữ liệu nhân viên");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line
  }, [id]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return alert("Vui lòng nhập họ tên");

    try {
      setLoading(true);
      if (id) await updateEmployee(id, form);
      else await createEmployee(form);

      alert(id ? "Cập nhật thành công" : "Tạo nhân viên thành công");
      navigate("/employees");
    } catch (e2) {
      alert(e2?.response?.data?.message || "Lỗi lưu dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ttq-app">
      <div className="ttq-topbar">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-title">TTQ Materials</div>
            <div className="ttq-topbar-sub">{id ? "Cập nhật nhân viên" : "Tạo nhân viên"}</div>
          </div>
        </div>
        <div className="ttq-topbar-right">
          <button className="ttq-btn-outline" type="button" onClick={() => navigate("/employees")}>
            Quay lại
          </button>
        </div>
      </div>

      <div className="ttq-page">
        <div className="ttq-card">
          <div className="ttq-card-head">
            <div>
              <div className="ttq-card-title">{id ? "Cập nhật nhân viên" : "Tạo nhân viên mới"}</div>
              <div className="ttq-card-sub">Nhập thông tin nhân viên để quản lý.</div>
            </div>
          </div>

          <form className="ttq-form2" onSubmit={onSubmit}>
            <div className="ttq-grid2">
              <div>
                <label className="ttq-label2">Họ tên *</label>
                <input className="ttq-input2" value={form.fullName} onChange={set("fullName")} />
              </div>

              <div>
                <label className="ttq-label2">Số điện thoại</label>
                <input className="ttq-input2" value={form.phone} onChange={set("phone")} />
              </div>

              <div className="ttq-span2">
                <label className="ttq-label2">Email</label>
                <input className="ttq-input2" value={form.email} onChange={set("email")} />
              </div>

              <div>
                <label className="ttq-label2">Username</label>
                <input className="ttq-input2" value={form.username} onChange={set("username")} />
              </div>

              <div>
                <label className="ttq-label2">Role</label>
                <select className="ttq-input2" value={form.role} onChange={set("role")}>
                  <option value="staff">staff</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div>
                <label className="ttq-label2">Status</label>
                <select className="ttq-input2" value={form.status} onChange={set("status")}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>

              <div className="ttq-span2">
                <label className="ttq-label2">Ghi chú</label>
                <textarea className="ttq-textarea" rows={3} value={form.note} onChange={set("note")} />
              </div>
            </div>

            <div className="ttq-actions">
              <button className="ttq-btn-primary" type="submit" disabled={loading}>
                {loading ? "Đang lưu..." : id ? "Cập nhật" : "Tạo mới"}
              </button>
              <button className="ttq-btn-outline" type="button" onClick={() => navigate("/employees")}>
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
