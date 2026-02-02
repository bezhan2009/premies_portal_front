import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import TransactionsChart from "../../components/graph/graph";
import CheckoutTable from "../../components/checkout-table/checkout-table";
import { fetchTransactionsByATM } from "../../api/atm/transactions.js";
import useSidebar from "../../hooks/useSideBar.js";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import { FaArrowLeft } from 'react-icons/fa';

export default function Checkout() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { isSidebarOpen, toggleSidebar } = useSidebar();

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [alert, setAlert] = useState(null);

    const fromDate = params.get("from");
    const toDate = params.get("to");

    // Функция для возврата на предыдущую страницу
    const handleGoBack = () => {
        navigate(-1);
    };

    const showAlert = (message, type = "success") => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 3500);
    };

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
                showAlert(`Загружено ${data.length} записей`, "success");
            } catch (err) {
                setError(err.message || 'Ошибка при загрузке данных транзакций');
                console.error('Ошибка при загрузке транзакций:', err);
                showAlert(`Ошибка: ${err.message}`, "error");
            } finally {
                setLoading(false);
            }
        };

        loadTransactions();
    }, [id, fromDate, toDate]);

    if (error) {
        return (
            <div className={`dashboard-container ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
                <div className="block_info_prems content-page" align="center">
                    {/* Кнопка Назад */}
                    <button
                        className="back-button"
                        onClick={handleGoBack}
                        aria-label="Назад"
                        title="Назад"
                    >
                        <FaArrowLeft />
                    </button>

                    <div className="error-container">
                        <div className="error-message">Ошибка: {error}</div>
                        <button
                            onClick={() => window.location.reload()}
                            className="retry-button"
                        >
                            Повторить попытку
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`dashboard-container ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
                <div className="block_info_prems content-page" align="center" style={{ position: 'relative' }}>
                    {/* Кнопка Назад */}
                    <button
                        className="back-button"
                        onClick={handleGoBack}
                        aria-label="Назад"
                        title="Назад"
                    >
                        <FaArrowLeft />
                    </button>

                    <div className="flex flex-col gap-10 p-4">
                        <div className="mt-5">
                            <TransactionsChart transactions={transactions} />
                        </div>
                        <div>
                            <CheckoutTable transactions={transactions} />
                        </div>
                    </div>
                </div>
            </div>

            {alert && (
                <AlertMessage
                    message={alert.message}
                    type={alert.type}
                    onClose={() => setAlert(null)}
                />
            )}
        </>
    );
}
