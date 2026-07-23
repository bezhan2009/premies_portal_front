import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { FileSpreadsheet, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { apiClient } from "../../../api/utils/apiClient.js";

const { Title, Text } = Typography;

const AccountReconciliation = () => {
  const [rules, setRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [runForm] = Form.useForm();

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/account-reconciliation/rules");
      const nextRules = Array.isArray(response.data) ? response.data : [];
      setRules(nextRules);
      if (!selectedRule && nextRules.length > 0) setSelectedRule(nextRules[0]);
    } catch (error) {
      console.error("Failed to load reconciliation rules:", error);
      message.error("Не удалось загрузить правила сверки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    runForm.setFieldsValue({ period: [dayjs().startOf("day"), dayjs().endOf("day")] });
  }, []);

  const createRule = async (values) => {
    try {
      const response = await apiClient.post("/account-reconciliation/rules", {
        name: values.name,
        terminal_id: values.terminal_id,
        account_number: values.account_number,
      });
      message.success("Правило сверки создано");
      setRuleModalOpen(false);
      form.resetFields();
      setSelectedRule(response.data);
      await fetchRules();
    } catch (error) {
      console.error("Failed to create reconciliation rule:", error);
      message.error(error?.response?.data?.error || "Не удалось создать правило");
    }
  };

  const deleteRule = async (rule) => {
    try {
      await apiClient.delete(`/account-reconciliation/rules/${rule.ID || rule.id}`);
      message.success("Правило удалено");
      setResult(null);
      setSelectedRule(null);
      await fetchRules();
    } catch (error) {
      console.error("Failed to delete reconciliation rule:", error);
      message.error("Не удалось удалить правило");
    }
  };

  const runReconciliation = async (values) => {
    if (!selectedRule) {
      message.warning("Выберите правило сверки");
      return;
    }
    const [from, to] = values.period || [];
    if (!from || !to) {
      message.warning("Укажите дату от и дату до");
      return;
    }

    setRunning(true);
    try {
      const response = await apiClient.post("/account-reconciliation/run", {
        rule_id: selectedRule.ID || selectedRule.id,
        from_date: from.format("YYYY-MM-DD"),
        to_date: to.format("YYYY-MM-DD"),
      });
      setResult(response.data);
      message.success("Сверка выполнена");
    } catch (error) {
      console.error("Failed to run reconciliation:", error);
      message.error(error?.response?.data?.error || "Не удалось выполнить сверку");
    } finally {
      setRunning(false);
    }
  };

  const rows = result?.rows || [];
  const selectedRuleId = selectedRule?.ID || selectedRule?.id;

  const columns = useMemo(() => [
    {
      title: "Назначение платежа",
      dataIndex: "payment_purpose",
      key: "payment_purpose",
      width: 360,
      render: (value) => <Text style={{ maxWidth: 340 }} ellipsis={{ tooltip: value }}>{value || "—"}</Text>,
    },
    { title: "Сумма операции", dataIndex: "operation_amount", key: "operation_amount", width: 140, render: (value) => <strong>{value || "—"}</strong> },
    { title: "Плательщик", dataIndex: "payer", key: "payer", width: 220, render: (value) => value || "—" },
    { title: "Дата операции", dataIndex: "operation_date", key: "operation_date", width: 140, render: (value) => value || "—" },
    { title: "Номер операции в ОСОН", dataIndex: "oson_operation_number", key: "oson_operation_number", width: 170, render: (value) => value || "—" },
    { title: "Время операции", dataIndex: "operation_time", key: "operation_time", width: 140, render: (value) => value || "—" },
    { title: "Карта", dataIndex: "card", key: "card", width: 180, render: (value) => value || "—" },
    {
      title: "Возмещение получено",
      dataIndex: "reimbursement_found",
      key: "reimbursement_found",
      width: 170,
      render: (value) => <Tag color={value ? "green" : "red"}>{value ? "Да" : "Нет"}</Tag>,
    },
  ], []);

  return (
    <div style={{ padding: 24, background: "#f6f7fb", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Сверка счетов</Title>
          <Text type="secondary">Правила сверки, операции по счету и сравнение с процессингом по RRN.</Text>
        </div>
        <Space>
          <Button icon={<RefreshCw size={16} />} onClick={fetchRules} loading={loading}>Обновить</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setRuleModalOpen(true)}>Регистрация сверки</Button>
        </Space>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 20, alignItems: "start" }}>
        <Card title="Правила сверки" style={{ borderRadius: 16 }}>
          {rules.length === 0 && !loading ? <Empty description="Правил пока нет" /> : (
            <Space direction="vertical" style={{ width: "100%" }}>
              {rules.map((rule) => {
                const id = rule.ID || rule.id;
                const active = id === selectedRuleId;
                return (
                  <Card key={id} size="small" hoverable onClick={() => setSelectedRule(rule)} style={{ borderRadius: 12, borderColor: active ? "#eb2525" : undefined, background: active ? "#fff7f7" : "#fff" }}>
                    <Space direction="vertical" size={2} style={{ width: "100%" }}>
                      <Space style={{ justifyContent: "space-between", width: "100%" }}>
                        <strong>{rule.name}</strong>
                        <Popconfirm title="Удалить правило?" okText="Удалить" cancelText="Отмена" onConfirm={() => deleteRule(rule)}>
                          <Button size="small" danger type="text" icon={<Trash2 size={15} />} onClick={(event) => event.stopPropagation()} />
                        </Popconfirm>
                      </Space>
                      <Text type="secondary">Терминал: {rule.terminal_id}</Text>
                      <Text type="secondary">Счет: {rule.account_number}</Text>
                    </Space>
                  </Card>
                );
              })}
            </Space>
          )}
        </Card>

        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Card title={<Space><FileSpreadsheet size={18} /> Запуск сверки</Space>} style={{ borderRadius: 16 }}>
            <Form form={runForm} layout="inline" onFinish={runReconciliation}>
              <Form.Item name="period" label="Период" rules={[{ required: true, message: "Укажите период" }]}>
                <DatePicker.RangePicker format="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<Search size={16} />} loading={running} disabled={!selectedRule}>Выполнить сверку</Button>
              </Form.Item>
            </Form>
            {selectedRule && <Text type="secondary" style={{ display: "block", marginTop: 12 }}>Выбрано: {selectedRule.name} · {selectedRule.terminal_id} · {selectedRule.account_number}</Text>}
          </Card>

          {result && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 16 }}>
              <Card><Statistic title="Всего строк" value={result.total || 0} /></Card>
              <Card><Statistic title="Возмещение найдено" value={result.reimbursed || 0} valueStyle={{ color: "#159947" }} /></Card>
              <Card><Statistic title="Нет возмещения" value={result.not_reimbursed || 0} valueStyle={{ color: "#cf1322" }} /></Card>
              <Card><Statistic title="Совпадений в процессинге" value={result.processing_match_count || 0} /></Card>
            </div>
          )}

          <Card title="Результат сверки" style={{ borderRadius: 16 }}>
            <Table rowKey={(record, index) => `${record.rrn || "no-rrn"}-${index}`} dataSource={rows} columns={columns} loading={running} scroll={{ x: 1500 }} pagination={{ pageSize: 20, showSizeChanger: true }} />
          </Card>
        </Space>
      </div>

      <Modal title="Регистрация правила сверки" open={ruleModalOpen} onCancel={() => setRuleModalOpen(false)} okText="Сохранить" cancelText="Отмена" onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={createRule}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Укажите название" }]}><Input placeholder="Например: ОСОН M1000001" /></Form.Item>
          <Form.Item name="terminal_id" label="Терминал" rules={[{ required: true, message: "Укажите терминал" }]}><Input placeholder="M1000001" /></Form.Item>
          <Form.Item name="account_number" label="Номер счета" rules={[{ required: true, message: "Укажите номер счета" }]}><Input placeholder="17507972090808713010" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountReconciliation;
