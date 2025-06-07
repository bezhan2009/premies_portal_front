import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function RedirectDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    if (!accessToken || !refreshToken) {
      navigate('/login');
    } else {
      navigate('/operator/premies');
    }
  }, [navigate]);

  return null;
}

export default RedirectDashboard;
