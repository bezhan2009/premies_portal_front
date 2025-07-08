import { isNumber } from "../../utils/utils.js";

export const fetchEmployee = async (month, employeeURL) => {
    const parts = employeeURL.split("/");
    const token = localStorage.getItem("access_token");

    // Общие query-параметры
    const commonParams = new URLSearchParams({
        month: String(month),
        year: parts[1],
        loadCardTurnovers: "true",
        loadCardSales: "true",
        loadCardDetails: "false",
        loadUser: "true",
        loadServiceQuality: "false",
        loadMobileBank: "false",
    });

    // Функция агрегации office_user → единичная запись
    const aggregateOfficeUsers = (office) => {
        const agg = {
            ID: office.ID,
            Username: office.title,
            CardTurnovers: [],
            CardSales: [],
        };

        office.office_user.forEach(({ worker: w }) => {
            // ===== Turnovers =====
            w.CardTurnovers?.forEach(ct => {
                let exist = agg.CardTurnovers.find(x => x.WorkerID === ct.WorkerID);
                if (!exist) {
                    exist = {
                        ...ct,
                        activated_cards: 0,
                        card_turnovers_prem: 0,
                        WorkerID: office.ID
                    };
                    agg.CardTurnovers.push(exist);
                }
                exist.activated_cards += ct.activated_cards;
                exist.card_turnovers_prem += ct.card_turnovers_prem;
            });

            // ===== Sales =====
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
                exist.cards_prem += cs.cards_prem ?? 0;
            });
        });

        return agg;
    };

    // 1) «*» — объединяем все офисы в одну запись «Актив Банк»
    if (parts[0] === "*" && (parts[2] === "office" || parts.length === 2)) {
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
                let exist = combined.CardTurnovers.find(x => x.WorkerID === ct.WorkerID);
                if (!exist) {
                    exist = { ...ct };
                    combined.CardTurnovers.push(exist);
                } else {
                    exist.activated_cards += ct.activated_cards;
                    exist.card_turnovers_prem += ct.card_turnovers_prem;
                }
            });
            agg.CardSales.forEach(cs => {
                let exist = combined.CardSales.find(x => x.WorkerID === cs.WorkerID);
                if (!exist) {
                    exist = { ...cs };
                    combined.CardSales.push(exist);
                } else {
                    exist.deb_osd += cs.deb_osd;
                    exist.deb_osk += cs.deb_osk;
                    exist.out_balance += cs.out_balance;
                    exist.cards_sailed += cs.cards_sailed;
                    exist.cards_sailed_in_general += cs.cards_sailed_in_general;
                    exist.cards_prem += cs.cards_prem;
                }
            });
        });

        return [combined];
    }

    // 2) Один офис
    if (parts[2] === "office") {
        const officeID = parts[0];
        const url = `${import.meta.env.VITE_BACKEND_URL}/office/${officeID}?${commonParams}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const office = await res.json();
        return [aggregateOfficeUsers(office)];
    }

    // 3) Один работник
    const workerID = parts[0];
    const url = `${import.meta.env.VITE_BACKEND_URL}/workers/${workerID}?${commonParams}`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.worker ? [data.worker] : [];
};
