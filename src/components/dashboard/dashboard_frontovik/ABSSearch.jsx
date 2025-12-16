import React, { useState } from 'react';
import '../../../styles/ABSSearch.scss'
import '../../../styles/components/BlockInfo.scss';
import '../../../styles/components/ProcessingIntegration.scss';
import AlertMessage from "../../general/AlertMessage.jsx";
const API_BASE_URL = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;

export default function ABSClientSearch() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [displayPhone, setDisplayPhone] = useState('');
    const [clientData, setClientData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
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

    // Функция для форматирования номера телефона
    const formatPhoneNumber = (value) => {
        const digitsOnly = value.replace(/\D/g, '');

        // Если номер начинается с 992, форматируем по-особому
        if (digitsOnly.startsWith('992')) {
            const rest = digitsOnly.substring(3);
            if (rest.length <= 2) return `+${digitsOnly}`;
            if (rest.length <= 5) return `+${digitsOnly.substring(0, 3)} ${rest.substring(0, 2)} ${rest.substring(2)}`;
            if (rest.length <= 7) return `+${digitsOnly.substring(0, 3)} ${rest.substring(0, 2)} ${rest.substring(2, 5)} ${rest.substring(5)}`;
            return `+${digitsOnly.substring(0, 3)} ${rest.substring(0, 2)} ${rest.substring(2, 5)}-${rest.substring(5, 7)}-${rest.substring(7)}`;
        }

        // Общий формат для других номеров
        const match = digitsOnly.match(/^(\d{1,3})(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (!match) return digitsOnly;

        const parts = match.slice(1).filter(Boolean);
        if (parts.length === 0) return '';

        return `+${parts.join(' ')}`;
    };

    // Обработка изменения номера телефона
    const handlePhoneChange = (e) => {
        const value = e.target.value;
        const digitsOnly = value.replace(/\D/g, '');

        // Сохраняем только цифры в state для отправки
        setPhoneNumber(digitsOnly);
        // Сохраняем форматированный номер для отображения
        setDisplayPhone(formatPhoneNumber(digitsOnly));
    };

    // Функция для очистки всех полей
    const handleClear = () => {
        setPhoneNumber('');
        setDisplayPhone('');
        setClientData(null);
    };

    // Функция для поиска клиента в АБС
    const handleSearchClient = async () => {
        if (!phoneNumber) {
            showAlert('Пожалуйста, введите номер телефона', 'error');
            return;
        }

        // Форматируем телефонный номер
        let formattedPhone = phoneNumber.trim();

        // Удаляем все нецифровые символы
        formattedPhone = formattedPhone.replace(/\D/g, '');

        try {
            setIsLoading(true);
            const token = localStorage.getItem("access_token");

            const response = await fetch(`${API_BASE_URL}/client/info?phoneNumber=${formattedPhone}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    showAlert("Клиент не найден в АБС", "error");
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return;
            }

            const data = await response.json();
            setClientData(data);
            showAlert("Данные клиента успешно загружены из АБС", "success");

        } catch (error) {
            console.error("Ошибка при поиске клиента в АБС:", error);
            showAlert("Произошла ошибка при поиске клиента в АБС", "error");
            setClientData(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Функция для копирования значения в буфер обмена
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showAlert('Скопировано в буфер обмена', 'success');
        }).catch(err => {
            console.error('Ошибка копирования: ', err);
            showAlert('Не удалось скопировать', 'error');
        });
    };

    // Подготовка данных для таблицы
    const tableData = clientData ? [
        { label: 'Телефон', key: 'phone', value: clientData.phone },
        { label: 'Флаг ARC', key: 'arc_flag', value: clientData.arc_flag },
        { label: 'Тип клиента', key: 'client_type_name', value: clientData.client_type_name },
        { label: 'Флаг банковского счета', key: 'ban_acc_open_flag', value: clientData.ban_acc_open_flag },
        { label: 'Код департамента', key: 'dep_code', value: clientData.dep_code },
        { label: 'Код клиента в АБС', key: 'client_code', value: clientData.client_code },
        { label: 'Фамилия', key: 'surname', value: clientData.surname },
        { label: 'Имя', key: 'name', value: clientData.name },
        { label: 'Отчество', key: 'patronymic', value: clientData.patronymic },
        { label: 'Фамилия (латиница)', key: 'ltn_surname', value: clientData.ltn_surname },
        { label: 'Имя (латиница)', key: 'ltn_name', value: clientData.ltn_name },
        { label: 'Отчество (латиница)', key: 'ltn_patronymic', value: clientData.ltn_patronymic },
        { label: 'ИНН', key: 'tax_code', value: clientData.tax_code },
        { label: 'Тип документа', key: 'identdoc_name', value: clientData.identdoc_name },
        { label: 'Серия документа', key: 'identdoc_series', value: clientData.identdoc_series },
        { label: 'Номер документа', key: 'identdoc_num', value: clientData.identdoc_num },
        { label: 'Дата выдачи', key: 'identdoc_date', value: clientData.identdoc_date },
        { label: 'Кем выдан', key: 'identdoc_orgname', value: clientData.identdoc_orgname },
        { label: 'SV ID', key: 'sv_id', value: clientData.sv_id }
    ] : [];

    return (
        <>
            <div className="block_info_prems" align="center">
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
                                Поиск клиента в АБС по номеру телефона
                            </h1>
                        </div>

                        {/* Поиск по номеру телефона */}
                        <div className="processing-integration__search-card">
                            <div className="search-card">
                                <div className="search-card__content">
                                    <div className="search-card__input-group">
                                        <label
                                            htmlFor="phoneNumber"
                                            className="search-card__label"
                                        >
                                            Номер телефона
                                        </label>
                                        <input
                                            type="text"
                                            id="phoneNumber"
                                            value={displayPhone}
                                            onChange={handlePhoneChange}
                                            placeholder="+992 XX XXX-XX-XX"
                                            className="search-card__input"
                                            maxLength={20}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="search-card__buttons">
                                        <button
                                            onClick={handleSearchClient}
                                            disabled={!phoneNumber || isLoading}
                                            className={`search-card__button ${isLoading ? 'search-card__button--loading' : ''}`}
                                        >
                                            {isLoading ? 'Поиск...' : 'Найти клиента'}
                                        </button>
                                        <button
                                            onClick={handleClear}
                                            disabled={isLoading}
                                            className="search-card__button search-card__button--secondary"
                                        >
                                            Очистить
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Таблица с данными клиента */}
                        {clientData && (
                            <div className="processing-integration__limits-table">
                                <div className="limits-table">
                                    <div className="limits-table__header">
                                        <h2 className="limits-table__title">
                                            Данные клиента из АБС
                                        </h2>
                                        <div className="limits-table__actions">
                                            <button
                                                onClick={() => copyToClipboard(JSON.stringify(clientData, null, 2))}
                                                className="limits-table__action-btn limits-table__action-btn--secondary"
                                            >
                                                Скопировать JSON
                                            </button>
                                        </div>
                                    </div>

                                    <div className="limits-table__wrapper">
                                        <table className="limits-table">
                                            <thead className="limits-table__head">
                                            <tr>
                                                <th className="limits-table__th limits-table__th--field">
                                                    Поле
                                                </th>
                                                <th className="limits-table__th limits-table__th--value">
                                                    Значение
                                                </th>
                                                <th className="limits-table__th limits-table__th--actions">
                                                    Действия
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody className="limits-table__body">
                                            {tableData.map((item) => (
                                                <tr key={item.key} className="limits-table__row">
                                                    <td className="limits-table__td limits-table__td--info">
                                                        <div className="limit-info">
                                                            <div className="limit-info__name">
                                                                {item.label}
                                                            </div>
                                                            <div className="limit-info__id">
                                                                {item.key}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="limits-table__td limits-table__td--value">
                                <span className="current-value">
                                  {item.value || 'Не указано'}
                                </span>
                                                    </td>
                                                    <td className="limits-table__td limits-table__td--actions">
                                                        <div className="action-buttons">
                                                            <button
                                                                onClick={() => copyToClipboard(item.value || '')}
                                                                className="action-buttons__btn action-buttons__btn--copy"
                                                                disabled={!item.value}
                                                                title="Скопировать значение"
                                                            >
                                                                Копировать
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Сводная информация */}
                                    <div className="limits-table__footer">
                                        <div className="limits-table__stats">
                        <span className="limits-table__stat">
                          Найден: {clientData.surname} {clientData.name} {clientData.patronymic}
                        </span>
                                            <span className="limits-table__stat">
                          Телефон: {clientData.phone}
                        </span>
                                            <span className="limits-table__stat">
                          ИНН: {clientData.tax_code}
                        </span>
                                            <span className="limits-table__stat">
                          Код клиента: {clientData.client_code}
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
                                    <p>Поиск клиента в АБС...</p>
                                </div>
                            </div>
                        )}

                        {/* Сообщение об отсутствии данных */}
                        {!isLoading && !clientData && phoneNumber && (
                            <div className="processing-integration__no-data">
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
