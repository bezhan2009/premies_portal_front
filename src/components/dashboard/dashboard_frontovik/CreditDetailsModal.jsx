import React, { useState } from "react";
import Spinner from "../../Spinner.jsx";
import { Table } from "../../table/FlexibleAntTable.jsx";

// Компонент модального окна для деталей кредита
const CreditDetailsModal = ({ isOpen, onClose, data, isLoading }) => {
  const [activeTab, setActiveTab] = useState("params");

  if (!isOpen) return null;

  const renderParams = () => {
    if (!data?.params) return <p className="no-data-msg">Нет данных</p>;
    const params = [
      { label: "Colvir Reference ID", value: data.params.referenceId },
      { label: "Номер договора", value: data.params.contractNumber },
      { label: "Статус", value: data.params.statusName },
      { label: "Продукт", value: data.params.productName },
      { label: "Цель кредита", value: data.params.creditPurpose },
      { label: "Сумма кредита", value: `${data.params.amount} ${data.params.currency}` },
      { label: "Валюта", value: data.params.currency },
      { label: "Дата договора", value: data.params.documentDate },
      { label: "Срок кредита", value: data.params.term },
      { label: "Дата начала", value: data.params.startDate },
      { label: "Дата окончания", value: data.params.endDate },
      { label: "Подразделение", value: data.params.department },
      { label: "Клиент (DEA)", value: data.params.clientDea },
      { label: "Счёт баланса", value: data.params.balanceAccount },
      { label: "Досрочное погашение", value: data.params.earlyRepayment },
      { label: "День месяца для графика", value: data.params.paymentDay },
      { label: "Штраф за просрочку", value: data.params.penalty },
      { label: "Проценты по кредиту", value: data.params.interestRate },
      { label: "Кредитные эксперты", value: data.params.creditExperts },
    ];

    return (
      <div className="params-grid">
        {params.map((p, i) => (
          <div key={i} className="param-item">
            <span className="param-label">{p.label}:</span>
            <span className="param-value">{p.value || "-"}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderBalances = () => {
    if (!data?.balances || !Array.isArray(data.balances))
      return <p className="no-data-msg">Нет данных</p>;
    return (
      <div className="table-responsive">
        <Table dataSource={data.balances} rowKey={(r, i) => i} bordered pagination={false} size="small">
          <Table.Column title="Код" dataIndex="code" />
          <Table.Column title="Название" dataIndex="name" />
          <Table.Column title="Сумма (TJS)" dataIndex="amount" align="right" />
        </Table>
      </div>
    );
  };

  const renderAccounts = () => {
    if (!data?.paymentOptions || !Array.isArray(data.paymentOptions))
      return <p className="no-data-msg">Нет данных</p>;
    return (
      <div className="table-responsive">
        <Table dataSource={data.paymentOptions} rowKey={(r, i) => i} bordered pagination={false} size="small">
          <Table.Column title="Код" dataIndex="code" />
          <Table.Column title="Название" dataIndex="name" />
          <Table.Column title="Номер счёта" dataIndex="account" />
        </Table>
      </div>
    );
  };

  return (
    <div className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}>
      <div className="graph-modal-container details-modal-container">
        <div className="graph-modal-header">
          <h2 className="graph-modal-title">Детали кредита</h2>
          <button className="graph-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === "params" ? "active" : ""}`} onClick={() => setActiveTab("params")}>Параметры кредита</button>
          <button className={`tab-btn ${activeTab === "balances" ? "active" : ""}`} onClick={() => setActiveTab("balances")}>Остатки кредита</button>
          <button className={`tab-btn ${activeTab === "accounts" ? "active" : ""}`} onClick={() => setActiveTab("accounts")}>Счета кредита</button>
        </div>

        <div className="graph-modal-content">
          {isLoading ? (
            <div className="graph-modal-loading">
              <Spinner center />
              <p>Загрузка деталей...</p>
            </div>
          ) : (
            <div className="tab-content" style={{ padding: "16px" }}>
              {activeTab === "params" && renderParams()}
              {activeTab === "balances" && renderBalances()}
              {activeTab === "accounts" && renderAccounts()}
            </div>
          )}
        </div>
        <div className="graph-modal-footer">
          <button className="graph-modal-close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
};

export default CreditDetailsModal;
