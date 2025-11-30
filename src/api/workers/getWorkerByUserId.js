export const getWorkerByUserId = async (userId) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('Нет токена авторизации');
  }

  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/workers/user/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Ошибка ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};