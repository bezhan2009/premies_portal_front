import Input from "../../components/elements/Input.jsx";
import "../../styles/components/BlockInfo.scss";
import "../../styles/components/TransactionTypes.scss";
import { useEffect, useMemo, useState } from "react";
import { useFormStore } from "../../hooks/useFormState.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  deleteTerminalNames,
  getTerminalNames,
  postTerminalNames,
  putTerminalNames,
} from "../../api/transactions/api.js";
import {
  getCurrencyCode,
} from "../../api/utils/getCurrencyCode.js";
import { tableDataDef } from "../../const/defConst";
import { Table } from "../../components/table/FlexibleAntTable.jsx";

const ValidData = {
  transactionType: { required: true },
  description: { required: true },
  atmId: { required: true },
};

export default function TerminalNames() {
  const { data, errors, setData, validate } = useFormStore();
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState(tableDataDef);
  const [edit, setEdit] = useState(null);
  const [filters, setFilters] = useState({
    transactionType: "",
    description: "",
    atmId: "",
    id: "",
    currency: "",
  });

  const upDateItem = async () => {
    const isValid = validate(ValidData);
    if (!isValid) {
      toast.error("Пожалуйста, заполните все обязательные поля корректно!");
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        ...data,
        currency: data.currency || null,
      };

      const response = await putTerminalNames(requestData);
      if (response.status === 200 || response.status === 201) {
        toast.success("Успешно обновлён!");
        setEdit(null);
        getItems();
      }
    } catch (e) {
      const errorMessage = e?.response?.data?.message || e?.message || "Произошла ошибка при обновлении";
      toast.error(`Ошибка: ${errorMessage}`);
      console.error("Ошибка при обновлении:", e);
    } finally {
      setLoading(false);
    }
  };

  const createItem = async () => {
    setLoading(true);
    try {
      const requestData = {
        ...filters,
        currency: filters.currency || null,
      };

      const response = await postTerminalNames(requestData);
      if (response.status === 200 || response.status === 201) {
        toast.success("Успешно создан!");
        setEdit(null);
        setFilters({
          transactionType: "",
          description: "",
          atmId: "",
          id: "",
          currency: "",
        });
        getItems();
      }
    } catch (e) {
      const errorMessage = e?.response?.data?.message || e?.message || "Произошла ошибка при создании";
      toast.error(`Ошибка: ${errorMessage}`);
      console.error("Ошибка при создании:", e);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    setLoading(true);
    try {
      const response = await deleteTerminalNames(id);
      if (response.status === 200 || response.status === 201) {
        toast.success("Успешно удалён!");
        setEdit(null);
        getItems();
      }
    } catch (e) {
      const errorMessage = e?.response?.data?.message || e?.message || "Произошла ошибка при удалении";
      toast.error(`Ошибка: ${errorMessage}`);
      console.error("Ошибка при удалении:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getItems = async () => {
    try {
      const response = await getTerminalNames();
      setTableData(
        response.data.map((item) => ({
          transactionType: String(item.transactionType),
          description: item.description,
          atmId: String(item.atmId),
          id: String(item.id),
          currency: item.currency ? String(item.currency) : null,
        })),
      );
    } catch (e) {
      console.error("Ошибка при загрузке данных:", e);
    }
  };

  const applyFilters = (data, currentFilters) => {
    if (!Array.isArray(data)) return [];

    return data.filter((row) => {
      const currencyFilter = currentFilters.currency;
      let currencyMatch = true;

      if (currencyFilter) {
        if (row.currency) {
          currencyMatch = row.currency.includes(currencyFilter) || getCurrencyCode(row.currency).includes(currencyFilter);
        } else {
          currencyMatch = false;
        }
      }

      return (
        row?.transactionType?.includes(currentFilters?.transactionType || "") &&
        row?.description?.includes(currentFilters?.description || "") &&
        row?.atmId?.includes(currentFilters?.atmId || "") &&
        row?.id?.includes(currentFilters?.id || "") &&
        currencyMatch
      );
    });
  };

  const filteredData = useMemo(() => applyFilters(tableData, filters), [tableData, filters]);

  useEffect(() => {
    getItems();
  }, []);

  const formatCurrencyDisplay = (currencyCode) => {
    if (!currencyCode) return "Не указана";
    const alphabeticCode = getCurrencyCode(currencyCode);
    return `${alphabeticCode} (${currencyCode})`;
  };

  const startEdit = (row) => {
    setEdit({ type: "update", id: row.id });
    setData("transactionType", row.transactionType);
    setData("description", row.description);
    setData("atmId", row.atmId);
    setData("id", row.id);
    setData("currency", row.currency || "");
  };

  return (
    <>
      <div className="my-applications content-page">
        <main>
          <div className="filters animate-slideIn">
            <input
              style={{ backgroundColor: edit?.type === "create" ? "#ffbebf" : "" }}
              placeholder="Тип транзакции"
              value={filters.transactionType}
              onChange={(e) => handleFilterChange("transactionType", e.target.value)}
            />
            <input
              style={{ backgroundColor: edit?.type === "create" ? "#ffbebf" : "" }}
              placeholder="Описание"
              value={filters.description}
              onChange={(e) => handleFilterChange("description", e.target.value)}
            />
            <input
              style={{ backgroundColor: edit?.type === "create" ? "#ffbebf" : "" }}
              placeholder="ATM ID"
              value={filters.atmId}
              onChange={(e) => handleFilterChange("atmId", e.target.value)}
            />
            <input
              style={{ backgroundColor: edit?.type === "create" ? "#ffbebf" : "" }}
              placeholder="Валюта (код или номер)"
              value={filters.currency}
              onChange={(e) => handleFilterChange("currency", e.target.value)}
            />
            {edit?.type !== "create" && (
              <input
                placeholder="id"
                value={filters.id}
                onChange={(e) => handleFilterChange("id", e.target.value)}
              />
            )}
            <button
              className="button-edit-roles"
              disabled={loading}
              onClick={() => {
                if (edit?.type === "create") createItem();
                else setEdit({ type: "create", id: null });
              }}
            >
              {edit?.type === "create" ? "Сохранить" : "Создать"}
            </button>
          </div>

          <div className="my-applications-content">
            <Table
              dataSource={filteredData}
              rowKey="id"
              bordered
              pagination={{ pageSize: 15 }}
              loading={loading}
            >
              <Table.Column
                title="Тип транзакции"
                key="transactionType"
                sortable
                render={(val, row) => (
                  edit?.type === "update" && edit?.id === row.id ? (
                    <Input type="text" onChange={(e) => setData("transactionType", e)} value={data?.transactionType || ""} onEnter={upDateItem} />
                  ) : row.transactionType
                )}
              />
              <Table.Column
                title="Описание"
                key="description"
                sortable
                render={(val, row) => (
                  edit?.type === "update" && edit?.id === row.id ? (
                    <Input type="text" onChange={(e) => setData("description", e)} value={data?.description || ""} onEnter={upDateItem} />
                  ) : row.description
                )}
              />
              <Table.Column
                title="ATM ID"
                key="atmId"
                sortable
                render={(val, row) => (
                  edit?.type === "update" && edit?.id === row.id ? (
                    <Input type="text" onChange={(e) => setData("atmId", e)} value={data?.atmId || ""} onEnter={upDateItem} />
                  ) : row.atmId
                )}
              />
              <Table.Column
                title="Валюта"
                key="currency"
                sortable
                render={(val, row) => (
                  edit?.type === "update" && edit?.id === row.id ? (
                    <Input type="text" onChange={(e) => setData("currency", e)} value={data?.currency || ""} onEnter={upDateItem} placeholder="Код валюты" />
                  ) : formatCurrencyDisplay(row.currency)
                )}
              />
              <Table.Column title="id" dataIndex="id" key="id" sortable />
              <Table.Column
                title="Действия"
                key="actions"
                render={(_, row) => (
                  <div className="active-table">
                    {edit?.type === "update" && edit?.id === row.id ? (
                      <>
                        <button className="button-edit-roles small-size" onClick={upDateItem}>Сохранить</button>
                        <button className="button-edit-roles small-size" onClick={() => setEdit(null)} style={{ marginLeft: "5px", backgroundColor: "#6c757d" }}>Отмена</button>
                      </>
                    ) : (
                      <>
                        <button className="button-edit-roles small-size" onClick={() => startEdit(row)}>Редактировать</button>
                        <button className="button-edit-roles small-size" disabled={loading} onClick={() => deleteItem(row.id)} style={{ marginLeft: "5px", backgroundColor: "#dc3545" }}>Удалить</button>
                      </>
                    )}
                  </div>
                )}
              />
            </Table>
          </div>
        </main>
      </div>
    </>
  );
}