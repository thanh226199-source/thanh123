// src/pages/MaterialsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from '../api/materialApi';
import MaterialForm from '../components/MaterialForm';
import MaterialTable from '../components/MaterialTable';

const emptyMaterial = {
  tenVatLieu: '',
  maVatLieu: '',
  loai: '',
  donViTinh: '',
  giaNhap: '',
  giaBan: '',
  soLuongTon: '',
  nhaCungCap: '',
  thoiGianGiaoHang: '',
  ghiChu: '',
};

const MaterialsPage = () => {
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState(emptyMaterial);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await getMaterials();
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Không tải được danh sách vật liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const payload = {
      ...form,
      giaNhap: Number(form.giaNhap),
      giaBan: form.giaBan ? Number(form.giaBan) : undefined,
      soLuongTon: form.soLuongTon ? Number(form.soLuongTon) : 0,
      thoiGianGiaoHang: form.thoiGianGiaoHang
        ? Number(form.thoiGianGiaoHang)
        : undefined,
    };

    if (!payload.tenVatLieu || !payload.maVatLieu || !payload.giaNhap) {
      setErrorMsg('Vui lòng nhập đầy đủ Tên, Mã và Giá nhập');
      return;
    }

    try {
      if (editingId) {
        await updateMaterial(editingId, payload);
      } else {
        await createMaterial(payload);
      }
      setForm(emptyMaterial);
      setEditingId(null);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || 'Lỗi khi lưu vật liệu. Kiểm tra lại dữ liệu.';
      setErrorMsg(msg);
    }
  };

  const handleEdit = (material) => {
    setEditingId(material._id);
    setForm({
      tenVatLieu: material.tenVatLieu || '',
      maVatLieu: material.maVatLieu || '',
      loai: material.loai || '',
      donViTinh: material.donViTinh || '',
      giaNhap: material.giaNhap ?? '',
      giaBan: material.giaBan ?? '',
      soLuongTon: material.soLuongTon ?? '',
      nhaCungCap: material.nhaCungCap || '',
      thoiGianGiaoHang: material.thoiGianGiaoHang ?? '',
      ghiChu: material.ghiChu || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyMaterial);
    setErrorMsg('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa vật liệu này?')) return;
    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error(err);
      setErrorMsg('Xóa thất bại');
    }
  };

  return (
    <div className="page">
      <h1>Quản lý Vật liệu Xây dựng</h1>

      <MaterialForm
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancelEdit={handleCancelEdit}
        editingId={editingId}
        errorMsg={errorMsg}
      />

      <MaterialTable
        materials={materials}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default MaterialsPage;
