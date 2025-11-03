import React, {useState, useEffect} from 'react';
import '../../../../styles/components/ProcessingIntegration.scss';
import '../../../../styles/components/BlockInfo.scss';
import AlertMessage from "../../../general/AlertMessage.jsx";
import {fetchTransactionsByCardId} from "../../../../api/operator/processing_transactions.js";
import {getCurrencyCode} from "../../../../api/utils/getCurrencyCode.js";

export default function DashboardOperatorProcessingTransactions() {
    const [displayCardId, setDisplayCardId] = useState('');
    const [cardId, setCardId] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [alert, setAlert] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    // Устанавливаем даты по умолчанию (последние 30 дней)
    useEffect(() => {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const formatDate = (date) => date.toISOString().split('T')[0];
        
        setFromDate(formatDate(thirtyDaysAgo));
        setToDate(formatDate(today));
    }, []);

    const showAlert = (message, type = 'success') => {
        setAlert({
            show: true,
            message,
            type
        });
    };

    const hideAlert = () => {
        setAlert({
            show: false,
            message: '',
            type: 'success'
        });
    };

    const handleCardIdChange = (e) => {
        const value = e.target.value;
        setDisplayCardId(value);
        setCardId(value.replace(/\s/g, ''));
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        if (name === 'fromDate') {
            setFromDate(value);
        } else {
            setToDate(value);
        }
    };

    const handleCardNumberSearch = async () => {
        if (cardId.trim()) {
            // Проверяем корректность дат
            if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
                showAlert('Дата "С" не может быть больше даты "По"', 'error');
                return;
            }

            setIsLoading(true);
            try {
                const transactionsData = await fetchTransactionsByCardId(
                    cardId, 
                    fromDate || undefined, 
                    toDate || undefined
                );

                if (transactionsData && Array.isArray(transactionsData)) {
                    const formattedTransactions = transactionsData.map(transaction => ({
                        id: transaction.id,
                        cardNumber: transaction.cardNumber,
                        responseCode: transaction.responseCode,
                        responseDescription: transaction.responseDescription,
                        reqamt: transaction.reqamt,
                        amount: transaction.amount,
                        conamt: transaction.conamt,
                        acctbal: transaction.acctbal,
                        netbal: transaction.netbal,
                        utrnno: transaction.utrnno,
                        currency: transaction.currency,
                        terminalId: transaction.terminalId,
                        reversal: transaction.reversal,
                        transactionType: transaction.transactionType,
                        transactionTypeName: transaction.transactionTypeName,
                        transactionTypeNumber: transaction.transactionTypeNumber,
                        atmId: transaction.atmId,
                        terminalAddress: transaction.terminalAddress,
                        localTransactionDate: transaction.localTransactionDate,
                        localTransactionTime: transaction.localTransactionTime,
                    }));

                    setTransactions(formattedTransactions);
                    showAlert(`Загружено ${formattedTransactions.length} транзакций`, 'success');
                } else {
                    setTransactions([]);
                    showAlert('Транзакции не найдены', 'warning');
                }
            } catch (error) {
                showAlert('Ошибка при загрузке данных: ' + error.message, 'error');
                setTransactions([]);
            } finally {
                setIsLoading(false);
            }
        } else {
            showAlert('Введите номер карты', 'warning');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleCardNumberSearch();
        }
    };

    const formatCardNumber = (value) => {
        return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    };

    const getStatusBadge = (responseCode, reversal) => {
        if (reversal) {
            return <span className="status-badge status-badge--reversed">Отменена</span>;
        }

        switch (responseCode) {
            case '-1':
                return <span className="status-badge status-badge--success">Успешно</span>;
            case '01':
                return <span className="status-badge status-badge--warning">Ошибка</span>;
            case '02':
                return <span className="status-badge status-badge--error">Отклонено</span>;
            default:
                return <span className="status-badge status-badge--unknown">Неизвестно</span>;
        }
    };

    const clearFilters = () => {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
        setToDate(today);
    };

    return <>
        {alert.show && (
            <AlertMessage
                message={alert.message}
                type={alert.type}
                onClose={hideAlert}
                duration={3000}
            />
        )}
        <div className="block_info_prems" align="center">
            <div className="processing-integration">
                <div className="processing-integration__container">
                    <div className="processing-integration__header">
                        <h1 className="processing-integration__title">
                            Мониторинг транзакций
                        </h1>
                        <p className="processing-integration__subtitle">
                            Поиск транзакций без ограничений
                        </p>
                    </div>

                    {/* Блок поиска с датами */}
                    <div className="processing-integration__search-card">
                        <div className="search-card">
                            <div className="search-card__content">
                                {/* Номер карты */}
                                <div className="search-card__input-group">
                                    <label htmlFor="cardNumber" className="search-card__label">
                                        Идентификатор карты
                                    </label>
                                    <input
                                        type="text"
                                        id="cardNumber"
                                        value={displayCardId}
                                        onChange={handleCardIdChange}
                                        onKeyPress={handleKeyPress}
                                        className="search-card__input"
                                        disabled={isLoading}
                                        placeholder="Введите идентификатор карты"
                                        maxLength={19}
                                    />
                                </div>

                                {/* Блок дат */}
                                <div className="search-card__date-group">
                                    <div className="date-input-group">
                                        <label htmlFor="fromDate" className="search-card__label">
                                            С даты
                                        </label>
                                        <input
                                            type="date"
                                            id="fromDate"
                                            name="fromDate"
                                            value={fromDate}
                                            onChange={handleDateChange}
                                            className="search-card__date-input"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="date-separator">—</div>
                                    <div className="date-input-group">
                                        <label htmlFor="toDate" className="search-card__label">
                                            По дату
                                        </label>
                                        <input
                                            type="date"
                                            id="toDate"
                                            name="toDate"
                                            value={toDate}
                                            onChange={handleDateChange}
                                            className="search-card__date-input"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                {/* Кнопки */}
                                <div className="search-card__buttons">
                                    <button
                                        onClick={handleCardNumberSearch}
                                        disabled={!cardId.trim() || isLoading}
                                        className={`search-card__button ${isLoading ? 'search-card__button--loading' : ''}`}
                                    >
                                        {isLoading ? 'Поиск...' : 'Найти'}
                                    </button>
                                    <button
                                        onClick={clearFilters}
                                        disabled={isLoading}
                                        className="search-card__button search-card__button--secondary"
                                    >
                                        Очистить даты
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Остальная часть компонента остается без изменений */}
                {transactions.length > 0 && (
                    <div className="processing-integration__limits-table">
                        <div className="limits-table">
                            <div className="limits-table__header">
                                <h2 className="limits-table__title">
                                    Транзакции по карте с id {displayCardId}
                                    {fromDate && toDate && (
                                        <span className="date-range">
                                            ({fromDate} — {toDate})
                                        </span>
                                    )}
                                </h2>
                            </div>

                            <div className="limits-table__wrapper">
                                <table className="limits-table">
                                    {/* thead остается без изменений */}
                                    <thead className="limits-table__head">
                                    <tr>
                                        <th className="limits-table__th">ID транзакции</th>
                                        <th className="limits-table__th">Номер карты</th>
                                        <th className="limits-table__th">reqamt</th>
                                        <th className="limits-table__th">amount</th>
                                        <th className="limits-table__th">conamt</th>
                                        <th className="limits-table__th">acctbal</th>
                                        <th className="limits-table__th">netbal</th>
                                        <th className="limits-table__th">utrnno</th>
                                        <th className="limits-table__th">Валюта</th>
                                        <th className="limits-table__th">ID терминала</th>
                                        <th className="limits-table__th">Тип операции</th>
                                        <th className="limits-table__th">ID АТМ</th>
                                        <th className="limits-table__th">Адрес терминала</th>
                                        <th className="limits-table__th">Дата</th>
                                        <th className="limits-table__th">Время</th>
                                        <th className="limits-table__th">Статус</th>
                                    </tr>
                                    </thead>
                                    <tbody className="limits-table__body">
                                    {transactions.map((transaction) => (
                                        <tr key={transaction.id} className="limits-table__row">
                                            <td className="limits-table__td limits-table__td--info">
                                                {transaction.id}
                                            </td>
                                            <td className="limits-table__td limits-table__td--info">
                                                {transaction.cardNumber ? formatCardNumber(transaction.cardNumber) : 'N/A'}
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.reqamt || '0'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.amount || '0'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.conamt || '0'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.acctbal || '0'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.netbal || '0'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.utrnno || 'N/A'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{getCurrencyCode(transaction.currency)}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.terminalId || 'N/A'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.transactionTypeName || 'N/A'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.atmId || 'N/A'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.terminalAddress || 'N/A'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.localTransactionDate || 'N/A'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                <span className="default-value">{transaction.localTransactionTime || 'N/A'}</span>
                                            </td>
                                            <td className="limits-table__td limits-table__td--value">
                                                {getStatusBadge(transaction.responseCode, transaction.reversal)}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="limits-table__footer">
                                <div className="limits-table__stats">
                                    <span className="limits-table__stat">
                                        Всего записей: {transactions.length}
                                    </span>
                                    <span className="limits-table__stat">
                                        Показано: {transactions.length}
                                    </span>
                                    <span className="limits-table__stat">
                                        Карта: {transactions[0]?.cardNumber || 'N/A'}
                                    </span>
                                    {fromDate && toDate && (
                                        <span className="limits-table__stat">
                                            Период: {fromDate} — {toDate}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="processing-integration__loading">
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>Загрузка транзакций...</p>
                        </div>
                    </div>
                )}

                {!isLoading && transactions.length === 0 && cardId.length > 0 && (
                    <div className="processing-integration__no-data">
                        <div className="no-data">
                            <h3>Данные не найдены</h3>
                            <p>Для карты с id {displayCardId} не найдено транзакций за выбранный период.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </>
}
