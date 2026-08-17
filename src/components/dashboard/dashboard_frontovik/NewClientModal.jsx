import React, { useEffect, useMemo, useState } from "react";
import { Button, Col, Form, Input, Modal, Progress, Radio, Row, message } from "antd";
import { submitFrontovikNewClient } from "../../../api/complianceRequests.js";

const requiredRule = { required: true, message: "Обязательное поле" };
const yesNoOptions = [
  { label: "Да", value: true },
  { label: "Нет", value: false },
];

const questionnaireFields = [
  { name: "last_name", label: "Фамилия" },
  { name: "first_name", label: "Имя" },
  { name: "middle_name", label: "Отчество" },
  { name: "birth_date", label: "Дата рождения", validate: (value) => {
    const date = new Date(value);
    return Boolean(value) && !Number.isNaN(date.getTime()) && date <= new Date();
  } },
  { name: "inn", label: "ИНН / идентификатор", validate: (value, values) => {
    const normalized = String(value || "").trim();
    if (values.is_resident === true) return /^\d{9,14}$/.test(normalized);
    return /^[A-Za-z0-9-]{5,32}$/.test(normalized);
  } },
  { name: "phone", label: "Номер телефона" },
  { name: "occupation", label: "Род деятельности" },
  { name: "source_of_funds", label: "Источник средств" },
  { name: "monthly_income", label: "Ежемесячный доход" },
  { name: "is_resident", label: "Резидент", boolean: true },
  { name: "fatca", label: "FATCA", boolean: true },
  { name: "apl_pzl", label: "АПЛ/ПЗЛ", boolean: true },
];

const isQuestionnaireFieldValid = (field, values) => {
  const value = values?.[field.name];
  if (field.boolean) return typeof value === "boolean";
  if (field.validate) return field.validate(value, values || {});
  return String(value || "").trim().length > 0;
};

export default function NewClientModal({ open, onClose, onSubmitted }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [complianceCheck, setComplianceCheck] = useState({
    state: "idle",
    matched: false,
    listType: "",
  });
  const watchedValues = Form.useWatch([], form);
  const values = useMemo(() => watchedValues || {}, [watchedValues]);

  const completion = useMemo(() => {
    const invalidFields = questionnaireFields.filter(
      (field) => !isQuestionnaireFieldValid(field, values),
    );
    const completed = questionnaireFields.length - invalidFields.length;
    return {
      percent: Math.round((completed / questionnaireFields.length) * 100),
      invalidFields,
    };
  }, [values]);

  const statusReasons = useMemo(() => {
    const reasons = [];
    if (complianceCheck.state === "loading") {
      reasons.push({ tone: "checking", text: "Проверка по базе Compliance…" });
    } else if (complianceCheck.state === "error") {
      reasons.push({ tone: "danger", text: "Не удалось выполнить проверку Compliance" });
    } else if (complianceCheck.state === "checked") {
      if (!complianceCheck.matched) {
        reasons.push({ tone: "success", text: "Клиент не найден в черных списках" });
      } else if (complianceCheck.listType === "black") {
        reasons.push({ tone: "danger", text: "Клиент в черных списках" });
      } else if (complianceCheck.listType === "white") {
        reasons.push({ tone: "success", text: "Клиент в белом списке" });
      }
    }

    if (values.is_resident === false) {
      reasons.push({ tone: "warning", text: "Клиент нерезидент" });
    }
    if (values.fatca === true || values.apl_pzl === true) {
      reasons.push({ tone: "warning", text: "Требуется проверка Compliance" });
    }
    if (reasons.length === 0) {
      reasons.push({ tone: "neutral", text: "Статус появится после заполнения ИНН" });
    }
    return reasons;
  }, [complianceCheck, values.apl_pzl, values.fatca, values.is_resident]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setFormReady(false);
      setComplianceCheck({ state: "idle", matched: false, listType: "" });
    }
  }, [form, open]);

  useEffect(() => {
    const identifier = String(values.inn || "").replace(/\s/g, "");
    if (!open || !/^\d{9,14}$/.test(identifier)) {
      setComplianceCheck({ state: "idle", matched: false, listType: "" });
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setComplianceCheck({ state: "loading", matched: false, listType: "" });
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/compliance/client-check`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inn: identifier }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Compliance check failed: ${response.status}`);
        const result = await response.json();
        setComplianceCheck({
          state: "checked",
          matched: Boolean(result?.matched),
          listType: String(result?.list_type || "").toLowerCase(),
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setComplianceCheck({ state: "error", matched: false, listType: "" });
        }
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, values.inn]);

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
      <div className="new-client-progress-panel">
        <div className="new-client-progress-panel__completion">
          <div className="new-client-progress-panel__heading">
            <strong>Заполнение анкеты</strong>
            <span>{completion.percent}%</span>
          </div>
          <Progress
            percent={completion.percent}
            showInfo={false}
            strokeColor="#16a34a"
            trailColor={completion.percent === 100 ? "#dcfce7" : "#fee2e2"}
          />
          <div className={completion.invalidFields.length ? "new-client-progress-panel__problem" : "new-client-progress-panel__complete"}>
            {completion.invalidFields.length
              ? `Не заполнено или заполнено некорректно: ${completion.invalidFields.length}`
              : "Все обязательные поля заполнены корректно"}
          </div>
        </div>
        <div className="new-client-progress-panel__status">
          <strong>Статус клиента</strong>
          <div className="new-client-status-list">
            {statusReasons.map((reason) => (
              <span key={`${reason.tone}-${reason.text}`} className={`new-client-status new-client-status--${reason.tone}`}>
                {reason.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="new-client-modal__description">
        Заполните обязательные поля. Система проверит резидентство, FATCA,
        АПЛ/ПЗЛ и совпадения в базе Compliance.
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
              dependencies={["is_resident"]}
              rules={[
                requiredRule,
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    const normalized = String(value || "").trim();
                    const valid = getFieldValue("is_resident") === true
                      ? /^\d{9,14}$/.test(normalized)
                      : /^[A-Za-z0-9-]{5,32}$/.test(normalized);
                    return valid
                      ? Promise.resolve()
                      : Promise.reject(new Error("Для резидента укажите ИНН; для нерезидента — идентификатор"));
                  },
                }),
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
