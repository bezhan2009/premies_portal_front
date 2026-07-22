export const fetchOfficeDirector = async ({ month, year }) => {
    const token = localStorage.getItem('access_token');
    const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/office/director`);

    // Добавляем query-параметры только если оба параметра валидны
    if (month !== undefined && year !== undefined && month !== '' && year !== '') {
        url.searchParams.set('month', String(month));
        url.searchParams.set('year', String(year));
    }

    const res = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    const data = await res.json();
    return data || [];
};
