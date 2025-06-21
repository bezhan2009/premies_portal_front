import React from 'react';
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
import { AnimatePresence, motion } from 'framer-motion';

// Начальные данные
const initialData = [
    { name: 'Янв', activeCards: 45, allCards: 65 },
    { name: 'Фев', activeCards: 60, allCards: 90 },
    { name: 'Мар', activeCards: 95, allCards: 135 },
    { name: 'Апр', activeCards: 20, allCards: 30 },
    { name: 'Май', activeCards: 90, allCards: 120 },
    { name: 'Июн', activeCards: 50, allCards: 70 },
    { name: 'Июл', activeCards: 85, allCards: 110 },
    { name: 'Авг', activeCards: 60, allCards: 85 },
    { name: 'Сен', activeCards: 70, allCards: 95 },
    { name: 'Окт', activeCards: 45, allCards: 60 },
    { name: 'Ноя', activeCards: 65, allCards: 80 },
    { name: 'Дек', activeCards: 85, allCards: 100 },
];

// Функция для генерации рандомных данных
const generateRandomData = () => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return months.map((month) => ({
        name: month,
        activeCards: Math.floor(Math.random() * 85) + 45,
        allCards: Math.floor(Math.random() * 30) + 100,
    }));
};

const ChartReportCards = ({ url }) => {
    // Определяем данные в зависимости от URL
    const chartData = url ? initialData : generateRandomData(); // Если URL есть, используем начальные данные (пока заглушка), иначе — рандом

    return (
        <div className="chart-wrapper light-theme">
            <h2>Статистика по картам</h2>
            <p>Активные и все карты по месяцам</p>
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

                    <XAxis dataKey="name" stroke="#333" tick={{ fill: '#333', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#333" tick={{ fill: '#333', fontSize: 12 }} axisLine={false} tickLine={false} />

                    <Tooltip content={<CustomCardsTooltip />} cursor={{ stroke: '#41b8d5', strokeWidth: 1 }} />

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

const ChairmanReportCardsBlockInfo = ({ url }) => {
    const commonProps = {
        initial: { opacity: 0, x: 10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -10 },
        transition: { duration: 0.3 },
    };

    return (
        <div className="block_info_prems" align="center">
            <AnimatePresence mode="wait">
                <motion.div key="cards" {...commonProps}>
                    <ChartReportCards url={url} />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ChairmanReportCardsBlockInfo;
