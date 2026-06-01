import React, { useEffect, useState } from "react";
import { Table, Button, Space, Modal, Typography, Card, Tag, message, Spin } from "antd";

const { Text } = Typography;

export default function ComplianceRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [appModalVisible, setAppModalVisible] = useState(false);
    const [appLoading, setAppLoading] = useState(false);

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

    const handleViewApplication = async (record) => {
        if (!record.application_id) {
            message.warning("ID заявки отсутствует");
            return;
        }
        setAppLoading(true);
        setAppModalVisible(true);
        try {
            const token = localStorage.getItem("access_token");
            const backendAppUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
            const response = await fetch(`${backendAppUrl}/applications/${record.application_id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Не удалось загрузить данные заявки");
            }

            const appData = await response.json();
            setSelectedApp(appData);
        } catch (error) {
            console.error("Error fetching application details:", error);
            message.error("Ошибка при загрузке деталей заявки");
        } finally {
            setAppLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleStatusUpdate = async (record, status) => {
        try {
            const id = record.id;
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
                let errMsg = "Failed to update status";
                try {
                    const errData = await response.json();
                    errMsg = errData.error || errData.message || errMsg;
                } catch (_) {}
                throw new Error(errMsg);
            }

            const contentType = response.headers.get("Content-Type");
            if (contentType && contentType.includes("application/octet-stream")) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                // Get filename from Content-Disposition header if possible
                let filename = "compliance_report.docx";
                const disposition = response.headers.get("Content-Disposition");
                if (disposition && disposition.indexOf("filename=") !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) { 
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            }

            if (status === 'rejected' && record.application_id) {
                const backendAppUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
                await fetch(`${backendAppUrl}/applications/${record.application_id}`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ application_status_id: 7 }),
                });
            }

            message.success(`Заявка успешно ${status === 'approved' ? 'принята' : 'отклонена'}`);
            fetchRequests(); // refresh data
        } catch (error) {
            console.error("Error updating status:", error);
            message.error(`Ошибка: ${error.message || "при обновлении статуса"}`);
        }
    };

    const confirmAction = (record, status) => {
        const actionText = status === 'approved' ? 'принять' : 'отклонить';
        Modal.confirm({
            title: `Вы уверены, что хотите ${actionText} эту заявку?`,
            onOk: () => handleStatusUpdate(record, status),
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
            title: "Балл комплаенса",
            dataIndex: "compliance_score",
            key: "compliance_score",
            render: (val) => <strong style={{ fontSize: "16px", color: "#1890ff" }}>{val || 0}</strong>
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
                    <Text>Метод открытия: {record.monthly_income}</Text>
                    <Text>Транзакции (Сумма/Кол-во): {record.total_outgoing_transactions_amount} / {record.total_outgoing_transactions_count}</Text>
                    <Text>Касса (Сумма/Кол-во): {record.total_cash_transactions_amount} / {record.total_cash_transactions_count}</Text>
                    <Text><b>Балл комплаенса: {record.compliance_score || 0}</b></Text>
                </Space>
            )
        },
        {
            title: "Действия",
            key: "actions",
            render: (_, record) => (
                <Space direction="vertical" size="small">
                    <Button onClick={() => handleViewApplication(record)}>
                        Просмотр
                    </Button>
                    {record.status === "pending" && (
                        <Space>
                            <Button type="primary" onClick={() => confirmAction(record, "approved")}>
                                Принять
                            </Button>
                            <Button danger onClick={() => confirmAction(record, "rejected")}>
                                Отклонить
                            </Button>
                        </Space>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <Card title="Заявки на проверку Комплайнс" style={{ margin: "20px" }}>
                <Table
                    dataSource={requests}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                />
            </Card>

            <Modal
                title={`Детали заявки #${selectedApp?.ID || ""}`}
                open={appModalVisible}
                onCancel={() => {
                    setAppModalVisible(false);
                    setSelectedApp(null);
                }}
                footer={[
                    <Button key="close" onClick={() => {
                        setAppModalVisible(false);
                        setSelectedApp(null);
                    }}>
                        Закрыть
                    </Button>
                ]}
                width={800}
            >
                {appLoading ? (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                        <Spin size="large" />
                    </div>
                ) : selectedApp ? (
                    <div>
                        <Card title="Персональные данные" size="small" style={{ marginBottom: 15 }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Text><b>ФИО:</b> {`${selectedApp.surname || ""} ${selectedApp.name || ""} ${selectedApp.patronymic || ""}`}</Text>
                                <Text><b>Телефон:</b> {selectedApp.phone_number || "-"}</Text>
                                <Text><b>ИНН:</b> {selectedApp.inn || "-"}</Text>
                                <Text><b>Пол:</b> {selectedApp.gender || "-"}</Text>
                                <Text><b>Резидент:</b> {selectedApp.is_resident ? "Да" : "Нет"}</Text>
                            </Space>
                        </Card>

                        <Card title="Детали Карты" size="small" style={{ marginBottom: 15 }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Text><b>Тип карты:</b> {selectedApp.card_type || "-"}</Text>
                                <Text><b>Название карты:</b> {selectedApp.card_name || "-"}</Text>
                                <Text><b>Кодовое слово:</b> {selectedApp.secret_word || "-"}</Text>
                                <Text><b>Адрес доставки:</b> {selectedApp.delivery_address || "-"}</Text>
                                <Text><b>Офис получения:</b> {selectedApp.receiving_office || "-"}</Text>
                            </Space>
                        </Card>

                        <Card title="Скан-копии документов" size="small">
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
                                <div>
                                    <div style={{ marginBottom: 5 }}><b>Лицевая сторона</b></div>
                                    {selectedApp.front_side_of_the_passport ? (
                                        <img
                                            src={`${import.meta.env.VITE_BACKEND_APPLICATION_URL}/uploads/${selectedApp.front_side_of_the_passport.replace(/\\/g, "/")}`}
                                            alt="Лицевая сторона"
                                            style={{ width: "100%", maxHeight: 200, objectFit: "contain", cursor: "pointer", border: "1px solid #ddd" }}
                                            onClick={() => window.open(`${import.meta.env.VITE_BACKEND_APPLICATION_URL}/uploads/${selectedApp.front_side_of_the_passport.replace(/\\/g, "/")}`, "_blank")}
                                        />
                                    ) : <Text type="secondary">Нет файла</Text>}
                                </div>
                                <div>
                                    <div style={{ marginBottom: 5 }}><b>Задняя сторона</b></div>
                                    {selectedApp.back_side_of_the_passport ? (
                                        <img
                                            src={`${import.meta.env.VITE_BACKEND_APPLICATION_URL}/uploads/${selectedApp.back_side_of_the_passport.replace(/\\/g, "/")}`}
                                            alt="Задняя сторона"
                                            style={{ width: "100%", maxHeight: 200, objectFit: "contain", cursor: "pointer", border: "1px solid #ddd" }}
                                            onClick={() => window.open(`${import.meta.env.VITE_BACKEND_APPLICATION_URL}/uploads/${selectedApp.back_side_of_the_passport.replace(/\\/g, "/")}`, "_blank")}
                                        />
                                    ) : <Text type="secondary">Нет файла</Text>}
                                </div>
                                <div>
                                    <div style={{ marginBottom: 5 }}><b>Селфи с паспортом</b></div>
                                    {selectedApp.selfie_with_passport ? (
                                        <img
                                            src={`${import.meta.env.VITE_BACKEND_APPLICATION_URL}/uploads/${selectedApp.selfie_with_passport.replace(/\\/g, "/")}`}
                                            alt="Селфи"
                                            style={{ width: "100%", maxHeight: 200, objectFit: "contain", cursor: "pointer", border: "1px solid #ddd" }}
                                            onClick={() => window.open(`${import.meta.env.VITE_BACKEND_APPLICATION_URL}/uploads/${selectedApp.selfie_with_passport.replace(/\\/g, "/")}`, "_blank")}
                                        />
                                    ) : <Text type="secondary">Нет файла</Text>}
                                </div>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <Text type="secondary">Не удалось загрузить данные</Text>
                )}
            </Modal>
        </>
    );
}
