import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Form, Input, Modal, Space, Table, Tag, message } from "antd";
import { Edit3, Plus, RefreshCw, ShieldCheck, ShieldX, Trash2 } from "lucide-react";

const listConfig = {
  white: {
    title: "Белые списки",
    description: "Клиенты, для которых совпадение с базой террористов не блокирует обслуживание.",
    tagColor: "green",
    Icon: ShieldCheck,
  },
  black: {
    title: "Черные списки",
    description: "Клиенты, которым запрещено обслуживание независимо от результата проверки базы террористов.",
    tagColor: "red",
    Icon: ShieldX,
  },
};

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  "Content-Type": "application/json",
});

export default function ComplianceListPage({ listType }) {
  const config = listConfig[listType];
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState("");
  const [form] = Form.useForm();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/compliance/lists/${listType}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Не удалось загрузить список");
      setItems(await response.json());
    } catch (error) {
      console.error(error);
      message.error(error.message || "Не удалось загрузить список");
    } finally {
      setLoading(false);
    }
  }, [backendUrl, listType]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreateModal = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      inn: record.inn,
      full_name: record.full_name,
      birth_date: record.birth_date,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const response = await fetch(
        editingItem
          ? `${backendUrl}/compliance/lists/${listType}/${editingItem.id}`
          : `${backendUrl}/compliance/lists/${listType}`,
        {
          method: editingItem ? "PUT" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...values,
            inn: values.inn.replace(/\s+/g, ""),
          }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Не удалось сохранить запись");
      }

      message.success(editingItem ? "Запись обновлена" : "Клиент добавлен в список");
      setModalOpen(false);
      form.resetFields();
      await fetchItems();
    } catch (error) {
      if (!error.errorFields) {
        message.error(error.message || "Не удалось сохранить запись");
      }
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Удалить ${record.full_name} из списка?`)) return;

    try {
      const response = await fetch(`${backendUrl}/compliance/lists/${listType}/${record.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Не удалось удалить запись");
      message.success("Запись удалена");
      await fetchItems();
    } catch (error) {
      console.error(error);
      message.error(error.message || "Не удалось удалить запись");
    }
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      `${item.inn} ${item.full_name} ${item.birth_date}`.toLowerCase().includes(query),
    );
  }, [items, search]);

  const columns = [
    {
      title: "ИНН",
      dataIndex: "inn",
      width: 160,
      render: (value) => <span style={{ fontFamily: "monospace" }}>{value}</span>,
    },
    { title: "ФИО клиента", dataIndex: "full_name" },
    {
      title: "Дата рождения",
      dataIndex: "birth_date",
      width: 160,
      render: (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU") : "-",
    },
    {
      title: "Список",
      dataIndex: "list_type",
      width: 130,
      render: () => <Tag color={config.tagColor}>{config.title}</Tag>,
    },
    {
      title: "Действия",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<Edit3 size={16} />}
            title="Изменить"
            aria-label="Изменить"
            onClick={() => openEditModal(record)}
          />
          <Button
            type="text"
            danger
            icon={<Trash2 size={16} />}
            title="Удалить"
            aria-label="Удалить"
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  const ListIcon = config.Icon;

  return (
    <div className="page-content-wrapper content-page" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ListIcon size={25} color={listType === "white" ? "#16a34a" : "#dc2626"} />
            <h2 style={{ margin: 0 }}>{config.title}</h2>
          </div>
          <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", maxWidth: 760 }}>
            {config.description}
          </p>
        </div>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Поиск по ИНН или ФИО"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 260 }}
          />
          <Button icon={<RefreshCw size={16} />} onClick={fetchItems} loading={loading}>
            Обновить
          </Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
            Добавить клиента
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredItems}
        scroll={{ x: 760 }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
      />

      <Modal
        title={editingItem ? "Изменить клиента" : `Добавить клиента: ${config.title.toLowerCase()}`}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 20 }}>
          <Form.Item
            name="inn"
            label="ИНН клиента"
            rules={[
              { required: true, message: "Введите ИНН" },
              { pattern: /^\d{9,14}$/, message: "ИНН должен содержать от 9 до 14 цифр" },
            ]}
          >
            <Input inputMode="numeric" maxLength={14} placeholder="Введите ИНН" />
          </Form.Item>
          <Form.Item name="full_name" label="ФИО клиента" rules={[{ required: true, message: "Введите ФИО" }]}>
            <Input maxLength={500} placeholder="Фамилия Имя Отчество" />
          </Form.Item>
          <Form.Item name="birth_date" label="Дата рождения" rules={[{ required: true, message: "Укажите дату рождения" }]}>
            <Input type="date" max={new Date().toISOString().slice(0, 10)} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
