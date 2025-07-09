import React, { useState, useEffect } from 'react';
import '../../../../styles/components/Table.scss';
import LastModified from '../../dashboard_general/LastModified.jsx';
import '../../../../styles/components/TablesChairman.scss';
import '../../../../styles/pagination.scss';
import Spinner from '../../../Spinner.jsx';
import {fetchOffices} from "../../../../api/offices/all_offices.js";

const ITEMS_PER_PAGE = 10;

const ReportTableOfficesChairman = ({ onSelect }) => {
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
    const loadAll = async () => {
      setLoading(true);
      try {
        const res = await fetchOffices();
        setAllData(res);
        setFilteredData(res);
      } catch (e) {
        console.error(e);
      }
      setCurrentPage(1);
      setLoading(false);
    };

    loadAll();
  }, [dateFilter]);

  const handleRowClick = (office) => {
    setSelectedRow(office.ID);
    onSelect(`${office.ID}/${dateFilter.year}/office`);
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
            <LastModified onChange={setDateFilter} />
          </div>

          {loading ? (
              <div
                  style={{
                    transform: 'scale(2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '100px',
                    width: 'auto',
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
                    <th>Организация</th>
                    <th>Количество работников</th>
                    <th>Филиал</th>
                  </tr>
                  </thead>
                  <tbody>
                  {paginatedData.map((office) => (
                      <tr
                          key={office.ID}
                          onClick={() => handleRowClick(office)}
                          style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div
                              className={`choose-td ${selectedRow === office.ID ? 'active' : ''}`}
                          ></div>
                        </td>
                        <td>{office.title || ''}</td>
                        <td>{office.office_user?.length || 0}</td>
                        <td>
                          {office.office_user && office.office_user.length > 0
                              ? office.office_user[0].worker?.place_work || ''
                              : ''}
                        </td>
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

export default ReportTableOfficesChairman;
