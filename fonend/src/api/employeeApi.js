// src/api/employeeApi.js
import axiosClient from "./axiosClient";

export const getEmployees = async (keyword = "") => {
  const res = await axiosClient.get("/employees", {
    params: keyword ? { keyword } : {},
  });
  return res.data;
};

export const createEmployee = async (data) => {
  const res = await axiosClient.post("/employees", data);
  return res.data;
};

export const updateEmployee = async (id, data) => {
  const res = await axiosClient.put(`/employees/${id}`, data);
  return res.data;
};

export const deleteEmployee = async (id) => {
  const res = await axiosClient.delete(`/employees/${id}`);
  return res.data;
};
