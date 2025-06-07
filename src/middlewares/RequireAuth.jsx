import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const access_token = localStorage.getItem("access_token");
  const refresh_token = localStorage.getItem("refresh_token");
  const location = useLocation();

  if (!access_token || !refresh_token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
