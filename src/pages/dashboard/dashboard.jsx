import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function RedirectDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    const roleId = Number(localStorage.getItem("role_id"));

    if (!accessToken || !refreshToken || !roleId) {
      navigate("/login");
      return;
    }

    // Перенаправляем по роли
    if (roleId === 3) {
      navigate("/operator/premies");
    } else if (roleId === 6 || roleId === 8) {
      navigate("/worker/cards");
    } else if (roleId === 9) {
      navigate("/chairman/reports");
    } else if (roleId === 5) {
      navigate("/director/reports");
    } else if (roleId === 10) {
      navigate("/agent/applications-list");
    } else if (roleId === 11) {
      navigate("/credit/applications-list");
    } else if (roleId === 12) {
      navigate("/agent/dipozit/applications-list");
    } else if (roleId === 13) {
      navigate("/agent-qr/transactions/list");
    } else {
      navigate("/404");
    }
  }, [navigate]);

  return null;
}

export default RedirectDashboard;
