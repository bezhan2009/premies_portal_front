import React, { useState, useEffect } from "react";
import { cardBalanceApi } from "../../../api/cardBalance/cardBalance";
import { formatDate } from "../../../api/utils/date";

export default function CardBalance() {
    const [settings, setSettings] = useState([]);
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSetting, setEditingSetting] = useState(null);
    const [formData, setFormData] = useState({ cardId: "", phoneNumber: "", isActive: true });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [settingsData, balancesData] = await Promise.all([
                cardBalanceApi.getAllSettings(),
                cardBalanceApi.getAllBalances()
            ]);
            setSettings(settingsData || []);
            setBalances(balancesData || []);
        } catch (error) {
            console.error("Error fetching card balance data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (setting = null) => {
        if (setting) {
            setEditingSetting(setting);
            setFormData({
                cardId: setting.cardId,
                phoneNumber: setting.phoneNumber,
                isActive: setting.isActive
            });
        } else {
            setEditingSetting(null);
            setFormData({ cardId: "", phoneNumber: "", isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSetting(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSetting) {
                await cardBalanceApi.updateSetting(editingSetting.id, formData);
            } else {
                await cardBalanceApi.createSetting(formData);
            }
            handleCloseModal();
            fetchData();
        } catch (error) {
            console.error("Error saving setting:", error);
            alert("Ошибка при сохранении: " + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Удалить настройку?")) {
            try {
                await cardBalanceApi.deleteSetting(id);
                fetchData();
            } catch (error) {
                console.error("Error deleting setting:", error);
            }
        }
    };

    const handleToggleBlock = async (id, isBlocked) => {
        try {
            if (isBlocked) {
                await cardBalanceApi.unblockCard(id);
            } else {
                await cardBalanceApi.blockCard(id);
            }
            fetchData();
        } catch (error) {
            console.error("Error toggling block status:", error);
            alert("Ошибка изменения статуса: " + (error.response?.data?.error || error.message));
        }
    };

    // Функция форматирования баланса из дирамов в сомони
    const formatBalance = (value) => {
        if (value === undefined || value === null) return '-';
        const somoni = value / 100;
        return somoni.toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' TJS';
    };

    if (loading) {
        return <div className="card-balance-loading">Загрузка данных...</div>;
    }

    return (
        <div className="card-balance-page">
            <div className="page-header">
                <h1>Остатки по картам</h1>
            </div>

            <div className="card-balance-sections">
                {/* Settings Section */}
                <section className="settings-section">
                    <div className="section-header">
                        <h2>Настройки лимитов по картам</h2>
                        <button className="primary-btn" onClick={() => handleOpenModal()}>Добавить настройку</button>
                    </div>

                    <div className="table-responsive">
                        <table className="modern-table">
                            <thead>
                            <tr>
                                <th>ID Карты</th>
                                <th>Номер телефона</th>
                                <th>Баланс на пред. проверку</th>
                                <th>Время пред. проверки</th>
                                <th>Статус (вкл/выкл)</th>
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {settings.length === 0 ? (
                                <tr><td colSpan="6" className="text-center">Нет настроек</td></tr>
                            ) : (
                                settings.map((setting) => (
                                    <tr key={`setting-${setting.id}`}>
                                        <td>{setting.cardId}</td>
                                        <td>{setting.phoneNumber}</td>
                                        {/* Исправлено: преобразуем lastBalance из дирамов в сомони */}
                                        <td>{setting.lastBalance !== undefined && setting.lastBalance !== null
                                            ? formatBalance(setting.lastBalance)
                                            : '-'
                                        }</td>
                                        <td>{setting.lastCheckedAt && setting.lastCheckedAt !== "0001-01-01T00:00:00Z"
                                            ? formatDate(setting.lastCheckedAt)
                                            : "еще не проверялась"
                                        }</td>
                                        <td>
                        <span className={`status-badge ${setting.isActive ? 'active' : 'inactive'}`}>
                          {setting.isActive ? 'Активен' : 'Отключен'}
                        </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button className="text-btn edit-btn" onClick={() => handleOpenModal(setting)}>Р</button>
                                            <button className="text-btn delete-btn" onClick={() => handleDelete(setting.id)}>Х</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Balances Section */}
                <section className="balances-section">
                    <div className="section-header">
                        <h2>Статусы баланса карт</h2>
                    </div>

                    <div className="table-responsive">
                        <table className="modern-table">
                            <thead>
                            <tr>
                                <th>ID Карты</th>
                                <th>Статус лимита</th>
                                <th>Статус блокировки</th>
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {balances.length === 0 ? (
                                <tr><td colSpan="4" className="text-center">Нет статусов</td></tr>
                            ) : (
                                balances.map((balance) => {
                                    const isExceed = balance.isCardExceed;
                                    const isBlocked = balance.isCardBlocked;
                                    let rowClass = "";
                                    if (isBlocked) rowClass = "row-blocked";
                                    else if (isExceed) rowClass = "row-exceed";

                                    return (
                                        <tr key={`balance-${balance.id}`} className={rowClass}>
                                            <td>{balance.cardId}</td>
                                            <td>
                                                {isExceed ? (
                                                    <span className="limit-alert exceeded">Превышен</span>
                                                ) : (
                                                    <span className="limit-alert normal">В норме</span>
                                                )}
                                            </td>
                                            <td>
                                                {isBlocked ? (
                                                    <span className="block-status blocked">Заблокирована</span>
                                                ) : (
                                                    <span className="block-status active">Активна</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className={`action-btn ${isBlocked ? 'unblock-btn' : 'block-btn'}`}
                                                    onClick={() => handleToggleBlock(balance.id, isBlocked)}
                                                >
                                                    {isBlocked ? 'Разблокировать' : 'Заблокировать'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingSetting ? "Редактировать настройку" : "Добавить настройку"}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>ID Карты (договора):</label>
                                <input
                                    type="text"
                                    value={formData.cardId}
                                    onChange={(e) => setFormData({...formData, cardId: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Номер телефона SMS (992...):</label>
                                <input
                                    type="text"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                    />
                                    Активно (мониторинг включен)
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="secondary-btn" onClick={handleCloseModal}>Отмена</button>
                                <button type="submit" className="primary-btn">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
