import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchWorkers } from '../../../api/operator_premies.js';
import Spinner from "../../Spinner.jsx";
import '../../../styles/components/Table.scss';

const TablePremies = ({ month, year }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  // Загружаем первую порцию
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      const data = await fetchWorkers(month, year);
      setWorkers(data);
      setHasMore(data.length === 10);
      setLoading(false);
    };

    loadInitial();
  }, [month, year]);

  // Функция загрузки следующей порции
  const loadMore = async () => {
    if (loadingMore || !hasMore || workers.length === 0) return;
    setLoadingMore(true);
    const lastId = workers[workers.length - 1]?.ID;
    console.log(lastId)
    const data = await fetchWorkers(month, year, lastId);
    setWorkers(prev => [...prev, ...data]);
    setHasMore(data.length === 10);
    setLoadingMore(false);
  };

  // Ref для последней строки
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
        <div style={{ transform: 'scale(2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spinner />
        </div>
    );
  }

  return (
      <div className="report-table-container">
        <table className="table-reports">
          <thead>
          <tr>
            <th>ФИО</th>
            <th>План</th>
            <th>ЗП проект</th>
            <th>Оборот по картам</th>
            <th>Активные карты</th>
            <th>КЦ</th>
            <th>Жалобы</th>
            <th>Тесты</th>
            <th>Бонус</th>
            <th>Итого</th>
          </tr>
          </thead>
          <tbody>
          {workers.map((w, idx) => {
            const user = w.user || {};
            const turnover = w.CardTurnovers?.[0] || {};
            const service = w.ServiceQuality?.[0] || {};

            const totalPremia =
                (turnover.card_turnovers_prem || 0) +
                (turnover.active_cards_perms || 0) +
                (service.bonus || 0) +
                (w.salary_project || 0);

            const isLast = idx === workers.length - 1;

            return (
                <tr
                    key={w.id || idx}
                    ref={isLast ? lastRowRef : null}
                >
                  <td>{user.Username}</td>
                  <td>{w.plan}</td>
                  <td>{w.salary_project}</td>
                  <td>{turnover.card_turnovers_prem?.toFixed(2)}</td>
                  <td>{turnover.active_cards_perms?.toFixed(2)}</td>
                  <td>{service.call_center}</td>
                  <td>{service.complaint}</td>
                  <td>{service.tests}</td>
                  <td>{service.bonus}</td>
                  <td>{totalPremia.toFixed(2)}</td>
                </tr>
            );
          })}
          </tbody>
        </table>

        {loadingMore && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <Spinner />
            </div>
        )}
      </div>
  );
};

export default TablePremies;
