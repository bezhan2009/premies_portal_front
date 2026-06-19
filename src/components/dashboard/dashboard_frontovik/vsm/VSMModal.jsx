import React, { useState, useEffect, useRef } from "react";
import { ConfigProvider, theme as antdTheme, Modal, Spin, message, Button, Tabs, Form, Input, DatePicker, Select, Switch, InputNumber, Tooltip } from "antd";
import { searchStops, addMerchantStop, getCofDataInfo, cancelStopInstruction } from "../../../../services/vsmService";
import { logAuditAction } from "../../../../utils/auditLogger";
import { fetchTransactionsByCardId } from "../../../../api/processing/transactions";
import useThemeStore from "../../../../store/useThemeStore";
import { getCurrencyCode } from "../../../../api/utils/getCurrencyCode";

const { TabPane } = Tabs;

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

const VSMModal = ({ isOpen, onClose, card, accountsData }) => {
    const [loading, setLoading] = useState(false);
    const [stops, setStops] = useState([]);
    const [cofData, setCofData] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [mccMap, setMccMap] = useState({});
    const [hoveredSubIdx, setHoveredSubIdx] = useState(null);
    const [hoveredBlockIdx, setHoveredBlockIdx] = useState(null);
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

    const handleBlockMerchantDirectly = (mrchName) => {
        modal.confirm({
            title: `Заблокировать списания от ${mrchName}?`,
            content: (
                <div style={{ color: isDark ? "#cbd5e1" : "#475569" }}>
                    <p>Будет отправлен запрос в VISA на ограничение списаний от <strong>{mrchName}</strong> сроком на 12 месяцев.</p>
                </div>
            ),
            okText: "Заблокировать",
            okType: "danger",
            cancelText: "Отмена",
            onOk: async () => {
                setLoading(true);
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const payload = {
                        duration: 12,
                        recurringAndInstallmentIndicator: true,
                        cancelSubscription: true,
                        merchantIdentifiers: {
                            merchantNames: [mrchName],
                        },
                        startDate: today
                    };
                    
                    await addMerchantStop(card.cardId, selectedAccount, payload);
                    message.success(`Списания от ${mrchName} успешно заблокированы`);
                    
                    logAuditAction({
                        action: "Добавление остановки подписки (VSM)",
                        card_number: card.cardId,
                        details: `Заблокировано списание от мерчанта ${mrchName} на 12 месяцев.`
                    });
                    
                    fetchData(selectedAccount);
                } catch (error) {
                    message.error("Ошибка при блокировке: " + (error.response?.data?.error || error.message));
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const isMerchantBlocked = (mrchName) => {
        if (!mrchName) return false;
        const normalized = mrchName.toLowerCase().replace(/[\s\-_]/g, "");
        return stops.some(stop => {
            if (stop.status !== "Active") return false;
            const stopMrchName = stop.merchantIdentifier?.merchantName || "";
            if (stopMrchName.toLowerCase().replace(/[\s\-_]/g, "") === normalized) return true;
            const notes = stop.additional?.additionalNotes || "";
            const match = notes.match(/merchant_name=([^|]+)/);
            if (match && match[1].toLowerCase().replace(/[\s\-_]/g, "") === normalized) return true;
            return false;
        });
    };

    const handleAddStop = async (values) => {
        if (!selectedAccount) {
            message.error("Счет не выбран");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                duration: values.duration,
                recurringAndInstallmentIndicator: values.recurringAndInstallmentIndicator,
                cancelSubscription: values.cancelSubscription,
                merchantIdentifiers: {
                    merchantNames: values.merchantName ? [values.merchantName] : [],
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
        const mccTxs = transactionsList.filter(tx => String(tx.mcc) === String(merchant.mCC));
        if (mccTxs.length > 0) {
            const counts = {};
            let maxName = "";
            let maxCount = 0;
            mccTxs.forEach(tx => {
                const name = tx.terminalAddress || "";
                if (name) {
                    counts[name] = (counts[name] || 0) + 1;
                    if (counts[name] > maxCount) {
                        maxCount = counts[name];
                        maxName = name;
                    }
                }
            });
            if (maxName) {
                const cleaned = cleanTerminalAddress(maxName);
                if (cleaned && cleaned.length > 2) {
                    return cleaned;
                }
            }
        }
        return merchant.mrchDbaName || merchant.mrchName || "Неизвестный мерчант";
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
                    <Tabs defaultActiveKey="1">
                        <TabPane tab="Управление подписками" key="1">
                            <div style={{ padding: "12px 0" }}>
                                <p style={{ color: isDark ? "#94a3b8" : "#64748b", marginBottom: 16 }}>
                                    Список сервисов (Card-on-File), где сохранена ваша карта. Вы можете заблокировать автоматические списания от любого из них.
                                </p>
                                {(() => {
                                    const activeSubscriptions = cofData.filter(merchant => {
                                        const mrchName = getMerchantDisplayName(merchant, transactions);
                                        return !isMerchantBlocked(mrchName);
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
                                                                    onClick={() => handleBlockMerchantDirectly(mrchName)}
                                                                >
                                                                    Блокировать списания
                                                                </Button>
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
                        <TabPane tab="Активные блокировки" key="2">
                            <div style={{ padding: "12px 0" }}>
                                <p style={{ color: isDark ? "#94a3b8" : "#64748b", marginBottom: 16 }}>
                                    Список действующих блокировок VISA на автосписания. Вы можете отменить любую из них для возобновления платежей.
                                </p>
                                {stops.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "40px 0", color: isDark ? "#64748b" : "#94a3b8", fontSize: "14px" }}>
                                        Нет действующих блокировок
                                    </div>
                                ) : (
                                    <div style={{ 
                                        display: "flex", 
                                        flexDirection: "column", 
                                        gap: "12px" 
                                    }}>
                                        {stops.map((stop, idx) => {
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
                                                            {renderLogo("", displayMerchantName)}
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
                                                        </div>
                                                    </div>
                                                    {renderPreviousPayments(stopMcc, displayMerchantName)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </TabPane>
                        <TabPane tab="Добавить вручную" key="3">
                            <Form form={form} layout="vertical" onFinish={handleAddStop} style={{ padding: "12px 0" }}>
                                <Form.Item 
                                    name="merchantName" 
                                    label="Название мерчанта (Netflix, Yandex и т.д.)"
                                    rules={[{ required: true, message: "Введите название мерчанта" }]}
                                >
                                    <Input placeholder="Например: NETFLIX" />
                                </Form.Item>
                                
                                <Form.Item 
                                    name="duration" 
                                    label="Длительность блокировки (в месяцах, макс 60)"
                                    rules={[{ required: true, message: "Укажите длительность" }]}
                                >
                                    <InputNumber min={1} max={60} style={{ width: '100%' }} placeholder="12" />
                                </Form.Item>

                                <Form.Item 
                                    name="startDate" 
                                    label="Дата начала"
                                    rules={[{ required: true, message: "Выберите дату" }]}
                                >
                                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                                </Form.Item>

                                <Form.Item name="recurringAndInstallmentIndicator" label="Повторяющиеся платежи (автоматические)" valuePropName="checked" initialValue={true}>
                                    <Switch />
                                </Form.Item>

                                <Form.Item name="cancelSubscription" label="Отменить подписку на стороне VISA" valuePropName="checked" initialValue={true}>
                                    <Switch />
                                </Form.Item>

                                <Button type="primary" htmlType="submit" block style={{ borderRadius: "8px", fontWeight: "bold", height: "40px", marginTop: "12px" }}>
                                    Создать ограничение
                                </Button>
                            </Form>
                        </TabPane>
                    </Tabs>
                </Spin>
            </Modal>
        </ConfigProvider>
    );
};

export default VSMModal;
