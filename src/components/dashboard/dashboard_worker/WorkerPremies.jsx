import React from 'react';
import Header from "./WorkerPremiesHeader.jsx";
import '../../../styles/components/WorkerPremies.scss';
import { AnimatePresence, motion } from 'framer-motion';
import ReportButton from "./ReportButton.jsx";

const FinancialSummary = () => {
    return (
        <div className="dashboard">
            {/* Верхний блок */}
            <Header />

            {/* Продажа карт и дополнительных продуктов */}
            <div className="card">
                <div className="card__title">Продажа карт и дополнительных продуктов</div>
                <div className="card__content">
                    <div className="card__column">
                        <div className="card__row">
                            <span>Карты: 130 TJS</span>
                        </div>
                        <div className="card__row">
                            <span>Мобильный банк: 115 TJS</span>
                        </div>
                    </div>
                    <div className="card__column">
                        <div className="card__row">
                            <span>Овердрафт: 120 TJS</span>
                        </div>
                        <div className="card__row">
                            <span>ЗП Проект: 100 TJS</span>
                        </div>
                    </div>
                </div>
                <div className="card__footer">
                    <span className="card__footer-label">571 TJS</span>
                </div>
            </div>

            {/* Обороты по картам */}
            <div className="card">
                <div className="card__title">Обороты по картам</div>
                <div className="card__content">
                    <div className="card__column">
                        <div className="card__row">
                            <span>Оборот по дебету + остаток: 350,07 TJS</span>
                        </div>
                    </div>
                    <div className="card__column">
                        <div className="card__row">
                            <span>Количество активных карт: 259,2 TJS</span>
                        </div>
                    </div>
                </div>
                <div className="card__footer">
                    <span className="card__footer-label">467 TJS</span>
                </div>
            </div>

            {/* Качество обслуживания */}
            <div className="card">
                <div className="card__title">Качество обслуживания</div>
                <div className="card__content column-mode">
                    <div className="card__row"><span>Средняя оценка: 7,2 Балла</span></div>
                    <div className="card__row"><span>Жалобы + ОЗ: 0 ШТ</span></div>
                    <div className="card__row"><span>Тесты: 7 баллов</span></div>
                    <div className="card__row"><span>Мотивация от руководства: 0 баллов</span></div>
                </div>
                <div className="card__footer">
                    <span className="card__footer-label">+10%</span>
                </div>
            </div>

            <ReportButton navigateTo='/worker/reports' descButton='Отчеты' />
        </div>
    );
};

const renderPage = () => {
    const commonProps = {
        initial: { opacity: 0, x: 10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -10 },
        transition: { duration: 0.3 }
    };

    return (
        <motion.div key="mb" {...commonProps}>
            <FinancialSummary />
        </motion.div>
    );
};

const WorkerPremiesBlockInfo = () => {
    return (
        <div className="block_info_prems" align="center">
            <AnimatePresence mode="wait">
                {renderPage()}
            </AnimatePresence>
        </div>
    );
};

export default WorkerPremiesBlockInfo;
