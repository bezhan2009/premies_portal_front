import React, { useState, useEffect, useRef } from "react";
import { ConfigProvider, theme as antdTheme, Modal, Spin, message, Button, Tabs, Form, Input, DatePicker, Select, Switch, InputNumber, Tooltip, Radio } from "antd";
import { searchStops, addMerchantStop, getCofDataInfo, cancelStopInstruction, clearVsmCache } from "../../../../services/vsmService";
import DynamicDocxButtons from "../../../general/DynamicDocxButtons.jsx";
import { extractDocxClientData } from "../../../../utils/docxTemplateHelpers.js";
import { logAuditAction } from "../../../../utils/auditLogger";
import { fetchTransactionsByCardId } from "../../../../api/processing/transactions";
import useThemeStore from "../../../../store/useThemeStore";
import { getCurrencyCode } from "../../../../api/utils/getCurrencyCode";

const { TabPane } = Tabs;

const RECOMMENDED_TRAN_TYPES = new Set([
    "SCHEDULED_RECURRING",
    "UNSCHEDULED_RECURRING",
    "INSTALLMENT",
    "BILL_PAY"
]);

const LOCAL_MCC_JOURNAL = {
    "4111": "Пригородный транспорт и метро",
    "4112": "Пассажирские поезда",
    "4121": "Такси и лимузины",
    "4214": "Доставка и курьеры",
    "4511": "Авиалинии и авиаперевозчики",
    "4722": "Туристические агентства",
    "4789": "Транспортные услуги",
    "4812": "Магазины телефонов",
    "4814": "Телекоммуникационные услуги (связь)",
    "4816": "Компьютерные сети, провайдеры связи",
    "4899": "Кабельное и платное ТВ",
    "4900": "Коммунальные услуги",
    "5045": "Компьютерное оборудование и ПО",
    "5311": "Универмаги",
    "5411": "Бакалея, супермаркеты",
    "5541": "АЗС (Станции техобслуживания)",
    "5542": "Автоматизированные бензоколонки",
    "5651": "Семейная одежда",
    "5691": "Магазины одежды и аксессуаров",
    "5732": "Магазины электроники",
    "5734": "Программное обеспечение",
    "5811": "Кейтеринг",
    "5812": "Рестораны и кафе",
    "5813": "Бары, ночные клубы",
    "5814": "Фастфуд",
    "5815": "Стриминговые сервисы, книги, музыка",
    "5816": "Цифровые товары - игры",
    "5912": "Аптеки",
    "5921": "Магазины алкоголя",
    "5941": "Спортивные товары",
    "5942": "Книжные магазины",
    "5943": "Магазины канцелярии",
    "5977": "Косметика и парфюмерия",
    "5999": "Магазины розничной торговли",
    "6012": "Финансовые институты",
    "7011": "Отели, гостиницы и мотели",
    "7216": "Химчистки",
    "7298": "Салоны красоты и здоровья",
    "7333": "Фотостудии и коммерческая съемка",
    "7372": "Компьютерное программирование и разработка ПО",
    "7399": "Бизнес-услуги",
    "7832": "Кинотеатры",
    "7997": "Клубы, спортзалы, боулинг",
    "7999": "Услуги отдыха и развлечений",
    "8011": "Врачи, медицинские клиники",
    "8099": "Медицинские услуги",
    "8299": "Школы и образовательные услуги",
    "8398": "Благотворительные организации",
    "8999": "Профессиональные услуги",
    "9222": "Штрафы",
    "9311": "Налоговые платежи",
    "9399": "Правительственные услуги"
};

const TruncatedTooltipText = ({ text, isDark }) => {
    const [isTruncated, setIsTruncated] = useState(false);
    const textRef = useRef(null);

    const checkTruncation = () => {
        if (textRef.current) {
            setIsTruncated(textRef.current.scrollWidth > textRef.current.offsetWidth);
        }
    };

    return (
        <Tooltip title={isTruncated ? text : ""} mouseEnterDelay={0.15}>
            <h4
                ref={textRef}
                onMouseEnter={checkTruncation}
                style={{
                    margin: "0 0 4px 0",
                    fontWeight: 700,
                    fontSize: "14px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: isTruncated ? "help" : "default",
                    color: isDark ? "#f1f5f9" : "#0f172a"
                }}
            >
                {text}
            </h4>
        </Tooltip>
    );
};

const VSMModal = ({ isOpen, onClose, card, accountsData, selectedClient }) => {
    const [loading, setLoading] = useState(false);
    const [stops, setStops] = useState([]);
    const [cofData, setCofData] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [mccMap, setMccMap] = useState({});
    const [hoveredSubIdx, setHoveredSubIdx] = useState(null);
    const [hoveredBlockIdx, setHoveredBlockIdx] = useState(null);
    const [activeTabKey, setActiveTabKey] = useState("1");
    const [txFilter, setTxFilter] = useState("filtered");
    const [selectedMerchantFilter, setSelectedMerchantFilter] = useState(null);
    const [form] = Form.useForm();
    const [modal, contextHolder] = Modal.useModal();
    
    const { theme, primaryColor } = useThemeStore();
    const isDark = theme === "dark";

    const themeConfig = {
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
            colorPrimary: primaryColor,
            borderRadius: 10,
        },
    };

    // Auto-select the first account number if available
    const initialAccount = card?.details?.accounts?.[0]?.number || 
                           card?.accounts?.[0]?.accountNumber || 
                           card?.accounts?.[0]?.number || "";

    const [selectedAccount, setSelectedAccount] = useState(initialAccount);

    const fetchMccJournal = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/merchants`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            const cardsList = Array.isArray(data) ? data : (data?.data || []);
            const mapping = {};
            cardsList.forEach(item => {
                if (item.code) {
                    mapping[String(item.code)] = item.title;
                }
            });
            setMccMap(mapping);
        } catch (error) {
            console.error("Failed to fetch MCC journal:", error);
        }
    };

    useEffect(() => {
        if (isOpen && card) {
            const acc = card?.details?.accounts?.[0]?.number || 
                        card?.accounts?.[0]?.accountNumber || 
                        card?.accounts?.[0]?.number || "";
            setSelectedAccount(acc);
            if (acc) {
                fetchData(acc);
            }
        }
    }, [isOpen, card]);

    useEffect(() => {
        if (txFilter === "filtered" && selectedMerchantFilter) {
            if (!isFilterMerchantSub(selectedMerchantFilter)) {
                setSelectedMerchantFilter(null);
            }
        }
    }, [txFilter, selectedMerchantFilter, cofData]);

    const fetchData = async (accountNum) => {
        if (!accountNum) return;
        setLoading(true);
        try {
            if (Object.keys(mccMap).length === 0) {
                await fetchMccJournal();
            }

            const [stopsRes, cofRes, txsRes] = await Promise.all([
                searchStops(card.cardId, accountNum, true),
                getCofDataInfo(card.cardId, accountNum).catch(err => {
                    console.error("Failed to fetch COF data:", err);
                    return null;
                }),
                fetchTransactionsByCardId(card.cardId).catch(err => {
                    console.error("Failed to fetch transactions:", err);
                    return [];
                })
            ]);
            
            if (stopsRes && stopsRes.searchedStopInstructions) {
                setStops(stopsRes.searchedStopInstructions);
            } else {
                setStops([]);
            }
            
            if (cofRes && cofRes.responseData?.panList?.[0]?.panData?.merchants) {
                setCofData(cofRes.responseData.panList[0].panData.merchants);
            } else {
                setCofData([]);
            }

            setTransactions(txsRes || []);
        } catch (error) {
            message.error("Ошибка при загрузке данных VSM: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelStop = async (stopInstructionId) => {
        setLoading(true);
        try {
            await cancelStopInstruction(card.cardId, [stopInstructionId]);
            message.success("Ограничение успешно отменено");
            
            logAuditAction({
                action: "Отмена ограничения подписки (VSM)",
                card_number: card.cardId,
                details: `Снято ограничение VISA с ID ${stopInstructionId}`
            });

            fetchData(selectedAccount);
        } catch (error) {
            message.error("Ошибка при снятии ограничения: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const [clearingCache, setClearingCache] = useState(false);

    const handleClearCache = async () => {
        if (!card?.cardId) return;
        setClearingCache(true);
        try {
            await clearVsmCache(card.cardId);
            message.success("Кэш VSM успешно удален");
            if (selectedAccount) {
                fetchData(selectedAccount);
            }
        } catch (error) {
            console.error("Failed to clear VSM cache:", error);
            message.error("Не удалось удалить кэш VSM: " + (error.response?.data?.error || error.message));
        } finally {
            setClearingCache(false);
        }
    };

    const handleBlockMerchantDirectly = (merchant) => {
        if (!merchant) return;
        
        const targetMrchName = getMerchantDisplayName(merchant, transactions);
        
        // Find all duplicate subscriptions from cofData using the requested VSM parameters:
        // cardAcceptor, id (tokenReqstrId), mcc, merchRef, merchantName
        const duplicates = cofData.filter(m => {
            if (m === merchant) return false;
            
            // "any of founded matchings"
            if (merchant.cardAcceptorId && m.cardAcceptorId === merchant.cardAcceptorId) return true;
            if (merchant.tokenReqstrId && m.tokenReqstrId === merchant.tokenReqstrId) return true;
            if (merchant.mrchDbaId && m.mrchDbaId === merchant.mrchDbaId) return true;
            if (merchant.mrchRef && m.mrchRef === merchant.mrchRef) return true;
            
            // For MCC and name combined matching (since MCC alone is too broad)
            const n1 = (merchant.mrchName || "").toLowerCase().replace(/[\s\-_]/g, "");
            const n2 = (m.mrchName || "").toLowerCase().replace(/[\s\-_]/g, "");
            if (n1 && n2 && (n1.includes(n2) || n2.includes(n1))) return true;
            
            return false;
        });

        const allToBlock = [merchant, ...duplicates];
        
        // Extract all unique merchant names and cardAcceptorIds to block
        const merchantNamesSet = new Set();
        const cardAcceptorIdsSet = new Set();
        
        allToBlock.forEach(m => {
            if (m.mrchName) merchantNamesSet.add(m.mrchName);
            if (m.mrchDbaName) merchantNamesSet.add(m.mrchDbaName);
            if (m.cardAcceptorId) cardAcceptorIdsSet.add(m.cardAcceptorId);
            const dispName = getMerchantDisplayName(m, transactions);
            if (dispName) merchantNamesSet.add(dispName);
        });

        // Clean names per Visa constraints
        const apiMerchantNames = Array.from(merchantNamesSet).map(name => {
            let n = String(name || "").trim();
            if (n.length > 25) n = n.slice(0, 25).trim();
            if (n.length < 2) n = "MERCHANT";
            return n;
        });
        const apiCardAcceptorIds = Array.from(cardAcceptorIdsSet)
            .filter(id => id && String(id).trim().length > 0);

        modal.confirm({
            title: `Заблокировать списания от ${targetMrchName}?`,
            content: (
                <div style={{ color: isDark ? "#cbd5e1" : "#475569" }}>
                    <p>Будет отправлен запрос в VISA на ограничение списаний от <strong>{targetMrchName}</strong> сроком на 12 месяцев.</p>
                    {duplicates.length > 0 && (
                        <p style={{ marginTop: 8, fontSize: '13px', color: '#f59e0b' }}>
                            Найдены дубликаты подписок ({duplicates.length}). Они также будут заблокированы для синхронизации системы.
                        </p>
                    )}
                </div>
            ),
            okText: "Заблокировать",
            okType: "danger",
            cancelText: "Отмена",
            onOk: async () => {
                setLoading(true);
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const chunkSize = 5;
                    
                    // Chunk names
                    const nameChunks = [];
                    for (let i = 0; i < apiMerchantNames.length; i += chunkSize) {
                        nameChunks.push(apiMerchantNames.slice(i, i + chunkSize));
                    }
                    
                    // Chunk IDs
                    const idChunks = [];
                    for (let i = 0; i < apiCardAcceptorIds.length; i += chunkSize) {
                        idChunks.push(apiCardAcceptorIds.slice(i, i + chunkSize));
                    }
                    
                    const totalChunks = Math.max(nameChunks.length, idChunks.length);
                    let successCount = 0;
                    
                    for (let i = 0; i < totalChunks; i++) {
                        const chunkNames = nameChunks[i] || [];
                        const chunkIds = idChunks[i] || [];
                        
                        if (chunkNames.length === 0 && chunkIds.length === 0) continue;
                        
                        const payload = {
                            duration: 12,
                            recurringAndInstallmentIndicator: true,
                            cancelSubscription: true,
                            merchantIdentifiers: {
                                merchantNames: chunkNames,
                                cardAcceptorIds: chunkIds.length > 0 ? chunkIds : undefined
                            },
                            startDate: today
                        };
                        
                        await addMerchantStop(card.cardId, selectedAccount, payload);
                        successCount++;
                    }
                    
                    if (successCount > 0) {
                        message.success(`Списания от ${targetMrchName} успешно заблокированы`);
                        
                        logAuditAction({
                            action: "Добавление остановки подписки (VSM)",
                            card_number: card.cardId,
                            details: `Заблокировано списание от мерчанта ${targetMrchName} (включая ${duplicates.length} дубликатов) на 12 месяцев.`
                        });
                        
                        fetchData(selectedAccount);
                    }
                } catch (error) {
                    message.error("Ошибка при блокировке: " + (error.response?.data?.error || error.message));
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const isMerchantBlocked = (merchant) => {
        if (!merchant) return false;
        
        const namesToMatch = new Set();
        if (merchant.mrchName) namesToMatch.add(merchant.mrchName.toLowerCase().replace(/[\s\-_]/g, ""));
        if (merchant.mrchDbaName) namesToMatch.add(merchant.mrchDbaName.toLowerCase().replace(/[\s\-_]/g, ""));
        
        const displayName = getMerchantDisplayName(merchant, transactions);
        if (displayName) namesToMatch.add(displayName.toLowerCase().replace(/[\s\-_]/g, ""));
        
        const merchantCaid = String(merchant.cardAcceptorId || "").trim();
        
        return stops.some(stop => {
            if (stop.status !== "Active") return false;
            
            // 1. Try matching by cardAcceptorId (CAID)
            const stopCaid = String(stop.merchantIdentifier?.cardAcceptorId || "").trim();
            if (stopCaid && merchantCaid && stopCaid === merchantCaid) {
                return true;
            }
            
            // 2. Try matching by normalized names
            const stopMrchName = (stop.merchantIdentifier?.merchantName || "").toLowerCase().replace(/[\s\-_]/g, "");
            if (stopMrchName && namesToMatch.has(stopMrchName)) {
                return true;
            }
            
            // 3. Try matching by additional notes
            const notes = stop.additional?.additionalNotes || "";
            const match = notes.match(/merchant_name=([^|]+)/);
            if (match) {
                const notesName = match[1].toLowerCase().replace(/[\s\-_]/g, "");
                if (notesName && namesToMatch.has(notesName)) {
                    return true;
                }
            }
            
            return false;
        });
    };

    const isMerchantSubscription = (merchant) => {
        if (!merchant.tranTypeDetails || merchant.tranTypeDetails.length === 0) {
            return false; // Only show if we explicitly have details matching RECOMMENDED_TRAN_TYPES
        }
        return merchant.tranTypeDetails.some(detail => RECOMMENDED_TRAN_TYPES.has(detail.tranType));
    };

    const isFilterMerchantSub = (filter) => {
        if (!filter) return false;
        if (filter.tranTypeDetails) return isMerchantSubscription(filter);
        const found = cofData.find(m => String(m.mCC) === String(filter.mCC));
        if (found) return isMerchantSubscription(found);
        return true;
    };

    const getStopLogoUrl = (stop) => {
        if (!stop) return "";
        const stopMcc = stop.merchantIdentifier?.merchantCategoryCode || "";
        const stopMrchName = stop.merchantIdentifier?.merchantName || "";
        const notes = stop.additional?.additionalNotes || "";
        const match = notes.match(/merchant_name=([^|]+)/);
        const displayMerchantName = match ? match[1] : (stopMrchName || "");

        const normalizedStopName = displayMerchantName.toLowerCase().replace(/[\s\-_]/g, "");

        let found = cofData.find(m => {
            const mName = getMerchantDisplayName(m, transactions).toLowerCase().replace(/[\s\-_]/g, "");
            if (mName && normalizedStopName && (mName.includes(normalizedStopName) || normalizedStopName.includes(mName))) {
                return true;
            }
            const rawMName = (m.mrchName || "").toLowerCase().replace(/[\s\-_]/g, "");
            if (rawMName && normalizedStopName && (rawMName.includes(normalizedStopName) || normalizedStopName.includes(rawMName))) {
                return true;
            }
            return false;
        });

        if (!found && stopMcc) {
            found = cofData.find(m => String(m.mCC) === String(stopMcc));
        }

        return found ? found.mrchLogoURL : "";
    };

    const handleAddStop = async (values) => {
        if (!selectedAccount) {
            message.error("Счет не выбран");
            return;
        }

        setLoading(true);
        try {
            let apiMrchName = String(values.merchantName || "").trim();
            if (apiMrchName.length > 25) {
                apiMrchName = apiMrchName.slice(0, 25).trim();
            }
            if (apiMrchName.length < 2 && apiMrchName.length > 0) {
                apiMrchName = "MERCHANT";
            }

            const payload = {
                duration: values.duration,
                recurringAndInstallmentIndicator: values.recurringAndInstallmentIndicator,
                cancelSubscription: values.cancelSubscription,
                merchantIdentifiers: {
                    merchantNames: apiMrchName ? [apiMrchName] : [],
                },
                startDate: values.startDate.format("YYYY-MM-DD")
            };
            
            await addMerchantStop(card.cardId, selectedAccount, payload);
            message.success("Подписка/остановка успешно добавлена");
            
            logAuditAction({
                action: "Добавление остановки подписки (VSM)",
                card_number: card.cardId,
                details: `Добавлено ограничение для мерчанта ${values.merchantName || 'Не указан'} на срок ${values.duration} мес.`
            });

            form.resetFields();
            fetchData(selectedAccount);
        } catch (error) {
            message.error("Ошибка при добавлении подписки: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const cleanTerminalAddress = (addr) => {
        if (!addr) return "";
        let cleaned = addr.replace(/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g, "");
        cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, " ");
        let words = cleaned.split(/\s+/);
        const excludeWords = new Set([
            "moscow", "rus", "ru", "com", "net", "help", "www", "tjs", "usd", "eur", "tj", "co", "ltd", "gbr", "usa", "sg", "singapore", "ae", "dubai", "payment", "pay", "card", "gate", "gateway", "billing", "bill",
            "ru", "tj", "vn", "uz", "us", "ua", "kz", "tr", "gb", "de", "fr", "it", "es", "by", "kg", "am", "az", "ge", "md", "pl", "cn", "in", "co", "ae", "sg", "hk", "se", "ch", "at", "nl", "be", "dk", "no", "fi", "pt", "gr", "ie", "nz", "ca", "au", "za"
        ]);
        let resultWords = [];
        for (let w of words) {
            let wl = w.toLowerCase();
            if (wl && wl.length >= 2 && !excludeWords.has(wl) && isNaN(w)) {
                resultWords.push(w);
            }
        }
        if (resultWords.length === 0) return "";
        let uniqueWords = [];
        for (let w of resultWords) {
            let wu = w.toUpperCase();
            if (!uniqueWords.includes(wu)) {
                uniqueWords.push(wu);
            }
        }
        return uniqueWords.slice(0, 2).join(" ");
    };

    const getMerchantDisplayName = (merchant, transactionsList) => {
        // Use only the name from Card-On-File datainfo
        return merchant.mrchName || merchant.mrchDbaName || "Неизвестный мерчант";
    };

    const getMccDescription = (mcc) => {
        const codeStr = String(mcc);
        return mccMap[codeStr] || LOCAL_MCC_JOURNAL[codeStr] || `Категория ${codeStr}`;
    };

    const getMerchantTransactions = (mcc, name, transactionsList) => {
        return transactionsList.filter(tx => {
            if (mcc && String(tx.mcc) === String(mcc)) return true;
            if (name && tx.terminalAddress && tx.terminalAddress.toUpperCase().includes(name.toUpperCase())) return true;
            return false;
        });
    };

    const formatTransactionAmount = (amount) => {
        if (amount === null || amount === undefined || amount === "") return "0.00";
        const val = Number(amount) / 100;
        if (isNaN(val)) return "0.00";
        return val.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(",", ".");
    };

    const renderPreviousPayments = (mcc, name) => {
        const filteredTxs = getMerchantTransactions(mcc, name, transactions);
        const sortedTxs = [...filteredTxs].sort((a, b) => {
            const dateA = a.localTransactionDate ? a.localTransactionDate.split('.').reverse().join('-') : "";
            const dateB = b.localTransactionDate ? b.localTransactionDate.split('.').reverse().join('-') : "";
            const timeA = a.localTransactionTime || "";
            const timeB = b.localTransactionTime || "";
            return `${dateB} ${timeB}`.localeCompare(`${dateA} ${timeA}`);
        });

        const lastPayments = sortedTxs.slice(0, 7);

        if (lastPayments.length === 0) return null;

        return (
            <div style={{ marginTop: 12, borderTop: `1px dashed ${isDark ? "#334155" : "#e2e8f0"}`, paddingTop: 10 }}>
                <span style={{ fontSize: "11px", color: isDark ? "#64748b" : "#94a3b8", display: "block", marginBottom: 6, fontWeight: 600 }}>
                    Предыдущие оплаты (последние {lastPayments.length}):
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {lastPayments.map((pay, pIdx) => {
                        const amt = formatTransactionAmount(pay.amount || pay.reqamt || 0);
                        const curr = getCurrencyCode(pay.currency || pay.conCurrency);
                        return (
                            <div key={pIdx} style={{
                                background: isDark ? "#1e293b" : "#f8fafc",
                                border: `1px solid ${isDark ? "#334155" : "#f1f5f9"}`,
                                borderRadius: "6px",
                                padding: "4px 8px",
                                fontSize: "11px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}>
                                <span style={{ fontWeight: 600, color: isDark ? "#38bdf8" : "#0284c7" }}>
                                    {amt} {curr}
                                </span>
                                <span style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                                    {pay.localTransactionDate} {pay.localTransactionTime ? pay.localTransactionTime.substring(0, 5) : ""}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const getFilteredTransactionsList = () => {
        let list = [];
        const allowedMccs = new Set();
        const allowedNames = new Set();
        
        cofData.forEach(merchant => {
            const mrchName = getMerchantDisplayName(merchant, transactions);
            const isSub = isMerchantSubscription(merchant);
            
            if (txFilter === "all" || isSub) {
                allowedMccs.add(String(merchant.mCC));
                allowedNames.add(mrchName.toUpperCase());
            }
        });
        
        list = transactions.filter(tx => {
            const txMcc = String(tx.mcc);
            const txAddr = (tx.terminalAddress || "").toUpperCase();
            
            let matchesMerchant = false;
            
            if (selectedMerchantFilter) {
                const filterMcc = String(selectedMerchantFilter.mCC);
                const filterName = getMerchantDisplayName(selectedMerchantFilter, transactions).toUpperCase();
                
                const mccMatch = filterMcc && txMcc === filterMcc;
                const nameMatch = filterName && txAddr.includes(filterName);
                
                matchesMerchant = mccMatch || nameMatch;
            } else {
                const mccMatch = allowedMccs.has(txMcc);
                const nameMatch = Array.from(allowedNames).some(name => txAddr.includes(name));
                matchesMerchant = mccMatch || nameMatch;
            }
            
            return matchesMerchant;
        });
        
        return [...list].sort((a, b) => {
            const dateA = a.localTransactionDate ? a.localTransactionDate.split('.').reverse().join('-') : "";
            const dateB = b.localTransactionDate ? b.localTransactionDate.split('.').reverse().join('-') : "";
            const timeA = a.localTransactionTime || "";
            const timeB = b.localTransactionTime || "";
            return `${dateB} ${timeB}`.localeCompare(`${dateA} ${timeA}`);
        });
    };

    const renderLogo = (logoUrl, name) => {
        if (logoUrl) {
            return <img src={logoUrl} alt={name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", flexShrink: 0 }} />;
        }
        
        const firstLetter = name ? name.charAt(0).toUpperCase() : "?";
        const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#ec4899"];
        const charCodeSum = name ? name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
        const color = colors[charCodeSum % colors.length];
        
        return (
            <div style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: color,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: "bold",
                boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                flexShrink: 0
            }}>
                {firstLetter}
            </div>
        );
    };

    return (
        <ConfigProvider theme={themeConfig}>
            {contextHolder}
            <Modal
                title={`Управление подписками: ${card?.type || card?.CardTypeName || card?.details?.cardTypeName || 'Карта'} (${card?.CardNumber || card?.details?.cardNumberMask || card?.cardNumber || ''})`}
                open={isOpen}
                onCancel={onClose}
                footer={null}
                width={850}
            >
                <Spin spinning={loading}>
                    <Tabs 
                        activeKey={activeTabKey} 
                        onChange={setActiveTabKey}
                        tabBarExtraContent={
                            <Button 
                                type="primary" 
                                danger
                                size="small"
                                onClick={handleClearCache}
                                loading={clearingCache}
                                style={{ borderRadius: '6px' }}
                            >
                                Обновить кэш VSM
                            </Button>
                        }
                    >
                        <TabPane tab="Активные подписки" key="1">
                            <div style={{ padding: "12px 0" }}>
                                <p style={{ color: isDark ? "#94a3b8" : "#64748b", marginBottom: 16 }}>
                                    Список сервисов (Card-on-File), где сохранена ваша карта. Вы можете заблокировать автоматические списания от любого из них.
                                </p>
                                {(() => {
                                    const activeSubscriptions = cofData.filter(merchant => {
                                        const mrchName = getMerchantDisplayName(merchant, transactions);
                                        return !isMerchantBlocked(merchant) && isMerchantSubscription(merchant);
                                    });

                                    if (activeSubscriptions.length === 0) {
                                        return (
                                            <div style={{ textAlign: "center", padding: "40px 0", color: isDark ? "#64748b" : "#94a3b8", fontSize: "14px" }}>
                                                Нет активных подписок (все привязанные сервисы заблокированы или отсутствуют)
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={{ 
                                            display: "flex", 
                                            flexDirection: "column", 
                                            gap: "12px" 
                                        }}>
                                            {activeSubscriptions.map((merchant, idx) => {
                                                const mrchName = getMerchantDisplayName(merchant, transactions);
                                                return (
                                                    <div 
                                                        key={idx}
                                                        onMouseEnter={() => setHoveredSubIdx(idx)}
                                                        onMouseLeave={() => setHoveredSubIdx(null)}
                                                        style={{
                                                            background: isDark ? "#1e293b" : "#ffffff",
                                                            border: `1px solid ${hoveredSubIdx === idx ? primaryColor : (isDark ? "#334155" : "#e2e8f0")}`,
                                                            borderRadius: "12px",
                                                            padding: "16px",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: "12px",
                                                            boxShadow: hoveredSubIdx === idx 
                                                                ? `0 10px 15px -3px ${primaryColor}15, 0 4px 6px -4px ${primaryColor}15`
                                                                : (isDark ? "0 4px 6px rgba(0,0,0,0.15)" : "0 4px 6px rgba(0,0,0,0.02)"),
                                                            transform: hoveredSubIdx === idx ? "translateY(-2px)" : "none",
                                                            transition: "all 0.2s ease-in-out"
                                                        }}
                                                        className="subscription-card"
                                                    >
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", width: "100%", flexWrap: "wrap" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 2, minWidth: 0 }}>
                                                                {renderLogo(merchant.mrchLogoURL, mrchName)}
                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                    <TruncatedTooltipText text={mrchName} isDark={isDark} />
                                                                    <span style={{ fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b" }}>
                                                                        Категория: {getMccDescription(merchant.mCC)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div style={{ display: "flex", gap: "24px", flex: 3, fontSize: "13px", color: isDark ? "#cbd5e1" : "#475569" }}>
                                                                <div>
                                                                    <span style={{ display: "block", fontSize: "11px", color: isDark ? "#64748b" : "#94a3b8" }}>Всего транзакций</span>
                                                                    <strong style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>{merchant.totalTranCount || "0"}</strong>
                                                                </div>
                                                                <div>
                                                                    <span style={{ display: "block", fontSize: "11px", color: isDark ? "#64748b" : "#94a3b8" }}>Последний платеж</span>
                                                                    <strong style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>{merchant.lastTranAmt ? `${Number(merchant.lastTranAmt).toFixed(2)} ${getCurrencyCode(merchant.lastTranCurrency)}` : "-"}</strong>
                                                                </div>
                                                                <div>
                                                                    <span style={{ display: "block", fontSize: "11px", color: isDark ? "#64748b" : "#94a3b8" }}>Дата платежа</span>
                                                                    <strong style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>{merchant.lastMrchTranDt || "-"}</strong>
                                                                </div>
                                                            </div>

                                                            <div style={{ flex: 1.5, textAlign: "right", minWidth: "150px" }}>
                                                                <Button 
                                                                    type="primary"
                                                                    danger
                                                                    style={{ 
                                                                        borderRadius: "8px", 
                                                                        fontWeight: "bold",
                                                                        width: "100%"
                                                                    }}
                                                                    onClick={() => handleBlockMerchantDirectly(merchant)}
                                                                >
                                                                    Блокировать списания
                                                                </Button>
                                                                <Button 
                                                                    type="default"
                                                                    style={{ 
                                                                        borderRadius: "8px", 
                                                                        fontWeight: "500",
                                                                        width: "100%",
                                                                        marginTop: "8px",
                                                                        marginBottom: "8px"
                                                                    }}
                                                                    onClick={() => {
                                                                        setSelectedMerchantFilter(merchant);
                                                                        setActiveTabKey("3");
                                                                    }}
                                                                >
                                                                    Все транзакции
                                                                </Button>
                                                                <DynamicDocxButtons
                                                                    page="VsmSearch"
                                                                    section="Подписки VSM"
                                                                    data={{
                                                                        ...extractDocxClientData(selectedClient),
                                                                        "card.cardId": card?.cardId || "",
                                                                        "card.cardNumber": card?.CardNumber || card?.details?.cardNumberMask || card?.cardNumber || "",
                                                                        "vsm.merchantName": mrchName,
                                                                        "vsm.merchantId": merchant.mCC || "",
                                                                        "vsm.status": "Active",
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        {renderPreviousPayments(merchant.mCC, mrchName)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </TabPane>
                        <TabPane tab="Блокированные подписки" key="2">
                            <div style={{ padding: "12px 0" }}>
                                <p style={{ color: isDark ? "#94a3b8" : "#64748b", marginBottom: 16 }}>
                                    Список действующих блокировок VISA на автосписания. Вы можете отменить любую из них для возобновления платежей.
                                </p>
                                {(() => {
                                    const activeStops = stops.filter(stop => stop.status === "Active");

                                    if (activeStops.length === 0) {
                                        return (
                                            <div style={{ textAlign: "center", padding: "40px 0", color: isDark ? "#64748b" : "#94a3b8", fontSize: "14px" }}>
                                                Нет действующих блокировок
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={{ 
                                            display: "flex", 
                                            flexDirection: "column", 
                                            gap: "12px" 
                                        }}>
                                            {activeStops.map((stop, idx) => {
                                                const stopMrchName = stop.merchantIdentifier?.merchantName || "";
                                                const notes = stop.additional?.additionalNotes || "";
                                                const match = notes.match(/merchant_name=([^|]+)/);
                                                const displayMerchantName = match ? match[1] : (stopMrchName || "Все транзакции");
                                                
                                                const stopMcc = stop.merchantIdentifier?.merchantCategoryCode || "";

                                                return (
                                                    <div 
                                                        key={stop.stopInstructionId || idx}
                                                        onMouseEnter={() => setHoveredBlockIdx(idx)}
                                                        onMouseLeave={() => setHoveredBlockIdx(null)}
                                                        style={{
                                                            background: isDark ? "#1e293b" : "#ffffff",
                                                            border: `1px solid ${hoveredBlockIdx === idx ? "#ef4444" : (isDark ? "#ef444420" : "#fee2e2")}`,
                                                            borderRadius: "12px",
                                                            padding: "16px",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: "12px",
                                                            boxShadow: hoveredBlockIdx === idx 
                                                                ? "0 10px 15px -3px rgba(239, 68, 68, 0.1), 0 4px 6px -4px rgba(239, 68, 68, 0.1)"
                                                                : (isDark ? "0 4px 6px rgba(0,0,0,0.15)" : "0 4px 6px rgba(239, 68, 68, 0.02)"),
                                                            transform: hoveredBlockIdx === idx ? "translateY(-2px)" : "none",
                                                            transition: "all 0.2s ease-in-out"
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", width: "100%", flexWrap: "wrap" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 2, minWidth: 0 }}>
                                                                {renderLogo(getStopLogoUrl(stop), displayMerchantName)}
                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                    <TruncatedTooltipText text={displayMerchantName} isDark={isDark} />
                                                                    <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>
                                                                        Активное ограничение ({getMccDescription(stopMcc)})
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: "flex", gap: "24px", flex: 3, fontSize: "13px", color: isDark ? "#cbd5e1" : "#475569" }}>
                                                                <div>
                                                                    <span style={{ display: "block", fontSize: "11px", color: isDark ? "#64748b" : "#94a3b8" }}>ID инструкции</span>
                                                                    <strong style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>{stop.stopInstructionId || "-"}</strong>
                                                                </div>
                                                                <div>
                                                                    <span style={{ display: "block", fontSize: "11px", color: isDark ? "#64748b" : "#94a3b8" }}>Дата начала</span>
                                                                    <strong style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>{stop.startDate || "-"}</strong>
                                                                </div>
                                                                <div>
                                                                    <span style={{ display: "block", fontSize: "11px", color: isDark ? "#64748b" : "#94a3b8" }}>Дата окончания</span>
                                                                    <strong style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>{stop.endDate || "-"}</strong>
                                                                </div>
                                                            </div>

                                                            <div style={{ flex: 1.5, textAlign: "right", minWidth: "150px" }}>
                                                                <Button 
                                                                    type="primary"
                                                                    ghost
                                                                    style={{ 
                                                                        borderRadius: "8px", 
                                                                        fontWeight: "bold",
                                                                        borderColor: "#10b981",
                                                                        color: "#10b981",
                                                                        borderWidth: "1.5px",
                                                                        width: "100%"
                                                                    }}
                                                                    onClick={() => handleCancelStop(stop.stopInstructionId)}
                                                                >
                                                                    Разблокировать
                                                                </Button>
                                                                <Button 
                                                                    type="default"
                                                                    style={{ 
                                                                        borderRadius: "8px", 
                                                                        fontWeight: "500",
                                                                        width: "100%",
                                                                        marginTop: "8px",
                                                                        marginBottom: "8px"
                                                                    }}
                                                                    onClick={() => {
                                                                        const m = cofData.find(merchant => String(merchant.mCC) === String(stopMcc));
                                                                        if (m) {
                                                                            setSelectedMerchantFilter(m);
                                                                        } else {
                                                                            setSelectedMerchantFilter({ mCC: stopMcc, mrchName: displayMerchantName });
                                                                        }
                                                                        setActiveTabKey("3");
                                                                    }}
                                                                >
                                                                    Все транзакции
                                                                </Button>
                                                                <DynamicDocxButtons
                                                                    page="VsmSearch"
                                                                    section="Подписки VSM"
                                                                    data={{
                                                                        ...extractDocxClientData(selectedClient),
                                                                        "card.cardId": card?.cardId || "",
                                                                        "card.cardNumber": card?.CardNumber || card?.details?.cardNumberMask || card?.cardNumber || "",
                                                                        "vsm.merchantName": displayMerchantName,
                                                                        "vsm.merchantId": stop.merchantIdentifier?.merchantCategoryCode || "",
                                                                        "vsm.stopInstructionId": stop.stopInstructionId || "",
                                                                        "vsm.startDate": stop.startDate || "",
                                                                        "vsm.endDate": stop.endDate || "",
                                                                        "vsm.status": stop.status || "",
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        {renderPreviousPayments(stopMcc, displayMerchantName)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </TabPane>
                        <TabPane tab="История транзакций" key="3">
                            <div style={{ padding: "12px 0" }}>
                                <div style={{ 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    alignItems: "center", 
                                    gap: "16px", 
                                    marginBottom: "16px",
                                    flexWrap: "wrap",
                                    background: isDark ? "#1e293b" : "#f8fafc",
                                    padding: "12px 16px",
                                    borderRadius: "10px",
                                    border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`
                                }}>
                                    <div>
                                        <span style={{ display: "block", fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b", marginBottom: "4px", fontWeight: 600 }}>
                                            Фильтр транзакций:
                                        </span>
                                        <Radio.Group 
                                            value={txFilter} 
                                            onChange={e => setTxFilter(e.target.value)}
                                            size="small"
                                        >
                                            <Radio.Button value="all">Показывать все данные</Radio.Button>
                                            <Radio.Button value="filtered">Показывать отфильтрованные</Radio.Button>
                                        </Radio.Group>
                                    </div>
                                    
                                    <div style={{ minWidth: "250px" }}>
                                        <span style={{ display: "block", fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b", marginBottom: "4px", fontWeight: 600 }}>
                                            Фильтр по мерчанту:
                                        </span>
                                        <Select
                                            style={{ width: "100%" }}
                                            placeholder="Все мерчанты"
                                            allowClear
                                            value={selectedMerchantFilter ? JSON.stringify({ mCC: selectedMerchantFilter.mCC, mrchName: selectedMerchantFilter.mrchName }) : undefined}
                                            onChange={val => {
                                                if (val) {
                                                    setSelectedMerchantFilter(JSON.parse(val));
                                                } else {
                                                    setSelectedMerchantFilter(null);
                                                }
                                            }}
                                            size="small"
                                        >
                                            {cofData
                                                .filter(m => txFilter === "all" || isMerchantSubscription(m))
                                                .map((m, mIdx) => {
                                                    const mName = getMerchantDisplayName(m, transactions);
                                                    return (
                                                        <Select.Option key={mIdx} value={JSON.stringify({ mCC: m.mCC, mrchName: m.mrchName })}>
                                                            {mName} ({getMccDescription(m.mCC)})
                                                        </Select.Option>
                                                    );
                                                })
                                            }
                                        </Select>
                                    </div>
                                </div>
                                
                                {(() => {
                                    const filteredTxs = getFilteredTransactionsList();
                                    return (
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                                <span style={{ fontSize: "12px", color: isDark ? "#94a3b8" : "#64748b" }}>
                                                    Найдено транзакций: <strong>{filteredTxs.length}</strong>
                                                </span>
                                                {selectedMerchantFilter && (
                                                    <Button 
                                                        type="link" 
                                                        size="small" 
                                                        onClick={() => setSelectedMerchantFilter(null)}
                                                        style={{ padding: 0 }}
                                                    >
                                                        Сбросить фильтр мерчанта
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            {filteredTxs.length === 0 ? (
                                                <div style={{ textAlign: "center", padding: "40px 0", color: isDark ? "#64748b" : "#94a3b8", fontSize: "14px" }}>
                                                    Нет транзакций для отображения
                                                </div>
                                            ) : (
                                                <div style={{ 
                                                    display: "flex", 
                                                    flexDirection: "column", 
                                                    gap: "8px", 
                                                    maxHeight: "380px", 
                                                    overflowY: "auto", 
                                                    paddingRight: "4px" 
                                                }}>
                                                    {filteredTxs.map((tx, idx) => {
                                                        const amt = formatTransactionAmount(tx.amount || tx.reqamt || 0);
                                                        const curr = getCurrencyCode(tx.currency || tx.conCurrency);
                                                        const mccDesc = getMccDescription(tx.mcc);
                                                        const rawName = cleanTerminalAddress(tx.terminalAddress) || tx.terminalAddress || "Неизвестный мерчант";
                                                        
                                                        return (
                                                            <div key={idx} style={{
                                                                background: isDark ? "#1e293b" : "#f8fafc",
                                                                border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                                                                borderRadius: "8px",
                                                                padding: "12px 16px",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "space-between",
                                                                gap: "16px",
                                                                boxShadow: "0 2px 4px rgba(0,0,0,0.01)"
                                                            }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 2 }}>
                                                                    {renderLogo("", rawName)}
                                                                    <div style={{ minWidth: 0 }}>
                                                                        <h5 style={{ margin: "0 0 2px 0", fontWeight: 600, color: isDark ? "#f1f5f9" : "#0f172a", fontSize: "13px" }}>
                                                                            {rawName}
                                                                        </h5>
                                                                        <span style={{ fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b" }}>
                                                                            Категория: {mccDesc} (MCC: {tx.mcc})
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div style={{ flex: 1.5, textAlign: "right" }}>
                                                                    <strong style={{ display: "block", fontSize: "14px", color: isDark ? "#38bdf8" : "#0284c7" }}>
                                                                        {amt} {curr}
                                                                    </strong>
                                                                    <span style={{ fontSize: "11px", color: isDark ? "#64748b" : "#94a3b8" }}>
                                                                        {tx.localTransactionDate} {tx.localTransactionTime ? tx.localTransactionTime.substring(0, 5) : ""}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </TabPane>
                    </Tabs>
                </Spin>
            </Modal>
        </ConfigProvider>
    );
};

export default VSMModal;
