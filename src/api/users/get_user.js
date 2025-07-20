
export const fetchUserById = async (id) => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Не удалось загрузить пользователя");
    return res.json();
};
