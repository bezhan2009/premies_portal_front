import React from 'react';
import '../../../styles/components/WorkerPremiesHeader.scss';

const TopHeader = () => {
    return (
        <div className="top-header">
            <div className="top-header__left">
                <span className="top-header__nav">&lt;</span>
                <span className="top-header__month">Апрель 2025</span>
            </div>
            <div className="bottom-header__left">
                <span className="bottom-header__date">Актуальность: 20.04.2025</span>
            </div>
            <div className="top-header__right">
                <div className="top-header__total">
                    Итог: <span className="top-header__value">1 141,8 TJS</span>
                </div>
                <div className="top-header__plan">
                    План: <span className="top-header__value top-header__value--plan">1 000 TJS</span>
                </div>
            </div>
        </div>
    );
};

export default TopHeader;
