import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from "antd";
import { Plus, RefreshCw } from "lucide-react";

const categoryLabels = {
  client_occupation: "Чем занимается клиент",
  net_worth: "Чистая стоимость / оборот",
  monthly_income: "Метод открытия счета",
  total_outgoing_transactions_amount: "Сумма транзакций",
  total_outgoing_transactions_count: "Количество транзакций",
  total_cash_transactions_amount: "Сумма кассовых сделок",
  total_cash_transactions_count: "Количество кассовых сделок",
};

export default function ComplianceScoreOptions() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/compliance/score-options`, {
        headers: authHeaders,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch options");
      }
      setItems(await response.json());
    } catch (error) {
      console.error(error);
      message.error("Не удалось загрузить справочник");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    form.setFieldsValue({ category: "client_occupation", score: 0, sort_order: items.length + 1 });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const response = await fetch(
        editingItem
          ? `${backendUrl}/compliance/score-options/${editingItem.id}`
          : `${backendUrl}/compliance/score-options`,
        {
          method: editingItem ? "PUT" : "POST",
          headers: authHeaders,
          body: JSON.stringify(values),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Save failed");
      }
      message.success(editingItem ? "Запись обновлена" : "Запись добавлена");
      setModalOpen(false);
      fetchItems();
    } catch (error) {
      if (!error.errorFields) {
        message.error(error.message || "Не удалось сохранить запись");
      }
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm("Удалить значение справочника?")) {
      return;
    }
    try {
      const response = await fetch(`${backendUrl}/compliance/score-options/${record.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!response.ok) {
        throw new Error("Delete failed");
      }
      message.success("Запись удалена");
      fetchItems();
    } catch (error) {
      console.error(error);
      message.error("Не удалось удалить запись");
    }
  };

  const categoryOptions = useMemo(
    () => Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
    [],
  );

  const columns = [
    {
      title: "Категория",
      dataIndex: "category",
      filters: categoryOptions.map(({ value, label }) => ({ text: label, value })),
      onFilter: (value, record) => record.category === value,
      render: (value) => categoryLabels[value] || value,
      width: 260,
    },
    {
      title: "Значение",
      dataIndex: "value",
    },
    {
      title: "Label",
      dataIndex: "label",
    },
    {
      title: "Балл",
      dataIndex: "score",
      width: 90,
      render: (score) => <Tag color={score >= 5 ? "red" : score >= 3 ? "orange" : "blue"}>{score}</Tag>,
    },
    {
      title: "Порядок",
      dataIndex: "sort_order",
      width: 100,
    },
    {
      title: "Действия",
      key: "actions",
      width: 170,
      render: (_, record) => (
        <Space>
          <Button onClick={() => openEditModal(record)}>Изменить</Button>
          <Button danger onClick={() => handleDelete(record)}>Удалить</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-content-wrapper content-page" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Справочник баллов комплаенса</h2>
        <Space>
          <Button icon={<RefreshCw size={16} />} onClick={fetchItems}>Обновить</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>Добавить</Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title={editingItem ? "Редактировать значение" : "Добавить значение"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="category" label="Категория" rules={[{ required: true }]}>
            <Select options={categoryOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="value" label="Значение" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="label" label="Label в селекторе" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space size="large">
            <Form.Item name="score" label="Балл" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} />
            </Form.Item>
            <Form.Item name="sort_order" label="Порядок" rules={[{ required: true }]}>
              <InputNumber min={0} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
