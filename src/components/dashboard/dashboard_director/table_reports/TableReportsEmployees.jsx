import React, { useState, useEffect } from "react";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import Filters from "../../dashboard_general/LastModified.jsx";
import "../../../../styles/components/TablesChairman.scss";
import SearchBar from "../../../general/SearchBar.jsx";
import Spinner from "../../../Spinner.jsx";
import { calculateTotalPremia } from "../../../../api/utils/calculate_premia.js";
import { fetchOfficeDirector } from "../../../../api/offices/director_office.js";

function formatNumber(value) {
  if (value == null || isNaN(value)) return "0,00";
  return Number(value)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    .replace(".", ",");
}

const ReportTableEmployeesDirector = ({ onSelect, workerId = null }) => {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    if (workerId) {
      const url = `${workerId}/${dateFilter.year}`;
      onSelect(url);
    }
  }, [workerId, dateFilter, onSelect]);

  useEffect(() => {
    if (workerId) {
      return;
    }

    const loadAll = async () => {
      setLoading(true);
      try {
        const officeData = await fetchOfficeDirector({
          month: dateFilter.month,
          year: dateFilter.year,
        });

        const workers = officeData.office_user?.map((u) => u.worker) || [];

        setAllData(workers);
        setFilteredData(workers);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    loadAll();
  }, [dateFilter, workerId]);

  const handleSearch = (filtered) => {
    if (!filtered || filtered.length === 0) {
      setFilteredData(allData);
    } else {
      setFilteredData(filtered);
    }
  };

  const handleRowClick = (worker) => {
    const idToUse = workerId || worker.ID;
    setSelectedRow(worker.ID);
    onSelect(`${idToUse}/${dateFilter.year}`);
  };

  if (workerId) {
    return null;
  }

  return (
    <div className="block_info_prems content-page" align="center">
      <div className="report-table-container">
        <div className="date-filter-container">
          <span className="label">Период</span>
          <Filters onChange={setDateFilter} />
        </div>

        <SearchBar
          allData={allData}
          onSearch={handleSearch}
          searchKey="user.full_name"
        />

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
        ) : filteredData.length === 0 ? (
          <h1>Нет данных</h1>
        ) : (
          <Table
            dataSource={filteredData}
            rowKey="ID"
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
                  className={`choose-td ${selectedRow === record.ID ? "active" : ""}`}
                ></div>
              )}
              width={100}
            />
            <Table.Column
              title="ФИО"
              key="full_name"
              render={(_, record) => record.user?.full_name || ""}
            />
            <Table.Column title="Место работы" dataIndex="place_work" key="place_work" />
            <Table.Column
              title="Всего карт до текущего периода"
              key="total_cards"
              render={(_, record) => formatNumber(record.CardSales?.[0]?.cards_sailed_in_general || 0)}
            />
            <Table.Column
              title="Выдано карт в текущем периоде"
              key="cards_sailed"
              render={(_, record) => formatNumber(record.CardSales?.[0]?.cards_sailed || 0)}
            />
            <Table.Column
              title="Активных карт за текущий период"
              key="activated_cards"
              render={(_, record) => formatNumber(record.CardTurnovers?.[0]?.activated_cards || 0)}
            />
            <Table.Column
              title="Обороты по дебету"
              key="deb_osd"
              render={(_, record) => formatNumber(record.CardSales?.[0]?.deb_osd || 0)}
            />
            <Table.Column
              title="Обороты по кредиту"
              key="deb_osk"
              render={(_, record) => formatNumber(record.CardSales?.[0]?.deb_osk || 0)}
            />
            <Table.Column
              title="Премия"
              key="premia"
              render={(_, record) => formatNumber(calculateTotalPremia(record))}
            />
          </Table>
        )}
      </div>
    </div>
  );
};

export default ReportTableEmployeesDirector;
