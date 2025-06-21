// operator_premies.js
export const fetchWorkers = async (month, year, after) => {
    try {
        const token = localStorage.getItem('access_token');
        const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/workers`);
        url.searchParams.append("month", month);
        url.searchParams.append("year", year);
        if (after !== undefined && after !== null) {
            url.searchParams.append("after", after);
        }

        const res = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        return data.workers || [];
    } catch (err) {
        console.error('Ошибка при получении данных:', err);
        return [];
    }
};
