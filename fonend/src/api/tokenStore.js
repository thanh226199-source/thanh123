// src/api/tokenStore.js
const TOKEN_KEY = "token";

export const getToken = () => localStorage.getItem(TOKEN_KEY) || "";

export const setAuth = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

export const clearAuth = () => setAuth("");
