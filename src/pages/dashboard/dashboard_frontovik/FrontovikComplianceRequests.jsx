import React, { useEffect, useState } from "react";
import { Button, Card, Empty, Modal, Spin, Table, Tag, message } from "antd";
import { Building2, CalendarDays, CreditCard, Eye, FileImage, FileText, Hash, Phone } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { fetchMyComplianceRequests } from "../../../api/complianceRequests.js";
import { getClientDocumentsByINN } from "../../../api/clientsDataFiles/clientsDataFiles.js";
import DocumentPreviewModal from "../../../components/client-documents/DocumentPreviewModal.jsx";
import {
  getClientDocumentTypeLabel,
  resolveClientDocumentUrl,
} from "../../../utils/clientDocuments.js";
import "../../../styles/ComplianceRequests.scss";

const statusMeta = {
  pending: { color: "gold", label: "На проверке" },
  approved: { color: "green", label: "Одобрено" },
  rejected: { color: "red", label: "Отклонено" },
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
};

const yesNo = (value) => value ? "Да" : "Нет";
const emptyValue = (value) => value === null || value === undefined || value === "" ? "—" : value;

const requestDetailCards = (request) => [
  { icon: Phone, label: "Телефон", value: request.client_phone },
  { icon: CreditCard, label: "Карта", value: request.client_full_name },
  { icon: Hash, label: "ИНН", value: request.client_identifier },
  { icon: Building2, label: "Офис получения", value: request.office_name || request.department_name },
  { icon: CalendarDays, label: "Дата создания", value: formatDateTime(request.created_at) },
  { icon: Eye, label: "Оператор", value: request.creator_username },
];

const requestInfoRows = (request) => [
  ["Дата рождения", request.client_birth_date],
  ["Резидент", yesNo(request.is_resident)],
  ["FATCA", yesNo(request.fatca)],
  ["АПЛ/ПЗЛ", yesNo(request.apl_pzl)],
  ["Род деятельности", request.client_occupation],
  ["Источник средств", request.net_worth],
  ["Метод открытия счета", request.monthly_income],
  ["Сумма ежемесячных транзакций", request.total_outgoing_transactions_amount],
  ["Количество ежемесячных транзакций", request.total_outgoing_transactions_count],
  ["Сумма кассовых сделок", request.total_cash_transactions_amount],
  ["Количество кассовых сделок", request.total_cash_transactions_count],
  ["Балл Compliance", request.compliance_score ?? 0],
  ["Совпадение Compliance", request.compliance_matched ? "Найдено" : "Не найдено"],
  ["Последнее изменение", formatDateTime(request.updated_at)],
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

export default function FrontovikComplianceRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [clientDocuments, setClientDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  const loadRequests = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchMyComplianceRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      if (!silent) message.error(error.message || "Не удалось загрузить заявки");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    const intervalId = window.setInterval(() => loadRequests({ silent: true }), 15000);
    const handleFocus = () => loadRequests({ silent: true });
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    if (!requestId || !requests.length) return;
    const request = requests.find((item) => String(item.id) === String(requestId));
    if (request) setSelected(request);
  }, [requests, searchParams]);

  useEffect(() => {
    if (!selected?.client_identifier) {
      setClientDocuments([]);
      setDocumentsLoading(false);
      return;
    }

    let cancelled = false;
    setDocumentsLoading(true);
    getClientDocumentsByINN(selected.client_identifier)
      .then((data) => {
        if (!cancelled) setClientDocuments(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Error fetching client documents:", error);
        if (!cancelled) setClientDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.client_identifier]);

  const closeDetails = () => {
    setSelected(null);
    setClientDocuments([]);
    setPreviewDocument(null);
    if (searchParams.has("requestId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("requestId");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const columns = [
    { title: "№ заявки", dataIndex: "id", key: "id", width: 110 },
    {
      title: "Дата и время создания",
      dataIndex: "created_at",
      key: "created_at",
      render: formatDateTime,
    },
    { title: "ФИО клиента", dataIndex: "client_full_name", key: "client_full_name" },
    {
      title: "ИНН / идентификатор",
      dataIndex: "client_identifier",
      key: "client_identifier",
      render: (value) => value || "—",
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      render: (value) => {
        const meta = statusMeta[value] || statusMeta.pending;
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Последнее изменение",
      dataIndex: "updated_at",
      key: "updated_at",
      render: formatDateTime,
    },
    {
      title: "Действия",
      key: "actions",
      render: (_, record) => <Button onClick={() => setSelected(record)}>Открыть</Button>,
    },
  ];
  const availableDocuments = clientDocuments.filter((document, index, items) => {
    const url = resolveClientDocumentUrl(document);
    return url && items.findIndex((item) => resolveClientDocumentUrl(item) === url) === index;
  });
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
      <Card
        title="Заявки на Compliance"
        extra={<Button onClick={() => loadRequests()} loading={loading}>Обновить</Button>}
        style={{ margin: 20 }}
      >
        <Table
          rowKey="id"
          dataSource={requests}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1050 }}
          locale={{ emptyText: "Вы ещё не отправляли заявок на проверку Compliance" }}
        />

        <Modal
          title={null}
          open={Boolean(selected)}
          onCancel={closeDetails}
          footer={null}
          width={980}
          className="compliance-request-modal"
          closeIcon={null}
        >
          {selected && (
            <div className="compliance-request-details">
              <header className="compliance-request-hero">
                <div>
                  <div className="compliance-request-title-row">
                    <h2>Заявка #{selected.id}</h2>
                    <Tag color={(statusMeta[selected.status] || statusMeta.pending).color}>
                      {(statusMeta[selected.status] || statusMeta.pending).label}
                    </Tag>
                  </div>
                  <p>{emptyValue(selected.client_full_name)}</p>
                </div>
                <button type="button" onClick={closeDetails} aria-label="Закрыть">×</button>
              </header>

              <section className="compliance-detail-grid">
                {requestDetailCards(selected).map(({ icon, label, value }) => {
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
                  {requestInfoRows(selected).map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{emptyValue(value)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="compliance-section-card">
                <Button onClick={closeDetails}>Закрыть</Button>
              </section>
            </div>
          )}
        </Modal>
      </Card>
      <DocumentPreviewModal
        isOpen={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
      />
    </>
  );
}
