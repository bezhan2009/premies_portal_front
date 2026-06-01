import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

export const logAuditAction = async (payload) => {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    await axios.post(`${API_URL}/audit/log`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
