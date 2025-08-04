import { useState } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { applicationsList, status, tableDataDef } from "../../const/defConst";
import file from "../../assets/file.jpg";
import { useModal } from "../../hooks/useModal";
import Modal from "../../components/modal/Modal";
import Select from "../../components/elements/Select";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
export default function ApplicationsList() {
  const { data, errors, setData } = useFormStore();
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableData, setTableData] = useState(tableDataDef);
  const { setModal } = useModal();

  console.log("selectedRows", selectedRows);

  const headers = [
    "Телефон",
    "Кодовое слово",
    "Имя на карте",
    "Пол",
    "Резидент",
    "Документ",
    "ИНН",
    "Адрес",
    "Карта",
    "Валюта карты",
    "Номер счета",
    "Договор",
    "Дата",
    "Сканы паспорта",
    "Сканы подписанных документов",
    "Сканы по доработкам",
  ];

  return (
    <>
      <HeaderAgent activeLink="applications" />

      <div className="applications-list">
        <main>
          <div className="my-applications-header">
            <Select
              id={"status"}
              value={data?.status}
              onChange={(e) => setData("status", e)}
              options={status}
              error={errors}
            />

            <button className="filter">Фильтр</button>
            <button className="edit">Редактировать</button>
            <button className="save">Скачать анкету</button>

            <div>
              <Input
                placeholder={"Напишите комментарий"}
                onChange={(e) => setData("message", e)}
                value={data?.message}
                error={errors}
                id={"message"}
              />
              <button onClick={() => console.log(data.message)}>
                Отправить
              </button>
            </div>
            <button className="Unloading">Выгрузка для карт</button>
            <button className="Report">Отчет</button>
          </div>
          <div className="my-applications-sub-header">
            Показать{" "}
            <Input
              type="number"
              placeholder={""}
              onChange={(e) => setData("limit", e)}
              value={data?.limit}
              error={errors}
              id={"limit"}
            />
            записей
          </div>
          <div className="my-applications-content">
            <table>
              <thead>
                <tr>
                  <th>Выбрать</th>
                  <th>Номер заявки</th>
                  <th>Статус заявки</th>
                  <th>Агент</th>
                  <th>ФИО Клиента</th>
                  <th>Карта</th>
                  <th>Доставка</th>
                  {headers.map((e, i) => (
                    <th key={i}>{e}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applicationsList.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    style={{
                      backgroundColor: rowIndex % 2 === 0 ? "#fff" : "#f9f9f9",
                      "&:hover": {
                        backgroundColor: "#f0f0f0",
                      },
                    }}
                  >
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          setSelectedRows(
                            e.target.checked
                              ? [...selectedRows, row.id]
                              : selectedRows.filter((id) => id !== row.id)
                          );
                        }}
                      />
                    </td>
                    <td>{row.appNumber}</td>
                    <td>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "12px",
                          backgroundColor:
                            row.status === "Новая" ? "#e3f2fd" : "#e8f5e9",
                          color: row.status === "Новая" ? "#1976d2" : "#2e7d32",
                          fontWeight: "500",
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>{row.agent}</td>
                    <td>{row.clientName}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: "500",
                          color: row.card.includes("Visa")
                            ? "#1a237e"
                            : "#c62828",
                        }}
                      >
                        {row.card}
                      </span>
                    </td>
                    <td>{row.delivery}</td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.phone || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.codeWord || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.cardName || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.gender || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.resident || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.document || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.inn || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.address || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.card || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.currency || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.accountNumber || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.contract || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.date || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.passportScans || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.signedDocsScans || "-"}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "10px 8px" }}
                    >
                      {row.revisionScans || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
      <Modal />
    </>
  );
}
