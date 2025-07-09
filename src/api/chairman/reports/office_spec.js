export const fetchEmployeeOffice = async (month, employeeURL) => {
    const employeeData = employeeURL.split("/");

    const office_id = employeeData[0];
    const year = employeeData[1];

    const token = localStorage.getItem('access_token');
    const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/workers`);
    url.searchParams.append("month", month);
    url.searchParams.append("year", year);

    url.searchParams.append("loadCardTurnovers", "true");
    url.searchParams.append("loadCardSales", "true");
    url.searchParams.append("loadCardDetails", "false");
    url.searchParams.append("loadUser", "true");
    url.searchParams.append("loadServiceQuality", "false");
    url.searchParams.append("loadMobileBank", "false");

    const res = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    let result = [];

    const data = await res.json();

    if (office_id) {
        // Фильтруем по office_id
        result = (data.worker || []).filter(worker => {
            return String(worker.office_id) === office_id;
        });
    } else {
        // Нет фильтра → возвращаем всех
        result = data.worker || [];
    }

    return result || [];
};
