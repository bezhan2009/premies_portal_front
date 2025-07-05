import React, { useEffect, useState } from 'react';
import Header from './WorkerPremiesHeader.jsx';
import { fetchWorkerData } from '../../../api/workers/reports/worker_premies.js';
import '../../../styles/components/WorkerPremies.scss';
import ReportButton from "./ReportButton.jsx";
import Spinner from "../../Spinner.jsx";
import AlertMessage from "../../general/AlertMessage.jsx";
import {calculateTotalPremia} from "../../../api/utils/calculate_premia.js";

export default function Dashboard() {
    const now = new Date();

    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [prevMonth, setPrevMonth] = useState(month);
    const [prevYear, setPrevYear] = useState(year);

    const [data, setData] = useState(null);
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
            <div style={{ transform: 'scale(2)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: "100px", width: "auto" }}>
                <Spinner />
            </div>
        );
    }

    if (alert) {
        return (
            <>
                <AlertMessage
                    message={alert.message}
                    type={alert.type}
                    onClose={() => setAlert(null)}
                />
                <div style={{
                    transform: 'scale(2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: "100px",
                    width: "auto"
                }}>
                    <Spinner/>
                </div>
            </>
        );
    }

    if (!data) {
        return (
            <>
                <AlertMessage
                    message={"Нет данных для отображения."}
                    type="warning"
                    onClose={() => setAlert(null)}
                />
                <div className="dashboard__spinner">
                    <Spinner />
                </div>
            </>
        );
    }

    // Итоговая премия
    const total = calculateTotalPremia(data);

    return (
        <div className="block_info_prems" align="center">
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
                    <section className="card">
                        <h3 className="card__title">Продажа карт и доп. продуктов</h3>
                        <div className="card__row">
                            <div>Карты: <b>{safeArray(data.CardSales)[0]?.cards_prem || 0} TJS</b></div>
                        </div>
                        <div className="card__row">
                            <div>Мобильный банк: <b>{safeArray(data.MobileBank)[0]?.mobile_bank_prem || 0} TJS</b></div>
                        </div>
                        <div className="card__row">
                            <div>ЗП Проект: <b>{data.salary_project || 0} TJS</b></div>
                        </div>
                        <div className="card__sum">
                            {((safeArray(data.CardSales)[0]?.cards_prem || 0) + (safeArray(data.MobileBank)[0]?.mobile_bank_prem || 0) + (data.salary_project || 0)).toFixed(1)} TJS
                        </div>
                    </section>

                    <section className="card">
                        <h3 className="card__title">Обороты по картам</h3>
                        <div className="card__row">
                            <div>Оборот
                                дебет +
                                остаток: <b>{safeArray(data.CardTurnovers)[0]?.card_turnovers_prem?.toFixed(3) || 0} TJS</b>
                            </div>
                        </div>
                        <div className="card__row">
                            <div>Активные
                                карты: <b>{safeArray(data.CardTurnovers)[0]?.active_cards_perms?.toFixed(3) || 0} TJS</b>
                            </div>
                        </div>
                        <div className="card__sum">
                            {((safeArray(data.CardTurnovers)[0]?.card_turnovers_prem || 0) + (safeArray(data.CardTurnovers)[0]?.active_cards_perms || 0)).toFixed(3)} TJS
                        </div>
                    </section>

                    <section className="card">
                        <h3 className="card__title">Качество обслуживания</h3>
                        <div className="card__row">
                            <div>Средняя оценка: <b>{(((safeArray(data.ServiceQuality)[0]?.call_center || 0) +
                                (safeArray(data.ServiceQuality)[0]?.tests || 0)) / 2).toFixed(1)} Балла</b></div>
                        </div>
                        <div className="card__row">
                            <div>Жалобы + ОЗ: <b>{safeArray(data.ServiceQuality)[0]?.complaint || 0} ШТ.</b></div>
                        </div>
                        <div className="card__row">
                            <div>Тесты: <b>{safeArray(data.ServiceQuality)[0]?.tests || 0} Балла</b></div>
                        </div>
                    </section>
                </div>
                <ReportButton navigateTo='/worker/reports' descButton='Отчет' />
            </div>
        </div>
    );
}
