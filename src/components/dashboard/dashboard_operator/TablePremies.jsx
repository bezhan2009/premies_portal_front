import React, { useEffect, useState, useRef, useCallback } from 'react';
import Spinner from '../../Spinner.jsx';
import '../../../styles/components/Table.scss';
import { fetchWorkers } from "../../../api/operator/reports/operator_premies.js";
import SearchBar from "../../general/SearchBar.jsx";
import {calculateTotalPremia} from "../../../api/utils/calculate_premia.js";

const TablePremies = ({ month, year }) => {
  const [workers, setWorkers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const observer = useRef();

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWorkers(month, year);
        setWorkers(data);
        setHasMore(data.length === 10);
      } catch (err) {
        setError('Не удалось загрузить данные.');
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, [month, year]);

  const handleSearch = async (filtered) => {
    if (!filtered) {
      setIsSearching(false);
      setLoading(true);
      try {
        const data = await fetchWorkers(month, year);
        setWorkers(data);
        setHasMore(data.length === 10);
      } catch {
        setError('Не удалось загрузить данные.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setIsSearching(true);
    setWorkers(filtered);
    setHasMore(false);
  };

  useEffect(() => {
    const loadAllData = async () => {
      let all = [];
      let afterID = null;

      while (true) {
        const chunk = await fetchWorkers(month, year, afterID);
        if (!chunk || chunk.length === 0) break;

        all = [...all, ...chunk];
        afterID = chunk[chunk.length - 1]?.ID;
        if (chunk.length < 10) break;
      }

      setAllWorkers(all);
    };

    loadAllData();
  }, [month, year]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || workers.length === 0 || isSearching) return;

    setLoadingMore(true);
    setError(null);
    try {
      const lastId = workers[workers.length - 1]?.ID;
      const data = await fetchWorkers(month, year, lastId);
      setWorkers(prev => [...prev, ...data]);
      setHasMore(data.length === 10);
    } catch (err) {
      setError('Не удалось загрузить дополнительные данные.');
    } finally {
      setLoadingMore(false);
    }
  };

  const lastRowRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });

    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, workers]);

  if (loading) {
    return (
        <div style={{ transform: 'scale(2)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: "100px", width: "auto" }}>
          <Spinner />
        </div>
    );
  }

  if (error) {
    return (
        <div className="report-table-container" style={{ textAlign: 'center', padding: '1rem', color: 'red' }}>
          <p>{error}</p>
        </div>
    );
  }

  return (
      <div className="report-table-container">
        <SearchBar allData={allWorkers} onSearch={handleSearch} />

        <table className="table-reports">
          <thead>
          <tr>
            <th>ФИО</th>
            <th>План продаж</th>
            <th>Продано карт</th>
            <th>Моб. банк</th>
            <th>ЗП проект</th>
            <th>Оборот по дебету</th>
            <th>Остатки по картам</th>
            <th>Активные карты</th>
            <th>Оценка КЦ</th>
            <th>Жалобы</th>
            <th>Тесты</th>
            <th>Итого</th>
          </tr>
          </thead>
          <tbody>
          {workers.map((w, idx) => {
            const user = w.user || {};
            const turnover = w.CardTurnovers?.[0] || {};
            const service = w.ServiceQuality?.[0] || {};
            const card_sales = w.CardSales?.[0] || {};
            const mobile_bank = w.MobileBank?.[0] || {};

            const totalPremia = calculateTotalPremia(w);
            const isLast = idx === workers.length - 1;

            return (
                <tr key={w.ID} ref={isLast ? lastRowRef : null}>
                  <td>{user.Username}</td>
                  <td>{w.plan}</td>
                  <td>{card_sales.cards_sailed}</td>
                  <td>{mobile_bank.mobile_bank_prem}</td>
                  <td>{w.salary_project}</td>
                  <td>{turnover.debt_osd?.toFixed(0)}</td>
                  <td>{card_sales.out_balance}</td>
                  <td>{turnover.active_cards_perms?.toFixed(0)}</td>
                  <td>{service.call_center}</td>
                  <td>{service.complaint}</td>
                  <td>{service.tests}</td>
                  <td>{totalPremia.toFixed(1)}</td>
                </tr>
            );
          })}
          </tbody>
        </table>

        {!loading && workers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <p>Ничего не найдено</p>
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

export default TablePremies;
