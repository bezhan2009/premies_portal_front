import React, { useEffect, useState, useCallback, useRef } from 'react';
import '../../../../styles/components/Table.scss';
import Spinner from '../../../Spinner.jsx';
import SearchBar from '../../../general/SearchBar.jsx';
import {fetchReportMobileBank} from "../../../../api/operator/reports/report_mb.js";

const TableReportsMb = ({ month, year }) => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const observer = useRef();

  // Загрузка всех данных для поиска
  useEffect(() => {
    const loadAll = async () => {
      let all = [];
      let after = null;

      while (true) {
        const chunk = await fetchReportMobileBank(month, year, after);
        if (!chunk || chunk.length === 0) break;

        all = [...all, ...chunk];
        after = chunk[chunk.length - 1]?.ID;
        if (chunk.length < 10) break;
      }

      setAllData(all);
    };

    loadAll();
  }, [month, year]);

  // Загрузка первой страницы данных
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setIsSearching(false);
      setHasMore(true);
      setData([]);

      try {
        const chunk = await fetchReportMobileBank(month, year, null);
        setData(chunk);
        if (chunk.length < 10) setHasMore(false);
      } catch (e) {
        console.error("Ошибка загрузки данных", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [month, year]);

  // Догрузка следующей страницы
  const loadMore = async () => {
    if (loadingMore || !hasMore || isSearching) return;

    setLoadingMore(true);
    try {
      const lastId = data[data.length - 1]?.ID;
      const chunk = await fetchReportMobileBank(month, year, lastId);
      setData((prev) => [...prev, ...chunk]);
      if (chunk.length < 10) setHasMore(false);
    } catch (e) {
      console.error("Ошибка догрузки", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // Intersection Observer для пагинации
  const lastRowRef = useCallback((node) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });

    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, data]);

  // Обработка поиска
  const handleSearch = async (filtered) => {
    if (!filtered) {
      // Очистка поиска
      setIsSearching(false);
      setLoading(true);
      try {
        const chunk = await fetchReportMobileBank(month, year, null);
        setData(chunk);
        setHasMore(chunk.length >= 10);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Пользователь ввел запрос
    setIsSearching(true);
    setData(filtered);
    setHasMore(false);
  };

  return (
      <div className="report-table-container">
        <SearchBar
            allData={allData}
            onSearch={handleSearch}
            placeholder="Поиск по ФИО"
            searchFields={[
              (item) => item.user?.full_name || '',
            ]}
        />

        <table className="table-reports">
          <thead>
          <tr>
            <th>ФИО сотрудника</th>
            <th>Количество подключений</th>
          </tr>
          </thead>
          <tbody>
          {data.length > 0 ? (
              data.map((row, idx) => {
                const isLast = idx === data.length - 1;

                const userName = row.user?.full_name || '';
                const mobile_bank_connects = row.MobileBank?.[0]?.mobile_bank_connects ?? '';

                return (
                    <tr key={row.ID} ref={isLast && !isSearching ? lastRowRef : null}>
                      <td>{userName}</td>
                      <td>{mobile_bank_connects}</td>
                    </tr>
                );
              })
          ) : (
              !loading && (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center' }}>
                      Нет данных за выбранный период
                    </td>
                  </tr>
              )
          )}
          </tbody>
        </table>

        {loading && (
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
        )}

        {loadingMore && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <Spinner />
            </div>
        )}
      </div>
  );
};

export default TableReportsMb;
