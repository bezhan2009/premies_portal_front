import { useState } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { tableDataDef } from "../../const/defConst";
import file from "../../assets/file.jpg";
import { useModal } from "../../hooks/useModal";
import Modal from "../../components/modal/Modal";

export default function MyApplications() {
  const { data, errors, setData } = useFormStore();
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableData, setTableData] = useState(tableDataDef);
  const { setModal } = useModal()

  console.log("selectedRows", selectedRows);

  return (<>
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
                <th>ID</th>
                <th>Статус заявки</th>
                <th>Коммент</th>
                <th>ФИО Клиента</th>
                <th>Телефон</th>
                <th>Кодовое слово</th>
                <th>Имя на карте</th>
                <th>Пол</th>
                <th>Резидент</th>
                <th>Документ</th>
                <th>ИНН</th>
                <th>Адрес</th>
                <th>Карта</th>
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
                            : selectedRows.filter((id) => id !== row.id)
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
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center", cursor: "pointer" }}>
                    {/* {row.passportScans} */}
                      <img src={file} onClick={() => setModal({ open: true, url: row.passportScans })} alt="file" width={50} />
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
  </>);
}
