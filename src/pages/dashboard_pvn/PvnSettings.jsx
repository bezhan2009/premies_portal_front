// pages/PVN/PVNSettings.jsx
import React, { useEffect, useState, useCallback } from "react";
import "../../styles/components/Table.scss";
import "../../styles/components/ProcessingIntegration.scss";
import "../../styles/components/SearchBar.scss";
import { useExcelExport } from "../../hooks/useExcelExport.js";
import { useTableSort } from "../../hooks/useTableSort.js";
import SortIcon from "../../components/general/SortIcon.jsx";
import { apiClient } from "../../api/utils/apiClient.js";
import AddPvnSettingModal from "./AddPvnModal.jsx";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import Spinner from "../../components/Spinner.jsx";

// Пустая форма для новой настройки
const emptyForm = {
    atm_id: "",
    currency: 972,
    cashbox_inn: "",
    cashbox_name: "",
    cashbox_account: "",
    atm_inn: "",
    atm_name: "",
    atm_account: "",
};

// Поля таблицы
const fields = [
    { key: "ID", label: "ID", type: "number" },
    { key: "CreatedAt", label: "Дата создания", type: "datetime" },
    { key: "UpdatedAt", label: "Дата обновления", type: "datetime" },
    { key: "atm_id", label: "ID ПВН", type: "text" },
    { key: "currency", label: "Валюта", type: "number" },
    { key: "cashbox_inn", label: "ИНН кассы", type: "text" },
    { key: "cashbox_name", label: "Наименование кассы", type: "text" },
    { key: "cashbox_account", label: "Счёт кассы", type: "text" },
    { key: "atm_inn", label: "ИНН ПВН", type: "text" },
    { key: "atm_name", label: "Наименование ПВН", type: "text" },
    { key: "atm_account", label: "Счёт ПВН", type: "text" },
];

const PVNSettings = () => {

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ ...emptyForm });
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);

    const [alert, setAlert] = useState({
        show: false,
        message: "",
        type: "success",
    });

    const backendABS = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
    const { exportToExcel } = useExcelExport();
    const { items: sortedItems, requestSort, sortConfig } = useTableSort(items);

    const showAlert = (message, type = "success") => {
        setAlert({ show: true, message, type });
    };

    const hideAlert = () => {
        setAlert({ show: false, message: "", type: "success" });
    };

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiClient(`${backendABS}/pvn`);
            const data = response.data;
            if (Array.isArray(data)) {
                setItems(data);
            } else if (data && Array.isArray(data.data)) {
                setItems(data.data);
            } else {
                setItems([]);
            }
        } catch (e) {
            console.error("Ошибка загрузки:", e);
            showAlert("Ошибка загрузки данных", "error");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [backendABS]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Добавление новой настройки
    const handleAdd = async (formData) => {
        // Валидация: все поля, кроме служебных, должны быть заполнены
        const requiredFields = fields.filter(
            (f) => !["ID", "CreatedAt", "UpdatedAt"].includes(f.key)
        );
        const isEmptyField = requiredFields.some((field) => {
            const value = formData[field.key];
            return (
                value === undefined || value === null || value.toString().trim() === ""
            );
        });

        if (isEmptyField) {
            showAlert("Пожалуйста, заполните все поля", "error");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...formData,
                currency: parseInt(formData.currency, 10),
            };
            const response = await apiClient.post(`${backendABS}/pvn`, payload);
            if (response.status === 200 || response.status === 201) {
                showAlert("Настройка успешно создана", "success");
                await fetchItems();
                setNewItem({ ...emptyForm });
                setShowAddForm(false);
            } else {
                throw new Error("Неожиданный ответ сервера");
            }
        } catch (e) {
            console.error("Ошибка при создании настройки:", e);
            showAlert("Ошибка при создании настройки", "error");
        } finally {
            setLoading(false);
        }
    };

    // Обновление существующей настройки
    const handleUpdate = async (formData) => {
        if (!formData || !formData.ID) return;

        const requiredFields = fields.filter(
            (f) => !["ID", "CreatedAt", "UpdatedAt"].includes(f.key)
        );
        const isEmptyField = requiredFields.some((field) => {
            const value = formData[field.key];
            return (
                value === undefined || value === null || value.toString().trim() === ""
            );
        });

        if (isEmptyField) {
            showAlert("Пожалуйста, заполните все поля", "error");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...formData,
                currency: parseInt(formData.currency, 10),
            };
            const response = await apiClient.patch(
                `${backendABS}/pvn/${formData.ID}`,
                payload
			);
			if (response.status === 200) {
				showAlert("Настройка обновлена", "success");
				await fetchItems();
				setShowEditForm(false);
				setEditingItem(null);
			} else {
				throw new Error("Ошибка обновления");
			}
		} catch (e) {
			console.error("Ошибка обновления:", e);
			showAlert("Ошибка при обновлении настройки", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleRowDoubleClick = (item) => {
		setEditingItem({ ...item });
		setShowEditForm(true);
	};

	const handleEditClose = () => {
		setShowEditForm(false);
		setEditingItem(null);
	};

	const handleExport = () => {
		try {
			const columns = fields.map(({ key, label }) => ({ key, label }));
			exportToExcel(sortedItems, columns, "Настройки ПВН");
			showAlert("Экспорт выполнен успешно", "success");
		} catch (e) {
			console.error("Ошибка экспорта:", e);
			showAlert("Ошибка при экспорте в Excel", "error");
		}
	};

	const formatValue = (value, fieldType, fieldKey) => {
		if (value === null || value === undefined || value === "") return "-";
		if (fieldKey === "ID") {
			return Number.isInteger(value) ? value.toString() : Math.floor(value).toString();
		}
		if (fieldType === "datetime") {
			try {
				const d = new Date(value);
				if (isNaN(d.getTime())) return value;
				return d.toLocaleString("ru-RU");
			} catch {
				return value;
			}
		}
		if (fieldKey === "currency" && typeof value === "number") {
			const currencyMap = {
				810: "RUB",
				840: "USD",
				978: "EUR",
				398: "KZT",
				972: "TJS",
			};
			return currencyMap[value] || value;
		}
		if (fieldType === "number" && typeof value === "number") {
			return value.toString();
		}
		return String(value);
	};

	return (
		<div className="block_info_prems content-page">
			{alert.show && (
				<AlertMessage
					message={alert.message}
					type={alert.type}
					onClose={hideAlert}
					duration={3000}
				/>
			)}

			<div className="table-header-actions" style={{ margin: "16px" }}>
				<h2>Настройки ПВН</h2>
				<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
					<button className="action-buttons__btn" onClick={() => setShowAddForm(true)}>
						+ Добавить настройку
					</button>
					<button className="export-excel-btn" onClick={handleExport}>
						Экспорт в Excel
					</button>
				</div>
			</div>

			<AddPvnSettingModal
				isOpen={showAddForm}
				onClose={() => {
					setShowAddForm(false);
					setNewItem({ ...emptyForm });
				}}
				data={newItem}
				onSave={handleAdd}
				isEdit={false}
			/>

			<AddPvnSettingModal
				isOpen={showEditForm}
				onClose={handleEditClose}
				data={editingItem}
				onUpdate={handleUpdate}
				isEdit={true}
			/>

			{loading ? (
				<div style={{ padding: "16px" }}>
					<Spinner center label="Загружаем настройки ПВН" />
				</div>
			) : (
				<div style={{ overflowX: "auto", width: "100%" }}>
					<table className="table-reports" style={{ minWidth: "max-content" }}>
						<thead>
							<tr>
								{fields.map(({ key, label }) => (
									<th
										key={key}
										onClick={() => requestSort(key)}
										className="sortable-header"
									>
										{label}
										<SortIcon sortConfig={sortConfig} sortKey={key} />
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{Array.isArray(sortedItems) && sortedItems.length > 0 ? (
								sortedItems.map((item) => (
									<tr
										key={item.ID}
										onDoubleClick={() => handleRowDoubleClick(item)}
										style={{ cursor: "pointer" }}
									>
										{fields.map((field) => (
											<td key={field.key}>
												{formatValue(item[field.key], field.type, field.key)}
											</td>
										))}
									</tr>
								))
							) : (
								<tr>
									<td colSpan={fields.length} style={{ textAlign: "center" }}>
										Нет данных
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default PVNSettings;
