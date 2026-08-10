import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  Archive,
  CreditCard,
  Eye,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { rohatApi } from "../../../api/rohat/rohat.js";
import "./RohatPage.css";

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_META = {
  ACTIVE: { label: "Активен", color: "green" },
  DEBT: { label: "Задолженность", color: "orange" },
  OVERDUE: { label: "Просрочен", color: "red" },
  ARCHIVED: { label: "Архив", color: "default" },
};

const RohatPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [limitProduct, setLimitProduct] = useState(null);
  const [limitSaving, setLimitSaving] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [limitForm] = Form.useForm();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await rohatApi.getProducts({ archived }));
    } catch (error) {
      console.error("Failed to load Rohat products:", error);
      message.error(apiError(error, "Не удалось загрузить продукты Рохат"));
    } finally {
      setLoading(false);
    }
  }, [archived]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase("ru-RU");
    if (!query) return products;

    return products.filter((product) =>
      [product.absClientId, product.clientFullName, product.cardId, product.cardNumberMask]
        .some((value) => String(value || "").toLocaleLowerCase("ru-RU").includes(query)),
    );
  }, [products, searchText]);

  const createProduct = async () => {
    let values;
    try {
      values = await createForm.validateFields();
    } catch {
      return;
    }

    const limitMinor = parseTjsToMinor(values.limit);
    if (limitMinor === null || limitMinor <= 0) {
      createForm.setFields([{ name: "limit", errors: ["Введите положительную сумму с точностью до двух знаков"] }]);
      return;
    }

    setCreating(true);
    try {
      await rohatApi.createProduct({
        absClientId: values.absClientId.trim(),
        clientFullName: values.clientFullName.trim(),
        cardId: values.cardId.trim(),
        limitMinor,
        linkedCards: splitValues(values.linkedCards),
        linkedAccounts: splitValues(values.linkedAccounts),
        commissionDebitAccount: values.commissionDebitAccount.trim(),
        commissionDebitInn: values.commissionDebitInn.trim(),
        commissionDebitName: values.commissionDebitName.trim(),
        commissionCreditAccount: values.commissionCreditAccount.trim(),
        commissionCreditInn: values.commissionCreditInn.trim(),
        commissionCreditName: values.commissionCreditName.trim(),
      });
      message.success("Рохат добавлен, данные карты получены через card-data");
      setCreateOpen(false);
      createForm.resetFields();
      await loadProducts();
    } catch (error) {
      console.error("Failed to create Rohat product:", error);
      message.error(apiError(error, "Не удалось добавить Рохат"));
    } finally {
      setCreating(false);
    }
  };

  const openLimitModal = (product) => {
    setLimitProduct(product);
    limitForm.setFieldsValue({ limit: formatMinorInput(product.limitMinor) });
  };

  const changeLimit = async () => {
    let values;
    try {
      values = await limitForm.validateFields();
    } catch {
      return;
    }

    const limitMinor = parseTjsToMinor(values.limit);
    if (limitMinor === null || limitMinor <= 0) {
      limitForm.setFields([{ name: "limit", errors: ["Введите положительную сумму с точностью до двух знаков"] }]);
      return;
    }

    setLimitSaving(true);
    try {
      await rohatApi.changeLimit(getRowId(limitProduct), limitMinor);
      message.success("Лимит Рохат изменён");
      setLimitProduct(null);
      limitForm.resetFields();
      await loadProducts();
    } catch (error) {
      console.error("Failed to change Rohat limit:", error);
      message.error(apiError(error, "Не удалось изменить лимит"));
    } finally {
      setLimitSaving(false);
    }
  };

  const closeProduct = async (product) => {
    try {
      await rohatApi.closeProduct(getRowId(product));
      message.success("Рохат закрыт и перемещён в архив");
      await loadProducts();
    } catch (error) {
      console.error("Failed to close Rohat product:", error);
      message.error(apiError(error, "Не удалось закрыть Рохат"));
    }
  };

  const showDetails = async (product) => {
    setDetailsProduct(product);
    setHistoryRows([]);
    setHistoryLoading(true);
    try {
      setHistoryRows(await rohatApi.getHistory(getRowId(product)));
    } catch (error) {
      console.error("Failed to load Rohat history:", error);
      message.error(apiError(error, "Не удалось загрузить кредитную историю"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns = [
    {
      title: "Клиент",
      key: "client",
      fixed: "left",
      width: 230,
      render: (_, product) => (
        <div>
          <div className="rohat-page__client-name">{product.clientFullName}</div>
          <div className="rohat-page__secondary">АБС: {product.absClientId}</div>
        </div>
      ),
    },
    {
      title: "Карта Рохат",
      key: "card",
      width: 180,
      render: (_, product) => product.cardNumberMask || maskIdentifier(product.cardId),
    },
    moneyColumn("Сумма Рохата", "limitMinor"),
    moneyColumn("Задолженность", "debtMinor", (value) => value > 0 && "danger"),
    moneyColumn("Рассчитанная комиссия", "calculatedCommissionMinor"),
    moneyColumn("Начисленная комиссия", "accruedCommissionMinor", (value) => value > 0 && "warning"),
    {
      title: "Льготный период",
      dataIndex: "graceDaysRemaining",
      key: "graceDaysRemaining",
      align: "center",
      width: 145,
      render: (value, product) => Number(product.debtMinor) > 0 ? `${value || 0} дн.` : "—",
    },
    moneyColumn("Баланс клиента", "clientBalanceMinor", (value) => value > 0 && "success"),
    {
      title: "Период задолженности",
      dataIndex: "debtDays",
      key: "debtDays",
      align: "center",
      width: 170,
      render: (value, product) => Number(product.debtMinor) > 0 ? `${value || 0} / 30` : "—",
    },
    moneyColumn("Просроченная задолженность", "overduePenaltyMinor", (value) => value > 0 && "danger"),
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      align: "center",
      width: 130,
      render: (status) => {
        const meta = STATUS_META[status] || { label: status || "—", color: "default" };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Действия",
      key: "actions",
      fixed: "right",
      width: 290,
      render: (_, product) => (
        <Space size={4} wrap>
          <Button type="text" icon={<Eye size={16} />} onClick={() => showDetails(product)}>
            Детали
          </Button>
          {!archived && (
            <Button type="text" icon={<Pencil size={16} />} onClick={() => openLimitModal(product)}>
              Изменить лимит
            </Button>
          )}
          {!archived && Number(product.debtMinor) === 0 && (
            <Popconfirm
              title="Закрыть Рохат?"
              description="Запись будет сохранена в архиве."
              okText="Закрыть"
              cancelText="Отмена"
              onConfirm={() => closeProduct(product)}
            >
              <Button type="text" danger>Закрыть Рохат</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="rohat-page">
      <div className="rohat-page__header">
        <div>
          <Title level={3} className="rohat-page__title">
            <Space><CreditCard size={24} />Управление Рохат</Space>
          </Title>
          <Text type="secondary" className="rohat-page__subtitle">
            Лимиты, задолженность, льготный период и ежедневные комиссии
          </Text>
        </div>
        <Space wrap>
          <Button icon={<Archive size={16} />} onClick={() => setArchived((value) => !value)}>
            {archived ? "Активные Рохаты" : "Архив"}
          </Button>
          {!archived && (
            <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Добавить Рохат
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <div className="rohat-page__toolbar">
          <Input
            className="rohat-page__search"
            allowClear
            prefix={<Search size={16} />}
            placeholder="Поиск по клиенту, ID карты или маске"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <Button icon={<RefreshCw size={16} />} loading={loading} onClick={loadProducts}>Обновить</Button>
        </div>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey={getRowId}
          columns={columns}
          dataSource={filteredProducts}
          loading={loading}
          scroll={{ x: 2380 }}
          sticky
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
          locale={{ emptyText: <Empty description={archived ? "Архив пуст" : "Рохаты не найдены"} /> }}
        />
      </Card>

      <CreateRohatModal
        open={createOpen}
        form={createForm}
        loading={creating}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onSubmit={createProduct}
      />

      <Modal
        title="Изменить лимит Рохат"
        open={Boolean(limitProduct)}
        onCancel={() => {
          setLimitProduct(null);
          limitForm.resetFields();
        }}
        onOk={changeLimit}
        confirmLoading={limitSaving}
        okText="Применить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          message="Лимит изменится только после успешного ответа метода changeExceedLimit."
          style={{ marginBottom: 16 }}
        />
        <Form form={limitForm} layout="vertical">
          <Form.Item name="limit" label="Новая сумма Рохата, TJS" rules={[{ required: true, message: "Укажите сумму" }]}>
            <Input inputMode="decimal" placeholder="500.00" />
          </Form.Item>
        </Form>
      </Modal>

      <RohatDetailsModal
        product={detailsProduct}
        historyRows={historyRows}
        loading={historyLoading}
        onClose={() => setDetailsProduct(null)}
      />
    </div>
  );
};

const CreateRohatModal = ({ open, form, loading, onCancel, onSubmit }) => (
  <Modal
    title="Добавить Рохат"
    open={open}
    width={920}
    onCancel={onCancel}
    onOk={onSubmit}
    confirmLoading={loading}
    okText="Добавить Рохат"
    cancelText="Отмена"
    destroyOnHidden
  >
    <Alert
      type="info"
      showIcon
      message="Баланс, задолженность и счётчики будут заполнены автоматически из card-data."
      style={{ marginBottom: 16 }}
    />
    <Form form={form} layout="vertical" requiredMark="optional">
      <div className="rohat-form-grid">
        <RequiredField name="absClientId" label="ID клиента в АБС" />
        <RequiredField name="clientFullName" label="ФИО клиента" />
        <RequiredField name="cardId" label="ID карты Рохат" />
        <RequiredField name="limit" label="Сумма Рохата, TJS" inputMode="decimal" placeholder="500.00" />
        <Form.Item name="linkedCards" label="Привязанные карты">
          <TextArea rows={3} placeholder="ID карт через запятую или с новой строки" />
        </Form.Item>
        <Form.Item name="linkedAccounts" label="Привязанные счета">
          <TextArea rows={3} placeholder="Номера счетов через запятую или с новой строки" />
        </Form.Item>
      </div>

      <section className="rohat-form-section">
        <Text strong className="rohat-form-section__title">Реквизиты списания комиссии</Text>
        <div className="rohat-form-section__grid">
          <RequiredField name="commissionDebitAccount" label="Счёт списания" />
          <RequiredField name="commissionDebitInn" label="ИНН списания" />
          <RequiredField name="commissionDebitName" label="Имя списания" />
        </div>
      </section>

      <section className="rohat-form-section">
        <Text strong className="rohat-form-section__title">Реквизиты начисления комиссии</Text>
        <div className="rohat-form-section__grid">
          <RequiredField name="commissionCreditAccount" label="Счёт начисления" />
          <RequiredField name="commissionCreditInn" label="ИНН начисления" />
          <RequiredField name="commissionCreditName" label="Имя начисления" />
        </div>
      </section>
    </Form>
  </Modal>
);

const RequiredField = ({ name, label, inputMode, placeholder }) => (
  <Form.Item name={name} label={label} rules={[{ required: true, whitespace: true, message: `Заполните поле «${label}»` }]}>
    <Input inputMode={inputMode} placeholder={placeholder} />
  </Form.Item>
);

const RohatDetailsModal = ({ product, historyRows, loading, onClose }) => {
  const historyColumns = [
    {
      title: "Период",
      key: "period",
      render: (_, row) => `${formatDate(row.startedAt)} — ${formatDate(row.endedAt)}`,
    },
    moneyColumn("Макс. долг", "maximumDebtMinor"),
    {
      title: "Комиссия",
      key: "commission",
      align: "right",
      render: (_, row) => formatMinor(Number(row.calculatedCommissionMinor || 0) + Number(row.accruedCommissionMinor || 0)),
    },
    moneyColumn("Просрочка", "overduePenaltyMinor"),
    { title: "Дней", dataIndex: "debtDays", key: "debtDays", align: "center" },
  ];

  return (
    <Modal title="Детали Рохат" open={Boolean(product)} width={980} footer={null} onCancel={onClose} destroyOnHidden>
      {product && (
        <>
          <div className="rohat-details-grid">
            <Detail label="Клиент" value={`${product.clientFullName} · АБС ${product.absClientId}`} />
            <Detail label="Карта Рохат" value={product.cardNumberMask || maskIdentifier(product.cardId)} />
            <Detail label="Счёт Рохат" value={maskIdentifier(product.rohatAccountNumber)} />
            <Detail label="Собственные средства" value={formatMinor(product.ownFundsMinor)} />
            <Detail label="Привязанные карты" value={product.linkedCards?.map((item) => maskIdentifier(item.cardId)).join(", ") || "—"} />
            <Detail label="Привязанные счета" value={product.linkedAccounts?.map((item) => maskIdentifier(item.accountNumber)).join(", ") || "—"} />
            <Detail label="Списание комиссии" value={`${maskIdentifier(product.commissionDebitAccount)} · ${product.commissionDebitName}`} />
            <Detail label="ИНН списания" value={product.commissionDebitInn || "—"} />
            <Detail label="Начисление комиссии" value={`${maskIdentifier(product.commissionCreditAccount)} · ${product.commissionCreditName}`} />
            <Detail label="ИНН начисления" value={product.commissionCreditInn || "—"} />
            <Detail label="Последняя синхронизация" value={formatDateTime(product.lastSyncedAt)} />
            <Detail label="Дата создания" value={formatDateTime(product.CreatedAt || product.createdAt)} />
          </div>

          {product.syncError && (
            <Alert type="error" showIcon message="Ошибка последней синхронизации" description={product.syncError} style={{ marginBottom: 20 }} />
          )}

          <Title level={5}><Space><History size={17} />История взятых кредитов</Space></Title>
          <Table
            rowKey={getRowId}
            size="small"
            columns={historyColumns}
            dataSource={historyRows}
            loading={loading}
            pagination={false}
            scroll={{ x: 760 }}
            locale={{ emptyText: <Empty description="Завершённых циклов пока нет" /> }}
          />
        </>
      )}
    </Modal>
  );
};

const Detail = ({ label, value }) => (
  <div>
    <Text type="secondary">{label}</Text>
    <div className="rohat-details-grid__value">{value || "—"}</div>
  </div>
);

function moneyColumn(title, dataIndex, toneResolver) {
  return {
    title,
    dataIndex,
    key: dataIndex,
    align: "right",
    width: 170,
    sorter: (left, right) => Number(left[dataIndex] || 0) - Number(right[dataIndex] || 0),
    render: (value) => {
      const numericValue = Number(value || 0);
      const tone = toneResolver?.(numericValue);
      return <span className={`rohat-page__money${tone ? ` rohat-page__money--${tone}` : ""}`}>{formatMinor(numericValue)}</span>;
    },
  };
}

function getRowId(row) {
  return row?.ID ?? row?.id;
}

function splitValues(value = "") {
  return [...new Set(String(value).split(/[;,\n]/).map((item) => item.trim()).filter(Boolean))];
}

function parseTjsToMinor(value) {
  const normalized = String(value || "").trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) ? result : null;
}

function formatMinor(value) {
  return `${(Number(value || 0) / 100).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TJS`;
}

function formatMinorInput(value) {
  const minor = Number(value || 0);
  return `${Math.trunc(minor / 100)}.${String(Math.abs(minor % 100)).padStart(2, "0")}`;
}

function maskIdentifier(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "—";
  if (normalized.length <= 6) return normalized;
  return `${normalized.slice(0, 2)}••••${normalized.slice(-4)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ru-RU");
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function apiError(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
}

export default RohatPage;
