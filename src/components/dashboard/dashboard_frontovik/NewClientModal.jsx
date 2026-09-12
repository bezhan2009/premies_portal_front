import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Col, Form, Input, Modal, Progress, Radio, Row, Select, Upload, message } from "antd";
import { Camera, FileUp, ShieldCheck, UserRound } from "lucide-react";
import { checkTerroristList, submitFrontovikNewClient } from "../../../api/complianceRequests.js";
import { uploadClientDocument } from "../../../api/clientsDataFiles/clientsDataFiles.js";
import {
  buildNewClientStatusReasons,
  getComplianceLookupStateForScreening,
  isQuestionnaireFieldValid,
  isTerrorScreeningReady,
} from "./newClientFormUtils.js";

import { useClientCreation } from "./useClientCreation.js";
import { ClientCreationFields, ClientCreationProgress, IdentityCheckIcon } from "./ClientCreationFields.jsx";
import CustomDateInput from "../../elements/CustomDateInput.jsx";

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
  { name: "middle_name", label: "Отчество", optional: true },
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
  ...complianceCategories.map((name) => ({ name, label: complianceFieldLabels[name] })),
  { name: "is_resident", label: "Резидент", boolean: true },
  { name: "fatca", label: "FATCA", boolean: true },
  { name: "apl_pzl", label: "АПЛ/ПЗЛ", boolean: true },
];

export default function NewClientModal({ open, onClose, onSubmitted, initialSearch = "" }) {
  const [form] = Form.useForm();
  const creation = useClientCreation(open, form);
  useEffect(() => { if (open) { const digits=String(initialSearch).replace(/\D/g, ""); if (/^992\d{9}$/.test(digits)) form.setFieldValue("phone",digits); else if (/^\d{9}$/.test(digits)) form.setFieldValue("inn",digits); } }, [open, initialSearch, form]);
  const [submitting, setSubmitting] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [complianceCheck, setComplianceCheck] = useState({
    state: "idle",
    identifier: "",
    matched: false,
    listType: "",
  });
  const [terrorScreening, setTerrorScreening] = useState({
    state: "idle",
    match: null,
  });
  const [complianceOptions, setComplianceOptions] = useState({});
  const [complianceOptionsError, setComplianceOptionsError] = useState('');
  const [complianceScoreByValue, setComplianceScoreByValue] = useState({});
  const [clientPhotoList, setClientPhotoList] = useState([]);
  const [clientDocumentList, setClientDocumentList] = useState([]);
  const watchedValues = Form.useWatch([], form);
  const values = useMemo(() => watchedValues || {}, [watchedValues]);
  const screeningIdentifier = String(values.inn || "").replace(/\s/g, "");
  const { pending: complianceLookupPending, isWhiteListed } =
    getComplianceLookupStateForScreening({
      identifier: screeningIdentifier,
      isResident: values.is_resident,
      complianceCheck,
    });

  const closeModal = () => {
    setCloseConfirmOpen(false);
    creation.dismiss();
    form.resetFields();
    setClientPhotoList([]);
    setClientDocumentList([]);
    onClose();
  };

  const requestClose = () => {
    setCloseConfirmOpen(true);
  };

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
    const creationFields = creation.enabled ? [
      ["department","Филиал"], ["service_group","Группа обслуживания"], ["codeword","Кодовое слово"], ["sex","Пол"], ["country","Страна"], ["latin_first_name","Имя латиницей"], ["latin_last_name","Фамилия латиницей"],
      ["sector","Сектор экономики"], ["tariff","Тарифная категория"], ["address.region_key","Область"],
      ["passport.type.code","Тип документа"], ["passport.number","Номер документа"], ["passport.issued","Дата выдачи"], ["passport.issuer","Кем выдан"], ["passport.expires","Срок действия"],
      ["address.country_name","Страна адреса"], ["address.region.name","Регион"], ["address.district.name","Район"], ["address.city.name","Город"], ["address.street.name","Улица"], ["address.house.code","Дом"], ["address.zip","Почтовый индекс"], ["address.okato","ОКАТО"], ["kopf","КОПФ"]
    ].map(([path,label])=>({name:path,label,validate:(_value,all)=>Boolean(path.split(".").reduce((item,key)=>item?.[key],all))})) : [];
    const fields = [...questionnaireFields, ...creationFields];
    const invalidFields = fields.filter(field => !isQuestionnaireFieldValid(field, values));
    const completed = fields.length - invalidFields.length;
    return {
      percent: Math.round((completed / fields.length) * 100),
      invalidFields,
    };
  }, [values, creation.enabled]);

  const statusReasons = useMemo(
    () => buildNewClientStatusReasons({
      complianceCheck,
      terrorScreening,
      complianceLookupPending,
      isWhiteListed,
      values,
    }),
    [complianceCheck, complianceLookupPending, isWhiteListed, terrorScreening, values],
  );

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setComplianceCheck({ state: "idle", identifier: "", matched: false, listType: "" });
      setTerrorScreening({ state: "idle", match: null });
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
        if (!response.ok) throw new Error('catalog unavailable');

        const options = await response.json();
        if (!Array.isArray(options) || complianceCategories.some(category => !options.some(option => option.category === category))) throw new Error('incomplete catalog');
        setComplianceOptionsError('');

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
          setComplianceOptionsError('Справочники комплаенс недоступны или не заполнены. Повторите открытие формы после их настройки в Daily.');
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
      setComplianceCheck({ state: "idle", identifier: "", matched: false, listType: "" });
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setComplianceCheck({ state: "loading", identifier, matched: false, listType: "" });
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
          identifier,
          matched: Boolean(result?.matched),
          listType: String(result?.list_type || "").toLowerCase(),
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setComplianceCheck({ state: "error", identifier, matched: false, listType: "" });
        }
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, values.inn]);

  useEffect(() => {
    const screeningData = {
      lastName: String(values.last_name || "").trim(),
      firstName: String(values.first_name || "").trim(),
      middleName: String(values.middle_name || "").trim(),
      birthDate: String(values.birth_date || "").trim(),
    };
    if (!open || complianceLookupPending || isWhiteListed || !isTerrorScreeningReady(screeningData)) {
      setTerrorScreening({ state: "idle", match: null });
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setTerrorScreening({ state: "checking", match: null });
      try {
        const match = await checkTerroristList(screeningData, { signal: controller.signal });
        setTerrorScreening({ state: match ? "matched" : "clear", match });
      } catch (error) {
        if (error.name !== "AbortError") {
          setTerrorScreening({ state: "error", match: null });
        }
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    complianceLookupPending,
    isWhiteListed,
    open,
    values.birth_date,
    values.first_name,
    values.last_name,
    values.middle_name,
  ]);

  const handleSubmit = async (values) => {
    if (creation.enabled && !creation.unique && !creation.pending) {
      const duplicateKinds = [
        creation.checks.inn?.state === "duplicate" ? "ИНН" : "",
        creation.checks.phone?.state === "duplicate" ? "телефоном" : "",
      ].filter(Boolean);
      if (duplicateKinds.length) {
        message.error(`Клиент с таким ${duplicateKinds.join(" и ")} уже существует в АБС`);
      } else if ([creation.checks.inn?.state, creation.checks.phone?.state].includes("loading")) {
        message.warning("Дождитесь завершения проверки ИНН и телефона");
      } else {
        message.error("Не удалось подтвердить уникальность ИНН и телефона. Проверьте поля повторно");
      }
      return;
    }
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

      if (creation.enabled) {
        const result = await creation.submit(values);
        if (result?.requires_compliance) { onSubmitted(result); onClose(); }
        return;
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

  return <>
    <Modal
      title={null}
      open={open}
      onCancel={requestClose}
      footer={null}
      width={1480}
      centered
      className="new-client-modal"
      destroyOnHidden
      maskClosable={!submitting}
      closable={!submitting}
    >
      <div className="new-client-modal__header">
        <span className="new-client-modal__header-icon"><UserRound size={22} /></span>
        <div>
          <span className="new-client-modal__eyebrow">Frontovik</span>
          <h2>Создание нового клиента</h2>
          <p>Заполните анкету и приложите фото и документ клиента.</p>
        </div>
      </div>

      <ClientCreationProgress creation={creation} onDone={(result) => { onSubmitted(result); onClose(); }} />
      <Form
        style={{ display: creation.locked ? "none" : undefined }}
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        className="new-client-form"
        initialValues={{
          is_resident: true,
          fatca: false,
          apl_pzl: false,
          country: "TJ",
          service_group: "5100",
          kopf: "4",
          sector: "7",
          tariff: "200",
          passport: { type: { code: "058" } },
          address: { country_name: "ТОҶИКИСТОН" },
        }}
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

        <section className="new-client-form-section">
          <div className="new-client-form-section__title">
            <span>1</span>
            <div><strong>Основные данные</strong><small>Персональная и контактная информация клиента</small></div>
          </div>
          <Row gutter={[18, 0]}>
            <Col xs={24} md={8}>
              <Form.Item label="Фамилия" name="last_name" rules={[requiredRule]}>
                <Input maxLength={100} placeholder="Введите фамилию" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Имя" name="first_name" rules={[requiredRule]}>
                <Input maxLength={100} placeholder="Введите имя" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Отчество (необязательно)" name="middle_name">
                <Input maxLength={100} placeholder="Введите отчество" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Дата рождения" name="birth_date" rules={[requiredRule]}>
                <CustomDateInput type="date" style={{ width: "100%" }} />
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
                        : /^\d{9,14}$/.test(normalized);
                      return valid
                        ? Promise.resolve()
                        : Promise.reject(new Error("Для резидента укажите ИНН; для нерезидента — идентификатор"));
                    },
                  }),
                ]}
              >
                <Input maxLength={32} placeholder="Введите ИНН" suffix={creation.enabled && <IdentityCheckIcon kind="inn" value={values.inn} check={creation.checks.inn} />} onBlur={() => creation.enabled && creation.check("inn", form.getFieldValue("inn"))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Номер телефона" name="phone" rules={[requiredRule]}>
                <Input maxLength={20} placeholder="992XXXXXXXXX" suffix={creation.enabled && <IdentityCheckIcon kind="phone" value={values.phone} check={creation.checks.phone} />} onBlur={() => creation.enabled && creation.check("phone", form.getFieldValue("phone"))} />
              </Form.Item>
            </Col>
          </Row>
        </section>

        {creation.enabled && <ClientCreationFields form={form} creation={creation} />}
        <section className="new-client-compliance-block">
          {complianceOptionsError && <Alert type="error" showIcon message={complianceOptionsError} />}
          <div className="new-client-compliance-block__header">
            <strong><ShieldCheck size={18} /> Параметры комплаенса</strong>
            <span>Балл комплаенса: <b>{totalComplianceScore}</b></span>
          </div>
          <div className="new-client-compliance-fields">
            {complianceCategories.map((field) => (
              <Form.Item key={field} label={complianceFieldLabels[field]} name={field} rules={[requiredRule]}>
                <Select
                  options={complianceOptions[field] || []}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Выберите значение"
                  allowClear
                />
              </Form.Item>
            ))}
          </div>
          <div className="new-client-compliance-flags">
            <Form.Item label="Резидент" name="is_resident" rules={[requiredRule]}>
              <Radio.Group options={yesNoOptions} />
            </Form.Item>
            <Form.Item label="Признак FATCA" name="fatca" rules={[requiredRule]}>
              <Radio.Group options={yesNoOptions} />
            </Form.Item>
            <Form.Item label="Признак АПЛ/ПЗЛ" name="apl_pzl" rules={[requiredRule]}>
              <Radio.Group options={yesNoOptions} />
            </Form.Item>
          </div>
        </section>

        <section className="new-client-form-section new-client-form-section--uploads">
          <div className="new-client-form-section__title">
            <span>3</span>
            <div><strong>Фото и документы</strong><small>Файлы будут прикреплены к клиенту по ИНН</small></div>
          </div>
          <div className="new-client-upload-grid">
            <Form.Item label="Фото клиента">
              <Upload
                accept="image/*"
                beforeUpload={() => false}
                fileList={clientPhotoList}
                maxCount={1}
                onChange={({ fileList }) => setClientPhotoList(fileList)}
              >
                <Button htmlType="button" icon={<Camera size={16} />}>Выбрать фото</Button>
              </Upload>
            </Form.Item>
            <Form.Item label="Документ клиента">
              <Upload
                accept="image/*,.pdf,.doc,.docx"
                beforeUpload={() => false}
                fileList={clientDocumentList}
                maxCount={1}
                onChange={({ fileList }) => setClientDocumentList(fileList)}
              >
                <Button htmlType="button" icon={<FileUp size={16} />}>Выбрать документ</Button>
              </Upload>
            </Form.Item>
          </div>
        </section>

        <div className="new-client-modal__actions">
          <Button htmlType="button" onClick={requestClose} disabled={submitting}>Отмена</Button>
          <Button
            type="primary"
            htmlType="button"
            loading={submitting}
            onClick={() => form.submit()}
          >
            {creation.enabled ? "Создать клиента" : "Отправить заявку"}
          </Button>
        </div>
      </Form>
    </Modal>
    <Modal
      open={closeConfirmOpen}
      title="Предупреждение"
      okText="Закрыть"
      cancelText="Остаться"
      okButtonProps={{ danger: true }}
      onOk={closeModal}
      onCancel={() => setCloseConfirmOpen(false)}
      maskClosable={false}
      centered
      zIndex={2100}
    >
      Вы закрываете окно, указанные данные могут пропасть
    </Modal>
  </>;
}
