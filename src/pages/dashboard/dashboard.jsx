import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function RedirectDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    const roleIdsJson = localStorage.getItem("role_ids");
    const roleId = localStorage.getItem("role_id"); // Старое поле

    // Если нет токенов — сразу на логин
    if (!accessToken || !refreshToken) {
      navigate("/login", { replace: true });
      return;
    }

    // ТРИГГЕР: Преобразование ролей в массив
    let roleIds = [];
    try {
      // Случай 1: role_ids существует и это JSON массив
      if (roleIdsJson) {
        const parsed = JSON.parse(roleIdsJson);
        if (Array.isArray(parsed)) {
          roleIds = parsed.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
        }
        // Случай 2: role_ids существует но это одно число (старый формат)
        else if (!isNaN(parsed) && parsed > 0) {
          roleIds = [Number(parsed)];
          // Обновляем localStorage в новом формате
          localStorage.setItem("role_ids", JSON.stringify(roleIds));
        }
      }
      // Случай 3: role_ids не существует, но есть role_id (совсем старый формат)
      else if (roleId && !isNaN(roleId) && roleId > 0) {
        roleIds = [Number(roleId)];
        // Сохраняем в новом формате и удаляем старое поле
        localStorage.setItem("role_ids", JSON.stringify(roleIds));
        localStorage.removeItem("role_id");
      }
    } catch (err) {
      console.error("Ошибка парсинга role_ids", err);
      
      // Случай 4: role_ids существует но это строка с числом
      if (roleIdsJson && !isNaN(roleIdsJson) && roleIdsJson > 0) {
        roleIds = [Number(roleIdsJson)];
        localStorage.setItem("role_ids", JSON.stringify(roleIds));
      }
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
    } else if (roleIds.includes(15)) {
        navigate("/agent-transaction/update-transaction", { replace: true });
    } else if (roleIds.includes(16)) {
        navigate("/agent-custom/eqms", { replace: true });
    } else if (roleIds.includes(17)) {
        navigate("/frontovik/abs-search", { replace: true });
    } else if (roleIds.includes(18)) {
        navigate("/processing/limits", { replace: true });
    } else if (roleIds.includes(19)) {
        navigate("/atm/table", { replace: true });
    } else if (roleIds.includes(20)) {
        navigate("accounts/account-operations", { replace: true });
    } else if (roleIds.includes(21)) {
        navigate("/processing-search/transactions", { replace: true });
    } else {
      // Если есть роли, но ни одна не подходит под маршруты
      navigate("/404", { replace: true });
    }
  }, [navigate]);

  return null;
}

export default RedirectDashboard;
