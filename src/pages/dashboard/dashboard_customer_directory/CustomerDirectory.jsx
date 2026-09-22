import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Select from "../../../components/elements/Select.jsx";
import { cardExpiry, creditStatus } from "../../../utils/customerProductDetails.js";
import {
  AlertTriangle,
  ArrowUpDown,
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
import "../../../styles/components/CustomerDirectory.scss";
import ComplianceMatches from "../../../components/general/ComplianceMatches.jsx";
import { customerDirectoryQuery } from "../../../utils/customerDirectoryQuery.js";

const INITIAL_FILTERS = {
  search: "",
  departments: [],
  resident: "",
  overdue: "",
  terror: "",
  complianceScore: "",
  creator: "", mobile_bank: "",
  card_status: "", credit_status: "", state_code: "", card_expiry_from: "", card_expiry_to: "",
  client_type: "", has_credit: "", has_deposit: "", card_type: "", phone_length: "", inn_length: "", opened_from: "", opened_to: "", duplicate_phone: "", duplicate_inn: "", duplicate_passport: "", duplicate_name: "",
  sortBy: "created_at",
  sortOrder: "desc",
};

function ChoiceFilter({ label, value, onChange, options = [["true", "Да"], ["false", "Нет"]] }) {
  return <fieldset className="customer-choice"><legend>{label}</legend><div className="customer-segment">{[["", "Все"], ...options].map(([key, title]) => <button type="button" key={key} data-active={key!==''&&value===key} aria-pressed={value === key} onClick={() => onChange(key)}>{title}</button>)}</div></fieldset>;
}

const plainValue = value => value && typeof value === "object" ? value.Code || value.code || value.Name || value.name || "" : value ?? "";
function ProductSummary({ items, kind }) {
  if (!Array.isArray(items) || !items.length) return <span className="customer-muted">Нет</span>;
  const row = (item, index) => {
    const agreement = item.AgreementData || item.agreementData || {};
    const name = kind === "card" ? item.type || item.Type || "Карта" : kind === "account" ? item.Number || item.number : kind === "credit" ? item.productName || item.Product?.Name || "Кредит" : agreement.Product?.Name || agreement.product?.name || "Депозит";
    const detail = kind === "card" ? item.statusName || item.StatusName || item.status || "Статус не указан" : `${plainValue(kind === "account" ? item.Balance ?? item.balance : kind === "credit" ? item.amount : agreement.Amount ?? agreement.amount)} ${plainValue(item.Currency || item.currency || agreement.Currency || agreement.currency)}`;
    return <div className="customer-product-line" key={index}><strong>{name || "—"}</strong><small>{detail}</small>{kind === 'credit' && <small>{creditStatus(item)}</small>}{kind === 'card' && <small>Срок: {cardExpiry(item)}</small>}</div>;
  };
  return <div>{items.slice(0, 2).map(row)}{items.length > 2 && <details><summary>Ещё {items.length - 2}</summary>{items.slice(2).map(row)}</details>}</div>;
}

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
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const formatDateTime = (value) => {
  if (!value) return "Нет данных";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
};
const formatDateOnly = value => /^\d{4}-\d{2}-\d{2}/.test(value || "") ? value.slice(0,10).split('-').reverse().join('.') : value || "Нет данных";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
  "Content-Type": "application/json",
});

const readResponseError = async (response, fallback) => {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || fallback;
  } catch {
    return fallback;
  }
};

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
          <div><span>Номер паспорта</span><strong>{customer.passport_number || "Не загружен"}</strong></div>
          <div><span>Дата рождения</span><strong>{customer.birth_date || "Нет данных"}</strong></div>
          <div><span>Резидент</span><strong>{customer.is_resident ? "Да" : "Нет"}</strong></div>
          <div><span>Создал</span><strong>{customer.creator_full_name || customer.creator_username || "Нет данных"}</strong></div>
          <div><span>Картотека открыта</span><strong>{formatDateOnly(customer.opened_at)}</strong></div>
          <div><span>Клиент изменён</span><strong>{formatDateTime(customer.updated_at)}</strong></div>
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
            <ComplianceMatches value={terrorMatch} />
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
                <span>{plainValue(account.Currency || account.currency)} · {plainValue(account.Balance ?? account.balance ?? 0)}</span>
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
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search")?.trim() || "";
  const [filters, setFilters] = useState(() => ({ ...INITIAL_FILTERS, search: initialSearch }));
  const [appliedFilters,setAppliedFilters] = useState(()=>({...INITIAL_FILTERS,search:initialSearch}));
  const [stats,setStats]=useState(null),[statsLoading,setStatsLoading]=useState(false),[statsError,setStatsError]=useState('');
  const [exporting,setExporting]=useState(false);
  const [exportFile,setExportFile]=useState(null);
  const statsRequest=useRef(null);
  const [draftSearch, setDraftSearch] = useState(initialSearch);
  const [departments, setDepartments] = useState([]);
  const [access, setAccess] = useState(null);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, limit: 30 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
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
  const [notice, setNotice] = useState("");
  const [filterOptions, setFilterOptions] = useState({card_types: [], phone_lengths: [], inn_lengths: []});
  const customerRequest = useRef(null);
  const accessGeneration = useRef(0);
  const isOperator = useMemo(() => readRoles().includes(3), []);
  const clearClientViews = useCallback(() => {
    accessGeneration.current += 1;
    setSelectedCustomer(null);
    setScoreEditor(null);
    setDocumentsCustomer(null);
    setDocuments([]);
    setResult({ items: [], total: 0, page: 1, limit: 30 });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_BACKEND_URL}/client-access/me`, { headers: authHeaders(), signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error("Не удалось проверить ограничения");
        return response.json();
      })
      .then(setAccess)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setAccess({ creator_username: "", failed: true });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const creator = access?.creator_username?.trim();
    if (!creator) return;
    setFilters((current) => current.creator === creator ? current : { ...current, creator });
    setAppliedFilters((current) => current.creator === creator ? current : { ...current, creator });
    setPage(1);
  }, [access?.creator_username]);

  const loadDepartments = useCallback(async () => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/departments`, { headers: authHeaders() });
    if (!response.ok) throw new Error("Не удалось загрузить подразделения");
    const data = await response.json();
    setDepartments(Array.isArray(data) ? data : []);
  }, []);

  const loadCustomers = useCallback(async () => {
    const generation = accessGeneration.current;
    customerRequest.current?.abort();
    const controller = new AbortController();
    customerRequest.current = controller;
    setLoading(true);
    setError("");
    try {
      const params = customerDirectoryQuery(appliedFilters,page);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers?${params.toString()}`, { headers: authHeaders(), signal: controller.signal });
      if (!response.ok) throw new Error(await readResponseError(response, "Не удалось загрузить клиентов"));
      const data = await response.json();
      if (!controller.signal.aborted && generation === accessGeneration.current) setResult(data);
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message || "Ошибка загрузки клиентов");
    } finally {
      if (customerRequest.current === controller) {
        customerRequest.current = null;
        setLoading(false);
      }
    }
  }, [appliedFilters, page]);

  const loadStats=useCallback(async()=>{
    statsRequest.current?.abort();const controller=new AbortController();statsRequest.current=controller;setStatsLoading(true);setStatsError('');
    try{const response=await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/stats?${customerDirectoryQuery(appliedFilters)}`,{headers:authHeaders(),signal:controller.signal});if(!response.ok)throw new Error(await readResponseError(response,'Не удалось загрузить сводку'));const value=await response.json();if(!controller.signal.aborted)setStats(value);}
    catch(error){if(!controller.signal.aborted)setStatsError(error.message);}finally{if(!controller.signal.aborted)setStatsLoading(false);}
  },[appliedFilters]);
  useEffect(()=>{setStats(null);loadStats();return()=>statsRequest.current?.abort();},[loadStats]);
  const exportCustomers=async()=>{
    setExporting(true);setError('');
    try{const selection=customerDirectoryQuery(appliedFilters).toString();const response=await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/export?${selection}`,{headers:authHeaders()});if(!response.ok)throw new Error(await readResponseError(response,'Выгрузка не завершена'));const blob=await response.blob();const url=URL.createObjectURL(blob);const name=`customers-${new Date().toISOString().slice(0,10)}.xlsx`;setExportFile({url,name,selection});const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();}
    catch(error){setError(error.message);}finally{setExporting(false);}
  };
  useEffect(()=>()=>{if(exportFile)URL.revokeObjectURL(exportFile.url);},[exportFile]);

  useEffect(() => { loadDepartments().catch((requestError) => setError(requestError.message)); }, [loadDepartments]);
  useEffect(() => { loadCustomers(); return () => customerRequest.current?.abort(); }, [loadCustomers]);
  useEffect(() => { let active = true; fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/filter-options`, {headers: authHeaders()}).then(async response => { if (!response.ok) throw new Error("Не удалось загрузить варианты фильтров"); return response.json(); }).then(value => {if (active) setFilterOptions(value);}).catch(error => {if (active) setError(error.message);}); return () => { active = false; }; }, []);

  // Keep both the table and durable cursor diagnostics current.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadCustomers();
      loadDepartments().catch(() => {});
    }, 300000);
    return () => clearInterval(interval);
  }, [loadCustomers, loadDepartments]);

  useEffect(() => {
    if (!result.access_expires_at) return undefined;
    const remaining = new Date(result.access_expires_at) - new Date(result.server_time) - 1000;
    const timer = window.setTimeout(() => {
      clearClientViews();
      void loadCustomers();
    }, Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [result.access_expires_at, result.server_time, clearClientViews, loadCustomers]);

  const visibleCodes = [...new Set([
    selectedCustomer?.client_index,
    scoreEditor?.client_index,
    documentsCustomer?.client_index,
  ].filter(Boolean))].join(",");
  useEffect(() => {
    if (!visibleCodes) return undefined;
    let active = true;
    let deadline;
    const clear = () => { if (active) clearClientViews(); };
    const check = async () => {
      try {
        const grants = await Promise.all(visibleCodes.split(",").map(async (code) => {
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/client-access/check?directory=true&client_code=${encodeURIComponent(code)}`, {
            headers: authHeaders(),
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw Error("Доступ к клиенту истёк");
          return response.json();
        }));
        if (!active) return;
        window.clearTimeout(deadline);
        const durations = grants.filter((grant) => grant.expires_at).map((grant) => new Date(grant.expires_at) - new Date(grant.server_time) - 1000);
        if (durations.length) deadline = window.setTimeout(clear, Math.max(0, Math.min(...durations)));
      } catch {
        clear();
      }
    };
    void check();
    const timer = window.setInterval(check, 15000);
    return () => {
      active = false;
      window.clearTimeout(deadline);
      window.clearInterval(timer);
    };
  }, [visibleCodes, clearClientViews]);

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    const next = { ...filters, search: draftSearch.trim(), creator: access?.creator_username || filters.creator };
    setFilters(next);
    setAppliedFilters(next);
  };

  const updateFilter = (key, value) => {
    if (key === "creator" && access?.creator_username) return;
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleDepartment = (code) => updateFilter("departments", filters.departments.includes(code)
    ? filters.departments.filter((item) => item !== code)
    : [...filters.departments, code]);

  const requestClientReadAccess = () => {
    const code = window.prompt("Код клиента для запроса просмотра (например 5000.000001)");
    if (/^\d{4}\.\d{6}$/.test(code || "")) {
      window.dispatchEvent(new CustomEvent("client-read-sanction", { detail: code }));
    }
  };

  const openCustomer = async (clientIndex) => {
    const generation = accessGeneration.current;
    setActionLoading(`detail-${clientIndex}`);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/${encodeURIComponent(clientIndex)}`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Не удалось загрузить данные клиента");
      const data = await response.json();
      if (generation === accessGeneration.current) setSelectedCustomer(data);
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
    const generation = accessGeneration.current;
    setDocumentsCustomer(customer);
    setDocuments([]);
    if (!customer.inn) return;
    setDocumentsLoading(true);
    try {
      const data = await getClientDocumentsByINN(customer.inn);
      if (generation === accessGeneration.current) setDocuments(Array.isArray(data) ? data : []);
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
    setNotice("");
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/refresh`, { method: "POST", headers: authHeaders() });
      if (!response.ok) throw new Error(await readResponseError(response, "Не удалось запланировать обновление"));
      setNotice("Синхронизация продолжена с последней сохранённой позиции. Новые клиенты появятся автоматически.");
      window.setTimeout(() => loadDepartments().catch(() => {}), 1500);
    } catch (requestError) { setError(requestError.message); } finally { setActionLoading(""); }
  };

  const runBulkComplianceCheck = async () => {
    if (!window.confirm("Запустить массовую проверку всех клиентов по базам комплайнса?")) return;
    setActionLoading("bulk-compliance");
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/check-compliance-all`, { method: "POST", headers: authHeaders() });
      if (!response.ok) throw new Error("Не удалось запустить проверку комплайнса");
      setNotice("Проверка комплайнса включена в полное ночное обновление клиентов (18:00–07:00, Душанбе).");
    } catch (requestError) { setError(requestError.message); } finally { setActionLoading(""); }
  };

  const runBulkMobileCheck = async () => {
    if (!window.confirm("Запустить массовую проверку статуса мобильного банка по всем клиентам?")) return;
    setActionLoading("bulk-mobile");
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/check-mobile-all`, { method: "POST", headers: authHeaders() });
      if (!response.ok) throw new Error("Не удалось запустить проверку мобильного банка");
      setNotice("Проверка мобильного банка включена в полное ночное обновление клиентов (18:00–07:00, Душанбе).");
    } catch (requestError) { setError(requestError.message); } finally { setActionLoading(""); }
  };

  const totalPages = Math.max(1, Math.ceil((result.total || 0) / (result.limit || 30)));
  const syncIssues = departments.filter((department) => String(department.last_error || "").trim());
  const pendingFilters=JSON.stringify({...filters,search:draftSearch.trim()})!==JSON.stringify(appliedFilters);
  const statNumber=key=>stats?Number(stats[key]||0).toLocaleString('ru-RU'):'—';
  const creatorOptions = useMemo(() => {
    const options = (filterOptions.creators || []).map((item) => ({ value: item.value, label: `${item.label} (${item.value})` }));
    const fixedCreator = access?.creator_username?.trim();
    if (fixedCreator && !options.some((item) => item.value.toLowerCase() === fixedCreator.toLowerCase())) {
      options.unshift({ value: fixedCreator, label: fixedCreator });
    }
    return [{ value: "", label: "Все сотрудники" }, ...options];
  }, [access?.creator_username, filterOptions.creators]);

  return (
    <main className="customer-directory content-page">
      <header className="customer-directory__header">
        <div>
          <p>Единый реестр</p>
          <h1>Клиенты</h1>
          <span>{Number(result.total || 0).toLocaleString("ru-RU")} записей по доступным подразделениям · <small style={{ color: "#16a34a", fontWeight: "600" }}>Автообновление каждые 5 мин</small></span>
        </div>
        <div className="customer-directory__header-actions">
          <button type="button" className="customer-button customer-button--secondary" onClick={requestClientReadAccess}><Eye size={17} />Запросить просмотр клиента</button>
          <button type="button" className="customer-button customer-button--secondary" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)}><Filter size={17} />{filtersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}</button>
          <button type="button" className="customer-button" disabled={exporting||pendingFilters} onClick={exportCustomers}><FileText size={17}/>{exporting?'Подготовка Excel…':'Выгрузить Excel'}</button>
          {exportFile&&!pendingFilters&&exportFile.selection===customerDirectoryQuery(appliedFilters).toString()&&<a className="customer-button" href={exportFile.url} download={exportFile.name}>Скачать подготовленный Excel</a>}
          {isOperator && <button type="button" className="customer-button customer-button--secondary" onClick={runBulkComplianceCheck} disabled={actionLoading === "bulk-compliance"}><ShieldCheck size={17} className={actionLoading === "bulk-compliance" ? "customer-spin" : ""} />Проверить комплайнс (все)</button>}
          {isOperator && <button type="button" className="customer-button customer-button--secondary" onClick={runBulkMobileCheck} disabled={actionLoading === "bulk-mobile"}><RefreshCw size={17} className={actionLoading === "bulk-mobile" ? "customer-spin" : ""} />Проверить мобильный банк (все)</button>}
          {isOperator && <button type="button" className="customer-button customer-button--secondary" onClick={loadSettings}><Settings2 size={17} />Настройки</button>}
          {isOperator && <button type="button" className="customer-button customer-button--primary" onClick={requestGlobalRefresh} disabled={actionLoading === "global-refresh"}><RefreshCw size={17} className={actionLoading === "global-refresh" ? "customer-spin" : ""} />Обновить данные</button>}
        </div>
      </header>

      <section className="customer-directory__toolbar" data-collapsed={!filtersOpen}>
        <form className="customer-search" onSubmit={applySearch}><Search size={18} /><input aria-label="Поиск по всем полям" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Поиск по всем полям клиента и продуктов" /><button type="submit" title="Найти"><Search size={17} /></button></form>
        <ChoiceFilter label="Резидентство" value={filters.resident} onChange={value => updateFilter("resident", value)} options={[["true", "Резидент"], ["false", "Нерезидент"]]} />
        <ChoiceFilter label="Просрочка по кредиту" value={filters.overdue} onChange={value => updateFilter("overdue", value)} />
        <ChoiceFilter label="Тип клиента" value={filters.client_type} onChange={value => updateFilter("client_type", value)} options={[["individual", "Физлицо"], ["corporate", "Юрлицо"], ["entrepreneur", "ИП"]]} />
        <ChoiceFilter label="Совпадения комплаенса" value={filters.terror} onChange={value => updateFilter("terror", value)} />
        <ChoiceFilter label="Кредит" value={filters.has_credit} onChange={value => updateFilter("has_credit", value)} />
        <ChoiceFilter label="Депозит" value={filters.has_deposit} onChange={value => updateFilter("has_deposit", value)} />
        <ChoiceFilter label="Мобильный банк" value={filters.mobile_bank} onChange={value => updateFilter("mobile_bank", value)} />
        <div className="customer-choice customer-employee-choice" data-active={Boolean(filters.creator)}><label htmlFor="customer-creator">Оформил</label><Select id="customer-creator" searchable autoSelectFirst={false} disabled={!access || access.failed || Boolean(access.creator_username)} value={access?.creator_username || filters.creator || ""} placeholder="Все сотрудники" title={access?.creator_username ? "Фильтр закреплён оператором" : "Фильтр по сотруднику АБС"} onChange={value=>updateFilter('creator',value||'')} options={creatorOptions} style={{width:'100%'}} /></div>
        {[['card_status','Статус карты','card_statuses'],['credit_status','Статус кредита','credit_statuses']].map(([key,label,source])=><label className="customer-choice" key={key} data-active={Boolean(filters[key])}>{label}<select value={filters[key]} onChange={event=>updateFilter(key,event.target.value)}><option value="">Все</option>{(filterOptions[source]||[]).filter(Boolean).map(value=><option key={value}>{value}</option>)}</select></label>)}
        <label className="customer-choice" data-active={Boolean(filters.state_code)}>Статус картотеки<select value={filters.state_code} onChange={event=>updateFilter('state_code',event.target.value)}><option value="">Все</option>{(filterOptions.states||[]).filter(item=>item.value).map(item=><option key={item.value} value={item.value}>{item.label || item.value}</option>)}</select></label>
        {[['card_expiry_from','Срок карты с'],['card_expiry_to','Срок карты по']].map(([key,label])=><label className="customer-choice" key={key} data-active={Boolean(filters[key])}>{label}<input type="date" value={filters[key]} onChange={event=>updateFilter(key,event.target.value)} /></label>)}
        <label className="customer-choice" data-active={Boolean(filters.card_type)}>Тип карты<select value={filters.card_type} onChange={event => updateFilter("card_type", event.target.value)}><option value="">Все</option>{(filterOptions.card_types || []).filter(Boolean).map(value => <option key={value}>{value}</option>)}</select></label>
        {[['phone_length', 'Цифр в телефоне', 'phone_lengths'], ['inn_length', 'Цифр в ИНН', 'inn_lengths']].map(([key, label, source]) => <label className="customer-choice" key={key} data-active={filters[key]!==''}>{label}<select value={filters[key]} onChange={event => updateFilter(key, event.target.value)}><option value="">Все</option>{(filterOptions[source] || []).map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}
        <label className="customer-choice" data-active={Boolean(filters.opened_from)}>Открытие картотеки с<input type="date" value={filters.opened_from} onChange={event => updateFilter("opened_from", event.target.value)} /></label>
        <label className="customer-choice" data-active={Boolean(filters.opened_to)}>по<input type="date" value={filters.opened_to} min={filters.opened_from} onChange={event => updateFilter("opened_to", event.target.value)} /></label>
        <div className="customer-duplicate-filters"><span>Дубли:</span>{[["duplicate_phone", "Телефон"], ["duplicate_inn", "ИНН"], ["duplicate_passport", "Паспорт"], ["duplicate_name", "Полное ФИО"]].map(([key, label]) => <button key={key} type="button" aria-pressed={filters[key] === "true"} onClick={() => updateFilter(key, filters[key] ? "" : "true")}>{label}</button>)}</div>
        <label className="customer-choice" data-active={Boolean(filters.complianceScore)}>Балл комплаенса<select value={filters.complianceScore} onChange={event=>updateFilter('complianceScore',event.target.value)}><option value="">Все баллы</option>{[1,2,3,4,5].map(score=><option key={score} value={score}>{score}</option>)}</select></label>
        <label className="customer-choice" data-active={filters.sortBy!==INITIAL_FILTERS.sortBy}>Сортировка<select value={filters.sortBy} onChange={event=>updateFilter('sortBy',event.target.value)}><option value="created_at">По дате создания</option><option value="updated_at">По дате изменения</option></select></label>
        <label className="customer-choice" data-active={filters.sortOrder!==INITIAL_FILTERS.sortOrder}>Порядок<select value={filters.sortOrder} onChange={event=>updateFilter('sortOrder',event.target.value)}><option value="desc">Сначала новые</option><option value="asc">Сначала старые</option></select></label>
        <div className="customer-filter-footer">
          <button type="button" className="customer-reset-button" onClick={() => { const reset = { ...INITIAL_FILTERS, creator: access?.creator_username || "" }; setFilters(reset); setAppliedFilters(reset); setDraftSearch(""); setPage(1); }}><X size={17}/>Сбросить фильтры</button>
          {pendingFilters&&<span role="status">Фильтры изменены — нажмите «Найти»</span>}
          <button type="button" className="customer-button customer-button--primary" onClick={applySearch}><Search size={17}/>Найти</button>
        </div>
      </section>

      <section className="customer-departments" aria-label="Подразделения" style={!filtersOpen ? {display:'none'} : undefined}>
        {departments.map((department) => <button type="button" key={department.department_code} className={filters.departments.includes(department.department_code) ? "active" : ""} onClick={() => toggleDepartment(department.department_code)} title={department.last_error || `Следующий индекс: ${department.department_code}.${String(department.next_sequence || 0).padStart(6, "0")}`}>{department.department_code}<span>{department.department_name}</span></button>)}
      </section>

      <section className="customer-overview" aria-label="Сводка по выбранным клиентам" aria-busy={statsLoading}>
        <header><span>По всей применённой выборке{statsLoading?' · Обновление…':''}</span><button type="button" className="customer-button" onClick={loadStats} disabled={statsLoading}>Обновить сводку</button></header>
        {statsError?<p role="alert">{statsError}</p>:<div className="customer-overview-grid">
          <article><Users size={22}/><span>Всего клиентов</span><strong>{statNumber('customers')}</strong><small>Резиденты: {statNumber('residents')} · Нерезиденты: {statNumber('nonresidents')}</small></article>
          <article><FileText size={22}/><span>Всего карт</span><strong>{statNumber('cards')}</strong><small>Корти Милли: {statNumber('korti_milli')} · VISA: {statNumber('visa')} · MC: {statNumber('mc')}{stats?.other_cards>0?` · Другие: ${statNumber('other_cards')}`:''}</small></article>
          <article><ShieldCheck size={22}/><span>Совпадения комплаенса</span><strong>{statNumber('compliance_matches')}</strong><small>Клиентов с совпадением / в чёрном списке</small></article>
          <article><AlertTriangle size={22}/><span>Просрочка по кредитам</span><strong>{statNumber('overdue_customers')}</strong><small>Клиентов с просроченными счетами</small></article>
          <article><ClipboardList size={22}/><span>Депозитов / кредитов</span><strong>{statNumber('deposits')} / {statNumber('credits')}</strong><small>Количество продуктов</small></article>
        </div>}
      </section>

      {notice && <div className="customer-directory__notice">{notice}<button type="button" onClick={() => setNotice("")} title="Закрыть"><X size={15} /></button></div>}
      {error && <div className="customer-directory__error">{error}<button type="button" onClick={() => setError("")} title="Закрыть"><X size={15} /></button></div>}
      {filters.duplicate_passport === 'true' && <p className="customer-directory__notice">Дубли паспортов проверяются по уже загруженным номерам. Паспортные данные старых записей пополняются при ночном обновлении; отсутствие результатов до завершения обхода не означает отсутствие дублей во всей АБС.</p>}
      {syncIssues.length > 0 && (
        <section className="customer-sync-errors" aria-live="polite">
          <header><AlertTriangle size={17} /><strong>Синхронизация остановлена в {syncIssues.length} подразделении(ях)</strong></header>
          {syncIssues.map((department) => (
            <div key={department.department_code}>
              <strong>{department.department_code} · {department.last_client_code || "позиция не сохранена"}</strong>
              <span>{department.last_error}</span>
            </div>
          ))}
        </section>
      )}

      <section className={`customer-table-wrap${loading && result.items?.length ? " customer-table-wrap--loading" : ""}`} aria-busy={loading}>
        {loading && result.items?.length > 0 && <div className="customer-table-loading">Обновление списка…</div>}
        <table className="customer-table">
          <thead>
            <tr>
              <th>ФИО, ИНН, Телефон, Резидент</th>
              <th>Офис, Кто открыл</th>
              <th>Карты</th>
              <th>Кредиты</th>
              <th>Депозиты</th>
              <th>Счета</th>
              <th>Мобильный банк</th>
              <th>Совпадение по базе комплайнс</th>
              <th>Просрочка</th>
              <th>Создан / изменён</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading && !result.items?.length ? <tr><td colSpan="11" className="customer-table__empty">Загрузка клиентов...</td></tr> : result.items?.length ? result.items.map((customer) => {
              const cards = parseJson(customer.cards);
              const credits = parseJson(customer.credits);
              const deposits = parseJson(customer.deposits);
              const accounts = parseJson(customer.accounts);
              const hasMatch = Number(customer.terror_similarity) > 0 || customer.blacklisted;
              const terrorMatch = parseJson(customer.terror_match, null);
              const dbName = terrorMatch?.target?.source || terrorMatch?.source || terrorMatch?.list_name || terrorMatch?.source_name || "Перечень террористов/экстремистов";

              return (
                <tr key={customer.client_index}>
                  <td>
                    <strong>{customer.full_name || "Без ФИО"}</strong>
                    <span className="customer-badge">{customer.client_type === "individual" ? "Физлицо" : customer.client_type === "corporate" ? "Юрлицо" : customer.client_type === "entrepreneur" ? "ИП" : "Тип не указан"}</span>
                    <small>{customer.state_name || customer.state_code || "Статус картотеки не указан"}</small>
                    <span>{customer.client_index}</span>
                    <span>ИНН: {customer.inn || "не указан"}</span>
                    <span>Тел: {customer.phone || "не указан"}</span>
                    {customer.passport_number && <small>Паспорт: {customer.passport_number}</small>}
                    <small style={{ marginTop: "4px", display: "inline-block" }}>
                      <span className={customer.is_resident ? "customer-status customer-status--ok" : "customer-status customer-status--warn"}>
                        {customer.is_resident ? "Резидент" : "Нерезидент"}
                      </span>
                    </small>
                  </td>
                  <td>
                    <strong>{customer.department_code}</strong>
                    <span>{customer.department_name}</span>
                    <small style={{ marginTop: "4px", display: "block" }}>
                      Открыл: {customer.creator_full_name || customer.creator_username || "не указан"}
                    </small>
                  </td>
                  <td>
                    <ProductSummary items={cards} kind="card" />
                  </td>
                  <td>
                    <ProductSummary items={credits} kind="credit" />
                  </td>
                  <td>
                    <ProductSummary items={deposits} kind="deposit" />
                  </td>
                  <td>
                    <ProductSummary items={accounts} kind="account" />
                  </td>
                  <td>
                    <span className={customer.is_mobile_app_registered ? "customer-status customer-status--ok" : "customer-status customer-status--danger"}>
                      {customer.is_mobile_app_registered ? "Есть" : "Нет"}
                    </span>
                  </td>
                  <td>
                    <span className={hasMatch ? "customer-status customer-status--danger" : "customer-status customer-status--ok"}>
                      {hasMatch ? "Есть" : customer.terror_checked_at ? "Нет" : "Не проверен"}
                    </span>
                    {hasMatch && (
                      <small style={{ display: "block", marginTop: "4px", color: "#dc2626", fontWeight: "600" }}>
                        {customer.blacklisted ? "Чёрный список комплаенса" : `${(Number(customer.terror_similarity) * 100).toFixed(0)}% (${dbName})`}
                      </small>
                    )}
                  </td>
                  <td>
                    <span className={customer.is_overdue ? "customer-status customer-status--danger" : "customer-status customer-status--ok"}>
                      {customer.is_overdue ? "Есть" : "Нет"}
                    </span>
                  </td>
                  <td className="customer-date-cell">
                    <span><b>Картотека:</b> {formatDateOnly(customer.opened_at)}</span>
                    <span><b>Создан:</b> {formatDateTime(customer.created_at)}</span>
                    <span><b>Изменён:</b> {formatDateTime(customer.updated_at)}</span>
                  </td>
                  <td>
                    <div className="customer-actions">
                      <button type="button" onClick={() => navigate(`/frontovik/abs-search?clientIndex=${encodeURIComponent(customer.client_index)}`)}><ExternalLink size={15} />Фронтовик</button>
                      <button type="button" onClick={() => openCustomer(customer.client_index)} disabled={actionLoading === `detail-${customer.client_index}`}><Eye size={15} />Подробнее</button>
                      <button type="button" onClick={() => openScoreEditor(customer)} disabled={actionLoading === `score-${customer.client_index}`}><ShieldCheck size={15} />Обновить балл</button>
                      <button type="button" onClick={() => refreshCustomer(customer)} disabled={actionLoading === `refresh-${customer.client_index}`}><RefreshCw size={15} />Обновить данные клиента</button>
                      <button type="button" onClick={() => openDocuments(customer)}><FileText size={15} />Документы</button>
                      <button type="button" onClick={() => navigate(`/agent/applications-list?search=${encodeURIComponent(customer.inn || customer.client_index)}`)}><ClipboardList size={15} />Заявки</button>
                    </div>
                  </td>
                </tr>
              );
            }) : <tr><td colSpan="11" className="customer-table__empty"><Users size={24} />Клиенты по заданным фильтрам не найдены.</td></tr>}
          </tbody>
        </table>
      </section>

      <footer className="customer-pagination"><span>Показано {result.items?.length || 0} из {Number(result.total || 0).toLocaleString("ru-RU")}</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} title="Предыдущая страница"><ChevronLeft size={18} /></button><strong>{page} / {totalPages}</strong><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} title="Следующая страница"><ChevronRight size={18} /></button></div></footer>

      <DetailModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onUpdateScore={openScoreEditor} onOpenDocuments={openDocuments} />
      <DocumentsModal customer={documentsCustomer} documents={documents} loading={documentsLoading} onClose={() => setDocumentsCustomer(null)} />
      {scoreEditor && <div className="customer-modal-backdrop" role="presentation" onMouseDown={() => setScoreEditor(null)}><form className="customer-modal customer-modal--narrow" onSubmit={updateScore} onMouseDown={(event) => event.stopPropagation()}><header className="customer-modal__header"><div><p>{scoreEditor.client_index}</p><h2>Балл комплайнса</h2></div><button className="customer-icon-button" type="button" onClick={() => setScoreEditor(null)} title="Закрыть"><X size={18} /></button></header><label className="customer-settings-field">Новый балл<input type="number" min="1" max="5" step="1" autoFocus value={scoreValue} onChange={(event) => setScoreValue(event.target.value)} /></label><div className="customer-modal__actions"><button type="button" onClick={() => setScoreEditor(null)}>Отмена</button><button type="submit" className="customer-button customer-button--primary" disabled={actionLoading === `score-${scoreEditor.client_index}`}><ShieldCheck size={16} />Сохранить</button></div></form></div>}
      {settingsOpen && settings && <div className="customer-modal-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}><form className="customer-modal customer-modal--narrow" onSubmit={saveSettings} onMouseDown={(event) => event.stopPropagation()}><header className="customer-modal__header"><div><p>Фоновая задача</p><h2>Настройки синхронизации</h2></div><button className="customer-icon-button" type="button" onClick={() => setSettingsOpen(false)} title="Закрыть"><X size={18} /></button></header>
        <p>Новые клиенты: следующий номер каждого офиса раз в минуту, понедельник–пятница с 08:00 до 17:00 (Душанбе). Вне этого времени проверка новых номеров не запускается. При ошибках сервисов повтор откладывается.</p>
        <p>Обновление существующих: 18:00–07:00 (Душанбе), с пятницы 18:00 до понедельника 07:00 — непрерывно. Сначала обновляются самые старые записи. Скорость ограничена на сервере АБС.</p>
        <label className="customer-settings-field">Фоновых обработчиков<input type="number" min="1" max="4" value={settings.refresh_workers ?? 2} onChange={event => setSettings({...settings, refresh_workers: Number(event.target.value)})} /></label>
        <label className="customer-settings-toggle"><input type="checkbox" checked={Boolean(settings.refresh_enabled)} onChange={event => setSettings({...settings, refresh_enabled: event.target.checked})} />Ночное обновление существующих клиентов</label>
        <label className="customer-settings-toggle"><input type="checkbox" checked={Boolean(settings.enabled)} onChange={event => setSettings({...settings, enabled: event.target.checked})} />Синхронизация включена</label>
        {settings.last_error && <p role="alert">Последняя ошибка: {settings.last_error}</p>}
        <button className="customer-button customer-button--primary" type="submit" disabled={settingsSaving}><Settings2 size={17} />Сохранить</button></form></div>}
    </main>
  );
}
