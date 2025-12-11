// src/api/materialApi.js
import axios from 'axios';

// Nhờ có "proxy": "http://localhost:5000" trong package.json
// nên chỉ cần baseURL là /api/materials
const api = axios.create({
  baseURL: '/api/materials',
});

export const getMaterials = () => api.get('/');
export const createMaterial = (data) => api.post('/', data);
export const updateMaterial = (id, data) => api.put(`/${id}`, data);
export const deleteMaterial = (id) => api.delete(`/${id}`);

export default api;
