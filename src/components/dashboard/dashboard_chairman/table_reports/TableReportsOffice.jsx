import React, { useState, useEffect } from "react";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import LastModified from "../../dashboard_general/LastModified.jsx";
import "../../../../styles/components/TablesChairman.scss";
import Spinner from "../../../Spinner.jsx";
import { fetchOffices } from "../../../../api/offices/all_offices.js";
import { fetchUserById } from "../../../../api/users/get_user.js";

const ReportTableOfficesChairman = ({ onSelect }) => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directorNames, setDirectorNames] = useState({});
  const [dateFilter, setDateFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const res = await fetchOffices();
        setAllData(res);

        const directorMap = {};
        await Promise.all(
          res.map(async (office) => {
            if (office.director_id) {
              try {
                const director = await fetchUserById(office.director_id);
                directorMap[office.director_id] = director.full_name;
              } catch (err) {
                directorMap[office.director_id] = "Неизвестно";
              }
            }
          }),
        );
        setDirectorNames(directorMap);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    loadAll();
  }, [dateFilter]);

  const handleRowClick = (office) => {
    const officeId = office?.ID ?? office?.id ?? null;
    if (!officeId) return;
    setSelectedRow(officeId);
    onSelect(`${officeId}/${dateFilter.year}/office`);
  };

  return (
    <div className="block_info_prems content-page" align="center">
      <div className="report-table-container">
        <div className="date-filter-container">
          <span className="label">Период</span>
          <LastModified onChange={setDateFilter} />
        </div>

        {loading ? (
          <div
            style={{
              transform: "scale(2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "100px",
              width: "auto",
            }}
          >
            <Spinner />
          </div>
        ) : allData.length === 0 ? (
          <h1>Нет данных</h1>
        ) : (
          <Table
            dataSource={allData}
            rowKey={(record) => record.ID ?? record.id}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
            })}
            bordered
          >
            <Table.Column
              title="Выберите"
              key="select"
              render={(_, record) => (
                <div
                  className={`choose-td ${selectedRow === (record.ID ?? record.id) ? "active" : ""}`}
                ></div>
              )}
              width={100}
            />
            <Table.Column
              title="Директор"
              key="director"
              render={(_, record) => directorNames[record.director_id] || "—"}
            />
            <Table.Column title="Организация" dataIndex="title" key="title" />
            <Table.Column
              title="Количество сотрудников"
              key="employees"
              render={(_, record) => record.office_user?.length || 0}
            />
          </Table>
        )}
      </div>
    </div>
  );
};

export default ReportTableOfficesChairman;
