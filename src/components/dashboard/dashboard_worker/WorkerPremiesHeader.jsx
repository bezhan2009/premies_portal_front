import React from 'react';
import '../../../styles/components/WorkerPremiesHeader.scss';

export default function Header({ month, year, total, plan, onPrev, onNext, loading }) {
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель',
        'Май', 'Июнь', 'Июль', 'Август',
        'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    return (
        <div className="header-premis">
            <button
                className="header-premis__nav"
                onClick={onPrev}
                disabled={loading}
            >
                ←
            </button>

            <div className="header-premis__center">
                <span className="header-premis__month">
                  {monthNames[month - 1]} {year}
                </span>
            </div>

            <div className="header-premis__stats">
                {loading
                    ? <span className="header-premis__loading">Загрузка...</span>
                    : <>
                        <span>Итого:</span>
                        <span className="header-premis__total">{total.toFixed(1)} TJS</span>
                    </>
                }
                <br/>

                <span className="header-premis__plan">
                  План: {plan.toLocaleString()} TJS
                </span>
            </div>

            <button
                className="header-premis__nav"
                onClick={onNext}
                disabled={loading}
            >
                →
            </button>
        </div>
    );
}
