import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CustomFinanceTooltip from './CustomFinanceTooltip.jsx';
import '../../../../styles/components/ChartComponents.scss';
import { AnimatePresence, motion } from 'framer-motion';

// Начальные данные
const initialData = [
    { name: 'Янв', debit: 40, credit: 60, balance: 20 },
    { name: 'Фев', debit: 55, credit: 80, balance: 25 },
    { name: 'Мар', debit: 70, credit: 95, balance: 30 },
    { name: 'Апр', debit: 30, credit: 60, balance: 15 },
    { name: 'Май', debit: 85, credit: 100, balance: 35 },
    { name: 'Июн', debit: 50, credit: 75, balance: 20 },
    { name: 'Июл', debit: 65, credit: 90, balance: 28 },
];

// Функция для генерации рандомных данных
const generateRandomData = () => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл'];
    return months.map((month) => ({
        name: month,
        debit: Math.floor(Math.random() * 85) + 40,
        credit: Math.floor(Math.random() * 100) + 60,
        balance: Math.floor(Math.random() * 15) + 35,
    }));
};

const ChartReportFinance = ({ url }) => {
    // Определяем данные в зависимости от URL
    const chartData = url ? initialData : generateRandomData(); // Если URL есть, начальные данные, иначе — рандом

    return (
        <div className="chart-wrapper light-theme alt">
            <h2>Финансовая динамика</h2>
            <p>Дебет, кредит и остатки по месяцам</p>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="debitGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff8a41" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#ff8a41" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d9d9d9" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#d9d9d9" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8c52ff" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#8c52ff" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>

                    <XAxis dataKey="name" stroke="#333" tick={{ fill: '#333', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#333" tick={{ fill: '#333', fontSize: 12 }} axisLine={false} tickLine={false} />

                    <Tooltip content={<CustomFinanceTooltip />} cursor={{ stroke: '#8c52ff', strokeWidth: 1 }} />

                    <Area
                        type="monotone"
                        dataKey="debit"
                        name="Дебет"
                        stroke="#ff8a41"
                        fill="url(#debitGradient)"
                        strokeWidth={3}
                        dot={{ stroke: '#ff8a41', strokeWidth: 2, r: 3 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="credit"
                        name="Кредит"
                        stroke="#d9d9d9"
                        fill="url(#creditGradient)"
                        strokeWidth={3}
                        dot={{ stroke: '#d9d9d9', strokeWidth: 2, r: 3 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        name="Остатки"
                        stroke="#8c52ff"
                        fill="url(#balanceGradient)"
                        strokeWidth={3}
                        dot={{ stroke: '#8c52ff', strokeWidth: 2, r: 3 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const ChairmanReportFinanceBlockInfo = ({ url }) => {
    const commonProps = {
        initial: { opacity: 0, x: 10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -10 },
        transition: { duration: 0.3 },
    };

    return (
        <div className="block_info_prems" align="center">
            <AnimatePresence mode="wait">
                <motion.div key="finance" {...commonProps}>
                    <ChartReportFinance url={url} />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};


export default ChairmanReportFinanceBlockInfo;
