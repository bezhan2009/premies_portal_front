export async function login(username, password) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/sign-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Неверный логин или пароль');
  }

  return res.json();
}

export async function registerUser(payload) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/sign-up`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Ошибка регистрации');
  }

  return await response.json();
}
