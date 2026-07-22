import React, { useState } from "react";
import { Modal, Select, Button, Form } from "antd";

const { Option } = Select;

const RequisitesModal = ({ open, onClose, onGenerate, accountsData, isLoading }) => {
  const [form] = Form.useForm();

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      onGenerate(values);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  return (
    <Modal
      title="Скачать реквизиты"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isLoading}>
          Отмена
        </Button>,
        <Button
          key="generate"
          type="primary"
          loading={isLoading}
          onClick={handleGenerate}
          style={{ background: "#2196f3", borderColor: "#2196f3" }}
        >
          Скачать
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="account"
          label="Счет"
          rules={[{ required: true, message: "Пожалуйста, выберите счет!" }]}
        >
          <Select placeholder="Выберите счет">
            {accountsData?.map((acc, index) => (
              <Option key={index} value={acc.Number}>
                {acc.Number} ({acc.Balance} {acc.Currency?.Code})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="language"
          label="Язык"
          rules={[{ required: true, message: "Пожалуйста, выберите язык!" }]}
        >
          <Select placeholder="Выберите язык">
            <Option value="rus">Русский</Option>
            <Option value="tj">Тоҷикӣ</Option>
            <Option value="eng">English</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="currency"
          label="Валюта"
          rules={[{ required: true, message: "Пожалуйста, выберите валюту!" }]}
        >
          <Select placeholder="Выберите валюту">
            <Option value="TJS">TJS (Сомони)</Option>
            <Option value="USD">USD (Доллар)</Option>
            <Option value="EUR">EUR (Евро)</Option>
            <Option value="RUB">RUB (Рубль)</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RequisitesModal;
