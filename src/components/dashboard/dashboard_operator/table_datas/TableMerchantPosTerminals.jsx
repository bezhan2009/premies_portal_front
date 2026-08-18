import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  message,
} from "antd";
import { EditOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";

import { Table } from "../../../table/FlexibleAntTable.jsx";
import {
  createMerchantPosTerminal,
  deleteMerchantPosTerminal,
  fetchMerchantPosTerminalList,
  updateMerchantPosTerminal,
} from "../../../../api/merchantPosTerminals.js";

const DEFAULT_FORM = {
  atm_id: "",
  account_number: "",
  client_code: "",
  address: "",
  inn: "",
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error || error?.message || fallback;

const TableMerchantPosTerminals = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMerchantPosTerminalList({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
    } catch (error) {
      setItems([]);
      message.error(getErrorMessage(error, "Не удалось загрузить POS-терминалы"));
    } finally {
      setLoading(false);
    }
  }, [limit, page, search, sortBy, sortOrder]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(DEFAULT_FORM);
    setModalOpen(true);
  };

  const openEdit = (terminal) => {
    setEditing(terminal);
    form.setFieldsValue({
      atm_id: terminal.atm_id || "",
      account_number: terminal.account_number || "",
      client_code: terminal.client_code || "",
      address: terminal.address || "",
      inn: terminal.inn || "",
    });
    setModalOpen(true);
  };

  const saveTerminal = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await updateMerchantPosTerminal(editing.id, values);
        message.success("POS-терминал обновлён");
      } else {
        await createMerchantPosTerminal(values);
        message.success("POS-терминал добавлен");
      }
      setModalOpen(false);
      form.resetFields();
      await loadItems();
    } catch (error) {
      message.error(getErrorMessage(error, "Не удалось сохранить POS-терминал"));
    } finally {
      setSaving(false);
    }
  };

  const removeTerminal = async (id) => {
    try {
      await deleteMerchantPosTerminal(id);
      message.success("POS-терминал удалён");
      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadItems();
      }
    } catch (error) {
      message.error(getErrorMessage(error, "Не удалось удалить POS-терминал"));
    }
  };

  const handleTableChange = (pagination, _filters, sorter) => {
    setPage(pagination.current || 1);
    setLimit(pagination.pageSize || 20);
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (activeSorter?.order) {
      setSortBy(String(activeSorter.field || activeSorter.columnKey || "created_at"));
      setSortOrder(activeSorter.order === "ascend" ? "asc" : "desc");
    } else {
      setSortBy("created_at");
      setSortOrder("desc");
    }
  };

  const columns = [
    { title: "ATM ID", dataIndex: "atm_id", key: "atm_id" },
    { title: "Счёт", dataIndex: "account_number", key: "account_number" },
    { title: "Код клиента", dataIndex: "client_code", key: "client_code" },
    { title: "Адрес", dataIndex: "address", key: "address" },
    { title: "ИНН", dataIndex: "inn", key: "inn" },
    {
      title: "Действия",
      key: "actions",
      sortable: false,
      render: (_, terminal) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={`Редактировать POS ${terminal.atm_id}`}
            onClick={() => openEdit(terminal)}
          />
          <Popconfirm
            title="Удалить POS-терминал?"
            description={`ATM ID ${terminal.atm_id}`}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeTerminal(terminal.id)}
          >
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              aria-label={`Удалить POS ${terminal.atm_id}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="table-header-actions">
        <h2>POS-терминалы</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить POS
        </Button>
      </div>

      <Input.Search
        allowClear
        value={search}
        placeholder="ATM ID, счёт, код клиента, адрес или ИНН"
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        style={{ maxWidth: 520, marginBottom: 16 }}
      />

      <Table
        tableId="operator-merchant-pos-terminals"
        columns={columns}
        dataSource={items}
        rowKey="atm_id"
        loading={loading}
        bordered
        onChange={handleTableChange}
        pagination={{ current: page, pageSize: limit, total, showSizeChanger: true }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "POS-терминалы не найдены" }}
      />

      <Modal
        title={editing ? "Редактировать POS-терминал" : "Добавить POS-терминал"}
        open={modalOpen}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={saving}
        onOk={() => form.submit()}
        onCancel={() => {
          if (!saving) setModalOpen(false);
        }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={saveTerminal} initialValues={DEFAULT_FORM}>
          <Form.Item label="ATM ID" name="atm_id" rules={[{ required: true, message: "Укажите ATM ID" }]}>
            <Input maxLength={64} autoComplete="off" />
          </Form.Item>
          <Form.Item label="Счёт" name="account_number">
            <Input maxLength={64} autoComplete="off" />
          </Form.Item>
          <Form.Item label="Код клиента" name="client_code" rules={[{ required: true, message: "Укажите код клиента" }]}>
            <Input maxLength={64} autoComplete="off" />
          </Form.Item>
          <Form.Item label="Адрес" name="address">
            <Input.TextArea maxLength={512} rows={3} showCount />
          </Form.Item>
          <Form.Item label="ИНН" name="inn">
            <Input maxLength={64} autoComplete="off" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TableMerchantPosTerminals;
