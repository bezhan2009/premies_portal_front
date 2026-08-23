import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Alert, Button, Card, Space, Table, Tag, Typography } from "antd";
import { CreditCard, RefreshCw, ShieldOff } from "lucide-react";
import { fetchDeclineBlocks } from "../../../services/declineService.js";
import VSMModal from "../../../components/dashboard/dashboard_frontovik/vsm/VSMModal.jsx";

const { Title, Text } = Typography;

export default function DeclineManagementPage() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBlock, setSelectedBlock] = useState(null);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDeclineBlocks();
      setBlocks(Array.isArray(data?.blocks) ? data.blocks : []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || "Не удалось загрузить блокировки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const columns = useMemo(() => [
    {
      title: "Номер карты",
      dataIndex: "masked_card_number",
      key: "masked_card_number",
      render: (value) => <Space><CreditCard size={16} /><Text code>{value || "—"}</Text></Space>,
    },
    { title: "ФИО", dataIndex: "full_name", key: "full_name", render: (value) => value || "Не определено" },
    { title: "ID карты", dataIndex: "card_id", key: "card_id", render: (value) => <Text copyable>{value}</Text> },
    {
      title: "Дата блокировки подписки",
      dataIndex: "blocked_at",
      key: "blocked_at",
      render: (value) => value ? new Date(value).toLocaleString("ru-RU") : "—",
      sorter: (a, b) => new Date(a.blocked_at || 0) - new Date(b.blocked_at || 0),
      defaultSortOrder: "descend",
    },
    {
      title: "Причина",
      key: "reason",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="red">915: {record.decline_count} отказов</Tag>
          <Text type="secondary">Остановлено подписок: {record.subscription_count}</Text>
        </Space>
      ),
    },
    {
      title: "Действия",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Button type="primary" onClick={() => setSelectedBlock(record)}>
          Управление подписками
        </Button>
      ),
    },
  ], []);

  const vsmCard = selectedBlock ? {
    cardId: selectedBlock.card_id,
    CardNumber: selectedBlock.masked_card_number,
    type: "Карта",
    details: {
      cardNumberMask: selectedBlock.masked_card_number,
      cardTypeName: "Карта",
      accounts: [{ number: selectedBlock.account_number }],
    },
  } : null;

  return (
    <>
      <Helmet><title>Управление деклайнами</title></Helmet>
      <div style={{ padding: 8 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div>
              <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldOff size={24} /> Управление деклайнами
              </Title>
              <Text type="secondary">Карты Visa с более чем тремя отказами 915 за последние два дня. Проверка выполняется ежедневно в 09:00.</Text>
            </div>
            <Button icon={<RefreshCw size={16} />} onClick={loadBlocks} loading={loading}>Обновить</Button>
          </div>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
          <Table
            rowKey="ID"
            columns={columns}
            dataSource={blocks}
            loading={loading}
            scroll={{ x: 1050 }}
            pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
            locale={{ emptyText: "Записей о блокировках пока нет" }}
          />
        </Card>
      </div>

      {selectedBlock && vsmCard && (
        <VSMModal
          isOpen
          onClose={() => setSelectedBlock(null)}
          card={vsmCard}
          accountsData={vsmCard.details.accounts}
          selectedClient={{ LongName: selectedBlock.full_name, long_name: selectedBlock.full_name }}
        />
      )}
    </>
  );
}
