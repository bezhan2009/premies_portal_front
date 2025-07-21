import React, { useEffect, useState } from 'react';
import Header from './WorkerPremiesHeader.jsx';
import { fetchWorkerData } from '../../../api/workers/reports/worker_premies.js';
import '../../../styles/components/WorkerPremies.scss';
import ReportButton from "./ReportButton.jsx";
import Spinner from "../../Spinner.jsx";
import AlertMessage from "../../general/AlertMessage.jsx";
import { calculateTotalPremia } from "../../../api/utils/calculate_premia.js";
import ChairmanEmployeeParentComponent from "../dashboard_chairman/ChairmanEmployeeReportsParentComponent.jsx";
import RenderPage from "../../RenderPage.jsx";

export default function Dashboard() {
    const now = new Date();

    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [prevMonth, setPrevMonth] = useState(month);
    const [prevYear, setPrevYear] = useState(year);

    const [data, setData] = useState(null);
    const [workerId, setWorkerId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    const loadData = async (m, y, revertOnFail = false) => {
        setLoading(true);
        try {
            const worker = await fetchWorkerData({
                month: m,
                year: y,
                options: {
                    loadCardTurnovers: true,
                    loadCardSales: true,
                    loadCardDetails: false,
                    loadUser: true,
                    loadServiceQuality: true,
                    loadMobileBank: true
                }
            });

            if (!worker || Object.keys(worker).length === 0) {
                if (revertOnFail) {
                    setMonth(prevMonth);
                    setYear(prevYear);
                    setAlert({ message: "Нет данных для отображения.", type: "error" });
                }
                setData(null);
            } else {
                setData(worker);
                if (worker.ID) {
                    setWorkerId(worker.ID);
                }
            }
        } catch (e) {
            console.error(e);
            if (revertOnFail) {
                setMonth(prevMonth);
                setYear(prevYear);
            }
            setAlert({ message: "Не удалось загрузить данные.", type: "error" });
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(month, year);
    }, [month, year]);

    const safeArray = (arr) => Array.isArray(arr) ? arr : [];

    const prev = () => {
        setPrevMonth(month);
        setPrevYear(year);

        let m = month - 1;
        let y = year;
        if (m < 1) {
            m = 12;
            y -= 1;
        }
        setMonth(m);
        setYear(y);
        loadData(m, y, true);
    };

    const next = () => {
        setPrevMonth(month);
        setPrevYear(year);

        let m = month + 1;
        let y = year;
        if (m > 12) {
            m = 1;
            y += 1;
        }
        setMonth(m);
        setYear(y);
        loadData(m, y, true);
    };

    if (loading) {
        return (
            <div className="dashboard__spinner">
                <Spinner />
            </div>
        );
    }

    if (alert) {
        return (
            <div className="dashboard__spinner">
                <AlertMessage
                    message={alert.message}
                    type={alert.type}
                    onClose={() => setAlert(null)}
                />
                <Spinner />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="dashboard__spinner">
                <AlertMessage
                    message={"Нет данных для отображения."}
                    type="warning"
                    onClose={() => setAlert(null)}
                />
                <Spinner />
            </div>
        );
    }

    const total = calculateTotalPremia(data);
    const qualityData = safeArray(data.ServiceQuality)[0] || {};
    const callCenterValue = (qualityData?.call_center ?? 0) === 0 ? 5 : qualityData?.call_center ?? 5;
    const testsValue = (qualityData?.tests ?? 0) === 0 ? 5 : qualityData?.tests ?? 5;
    const complaintValue = qualityData?.complaint ?? 0;

    return (
        <>
            <div className="dashboard">
                <Header
                    month={month}
                    year={year}
                    total={total}
                    plan={data.plan || 0}
                    onPrev={prev}
                    onNext={next}
                    loading={loading}
                />

                <div className="dashboard__sections">
                    {[
                        {
                            title: "Продажа карт и доп. продуктов",
                            rows: [
                                { label: "Карты", value: `${safeArray(data.CardSales)[0]?.cards_prem || 0} TJS` },
                                {
                                    label: "Мобильный банк",
                                    value: `${safeArray(data.MobileBank)[0]?.mobile_bank_connects * 10 || 0} TJS`
                                },
                                { label: "ЗП Проект", value: `${data.salary_project || 0} TJS` }
                            ],
                            sum: (
                                (safeArray(data.CardSales)[0]?.cards_prem || 0) +
                                (safeArray(data.MobileBank)[0]?.mobile_bank_connects * 10 || 0) +
                                (data.salary_project || 0)
                            ).toFixed(1) + " TJS"
                        },
                        {
                            title: "Обороты по картам",
                            rows: [
                                {
                                    label: "Оборот дебет + остаток",
                                    value: `${safeArray(data.CardTurnovers)[0]?.card_turnovers_prem?.toFixed(3) || 0} TJS`
                                },
                                {
                                    label: "Активные карты",
                                    value: `${safeArray(data.CardTurnovers)[0]?.active_cards_perms?.toFixed(3) || 0} TJS`
                                }
                            ],
                            sum: (
                                (safeArray(data.CardTurnovers)[0]?.card_turnovers_prem || 0) +
                                (safeArray(data.CardTurnovers)[0]?.active_cards_perms || 0)
                            ).toFixed(3) + " TJS"
                        },
                        {
                            title: "Качество обслуживания",
                            rows: [
                                {
                                    label: "Средняя оценка",
                                    value: `${((callCenterValue + testsValue) / 2).toFixed(1)} Балла`
                                },
                                {
                                    label: "Жалобы + ОЗ",
                                    value: `${complaintValue} ШТ.`
                                },
                                {
                                    label: "Тесты",
                                    value: `${testsValue} Балла`
                                }
                            ],
                            sum: null
                        }
                    ].map((section, index) => (
                        <section key={index} className="card" style={{ '--card-index': index }}>
                            <h3 className="card__title">{section.title}</h3>
                            {section.rows.map((row, rowIndex) => (
                                <div key={rowIndex} className="card__row">
                                    <div>{row.label}: <b>{row.value}</b></div>
                                </div>
                            ))}
                            {section.sum && (
                                <div className="card__sum">{section.sum}</div>
                            )}
                        </section>
                    ))}
                </div>

                <RenderPage pageKey="employees">
                    <ChairmanEmployeeParentComponent
                        workerId={workerId}
                        year={year}
                    />
                </RenderPage>
            </div>

            <div className="dashboard__report">
                <ReportButton navigateTo='/worker/reports' descButton='Отчет' />
            </div>
        </>
    );
}
