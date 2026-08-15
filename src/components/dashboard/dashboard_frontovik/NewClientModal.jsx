import React, { useEffect, useState } from "react";
import { Button, Col, Form, Input, Modal, Radio, Row, message } from "antd";
import { submitFrontovikNewClient } from "../../../api/complianceRequests.js";

const requiredRule = { required: true, message: "Обязательное поле" };
const yesNoOptions = [
  { label: "Да", value: true },
  { label: "Нет", value: false },
];

export default function NewClientModal({ open, onClose, onSubmitted }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [formReady, setFormReady] = useState(false);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setFormReady(false);
    }
  }, [form, open]);

  const updateFormReady = async () => {
    try {
      await form.validateFields({ validateOnly: true });
      setFormReady(true);
    } catch {
      setFormReady(false);
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const result = await submitFrontovikNewClient(values);
      form.resetFields();
      onSubmitted(result);
      onClose();
    } catch (error) {
      message.error(error.message || "Не удалось отправить анкету");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Создание нового клиента"
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      destroyOnHidden
      maskClosable={!submitting}
      closable={!submitting}
    >
      <div className="new-client-modal__description">
        Заполните анкету. Все поля обязательны; после отправки система проверит
        резидентство, FATCA, АПЛ/ПЗЛ и совпадения в базе Compliance.
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onFieldsChange={updateFormReady}
        autoComplete="off"
      >
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Фамилия" name="last_name" rules={[requiredRule]}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Имя" name="first_name" rules={[requiredRule]}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Отчество" name="middle_name" rules={[requiredRule]}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Дата рождения" name="birth_date" rules={[requiredRule]}>
              <Input type="date" max={new Date().toISOString().slice(0, 10)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="ИНН / идентификатор клиента"
              name="inn"
              rules={[
                requiredRule,
                {
                  pattern: /^[A-Za-z0-9-]{5,32}$/,
                  message: "Для резидента укажите ИНН; для нерезидента — идентификатор",
                },
              ]}
            >
              <Input maxLength={32} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Номер телефона" name="phone" rules={[requiredRule]}>
              <Input maxLength={20} placeholder="992XXXXXXXXX" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Гражданство" name="citizenship" rules={[requiredRule]}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Серия и номер документа" name="passport_number" rules={[requiredRule]}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Адрес регистрации" name="registration_address" rules={[requiredRule]}>
              <Input.TextArea rows={2} maxLength={500} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Адрес проживания" name="residence_address" rules={[requiredRule]}>
              <Input.TextArea rows={2} maxLength={500} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Род деятельности" name="occupation" rules={[requiredRule]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Источник средств" name="source_of_funds" rules={[requiredRule]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Ежемесячный доход" name="monthly_income" rules={[requiredRule]}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Резидент" name="is_resident" rules={[requiredRule]}>
              <Radio.Group options={yesNoOptions} optionType="button" buttonStyle="solid" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="FATCA" name="fatca" rules={[requiredRule]}>
              <Radio.Group options={yesNoOptions} optionType="button" buttonStyle="solid" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="АПЛ/ПЗЛ" name="apl_pzl" rules={[requiredRule]}>
              <Radio.Group options={yesNoOptions} optionType="button" buttonStyle="solid" />
            </Form.Item>
          </Col>
        </Row>

        <div className="new-client-modal__actions">
          <Button onClick={onClose} disabled={submitting}>Отмена</Button>
          <Button type="primary" htmlType="submit" loading={submitting} disabled={!formReady}>
            Отправить анкету
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
