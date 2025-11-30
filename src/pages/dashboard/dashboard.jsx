import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function RedirectDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    const roleIdsJson = localStorage.getItem("role_ids");

    // Если нет токенов — сразу на логин
    if (!accessToken || !refreshToken) {
      navigate("/login", { replace: true });
      return;
    }

    // Парсим роли
    let roleIds = [];
    try {
      if (roleIdsJson) {
        const parsed = JSON.parse(roleIdsJson);
        if (Array.isArray(parsed)) {
          roleIds = parsed.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
        }
      }
    } catch (err) {
      console.error("Ошибка парсинга role_ids", err);
    }

    // Если ролей нет вообще — на 404 или логин
    if (roleIds.length === 0) {
      navigate("/404", { replace: true });
      return;
    }

    // Приоритетная логика: проверяем роли по приоритету (можно менять порядок)
    // Например, если у человека несколько ролей — выберет первую подходящую

    if (roleIds.includes(3)) {
      navigate("/operator/premies", { replace: true });
    } else if (roleIds.includes(6) || roleIds.includes(8)) {
      navigate("/worker/premies", { replace: true });
    } else if (roleIds.includes(9)) {
      navigate("/chairman/reports", { replace: true });
    } else if (roleIds.includes(5)) {
      navigate("/director/reports", { replace: true });
    } else if (roleIds.includes(10)) {
      navigate("/agent/applications-list", { replace: true });
    } else if (roleIds.includes(11)) {
      navigate("/credit/applications-list", { replace: true });
    } else if (roleIds.includes(12)) {
      navigate("/agent/dipozit/applications-list", { replace: true });
    } else if (roleIds.includes(13)) {
      navigate("/agent-qr/transactions/list", { replace: true });
    } else if (roleIds.includes(14)) {
      navigate("/agent-sms/sms-sender", { replace: true });
    } else {
      // Если есть роли, но ни одна не подходит под маршруты
      navigate("/404", { replace: true });
    }
  }, [navigate]);

  return null;
}

export default RedirectDashboard;