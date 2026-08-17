import React, { useEffect, useState } from "react";
import { Table, Button, Space, Modal, Typography, Card, Tag, message, Spin, Descriptions, Empty } from "antd";
import { FileText, ImageOff, UserRound } from "lucide-react";
import { getClientDocumentsByINN } from "../../../api/clientsDataFiles/clientsDataFiles.js";
import DocumentPreviewModal from "../../../components/client-documents/DocumentPreviewModal.jsx";
import {
    getClientDocumentTypeLabel,
    getClientSelfieDocument,
    resolveClientDocumentUrl,
} from "../../../utils/clientDocuments.js";
import "../../../styles/ComplianceRequests.scss";

const { Text } = Typography;

const statusMeta = {
    pending: { color: "gold", label: "На проверке" },
    approved: { color: "green", label: "Одобрено" },
    rejected: { color: "red", label: "Отклонено" },
};

const emptyValue = (value) => value === null || value === undefined || value === "" ? "—" : value;
const yesNo = (value) => value ? "Да" : "Нет";
const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "medium" }).format(date);
};

const applicationDocument = (path, documentType, title) => path ? ({
    id: `${documentType}-${path}`,
    path,
    source: "applications_portal",
    document_type: documentType,
    title,
}) : null;

export default function ComplianceRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [appModalVisible, setAppModalVisible] = useState(false);
    const [appLoading, setAppLoading] = useState(false);
    const [clientDocuments, setClientDocuments] = useState([]);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [previewDocument, setPreviewDocument] = useState(null);
    const [photoFailed, setPhotoFailed] = useState(false);

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
        setSelectedRequest(record);
        setSelectedApp(null);
        setClientDocuments([]);
        setPreviewDocument(null);
        setPhotoFailed(false);
        setAppLoading(false);
        setAppModalVisible(true);
        if (record.client_identifier) {
            setDocumentsLoading(true);
            getClientDocumentsByINN(record.client_identifier)
                .then((data) => setClientDocuments(Array.isArray(data) ? data : []))
                .catch((error) => {
                    console.error("Error fetching client documents:", error);
                    setClientDocuments([]);
                })
                .finally(() => setDocumentsLoading(false));
        } else {
            setDocumentsLoading(false);
        }
        if (!record.application_id) {
            return;
        }
        setAppLoading(true);
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
                } catch {
                    // Keep the default message when the backend body is not JSON.
                }
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
            setSelectedRequest((current) => current?.id === record.id ? { ...current, status, updated_at: new Date().toISOString() } : current);
            fetchRequests(); // refresh data
        } catch (error) {
            console.error("Error updating status:", error);
            message.error(`Ошибка: ${error.message || "при обновлении статуса"}`);
        }
    };

    const confirmAction = (record, status) => {
        const actionText = status === 'approved' ? 'принять' : 'отклонить';
        if (window.confirm(`Вы уверены, что хотите ${actionText} эту заявку?`)) {
            handleStatusUpdate(record, status);
        }
    };

    const parseBestMatch = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "object") return [value];

        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return [];
        }
    };

    const getBestMatch = (record) =>
        parseBestMatch(record.best_match)
            .filter(Boolean)
            .sort((a, b) => Number(b.similarity || 0) - Number(a.similarity || 0))[0] || null;

    const closeDetails = () => {
        setAppModalVisible(false);
        setSelectedApp(null);
        setSelectedRequest(null);
        setClientDocuments([]);
        setPreviewDocument(null);
        setPhotoFailed(false);
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
            render: emptyValue,
        },
        {
            title: "Телефон",
            dataIndex: "client_phone",
            key: "client_phone",
            render: emptyValue,
        },
        {
            title: "ИНН / идентификатор",
            dataIndex: "client_identifier",
            key: "client_identifier",
            render: (value) => value || "-",
        },
        {
            title: "Вероятность совпадения (%)",
            dataIndex: "match_similarity",
            key: "match_similarity",
            render: (val) => <Text type="danger">{val === null || val === undefined || val === "" ? "—" : `${val}%`}</Text>
        },
        {
            title: "Совпадение",
            key: "best_match",
            width: 320,
            render: (_, record) => {
                const match = getBestMatch(record);
                if (!match) {
                    return <Text type="secondary">-</Text>;
                }

                return (
                    <Space direction="vertical" size={2} style={{ maxWidth: 300 }}>
                        <Text strong>{match.source || "-"}</Text>
                        <Text>{match.data?.full_name || "-"}</Text>
                        <Text type="secondary">
                            similarity: {Number(match.similarity || 0).toFixed(2)}
                        </Text>
                        <Text code style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                            {JSON.stringify([match])}
                        </Text>
                    </Space>
                );
            },
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
                let text = "На проверке";
                if (status === "approved") { color = "green"; text = "Одобрено"; }
                if (status === "rejected") { color = "red"; text = "Отклонено"; }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: "Доп. Инфо",
            key: "extra",
            render: (_, record) => (
                <Space direction="vertical" size="small">
                    <Text>Занятость: {emptyValue(record.client_occupation)}</Text>
                    <Text>Оборот: {emptyValue(record.net_worth)}</Text>
                    <Text>Метод открытия: {emptyValue(record.monthly_income)}</Text>
                    <Text>Транзакции (Сумма/Кол-во): {emptyValue(record.total_outgoing_transactions_amount)} / {emptyValue(record.total_outgoing_transactions_count)}</Text>
                    <Text>Касса (Сумма/Кол-во): {emptyValue(record.total_cash_transactions_amount)} / {emptyValue(record.total_cash_transactions_count)}</Text>
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
                    {(!record.status || record.status.toLowerCase() === "pending") && (
                        <Space>
                            <Button type="primary" onClick={() => confirmAction(record, "approved")}>
                                Одобрить
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

    const applicationDocuments = selectedApp ? [
        applicationDocument(selectedApp.front_side_of_the_passport, "front_side_of_the_passport", "Лицевая сторона паспорта"),
        applicationDocument(selectedApp.back_side_of_the_passport, "back_side_of_the_passport", "Обратная сторона паспорта"),
        applicationDocument(selectedApp.selfie_with_passport, "selfie_with_passport", "Селфи с паспортом"),
    ].filter(Boolean) : [];
    const availableDocuments = [...clientDocuments, ...applicationDocuments].filter((document, index, items) => {
        const url = resolveClientDocumentUrl(document);
        return url && items.findIndex((item) => resolveClientDocumentUrl(item) === url) === index;
    });
    const selfieDocument = getClientSelfieDocument(availableDocuments);
    const photoUrl = selfieDocument ? resolveClientDocumentUrl(selfieDocument) : "";
    const appFullName = selectedApp
        ? [selectedApp.surname, selectedApp.name, selectedApp.patronymic].filter(Boolean).join(" ")
        : "";
    const requestStatus = statusMeta[selectedRequest?.status] || statusMeta.pending;
    const bestMatch = selectedRequest ? getBestMatch(selectedRequest) : null;

    return (
        <>
            <Card title="Заявки на проверку Комплайнс" style={{ margin: "20px" }}>
                <Table
                    dataSource={requests}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 1500 }}
                />
            </Card>

            <Modal
                title={`Детали заявки #${selectedRequest?.id || selectedApp?.ID || ""}`}
                open={appModalVisible}
                onCancel={closeDetails}
                footer={[
                    selectedRequest && (!selectedRequest.status || selectedRequest.status.toLowerCase() === "pending") ? (
                        <Button key="approve" type="primary" onClick={() => confirmAction(selectedRequest, "approved")}>Одобрить</Button>
                    ) : null,
                    selectedRequest && (!selectedRequest.status || selectedRequest.status.toLowerCase() === "pending") ? (
                        <Button key="reject" danger onClick={() => confirmAction(selectedRequest, "rejected")}>Отклонить</Button>
                    ) : null,
                    <Button key="close" onClick={closeDetails}>
                        Закрыть
                    </Button>
                ].filter(Boolean)}
                width={960}
                className="compliance-request-modal"
            >
                {appLoading ? (
                    <div className="compliance-request-modal__loading">
                        <Spin size="large" />
                    </div>
                ) : selectedRequest ? (
                    <div className="compliance-request-details">
                        <section className="compliance-client-card">
                            <div className="compliance-client-photo">
                                {photoUrl && !photoFailed ? (
                                    <img src={photoUrl} alt="Фото клиента" onError={() => setPhotoFailed(true)} />
                                ) : (
                                    <div className="compliance-client-photo__placeholder">
                                        {photoFailed ? <ImageOff size={30} /> : <UserRound size={34} />}
                                        <span>Фото отсутствует</span>
                                    </div>
                                )}
                            </div>
                            <div className="compliance-client-info">
                                <h3>Информация о клиенте</h3>
                                <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                                    <Descriptions.Item label="ФИО" span={2}>{emptyValue(selectedRequest.client_full_name || appFullName)}</Descriptions.Item>
                                    <Descriptions.Item label="ИНН">{emptyValue(selectedRequest.client_identifier || selectedApp?.inn)}</Descriptions.Item>
                                    <Descriptions.Item label="Телефон">{emptyValue(selectedRequest.client_phone || selectedApp?.phone_number)}</Descriptions.Item>
                                    <Descriptions.Item label="Дата рождения">{emptyValue(selectedRequest.client_birth_date || selectedApp?.date_of_birth)}</Descriptions.Item>
                                    <Descriptions.Item label="Резидентство">{yesNo(selectedRequest.is_resident ?? selectedApp?.is_resident)}</Descriptions.Item>
                                    <Descriptions.Item label="FATCA">{yesNo(selectedRequest.fatca)}</Descriptions.Item>
                                    <Descriptions.Item label="АПЛ/ПЗЛ">{yesNo(selectedRequest.apl_pzl)}</Descriptions.Item>
                                    <Descriptions.Item label="Род деятельности">{emptyValue(selectedRequest.client_occupation)}</Descriptions.Item>
                                </Descriptions>
                            </div>
                        </section>

                        <Card title="Информация о заявке" size="small">
                            <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                                <Descriptions.Item label="Номер заявки">{emptyValue(selectedRequest.id)}</Descriptions.Item>
                                <Descriptions.Item label="Статус"><Tag color={requestStatus.color}>{requestStatus.label}</Tag></Descriptions.Item>
                                <Descriptions.Item label="Дата создания">{formatDateTime(selectedRequest.created_at || selectedApp?.CreatedAt)}</Descriptions.Item>
                                <Descriptions.Item label="Последнее изменение">{formatDateTime(selectedRequest.updated_at || selectedApp?.UpdatedAt)}</Descriptions.Item>
                                <Descriptions.Item label="Сотрудник" span={2}>{emptyValue(selectedRequest.creator_username || selectedApp?.request_creator || selectedApp?.request_сreator)}</Descriptions.Item>
                                <Descriptions.Item label="Источник средств">{emptyValue(selectedRequest.net_worth)}</Descriptions.Item>
                                <Descriptions.Item label="Ежемесячный доход">{emptyValue(selectedRequest.monthly_income)}</Descriptions.Item>
                            </Descriptions>
                        </Card>

                        <Card title="Проверка Compliance" size="small">
                            <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                                <Descriptions.Item label="Балл Compliance">{emptyValue(selectedRequest.compliance_score ?? 0)}</Descriptions.Item>
                                <Descriptions.Item label="Совпадение">{selectedRequest.compliance_matched ? "Найдено" : "Не найдено"}</Descriptions.Item>
                                <Descriptions.Item label="Вероятность совпадения">{emptyValue(selectedRequest.match_similarity)}{selectedRequest.match_similarity !== null && selectedRequest.match_similarity !== undefined ? "%" : ""}</Descriptions.Item>
                                <Descriptions.Item label="Источник совпадения">{emptyValue(bestMatch?.source)}</Descriptions.Item>
                                {bestMatch?.data?.full_name && <Descriptions.Item label="Найденное имя" span={2}>{bestMatch.data.full_name}</Descriptions.Item>}
                            </Descriptions>
                        </Card>

                        <Card title="Документы" size="small">
                            {documentsLoading ? (
                                <div className="compliance-documents__loading"><Spin size="small" /> Загрузка документов…</div>
                            ) : availableDocuments.length ? (
                                <div className="compliance-documents">
                                    {availableDocuments.map((document) => (
                                        <Button key={document.id || document.ID || document.path} icon={<FileText size={16} />} onClick={() => setPreviewDocument(document)}>
                                            {getClientDocumentTypeLabel(document.document_type, document.title)}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Документ отсутствует" />
                            )}
                        </Card>

                        <Card title="Действия Compliance" size="small">
                            {(!selectedRequest.status || selectedRequest.status.toLowerCase() === "pending") ? (
                                <Space wrap>
                                    <Button type="primary" onClick={() => confirmAction(selectedRequest, "approved")}>Одобрить</Button>
                                    <Button danger onClick={() => confirmAction(selectedRequest, "rejected")}>Отклонить</Button>
                                </Space>
                            ) : (
                                <Text type="secondary">Решение по заявке уже принято: {requestStatus.label.toLowerCase()}.</Text>
                            )}
                        </Card>
                    </div>
                ) : (
                    <Empty description="Данные заявки отсутствуют" />
                )}
            </Modal>
            <DocumentPreviewModal
                isOpen={Boolean(previewDocument)}
                onClose={() => setPreviewDocument(null)}
                document={previewDocument}
            />
        </>
    );
}
