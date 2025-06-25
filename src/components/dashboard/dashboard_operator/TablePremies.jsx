import React, { useEffect, useState, useRef, useCallback } from 'react';
import Spinner from '../../Spinner.jsx';
import '../../../styles/components/Table.scss';
import {fetchWorkers} from "../../../api/operator/reports/operator_premies.js";
import SearchBar from "../../general/SearchBar.jsx";

const TablePremies = ({ month, year }) => {
  const [workers, setWorkers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const observer = useRef();

  // Загрузка первой порции
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

  // Поиск
  const handleSearch = async (filtered) => {
    if (!filtered) {
      // Очистка поиска
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

  // Подгрузка всех данных для поиска
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

  // Пагинация
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

            const basePremia =
                (mobile_bank.mobile_bank_prem || 0) +
                (turnover.card_turnovers_prem || 0) +
                (turnover.active_cards_perms || 0) +
                (card_sales.cards_prem || 0) +
                (w.salary_project || 0);

            const callCenter = service.call_center || 0;
            let callPercent = 0;
            if (callCenter <= 1) callPercent = -30;
            else if (callCenter <= 3) callPercent = -20;
            else if (callCenter <= 5) callPercent = -10;
            else if (callCenter <= 7) callPercent = 0;
            else if (callCenter <= 9) callPercent = 10;
            else if (callCenter <= 10) callPercent = 20;

            const tests = service.tests || 0;
            let testPercent = 0;
            if (tests <= 2) testPercent = -10;
            else if (tests <= 4) testPercent = -5;
            else if (tests <= 6) testPercent = 0;
            else if (tests <= 8) testPercent = 5;
            else if (tests <= 9) testPercent = 10;
            else if (tests <= 10) testPercent = 15;

            const totalCoef = (callPercent + testPercent) / 100;
            const totalPremia = basePremia + basePremia * totalCoef;

            const isLast = idx === workers.length - 1;

            return (
                <tr key={w.ID} ref={isLast ? lastRowRef : null}>
                  <td>{user.Username}</td>
                  <td>{w.plan}</td>
                  <td>{card_sales.cards_sailed}</td>
                  <td>{mobile_bank.mobile_bank_prem}</td>
                  <td>{w.salary_project}</td>
                  <td>{turnover.card_turnovers_prem?.toFixed(0)}</td>
                  <td>{card_sales.deb_osd}</td>
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
