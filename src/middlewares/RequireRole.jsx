import { Navigate, useLocation } from "react-router-dom";

export default function RequireRole({ allowedRoles = [], children }) {
  const location = useLocation();

  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  let userRoles = [];
  try {
    const roleIdsJson = localStorage.getItem("role_ids");
    if (roleIdsJson) {
      const parsed = JSON.parse(roleIdsJson);
      if (Array.isArray(parsed)) {
        userRoles = parsed.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
      }
    }
  } catch (err) {
    console.error("Ошибка парсинга role_ids:", err);
  }

  if (userRoles.length === 0) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasAccess = allowedRoles.some(role => userRoles.includes(role));

  if (!hasAccess) {
    return <Navigate to="/404" replace />;
  }

  return children;
}