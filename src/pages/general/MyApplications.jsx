import { useState } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { tableDataDef } from "../../const/defConst";
import file from "../../assets/file.jpg";
import { useModal } from "../../hooks/useModal";
import Modal from "../../components/modal/Modal";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import { useTableSort } from "../../hooks/useTableSort";
import SortIcon from "../../components/general/SortIcon";

export default function MyApplications() {
  const { data, errors, setData } = useFormStore();
  const [selectedRows, setSelectedRows] = useState([]);
  const [initialTableData] = useState(tableDataDef);
  const { setModal } = useModal();

  const {
    items: tableData,
    requestSort,
    sortConfig,
  } = useTableSort(initialTableData);

  console.log("selectedRows", selectedRows);

  return (
    <>
      <HeaderAgent activeLink="applications" />

      <div className="my-applications">
        <main>
          <div className="my-applications-header">
            <button>Фильтр</button>
            <button>Редактировать</button>
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
                  <th
                    onClick={() => requestSort("applicationId")}
                    className="sortable-header"
                  >
                    ID{" "}
                    <SortIcon sortConfig={sortConfig} sortKey="applicationId" />
                  </th>
                  <th
                    onClick={() => requestSort("status")}
                    className="sortable-header"
                  >
                    Статус заявки{" "}
                    <SortIcon sortConfig={sortConfig} sortKey="status" />
                  </th>
                  <th
                    onClick={() => requestSort("comment")}
                    className="sortable-header"
                  >
                    Коммент{" "}
                    <SortIcon sortConfig={sortConfig} sortKey="comment" />
                  </th>
                  <th
                    onClick={() => requestSort("fullName")}
                    className="sortable-header"
                  >
                    ФИО Клиента{" "}
                    <SortIcon sortConfig={sortConfig} sortKey="fullName" />
                  </th>
                  <th
                    onClick={() => requestSort("phone")}
                    className="sortable-header"
                  >
                    Телефон <SortIcon sortConfig={sortConfig} sortKey="phone" />
                  </th>
                  <th
                    onClick={() => requestSort("codeWord")}
                    className="sortable-header"
                  >
                    Кодовое слово{" "}
                    <SortIcon sortConfig={sortConfig} sortKey="codeWord" />
                  </th>
                  <th
                    onClick={() => requestSort("cardName")}
                    className="sortable-header"
                  >
                    Имя на карте{" "}
                    <SortIcon sortConfig={sortConfig} sortKey="cardName" />
                  </th>
                  <th
                    onClick={() => requestSort("gender")}
                    className="sortable-header"
                  >
                    Пол <SortIcon sortConfig={sortConfig} sortKey="gender" />
                  </th>
                  <th
                    onClick={() => requestSort("resident")}
                    className="sortable-header"
                  >
                    Резидент{" "}
                    <SortIcon sortConfig={sortConfig} sortKey="resident" />
                  </th>
                  <th
                    onClick={() => requestSort("document")}
                    className="sortable-header"
                  >
                    Документ{" "}
                    <SortIcon sortConfig={sortConfig} sortKey="document" />
                  </th>
                  <th
                    onClick={() => requestSort("inn")}
                    className="sortable-header"
                  >
                    ИНН <SortIcon sortConfig={sortConfig} sortKey="inn" />
                  </th>
                  <th
                    onClick={() => requestSort("address")}
                    className="sortable-header"
                  >
                    Адрес <SortIcon sortConfig={sortConfig} sortKey="address" />
                  </th>
                  <th
                    onClick={() => requestSort("card")}
                    className="sortable-header"
                  >
                    Карта <SortIcon sortConfig={sortConfig} sortKey="card" />
                  </th>
                  <th>Сканы паспорта</th>
                  <th>Сканы подписанных доч.</th>
                  <th>Сканы по доработкам</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    style={{
                      backgroundColor: rowIndex % 2 === 0 ? "#fff" : "#f9f9f9",
                    }}
                  >
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          setSelectedRows(
                            e.target.checked
                              ? [...selectedRows, row.id]
                              : selectedRows.filter((id) => id !== row.id),
                          );
                        }}
                      />
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.applicationId}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.status}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.comment}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.fullName}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.phone}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.codeWord}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.cardName}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.gender}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.resident}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.document}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.inn}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.address}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.card}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "center",
                        cursor: "pointer",
                      }}
                    >
                      {/* {row.passportScans} */}
                      <img
                        src={file}
                        onClick={() =>
                          setModal({ open: true, url: row.passportScans })
                        }
                        alt="file"
                        width={50}
                      />
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.signedDocsScans}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {row.revisionScans}
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
