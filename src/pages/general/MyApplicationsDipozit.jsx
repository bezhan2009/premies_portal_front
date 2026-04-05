import { useState } from "react";
import Input from "../../components/elements/Input.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { tableDataDef } from "../../const/defConst.js";
import file from "../../assets/file.jpg";
import { useModal } from "../../hooks/useModal.js";
import Modal from "../../components/modal/Modal.jsx";
import { Table } from "../../components/table/FlexibleAntTable.jsx";

export default function MyApplicationsDipozit() {
  const { data, errors, setData } = useFormStore();
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableData] = useState(tableDataDef);
  const { setModal } = useModal();

  const rowSelection = {
    selectedRowKeys: selectedRows,
    onChange: (selectedRowKeys) => {
      setSelectedRows(selectedRowKeys);
    },
  };

  return (
    <>
      <div className="my-applications content-page">
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
            <Table
              dataSource={tableData}
              rowKey="id"
              rowSelection={rowSelection}
              bordered
              scroll={{ x: "max-content" }}
              pagination={{ pageSize: 10 }}
            >
              <Table.Column title="ID" dataIndex="applicationId" key="applicationId" sortable />
              <Table.Column title="Статус заявки" dataIndex="status" key="status" sortable />
              <Table.Column title="Коммент" dataIndex="comment" key="comment" sortable />
              <Table.Column title="ФИО Клиента" dataIndex="fullName" key="fullName" sortable />
              <Table.Column title="Телефон" dataIndex="phone" key="phone" sortable />
              <Table.Column title="Кодовое слово" dataIndex="codeWord" key="codeWord" sortable />
              <Table.Column title="Имя на карте" dataIndex="cardName" key="cardName" sortable />
              <Table.Column title="Пол" dataIndex="gender" key="gender" sortable />
              <Table.Column title="Резидент" dataIndex="resident" key="resident" sortable />
              <Table.Column title="Документ" dataIndex="document" key="document" sortable />
              <Table.Column title="ИНН" dataIndex="inn" key="inn" sortable />
              <Table.Column title="Адрес" dataIndex="address" key="address" sortable />
              <Table.Column title="Карта" dataIndex="card" key="card" sortable />
              <Table.Column
                title="Сканы паспорта"
                key="passportScans"
                align="center"
                render={(_, row) => (
                  <img
                    src={file}
                    onClick={() => setModal({ open: true, url: row.passportScans })}
                    alt="file"
                    width={50}
                    style={{ cursor: "pointer" }}
                  />
                )}
              />
              <Table.Column title="Сканы подписанных доч." dataIndex="signedDocsScans" key="signedDocsScans" />
              <Table.Column title="Сканы по доработкам" dataIndex="revisionScans" key="revisionScans" />
            </Table>
          </div>
        </main>
      </div>
      <Modal />
    </>
  );
}
