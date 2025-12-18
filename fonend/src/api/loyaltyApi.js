import { getToken } from "./authApi";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function getLoyaltyRules() {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/loyalty/rules`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) throw new Error("Load loyalty rules failed");
  return res.json();
}
