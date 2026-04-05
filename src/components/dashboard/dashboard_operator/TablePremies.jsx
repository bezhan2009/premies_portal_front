import React, { useState, useRef, useCallback } from "react";
import { Table } from "../../table/FlexibleAntTable.jsx";
import Spinner from "../../Spinner.jsx";
import SearchBar from "../../general/SearchBar.jsx";
import { calculateTotalPremia } from "../../../api/utils/calculate_premia.js";
import { DownloadCloud } from "lucide-react";
import Input from "../../elements/Input.jsx";
import { fullUpdateWorkers } from "../../../api/workers/fullUpdateWorkers.js";
import { useWorkers } from "../../../hooks/useWorkers";
import DownloadModal from "./DownloadModal.jsx";
import { useExcelExport } from "../../../hooks/useExcelExport.js";

const TablePremies = ({ month, year }) => {
  const {
    workers,
    allWorkers,
    loading,
    loadingMore,
    hasMore,
    error,
    handleSearch,
    loadMore,
    refresh,
  } = useWorkers(month, year);

  const [edit, setEdit] = useState({ ID: null });
  const observer = useRef();

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadUser, setDownloadUser] = useState(null);
  const [downloadMonth, setDownloadMonth] = useState("");
  const [downloadYear, setDownloadYear] = useState(new Date().getFullYear());
  const { exportToExcel } = useExcelExport();

  const enhancedWorkers = React.useMemo(() => {
    return workers.map((w) => ({
      ...w,
      totalPremia: calculateTotalPremia(w),
    }));
  }, [workers]);

  const monthOptions = [
    { name: "Январь", value: 1 },
    { name: "Февраль", value: 2 },
    { name: "Март", value: 3 },
    { name: "Апрель", value: 4 },
    { name: "Май", value: 5 },
    { name: "Июнь", value: 6 },
    { name: "Июль", value: 7 },
    { name: "Август", value: 8 },
    { name: "Сентябрь", value: 9 },
    { name: "Октябрь", value: 10 },
    { name: "Ноябрь", value: 11 },
    { name: "Декабрь", value: 12 },
  ];

  const lastRowRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore, loadMore],
  );

  const upDateUserWorkers = async () => {
    try {
      await fullUpdateWorkers(edit, false);
      setEdit({ ID: null });
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const onChangeEdit = (key, value) => {
    setEdit((prev) => {
      const keys = key.split(".");
      let newState = { ...prev };
      let current = newState;

      keys.forEach((k, i) => {
        const arrayMatch = k.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
          const [, arrKey, indexStr] = arrayMatch;
          const index = Number(indexStr);
          if (!Array.isArray(current[arrKey])) current[arrKey] = [];
          current[arrKey] = [...current[arrKey]];
          if (!current[arrKey][index]) current[arrKey][index] = {};
          if (i === keys.length - 1) {
            current[arrKey][index] = value;
          } else {
            current[arrKey][index] = { ...current[arrKey][index] };
            current = current[arrKey][index];
          }
        } else {
          if (i === keys.length - 1) {
            current[k] = value;
          } else {
            current[k] = { ...current[k] };
            current = current[k];
          }
        }
      });
      return newState;
    });
  };

  const openDownloadModal = (user) => {
    setDownloadUser(user);
    setShowDownloadModal(true);
    setDownloadMonth("");
    setDownloadYear(new Date().getFullYear());
  };

  const executeDownload = async () => {
    if (!downloadMonth || !downloadYear) {
      alert("Выберите месяц и год");
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      const url = `${import.meta.env.VITE_BACKEND_URL}/automation/reports/${
        downloadUser.ID
      }?month=${downloadMonth}&year=${downloadYear}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ошибка скачивания отчета.");
      }
      const blob = await res.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = urlBlob;
      link.download = `report_${downloadUser.Username || downloadUser.ID}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);
      setShowDownloadModal(false);
    } catch (e) {
      console.error(e);
      alert(`Не удалось скачать отчет: ${e.message}`);
    }
  };

  const handleExport = () => {
    const columns = [
      { key: (row) => row.user?.full_name || "", label: "ФИО" },
      { key: "plan", label: "План продаж (TJS)" },
      { key: (row) => row.CardSales?.[0]?.cards_sailed ?? "", label: "Продано карт (шт)" },
      { key: (row) => row.CardSales?.[0]?.cards_sailed_in_general ?? "", label: "Карт за всё время" },
      { key: (row) => row.MobileBank?.[0]?.mobile_bank_connects ?? "", label: "Моб. банк (шт)" },
      { key: "salary_project", label: "ЗП проект (шт)" },
      { key: (row) => row.CardSales?.[0]?.deb_osd ?? "", label: "Оборот по дебету (TJS)" },
      { key: (row) => row.CardSales?.[0]?.out_balance ?? "", label: "Остатки по картам (TJS)" },
      { key: (row) => row.CardTurnovers?.[0]?.active_cards_perms?.toFixed(0) ?? "", label: "Активные карты (шт)" },
      { key: (row) => row.ServiceQuality?.[0]?.call_center ?? "", label: "Оценка КЦ (балл)" },
      { key: (row) => row.ServiceQuality?.[0]?.complaint ?? "", label: "Жалобы (шт)" },
      { key: (row) => row.ServiceQuality?.[0]?.tests ?? "", label: "Тесты (балл)" },
      { key: (row) => calculateTotalPremia(row).toFixed(1), label: "Итого (TJS)" },
    ];
    exportToExcel(allWorkers, columns, `Отчет_Премии_${month}_${year}`);
  };

  if (loading) {
    return (
      <div style={{ transform: "scale(2)", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "100px", width: "auto" }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-table-container" style={{ textAlign: "center", padding: "1rem", color: "red" }}>
        <p>{error}</p>
      </div>
    );
  }

  const renderEditableCell = (record, dataIndex, value, defValue) => {
    const user = record.user || {};
    const isEditing = edit?.user?.ID === user.ID;

    if (isEditing) {
      return (
        <Input
          type="text"
          defValue={defValue}
          onChange={(val) => onChangeEdit(dataIndex, val)}
          value={value}
          onEnter={upDateUserWorkers}
        />
      );
    }
    return defValue;
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions">
        <SearchBar allData={allWorkers} onSearch={handleSearch} />
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      <Table
        dataSource={enhancedWorkers}
        rowKey="ID"
        pagination={false}
        bordered
        onRow={(record, index) => ({
          ref: index === enhancedWorkers.length - 1 ? lastRowRef : null,
          onClick: () => !edit?.user?.ID && setEdit(record),
        })}
        scroll={{ x: "max-content" }}
      >
        <Table.Column
          title="ФИО"
          key="user.full_name"
          render={(_, record) => {
            const user = record.user || {};
            const isEditing = edit?.user?.ID === user.ID;
            if (isEditing) {
              return (
                <Input
                  type="text"
                  defValue={edit?.user?.full_name || user.full_name}
                  onChange={(val) => onChangeEdit("user.full_name", val)}
                  value={edit?.user?.full_name}
                  onEnter={upDateUserWorkers}
                />
              );
            }
            return (
              <div className="fio-cell">
                <span className="fio-text">{user.full_name}</span>
                <button
                  className="download-report-btn"
                  title="Скачать отчет рабочего"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDownloadModal(user);
                  }}
                >
                  <DownloadCloud size={18} />
                </button>
              </div>
            );
          }}
          fixed="left"
        />
        <Table.Column
          title="План продаж (TJS)"
          key="plan"
          render={(_, record) => renderEditableCell(record, "plan", edit?.plan, record.plan)}
        />
        <Table.Column
          title="Продано карт (шт)"
          key="CardSales.0.cards_sailed"
          render={(_, record) => renderEditableCell(record, "CardSales[0].cards_sailed", edit?.CardSales?.[0]?.cards_sailed, record.CardSales?.[0]?.cards_sailed)}
        />
        <Table.Column
          title="Карт за всё время"
          key="CardSales.0.cards_sailed_in_general"
          render={(_, record) => renderEditableCell(record, "CardSales[0].cards_sailed_in_general", edit?.CardSales?.[0]?.cards_sailed_in_general, record.CardSales?.[0]?.cards_sailed_in_general)}
        />
        <Table.Column
          title="Моб. банк (шт)"
          key="MobileBank.0.mobile_bank_connects"
          render={(_, record) => renderEditableCell(record, "MobileBank[0].mobile_bank_connects", edit?.MobileBank?.[0]?.mobile_bank_connects, record.MobileBank?.[0]?.mobile_bank_connects)}
        />
        <Table.Column
          title="ЗП проект (шт)"
          key="salary_project"
          render={(_, record) => renderEditableCell(record, "salary_project", edit?.salary_project, record.salary_project)}
        />
        <Table.Column
          title="Оборот по дебету (TJS)"
          key="CardSales.0.deb_osd"
          render={(_, record) => renderEditableCell(record, "CardSales[0].deb_osd", edit?.CardSales?.[0]?.deb_osd, record.CardSales?.[0]?.deb_osd)}
        />
        <Table.Column
          title="Остатки по картам (TJS)"
          key="CardSales.0.out_balance"
          render={(_, record) => renderEditableCell(record, "CardSales[0].out_balance", edit?.CardSales?.[0]?.out_balance, record.CardSales?.[0]?.out_balance)}
        />
        <Table.Column
          title="Активные карты (шт)"
          key="CardTurnovers.0.active_cards_perms"
          render={(_, record) => renderEditableCell(record, "CardTurnovers[0].active_cards_perms", edit?.CardTurnovers?.[0]?.active_cards_perms, record.CardTurnovers?.[0]?.active_cards_perms?.toFixed(0))}
        />
        <Table.Column
          title="Оценка КЦ (балл)"
          key="ServiceQuality.0.call_center"
          render={(_, record) => renderEditableCell(record, "ServiceQuality[0].call_center", edit?.ServiceQuality?.[0]?.call_center, record.ServiceQuality?.[0]?.call_center)}
        />
        <Table.Column
          title="Жалобы (шт)"
          key="ServiceQuality.0.complaint"
          render={(_, record) => renderEditableCell(record, "ServiceQuality[0].complaint", edit?.ServiceQuality?.[0]?.complaint, record.ServiceQuality?.[0]?.complaint)}
        />
        <Table.Column
          title="Тесты (балл)"
          key="ServiceQuality.0.tests"
          render={(_, record) => renderEditableCell(record, "ServiceQuality[0].tests", edit?.ServiceQuality?.[0]?.tests, record.ServiceQuality?.[0]?.tests)}
        />
        <Table.Column
          title="Итого (TJS)"
          key="totalPremia"
          render={(_, record) => record.totalPremia.toFixed(1)}
        />
      </Table>

      {loadingMore && (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <Spinner />
        </div>
      )}

      <DownloadModal
        show={showDownloadModal}
        user={downloadUser}
        month={downloadMonth}
        year={downloadYear}
        onMonthChange={setDownloadMonth}
        onYearChange={setDownloadYear}
        onDownload={executeDownload}
        onClose={() => setShowDownloadModal(false)}
        monthOptions={monthOptions}
      />
    </div>
  );
};

export default TablePremies;
