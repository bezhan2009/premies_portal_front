import React, { useState, useEffect } from "react";
import Filters from "../../dashboard_general/LastModified.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import Spinner from "../../../Spinner.jsx";
import { calculateTotalPremia } from "../../../../api/utils/calculate_premia.js";
import { fetchEmployees } from "../../../../api/chairman/reports/employee.js";

function formatNumber(value) {
  if (value == null || isNaN(value)) return "0,00";

  return Number(value)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    .replace(".", ",");
}

const ITEMS_PER_PAGE = 10;

const ReportTableEmployeesChairman = ({ onSelect, workerId = null }) => {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
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
      let all = [];
      let after = null;
      try {
        while (true) {
          const chunk = await fetchEmployees(
            dateFilter.month,
            dateFilter.year,
            after,
          );
          if (!chunk || chunk.length === 0) break;

          all = [...all, ...chunk];
          after = chunk[chunk.length - 1]?.ID ?? chunk[chunk.length - 1]?.id;
          if (chunk.length < ITEMS_PER_PAGE) break;
        }
      } catch (err) {
        console.error(err);
      }
      setAllData(all);
      setFilteredData(all);
      setCurrentPage(1);
      setLoading(false);
    };

    loadAll();
  }, [dateFilter, workerId]);

  const handleSearch = (filtered) => {
    if (!filtered || filtered.length === 0) {
      setFilteredData(allData);
      setCurrentPage(1);
    } else {
      setFilteredData(filtered);
      setCurrentPage(1);
    }
  };

  const handleRowClick = (worker) => {
    const resolvedWorkerId = worker?.ID ?? worker?.id ?? null;
    const idToUse = workerId || resolvedWorkerId;

    if (!idToUse) {
      return;
    }

    setSelectedRow(resolvedWorkerId);
    onSelect(`${idToUse}/${dateFilter.year}`);
  };

  if (workerId) {
    return null;
  }

  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const buttons = [];
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          className={`pagination-button ${currentPage === i ? "active" : ""}`}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>,
      );
    }

    return <div className="pagination-container">{buttons}</div>;
  };

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
        ) : paginatedData.length === 0 ? (
          <h1>Нет данных</h1>
        ) : (
          <>
            <table className="table-reports">
              <thead>
                <tr>
                  <th>Выберите</th>
                  <th>ФИО</th>
                  <th>Место работы</th>
                  <th>Всего карт до текущего периода</th>
                  <th>Выдано карт в текущем периоде</th>
                  <th>Активных карт за текущий период</th>
                  <th>Обороты по дебету</th>
                  <th>Обороты по кредиту</th>
                  <th>Премия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((worker) => {
                  const workerRowId = worker?.ID ?? worker?.id;

                  return (
                    <tr
                      key={workerRowId}
                      onClick={() => handleRowClick(worker)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div
                          className={`choose-td ${selectedRow === workerRowId ? "active" : ""}`}
                        ></div>
                      </td>
                      <td>{worker.user?.full_name || ""}</td>
                      <td>{worker.place_work || ""}</td>
                      <td>
                        {formatNumber(
                          worker.CardSales?.[0]?.cards_sailed_in_general || 0,
                        )}
                      </td>
                      <td>
                        {formatNumber(worker.CardSales?.[0]?.cards_sailed || 0)}
                      </td>
                      <td>
                        {formatNumber(
                          worker.CardTurnovers?.[0]?.activated_cards || 0,
                        )}
                      </td>
                      <td>{formatNumber(worker.CardSales?.[0]?.deb_osd || 0)}</td>
                      <td>{formatNumber(worker.CardSales?.[0]?.deb_osk || 0)}</td>
                      <td>{formatNumber(calculateTotalPremia(worker))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportTableEmployeesChairman;
