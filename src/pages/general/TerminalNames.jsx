import Input from "../../components/elements/Input.jsx";
import "../../styles/components/BlockInfo.scss";
import "../../styles/components/TransactionTypes.scss";
import { useEffect, useState } from "react";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import Sidebar from "./DynamicMenu.jsx";
import useSidebar from "../../hooks/useSideBar.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  deleteTerminalNames,
  getTerminalNames,
  postTerminalNames,
  putTerminalNames,
  putTransactions,
  putTransactionsNumber,
} from "../../api/transactions/api.js";

const ValidData = {
  transactionType: { required: true },
  description: { required: true },
  atmId: { required: true },
};

import { tableDataDef, transactionTypes } from "../../const/defConst";
// import { useModal } from "../../hooks/useModal"

export default function TerminalNames() {
  const { data, setData, validate } = useFormStore();
  const [loading, setLoading] = useState(false);
  // const [selectedRows, setSelectedRows] = useState([]);
  const [tableData, setTableData] = useState(tableDataDef);
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [edit, setEdit] = useState(null);
  const [filters, setFilters] = useState({
    transactionType: "",
    description: "",
    atmId: "",
    id: "",
  });

  // console.log("selectedRows", selectedRows);

  const upDateItem = async () => {
    const isValid = validate(ValidData);
    if (!isValid) {
      toast.error("Пожалуйста, заполните все обязательные поля корректно!");
      return;
    }

    setLoading(true);
    try {
      const response = await putTerminalNames(data);
      if (response.status === 200 || response.status === 201) {
        toast.success("Успешно обновлён!");
        setEdit(null);
        getItems();
      }
    } catch (e) {
      // Обработка ошибки
      const errorMessage =
        e?.response?.data?.message ||
        e?.message ||
        "Произошла ошибка при обновлении";
      toast.error(`Ошибка: ${errorMessage}`);
      console.error("Ошибка при обновлении:", e);
    } finally {
      setLoading(false);
    }
  };
  const createItem = async () => {
    // const isValid = validate(ValidData);
    // if (!isValid) {
    //   toast.error("Пожалуйста, заполните все обязательные поля корректно!");
    //   return;
    // }

    setLoading(true);
    try {
      const response = await postTerminalNames(filters);
      if (response.status === 200 || response.status === 201) {
        toast.success("Успешно создан!");
        setEdit(null);
        setFilters({
          transactionType: "",
          description: "",
          atmId: "",
          id: "",
        });
        getItems();
      }
    } catch (e) {
      // Обработка ошибки
      const errorMessage =
        e?.response?.data?.message ||
        e?.message ||
        "Произошла ошибка при обновлении";
      toast.error(`Ошибка: ${errorMessage}`);
      console.error("Ошибка при обновлении:", e);
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
      // Обработка ошибки
      const errorMessage =
        e?.response?.data?.message ||
        e?.message ||
        "Произошла ошибка при обновлении";
      toast.error(`Ошибка: ${errorMessage}`);
      console.error("Ошибка при обновлении:", e);
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
      // console.log("response", response.data);

      setTableData(
        response.data.map((item) => ({
          transactionType: String(item.transactionType),
          description: item.description,
          atmId: String(item.atmId),
          id: String(item.id),
        }))
      );
    } catch (e) {
      console.error("Ошибка при обновлении:", e);
    }
  };

  const applyFilters = (data, currentFilters) => {
    if (!Array.isArray(data)) return [];

    return data.filter((row) => {
      return (
        row?.transactionType?.includes(currentFilters?.transactionType || "") &&
        row?.description?.includes(currentFilters?.description || "") &&
        row?.atmId?.includes(currentFilters?.atmId || "") &&
        row?.id?.includes(currentFilters?.id || "")
      );
    });
  };

  const filteredData = applyFilters(tableData, filters);

  useEffect(() => {
    getItems();
  }, []);

  console.log("filteredData", filteredData);

  return (
    <>
      <div
        className={`dashboard-container ${
          isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
        }`}
        style={{ paddingBottom: 0, paddingTop: 0 }}
      >
        {/* <HeaderAgent activeLink="applications" /> */}
        <Sidebar
          activeLink="terminal_names"
          isOpen={isSidebarOpen}
          toggle={toggleSidebar}
        />

        <div className="my-applications" style={{ marginTop: 10 }}>
          <main style={{ overflow: "auto", height: "100%" }}>
            {/* <div className="my-applications-header">
            <button>Фильтр</button>
            <button>Редактировать</button>
          </div> */}

            <div className="filters animate-slideIn">
              <input
                style={{
                  backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                }}
                placeholder="Тип транзакции"
                value={filters.transactionType}
                onChange={(e) =>
                  handleFilterChange("transactionType", e.target.value)
                }
              />
              <input
                style={{
                  backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                }}
                placeholder="Описание"
                value={filters.description}
                onChange={(e) =>
                  handleFilterChange("description", e.target.value)
                }
              />

              <input
                style={{
                  backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                }}
                placeholder="ATM ID"
                value={filters.atmId}
                onChange={(e) => handleFilterChange("atmId", e.target.value)}
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
                onClick={() => {
                  setEdit({
                    type: "create",
                    id: null,
                  });
                  if (edit?.type === "create") {
                    createItem();
                  }
                }}
              >
                {edit?.type === "create" ? "Сохранить" : "Создать"}
              </button>
            </div>
            <div className="my-applications-content">
              <table>
                <thead>
                  <tr>
                    <th>Тип транзакции</th>
                    <th>Описание</th>
                    <th>ATM ID</th>
                    <th>id</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      style={{
                        backgroundColor:
                          rowIndex % 2 === 0 ? "#fff" : "#f9f9f9",
                      }}
                    >
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {(edit?.type === "update") === "update" &&
                        edit?.id === row.id ? (
                          <Input
                            transactionType="text"
                            defValue={
                              data?.transactionType || row.transactionType
                            }
                            onChange={(e) => setData("transactionType", e)}
                            value={edit?.transactionType}
                            onEnter={upDateItem}
                          />
                        ) : (
                          row.transactionType
                        )}
                      </td>
                      <td
                        style={{ border: "1px solid #ddd", padding: "8px" }}
                        onClick={() => {
                          setEdit({
                            type: "update",
                            id: row.id,
                          });

                          setData("transactionType", row.transactionType);
                          setData("atmId", row.atmId);
                          setData("id", row.id);
                        }}
                      >
                        {edit?.type === "update" && edit?.id === row.id ? (
                          <Input
                            transactionType="text"
                            defValue={data?.description || row.description}
                            onChange={(e) => setData("description", e)}
                            value={edit?.description}
                            onEnter={upDateItem}
                          />
                        ) : (
                          row.description
                        )}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {edit?.type === "update" && edit?.id === row.id ? (
                          <Input
                            transactionType="text"
                            defValue={data?.atmId || row.atmId}
                            onChange={(e) => setData("atmId", e)}
                            value={edit?.atmId}
                            onEnter={upDateItem}
                          />
                        ) : (
                          row.atmId
                        )}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {row.id}
                      </td>
                      {edit?.type === "update" ? (
                        <td>
                          <button
                            className="button-edit-roles small-size"
                            onClick={() => {
                              upDateItem();
                            }}
                          >
                            Сохранить{" "}
                          </button>
                        </td>
                      ) : (
                        <td>
                          <button
                            className="button-edit-roles small-size"
                            onClick={() => {
                              deleteItem(row.id);
                            }}
                          >
                            Удалить
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </div>
      {/* <Modal /> */}
    </>
  );
}
