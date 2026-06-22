import React, { useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import "../../../styles/ABSSearch.scss";
import DynamicDocxButtons from "../../general/DynamicDocxButtons";


const CreditDetails = ({ credit, onBack }) => {
  const details = credit.loanDetails || {};
  const params = details.params || {};
  const balances = details.balances || [];
  const paymentOptions = details.paymentOptions || [];
  const graphs = credit.graphs || [];

  // Metadata
  const amount = params.amount || credit.amount || "0.00";
  const currency = params.currency || credit.currency || "TJS";
  const statusName = params.statusName || credit.statusName || "Неизвестно";
  const interestRate = params.interestRate || "0";
  const penaltyRate = params.penaltyRate || "0";
  const expert = params.expert || "Не указан";
  const clientCode = params.clientDea || "";
  const department = params.department || credit.department || "Неизвестно";
  const term = params.term || "-";
  const startDate = params.startDate || credit.startDate || "-";
  const endDate = params.endDate || credit.endDate || "-";
  const purposeName = params.creditPurpose || "Не указана";

  // Compute Debt Balance
  const debtAccounts = balances.filter(b => b.nps && (String(b.nps).startsWith("1753") || String(b.nps).startsWith("1091")));
  const debtBalance = debtAccounts.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);

  // Compute Progress
  let progressPercent = 0;
  if (startDate !== "-" && endDate !== "-") {
    const fromTime = new Date(startDate.split('.').reverse().join('-')).getTime() || new Date(startDate).getTime();
    const toTime = new Date(endDate.split('.').reverse().join('-')).getTime() || new Date(endDate).getTime();
    const now = new Date().getTime();
    
    if (fromTime && toTime && toTime > fromTime) {
      if (now >= toTime) {
        progressPercent = 100;
      } else if (now > fromTime) {
        progressPercent = ((now - fromTime) / (toTime - fromTime)) * 100;
      }
    }
  }

  // Format Payment Schedule (graphs)
  // Group by PaymentDate
  const scheduleMap = {};
  graphs.forEach(g => {
    const date = g.PaymentDate;
    if (!date) return;
    if (!scheduleMap[date]) {
      scheduleMap[date] = { date, amount: 0, interest: 0, principal: 0, status: g.Status, type: g.Type };
    }
    const amt = Number(g.Amount || 0);
    if (g.Code === "CR_PD") {
      scheduleMap[date].principal += amt;
      scheduleMap[date].amount += amt;
    } else if (g.Code === "CR_INTER") {
      scheduleMap[date].interest += amt;
      scheduleMap[date].amount += amt;
    }
    // Update status if needed
    if (g.Status && g.Status !== "Выплачен") scheduleMap[date].status = g.Status;
  });

  const scheduleList = Object.values(scheduleMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // State for Excel export loading or other UI features if needed
  const [isExporting, setIsExporting] = useState(false);

  const handleExportSchedule = () => {
    const ws = XLSX.utils.json_to_sheet(scheduleList.map(s => ({
      "Дата погашения": s.date,
      "Сумма платежа": s.amount.toFixed(2),
      "Процент": s.interest.toFixed(2),
      "Основной долг": s.principal.toFixed(2),
      "Статус": s.status || "",
      "Тип": s.type === "Рассчитанная" ? "Плановый платеж" : s.type === "Задана вручную" ? "Досрочное погашение" : s.type
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "График платежей");
    XLSX.writeFile(wb, `Schedule_${credit.referenceId || "Credit"}.xlsx`);
  };

  return (
    <div className="credit-details-container" style={{ width: "100%", animation: "fadeIn 0.3s ease-in-out" }}>
      <button 
        onClick={onBack} 
        style={{ marginBottom: "20px", background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}
      >
        <span>&larr;</span> Назад к кредитам
      </button>

      {/* Top 4 Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Обслуживается</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{department}</div>
        </div>
        <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Сумма кредита</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{Number(amount).toLocaleString('ru-RU')} {currency}</div>
        </div>
        <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>% Ставка</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#27ae60" }}>{interestRate} %</div>
        </div>
        <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Срок</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{term} мес</div>
        </div>
      </div>

      {/* Purpose Block */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: "24px" }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" }}>
          Цель кредита: {purposeName}
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Дата открытия: {startDate} | Дата окончания: {endDate}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Остаток задолженности</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{debtBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS</div>
          </div>
        </div>

        <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", backgroundColor: "#e11d48" }}></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Код клиента</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{clientCode}</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Штраф за просрочку</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#e11d48" }}>{penaltyRate} %</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Кредитный эксперт</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{expert}</div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        
        {/* Payment Options */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" }}>Счета кредита</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "8px 0" }}>Название счета</th>
                  <th style={{ padding: "8px 0" }}>Номер счета</th>
                </tr>
              </thead>
              <tbody>
                {paymentOptions.map((opt, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 0", color: "#475569" }}>{opt.name}</td>
                    <td style={{ padding: "12px 0", fontWeight: "600", color: "#0f172a" }}>{opt.account}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Balances */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" }}>Остатки кредита</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "8px 0" }}>Код</th>
                  <th style={{ padding: "8px 0" }}>Название (Счет)</th>
                  <th style={{ padding: "8px 0", textAlign: "right" }}>Сумма TJS</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((bal, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 0", color: "#475569" }}>{bal.nps}</td>
                    <td style={{ padding: "12px 0", color: "#475569" }}>{bal.accCode}</td>
                    <td style={{ padding: "12px 0", fontWeight: "600", color: "#0f172a", textAlign: "right" }}>
                      {Number(bal.balance || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {bal.currCode}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Schedule Table */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Документы и график платежей</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <DynamicDocxButtons
              page="CreditDetails"
              section="Документы и график платежей"
              data={{
                "system.currentDate": format(new Date(), "yyyy-MM-dd"),
                "system.currentTime": format(new Date(), "HH:mm:ss"),
                "system.operatorName": localStorage.getItem("operator_name") || "Оператор",
                "credit.amount": amount,
                "credit.currency": currency,
                "credit.statusName": statusName,
                "credit.interestRate": interestRate,
                "credit.penaltyRate": penaltyRate,
                "credit.expert": expert,
                "credit.clientCode": clientCode,
                "credit.department": department,
                "credit.term": term,
                "credit.startDate": startDate,
                "credit.endDate": endDate,
                "credit.purposeName": purposeName,
                "credit.debtBalance": debtBalance,
              }}
            />
            <button 
              onClick={handleExportSchedule}
              style={{ background: "#27ae60", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}
            >
              Экспорт в Excel
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                <th style={{ padding: "12px 8px" }}>Дата погашения</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Сумма платежа</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Процент</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Основной долг</th>
                <th style={{ padding: "12px 8px" }}>Статус</th>
                <th style={{ padding: "12px 8px" }}>Тип</th>
              </tr>
            </thead>
            <tbody>
              {scheduleList.map((s, i) => {
                const isPaid = s.status === "Выплачен";
                const typeText = s.type === "Рассчитанная" ? "Плановый платеж" : s.type === "Задана вручную" ? "Досрочное погашение" : s.type;
                
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 8px", color: "#0f172a", fontWeight: "600" }}>{s.date?.split(' ')[0]}</td>
                    <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: "700", color: "#0f172a" }}>
                      {s.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right", color: "#475569" }}>
                      {s.interest.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right", color: "#475569" }}>
                      {s.principal.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ 
                        background: isPaid ? "#27ae60" : "#f59e0b", 
                        color: "#fff", 
                        padding: "4px 8px", 
                        borderRadius: "4px", 
                        fontSize: "11px", 
                        fontWeight: "600" 
                      }}>
                        {s.status || "Ожидается"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", color: "#475569" }}>{typeText}</td>
                  </tr>
                );
              })}
              {scheduleList.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>График отсутствует</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CreditDetails;
