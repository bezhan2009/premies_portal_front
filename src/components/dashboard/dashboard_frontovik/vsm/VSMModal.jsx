import React, { useState, useEffect } from "react";
import { Modal, Spin, message, Button, Tabs, Form, Input, DatePicker, Select, Switch, InputNumber } from "antd";
import { searchStops, addMerchantStop, getCofDataInfo, cancelStopInstruction } from "../../../../services/vsmService";
import { logAuditAction } from "../../../../utils/auditLogger";

const { TabPane } = Tabs;

const VSMModal = ({ isOpen, onClose, card, accountsData }) => {
    const [loading, setLoading] = useState(false);
    const [stops, setStops] = useState([]);
    const [cofData, setCofData] = useState([]);
    const [form] = Form.useForm();
    
    // Auto-select the first account number if available
    const initialAccount = card?.details?.accounts?.[0]?.number || 
                           card?.accounts?.[0]?.accountNumber || 
                           card?.accounts?.[0]?.number || "";

    const [selectedAccount, setSelectedAccount] = useState(initialAccount);

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
            const [stopsRes, cofRes] = await Promise.all([
                searchStops(card.cardId, accountNum, true),
                getCofDataInfo(card.cardId, accountNum).catch(err => {
                    console.error("Failed to fetch COF data:", err);
                    return null;
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
        Modal.confirm({
            title: `Заблокировать списания от ${mrchName}?`,
            content: (
                <div>
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
                            <p style={{ color: "#64748b", marginBottom: 16 }}>
                                Список сервисов (Card-on-File), где сохранена ваша карта. Вы можете заблокировать автоматические списания от любого из них.
                            </p>
                            {cofData.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: "14px" }}>
                                    Нет сохраненных активных подписок/сервисов (Card-on-File)
                                </div>
                            ) : (
                                <div style={{ 
                                    display: "flex", 
                                    flexDirection: "column", 
                                    gap: "12px" 
                                }}>
                                    {cofData.map((merchant, idx) => {
                                        const mrchName = merchant.mrchDbaName || merchant.mrchName || "Неизвестный мерчант";
                                        const isBlocked = isMerchantBlocked(mrchName);
                                        
                                        return (
                                            <div 
                                                key={idx}
                                                style={{
                                                    background: "#ffffff",
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: "12px",
                                                    padding: "16px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: "16px",
                                                    boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
                                                    transition: "transform 0.2s, box-shadow 0.2s"
                                                }}
                                                className="subscription-card"
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 2, minWidth: 0 }}>
                                                    {renderLogo(merchant.mrchLogoURL, mrchName)}
                                                    <div style={{ minWidth: 0 }}>
                                                        <h4 style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={mrchName}>{mrchName}</h4>
                                                        <span style={{ fontSize: "11px", color: "#64748b" }}>MCC: {merchant.mCC}</span>
                                                    </div>
                                                </div>
                                                
                                                <div style={{ display: "flex", gap: "24px", flex: 3, fontSize: "13px", color: "#475569" }}>
                                                    <div>
                                                        <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>Всего транзакций</span>
                                                        <strong style={{ color: "#0f172a" }}>{merchant.totalTranCount || "0"}</strong>
                                                    </div>
                                                    <div>
                                                        <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>Последний платеж</span>
                                                        <strong style={{ color: "#0f172a" }}>{merchant.lastTranAmt ? `${Number(merchant.lastTranAmt).toFixed(2)} ${merchant.lastTranCurrency}` : "-"}</strong>
                                                    </div>
                                                    <div>
                                                        <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>Дата платежа</span>
                                                        <strong style={{ color: "#0f172a" }}>{merchant.lastMrchTranDt || "-"}</strong>
                                                    </div>
                                                </div>

                                                <div style={{ flex: 1.5, textAlign: "right" }}>
                                                    <Button 
                                                        type={isBlocked ? "default" : "primary"}
                                                        danger={!isBlocked}
                                                        disabled={isBlocked}
                                                        style={{ 
                                                            borderRadius: "8px", 
                                                            fontWeight: "bold",
                                                            width: "100%",
                                                            background: isBlocked ? "#f1f5f9" : undefined,
                                                            color: isBlocked ? "#94a3b8" : undefined
                                                        }}
                                                        onClick={() => handleBlockMerchantDirectly(mrchName)}
                                                    >
                                                        {isBlocked ? "Заблокировано" : "Блокировать списания"}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TabPane>
                    <TabPane tab="Активные блокировки" key="2">
                        <div style={{ padding: "12px 0" }}>
                            <p style={{ color: "#64748b", marginBottom: 16 }}>
                                Список действующих блокировок VISA на автосписания. Вы можете отменить любую из них для возобновления платежей.
                            </p>
                            {stops.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: "14px" }}>
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
                                        
                                        return (
                                            <div 
                                                key={stop.stopInstructionId || idx}
                                                style={{
                                                    background: "#ffffff",
                                                    border: "1px solid #fee2e2",
                                                    borderRadius: "12px",
                                                    padding: "16px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: "16px",
                                                    boxShadow: "0 4px 6px rgba(239, 68, 68, 0.02)"
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 2, minWidth: 0 }}>
                                                    {renderLogo("", displayMerchantName)}
                                                    <div style={{ minWidth: 0 }}>
                                                        <h4 style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayMerchantName}>{displayMerchantName}</h4>
                                                        <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>Активное ограничение</span>
                                                    </div>
                                                </div>

                                                <div style={{ display: "flex", gap: "24px", flex: 3, fontSize: "13px", color: "#475569" }}>
                                                    <div>
                                                        <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>ID инструкции</span>
                                                        <strong style={{ color: "#0f172a" }}>{stop.stopInstructionId || "-"}</strong>
                                                    </div>
                                                    <div>
                                                        <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>Дата начала</span>
                                                        <strong style={{ color: "#0f172a" }}>{stop.startDate || "-"}</strong>
                                                    </div>
                                                    <div>
                                                        <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>Дата окончания</span>
                                                        <strong style={{ color: "#0f172a" }}>{stop.endDate || "-"}</strong>
                                                    </div>
                                                </div>

                                                <div style={{ flex: 1.5, textAlign: "right" }}>
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
    );
};

export default VSMModal;
