import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import TransactionsChartBarsEach from "../../components/graph/graph";
import CheckoutTable from "../../components/checkout-table/checkout-table";
import { fetchTransactionsByATM } from "../../api/atm/transactions.js";
import useSidebar from "../../hooks/useSideBar.js";
import "../../styles/checkbox.scss";
import "../../styles/components/TransactionsQR.scss";
import {Sidebar} from "lucide-react";

export default function Checkout() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const { isSidebarOpen, toggleSidebar } = useSidebar();

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const fromDate = params.get("from");
    const toDate = params.get("to");

    useEffect(() => {
        const loadTransactions = async () => {
            if (!id || !fromDate || !toDate) {
                setError("Отсутствуют необходимые параметры: ID банкомата, дата начала или дата окончания");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const data = await fetchTransactionsByATM(id, fromDate, toDate);
                setTransactions(data);
                setError(null);
            } catch (err) {
                setError(err.message || 'Ошибка при загрузке данных транзакций');
                console.error('Ошибка при загрузке транзакций:', err);
            } finally {
                setLoading(false);
            }
        };

        loadTransactions();
    }, [id, fromDate, toDate]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-text">Загрузка данных транзакций...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="error-message">Ошибка: {error}</div>
                <button
                    onClick={() => window.location.reload()}
                    className="retry-button"
                >
                    Повторить попытку
                </button>
            </div>
        );
    }

    return (
        <div className={`dashboard-container ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
            <Sidebar
                activeLink="transactions_atm"
                isOpen={isSidebarOpen}
                toggle={toggleSidebar}
            />
            <div className="dashboard-container">
                <div className="block_info_prems content-page" align="center">
                    <main>
                        <div className="my-applications-header header-with-balance">
                            <button
                                className={!showFilters ? "filter-toggle" : "Unloading"}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                Фильтры
                            </button>
                        </div>

                        {showFilters && (
                            <div className="filters animate-slideIn">
                                {/* Можно добавить фильтры для банкомата при необходимости */}
                                <input placeholder="ID транзакции" />
                                <input placeholder="RRN" />
                                <input placeholder="STAN" />
                                <input placeholder="Сумма" />
                                <select>
                                    <option value="">Статус</option>
                                    <option value="success">Успешно</option>
                                    <option value="cancel">Отменено</option>
                                    <option value="priority">Высокий приоритет</option>
                                </select>
                            </div>
                        )}

                        <div className="my-applications-sub-header">
                            <div>
                                от <span className="date-display">{fromDate}</span>
                            </div>
                            <div>
                                до <span className="date-display">{toDate}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            <TransactionsChartATM transactions={transactions} />
                        </div>

                        <div style={{ marginTop: '30px' }}>
                            <CheckoutTable transactions={transactions} />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
