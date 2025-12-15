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
  getTransactions,
  putTransactions,
  putTransactionsNumber,
} from "../../api/transactions/api.js";

const transactionTypes = [
  // { value: "0", label: "Тип транзакции" },
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

import { tableDataDef } from "../../const/defConst";
// import { useModal } from "../../hooks/useModal";
import Modal from "../../components/modal/Modal";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import { Button } from "antd";

export default function MyApplications() {
  const { data, errors, setData, validate } = useFormStore();
  const [loading, setLoading] = useState(false);
  // const [selectedRows, setSelectedRows] = useState([]);
  const [tableData, setTableData] = useState(tableDataDef);
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [edit, setEdit] = useState(null);

  // console.log("selectedRows", selectedRows);

  const upDateUserWorkers = async () => {
    const isValid = validate(ValidData);
    if (!isValid) {
      toast.error("Пожалуйста, заполните все обязательные поля корректно!");
      return;
    }

    setLoading(true);
    try {
      const response = await putTransactions(data);
      if (response.status === 200 || response.status === 201) {
        toast.success("Номер типа транзакции успешно обновлён!");
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
  const upDateUserNumber = async () => {
    const isValid = validate(ValidData);
    if (!isValid) {
      toast.error("Пожалуйста, заполните все обязательные поля корректно!");
      return;
    }

    setLoading(true);
    try {
      const response = await putTransactionsNumber(data);
      if (response.status === 200 || response.status === 201) {
        toast.success("Номер типа транзакции успешно обновлён!");
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

  const getItems = async () => {
    try {
      const response = await getTransactions();
      // console.log("response", response.data);

      setTableData(response.data);
    } catch (e) {
      console.error("Ошибка при обновлении:", e);
    }
  };

  useEffect(() => {
    getItems();
  }, []);

  console.log("data", data);

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
          activeLink="update_transaction"
          isOpen={isSidebarOpen}
          toggle={toggleSidebar}
        />

        <div className="my-applications" style={{ marginTop: 10 }}>
          <main style={{ overflow: "auto", height: "100%" }}>
            {/* <div className="my-applications-header">
            <button>Фильтр</button>
            <button>Редактировать</button>
          </div> */}
            <div className="my-applications-content">
              <table>
                <thead>
                  <tr>
                    <th>Тип транзакции</th>
                    <th>Название операции</th>
                    <th>Вид операции</th>
                    <th>id</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      style={{
                        backgroundColor:
                          rowIndex % 2 === 0 ? "#fff" : "#f9f9f9",
                      }}
                    >
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {row.type}
                      </td>
                      <td
                        style={{ border: "1px solid #ddd", padding: "8px" }}
                        onClick={() => {
                          setEdit({ type: "name", id: row.id });

                          setData("type", row.type);
                          setData("number", row.number);
                          setData("id", row.id);
                        }}
                      >
                        {edit?.type === "name" && edit?.id === row.id ? (
                          <Input
                            type="text"
                            defValue={data?.name || row.name}
                            onChange={(e) => setData("name", e)}
                            value={edit?.user?.name}
                            onEnter={upDateUserWorkers}
                          />
                        ) : (
                          row.name
                        )}
                      </td>
                      <td
                        onClick={() => {
                          setEdit({ type: "number", id: row.id });

                          setData("type", row.type);
                          setData("name", row.name);
                          setData("id", row.id);
                        }}
                        style={{ border: "1px solid #ddd", padding: "8px" }}
                      >
                        {edit?.type === "number" && edit?.id === row.id ? (
                          <Select
                            onChange={(e) => setData("number", e)}
                            value={data?.number || row.number}
                            onEnter={() => upDateUserNumber(edit)}
                            options={transactionTypes}
                          />
                        ) : (
                          transactionTypes.find((e) => e.value == row?.number)
                            ?.label
                        )}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {row.id}
                      </td>
                      {edit?.type ? (
                        <td>
                          <button
                            className="button-edit-roles"
                            onClick={() => {
                              if (edit?.type === "number") {
                                upDateUserNumber(edit);
                              } else {
                                upDateUserWorkers(edit);
                              }
                            }}
                          >
                            Сохранить{" "}
                          </button>
                        </td>
                      ) : (
                        ""
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
