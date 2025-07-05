import React, { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import '../../../../styles/components/ChartComponents.scss';
import CustomCardsTooltip from './CustomCardsTooltip.jsx';
import { fetchEmployee } from "../../../../api/chairman/reports/employee_spec.js";
import { getMonthName } from "../../../../api/utils/date.js";
import Spinner from "../../../Spinner.jsx";

const ChartReportCards = ({ url }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!url) {
            setChartData([]);
            return;
        }

        const loadAllMonths = async () => {
            setLoading(true);
            const allMonths = [];

            for (let m = 1; m <= 12; m++) {
                try {
                    // fetchEmployee теперь всегда возвращает массив записей
                    const list = await fetchEmployee(m, url) || [];

                    // суммируем метрики по всем элементам массива
                    let sumAct = 0, sumAll = 0;
                    list.forEach(w => {
                        const t = w.CardTurnovers?.[0];
                        if (t) sumAct += Number(t.activated_cards) || 0;
                        const s = w.CardSales?.[0];
                        if (s) sumAll += Number(s.cards_sailed) || 0;
                    });

                    // берём имя из первой записи: user.full_name или Username
                    const first = list[0] || {};
                    const fullName = first.user?.full_name || first.Username || "";

                    allMonths.push({
                        name: getMonthName(m),
                        activeCards: sumAct,
                        allCards: sumAll,
                        full_name: fullName
                    });
                } catch (e) {
                    console.error(e);
                    allMonths.push({
                        name: getMonthName(m),
                        activeCards: 0,
                        allCards: 0,
                        full_name: ""
                    });
                }
            }

            setChartData(allMonths);
            setLoading(false);
        };

        loadAllMonths();
    }, [url]);

    if (loading) {
        return (
            <div
                style={{
                    transform: 'scale(2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '100px',
                    width: 'auto',
                }}
            >
                <Spinner />
            </div>
        );
    }

    if (!url) {
        return (
            <div
                style={{
                    padding: '10px',
                    color: '#555',
                    fontSize: '16px',
                    textAlign: 'center',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px'
                }}
            >
                Выберите сотрудника
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div
                style={{
                    padding: '10px',
                    color: '#555',
                    fontSize: '16px',
                    textAlign: 'center',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px'
                }}
            >
                Нет данных для отображения
            </div>
        );
    }

    return (
        <div className="chart-wrapper light-theme">
            <div style={{ textAlign: 'center' }}>
                <h2>Статистика по картам {chartData[0].full_name}</h2>
                <p>Активные и все карты по месяцам</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6ce5e8" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#6ce5e8" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="allGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#41b8d5" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#41b8d5" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>

                    <XAxis
                        dataKey="name"
                        stroke="#333"
                        tick={{ fill: '#333', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="#333"
                        tick={{ fill: '#333', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />

                    <Tooltip
                        content={<CustomCardsTooltip />}
                        cursor={{ stroke: '#41b8d5', strokeWidth: 1 }}
                    />

                    <Area
                        type="monotone"
                        dataKey="allCards"
                        name="Все карты"
                        stroke="#41b8d5"
                        fill="url(#allGradient)"
                        strokeWidth={3}
                        dot={{ stroke: '#41b8d5', strokeWidth: 2, r: 3 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="activeCards"
                        name="Активные карты"
                        stroke="#6ce5e8"
                        fill="url(#activeGradient)"
                        strokeWidth={3}
                        dot={{ stroke: '#6ce5e8', strokeWidth: 2, r: 3 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ChartReportCards;
