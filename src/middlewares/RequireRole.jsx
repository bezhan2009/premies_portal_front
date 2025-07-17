import { Navigate, useLocation } from 'react-router-dom';

export default function RequireRole({ allowedRoles, children }) {
    const location = useLocation();
    const roleId = Number(localStorage.getItem('role_id'));

    if (!roleId) {
        // Если нет роли — считаем, что не авторизован
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(roleId)) {
        // Нет доступа к роуту → редиректим на страницу 404 или другую
        return <Navigate to="/404" replace />;
    }

    return children;
}
