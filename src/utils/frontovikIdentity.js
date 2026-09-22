// UI identity only. The API independently verifies tokens and current roles.
export function frontovikActorID() {
  try {
    const token = localStorage.getItem('access_token');
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number(payload.user_id || 0);
  } catch { return 0; }
}
