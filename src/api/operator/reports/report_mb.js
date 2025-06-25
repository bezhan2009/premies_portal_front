export const fetchReportMobileBank = async (month, year, after) => {
    const token = localStorage.getItem('access_token');
    const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/workers`);
    url.searchParams.append("month", month);
    url.searchParams.append("year", year);
    if (after !== undefined && after !== null) {
        url.searchParams.append("after", after);
    }

    url.searchParams.append("loadCardTurnovers", "false");
    url.searchParams.append("loadCardSales", "false");
    url.searchParams.append("loadCardDetails", "false");
    url.searchParams.append("loadUser", "false");
    url.searchParams.append("loadServiceQuality", "false");
    url.searchParams.append("loadMobileBank", "true");

    const res = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    const data = await res.json();
    return data.workers || [];
};
