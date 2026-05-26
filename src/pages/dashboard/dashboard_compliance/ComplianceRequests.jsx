import React, { useEffect, useState } from "react";
import { Table, Button, Space, Modal, Typography, Card, Tag, message } from "antd";

const { Text } = Typography;

export default function ComplianceRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await fetch(`${backendUrl}/compliance/requests`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch compliance requests");
            }

            const data = await response.json();
            setRequests(data || []);
        } catch (error) {
            console.error("Error fetching compliance requests:", error);
            message.error("Ошибка при загрузке заявок комплаенса");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleStatusUpdate = async (id, status) => {
        try {
            const token = localStorage.getItem("access_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await fetch(`${backendUrl}/compliance/requests/${id}/status`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                throw new Error("Failed to update status");
            }

            message.success(`Заявка успешно ${status === 'approved' ? 'принята' : 'отклонена'}`);
            fetchRequests(); // refresh data
        } catch (error) {
            console.error("Error updating status:", error);
            message.error("Ошибка при обновлении статуса");
        }
    };

    const confirmAction = (id, status) => {
        const actionText = status === 'approved' ? 'принять' : 'отклонить';
        Modal.confirm({
            title: `Вы уверены, что хотите ${actionText} эту заявку?`,
            onOk: () => handleStatusUpdate(id, status),
            okText: "Да",
            cancelText: "Отмена"
        });
    };

    const columns = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
        },
        {
            title: "ФИО Клиента",
            dataIndex: "client_full_name",
            key: "client_full_name",
        },
        {
            title: "Телефон",
            dataIndex: "client_phone",
            key: "client_phone",
        },
        {
            title: "Вероятность совпадения (%)",
            dataIndex: "match_similarity",
            key: "match_similarity",
            render: (val) => <Text type="danger">{val}%</Text>
        },
        {
            title: "Статус",
            dataIndex: "status",
            key: "status",
            render: (status) => {
                let color = "blue";
                let text = "Ожидает";
                if (status === "approved") { color = "green"; text = "Принято"; }
                if (status === "rejected") { color = "red"; text = "Отклонено"; }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: "Доп. Инфо",
            key: "extra",
            render: (_, record) => (
                <Space direction="vertical" size="small">
                    <Text>Занятость: {record.client_occupation}</Text>
                    <Text>Оборот: {record.net_worth}</Text>
                    <Text>Доход: {record.monthly_income}</Text>
                    <Text>Транзакции (Сумма/Кол-во): {record.total_outgoing_transactions_amount} / {record.total_outgoing_transactions_count}</Text>
                    <Text>Касса (Сумма/Кол-во): {record.total_cash_transactions_amount} / {record.total_cash_transactions_count}</Text>
                </Space>
            )
        },
        {
            title: "Действия",
            key: "actions",
            render: (_, record) => (
                record.status === "pending" && (
                    <Space>
                        <Button type="primary" onClick={() => confirmAction(record.id, "approved")}>
                            Принять
                        </Button>
                        <Button danger onClick={() => confirmAction(record.id, "rejected")}>
                            Отклонить
                        </Button>
                    </Space>
                )
            ),
        },
    ];

    return (
        <Card title="Заявки на проверку Комплайнс" style={{ margin: "20px" }}>
            <Table
                dataSource={requests}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />
        </Card>
    );
}
