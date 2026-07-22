import React from "react";
import * as XLSX from "xlsx";
import "../../../styles/ABSSearch.scss";

const DepositDetails = ({ deposit, onBack }) => {
  const agreement = deposit.AgreementData || {};
  const balances = deposit.BalanceAccounts || [];
  
  // Extract Rates
  const allRates = deposit.SumTypes || deposit.sumTypes || deposit.Rates || deposit.Conditions || agreement.Rates || agreement.Conditions || [];
  const bonusRate = allRates.find(r => r.Code === "DEP_BONUS")?.Pcn || "0";
  const penaltyRate = allRates.find(r => r.Code === "DEP_PNLTY")?.Pcn || "0";
  const taxRate = allRates.find(r => r.Code === "DEP_TAX")?.Pcn || "0";

  // Metadata
  const amount = agreement.Amount || "0.00";
  const currency = agreement.Currency || "TJS";
  const statusName = agreement.Status?.Name || deposit.Status?.Name || "Неизвестно";
  const dateFrom = agreement.DateFrom || deposit.DateFrom || "-";
  const dateTo = agreement.DateTo || deposit.DateTo || "-";
  const clientCode = agreement.DeaClient?.Code || "-";
  const department = agreement.Department?.Code || "Неизвестно";
  const productName = agreement.Product?.Name || agreement.Name || deposit.Name || "Депозит";
  const lockFl = agreement.LockFl || "N";
  const arrestFl = agreement.ArrestFl || "N";

  const termVal = agreement.DepoTermTU;
  const termType = agreement.DepoTermTimeType;
  const termText = termVal ? `${termVal} ${termType === 'M' ? 'мес.' : termType === 'D' ? 'дн.' : termType || ''}` : "-";

  // Calculate Progress (Time Passed)
  let progressPercent = 0;
  if (dateFrom !== "-" && dateTo !== "-") {
    const fromTime = new Date(dateFrom.split('.').reverse().join('-')).getTime() || new Date(dateFrom).getTime();
    const toTime = new Date(dateTo.split('.').reverse().join('-')).getTime() || new Date(dateTo).getTime();
    const now = new Date().getTime();
    
    if (fromTime && toTime && toTime > fromTime) {
      if (now >= toTime) {
        progressPercent = 100;
      } else if (now > fromTime) {
        progressPercent = ((now - fromTime) / (toTime - fromTime)) * 100;
      }
    }
  }

  // Find Deposit Balance
  const depoAcc = balances.find(a => a.RuleCode === "DEPOACC") || {};
  const depoBalance = Number(depoAcc.Balance || 0);

  // Find Income Balance
  const incomeAcc = balances.find(a => a.RuleCode === "CLIACC") || {};
  const incomeBalance = Number(incomeAcc.Balance || 0);

  const handleExportDetails = () => {
    const ws = XLSX.utils.json_to_sheet(balances.map(b => ({
      "Назначение счета": b.RuleCode === "DEPOACC" ? "Основной депозитный счет" : b.RuleCode === "CLIACC" ? "Счет процентов" : b.RuleCode || "",
      "Номер счета": b.AccCode || "",
      "Код NPS": b.Nps || "",
      "Текущий остаток": Number(b.Balance || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 }),
      "Валюта": b.CurrCode || "",
      "Активность": b.ActiveFl === "dt" ? "Дебет" : b.ActiveFl === "ct" ? "Кредит" : b.ActiveFl || ""
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Счета депозита");
    XLSX.writeFile(wb, `Deposit_${agreement.ColvirReferenceId || "Details"}.xlsx`);
  };

  return (
    <div className="deposit-details-container" style={{ width: "100%", animation: "fadeIn 0.3s ease-in-out" }}>
      <button 
        onClick={onBack} 
        style={{ marginBottom: "20px", background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}
      >
        <span>&larr;</span> Назад к депозитам
      </button>

      {/* Top 4 Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Обслуживается</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{department}</div>
        </div>
        <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Сумма договора</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{Number(amount).toLocaleString('ru-RU')} {currency}</div>
        </div>
        <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Ставка вознаграждения</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#27ae60" }}>{bonusRate} %</div>
        </div>
        <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Срок договора</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{termText}</div>
        </div>
      </div>

      {/* Main Info Block */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
            Депозит: {productName}
          </div>
          <span style={{ 
            fontSize: "12px", 
            fontWeight: 600, 
            padding: "4px 8px", 
            borderRadius: "6px", 
            backgroundColor: statusName === "Актуален" ? "rgba(39, 174, 96, 0.1)" : statusName === "Закрыт" ? "rgba(225, 29, 72, 0.1)" : "rgba(245, 158, 11, 0.1)",
            color: statusName === "Актуален" ? "#27ae60" : statusName === "Закрыт" ? "#e11d48" : "#f59e0b"
          }}>
            {statusName}
          </span>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Дата открытия: {dateFrom} | Дата окончания: {dateTo}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Текущий остаток</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{depoBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {currency}</div>
          </div>
        </div>

        {/* Progress Bar: Red (passed), Gray (remaining) */}
        <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", backgroundColor: "#ef4444" }}></div>
        </div>

        {/* Rates and Block Info */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Код клиента</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{clientCode}</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Налог на доход</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{taxRate} %</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>При досрочном расторжении</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#e11d48" }}>{penaltyRate} %</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Ожидаемый доход</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#27ae60" }}>{incomeBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {currency}</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Блокировка / Арест</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: lockFl === "Y" || arrestFl === "Y" ? "#e11d48" : "#0f172a" }}>
              {lockFl === "Y" && arrestFl === "Y" ? "Блок / Арест" : lockFl === "Y" ? "Заблокирован" : arrestFl === "Y" ? "Под арестом" : "Нет"}
            </div>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        
        {/* Deposit Accounts */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Счета депозита</div>
            <button 
              onClick={handleExportDetails}
              style={{ background: "#27ae60", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
            >
              Экспорт в Excel
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "8px 0" }}>Назначение счета</th>
                  <th style={{ padding: "8px 0" }}>Номер счета</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((opt, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 0", color: "#475569" }}>
                      {opt.RuleCode === "DEPOACC" ? "Основной депозитный счет" : opt.RuleCode === "CLIACC" ? "Счет процентов" : opt.RuleCode}
                    </td>
                    <td style={{ padding: "12px 0", fontWeight: "600", color: "#0f172a" }}>{opt.AccCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Balances / Accounts details */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" }}>Остатки депозита</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "8px 0" }}>Код NPS</th>
                  <th style={{ padding: "8px 0" }}>Номер счета</th>
                  <th style={{ padding: "8px 0", textAlign: "right" }}>Текущий остаток</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((bal, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 0", color: "#475569" }}>{bal.Nps}</td>
                    <td style={{ padding: "12px 0", color: "#475569" }}>{bal.AccCode}</td>
                    <td style={{ padding: "12px 0", fontWeight: "600", color: "#0f172a", textAlign: "right" }}>
                      {Number(bal.Balance || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {bal.CurrCode}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DepositDetails;
