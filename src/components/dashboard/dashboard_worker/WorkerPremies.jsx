import React from 'react';
import Header from "./WorkerPremiesHeader.jsx";
import '../../../styles/components/WorkerPremies.scss';
import { AnimatePresence, motion } from 'framer-motion';


const FinancialSummary = () => {
    return (
        <div className="dashboard">
            {/* Верхний блок */}
            <Header />

            {/* Первая карточка: Продажа карт и доп. продуктов */}
            <div className="card">
                <div className="card__title">Продажа карт и дополнительных продуктов</div>
                <div className="card__content">
                    <div className="card__column">
                        <div className="card__row">
                            <div className="card__label">Карты:</div>
                            <div className="card__value">130 TJS</div>
                        </div>
                        <div className="card__row">
                            <div className="card__label">Мобильный банк:</div>
                            <div className="card__value">115 TJS</div>
                        </div>
                        <div className="card__row">
                            <div className="card__label">Овердрафт:</div>
                            <div className="card__value">120 TJS</div>
                        </div>
                    </div>
                    <div className="card__column">
                        <div className="card__row">
                            <div className="card__label">ЗП Проект:</div>
                            <div className="card__value">100 TJS</div>
                        </div>
                    </div>
                </div>
                <div className="card__footer">
                    <span className="card__footer-label">571 TJS</span>
                </div>
            </div>

            {/* Вторая карточка: Обороты по картам */}
            <div className="card">
                <div className="card__title">Обороты по картам</div>
                <div className="card__content">
                    <div className="card__column">
                        <div className="card__row">
                            <div className="card__label">Оборот по дебету + остаток:</div>
                            <div className="card__value">350,07 TJS</div>
                        </div>
                        <div className="card__row">
                            <div className="card__label">Количество активных карт:</div>
                            <div className="card__value">259,2 TJS</div>
                        </div>
                    </div>
                    {/* Правая колонка оставим пустой, чтобы не ломать выравнивание */}
                    <div className="card__column"></div>
                </div>
                <div className="card__footer">
                    <span className="card__footer-label">467 TJS</span>
                </div>
            </div>

            {/* Третья карточка: Качество обслуживания */}
            <div className="card">
                <div className="card__title">Качество обслуживания</div>
                <div className="card__content column-mode">
                    <div className="card__row">
                        <div className="card__label">Средняя оценка:</div>
                        <div className="card__value">7,2 Балла</div>
                    </div>
                    <div className="card__row">
                        <div className="card__label">Жалобы + ОЗ:</div>
                        <div className="card__value">0 ШТ</div>
                    </div>
                    <div className="card__row">
                        <div className="card__label">Тесты:</div>
                        <div className="card__value">7 баллов</div>
                    </div>
                    <div className="card__row">
                        <div className="card__label">Мотивация от руководства:</div>
                        <div className="card__value">0 баллов</div>
                    </div>
                </div>
                <div className="card__footer">
                    <span className="card__footer-label">+10%</span>
                </div>
            </div>
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
        <>
            <div className='block_info_prems' align='center'>
                <AnimatePresence mode="wait">
                    {renderPage()}
                </AnimatePresence>
            </div>
        </>
    )
}

export default WorkerPremiesBlockInfo;
