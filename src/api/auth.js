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
