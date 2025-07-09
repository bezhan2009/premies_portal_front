import React, { useState, useEffect } from 'react';
import '../../../../styles/components/Table.scss';
import Filters from '../../dashboard_general/LastModified.jsx';
import '../../../../styles/components/TablesChairman.scss';
import '../../../../styles/pagination.scss';
import SearchBar from "../../../general/SearchBar.jsx";
import Spinner from "../../../Spinner.jsx";
import {calculateTotalPremia} from "../../../../api/utils/calculate_premia.js";
import {fetchEmployees} from "../../../../api/chairman/reports/employee.js";

const ITEMS_PER_PAGE = 10;

const ReportTableEmployeesChairman = ({ onSelect }) => {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [selectedRow, setSelectedRow] = useState(null);

  // Загружаем всех работников
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      let all = [];
      let after = null;
      try {
        while (true) {
          const chunk = await fetchEmployees(dateFilter.month, dateFilter.year, after);
          if (!chunk || chunk.length === 0) break;

          all = [...all, ...chunk];
          after = chunk[chunk.length - 1]?.ID;
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
  }, [dateFilter]);

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
    setSelectedRow(worker.ID);
    onSelect(`${worker.ID}/${dateFilter.year}`);
  };

  const paginatedData = filteredData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const buttons = [];
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
          <button
              key={i}
              className={`pagination-button ${currentPage === i ? 'active' : ''}`}
              onClick={() => setCurrentPage(i)}
          >
            {i}
          </button>
      );
    }

    return <div className="pagination-container">{buttons}</div>;
  };

  return (
      <div className="block_info_prems" align="center">
        <div className="report-table-container">
          <div className="date-filter-container">
            <span className="label">Период</span>
            <Filters onChange={setDateFilter} />
          </div>

          <SearchBar allData={allData} onSearch={handleSearch} searchKey="user.full_name" />

          {loading ? (
              <div
                  style={{
                    transform: 'scale(2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: "100px",
                    width: "auto"
                  }}
              >
                <Spinner/>
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
                    <th>Количество карт</th>
                    <th>Количество активных карт</th>
                    <th>Обороты по дебету</th>
                    <th>Обороты по кредиту</th>
                    <th>Премия</th>
                  </tr>
                  </thead>
                  <tbody>
                  {paginatedData.map((worker) => (
                      <tr
                          key={worker.ID}
                          onClick={() => handleRowClick(worker)}
                          style={{cursor: 'pointer'}}
                      >
                        <td>
                          <div
                              className={`choose-td ${selectedRow === worker.ID ? 'active' : ''}`}
                          ></div>
                        </td>
                        <td>{worker.user?.full_name || ''}</td>
                        <td>{worker.CardSales && worker.CardSales.length > 0
                            ? worker.CardSales[0].cards_sailed : 0}</td>
                        <td>{worker.CardTurnovers && worker.CardTurnovers.length > 0
                            ? worker.CardTurnovers[0].activated_cards : 0}</td>
                        <td>
                          {worker.CardSales && worker.CardSales.length > 0
                              ? worker.CardSales[0].deb_osd : 0}
                        </td>
                        <td>
                          {worker.CardSales && worker.CardSales.length > 0
                              ? worker.CardSales[0].deb_osk : 0}
                        </td>
                        <td>{calculateTotalPremia(worker)?.toFixed(3)}</td>
                      </tr>
                  ))}
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
