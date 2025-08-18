import React, {useEffect, useState} from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CustomFinanceTooltip from './CustomFinanceTooltip.jsx';
import '../../../styles/components/ChartComponents.scss';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchEmployee } from "../../../api/chairman/reports/employee_spec.js";
import { getMonthName } from "../../../api/utils/date.js";
import Spinner from "../../Spinner.jsx";

const ChartReportFinance = ({ url }) => {
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

            let prev = null;

            for (let m = 1; m <= 12; m++) {
                try {
                    const list = await fetchEmployee(m, url) || [];

                    let sumDebit = 0;
                    let sumCredit = 0;
                    let sumBalance = 0;

                    list.forEach(item => {
                        const cardSales = item.CardSales || [];
                        cardSales.forEach(cs => {
                            sumDebit   += Number(cs.deb_osd)     || 0;
                            sumCredit  += Number(cs.deb_osk)     || 0;
                            sumBalance += Number(cs.out_balance) || 0;
                        });
                    });

                    const current = {
                        debit: sumDebit,
                        credit: sumCredit,
                        balance: sumBalance
                    };

                    let values = current;
                    if (prev &&
                        prev.debit === current.debit &&
                        prev.credit === current.credit &&
                        prev.balance === current.balance
                    ) {
                        values = {
                            debit: 0,
                            credit: 0,
                            balance: 0
                        };
                    } else {
                        prev = current;
                    }

                    const first = list[0] || {};
                    const fullName = first.user?.full_name || first.Username || "";

                    allMonths.push({
                        name: getMonthName(m),
                        ...values,
                        full_name: fullName
                    });
                } catch (e) {
                    console.error(e);
                    allMonths.push({
                        name: getMonthName(m),
                        debit: 0,
                        credit: 0,
                        balance: 0,
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
            <div style={{
                transform: 'scale(2)', display: 'flex', justifyContent: 'center',
                alignItems: 'center', marginBottom: '100px', width: 'auto',
            }}>
                <Spinner/>
            </div>
        );
    }

    if (!url) {
        return (
            <div style={{
                padding: '10px', color: '#555', fontSize: '16px',
                textAlign: 'center', backgroundColor: '#f0f0f0', borderRadius: '4px'
            }}>
                Выберите отделения/сотрудника
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div style={{
                padding: '10px', color: '#555', fontSize: '16px',
                textAlign: 'center', backgroundColor: '#f0f0f0', borderRadius: '4px'
            }}>
                Нет данных для отображения
            </div>
        );
    }

    return (
        <div className="chart-wrapper light-theme alt">
            <h2>Финансовая динамика {chartData[0].full_name}</h2>
            <p>Дебет, кредит и остатки по месяцам</p>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="debitGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff8a41" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#ff8a41" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea820" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#0ea820" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8c52ff" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#8c52ff" stopOpacity={0.1} />
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
                        content={<CustomFinanceTooltip />}
                        cursor={{ stroke: '#8c52ff', strokeWidth: 1 }}
                    />

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
                        stroke="#0ea820"
                        fill="url(#creditGradient)"
                        strokeWidth={3}
                        dot={{ stroke: '#0ea820', strokeWidth: 2, r: 3 }}
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
        exit:    { opacity: 0, x: -10 },
        transition: { duration: 0.3 }
    };

    return (
        <div className="block_info_prems" align="center">
            <AnimatePresence mode="wait">
                <motion.div key={url} {...commonProps}>
                    <ChartReportFinance url={url} />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ChairmanReportFinanceBlockInfo;
