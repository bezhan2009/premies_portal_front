export async function fetchWorkerData({ month, year }) {
    const token = localStorage.getItem('access_token');
    const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/worker`);
    url.searchParams.append("month", month);
    url.searchParams.append("year", year);


    url.searchParams.append("loadCardTurnovers", "true");
    url.searchParams.append("loadCardSales", "true");
    url.searchParams.append("loadCardDetails", "false");
    url.searchParams.append("loadUser", "true");
    url.searchParams.append("loadServiceQuality", "true");
    url.searchParams.append("loadMobileBank", "true");

    const res = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    const data = await res.json();

    return data || [];
}
