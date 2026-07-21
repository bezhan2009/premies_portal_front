import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { getClientDocumentsByINN } from "../../../api/clientsDataFiles/clientsDataFiles.js";
import Select from "../../../components/elements/Select.jsx";
import "../../../styles/components/CustomerDirectory.scss";

const INITIAL_FILTERS = {
  search: "",
  departments: [],
  resident: "",
  overdue: "",
  terror: "",
  complianceScore: "",
};

const readRoles = () => {
  try {
    const value = JSON.parse(localStorage.getItem("role_ids") || "[]");
    return Array.isArray(value) ? value.map(Number) : [];
  } catch {
    return [];
  }
};

const parseJson = (value, fallback = []) => {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const formatDateTime = (value) => {
  if (!value) return "Нет данных";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
  "Content-Type": "application/json",
});

function DetailModal({ customer, onClose, onUpdateScore, onOpenDocuments }) {
  if (!customer) return null;

  const cards = parseJson(customer.cards);
  const accounts = parseJson(customer.accounts);
  const deposits = parseJson(customer.deposits);
  const credits = parseJson(customer.credits);
  const overdueAccounts = parseJson(customer.overdue_accounts);
  const terrorMatch = parseJson(customer.terror_match, null);

  return (
    <div className="customer-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="customer-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="customer-modal__header">
          <div>
            <p>{customer.client_index}</p>
            <h2>{customer.full_name || "Клиент без ФИО"}</h2>
          </div>
          <button className="customer-icon-button" type="button" onClick={onClose} title="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className="customer-detail-grid">
          <div><span>Подразделение</span><strong>{customer.department_code} · {customer.department_name}</strong></div>
          <div><span>ИНН</span><strong>{customer.inn || "Нет данных"}</strong></div>
          <div><span>Телефон</span><strong>{customer.phone || "Нет данных"}</strong></div>
          <div><span>Дата рождения</span><strong>{customer.birth_date || "Нет данных"}</strong></div>
          <div><span>Резидент</span><strong>{customer.is_resident ? "Да" : "Нет"}</strong></div>
          <div><span>Создал</span><strong>{customer.creator_username || "Нет данных"}</strong></div>
          <div><span>Балл комплайнса</span><strong>{customer.compliance_score} / 5</strong></div>
          <div><span>Последняя синхронизация</span><strong>{formatDateTime(customer.last_synced_at)}</strong></div>
        </div>

        <div className="customer-modal__actions">
          <button type="button" onClick={() => onUpdateScore(customer)}><ShieldCheck size={16} />Обновить балл комплайнса</button>
          <button type="button" onClick={() => onOpenDocuments(customer)}><FileText size={16} />Документы</button>
        </div>

        {customer.is_overdue && (
          <section className="customer-detail-section customer-detail-section--danger">
            <h3><AlertTriangle size={17} />Просрочка</h3>
            {overdueAccounts.map((account) => <p key={account.number}>{account.number} · {account.balance}</p>)}
          </section>
        )}

        {terrorMatch && (
          <section className="customer-detail-section customer-detail-section--warning">
            <h3><ShieldCheck size={17} />Совпадение по спискам: {(Number(customer.terror_similarity) * 100).toFixed(1)}%</h3>
            <pre>{JSON.stringify(terrorMatch, null, 2)}</pre>
          </section>
        )}

        <section className="customer-detail-section">
          <h3>Карты ({cards.length})</h3>
          <div className="customer-products-list">
            {cards.length ? cards.map((card, index) => (
              <div key={`${card.cardId || card.CardID || "card"}-${index}`}>
                <strong>{card.type || card.Type || "Карта"}</strong>
                <span>{card.statusName || card.StatusName || card.status || card.Status || "Нет статуса"}</span>
                <small>{card.cardId || card.CardID || ""}</small>
              </div>
            )) : <p>Нет данных</p>}
          </div>
        </section>

        <section className="customer-detail-section">
          <h3>Счета ({accounts.length})</h3>
          <div className="customer-products-list">
            {accounts.length ? accounts.map((account, index) => (
              <div key={`${account.Number || account.number || "account"}-${index}`}>
                <strong>{account.Number || account.number}</strong>
                <span>{account.Currency?.Code || account.currency?.code || account.Currency || ""} · {account.Balance ?? account.balance ?? 0}</span>
              </div>
            )) : <p>Нет данных</p>}
          </div>
        </section>

        <section className="customer-detail-section">
          <h3>Депозиты ({deposits.length})</h3>
          <div className="customer-products-list">
            {deposits.length ? deposits.map((deposit, index) => {
              const agreement = deposit.AgreementData || deposit.agreementData || {};
              const product = agreement.Product || agreement.product || {};
              return <div key={`${agreement.Code || agreement.code || "deposit"}-${index}`}><strong>{product.Name || product.name || "Депозит"}</strong><span>{agreement.Amount || agreement.amount || ""} {agreement.Currency || agreement.currency || ""}</span></div>;
            }) : <p>Нет данных</p>}
          </div>
        </section>

        <section className="customer-detail-section">
          <h3>Кредиты ({credits.length})</h3>
          <div className="customer-products-list">
            {credits.length ? credits.map((credit, index) => <div key={`${credit.contractNumber || "credit"}-${index}`}><strong>{credit.productName || "Кредит"}</strong><span>{credit.statusName || ""} · {credit.amount || ""} {credit.currency || ""}</span></div>) : <p>Нет данных</p>}
          </div>
        </section>
      </section>
    </div>
  );
}

function DocumentsModal({ customer, documents, loading, onClose }) {
  if (!customer) return null;
  return (
    <div className="customer-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="customer-modal customer-modal--narrow" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="customer-modal__header">
          <div><p>{customer.inn || "ИНН отсутствует"}</p><h2>Документы клиента</h2></div>
          <button className="customer-icon-button" type="button" onClick={onClose} title="Закрыть"><X size={18} /></button>
        </header>
        {loading ? <p className="customer-modal__empty">Загрузка документов...</p> : documents.length ? (
          <div className="customer-document-list">
            {documents.map((document, index) => <div key={document.ID || document.id || index}><FileText size={17} /><span>{document.name || document.title || document.file_name || "Документ"}</span></div>)}
          </div>
        ) : <p className="customer-modal__empty">Документы по этому ИНН не найдены.</p>}
      </section>
    </div>
  );
}

export default function CustomerDirectory() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [draftSearch, setDraftSearch] = useState("");
  const [departments, setDepartments] = useState([]);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, limit: 30 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [scoreEditor, setScoreEditor] = useState(null);
  const [scoreValue, setScoreValue] = useState("1");
  const [documentsCustomer, setDocumentsCustomer] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const isOperator = useMemo(() => readRoles().includes(3), []);

  const loadDepartments = useCallback(async () => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/departments`, { headers: authHeaders() });
    if (!response.ok) throw new Error("Не удалось загрузить подразделения");
    const data = await response.json();
    setDepartments(Array.isArray(data) ? data : []);
  }, []);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (filters.search) params.set("search", filters.search);
      if (filters.departments.length) params.set("departments", filters.departments.join(","));
      if (filters.resident) params.set("resident", filters.resident);
      if (filters.overdue) params.set("overdue", filters.overdue);
      if (filters.terror) params.set("terror", filters.terror);
      if (filters.complianceScore) params.set("compliance_score", filters.complianceScore);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers?${params.toString()}`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Не удалось загрузить клиентов");
      setResult(await response.json());
    } catch (requestError) {
      setError(requestError.message || "Ошибка загрузки клиентов");
      setResult({ items: [], total: 0, page, limit: 30 });
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { loadDepartments().catch((requestError) => setError(requestError.message)); }, [loadDepartments]);
  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters((current) => ({ ...current, search: draftSearch.trim() }));
  };

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleDepartment = (code) => updateFilter("departments", filters.departments.includes(code)
    ? filters.departments.filter((item) => item !== code)
    : [...filters.departments, code]);

  const openCustomer = async (clientIndex) => {
    setActionLoading(`detail-${clientIndex}`);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/${encodeURIComponent(clientIndex)}`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Не удалось загрузить данные клиента");
      setSelectedCustomer(await response.json());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionLoading("");
    }
  };

  const refreshCustomer = async (customer) => {
    setActionLoading(`refresh-${customer.client_index}`);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/${encodeURIComponent(customer.client_index)}/refresh`, { method: "POST", headers: authHeaders() });
      if (!response.ok) throw new Error("Не удалось обновить клиента");
      await loadCustomers();
      if (selectedCustomer?.client_index === customer.client_index) await openCustomer(customer.client_index);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionLoading("");
    }
  };

  const openScoreEditor = (customer) => {
    setScoreEditor(customer);
    setScoreValue(String(customer.compliance_score || 1));
  };

  const updateScore = async (event) => {
    event.preventDefault();
    if (!scoreEditor) return;
    const score = Number(scoreValue);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      setError("Балл комплайнса должен быть от 1 до 5");
      return;
    }
    setActionLoading(`score-${scoreEditor.client_index}`);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/${encodeURIComponent(scoreEditor.client_index)}/compliance-score`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify({ compliance_score: score }),
      });
      if (!response.ok) throw new Error("Не удалось обновить балл комплайнса");
      await loadCustomers();
      if (selectedCustomer?.client_index === scoreEditor.client_index) await openCustomer(scoreEditor.client_index);
      setScoreEditor(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionLoading("");
    }
  };

  const openDocuments = async (customer) => {
    setDocumentsCustomer(customer);
    setDocuments([]);
    if (!customer.inn) return;
    setDocumentsLoading(true);
    try {
      const data = await getClientDocumentsByINN(customer.inn);
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      setError("Не удалось загрузить документы клиента");
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/settings`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Не удалось загрузить настройки синхронизации");
      setSettings(await response.json());
      setSettingsOpen(true);
    } catch (requestError) { setError(requestError.message); }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/settings`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(settings) });
      if (!response.ok) throw new Error("Не удалось сохранить настройки");
      setSettingsOpen(false);
    } catch (requestError) { setError(requestError.message); } finally { setSettingsSaving(false); }
  };

  const requestGlobalRefresh = async () => {
    if (!window.confirm("Запустить обновление следующей сбалансированной пачки по всем подразделениям?")) return;
    if (!window.confirm("Подтвердите запуск. Работа выполнится в фоне и не обновляет 200 000 клиентов одним HTTP-запросом.")) return;
    setActionLoading("global-refresh");
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/refresh`, { method: "POST", headers: authHeaders() });
      if (!response.ok) throw new Error("Не удалось запланировать обновление");
    } catch (requestError) { setError(requestError.message); } finally { setActionLoading(""); }
  };

  const totalPages = Math.max(1, Math.ceil((result.total || 0) / (result.limit || 30)));

  return (
    <main className="customer-directory content-page">
      <header className="customer-directory__header">
        <div><p>Единый реестр</p><h1>Клиенты</h1><span>{Number(result.total || 0).toLocaleString("ru-RU")} записей по доступным подразделениям</span></div>
        <div className="customer-directory__header-actions">
          {isOperator && <button type="button" className="customer-button customer-button--secondary" onClick={loadSettings}><Settings2 size={17} />Настройки</button>}
          {isOperator && <button type="button" className="customer-button customer-button--primary" onClick={requestGlobalRefresh} disabled={actionLoading === "global-refresh"}><RefreshCw size={17} className={actionLoading === "global-refresh" ? "customer-spin" : ""} />Обновить данные</button>}
        </div>
      </header>

      <section className="customer-directory__toolbar">
        <form className="customer-search" onSubmit={applySearch}><Search size={18} /><input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="ФИО, ИНН, телефон или индекс клиента" /><button type="submit" title="Найти"><Search size={17} /></button></form>
        <div className="customer-filter-group"><SlidersHorizontal size={17} /><Select className="customer-filter-select" value={filters.resident} onChange={(value) => updateFilter("resident", value)} options={[{ value: "", label: "Все клиенты" }, { value: "true", label: "Резиденты" }, { value: "false", label: "Нерезиденты" }]} /></div>
        <div className="customer-filter-group"><AlertTriangle size={17} /><Select className="customer-filter-select" value={filters.overdue} onChange={(value) => updateFilter("overdue", value)} options={[{ value: "", label: "Любой статус" }, { value: "true", label: "Просрочка" }]} /></div>
        <div className="customer-filter-group"><ShieldCheck size={17} /><Select className="customer-filter-select" value={filters.terror} onChange={(value) => updateFilter("terror", value)} options={[{ value: "", label: "Все проверки" }, { value: "matched", label: "Есть совпадение" }]} /></div>
        <div className="customer-filter-group"><Filter size={17} /><Select className="customer-filter-select" value={filters.complianceScore} onChange={(value) => updateFilter("complianceScore", value)} options={[{ value: "", label: "Все баллы" }, ...[1, 2, 3, 4, 5].map((score) => ({ value: String(score), label: `${score} балл` }))]} /></div>
        <button type="button" className="customer-reset-button" onClick={() => { setFilters(INITIAL_FILTERS); setDraftSearch(""); setPage(1); }} title="Сбросить фильтры"><X size={17} /></button>
      </section>

      <section className="customer-departments" aria-label="Подразделения">
        {departments.map((department) => <button type="button" key={department.department_code} className={filters.departments.includes(department.department_code) ? "active" : ""} onClick={() => toggleDepartment(department.department_code)}>{department.department_code}<span>{department.department_name}</span></button>)}
      </section>

      {error && <div className="customer-directory__error">{error}<button type="button" onClick={() => setError("")} title="Закрыть"><X size={15} /></button></div>}

      <section className="customer-table-wrap">
        <table className="customer-table">
          <thead><tr><th>Клиент</th><th>Подразделение</th><th>Контакты</th><th>Статусы</th><th>Комплайнс</th><th>Синхронизация</th><th>Действия</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="7" className="customer-table__empty">Загрузка клиентов...</td></tr> : result.items?.length ? result.items.map((customer) => (
              <tr key={customer.client_index}>
                <td><strong>{customer.full_name || "Без ФИО"}</strong><span>{customer.client_index}</span><small>{customer.birth_date || "Дата рождения не указана"}</small></td>
                <td><strong>{customer.department_code}</strong><span>{customer.department_name}</span></td>
                <td><strong>{customer.phone || "Телефон не указан"}</strong><span>ИНН: {customer.inn || "нет"}</span><small>{customer.creator_username || "Создатель не указан"}</small></td>
                <td><div className="customer-statuses"><span className={customer.is_resident ? "customer-status customer-status--ok" : "customer-status customer-status--warn"}>{customer.is_resident ? "Резидент" : "Нерезидент"}</span>{customer.is_overdue && <span className="customer-status customer-status--danger">Просрочка</span>}{Number(customer.terror_similarity) > 0 && <span className="customer-status customer-status--danger">Списки {(Number(customer.terror_similarity) * 100).toFixed(0)}%</span>}</div></td>
                <td><strong>{customer.compliance_score} / 5</strong><span>{customer.compliance_score_source === "manual" ? "Вручную" : "По заявке"}</span></td>
                <td><span>{formatDateTime(customer.last_synced_at)}</span></td>
                <td><div className="customer-actions"><button type="button" onClick={() => navigate(`/frontovik/abs-search?clientIndex=${encodeURIComponent(customer.client_index)}`)}><ExternalLink size={15} />Фронтовик</button><button type="button" onClick={() => openCustomer(customer.client_index)} disabled={actionLoading === `detail-${customer.client_index}`}><Eye size={15} />Подробнее</button><button type="button" onClick={() => openScoreEditor(customer)} disabled={actionLoading === `score-${customer.client_index}`}><ShieldCheck size={15} />Обновить балл комплайнса</button><button type="button" onClick={() => refreshCustomer(customer)} disabled={actionLoading === `refresh-${customer.client_index}`}><RefreshCw size={15} />Обновить данные клиента</button><button type="button" onClick={() => openDocuments(customer)}><FileText size={15} />Документы</button><button type="button" onClick={() => navigate(`/agent/applications-list?search=${encodeURIComponent(customer.inn || customer.client_index)}`)}><ClipboardList size={15} />Заявки</button></div></td>
              </tr>
            )) : <tr><td colSpan="7" className="customer-table__empty"><Users size={24} />Клиенты по заданным фильтрам не найдены.</td></tr>}
          </tbody>
        </table>
      </section>

      <footer className="customer-pagination"><span>Показано {result.items?.length || 0} из {Number(result.total || 0).toLocaleString("ru-RU")}</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} title="Предыдущая страница"><ChevronLeft size={18} /></button><strong>{page} / {totalPages}</strong><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} title="Следующая страница"><ChevronRight size={18} /></button></div></footer>

      <DetailModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onUpdateScore={openScoreEditor} onOpenDocuments={openDocuments} />
      <DocumentsModal customer={documentsCustomer} documents={documents} loading={documentsLoading} onClose={() => setDocumentsCustomer(null)} />
      {scoreEditor && <div className="customer-modal-backdrop" role="presentation" onMouseDown={() => setScoreEditor(null)}><form className="customer-modal customer-modal--narrow" onSubmit={updateScore} onMouseDown={(event) => event.stopPropagation()}><header className="customer-modal__header"><div><p>{scoreEditor.client_index}</p><h2>Балл комплайнса</h2></div><button className="customer-icon-button" type="button" onClick={() => setScoreEditor(null)} title="Закрыть"><X size={18} /></button></header><label className="customer-settings-field">Новый балл<input type="number" min="1" max="5" step="1" autoFocus value={scoreValue} onChange={(event) => setScoreValue(event.target.value)} /></label><div className="customer-modal__actions"><button type="button" onClick={() => setScoreEditor(null)}>Отмена</button><button type="submit" className="customer-button customer-button--primary" disabled={actionLoading === `score-${scoreEditor.client_index}`}><ShieldCheck size={16} />Сохранить</button></div></form></div>}
      {settingsOpen && settings && <div className="customer-modal-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}><form className="customer-modal customer-modal--narrow" onSubmit={saveSettings} onMouseDown={(event) => event.stopPropagation()}><header className="customer-modal__header"><div><p>Фоновая задача</p><h2>Настройки синхронизации</h2></div><button className="customer-icon-button" type="button" onClick={() => setSettingsOpen(false)} title="Закрыть"><X size={18} /></button></header><label className="customer-settings-field">Интервал, минут<input type="number" min="1" max="1440" value={settings.interval_minutes} onChange={(event) => setSettings({ ...settings, interval_minutes: Number(event.target.value) })} /></label><label className="customer-settings-field">Клиентов на подразделение<input type="number" min="10" max="100" value={settings.batch_size} onChange={(event) => setSettings({ ...settings, batch_size: Number(event.target.value) })} /></label><label className="customer-settings-field">Параллельных запросов<input type="number" min="1" max="12" value={settings.max_concurrent} onChange={(event) => setSettings({ ...settings, max_concurrent: Number(event.target.value) })} /></label><label className="customer-settings-toggle"><input type="checkbox" checked={Boolean(settings.enabled)} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} />Синхронизация включена</label><button className="customer-button customer-button--primary" type="submit" disabled={settingsSaving}><Settings2 size={17} />Сохранить</button></form></div>}
    </main>
  );
}
