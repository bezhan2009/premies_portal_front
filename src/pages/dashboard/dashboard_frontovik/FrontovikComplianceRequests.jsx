import React, { useEffect, useState } from "react";
import { Button, Card, Descriptions, Modal, Table, Tag, message } from "antd";
import { fetchMyComplianceRequests } from "../../../api/complianceRequests.js";

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

export default function FrontovikComplianceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

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

  return (
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
        title={`Заявка №${selected?.id || ""}`}
        open={Boolean(selected)}
        onCancel={() => setSelected(null)}
        footer={<Button onClick={() => setSelected(null)}>Закрыть</Button>}
        width={760}
      >
        {selected && (
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="ФИО" span={2}>{selected.client_full_name}</Descriptions.Item>
            <Descriptions.Item label="ИНН">{selected.client_identifier || "—"}</Descriptions.Item>
            <Descriptions.Item label="Телефон">{selected.client_phone || "—"}</Descriptions.Item>
            <Descriptions.Item label="Дата рождения">{selected.client_birth_date || "—"}</Descriptions.Item>
            <Descriptions.Item label="Гражданство">{selected.citizenship || "—"}</Descriptions.Item>
            <Descriptions.Item label="Документ" span={2}>{selected.passport_number || "—"}</Descriptions.Item>
            <Descriptions.Item label="Резидент">{yesNo(selected.is_resident)}</Descriptions.Item>
            <Descriptions.Item label="FATCA">{yesNo(selected.fatca)}</Descriptions.Item>
            <Descriptions.Item label="АПЛ/ПЗЛ">{yesNo(selected.apl_pzl)}</Descriptions.Item>
            <Descriptions.Item label="Совпадение Compliance">{yesNo(selected.compliance_matched)}</Descriptions.Item>
            <Descriptions.Item label="Статус" span={2}>
              <Tag color={(statusMeta[selected.status] || statusMeta.pending).color}>
                {(statusMeta[selected.status] || statusMeta.pending).label}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
}
