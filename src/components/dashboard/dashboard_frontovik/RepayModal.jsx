import React, { useEffect, useState } from "react";
import { fetchLoanDetails } from "../../../api/ABS_frotavik/getLoanDetails";

const RepayModal = ({ isOpen, onClose, onSubmit, isLoading, creditInfo }) => {
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  useEffect(() => {
    if (isOpen && creditInfo?.referenceId) {
      setAmount("");
      setSelectedAccount("");
      setFilteredAccounts([]);

      const fetchAndFilterAccounts = async () => {
        setIsFetchingDetails(true);
        try {
          const details = await fetchLoanDetails(creditInfo.referenceId);
          if (details) {
            const list = [];

            // Фильтруем счета из balanceAccount (аналитические счета)
            if (details.balances) {
              details.balances.forEach((b) => {
                if (b.accCode && b.accCode.startsWith("20216")) {
                  list.push({
                    name: `${b.accCode} (Аналитический)`,
                    value: b.accCode,
                    code: b.code,
                  });
                }
              });
            }

            // Фильтруем счета из paymentOptions
            if (details.paymentOptions) {
              details.paymentOptions.forEach((p) => {
                if (p.account && p.account.startsWith("20216")) {
                  list.push({
                    name: `${p.account} (${p.name || "Счет"})`,
                    value: p.account,
                    code: p.code,
                  });
                }
              });
            }

            // Удаляем дубликаты по номеру счета
            const uniqueList = Array.from(
              new Set(list.map((a) => a.value)),
            ).map((val) => list.find((a) => a.value === val));

            setFilteredAccounts(uniqueList);
          }
        } catch (error) {
          console.error("Ошибка при загрузке счетов для погашения:", error);
        } finally {
          setIsFetchingDetails(false);
        }
      };

      fetchAndFilterAccounts();
    }
  }, [isOpen, creditInfo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !selectedAccount) return;

    // Находим выбранный счет чтобы получить его code (sourceOrdNum)
    const accountObj = filteredAccounts.find(
      (a) => a.value === selectedAccount,
    );

    onSubmit({
      amount: parseFloat(amount),
      sourceOrdNum: accountObj?.code || "1", // Порядковый номер счета
      referenceId: creditInfo.referenceId,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}
    >
      <div
        className="graph-modal-container"
        style={{ height: "auto", maxHeight: "90vh", maxWidth: "500px" }}
      >
        <div className="graph-modal-header">
          <h2 className="graph-modal-title">Погасить кредит</h2>
          <button className="graph-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="graph-modal-content" style={{ padding: "20px" }}>
          <form onSubmit={handleSubmit}>
            <div className="repay-form">
              <div
                className="search-card__select-group"
                style={{ marginBottom: "20px" }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "14px",
                    color: "#666",
                  }}
                >
                  Счет для списания:
                </label>
                {isFetchingDetails ? (
                  <p
                    className="loading-small"
                    style={{ fontSize: "14px", color: "#3498db" }}
                  >
                    Загрузка счетов...
                  </p>
                ) : (
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="search-card__select"
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                    }}
                    required
                  >
                    <option value="">Выберите счет</option>
                    {filteredAccounts.map((acc, idx) => (
                      <option key={idx} value={acc.value}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                )}
                {!isFetchingDetails && filteredAccounts.length === 0 && (
                  <p
                    className="error-text"
                    style={{
                      fontSize: "12px",
                      color: "#e74c3c",
                      marginTop: "5px",
                    }}
                  >
                    Нет подходящих счетов (начинающихся на 20216)
                  </p>
                )}
              </div>

              <div
                className="search-card__input-group"
                style={{ marginBottom: "15px" }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "14px",
                    color: "#666",
                  }}
                >
                  Тип погашения
                </label>
                <input
                  type="text"
                  value="Частично (Основной долг)"
                  className="search-card__input"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    background: "#f9f9f9",
                  }}
                  disabled
                />
              </div>

              <div
                className="search-card__input-group"
                style={{ marginBottom: "15px" }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "14px",
                    color: "#666",
                  }}
                >
                  Сумма
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Введите сумму"
                  className="search-card__input"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                  required
                />
              </div>
            </div>

            <div
              className="graph-modal-footer"
              style={{
                padding: "10px 0 0 0",
                background: "none",
                border: "none",
              }}
            >
              <button
                type="submit"
                className="search-card__button"
                disabled={
                  isLoading || isFetchingDetails || !amount || !selectedAccount
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#2980b9",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {isLoading ? "Обработка..." : "Погасить"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RepayModal;
