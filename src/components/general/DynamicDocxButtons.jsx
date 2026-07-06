import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { ChevronRight, FileDown, Layers, Loader2, X, FileText, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildDocxPayload,
  normalizeDocxRoles,
  normalizeDocxVariants,
  sanitizeDocxFileName,
  evaluateDocxTemplateConditions,
} from "../../utils/docxTemplateHelpers";
import { fetchCreditGraphs } from "../../api/ABS_frotavik/getUserCredits";
import { Modal, Button } from "antd";
import { hasRole } from "../../api/roleHelper";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

const DynamicDocxButtons = ({ page, section, data = {} }) => {
  const [allTemplates, setAllTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    url: "",
    name: "",
    format: "",
    blob: null,
  });
  const [paramsModal, setParamsModal] = useState({
    isOpen: false,
    variant: null,
    template: null,
    type: null,
    fromDate: "",
    toDate: "",
  });

  const getRoles = () => {
    const roleIds = normalizeDocxRoles(localStorage.getItem("role_ids"));
    if (roleIds.length > 0) {
      return roleIds;
    }

    return normalizeDocxRoles(localStorage.getItem("role_id"));
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/api/docx/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userRoles = getRoles();
        const filtered = (Array.isArray(res.data) ? res.data : [])
          .map((template) => ({
            ...template,
            parsedRoles: normalizeDocxRoles(template.roles),
            parsedVariants: normalizeDocxVariants(template.variants),
          }))
          .filter((template) => {
            if (template.page !== page || template.section !== section) {
              return false;
            }

            if (template.parsedRoles.length === 0) {
              return true;
            }

            return template.parsedRoles.some((role) => userRoles.includes(role));
          });

        setAllTemplates(filtered);
      } catch (err) {
        console.error("Failed to load docx templates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [page, section]);

  const templates = useMemo(() => {
    return allTemplates.filter((template) => {
      return evaluateDocxTemplateConditions(
        template.conditions || template.Conditions,
        data,
        template.uniqueIdFormat || template.UniqueIdFormat
      );
    });
  }, [allTemplates, data]);

  const handleGenerate = async (template, variant, format = "pdf", skipParamsCheck = false) => {
    if (!skipParamsCheck) {
      const hasTransactions = variant.keys.some((k) => {
        const sk = String(k.systemKey || k.key || '').toLowerCase();
        return sk.includes("transactions");
      });
      const hasSchedule = variant.keys.some((k) => {
        const sk = String(k.systemKey || k.key || '').toLowerCase();
        return sk.includes("schedule");
      });

      // Skip params modal if schedule data is already available in the data prop
      const scheduleAlreadyAvailable = hasSchedule && Array.isArray(data.schedule) && data.schedule.length > 0;
      const needsParams = hasTransactions || (hasSchedule && !scheduleAlreadyAvailable);

      if (needsParams) {
        setParamsModal({
          isOpen: true,
          variant,
          template,
          type: hasTransactions ? "transactions" : "schedule",
          fromDate: "",
          toDate: "",
        });
        setShowVariantModal(false);
        return;
      }
    }

    setGeneratingId(`${template.ID || template.id}_${variant.name}`);
    setShowVariantModal(false);
    setParamsModal((prev) => ({ ...prev, isOpen: false }));

    console.log("=== DOCX Generation Debug ===");
    console.log("Template:", template);
    console.log("Variant:", variant);
    console.log("Input data passed to button:", data);

    let finalData = { ...data };

    // Fetch dynamic data if required
    try {
      if (paramsModal.type === "transactions") {
        const cardId = finalData.card?.cardId || finalData.cardId;
        const accountNumber = finalData.account?.number || finalData["account.number"] || finalData.accountNumber;
        
        if (cardId) {
          const procUrl = import.meta.env.VITE_BACKEND_PROCESSING_URL || "http://10.64.20.84:5003";
          const res = await axios.get(`${procUrl}/api/Transactions/by-cards`, {
            params: {
              cardIds: cardId,
              fromDate: paramsModal.fromDate || undefined,
              toDate: paramsModal.toDate || undefined,
            },
          });
          finalData.transactions = res.data?.data || res.data || [];
        } else if (accountNumber) {
          const absUrl = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
          const token = localStorage.getItem("token") || localStorage.getItem("access_token");
          const params = new URLSearchParams();
          if (paramsModal.fromDate) {
             const [y, m, d] = paramsModal.fromDate.split("-");
             params.append("startDate", `${d}.${m}.${y}`);
          }
          if (paramsModal.toDate) {
             const [y, m, d] = paramsModal.toDate.split("-");
             params.append("endDate", `${d}.${m}.${y}`);
          }
          params.append("accountNumber", accountNumber);
          
          const res = await axios.get(`${absUrl}/account/operations?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const data = res.data;
          let flatTransactions = [];
          if (Array.isArray(data)) {
            data.forEach(day => {
              if (Array.isArray(day.Transactions)) {
                 day.Transactions.forEach(tx => {
                    flatTransactions.push({
                      ...tx,
                      doper: day.DOPER,
                      date: tx.DOCDOPER || day.DOPER || "",
                      time: tx.EXECDT || "",
                      date_time: `${tx.DOCDOPER || day.DOPER || ""} ${tx.EXECDT || ""}`.trim(),
                      MOVD: tx.MOVD || 0,
                      MOVC: tx.MOVC || 0
                    });
                 });
              }
            });
          }
          flatTransactions.sort((a, b) => {
             const parseDate = (dStr, tStr) => {
                if (!dStr) return 0;
                const parts = dStr.split(".");
                if (parts.length === 3) {
                   const [d, m, y] = parts;
                   let tsStr = `${y}-${m}-${d}`;
                   if (tStr) tsStr += `T${tStr}`;
                   return new Date(tsStr).getTime();
                }
                return 0;
             };
             return parseDate(b.DOCDOPER || b.doper, b.EXECDT) - parseDate(a.DOCDOPER || a.doper, a.EXECDT);
          });
          finalData.transactions = flatTransactions;
          finalData.statementDateFrom = paramsModal.fromDate;
          finalData.statementDateTo = paramsModal.toDate;
        }
      } else if (paramsModal.type === "schedule") {
        // Use schedule data already in the data prop if available (e.g. from CreditDetails page)
        if (Array.isArray(finalData.schedule) && finalData.schedule.length > 0) {
          console.log("Schedule data already present in data prop, using it directly:", finalData.schedule.length, "items");
        } else {
          // Fallback: try to fetch schedule from API
          const creditId = finalData["credit.referenceId"] || finalData.credit?.referenceId || finalData.creditId;
          if (creditId) {
            const graphs = await fetchCreditGraphs(creditId);
            const scheduleMap = {};
            if (Array.isArray(graphs)) {
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
                if (g.Status && g.Status !== "Выплачен") scheduleMap[date].status = g.Status;
              });
            }
            const scheduleList = Object.values(scheduleMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            finalData.schedule = scheduleList;
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic docx table data:", err);
    }

    // Post-process and enrich transactions for DOCX template mapping
    if (Array.isArray(finalData.transactions)) {
      // 1. Get exchange rates for nationalAmount calculation (TJS)
      let exchangeRates = { USD: 10.9, EUR: 11.8 }; // Fallbacks
      try {
        const ratesToken = localStorage.getItem("exchangeRates");
        if (ratesToken) {
          const parsed = JSON.parse(ratesToken);
          if (parsed && typeof parsed === "object") {
            exchangeRates = { ...exchangeRates, ...parsed };
          }
        }
      } catch (e) {
        console.warn("Failed to parse exchange rates for docx:", e);
      }

      // Helper functions for formatting
      const getTransactionTypeValue = (transactionType, transactionTypeNumber) => {
        const dataTrans = [
          { label: "Списание", value: 2 },
          { label: "Зачисление", value: 1 },
          { label: "Блокировка", value: 2 },
          { label: "Разблокировка", value: 1 },
          { label: "Списание комиссии", value: 2 },
          { label: "Списание процентов", value: 2 },
          { label: "Списание штрафа", value: 2 }
        ];
        const found = dataTrans.find((e) => e.label === transactionType);
        if (found) return found.value;
        if (transactionTypeNumber !== undefined && transactionTypeNumber !== null) {
          return transactionTypeNumber;
        }
        return undefined;
      };

      const formatAmount = (amount, transactionTypeValue) => {
        if (amount === null || amount === undefined || amount === "") return "0.00";
        let amountVal = Number(amount);
        if (isNaN(amountVal)) return String(amount);
        let absAmount = Math.abs(amountVal);
        const amountStr = absAmount.toString();
        let formattedAmount;
        if (amountStr.length <= 2) {
          formattedAmount = `0.${amountStr.padStart(2, "0")}`;
        } else {
          const integerPart = amountStr.slice(0, -2);
          const decimalPart = amountStr.slice(-2);
          formattedAmount = `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}.${decimalPart}`;
        }
        if (transactionTypeValue === 1) return `+${formattedAmount}`;
        if (transactionTypeValue === 2) return `-${formattedAmount}`;
        if (amountVal < 0) return `-${formattedAmount}`;
        return formattedAmount;
      };

      const formatCardNumber = (num) => {
        return String(num || "").replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim();
      };

      // Filter and map transactions
      finalData.transactions = finalData.transactions
        .filter(t => {
          // Filter: Success status & amount > 0
          const respCode = String(t.responseCode !== undefined ? t.responseCode : "").trim();
          const respDesc = String(t.responseDescription || t.status || "").toLowerCase();
          
          // ABS transactions do not have responseCode, they are posted entries, so they are successful
          const isABS = t.responseCode === undefined;
          
          const isSuccess = isABS || respCode === "-1" || respDesc.includes("успешно") || respDesc.includes("success");
          
          const amountVal = Number(t.amount || t.reqamt || t.conamt || t.MOVD || t.MOVC || 0);
          return isSuccess && amountVal > 0;
        })
        .map(t => {
          const txTypeValue = getTransactionTypeValue(t.transactionType, t.transactionTypeNumber);
          
          const amountFormatted = `${formatAmount(t.amount, txTypeValue)} ${getCurrencyCode(t.currency)}`;
          const conamtFormatted = `${formatAmount(t.conamt, txTypeValue)} ${getCurrencyCode(t.conCurrency)}`;
          
          // Calculate nationalAmount (TJS)
          const rate = t.conCurrency === 840
            ? exchangeRates.USD
            : t.conCurrency === 978
              ? exchangeRates.EUR
              : 1;
          const amountTJS = Math.abs(Math.round((t.conamt || 0) * rate));
          const nationalAmountFormatted = formatAmount(amountTJS);

          return {
            ...t,
            date: t.localTransactionDate || t.date || "",
            time: t.localTransactionTime || t.time || "",
            date_time: `${t.localTransactionDate || t.date || ""} ${t.localTransactionTime || t.time || ""}`.trim(),
            status: t.responseDescription || t.status || "Успешно",
            cardNumber: t.cardNumber ? formatCardNumber(t.cardNumber) : "",
            cardId: t.cardId || "",
            transactionTypeName: t.transactionTypeName || t.transactionType || "N/A",
            amount: amountFormatted,
            conamt: conamtFormatted,
            acctbal: formatAmount(t.acctbal || t.balance || 0),
            utrnno: t.utrnno || "N/A",
            terminalId: t.terminalId || "N/A",
            atmId: t.atmId || "N/A",
            reqamt: formatAmount(t.reqamt || t.amount || 0, txTypeValue),
            terminalAddress: t.terminalAddress || "N/A",
            mcc: t.mcc || "N/A",
            account: t.account || "N/A",
            nationalAmount: nationalAmountFormatted,
            id: t.id || t.transactionId || "N/A",
            MOVD: t.MOVD || 0,
            MOVC: t.MOVC || 0
          };
        });
    }

    // Format dates for period placeholders
    const formatDateDDMMYYYY = (isoStr) => {
      if (!isoStr) return "";
      const parts = isoStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
      return isoStr;
    };

    const formattedFromDate = formatDateDDMMYYYY(paramsModal.fromDate);
    const formattedToDate = formatDateDDMMYYYY(paramsModal.toDate);
    
    let nowStr = "";
    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      nowStr = `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
    } catch (e) {
      nowStr = new Date().toLocaleString("ru-RU");
    }

    finalData.dateFrom = formattedFromDate;
    finalData.dateTo = formattedToDate;
    finalData.statementDateFrom = formattedFromDate;
    finalData.statementDateTo = formattedToDate;
    finalData.fromDate = formattedFromDate;
    finalData.toDate = formattedToDate;
    finalData["дата выписки с"] = formattedFromDate;
    finalData["дата выписки по"] = formattedToDate;
    finalData["дата выписки"] = nowStr;
    finalData["дата_выписки"] = nowStr;

    const virtualKeys = [
      // English keys
      { key: "eval: (transactions || []).map(t => t.date)", docxKey: "date" },
      { key: "eval: (transactions || []).map(t => t.time)", docxKey: "time" },
      { key: "eval: (transactions || []).map(t => t.date_time)", docxKey: "date_time" },
      { key: "eval: (transactions || []).map(t => t.status)", docxKey: "status" },
      { key: "eval: (transactions || []).map(t => t.cardNumber)", docxKey: "cardNumber" },
      { key: "eval: (transactions || []).map(t => t.cardId)", docxKey: "cardId" },
      { key: "eval: (transactions || []).map(t => t.transactionTypeName)", docxKey: "transactionTypeName" },
      { key: "eval: (transactions || []).map(t => t.amount)", docxKey: "amount" },
      { key: "eval: (transactions || []).map(t => t.conamt)", docxKey: "conamt" },
      { key: "eval: (transactions || []).map(t => t.acctbal)", docxKey: "acctbal" },
      { key: "eval: (transactions || []).map(t => t.utrnno)", docxKey: "utrnno" },
      { key: "eval: (transactions || []).map(t => t.terminalId)", docxKey: "terminalId" },
      { key: "eval: (transactions || []).map(t => t.atmId)", docxKey: "atmId" },
      { key: "eval: (transactions || []).map(t => t.reqamt)", docxKey: "reqamt" },
      { key: "eval: (transactions || []).map(t => t.terminalAddress)", docxKey: "terminalAddress" },
      { key: "eval: (transactions || []).map(t => t.mcc)", docxKey: "mcc" },
      { key: "eval: (transactions || []).map(t => t.account)", docxKey: "account" },
      { key: "eval: (transactions || []).map(t => t.nationalAmount)", docxKey: "nationalAmount" },
      { key: "eval: (transactions || []).map(t => t.id)", docxKey: "id" },

      // Russian keys (with underscores, spaces, etc.)
      { key: "eval: (transactions || []).map(t => t.date_time)", docxKey: "Дата" },
      { key: "eval: (transactions || []).map(t => t.status)", docxKey: "Статус" },
      { key: "eval: (transactions || []).map(t => t.cardNumber)", docxKey: "Номер_карты" },
      { key: "eval: (transactions || []).map(t => t.cardNumber)", docxKey: "Номер карты" },
      { key: "eval: (transactions || []).map(t => t.cardNumber)", docxKey: "НомерКарты" },
      { key: "eval: (transactions || []).map(t => t.cardId)", docxKey: "ID_карты" },
      { key: "eval: (transactions || []).map(t => t.cardId)", docxKey: "ID карты" },
      { key: "eval: (transactions || []).map(t => t.cardId)", docxKey: "IDкарты" },
      { key: "eval: (transactions || []).map(t => t.transactionTypeName)", docxKey: "Тип_операции" },
      { key: "eval: (transactions || []).map(t => t.transactionTypeName)", docxKey: "Тип операции" },
      { key: "eval: (transactions || []).map(t => t.transactionTypeName)", docxKey: "ТипОперации" },
      { key: "eval: (transactions || []).map(t => t.amount)", docxKey: "Сумма_валюта" },
      { key: "eval: (transactions || []).map(t => t.amount)", docxKey: "Сумма (валюта)" },
      { key: "eval: (transactions || []).map(t => t.amount)", docxKey: "СуммаВалюта" },
      { key: "eval: (transactions || []).map(t => t.conamt)", docxKey: "Сумма_в_валюте_карты" },
      { key: "eval: (transactions || []).map(t => t.conamt)", docxKey: "Сумма в валюте карты" },
      { key: "eval: (transactions || []).map(t => t.conamt)", docxKey: "СуммаВВалютеКарты" },
      { key: "eval: (transactions || []).map(t => t.acctbal)", docxKey: "Доступный_баланс" },
      { key: "eval: (transactions || []).map(t => t.acctbal)", docxKey: "Доступный баланс" },
      { key: "eval: (transactions || []).map(t => t.acctbal)", docxKey: "ДоступныйБаланс" },
      { key: "eval: (transactions || []).map(t => t.utrnno)", docxKey: "UTRNNO" },
      { key: "eval: (transactions || []).map(t => t.terminalId)", docxKey: "ID_терминала" },
      { key: "eval: (transactions || []).map(t => t.terminalId)", docxKey: "ID терминала" },
      { key: "eval: (transactions || []).map(t => t.terminalId)", docxKey: "IDТерминала" },
      { key: "eval: (transactions || []).map(t => t.atmId)", docxKey: "ID_ATM" },
      { key: "eval: (transactions || []).map(t => t.atmId)", docxKey: "ID ATM" },
      { key: "eval: (transactions || []).map(t => t.atmId)", docxKey: "IDATM" },
      { key: "eval: (transactions || []).map(t => t.reqamt)", docxKey: "Запрошенная_сумма" },
      { key: "eval: (transactions || []).map(t => t.reqamt)", docxKey: "Запрошенная сумма" },
      { key: "eval: (transactions || []).map(t => t.reqamt)", docxKey: "ЗапрошеннаяСумма" },
      { key: "eval: (transactions || []).map(t => t.terminalAddress)", docxKey: "Адрес_терминала" },
      { key: "eval: (transactions || []).map(t => t.terminalAddress)", docxKey: "Адрес терминала" },
      { key: "eval: (transactions || []).map(t => t.terminalAddress)", docxKey: "АдресТерминала" },
      { key: "eval: (transactions || []).map(t => t.mcc)", docxKey: "MCC" },
      { key: "eval: (transactions || []).map(t => t.account)", docxKey: "Счет" },
      { key: "eval: (transactions || []).map(t => t.nationalAmount)", docxKey: "Сумма_в_нац_валюте" },
      { key: "eval: (transactions || []).map(t => t.nationalAmount)", docxKey: "Сумма в нац. валюте" },
      { key: "eval: (transactions || []).map(t => t.nationalAmount)", docxKey: "СуммаВНацВалюте" },
      { key: "eval: (transactions || []).map(t => t.id)", docxKey: "ID_транзакции" },
      { key: "eval: (transactions || []).map(t => t.id)", docxKey: "ID транзакции" },
      { key: "eval: (transactions || []).map(t => t.id)", docxKey: "IDТранзакции" },

      // Fallback keys for backward compatibility
      { key: "eval: (transactions || []).map(t => t.MOVD)", docxKey: "MOVD" },
      { key: "eval: (transactions || []).map(t => t.MOVC)", docxKey: "MOVC" },
      { key: "eval: (transactions || []).map(t => t.status)", docxKey: "TXTDSCR" },
      { key: "eval: (transactions || []).map(t => t.status)", docxKey: "details" }
    ];
    
    const virtualDocxKeys = new Set(virtualKeys.map(vk => vk.docxKey));
    const cleanedExistingKeys = (variant.keys || []).filter(k => !virtualDocxKeys.has(k.docxKey));
    
    const modifiedVariant = {
      ...variant,
      keys: [...cleanedExistingKeys, ...virtualKeys]
    };

    const finalPayload = buildDocxPayload(modifiedVariant, finalData, {}, template.uniqueIdFormat || template.UniqueIdFormat);
    console.log("Built Final Payload:", finalPayload);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/api/docx/generate`,
        {
          templatePath: variant.templatePath,
          templateId: template.ID || template.id,
          data: finalPayload,
          format: format,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        },
      );

       const downloadName = sanitizeDocxFileName(
         variant.outputFileName || `${template.name}_${variant.name}`,
         "generated",
       );
       const mimeType = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
       const blob = new Blob([response.data], { type: mimeType });
       const url = window.URL.createObjectURL(blob);
       
       setPreviewModal({
         isOpen: true,
         url,
         name: downloadName,
         format,
         blob,
       });
    } catch (error) {
      console.error("Docx generation error:", error);
      alert("Ошибка при генерации документа. Проверьте шаблон и попробуйте еще раз.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleButtonClick = (template, format = "pdf") => {
    const variants = template.parsedVariants || normalizeDocxVariants(template.variants);

    setSelectedFormat(format);

    if (variants.length === 0) {
      alert("У данного шаблона нет настроенных вариантов генерации.");
      return;
    }

    if (variants.length === 1) {
      handleGenerate(template, variants[0], format);
      return;
    }

    setSelectedTemplate({
      ...template,
      parsedVariants: variants,
    });
    setShowVariantModal(true);
  };

  if (loading) {
    return (
      <div className="docx-runtime-loading">
        <Loader2 className="docx-spin" size={16} />
        <span>Загрузка документов...</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  const userRoles = getRoles();

  return (
    <>
      <div className="docx-runtime-buttons">
        {templates.map((template) => {
          const variants = template.parsedVariants || [];
          const hasMultiple = variants.length > 1;
          const isWorking = generatingId && generatingId.startsWith(`${template.ID || template.id}_`);

          const pdfRoles = normalizeDocxRoles(template.pdfRoles || template.PdfRoles);
          const docxRoles = normalizeDocxRoles(template.docxRoles || template.DocxRoles);
          
          const canPdf = pdfRoles.length === 0 || pdfRoles.some(r => userRoles.includes(r));
          const canDocx = (docxRoles.length === 0 || docxRoles.some(r => userRoles.includes(r))) && userRoles.includes(3);

          if (!canPdf && !canDocx) return null;

          return (
            <div key={template.ID || template.id} className="docx-generate-group" style={{display: "inline-flex", marginRight: "8px", verticalAlign: "middle", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)"}}>
              {canPdf && (
                <button
                  type="button"
                  onClick={() => handleButtonClick(template, "pdf")}
                  className="docx-runtime-btn"
                  disabled={Boolean(generatingId)}
                  title={template.description || template.name}
                  style={{ borderTopRightRadius: canDocx ? 0 : "8px", borderBottomRightRadius: canDocx ? 0 : "8px", borderRight: canDocx ? "1px solid rgba(255,255,255,0.2)" : "none", margin: 0, boxShadow: "none" }}
                >
                  {isWorking ? (
                    <Loader2 className="docx-spin" size={15} />
                  ) : hasMultiple ? (
                    <Layers size={15} />
                  ) : (
                    <FileText size={15} />
                  )}
                  <span>{template.name} {canDocx ? "" : "(PDF)"}</span>
                </button>
              )}
              {canDocx && (
                <button
                  type="button"
                  onClick={() => handleButtonClick(template, "docx")}
                  className="docx-runtime-btn"
                  disabled={Boolean(generatingId)}
                  style={{ borderTopLeftRadius: canPdf ? 0 : "8px", borderBottomLeftRadius: canPdf ? 0 : "8px", paddingLeft: canPdf ? "10px" : "15px", paddingRight: canPdf ? "10px" : "15px", margin: 0, boxShadow: "none", backgroundColor: "#334155" }}
                  title="Скачать в DOCX"
                >
                  <Download size={15} />
                  <span style={{ fontSize: "11px", marginLeft: "2px" }}>DOCX</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showVariantModal && selectedTemplate && (
            <motion.div
              className="docx-modal-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="docx-modal docx-modal--compact"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: "spring", duration: 0.35 }}
              >
                <div className="docx-modal__header">
                  <div>
                    <span className="docx-eyebrow">Вариант файла</span>
                    <h2>{selectedTemplate.name}</h2>
                    <p>У этого шаблона несколько видов генерации. Выберите нужный DOCX-файл.</p>
                  </div>
                  <button type="button" className="docx-icon-btn" onClick={() => setShowVariantModal(false)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="docx-variant-picker">
                  {selectedTemplate.parsedVariants.map((variant, index) => (
                    <button
                      key={`${variant.name}-${index}`}
                      type="button"
                      className="docx-variant-picker__item"
                      onClick={() => handleGenerate(selectedTemplate, variant, selectedFormat)}
                    >
                      <span>
                        <strong>{variant.name}</strong>
                        <small>
                          {variant.description || "Без описания"} · ключей: {variant.keys?.length || 0}
                        </small>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>

                <div className="docx-modal__footer">
                  <button type="button" className="docx-btn docx-btn--secondary" onClick={() => setShowVariantModal(false)}>
                    Отмена
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {paramsModal.isOpen && paramsModal.template && (
            <motion.div
              className="docx-modal-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="docx-modal docx-modal--compact"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: "spring", duration: 0.35 }}
              >
                <div className="docx-modal__header">
                  <div>
                    <span className="docx-eyebrow">Дополнительные параметры</span>
                    <h2>{paramsModal.template.name}</h2>
                    <p>
                      {paramsModal.type === "transactions" 
                        ? "Для этого шаблона необходимо указать период транзакций." 
                        : "Для этого шаблона необходимо указать период графика платежей."}
                    </p>
                  </div>
                  <button type="button" className="docx-icon-btn" onClick={() => setParamsModal(prev => ({ ...prev, isOpen: false }))}>
                    <X size={18} />
                  </button>
                </div>

                <div className="docx-variant-picker" style={{ padding: "1.5rem 1rem" }}>
                  <div className="docx-form-group">
                    <label>Дата начала (От)</label>
                    <input 
                      type="date" 
                      className="docx-form-input"
                      value={paramsModal.fromDate}
                      onChange={(e) => setParamsModal(prev => ({ ...prev, fromDate: e.target.value }))}
                    />
                  </div>
                  <div className="docx-form-group">
                    <label>Дата конца (До)</label>
                    <input 
                      type="date" 
                      className="docx-form-input"
                      value={paramsModal.toDate}
                      onChange={(e) => setParamsModal(prev => ({ ...prev, toDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="docx-modal__footer">
                  <button type="button" className="docx-btn docx-btn--secondary" onClick={() => setParamsModal(prev => ({ ...prev, isOpen: false }))}>
                    Отмена
                  </button>
                  <button 
                    type="button" 
                    className="docx-btn docx-btn--primary" 
                    onClick={() => handleGenerate(paramsModal.template, paramsModal.variant, selectedFormat, true)}
                  >
                    Сгенерировать
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <Modal
        title={`Просмотр документа: ${previewModal.name}`}
        open={previewModal.isOpen}
        onCancel={() => {
          window.URL.revokeObjectURL(previewModal.url);
          setPreviewModal({ isOpen: false, url: "", name: "", format: "", blob: null });
        }}
        width={1000}
        centered
        bodyStyle={{ height: "700px", padding: 0 }}
        footer={[
          <Button
            key="download"
            type="primary"
            icon={<Download size={16} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />}
            onClick={() => {
              const link = document.createElement("a");
              link.href = previewModal.url;
              link.setAttribute("download", `${previewModal.name}.${previewModal.format}`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}
          >
            Скачать файл
          </Button>,
          <Button
            key="close"
            onClick={() => {
              window.URL.revokeObjectURL(previewModal.url);
              setPreviewModal({ isOpen: false, url: "", name: "", format: "", blob: null });
            }}
          >
            Закрыть
          </Button>
        ]}
      >
        {previewModal.format === "pdf" ? (
          <iframe
            src={previewModal.url}
            width="100%"
            height="100%"
            style={{ border: "none" }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            <FileText size={64} style={{ marginBottom: '16px', color: '#3b82f6' }} />
            <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>Файл готов к скачиванию</h3>
            <p>Предварительный просмотр DOCX в браузере недоступен. Пожалуйста, скачайте файл.</p>
          </div>
        )}
      </Modal>
    </>
  );
};

export default DynamicDocxButtons;
