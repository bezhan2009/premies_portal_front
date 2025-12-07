import Input from "../../components/elements/Input.jsx";
import "../../styles/components/BlockInfo.scss";
import "../../styles/components/TransactionTypes.scss";
import { useState } from "react";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { apiClientTransactions } from "../../api/utils/apiClientTransactions.js";
import Sidebar from "./DynamicMenu.jsx";
import useSidebar from "../../hooks/useSideBar.js";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const transactionTypes = [
    { value: "0", label: "Тип транзакции" },
    { value: "1", label: "Снятие" },
    { value: "2", label: "Пополнение" },
    { value: "3", label: "Параметры" },
    { value: "4", label: "Мусор" },
];

const ValidData = {
    type: { required: true },
    name: { required: true },
    number: { required: true },
};

export default function UpdatingTransactionType() {
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const [loading, setLoading] = useState(false);
    const { data, errors, setData, validate } = useFormStore();

    const upDateUserWorkers = async () => {
        const isValid = validate(ValidData);
        if (!isValid) {
            toast.error("Пожалуйста, заполните все обязательные поля корректно!");
            return;
        }

        setLoading(true);
        try {
            const response = await apiClientTransactions.put(
                "/api/Transactions/transaction-type/update",
                {
                    ...data,
                    number: +data?.number,
                    type: +data?.type
                }
            );

            // Успешный ответ
            toast.success("Тип транзакции успешно обновлён!");
            console.log("Успешно обновлено:", response.data);

            // Опционально: очистить форму после успеха
            // setData("name", "");
            // setData("type", "");
            // setData("number", "");

        } catch (e) {
            // Обработка ошибки
            const errorMessage = e?.response?.data?.message || e?.message || "Произошла ошибка при обновлении";
            toast.error(`Ошибка: ${errorMessage}`);
            console.error("Ошибка при обновлении:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
            <Sidebar activeLink="update_transaction" isOpen={isSidebarOpen} toggle={toggleSidebar} />
            <div className="block_info_prems" align="center">
                <div className="updating-transaction-type">
                    <main>
                        <h2>Обновление типа транзакции</h2>

                        <Select
                            id={"number"}
                            placeholder="Тип транзакции"
                            value={data.number || ""}
                            options={transactionTypes}
                            onChange={(e) => setData("number", e)}
                            error={errors}
                        />

                        <Input
                            id="name"
                            placeholder="Название"
                            type="text"
                            value={data.name || ""}
                            onChange={(value) => setData("name", value)}  // ← теперь ожидаем именно значение
                            onEnter={upDateUserWorkers}
                            error={errors}
                        />

                        <Input
                            id="type"
                            placeholder="Номер"
                            type="text"
                            value={data.type || ""}
                            onChange={(value) => setData("type", value)}
                            onEnter={upDateUserWorkers}
                            error={errors}
                        />

                        <button
                            onClick={upDateUserWorkers}
                            disabled={loading}
                            className={loading ? "button-loading" : ""}
                        >
                            {loading ? "Сохранение..." : "Сохранить"}
                        </button>
                    </main>
                </div>
            </div>

            {/* Если не добавил ToastContainer в App.jsx — можно здесь */}
            {/* <ToastContainer /> */}
        </div>
    );
}
