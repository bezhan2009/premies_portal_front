export const fetchReportCards = async (month, year, after) => {
    const token = localStorage.getItem('access_token');
    const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/workers/card-details`);
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
    return data || [];
};
