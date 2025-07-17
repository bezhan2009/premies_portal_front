import { isNumber } from "../../utils/utils.js";

export const fetchEmployee = async (month, employeeURL) => {
    const parts = employeeURL.split("/");
    const token = localStorage.getItem("access_token");

    const commonParams = new URLSearchParams({
        month: String(month),
        year: parts[1] || "",
        loadCardTurnovers: "true",
        loadCardSales: "true",
        loadCardDetails: "false",
        loadUser: "true",
        loadServiceQuality: "false",
        loadMobileBank: "false",
    });

    const aggregateOfficeUsers = (office) => {
        const agg = {
            ID: office.ID,
            Username: office.title,
            CardTurnovers: [],
            CardSales: [],
        };

        office.office_user.forEach(({ worker: w }) => {
            w.CardTurnovers?.forEach(ct => {
                let exist = agg.CardTurnovers.find(x => x.WorkerID === ct.WorkerID);
                if (!exist) {
                    exist = { ...ct, activated_cards: 0, card_turnovers_prem: 0, WorkerID: office.ID };
                    agg.CardTurnovers.push(exist);
                }
                exist.activated_cards += ct.activated_cards;
                exist.card_turnovers_prem += ct.card_turnovers_prem;
            });

            w.CardSales?.forEach(cs => {
                let exist = agg.CardSales.find(x => x.WorkerID === cs.WorkerID);
                if (!exist) {
                    exist = {
                        ...cs,
                        deb_osd: 0,
                        deb_osk: 0,
                        out_balance: 0,
                        cards_sailed: 0,
                        cards_sailed_in_general: 0,
                        cards_for_month: 0,
                        cards_prem: 0,
                        WorkerID: office.ID
                    };
                    agg.CardSales.push(exist);
                }
                exist.deb_osd += cs.deb_osd;
                exist.deb_osk += cs.deb_osk;
                exist.out_balance += cs.out_balance;
                exist.cards_sailed += cs.cards_sailed ?? 0;
                exist.cards_sailed_in_general += cs.cards_sailed_in_general ?? 0;
                exist.cards_for_month += cs.cards_for_month ?? 0;
                exist.cards_prem += cs.cards_prem ?? 0;
            });
        });

        return agg;
    };

    // === Новый роут stats ===
    if (parts[0] === "*" && parts[parts.length - 1] === "stats") {
        const yearParam = parts[1] || "";
        const monthParam = parts.length === 3 ? month : Number(parts[2]) || month;
        const url = `${import.meta.env.VITE_BACKEND_URL}/workers/card-details/stats?month=${monthParam}&year=${yearParam}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const stats = await res.json();

        const cards_for_month = stats.cards_for_month || 0;
        const transformed = {
            ID: 0,
            Username: "Статистика за месяц",
            CardTurnovers: [{
                activated_cards: cards_for_month === 0 ? 0 : (stats.activated_cards || 0),
                card_turnovers_prem: 0,
                WorkerID: 0
            }],
            CardSales: [{
                deb_osd: cards_for_month === 0 ? 0 : (stats.debt_osd || 0),
                deb_osk: cards_for_month === 0 ? 0 : (stats.debt_osk || 0),
                out_balance: cards_for_month === 0 ? 0 : (stats.out_balance || 0),
                cards_for_month,
                cards_sailed: cards_for_month === 0 ? 0 : (stats.cards_in_general || 0),
                cards_sailed_in_general: cards_for_month === 0 ? 0 : (stats.cards_in_general || 0),
                cards_prem: 0,
                WorkerID: 0
            }]
        };

        return [transformed];
    }

    // === По всем офисам или по ALL ===
    if (parts[0] === "*") {
        if (parts[2] === "office" || parts.length === 2) {
            const url = `${import.meta.env.VITE_BACKEND_URL}/office?${commonParams}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const offices = await res.json();
            const officeAggs = offices.map(aggregateOfficeUsers);

            const combined = {
                ID: 0,
                Username: "Актив Банк",
                CardTurnovers: [],
                CardSales: []
            };

            officeAggs.forEach(agg => {
                agg.CardTurnovers.forEach(ct => {
                    const exist = combined.CardTurnovers.find(x => x.WorkerID === ct.WorkerID);
                    if (!exist) combined.CardTurnovers.push({ ...ct });
                    else {
                        exist.activated_cards += ct.activated_cards;
                        exist.card_turnovers_prem += ct.card_turnovers_prem;
                    }
                });

                agg.CardSales.forEach(cs => {
                    const exist = combined.CardSales.find(x => x.WorkerID === cs.WorkerID);
                    if (!exist) combined.CardSales.push({ ...cs });
                    else {
                        exist.deb_osd += cs.deb_osd;
                        exist.deb_osk += cs.deb_osk;
                        exist.out_balance += cs.out_balance;
                        exist.cards_for_month += cs.cards_for_month;
                        exist.cards_sailed += cs.cards_sailed;
                        exist.cards_sailed_in_general += cs.cards_sailed_in_general;
                        exist.cards_prem += cs.cards_prem;
                    }
                });
            });

            return [combined];
        }

        // === Пагинация по всем работникам ===
        const all = [];
        let after = null;
        while (true) {
            const params = new URLSearchParams(commonParams);
            if (after) params.set("after", after);
            const url = `${import.meta.env.VITE_BACKEND_URL}/workers?${params}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const chunk = await res.json();
            if (!chunk.length) break;
            all.push(...chunk);
            after = chunk[chunk.length - 1].ID;
        }
        return all;
    }

    // === Один офис ===
    if (parts[2] === "office") {
        const id = parts[0];
        const url = `${import.meta.env.VITE_BACKEND_URL}/office/${id}?${commonParams}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const office = await res.json();
        return [aggregateOfficeUsers(office)];
    }

    // === Один работник ===
    const urlW = `${import.meta.env.VITE_BACKEND_URL}/workers/${parts[0]}?${commonParams}`;
    const resW = await fetch(urlW, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
    if (!resW.ok) throw new Error(`HTTP ${resW.status}`);
    const data = await resW.json();
    return data.worker ? [data.worker] : [];
};
