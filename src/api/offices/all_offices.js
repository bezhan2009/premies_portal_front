// operator_premies.js
export const fetchOffices = async () => {
    const token = localStorage.getItem('access_token');
    const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/office`);

    const res = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    const data = await res.json();
    return data || [];
};
