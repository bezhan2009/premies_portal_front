import React, { useState, useEffect } from 'react';
import '../../../../styles/components/ProcessingIntegration.scss';
import '../../../../styles/components/BlockInfo.scss';
import AlertMessage from "../../../general/AlertMessage.jsx";

// Дефолтные значения лимитов для сброса
const DEFAULT_LIMIT_VALUES = {
    'LMTTZ285': 100,
    'LMTTZ292': 50,
    'LMTTZ272': 30,
    'LMTTZ288': 30,
    'LMTTZ271': 200000,
    'LMTTZ273': 6000000,
    'LMTTZ280': 50,
    'LMTTZ281': 3000000,
    'LMTTZ268': 50,
    'LMTTZ270': 1500,
    'LMTTZ283': 100000,
    'LMTTZ290': 900,
    'LMTTZ274': 900,
    'LMTTZ294': 1500,
    'LMTTZ371': 999999999999,
    'LMTTZ276': 50,
    'LMTTZ278': 1500,
    'LMTTZ282': 1500,
    'LMTTZ297': 3000000,
    'LMTTZ269': 3000000,
    'LMTTZ279': 100000,
    'LMTTZ286': 1500,
    'LMTTZ298': 1500,
    'LMTTZ289': 3000000,
    'LMTTZ291': 300000,
    'LMTTZ296': 50,
    'LMTTZ275': 3200,
    'LMTTZ287': 100000,
    'LMTTZ293': 9000000,
    'LMTTZ369': 999999999999,
    'LMTTZ284': 50,
    'LMTTZ370': 999999999999,
    'LMTTZ372': 999999999999,
    'LMTTZ267': 100000,
    'LMTTZ295': 100000,
    'LMTTZ277': 6000000
};

// Функция для получения человеко-читаемого названия лимита
const getLimitDescription = (limitId) => {
    const descriptions = {
        'LMTTZ285': 'Дневной лимит ATM снятий',
        'LMTTZ292': 'Дневной лимит количества ATM операций',
        'LMTTZ272': 'Лимит POS операций в день',
        'LMTTZ288': 'Количество POS операций в день',
        'LMTTZ271': 'Месячный лимит ATM снятий',
        'LMTTZ273': 'Общий месячный лимит операций',
        'LMTTZ280': 'Лимит онлайн покупок в день',
        'LMTTZ281': 'Месячный лимит онлайн покупок',
        'LMTTZ268': 'Минимальный лимит операции',
        'LMTTZ270': 'Дневной лимит переводов',
        'LMTTZ283': 'Лимит операций без PIN',
        'LMTTZ290': 'Лимит cash advance в день',
        'LMTTZ274': 'Лимит международных операций',
        'LMTTZ294': 'Лимит мобильных платежей',
        'LMTTZ371': 'Максимальный лимит операций',
        'LMTTZ276': 'Лимит микроплатежей',
        'LMTTZ278': 'Лимит P2P переводов',
        'LMTTZ282': 'Лимит электронных кошельков',
        'LMTTZ297': 'Месячный лимит переводов',
        'LMTTZ269': 'Общий месячный лимит карты',
        'LMTTZ279': 'Лимит операций через интернет',
        'LMTTZ286': 'Лимит бесконтактных платежей',
        'LMTTZ298': 'Лимит QR-платежей',
        'LMTTZ289': 'Годовой лимит операций',
        'LMTTZ291': 'Лимит валютных операций',
        'LMTTZ296': 'Лимит СМС-платежей',
        'LMTTZ275': 'Комиссионный лимит',
        'LMTTZ287': 'Лимит операций в торговых точках',
        'LMTTZ293': 'Максимальный годовой лимит',
        'LMTTZ369': 'Технический лимит системы',
        'LMTTZ284': 'Лимит операций через банкомат',
        'LMTTZ370': 'Системный лимит безопасности',
        'LMTTZ372': 'Максимальный технический лимит',
        'LMTTZ267': 'Базовый лимит операций',
        'LMTTZ295': 'Лимит автоплатежей',
        'LMTTZ277': 'Специальный лимит операций'
    };

    return descriptions[limitId] || `Лимит ${limitId}`;
};

// API функции
const API_BASE_URL = import.meta.env.VITE_BACKEND_PROCESSING_URL;

const api = {
    getLimits: async (cardNumber) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE_URL}/processing/limits/${cardNumber}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка получения лимитов:', error);
            throw error;
        }
    },

    updateLimit: async (cardNumber, limitName, limitValue) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE_URL}/processing/limits/${cardNumber}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    limitName,
                    limitValue
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка обновления лимита:', error);
            throw error;
        }
    }
};

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
                        Вы уверены, что хотите сбросить все изменения к дефолтным значениям?
                    </p>
                    {changesCount > 0 && (
                        <div className="modal-processing__changes-info">
                            Будет сброшено <strong>{changesCount}</strong> лимитов
                        </div>
                    )}
                    <p className="modal-processing__confirmation-subtext">
                        Все лимиты будут установлены в дефолтные значения.
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
            setValue((limit.newValue || limit.currentValue).toString());
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

        onSave(limit.name, numValue);
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
                    <p className="modal-processing__subtitle">{getLimitDescription(limit?.name)}</p>
                    <p className="modal-processing__id">ID: {limit?.name}</p>
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
                        Текущее значение: <strong>{limit?.currentValue?.toLocaleString('ru-RU')}</strong>
                    </div>
                    <div className="modal-processing__info">
                        Дефолтное значение: <strong>{DEFAULT_LIMIT_VALUES[limit?.name]?.toLocaleString('ru-RU') || 'Не определено'}</strong>
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
    const [limitData, setLimitData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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
    const handleLimitChange = (limitName, newValue) => {
        setLimitData(prevData =>
            prevData.map(item =>
                item.name === limitName ? { ...item, newValue } : item
            )
        );
    };

    // Функция для поиска данных по номеру карты
    const handleCardNumberSearch = async () => {
        if (cardNumber.trim()) {
            setIsLoading(true);
            try {
                const limits = await api.getLimits(cardNumber);

                // Преобразуем данные API в нужный формат
                const formattedLimits = limits.map(limit => ({
                    name: limit.name,
                    description: getLimitDescription(limit.name),
                    currentValue: parseInt(limit.currentValue) || 0,
                    value: parseInt(limit.value) || 0,
                    newValue: null,
                    cycleType: limit.cycleType,
                    cycleLength: limit.cycleLength,
                    currency: limit.currency
                }));

                setLimitData(formattedLimits);
                showAlert(`Загружено ${formattedLimits.length} лимитов`, 'success');
            } catch (error) {
                showAlert('Ошибка при загрузке данных: ' + error.message, 'error');
                setLimitData([]);
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Функция для сохранения всех изменений
    const handleSaveAll = async () => {
        const changes = limitData.filter(item => item.newValue !== null && item.newValue !== item.currentValue);

        if (changes.length === 0) {
            showAlert('Нет изменений для сохранения', 'info');
            return;
        }

        setIsSaving(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            // Выполняем все запросы последовательно
            for (const change of changes) {
                try {
                    await api.updateLimit(cardNumber, change.name, change.newValue.toString());
                    successCount++;
                } catch (error) {
                    console.error(`Ошибка обновления лимита ${change.name}:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                // Обновляем состояние для успешно сохраненных лимитов
                setLimitData(prevData =>
                    prevData.map(item => {
                        if (item.newValue !== null && item.newValue !== item.currentValue) {
                            return {
                                ...item,
                                currentValue: item.newValue,
                                newValue: null
                            };
                        }
                        return item;
                    })
                );

                showAlert(
                    `Успешно сохранено ${successCount} лимитов` +
                    (errorCount > 0 ? `, ошибок: ${errorCount}` : ''),
                    errorCount > 0 ? 'warning' : 'success'
                );
            } else {
                showAlert('Не удалось сохранить изменения', 'error');
            }
        } catch (error) {
            showAlert('Критическая ошибка при сохранении: ' + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Функция для сброса всех изменений к дефолтным значениям
    const handleResetAll = async () => {
        if (limitData.length === 0) {
            showAlert('Нет данных для сброса', 'info');
            return;
        }

        setIsSaving(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            // Сбрасываем все лимиты к дефолтным значениям
            for (const limit of limitData) {
                const defaultValue = DEFAULT_LIMIT_VALUES[limit.name];
                if (defaultValue !== undefined && defaultValue !== limit.currentValue) {
                    try {
                        await api.updateLimit(cardNumber, limit.name, defaultValue.toString());
                        successCount++;
                    } catch (error) {
                        console.error(`Ошибка сброса лимита ${limit.name}:`, error);
                        errorCount++;
                    }
                }
            }

            if (successCount > 0) {
                // Обновляем состояние
                setLimitData(prevData =>
                    prevData.map(item => ({
                        ...item,
                        currentValue: DEFAULT_LIMIT_VALUES[item.name] || item.currentValue,
                        newValue: null
                    }))
                );

                showAlert(
                    `Сброшено ${successCount} лимитов к дефолтным значениям` +
                    (errorCount > 0 ? `, ошибок: ${errorCount}` : ''),
                    errorCount > 0 ? 'warning' : 'success'
                );
            } else {
                showAlert('Нет лимитов для сброса или все уже имеют дефолтные значения', 'info');
            }
        } catch (error) {
            showAlert('Критическая ошибка при сбросе: ' + error.message, 'error');
        } finally {
            setIsSaving(false);
        }

        setResetModal({ isOpen: false });
    };

    // Функция для открытия модалки подтверждения сброса
    const handleOpenResetModal = () => {
        if (limitData.length === 0) {
            showAlert('Нет данных для сброса', 'info');
            return;
        }

        // Подсчитываем количество лимитов, которые будут сброшены
        const changesCount = limitData.filter(item => {
            const defaultValue = DEFAULT_LIMIT_VALUES[item.name];
            return defaultValue !== undefined && defaultValue !== item.currentValue;
        }).length;

        if (changesCount === 0) {
            showAlert('Все лимиты уже имеют дефолтные значения', 'info');
            return;
        }

        setResetModal({
            isOpen: true
        });
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
    const handleResetLimit = (limitName) => {
        setLimitData(prevData =>
            prevData.map(item =>
                item.name === limitName ? { ...item, newValue: null } : item
            )
        );
        showAlert('Изменение сброшено', 'success');
    };

    // Получаем количество изменений
    const changesCount = limitData.filter(item => item.newValue !== null && item.newValue !== item.currentValue).length;

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
                                        disabled={isLoading || isSaving}
                                    />
                                </div>
                                <button
                                    onClick={handleCardNumberSearch}
                                    disabled={cardNumber.length !== 16 || isLoading || isSaving}
                                    className={`search-card__button ${isLoading ? 'search-card__button--loading' : ''}`}
                                >
                                    {isLoading ? 'Поиск...' : 'Найти'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Таблица лимитов */}
                    {limitData.length > 0 && (
                        <div className="processing-integration__limits-table">
                            <div className="limits-table">
                                <div className="limits-table__header">
                                    <h2 className="limits-table__title">
                                        Текущие лимиты карты {displayCardNumber}
                                    </h2>
                                    <div className="limits-table__actions">
                                        <button
                                            onClick={handleOpenResetModal}
                                            className="limits-table__action-btn limits-table__action-btn--secondary"
                                            disabled={isSaving || limitData.length === 0}
                                        >
                                            {isSaving ? 'Обработка...' : 'Сбросить все'}
                                        </button>
                                        <button
                                            onClick={handleSaveAll}
                                            className="limits-table__action-btn limits-table__action-btn--primary"
                                            disabled={changesCount === 0 || isSaving}
                                        >
                                            {isSaving ? 'Сохранение...' : 'Сохранить все'}
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
                                            <th className="limits-table__th limits-table__th--default">
                                                Дефолт
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
                                            <tr key={limit.name} className="limits-table__row">
                                                <td className="limits-table__td limits-table__td--info">
                                                    <div className="limit-info">
                                                        <div className="limit-info__name">
                                                            {limit.description}
                                                        </div>
                                                        <div className="limit-info__id">
                                                            ID: {limit.name}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="limits-table__td limits-table__td--value">
                                                    <span className="current-value">
                                                        {limit.currentValue.toLocaleString('ru-RU')}
                                                    </span>
                                                </td>
                                                <td className="limits-table__td limits-table__td--value">
                                                    <span className="default-value">
                                                        {DEFAULT_LIMIT_VALUES[limit.name]?.toLocaleString('ru-RU') || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="limits-table__td limits-table__td--value">
                                                    {limit.newValue !== null ? (
                                                        <span className="new-value new-value--changed">
                                                            {limit.newValue.toLocaleString('ru-RU')}
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
                                                            disabled={isSaving}
                                                        >
                                                            Изменить
                                                        </button>
                                                        <button
                                                            onClick={() => handleResetLimit(limit.name)}
                                                            disabled={limit.newValue === null || isSaving}
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
                                        <span className="limits-table__stat">
                                            Карта: {displayCardNumber}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Индикатор загрузки */}
                    {isLoading && (
                        <div className="processing-integration__loading">
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                                <p>Загрузка лимитов...</p>
                            </div>
                        </div>
                    )}

                    {/* Сообщение об отсутствии данных */}
                    {!isLoading && limitData.length === 0 && cardNumber.length === 16 && (
                        <div className="processing-integration__no-data">
                            <div className="no-data">
                                <h3>Данные не найдены</h3>
                                <p>Для карты {displayCardNumber} не найдено лимитов или произошла ошибка загрузки.</p>
                            </div>
                        </div>
                    )}

                    {/* JSON данные для отладки */}
                    {/*<div className="processing-integration__debug">*/}
                    {/*    <details className="debug-section">*/}
                    {/*        <summary className="debug-section__summary">*/}
                    {/*            JSON данные (для разработки)*/}
                    {/*        </summary>*/}
                    {/*        <pre className="debug-section__content">*/}
                    {/*            {JSON.stringify({*/}
                    {/*                cardNumber: cardNumber,*/}
                    {/*                displayCardNumber: displayCardNumber,*/}
                    {/*                limitsCount: limitData.length,*/}
                    {/*                changesCount: changesCount,*/}
                    {/*                apiBaseUrl: API_BASE_URL,*/}
                    {/*                limits: limitData.slice(0, 3) // Показываем только первые 3 для краткости*/}
                    {/*            }, null, 2)}*/}
                    {/*        </pre>*/}
                    {/*    </details>*/}
                    {/*</div>*/}
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
                changesCount={limitData.filter(item => {
                    const defaultValue = DEFAULT_LIMIT_VALUES[item.name];
                    return defaultValue !== undefined && defaultValue !== item.currentValue;
                }).length}
            />
        </div>
    );
}
