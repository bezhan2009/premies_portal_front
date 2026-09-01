import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import {
  normalizeDocxVariants,
  sanitizeDocxFileName,
} from "../../../utils/docxTemplateHelpers";
import { getVariantDynamicRequirements } from "../../../utils/docxApiRequirements";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";
const STORAGE_DB_NAME = "activ-daily-student-certificates";
const STORAGE_DB_VERSION = 1;
const STORAGE_STORE_NAME = "bulk-state";
const STORAGE_STATE_KEY = "latest";

const CARD_ID_HEADER_ALIASES = new Set([
  "cardid",
  "card_id",
  "card id",
  "card-id",
  "idn",
  "id карты",
  "idn карты",
  "айди карты",
  "ид карты",
  "номер карты",
]);

const normalizeCell = (value) => String(value ?? "").trim();

const normalizeHeader = (value) =>
  normalizeCell(value)
    .replace(/\u0441/g, "c")
    .replace(/\u0421/g, "c")
    .toLowerCase()
    .replace(/\s+/g, " ");

const createRow = (cardId, sourceRow) => ({
  id: `${cardId}-${sourceRow}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  cardId,
  sourceRow,
  status: "pending",
  message: "Ожидает генерации",
  documentName: "",
  documentUrl: "",
  documentBlob: null,
});

const openStorageDB = () =>
  new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB недоступен в этом браузере"));
      return;
    }

    const request = window.indexedDB.open(STORAGE_DB_NAME, STORAGE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORAGE_STORE_NAME)) {
        db.createObjectStore(STORAGE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Не удалось открыть IndexedDB"));
  });

const withStorageStore = async (mode, callback) => {
  const db = await openStorageDB();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORAGE_STORE_NAME, mode);
      const store = transaction.objectStore(STORAGE_STORE_NAME);
      const request = callback(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Ошибка IndexedDB"));
      transaction.onerror = () => reject(transaction.error || new Error("Ошибка транзакции IndexedDB"));
    });
  } finally {
    db.close();
  }
};

const savePersistentState = (state) =>
  withStorageStore("readwrite", (store) =>
    store.put({
      id: STORAGE_STATE_KEY,
      updatedAt: new Date().toISOString(),
      ...state,
    }),
  );

const loadPersistentState = () =>
  withStorageStore("readonly", (store) => store.get(STORAGE_STATE_KEY));

const rowForStorage = (row) => {
  const { documentUrl, ...storedRow } = row;
  return {
    ...storedRow,
    status: row.status === "loading" ? "pending" : row.status,
    message: row.status === "loading" ? "Ожидает генерации" : row.message,
  };
};

const getTemplateId = (template) => template?.ID || template?.id;

const getTemplateName = (template) =>
  template?.name || template?.Name || template?.title || template?.Title || "Шаблон";

const templateMatchesStudentCertificate = (template) => {
  const searchable = [
    template?.name,
    template?.Name,
    template?.description,
    template?.Description,
    template?.mobileDocumentType,
    template?.MobileDocumentType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes("студент") || searchable.includes("student");
};

const pickDefaultTemplate = (templates) =>
  templates.find(templateMatchesStudentCertificate) ||
  templates.find((template) => getTemplateName(template).toLowerCase().includes("справка")) ||
  templates[0] ||
  null;

const buildGenerationPayload = (template, variant, cardId) => {
  const requirements = getVariantDynamicRequirements(variant);
  const hasCardRequirement = requirements.some((requirement) => requirement.source === "card");
  const effectiveRequirements = hasCardRequirement
    ? requirements
    : [
        ...requirements,
        {
          source: "card",
          fields: [
            {
              key: "cardId",
              dataAliases: ["cardId", "card.cardId", "card.idn", "cardIdn", "idn"],
            },
          ],
        },
      ];

  const payload = {
    format: "pdf",
    templateId: getTemplateId(template),
    templatePath: variant?.templatePath || "",
    documentType: template?.mobileDocumentType || template?.MobileDocumentType || "",
    language: variant?.language || "ru",
    variantName: variant?.name || "",
    cardId,
    cardIdn: cardId,
    idn: cardId,
    data: {
      cardId,
      cardIdn: cardId,
      idn: cardId,
      "card.cardId": cardId,
      "card.idn": cardId,
    },
  };

  effectiveRequirements.forEach((requirement) => {
    requirement.fields?.forEach((field) => {
      if (!Array.isArray(field.dataAliases)) {
        return;
      }
      field.dataAliases.forEach((alias) => {
        payload.data[alias] = cardId;
      });
    });
  });

  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") {
      delete payload[key];
    }
  });

  return payload;
};

const getErrorMessage = async (error) => {
  if (error?.response?.data instanceof Blob) {
    try {
      const raw = await error.response.data.text();
      const parsed = JSON.parse(raw);
      return parsed.error || parsed.message || raw || "Ошибка генерации";
    } catch (_) {
      return "Ошибка генерации";
    }
  }

  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "Ошибка генерации"
  );
};

const extractCardIdsFromWorkbook = (workbook) => {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("В файле не найдено ни одного листа");
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  });

  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => CARD_ID_HEADER_ALIASES.has(normalizeHeader(cell))),
  );

  let cardIdColumnIndex = -1;
  let startRowIndex = 0;

  if (headerRowIndex >= 0) {
    cardIdColumnIndex = rows[headerRowIndex].findIndex((cell) =>
      CARD_ID_HEADER_ALIASES.has(normalizeHeader(cell)),
    );
    startRowIndex = headerRowIndex + 1;
  } else {
    const candidateColumns = new Map();
    rows.forEach((row) => {
      row.forEach((cell, index) => {
        const value = normalizeCell(cell);
        if (/^\d{6,}$/.test(value)) {
          candidateColumns.set(index, (candidateColumns.get(index) || 0) + 1);
        }
      });
    });
    cardIdColumnIndex = [...candidateColumns.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1;
  }

  if (cardIdColumnIndex < 0) {
    throw new Error("Не нашёл колонку cardid. Проверьте, что в Excel есть заголовок cardid или IDN карты.");
  }

  const seen = new Set();
  const duplicates = new Set();
  const cardIds = [];

  rows.slice(startRowIndex).forEach((row, offset) => {
    const value = normalizeCell(row[cardIdColumnIndex]).replace(/[^\dA-Za-z._-]/g, "");
    if (!value) {
      return;
    }
    if (seen.has(value)) {
      duplicates.add(value);
      return;
    }
    seen.add(value);
    cardIds.push({ cardId: value, sourceRow: startRowIndex + offset + 1 });
  });

  return { cardIds, duplicates: [...duplicates] };
};

export default function StudentCertificatesBulkPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [parseMessage, setParseMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      setTemplateError("");
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        const response = await axios.get(`${API_URL}/api/docx/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const nextTemplates = Array.isArray(response.data) ? response.data : [];
        setTemplates(nextTemplates);
        const defaultTemplate = pickDefaultTemplate(nextTemplates);
        setSelectedTemplateId((current) =>
          current || (defaultTemplate ? String(getTemplateId(defaultTemplate)) : ""),
        );
      } catch (error) {
        console.error(error);
        setTemplateError("Не удалось загрузить список шаблонов генератора DOCX");
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const saved = await loadPersistentState();
        if (!saved) {
          setIsStorageReady(true);
          return;
        }

        const restoredRows = (Array.isArray(saved.rows) ? saved.rows : []).map((row) => {
          const documentBlob = row.documentBlob instanceof Blob ? row.documentBlob : null;
          const documentUrl = documentBlob ? window.URL.createObjectURL(documentBlob) : "";
          if (documentUrl) {
            objectUrlsRef.current.push(documentUrl);
          }
          return {
            ...row,
            status: row.status === "loading" ? "pending" : row.status || "pending",
            message: row.status === "loading" ? "Ожидает генерации" : row.message || "Ожидает генерации",
            documentBlob,
            documentUrl,
          };
        });

        setRows(restoredRows);
        if (saved.selectedTemplateId) {
          setSelectedTemplateId(saved.selectedTemplateId);
        }
        setSelectedVariantIndex(Number(saved.selectedVariantIndex || 0));
        if (restoredRows.length > 0) {
          setStorageMessage(`Восстановлено сохранённых строк: ${restoredRows.length}`);
        }
      } catch (error) {
        console.error(error);
        setStorageMessage("Не удалось восстановить сохранённые PDF из браузера");
      } finally {
        setIsStorageReady(true);
      }
    };

    restoreState();
  }, []);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    savePersistentState({
      selectedTemplateId,
      selectedVariantIndex,
      rows: rows.map(rowForStorage),
    }).catch((error) => {
      console.error(error);
      setStorageMessage("Не удалось сохранить PDF в браузере. Возможно, закончилось место.");
    });
  }, [isStorageReady, rows, selectedTemplateId, selectedVariantIndex]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => window.URL.revokeObjectURL(url));
    };
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => String(getTemplateId(template)) === selectedTemplateId) || null,
    [selectedTemplateId, templates],
  );

  const variants = useMemo(
    () => normalizeDocxVariants(selectedTemplate?.variants || selectedTemplate?.Variants),
    [selectedTemplate],
  );

  const selectedVariant = variants[selectedVariantIndex] || variants[0] || null;
  const generatedCount = rows.filter((row) => row.status === "success" && row.documentUrl).length;
  const failedCount = rows.filter((row) => row.status === "error").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;

  const handleUploadFile = async () => {
    if (!file) {
      setParseMessage("Выберите Excel-файл");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const { cardIds, duplicates } = extractCardIdsFromWorkbook(workbook);

      objectUrlsRef.current.forEach((url) => window.URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
      setRows(cardIds.map((item) => createRow(item.cardId, item.sourceRow)));
      setProgress({ done: 0, total: 0 });
      setParseMessage(
        `Загружено cardid: ${cardIds.length}${duplicates.length ? `. Дубликаты пропущены: ${duplicates.length}` : ""}`,
      );
    } catch (error) {
      console.error(error);
      setRows([]);
      setParseMessage(error.message || "Не удалось прочитать Excel-файл");
    }
  };

  const updateRow = (id, patch) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const generateForRow = async (row, { force = false } = {}) => {
    if (!selectedTemplate || !selectedVariant) {
      throw new Error("Выберите шаблон и вариант справки");
    }

    if (!force && row.status === "success" && row.documentUrl) {
      return row;
    }

    updateRow(row.id, { status: "loading", message: "Генерация PDF..." });

    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    const payload = buildGenerationPayload(selectedTemplate, selectedVariant, row.cardId);

    try {
      const response = await axios.post(`${API_URL}/api/docx/external/generate`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        responseType: "blob",
        timeout: 60000,
      });

      const documentBlob = new Blob([response.data], { type: "application/pdf" });
      const documentUrl = window.URL.createObjectURL(documentBlob);
      objectUrlsRef.current.push(documentUrl);
      const documentName = `${sanitizeDocxFileName(
        selectedVariant.outputFileName || getTemplateName(selectedTemplate),
        "spravka_student",
      )}_${row.cardId}.pdf`;

      updateRow(row.id, {
        status: "success",
        message: "PDF готов",
        documentName,
        documentUrl,
        documentBlob,
      });

      return { ...row, status: "success", documentName, documentUrl, documentBlob };
    } catch (error) {
      console.error(error);
      const message = await getErrorMessage(error);
      updateRow(row.id, {
        status: "error",
        message,
      });
      return { ...row, status: "error", message };
    }
  };

  const handleGenerateAll = async () => {
    if (rows.length === 0) {
      setParseMessage("Сначала загрузите Excel-файл с колонкой cardid");
      return;
    }
    if (!selectedTemplate || !selectedVariant) {
      setTemplateError("Выберите шаблон и вариант справки для студентов");
      return;
    }

    setIsGenerating(true);
    setProgress({ done: 0, total: rows.length });

    for (const row of rows) {
      await generateForRow(row);
      setProgress((current) => ({ ...current, done: current.done + 1 }));
    }

    setIsGenerating(false);
  };

  const handleRegenerate = async (row) => {
    setIsGenerating(true);
    setProgress({ done: 0, total: 1 });
    await generateForRow(row, { force: true });
    setProgress({ done: 1, total: 1 });
    setIsGenerating(false);
  };

  const handleDownload = (row) => {
    if (!row.documentUrl) return;
    const link = document.createElement("a");
    link.href = row.documentUrl;
    link.download = row.documentName || `spravka_student_${row.cardId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const revokeDocumentUrl = (documentUrl) => {
    if (!documentUrl) {
      return;
    }
    window.URL.revokeObjectURL(documentUrl);
    objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== documentUrl);
  };

  const handleDeleteDocument = (row) => {
    if (!row.documentUrl && !row.documentBlob) {
      return;
    }
    const confirmed = window.confirm(`Удалить PDF для cardid ${row.cardId}?`);
    if (!confirmed) {
      return;
    }
    revokeDocumentUrl(row.documentUrl);
    updateRow(row.id, {
      status: "pending",
      message: "PDF удалён. Можно получить заново",
      documentName: "",
      documentUrl: "",
      documentBlob: null,
    });
  };

  const handleDeleteAllDocuments = () => {
    if (generatedCount === 0) {
      return;
    }
    const confirmed = window.confirm(`Удалить все готовые PDF (${generatedCount})? Строки cardid останутся в таблице.`);
    if (!confirmed) {
      return;
    }
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (!row.documentUrl && !row.documentBlob) {
          return row;
        }
        revokeDocumentUrl(row.documentUrl);
        return {
          ...row,
          status: "pending",
          message: "PDF удалён. Можно получить заново",
          documentName: "",
          documentUrl: "",
          documentBlob: null,
        };
      }),
    );
  };

  const handleClearTable = () => {
    if (rows.length === 0) {
      return;
    }
    const confirmed = window.confirm("Очистить всю таблицу и удалить сохранённые PDF?");
    if (!confirmed) {
      return;
    }
    objectUrlsRef.current.forEach((url) => window.URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setRows([]);
    setProgress({ done: 0, total: 0 });
    setParseMessage("Таблица очищена");
  };

  const handlePrintOne = (row) => {
    if (!row.documentUrl) return;
    const printWindow = window.open(row.documentUrl, "_blank");
    if (!printWindow) {
      alert("Браузер заблокировал окно печати. Разрешите всплывающие окна и попробуйте снова.");
      return;
    }
    printWindow.addEventListener?.("load", () => {
      printWindow.focus();
      printWindow.print();
    });
  };

  const handlePrintAll = () => {
    const readyRows = rows.filter((row) => row.status === "success" && row.documentUrl);
    if (readyRows.length === 0) {
      alert("Нет готовых PDF для печати");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Браузер заблокировал окно печати. Разрешите всплывающие окна и попробуйте снова.");
      return;
    }

    const docsJson = JSON.stringify(
      readyRows.map((row) => ({
        cardId: row.cardId,
        name: row.documentName || `spravka_student_${row.cardId}.pdf`,
        url: row.documentUrl,
      })),
    ).replace(/<\/script/gi, "<\\/script");

    printWindow.document.write(`<!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <title>Массовая печать справок</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            button { border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; font-weight: 700; }
            .primary { background: #E31E24; color: #fff; }
            .muted { color: #6b7280; }
            li { margin: 10px 0; }
            a { color: #E31E24; }
            iframe { position: fixed; right: 0; bottom: 0; width: 1px; height: 1px; opacity: 0; border: 0; }
          </style>
        </head>
        <body>
          <h1>Массовая печать справок</h1>
          <p class="muted">Документов готово: ${readyRows.length}. Нажмите кнопку ниже — файлы будут отправлены на печать по очереди.</p>
          <button class="primary" onclick="printQueue()">Начать печать всех PDF</button>
          <ol id="docs"></ol>
          <script>
            const docs = ${docsJson};
            const list = document.getElementById('docs');
            docs.forEach((doc) => {
              const li = document.createElement('li');
              const link = document.createElement('a');
              link.href = doc.url;
              link.target = '_blank';
              link.textContent = doc.name + ' — cardid ' + doc.cardId;
              li.appendChild(link);
              list.appendChild(li);
            });
            function printQueue(index = 0) {
              if (index >= docs.length) {
                alert('Все PDF отправлены в очередь печати.');
                return;
              }
              const frame = document.createElement('iframe');
              frame.src = docs[index].url;
              frame.onload = function () {
                setTimeout(function () {
                  try {
                    frame.contentWindow.focus();
                    frame.contentWindow.print();
                  } catch (error) {
                    console.error(error);
                  }
                  setTimeout(function () {
                    frame.remove();
                    printQueue(index + 1);
                  }, 900);
                }, 500);
              };
              document.body.appendChild(frame);
            }
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <div className="student-certificates-page">
      <section className="student-certificates-hero">
        <div>
          <span className="student-certificates-eyebrow">Оператор • документы</span>
          <h1>Справки для студентов по картам</h1>
          <p>
            Загрузите Excel с колонкой <strong>cardid</strong>, проверьте список и получите PDF-файлы
            через сервис “Справка для студентов”.
          </p>
        </div>
        <a className="student-certificates-link" href="/operator/docx-generator" target="_blank" rel="noreferrer">
          <FileText size={18} />
          Открыть генератор
        </a>
      </section>

      <section className="student-certificates-panel">
        <div className="student-certificates-panel__grid">
          <label className="student-certificates-field">
            <span>Шаблон</span>
            <select
              value={selectedTemplateId}
              onChange={(event) => {
                setSelectedTemplateId(event.target.value);
                setSelectedVariantIndex(0);
              }}
              disabled={isLoadingTemplates || templates.length === 0}
            >
              {templates.map((template) => (
                <option key={getTemplateId(template)} value={String(getTemplateId(template))}>
                  {getTemplateName(template)}
                </option>
              ))}
            </select>
          </label>

          <label className="student-certificates-field">
            <span>Вариант</span>
            <select
              value={selectedVariantIndex}
              onChange={(event) => setSelectedVariantIndex(Number(event.target.value))}
              disabled={variants.length === 0}
            >
              {variants.map((variant, index) => (
                <option key={`${variant.name}-${index}`} value={index}>
                  {variant.name || `Вариант ${index + 1}`}
                </option>
              ))}
            </select>
          </label>

          <label className="student-certificates-file">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <FileSpreadsheet size={22} />
            <span>{file ? file.name : "Выберите Excel-файл"}</span>
          </label>

          <button type="button" className="student-certificates-btn" onClick={handleUploadFile}>
            <UploadCloud size={18} />
            Загрузить файл
          </button>
        </div>

        {(templateError || parseMessage || storageMessage) && (
          <div className={`student-certificates-message ${templateError ? "is-error" : ""}`}>
            {templateError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{templateError || parseMessage || storageMessage}</span>
          </div>
        )}
      </section>

      <section className="student-certificates-stats">
        <div>
          <span>Всего cardid</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>Ожидают</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <span>PDF готовы</span>
          <strong>{generatedCount}</strong>
        </div>
        <div>
          <span>Ошибки</span>
          <strong>{failedCount}</strong>
        </div>
      </section>

      <section className="student-certificates-table-card">
        <div className="student-certificates-actions">
          <div>
            <h2>Таблица справок</h2>
            <p>Документ появляется напротив каждой карты после успешной генерации.</p>
          </div>
          <div className="student-certificates-actions__buttons">
            {isGenerating && (
              <span className="student-certificates-progress">
                {progress.done}/{progress.total}
              </span>
            )}
            <button
              type="button"
              className="student-certificates-btn student-certificates-btn--primary"
              onClick={handleGenerateAll}
              disabled={isGenerating || rows.length === 0 || !selectedTemplate || !selectedVariant}
            >
              {isGenerating ? <Loader2 className="student-certificates-spin" size={18} /> : <RefreshCw size={18} />}
              Получить файлы по всем картам
            </button>
            <button
              type="button"
              className="student-certificates-btn student-certificates-btn--print"
              onClick={handlePrintAll}
              disabled={generatedCount === 0}
            >
              <Printer size={18} />
              Печать всех готовых PDF
            </button>
            <button
              type="button"
              className="student-certificates-btn student-certificates-btn--danger"
              onClick={handleDeleteAllDocuments}
              disabled={generatedCount === 0 || isGenerating}
            >
              <Trash2 size={18} />
              Удалить все PDF
            </button>
            <button
              type="button"
              className="student-certificates-btn student-certificates-btn--ghost"
              onClick={handleClearTable}
              disabled={rows.length === 0 || isGenerating}
            >
              <XCircle size={18} />
              Очистить таблицу
            </button>
          </div>
        </div>

        <div className="student-certificates-table-wrap">
          <table className="student-certificates-table">
            <thead>
              <tr>
                <th>cardid</th>
                <th>Документ</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="4" className="student-certificates-empty">
                    Загрузите Excel-файл с колонкой cardid — строки появятся здесь.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.cardId}</strong>
                      <small>строка Excel: {row.sourceRow}</small>
                    </td>
                    <td>
                      {row.documentUrl ? (
                        <a href={row.documentUrl} target="_blank" rel="noreferrer" className="student-certificates-doc">
                          <FileText size={18} />
                          {row.documentName}
                        </a>
                      ) : (
                        <span className="student-certificates-muted">PDF ещё не создан</span>
                      )}
                    </td>
                    <td>
                      <span className={`student-certificates-status is-${row.status}`}>
                        {row.status === "loading" && <Loader2 className="student-certificates-spin" size={14} />}
                        {row.status === "success" && <CheckCircle2 size={14} />}
                        {row.status === "error" && <XCircle size={14} />}
                        {row.status === "pending" && <FileSpreadsheet size={14} />}
                        {row.message}
                      </span>
                    </td>
                    <td>
                      <div className="student-certificates-row-actions">
                        {row.documentUrl && (
                          <>
                            <button type="button" onClick={() => window.open(row.documentUrl, "_blank", "noopener,noreferrer")}>
                              <ExternalLink size={15} />
                              Открыть
                            </button>
                            <button type="button" onClick={() => handleDownload(row)}>
                              <Download size={15} />
                              Скачать
                            </button>
                            <button type="button" onClick={() => handlePrintOne(row)}>
                              <Printer size={15} />
                              Печать
                            </button>
                            <button type="button" className="is-danger" onClick={() => handleDeleteDocument(row)}>
                              <Trash2 size={15} />
                              Удалить PDF
                            </button>
                          </>
                        )}
                        <button type="button" disabled={isGenerating} onClick={() => handleRegenerate(row)}>
                          <RefreshCw size={15} />
                          {row.documentUrl ? "Заново" : "Получить"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
