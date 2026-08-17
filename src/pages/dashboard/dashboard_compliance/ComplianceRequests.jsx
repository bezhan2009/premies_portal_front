import React, { useEffect, useState } from "react";
import { Table, Button, Space, Modal, Typography, Card, Tag, message, Spin, Empty } from "antd";
import { Building2, CalendarDays, CreditCard, Eye, FileImage, FileText, Hash, Phone } from "lucide-react";
import { getClientDocumentsByINN } from "../../../api/clientsDataFiles/clientsDataFiles.js";
import DocumentPreviewModal from "../../../components/client-documents/DocumentPreviewModal.jsx";
import {
    getClientDocumentTypeLabel,
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

const detailCards = (selectedRequest, selectedApp, appFullName) => [
    { icon: Phone, label: "Телефон", value: selectedRequest.client_phone || selectedApp?.phone_number },
    { icon: CreditCard, label: "Карта", value: selectedApp?.card_name || selectedRequest.client_full_name || appFullName },
    { icon: Hash, label: "ИНН", value: selectedRequest.client_identifier || selectedApp?.inn },
    { icon: Building2, label: "Офис получения", value: selectedApp?.receiving_office || selectedApp?.office_name || selectedApp?.department_name },
    { icon: CalendarDays, label: "Дата создания", value: formatDateTime(selectedRequest.created_at || selectedApp?.CreatedAt) },
    { icon: Eye, label: "Оператор", value: selectedRequest.creator_username || selectedApp?.request_creator || selectedApp?.request_сreator },
];

const complianceInfoRows = (selectedRequest) => [
    ["Дата рождения", selectedRequest.client_birth_date],
    ["Резидент", yesNo(selectedRequest.is_resident)],
    ["FATCA", yesNo(selectedRequest.fatca)],
    ["АПЛ/ПЗЛ", yesNo(selectedRequest.apl_pzl)],
    ["Род деятельности", selectedRequest.client_occupation],
    ["Источник средств", selectedRequest.net_worth],
    ["Метод открытия счета", selectedRequest.monthly_income],
    ["Сумма ежемесячных транзакций", selectedRequest.total_outgoing_transactions_amount],
    ["Количество ежемесячных транзакций", selectedRequest.total_outgoing_transactions_count],
    ["Сумма кассовых сделок", selectedRequest.total_cash_transactions_amount],
    ["Количество кассовых сделок", selectedRequest.total_cash_transactions_count],
    ["Балл Compliance", selectedRequest.compliance_score ?? 0],
    ["Совпадение Compliance", selectedRequest.compliance_matched ? "Найдено" : "Не найдено"],
];

const findDocumentByType = (documents, type) =>
    documents.find((document) => document?.document_type === type) || null;

const PassportScanCard = ({ title, document, onPreview }) => {
    const url = document ? resolveClientDocumentUrl(document) : "";
    return (
        <button
            type="button"
            className={`compliance-passport-scan ${url ? "has-file" : ""}`}
            onClick={() => url && onPreview(document)}
            disabled={!url}
        >
            <span className="compliance-passport-scan__preview">
                {url ? <img src={url} alt={title} /> : <><FileImage size={30} /><b>Нет файла</b></>}
            </span>
            <span>{title}</span>
        </button>
    );
};

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
    const appFullName = selectedApp
        ? [selectedApp.surname, selectedApp.name, selectedApp.patronymic].filter(Boolean).join(" ")
        : "";
    const requestStatus = statusMeta[selectedRequest?.status] || statusMeta.pending;
    const bestMatch = selectedRequest ? getBestMatch(selectedRequest) : null;
    const passportScans = [
        { type: "front_side_of_the_passport", title: "Лицевая сторона" },
        { type: "back_side_of_the_passport", title: "Задняя сторона" },
        { type: "selfie_with_passport", title: "Скан с лицом" },
    ].map((slot) => ({
        ...slot,
        document: findDocumentByType(availableDocuments, slot.type),
    }));
    const loadedPassportScans = passportScans.filter((slot) => slot.document).length;

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
                title={null}
                open={appModalVisible}
                onCancel={closeDetails}
                footer={null}
                width={980}
                className="compliance-request-modal"
                closeIcon={null}
            >
                {appLoading ? (
                    <div className="compliance-request-modal__loading">
                        <Spin size="large" />
                    </div>
                ) : selectedRequest ? (
                    <div className="compliance-request-details">
                        <header className="compliance-request-hero">
                            <div>
                                <div className="compliance-request-title-row">
                                    <h2>Заявка #{selectedRequest.id}</h2>
                                    <Tag color={requestStatus.color}>{requestStatus.label}</Tag>
                                </div>
                                <p>{emptyValue(selectedRequest.client_full_name || appFullName)}</p>
                            </div>
                            <button type="button" onClick={closeDetails} aria-label="Закрыть">×</button>
                        </header>

                        <section className="compliance-detail-grid">
                            {detailCards(selectedRequest, selectedApp, appFullName).map(({ icon, label, value }) => {
                                const DetailIcon = icon;
                                return (
                                    <article key={label} className="compliance-detail-tile">
                                        <DetailIcon size={20} />
                                        <span>{label}</span>
                                        <strong>{emptyValue(value)}</strong>
                                    </article>
                                );
                            })}
                        </section>

                        <section className="compliance-section-card">
                            <div className="compliance-section-title">
                                <h3>Сканы паспорта</h3>
                                <span>Загружено {loadedPassportScans} из 3</span>
                            </div>
                            {documentsLoading ? (
                                <div className="compliance-documents__loading"><Spin size="small" /> Загрузка документов…</div>
                            ) : (
                                <div className="compliance-passport-grid">
                                    {passportScans.map((slot) => (
                                        <PassportScanCard
                                            key={slot.type}
                                            title={slot.title}
                                            document={slot.document}
                                            onPreview={setPreviewDocument}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="compliance-section-card">
                            <div className="compliance-section-title">
                                <h3>Все документы</h3>
                                <span>{availableDocuments.length} файл(ов)</span>
                            </div>
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
                        </section>

                        <section className="compliance-section-card">
                            <div className="compliance-section-title">
                                <h3>Данные клиента и проверки</h3>
                                <span>Все параметры заявки</span>
                            </div>
                            <div className="compliance-info-list">
                                {complianceInfoRows(selectedRequest).map(([label, value]) => (
                                    <div key={label}>
                                        <span>{label}</span>
                                        <strong>{emptyValue(value)}</strong>
                                    </div>
                                ))}
                                <div>
                                    <span>Вероятность совпадения</span>
                                    <strong>{emptyValue(selectedRequest.match_similarity)}{selectedRequest.match_similarity !== null && selectedRequest.match_similarity !== undefined ? "%" : ""}</strong>
                                </div>
                                <div>
                                    <span>Источник совпадения</span>
                                    <strong>{emptyValue(bestMatch?.source)}</strong>
                                </div>
                                <div>
                                    <span>Найденное имя</span>
                                    <strong>{emptyValue(bestMatch?.data?.full_name)}</strong>
                                </div>
                                <div>
                                    <span>Последнее изменение</span>
                                    <strong>{formatDateTime(selectedRequest.updated_at || selectedApp?.UpdatedAt)}</strong>
                                </div>
                            </div>
                        </section>

                        <section className="compliance-section-card">
                            <div className="compliance-section-title">
                                <h3>Действия Compliance</h3>
                                <span>{requestStatus.label}</span>
                            </div>
                            {(!selectedRequest.status || selectedRequest.status.toLowerCase() === "pending") ? (
                                <Space wrap>
                                    <Button type="primary" onClick={() => confirmAction(selectedRequest, "approved")}>Одобрить</Button>
                                    <Button danger onClick={() => confirmAction(selectedRequest, "rejected")}>Отклонить</Button>
                                </Space>
                            ) : (
                                <Text type="secondary">Решение по заявке уже принято: {requestStatus.label.toLowerCase()}.</Text>
                            )}
                        </section>
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
