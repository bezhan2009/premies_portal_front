import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import TransactionsChart from "../../components/graph/graph";
import CheckoutTable from "../../components/checkout-table/checkout-table";
import { fetchTransactionsByATM } from "../../api/atm/transactions.js";

export default function Checkout() {
    const { id } = useParams();
    const [params] = useSearchParams();

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
        <div className="flex flex-col gap-10 p-4">
            <div className="mt-5">
                <TransactionsChart transactions={transactions} />
            </div>
            <div>
                <CheckoutTable transactions={transactions} />
            </div>
        </div>
    );
}
