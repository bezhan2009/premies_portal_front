import React, { useEffect, useMemo, useState } from "react";
import { AutoComplete, Button, Col, Form, Input, Modal, Progress, Radio, Row, Upload, message } from "antd";
import { ShieldCheck } from "lucide-react";
import { submitFrontovikNewClient } from "../../../api/complianceRequests.js";
import { uploadClientDocument } from "../../../api/clientsDataFiles/clientsDataFiles.js";

const requiredRule = { required: true, message: "Обязательное поле" };
const yesNoOptions = [
  { label: "Да", value: true },
  { label: "Нет", value: false },
];

const complianceCategories = [
  "client_occupation",
  "monthly_income",
  "total_outgoing_transactions_amount",
  "total_outgoing_transactions_count",
  "total_cash_transactions_amount",
  "total_cash_transactions_count",
];

const complianceFieldLabels = {
  client_occupation: "Чем занимается клиент",
  monthly_income: "Метод открытия счета",
  total_outgoing_transactions_amount: "Общая ожидаемая сумма ежемесячных транзакций",
  total_outgoing_transactions_count: "Ожидаемое общее количество ежемесячных транзакций",
  total_cash_transactions_amount: "Ожидаемая общая сумма кассовых сделок",
  total_cash_transactions_count: "Ожидаемое общее количество кассовых сделок",
};

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
  { name: "source_of_funds", label: "Источник средств" },
  ...complianceCategories.map((name) => ({ name, label: complianceFieldLabels[name] })),
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
  const [complianceCheck, setComplianceCheck] = useState({
    state: "idle",
    matched: false,
    listType: "",
  });
  const [complianceOptions, setComplianceOptions] = useState({});
  const [complianceScoreByValue, setComplianceScoreByValue] = useState({});
  const [clientPhotoList, setClientPhotoList] = useState([]);
  const [clientDocumentList, setClientDocumentList] = useState([]);
  const watchedValues = Form.useWatch([], form);
  const values = useMemo(() => watchedValues || {}, [watchedValues]);

  const totalComplianceScore = useMemo(() => {
    const getScore = (value) => Number(complianceScoreByValue[value]) || 0;
    const booleanScore = (value) => (value === true ? 5 : 0);
    const residentScore = (value) => (value === false ? 5 : 0);
    const total =
      complianceCategories.reduce((sum, field) => sum + getScore(values[field]), 0) +
      residentScore(values.is_resident) +
      booleanScore(values.fatca) +
      booleanScore(values.apl_pzl);

    return Math.max(1, Math.round(total / 8));
  }, [complianceScoreByValue, values]);

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
      setComplianceCheck({ state: "idle", matched: false, listType: "" });
      setClientPhotoList([]);
      setClientDocumentList([]);
    }
  }, [form, open]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    const fetchComplianceOptions = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/compliance/score-options`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          },
          signal: controller.signal,
        });
        if (!response.ok) return;

        const options = await response.json();
        if (!Array.isArray(options)) return;

        const grouped = {};
        const scores = {};
        options.forEach((option) => {
          const category = option.category;
          if (!category) return;
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push({
            value: option.value,
            label: option.label || `${option.value} (${option.score || 0})`,
            sortOrder: option.sort_order || 0,
          });
          scores[option.value] = Number(option.score) || 0;
        });

        Object.keys(grouped).forEach((category) => {
          grouped[category].sort((a, b) => a.sortOrder - b.sortOrder);
          grouped[category] = grouped[category].map((option) => ({
            value: option.value,
            label: option.label,
          }));
        });

        setComplianceOptions(grouped);
        setComplianceScoreByValue(scores);
        form.setFieldsValue(
          complianceCategories.reduce((acc, category) => {
            if (!form.getFieldValue(category) && grouped[category]?.[0]?.value) {
              acc[category] = grouped[category][0].value;
            }
            return acc;
          }, {}),
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Ошибка загрузки справочников комплаенса:", error);
        }
      }
    };

    fetchComplianceOptions();

    return () => controller.abort();
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

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const identifier = String(values.inn || "").trim();
      const uploads = [
        ...clientPhotoList.map((item) => ({
          file: item.originFileObj,
          title: "Фото клиента",
          documentType: "selfie_with_passport",
        })),
        ...clientDocumentList.map((item) => ({
          file: item.originFileObj,
          title: item.name || "Документ клиента",
          documentType: "front_side_of_the_passport",
        })),
      ].filter((item) => item.file);

      for (const upload of uploads) {
        await uploadClientDocument(identifier, upload.title, upload.file, upload.documentType);
      }

      const result = await submitFrontovikNewClient({
        ...values,
        occupation: values.client_occupation,
        compliance_score: totalComplianceScore,
      });
      form.resetFields();
      setClientPhotoList([]);
      setClientDocumentList([]);
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
        autoComplete="off"
        initialValues={{
          is_resident: true,
          fatca: false,
          apl_pzl: false,
        }}
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
                    const isResident = getFieldValue("is_resident");
                    const valid = isResident === false
                      ? /^[A-Za-z0-9-]{5,32}$/.test(normalized)
                      : /^\d{9,14}$/.test(normalized) || /^[A-Za-z0-9-]{5,32}$/.test(normalized);
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
            <Form.Item label="Источник средств" name="source_of_funds" rules={[requiredRule]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <div className="new-client-compliance-block">
              <div className="new-client-compliance-block__header">
                <strong><ShieldCheck size={17} /> Параметры комплаенса</strong>
                <span>Балл комплаенса: <b>{totalComplianceScore}</b></span>
              </div>
              <Row gutter={16}>
                {complianceCategories.map((field) => (
                  <Col xs={24} md={field === "total_cash_transactions_count" ? 6 : 12} lg={field === "total_cash_transactions_count" ? 6 : 5} key={field}>
                    <Form.Item label={complianceFieldLabels[field]} name={field} rules={[requiredRule]}>
                      <AutoComplete
                        options={complianceOptions[field] || []}
                        filterOption={(inputValue, option) =>
                          String(option?.label || option?.value || "")
                            .toLowerCase()
                            .includes(inputValue.toLowerCase())
                        }
                        placeholder="Выберите или введите значение"
                      />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
              <div className="new-client-compliance-flags">
                <Form.Item label="Резидент" name="is_resident" rules={[requiredRule]}>
                  <Radio.Group options={yesNoOptions} optionType="button" buttonStyle="solid" />
                </Form.Item>
                <Form.Item label="Признак FATCA" name="fatca" rules={[requiredRule]}>
                  <Radio.Group options={yesNoOptions} optionType="button" buttonStyle="solid" />
                </Form.Item>
                <Form.Item label="Признак АПЛ/ПЗЛ" name="apl_pzl" rules={[requiredRule]}>
                  <Radio.Group options={yesNoOptions} optionType="button" buttonStyle="solid" />
                </Form.Item>
              </div>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Фото клиента">
              <Upload
                accept="image/*"
                beforeUpload={() => false}
                fileList={clientPhotoList}
                maxCount={1}
                onChange={({ fileList }) => setClientPhotoList(fileList)}
              >
                <Button>Загрузить фото</Button>
              </Upload>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Документ клиента">
              <Upload
                accept="image/*,.pdf,.doc,.docx"
                beforeUpload={() => false}
                fileList={clientDocumentList}
                maxCount={1}
                onChange={({ fileList }) => setClientDocumentList(fileList)}
              >
                <Button>Загрузить документ</Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>

        <div className="new-client-modal__actions">
          <Button onClick={onClose} disabled={submitting}>Отмена</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Отправить анкету
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
