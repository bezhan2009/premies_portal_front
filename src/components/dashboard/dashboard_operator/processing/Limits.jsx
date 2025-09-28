import React, { useState, useEffect } from 'react';
import '../../../../styles/components/ProcessingIntegration.scss';
import '../../../../styles/components/BlockInfo.scss';
import AlertMessage from "../../../general/AlertMessage.jsx";


// Mock данные для демонстрации
const mockLimitData = [
    { id: 'LMTTZ211', name: 'Activ FVN 777 us-on-us day amount', currentValue: 100000, newValue: 999999099999 },
    { id: 'LMTTZ212', name: 'Activ PVN 777 us-on-us day count', currentValue: 999999999999, newValue: 959999999999 },
    { id: 'LMTTZ213', name: 'Activ PVN 777 us-on-us month amount', currentValue: 999999999999, newValue: 999956999999 },
    { id: 'LMTTZ214', name: 'Activ PVN 777 us-on-us month count', currentValue: 2000000, newValue: 999999999999 },
    { id: 'LMTTZ215', name: 'Activ ATM 700 us-on-us day amount', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ216', name: 'Activ ATM 700 us-on-us day count', currentValue: 999999999999, newValue: 999969990506 },
    { id: 'LMTTZ217', name: 'Activ ATM 700 us-on-us month amount', currentValue: 2000000, newValue: 999999999999 },
    { id: 'LMTTZ218', name: 'Activ ATM 700 us-on-us month count', currentValue: 999999999999, newValue: 999565999695 },
    { id: 'LMTTZ219', name: 'Activ POS 774 us-on-us day amount', currentValue: 0, newValue: 399599999999 },
    { id: 'LMTTZ220', name: 'Activ POS 774 us-on-us day count', currentValue: 99900999990, newValue: 999999999999 },
    { id: 'LMTTZ221', name: 'Activ POS 774 us-on-us month amount', currentValue: 1000000, newValue: 999909999999 },
    { id: 'LMTTZ222', name: 'Activ POS 774 us-on-us month count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ223', name: 'Activ E-POS 680 us-on-us day amount', currentValue: 2000000, newValue: 999999999999 },
    { id: 'LMTTZ224', name: 'Activ E-POS 680 us-on-us day count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ225', name: 'Activ E-POS 680 us-on-us month amount', currentValue: 0, newValue: 5999999999 },
    { id: 'LMTTZ226', name: 'Activ E-POS 680 us-on-us month count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ227', name: 'Activ FVN 777 us-on-them day amount', currentValue: 1000000, newValue: 999909999909 },
    { id: 'LMTTZ228', name: 'Activ PVN 777 us-on-them day count', currentValue: 999999999999, newValue: 999599999999 },
    { id: 'LMTTZ229', name: 'Activ PVN 777 us-on-them month amount', currentValue: 2000000, newValue: 999999999999 },
    { id: 'LMTTZ230', name: 'Activ PVN 777 us-on-them month count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ231', name: 'Activ ATM 700 us-on-them day amount', currentValue: 2000000, newValue: 999999999999 },
    { id: 'LMTTZ232', name: 'Activ ATM 700 us-on-them day count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ233', name: 'Activ ATM 700 us-on-them month amount', currentValue: 0, newValue: 5999999999 },
    { id: 'LMTTZ234', name: 'Activ ATM 700 us-on-them month count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ235', name: 'Activ POS 774 us-on-them day amount', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ236', name: 'Activ POS 774 us-on-them day count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ237', name: 'Activ POS 774 us-on-them month amount', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ238', name: 'Activ POS 774 us-on-them month count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ239', name: 'Activ E-POS 680 us-on-them day amount', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ240', name: 'Activ E-POS 680 us-on-them day count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ241', name: 'Activ E-POS 680 us-on-them month amount', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ242', name: 'Activ E-POS 680 us-on-them month count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ243', name: 'Activ Us-on-Us All day amount', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ244', name: 'Activ Us-on-Us All day count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ245', name: 'Activ Us-on-Us All month amount', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ246', name: 'Activ Us-on-Us All month count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ247', name: 'Activ Us-on-Them All day amount', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ248', name: 'Activ Us-on-Them All day count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ249', name: 'Activ Us-on-Them All month amount', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ250', name: 'Activ Us-on-Them All month count', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ251', name: 'Activ 700-777 day limit for debit', currentValue: 999999999999, newValue: 999999999999 },
    { id: 'LMTTZ252', name: 'Activ 700-777 month limit for debit', currentValue: 999999999999, newValue: 999999999999 }
];

// Компонент модалки подтверждения сброса
const ResetConfirmationModal = ({
                                    isOpen,
                                    onClose,
                                    onConfirm,
                                    changesCount
                                }) => {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    };

    const handleConfirm = () => {
        onConfirm();
        handleClose();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
        if (e.key === 'Escape') {
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`modal-overlay-processing ${isClosing ? 'modal-overlay-processing--closing' : ''}`}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className={`modal-processing modal-processing--confirmation ${isClosing ? 'modal-processing--closing' : ''}`}>
                <button
                    className="modal-processing__close"
                    onClick={handleClose}
                    aria-label="Закрыть"
                >
                    ×
                </button>

                <div className="modal-processing__header">
                    <h3 className="modal-processing__title">Подтверждение сброса</h3>
                    <div className="modal-processing__warning-icon">
                        ⚠️
                    </div>
                </div>

                <div className="modal-processing__body">
                    <p className="modal-processing__confirmation-text">
                        Вы уверены, что хотите сбросить все изменения?
                    </p>
                    {changesCount > 0 && (
                        <div className="modal-processing__changes-info">
                            Будет отменено <strong>{changesCount}</strong> изменений
                        </div>
                    )}
                    <p className="modal-processing__confirmation-subtext">
                        Это действие нельзя отменить.
                    </p>
                </div>

                <div className="modal-processing__footer">
                    <button
                        className="modal-processing__btn modal-processing__btn--secondary"
                        onClick={handleClose}
                        onKeyPress={handleKeyPress}
                    >
                        Отмена
                    </button>
                    <button
                        className="modal-processing__btn modal-processing__btn--danger"
                        onClick={handleConfirm}
                        autoFocus
                    >
                        Сбросить все
                    </button>
                </div>
            </div>
        </div>
    );
};

// Компонент модалки для изменения лимита
const LimitEditModal = ({
                            isOpen,
                            onClose,
                            limit,
                            onSave
                        }) => {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen && limit) {
            setValue(limit.currentValue.toString());
            setError('');
        }
    }, [isOpen, limit]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    };

    const handleSave = () => {
        const numValue = parseFloat(value.replace(/\s/g, ''));

        if (!value.trim()) {
            setError('Значение не может быть пустым');
            return;
        }

        if (isNaN(numValue) || numValue < 0) {
            setError('Введите корректное числовое значение');
            return;
        }

        if (numValue > 999999999999) {
            setError('Значение не может превышать 999,999,999,999');
            return;
        }

        onSave(limit.id, numValue);
        handleClose();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        }
        if (e.key === 'Escape') {
            handleClose();
        }
    };

    const formatNumberWithSpaces = (val) => {
        // Удаляем всё кроме цифр
        const digitsOnly = val.replace(/\D/g, '');
        // Добавляем пробелы каждые 3 цифры справа
        return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    if (!isOpen) return null;

    return (
        <div
            className={`modal-overlay-processing ${isClosing ? 'modal-overlay-processing--closing' : ''}`}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className={`modal-processing ${isClosing ? 'modal-processing--closing' : ''}`}>
                <button
                    className="modal-processing__close"
                    onClick={handleClose}
                    aria-label="Закрыть"
                >
                    ×
                </button>

                <div className="modal-processing__header">
                    <h3 className="modal-processing__title">Изменение лимита</h3>
                    <p className="modal-processing__subtitle">{limit?.name}</p>
                    <p className="modal-processing__id">ID: {limit?.id}</p>
                </div>

                <div className="modal-processing__body">
                    <label className="modal-processing__label" htmlFor="limitValue">
                        Новое значение лимита
                    </label>
                    <input
                        id="limitValue"
                        type="text"
                        className={`modal-processing__input ${error ? 'modal-processing__input--error' : ''}`}
                        value={formatNumberWithSpaces(value)}
                        onChange={(e) => {
                            setValue(e.target.value.replace(/\s/g, ''));
                            if (error) setError('');
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Введите новое значение"
                        autoFocus
                    />
                    {error && <div className="modal-processing__error">{error}</div>}

                    <div className="modal-processing__info">
                        Текущее значение: <strong>{limit?.currentValue?.toLocaleString('ru-RU')} $</strong>
                    </div>
                </div>

                <div className="modal-processing__footer">
                    <button
                        className="modal-processing__btn modal-processing__btn--secondary"
                        onClick={handleClose}
                    >
                        Отмена
                    </button>
                    <button
                        className="modal-processing__btn modal-processing__btn--primary"
                        onClick={handleSave}
                        disabled={!value.trim()}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function ProcessingIntegration() {
    const [cardNumber, setCardNumber] = useState('');
    const [displayCardNumber, setDisplayCardNumber] = useState('');
    const [limitData, setLimitData] = useState(mockLimitData);
    const [isLoading, setIsLoading] = useState(false);
    const [editModal, setEditModal] = useState({
        isOpen: false,
        limit: null
    });
    const [resetModal, setResetModal] = useState({
        isOpen: false
    });
    const [alert, setAlert] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    // Функция для показа уведомления
    const showAlert = (message, type = 'success') => {
        setAlert({
            show: true,
            message,
            type
        });
    };

    // Функция для скрытия уведомления
    const hideAlert = () => {
        setAlert({
            show: false,
            message: '',
            type: 'success'
        });
    };

    // Функция для форматирования номера карты
    const formatCardNumber = (value) => {
        // Удаляем всё кроме цифр
        const digitsOnly = value.replace(/\D/g, '');
        // Добавляем пробелы каждые 4 цифры
        const formatted = digitsOnly.replace(/(\d{4})(?=\d)/g, '$1 ');
        return formatted;
    };

    // Обработка изменения номера карты
    const handleCardNumberChange = (e) => {
        const value = e.target.value;
        const digitsOnly = value.replace(/\D/g, '').slice(0, 16);

        setCardNumber(digitsOnly);
        setDisplayCardNumber(formatCardNumber(digitsOnly));
    };

    // Функция для обработки изменения лимита
    const handleLimitChange = (id, newValue) => {
        setLimitData(prevData =>
            prevData.map(item =>
                item.id === id ? { ...item, newValue } : item
            )
        );
        console.log(`Изменение лимита ${id} на ${newValue}`);
    };

    // Функция для поиска данных по номеру карты
    const handleCardNumberSearch = () => {
        if (cardNumber.trim()) {
            setIsLoading(true);
            // Имитация загрузки данных с бекенда
            setTimeout(() => {
                console.log(`Поиск данных для карты: ${cardNumber}`);
                setIsLoading(false);
                // Здесь будет реальный вызов API
            }, 1500);
        }
    };

    // Функция для сохранения всех изменений
    const handleSaveAll = () => {
        const changes = limitData.filter(item => item.newValue && item.newValue !== item.currentValue);

        if (changes.length === 0) {
            showAlert('Нет изменений для сохранения', 'info');
            return;
        }

        console.log('Сохранение изменений:', changes);
        showAlert(`Успешно сохранено ${changes.length} изменений`, 'success');

        // Здесь будет реальный вызов API для сохранения
        // После успешного сохранения сбрасываем newValue
        setLimitData(prevData =>
            prevData.map(item => ({
                ...item,
                currentValue: item.newValue || item.currentValue,
                newValue: null
            }))
        );
    };

    // Функция для открытия модалки подтверждения сброса
    const handleOpenResetModal = () => {
        const changesCount = limitData.filter(item => item.newValue && item.newValue !== item.currentValue).length;

        if (changesCount === 0) {
            showAlert('Нет изменений для сброса', 'info');
            return;
        }

        setResetModal({
            isOpen: true
        });
    };

    // Функция для сброса всех изменений
    const handleResetAll = () => {
        const changesCount = limitData.filter(item => item.newValue && item.newValue !== item.currentValue).length;

        setLimitData(prevData =>
            prevData.map(item => ({ ...item, newValue: null }))
        );

        showAlert(`Сброшено ${changesCount} изменений`, 'success');
        setResetModal({ isOpen: false });
    };

    // Функция для закрытия модалки сброса
    const handleCloseResetModal = () => {
        setResetModal({
            isOpen: false
        });
    };

    // Функция для открытия модалки редактирования
    const handleEditLimit = (limit) => {
        setEditModal({
            isOpen: true,
            limit: limit
        });
    };

    // Функция для закрытия модалки
    const handleCloseModal = () => {
        setEditModal({
            isOpen: false,
            limit: null
        });
    };

    // Функция для сброса конкретного лимита
    const handleResetLimit = (id) => {
        setLimitData(prevData =>
            prevData.map(item =>
                item.id === id ? { ...item, newValue: null } : item
            )
        );
        showAlert('Изменение сброшено', 'success');
    };

    // Получаем количество изменений
    const changesCount = limitData.filter(item => item.newValue && item.newValue !== item.currentValue).length;

    return (
        <div className="block_info_prems" align="center">
            {/* Компонент AlertMessage */}
            {alert.show && (
                <AlertMessage
                    message={alert.message}
                    type={alert.type}
                    onClose={hideAlert}
                    duration={3000}
                />
            )}

            <div className="processing-integration">
                <div className="processing-integration__container">
                    {/* Заголовок */}
                    <div className="processing-integration__header">
                        <h1 className="processing-integration__title">
                            Управление лимитами карт
                        </h1>
                        <p className="processing-integration__subtitle">
                            Поиск и изменение лимитов по номеру банковской карты
                        </p>
                    </div>

                    {/* Поиск по номеру карты */}
                    <div className="processing-integration__search-card">
                        <div className="search-card">
                            <div className="search-card__content">
                                <div className="search-card__input-group">
                                    <label
                                        htmlFor="cardNumber"
                                        className="search-card__label"
                                    >
                                        Номер банковской карты
                                    </label>
                                    <input
                                        type="text"
                                        id="cardNumber"
                                        value={displayCardNumber}
                                        onChange={handleCardNumberChange}
                                        placeholder="0000 0000 0000 0000"
                                        className="search-card__input"
                                        maxLength={19} // 16 цифр + 3 пробела
                                    />
                                </div>
                                <button
                                    onClick={handleCardNumberSearch}
                                    disabled={cardNumber.length !== 16 || isLoading}
                                    className={`search-card__button ${isLoading ? 'search-card__button--loading' : ''}`}
                                >
                                    {isLoading ? 'Поиск...' : 'Найти'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Таблица лимитов */}
                    <div className="processing-integration__limits-table">
                        <div className="limits-table">
                            <div className="limits-table__header">
                                <h2 className="limits-table__title">
                                    Текущие лимиты
                                </h2>
                                <div className="limits-table__actions">
                                    <button
                                        onClick={handleOpenResetModal}
                                        className="limits-table__action-btn limits-table__action-btn--secondary"
                                        disabled={changesCount === 0}
                                    >
                                        Сбросить все
                                    </button>
                                    <button
                                        onClick={handleSaveAll}
                                        className="limits-table__action-btn limits-table__action-btn--primary"
                                        disabled={changesCount === 0}
                                    >
                                        Сохранить все
                                    </button>
                                </div>
                            </div>

                            <div className="limits-table__wrapper">
                                <table className="limits-table">
                                    <thead className="limits-table__head">
                                    <tr>
                                        <th className="limits-table__th limits-table__th--id">
                                            ID и Наименование лимита
                                        </th>
                                        <th className="limits-table__th limits-table__th--current">
                                            Текущее значение
                                        </th>
                                        <th className="limits-table__th limits-table__th--new">
                                            Новое значение
                                        </th>
                                        <th className="limits-table__th limits-table__th--actions">
                                            Действия
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="limits-table__body">
                                    {limitData.map((limit) => (
                                        <tr key={limit.id} className="limits-table__row">
                                            <td className="limits-table__td limits-table__td--info">
                                                <div className="limit-info">
                                                    <div className="limit-info__name">
                                                        {limit.name}
                                                    </div>
                                                    <div className="limit-info__id">
                                                        ID: {limit.id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="current-value">
                                                    {limit.currentValue.toLocaleString('ru-RU')} $
                                                </span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                {limit.newValue ? (
                                                    <span className="new-value new-value--changed">
                                                        {limit.newValue.toLocaleString('ru-RU')} $
                                                    </span>
                                                ) : (
                                                    <span className="new-value new-value--empty">
                                                        Не изменено
                                                    </span>
                                                )}
                                            </td>
                                            <td className="limits-table__td limits-table__td--actions">
                                                <div className="action-buttons">
                                                    <button
                                                        onClick={() => handleEditLimit(limit)}
                                                        className="action-buttons__btn action-buttons__btn--edit"
                                                    >
                                                        Изменить
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetLimit(limit.id)}
                                                        disabled={!limit.newValue}
                                                        className="action-buttons__btn action-buttons__btn--reset"
                                                    >
                                                        Сбросить
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Статистика */}
                            <div className="limits-table__footer">
                                <div className="limits-table__stats">
                                    <span className="limits-table__stat">
                                        Всего записей: {limitData.length}
                                    </span>
                                    <span className="limits-table__stat">
                                        Изменено: {changesCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* JSON данные для отладки */}
                    <div className="processing-integration__debug">
                        <details className="debug-section">
                            <summary className="debug-section__summary">
                                JSON данные (для разработки)
                            </summary>
                            <pre className="debug-section__content">
                                {JSON.stringify({
                                    cardNumber: cardNumber,
                                    displayCardNumber: displayCardNumber,
                                    limits: limitData
                                }, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            </div>

            {/* Модалка для изменения лимита */}
            <LimitEditModal
                isOpen={editModal.isOpen}
                onClose={handleCloseModal}
                limit={editModal.limit}
                onSave={handleLimitChange}
            />

            {/* Модалка подтверждения сброса */}
            <ResetConfirmationModal
                isOpen={resetModal.isOpen}
                onClose={handleCloseResetModal}
                onConfirm={handleResetAll}
                changesCount={changesCount}
            />
        </div>
    );
}
