import React, { useState, useEffect } from "react";
import { Modal, Spin, message, Button, Table, Tabs, Form, Input, DatePicker, Select, Switch, InputNumber } from "antd";
import { searchStops, addMerchantStop } from "../../../../services/vsmService";
import { logAuditAction } from "../../../../utils/auditLogger";

const { TabPane } = Tabs;

const VSMModal = ({ isOpen, onClose, card, accountsData }) => {
    const [loading, setLoading] = useState(false);
    const [stops, setStops] = useState([]);
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
                fetchStops(acc);
            }
        }
    }, [isOpen, card]);

    const fetchStops = async (accountNum) => {
        setLoading(true);
        try {
            const response = await searchStops(card.cardId, accountNum, true);
            if (response && response.searchedStopInstructions) {
                setStops(response.searchedStopInstructions);
            } else {
                setStops([]);
            }
        } catch (error) {
            message.error("Ошибка при загрузке подписок: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
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
            fetchStops(selectedAccount);
        } catch (error) {
            message.error("Ошибка при добавлении подписки: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: "ID",
            dataIndex: "stopInstructionId",
            key: "stopInstructionId",
        },
        {
            title: "Мерчант",
            dataIndex: ["merchantIdentifier", "merchantName"],
            key: "merchantName",
            render: (text) => text || "N/A"
        },
        {
            title: "Статус",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <span style={{ color: status === "Active" ? "green" : "red" }}>{status}</span>
            )
        },
        {
            title: "Начало",
            dataIndex: "startDate",
            key: "startDate",
        },
        {
            title: "Конец",
            dataIndex: "endDate",
            key: "endDate",
        }
    ];

    // Build accounts dropdown
    const availableAccounts = [];
    if (card?.details?.accounts) {
        card.details.accounts.forEach(a => availableAccounts.push(a.number || a.accountNumber));
    }
    if (card?.accounts) {
        card.accounts.forEach(a => availableAccounts.push(a.number || a.accountNumber));
    }
    const uniqueAccounts = [...new Set(availableAccounts)].filter(Boolean);

    return (
        <Modal
            title={`Управление подписками: ${card?.cardNumber || card?.cardId || ''}`}
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={800}
        >
            <Spin spinning={loading}>
                <div style={{ marginBottom: 16 }}>
                    <strong>Выберите счет для запроса: </strong>
                    <Select 
                        value={selectedAccount} 
                        onChange={(val) => {
                            setSelectedAccount(val);
                            fetchStops(val);
                        }}
                        style={{ width: 250, marginLeft: 8 }}
                    >
                        {uniqueAccounts.map(acc => (
                            <Select.Option key={acc} value={acc}>{acc}</Select.Option>
                        ))}
                    </Select>
                </div>

                <Tabs defaultActiveKey="1">
                    <TabPane tab="Активные блокировки / Подписки" key="1">
                        <Table 
                            dataSource={stops} 
                            columns={columns} 
                            rowKey="stopInstructionId" 
                            size="small" 
                            locale={{ emptyText: "Нет данных" }}
                        />
                    </TabPane>
                    <TabPane tab="Добавить ограничение" key="2">
                        <Form form={form} layout="vertical" onFinish={handleAddStop}>
                            <Form.Item 
                                name="merchantName" 
                                label="Название мерчанта (Netflix, Yandex и т.д.)"
                                rules={[{ required: true, message: "Введите название мерчанта" }]}
                            >
                                <Input />
                            </Form.Item>
                            
                            <Form.Item 
                                name="duration" 
                                label="Длительность (в месяцах, макс 60)"
                                rules={[{ required: true, message: "Укажите длительность" }]}
                            >
                                <InputNumber min={1} max={60} style={{ width: '100%' }} />
                            </Form.Item>

                            <Form.Item 
                                name="startDate" 
                                label="Дата начала"
                                rules={[{ required: true, message: "Выберите дату" }]}
                            >
                                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                            </Form.Item>

                            <Form.Item name="recurringAndInstallmentIndicator" label="Повторяющиеся платежи" valuePropName="checked">
                                <Switch />
                            </Form.Item>

                            <Form.Item name="cancelSubscription" label="Отменить подписку на стороне VISA" valuePropName="checked">
                                <Switch />
                            </Form.Item>

                            <Button type="primary" htmlType="submit" block>
                                Сохранить
                            </Button>
                        </Form>
                    </TabPane>
                </Tabs>
            </Spin>
        </Modal>
    );
};

export default VSMModal;
