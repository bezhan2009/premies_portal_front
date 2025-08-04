import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function RedirectDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const roleId = Number(localStorage.getItem('role_id'));

    if (!accessToken || !refreshToken || !roleId) {
      navigate('/login');
      return;
    }

    // Перенаправляем по роли
    if (roleId === 3) {
      navigate('/operator/premies');
    } else if (roleId === 6 || roleId === 8) {
      navigate('/worker/cards');
    } else if (roleId === 9 || roleId === 5) {
      navigate('/chairman/reports');
    } else if (roleId === 10) {
      navigate('/agent/my-applications');
    } else {
      navigate('/404');
    }
  }, [navigate]);

  return null;
}

export default RedirectDashboard;
