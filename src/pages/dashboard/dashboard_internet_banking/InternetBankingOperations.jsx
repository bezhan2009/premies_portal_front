import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Collapse, Descriptions, Select, Space, Table, Tag, Typography } from "antd";
import { RefreshCw } from "lucide-react";

import { getInternetBankingOperation, listInternetBankingOperations } from "../../../api/internetBanking.js";

const { Paragraph, Text, Title } = Typography;

const statusMeta = {
  pending_signatures: ["Ожидает подписей", "gold"],
  ready: ["Готова к исполнению", "blue"],
  processing: ["Исполняется", "processing"],
  executed: ["Исполнена", "green"],
  failed: ["Ошибка", "red"],
  rejected: ["Отклонена", "default"],
  revision: ["На доработке", "orange"],
};

function StatusTag({ status }) {
  const [label, color] = statusMeta[status] || [status || "—", "default"];
  return <Tag color={color}>{label}</Tag>;
}

function OperationDetail({ operation, loading }) {
  if (!operation) return <div className="ib-operation-loading">{loading ? "Загрузка параметров…" : "Нет данных"}</div>;
  const descriptionItems = [
    ["Номер операции", operation.operation_number], ["Тип", "Между своими счетами"], ["Статус", <StatusTag status={operation.status} />],
    ["Код клиента", operation.abs_client_code], ["Номер документа", operation.document_number], ["Сумма", `${Number(operation.amount || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ${operation.currency}`],
    ["Счёт отправителя", operation.payer_account], ["Счёт получателя", operation.beneficiary_account], ["ИНН отправителя", operation.payer_inn],
    ["ИНН получателя", operation.beneficiary_inn], ["ФИО/название отправителя", operation.payer_name], ["ФИО/название получателя", operation.beneficiary_name],
    ["Назначение", operation.payment_details], ["Подписи", `${operation.signatures_received || 0} из ${operation.signatures_required || 0}`], ["Ошибка", operation.error_message || "—"],
  ].map(([label, children], index) => ({ key: String(index), label, children: children || "—" }));
  const logItems = (operation.logs || []).map((log) => ({
    key: String(log.id),
    label: <Space><Text strong>{log.stage}</Text><Tag color={log.status === "success" ? "green" : "red"}>{log.status}</Tag><Text type="secondary">{new Date(log.created_at).toLocaleString("ru-RU")}</Text></Space>,
    children: <div className="ib-operation-log"><Text strong>Запрос</Text><pre>{log.request || "—"}</pre><Text strong>Ответ</Text><pre>{log.response || "—"}</pre>{log.error ? <Alert type="error" showIcon message={log.error} /> : null}</div>,
  }));
  return <div className="ib-operation-detail"><Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }} items={descriptionItems} /><div className="ib-operation-logs-heading"><Title level={5}>Логи операции</Title><Paragraph type="secondary">Полный путь операции, включая параметры, запрос и ответ АБС</Paragraph></div><Collapse items={logItems} ghost={false} />{!logItems.length ? <Text type="secondary">Логи ещё не сформированы</Text> : null}</div>;
}

export default function InternetBankingOperations() {
  const [items, setItems] = useState([]);
  const [details, setDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listInternetBankingOperations({ page, pageSize, status, operationType: "own-transfer" });
      setItems(result?.items || []);
      setTotal(result?.total || 0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (expanded, record) => {
    if (!expanded || details[record.ID] || details[record.id]) return;
    const id = record.ID || record.id;
    setLoadingDetails((current) => ({ ...current, [id]: true }));
    try {
      const detail = await getInternetBankingOperation(id);
      setDetails((current) => ({ ...current, [id]: detail }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingDetails((current) => ({ ...current, [id]: false }));
    }
  };

  const columns = [
    { title: "Номер операции", dataIndex: "operation_number", render: (value) => <Text code>{value}</Text> },
    { title: "Сумма", dataIndex: "amount", width: 180, render: (value, row) => `${Number(value || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ${row.currency}` },
    { title: "Статус", dataIndex: "status", width: 190, render: (value) => <StatusTag status={value} /> },
    { title: "Дата", dataIndex: "CreatedAt", width: 190, render: (value, row) => new Date(value || row.created_at).toLocaleString("ru-RU") },
  ];

  return <Card className="ib-section-card" bordered>
    <div className="ib-table-toolbar"><Select value={status} onChange={(value) => { setPage(1); setStatus(value); }} style={{ minWidth: 230 }} options={[{ value: "", label: "Все статусы" }, ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta[0] }))]} /><Button icon={<RefreshCw size={16} />} onClick={load}>Обновить</Button></div>
    {error ? <Alert type="error" showIcon closable message={error} onClose={() => setError("")} /> : null}
    <Table rowKey={(row) => row.ID || row.id} loading={loading} columns={columns} dataSource={items} scroll={{ x: 900 }} expandable={{ onExpand: loadDetail, expandedRowRender: (row) => { const id = row.ID || row.id; return <OperationDetail operation={details[id]} loading={loadingDetails[id]} />; } }} pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); } }} />
  </Card>;
}
