import React, { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Modal, message } from "antd";
import { Copy, CreditCard, Landmark, MapPin } from "lucide-react";

import {
  findPosAccountBalance,
  historyAtmIds,
  selectionState,
} from "./posTerminalUtils.js";

const clientDisplayName = (client) =>
  client?.long_name ||
  [client?.surname, client?.name, client?.patronymic].filter(Boolean).join(" ") ||
  "Клиент";

const formatBalance = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return value || "—";
  return number.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const PosTerminalsTab = ({
  terminals,
  accounts,
  selectedClient,
  onOpenStatement,
  onOpenHistory,
  canOpenStatement,
  canOpenHistory,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedAtmIDs, setSelectedAtmIDs] = useState([]);
  const clientCode = String(selectedClient?.client_code || "");

  useEffect(() => {
    setHistoryOpen(false);
    setSelectedAtmIDs([]);
  }, [clientCode]);

  const allAtmIDs = useMemo(
    () => historyAtmIds(terminals.map((terminal) => terminal.atm_id)),
    [terminals],
  );
  const selectAllState = selectionState(selectedAtmIDs.length, allAtmIDs.length);

  const openHistorySelector = (atmID) => {
    setSelectedAtmIDs(atmID ? [String(atmID)] : []);
    setHistoryOpen(true);
  };

  const toggleATM = (atmID, checked) => {
    const value = String(atmID);
    setSelectedAtmIDs((current) =>
      checked
        ? historyAtmIds([...current, value])
        : current.filter((item) => item !== value),
    );
  };

  const submitHistory = () => {
    const atmIDs = historyAtmIds(selectedAtmIDs);
    if (atmIDs.length === 0) return;
    setHistoryOpen(false);
    onOpenHistory(atmIDs);
  };

  const copyAccount = async (accountNumber) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      message.success("Счёт скопирован");
    } catch {
      message.error("Не удалось скопировать счёт");
    }
  };

  return (
    <div className="tab-pane-fade pos-terminals-pane">
      <div className="tab-pane-header">
        <h3>POS-терминалы клиента</h3>
        <span className="pos-terminals-count">Всего: {terminals.length}</span>
      </div>

      <div className="abs-cards-grid pos-terminals-grid">
        {terminals.map((terminal) => {
          const accountNumber = String(terminal.account_number || "").trim();
          const accountBalance = findPosAccountBalance(accounts, accountNumber);
          return (
            <article className="frontovik-card-ui pos-terminal-card" key={terminal.atm_id}>
              <div className="pos-terminal-card__header">
                <span className="pos-terminal-card__icon" aria-hidden="true">
                  <CreditCard size={30} />
                </span>
                <div>
                  <h4>{clientDisplayName(selectedClient)}</h4>
                  <div className="pos-terminal-card__atm">ATM ID: {terminal.atm_id || "—"}</div>
                </div>
              </div>

              <div className="pos-terminal-card__details">
                <div className="pos-terminal-card__field">
                  <span><Landmark size={17} /> Счёт</span>
                  <div className="pos-terminal-card__account">
                    <strong>{accountNumber || "—"}</strong>
                    {accountNumber && (
                      <button
                        type="button"
                        className="pos-terminal-copy"
                        aria-label={`Скопировать счёт ${accountNumber}`}
                        onClick={() => copyAccount(accountNumber)}
                      >
                        <Copy size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="pos-terminal-card__field">
                  <span>Баланс в АБС</span>
                  <strong className="pos-terminal-card__balance">
                    {accountBalance ? formatBalance(accountBalance.balance) : "—"}
                    {accountBalance?.currency && <em>{accountBalance.currency}</em>}
                  </strong>
                </div>
              </div>

              <div className="pos-terminal-card__address">
                <MapPin size={16} />
                <span>{terminal.address || "—"}</span>
              </div>

              <div className="card-actions-bar pos-terminal-card__actions">
                <button
                  type="button"
                  className="card-action-btn neutral"
                  disabled={!accountNumber || !canOpenStatement}
                  onClick={() => onOpenStatement(accountNumber)}
                >
                  Выписка по счёту
                </button>
                <button
                  type="button"
                  className="card-action-btn neutral"
                  disabled={!canOpenHistory}
                  onClick={() => openHistorySelector(terminal.atm_id)}
                >
                  История операций
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        title="История операций POS-терминалов"
        open={historyOpen}
        onCancel={() => setHistoryOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setHistoryOpen(false)}>
            Отмена
          </Button>,
          <Button
            key="history"
            type="primary"
            disabled={selectedAtmIDs.length === 0}
            onClick={submitHistory}
          >
            Посмотреть историю
          </Button>,
        ]}
        width={720}
        centered
      >
        <div className="pos-history-selector">
          <Checkbox
            checked={selectAllState.checked}
            indeterminate={selectAllState.indeterminate}
            onChange={(event) =>
              setSelectedAtmIDs(event.target.checked ? allAtmIDs : [])
            }
          >
            Выбрать все
          </Checkbox>
          <div className="pos-history-selector__list">
            {terminals.map((terminal) => {
              const atmID = String(terminal.atm_id);
              return (
                <label className="pos-history-selector__row" key={atmID}>
                  <Checkbox
                    checked={selectedAtmIDs.includes(atmID)}
                    onChange={(event) => toggleATM(atmID, event.target.checked)}
                  />
                  <strong>{atmID}</strong>
                  <span><MapPin size={15} /> {terminal.address || "—"}</span>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PosTerminalsTab;
