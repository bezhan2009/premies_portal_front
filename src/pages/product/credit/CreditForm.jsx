import React, { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Row,
  Col,
  Collapse,
} from "antd";
import {
  LoanTypeDict,
  CurrencyTypeDict,
} from "../../../domain/product/dictionaries";

export const CreditForm = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  loading = false,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues && open) {
      form.setFieldsValue({
        ...initialValues,
        loanType: Number(initialValues.loanType),
        currency: Number(initialValues.currency),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        loanType: 0,
        currency: 0,
        isActive: true,
        onlineApplication: false,
        collateralRequired: false,
        insuranceRequired: false,
        documentsRequired: [],
      });
    }
  }, [initialValues, form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const credit = {
        ...(initialValues && initialValues.id ? { id: initialValues.id } : {}),
        bankId: Number(values.bankId || 0),
        name: values.name || "",
        loanType: Number(values.loanType || 0),
        currency: Number(values.currency || 0),
        minAmount: Number(values.minAmount || 0),
        maxAmount: Number(values.maxAmount || 0),
        minTermInMonths: Number(values.minTermInMonths || 0),
        maxTermInMonths: Number(values.maxTermInMonths || 0),
        interestRateFrom: Number(values.interestRateFrom || 0),
        interestRateTo: Number(values.interestRateTo || 0),
        effectiveRateFrom: Number(values.effectiveRateFrom || 0),
        effectiveRateTo: Number(values.effectiveRateTo || 0),
        gracePeriodMonths: Number(values.gracePeriodMonths || 0),
        collateralRequired: !!values.collateralRequired,
        insuranceRequired: !!values.insuranceRequired,
        earlyRepaymentFee: Number(values.earlyRepaymentFee || 0),
        applicationProcessingTime: values.applicationProcessingTime || "",
        ageMin: Number(values.ageMin || 0),
        ageMax: Number(values.ageMax || 0),
        incomeRequirement: Number(values.incomeRequirement || 0),
        documentsRequired: values.documentsRequired || [],
        onlineApplication: !!values.onlineApplication,
        isActive: !!values.isActive,
        updateDate: new Date().toISOString(),
      };
      await onSubmit(credit);
      form.resetFields();
    } catch (error) {
      console.error("Validation error:", error);
    }
  };

  return (
    <Modal
      open={open}
      title={initialValues ? "Редактировать кредит" : "Новый кредит"}
      onCancel={onClose}
      onOk={handleOk}
      okText="Сохранить"
      cancelText="Отмена"
      okButtonProps={{ className: "red-button" }}
      cancelButtonProps={{ className: "red-button-outline" }}
      confirmLoading={loading}
      width={800}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Collapse
          accordion
          defaultActiveKey={[
            "main",
            "logic",
            "terms",
            "rates",
            "age",
            "documents",
          ]}
        >
          <Collapse.Panel header="Основные данные" key="main">
            <Form.Item name="bankId" label="ID Банка">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите ID Банка"
              />
            </Form.Item>
            <Form.Item name="name" label="Название кредита">
              <Input placeholder="Введите название кредита" />
            </Form.Item>
            <Form.Item name="loanType" label="Тип кредита">
              <Select
                placeholder="Выберите тип кредита"
                style={{ width: "100%" }}
                allowClear
              >
                {Object.entries(LoanTypeDict).map(([key, val]) => (
                  <Select.Option key={key} value={Number(key)}>
                    {val}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="currency" label="Валюта">
              <Select
                placeholder="Выберите валюту"
                style={{ width: "100%" }}
                allowClear
              >
                {Object.entries(CurrencyTypeDict).map(([key, val]) => (
                  <Select.Option key={key} value={Number(key)}>
                    {val}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Collapse.Panel>

          <Collapse.Panel header="Логические поля" key="logic">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Form.Item
                  name="onlineApplication"
                  label="Онлайн заявка"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="isActive"
                  label="Активен"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="collateralRequired"
                  label="Требуется залог"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="insuranceRequired"
                  label="Требуется страховка"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Collapse.Panel>

          <Collapse.Panel header="Сумма и срок" key="terms">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="minAmount" label="Мин. сумма">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите минимальную сумму"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="maxAmount" label="Макс. сумма">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите максимальную сумму"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="minTermInMonths" label="Мин. срок (мес)">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите минимальный срок"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="maxTermInMonths" label="Макс. срок (мес)">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите максимальный срок"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="gracePeriodMonths" label="Льготный период (мес)">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите льготный период"
              />
            </Form.Item>
            <Form.Item
              name="earlyRepaymentFee"
              label="Комиссия за досрочное погашение"
            >
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите комиссию"
              />
            </Form.Item>
            <Form.Item
              name="applicationProcessingTime"
              label="Срок обработки заявки"
            >
              <Input placeholder="Например, 1-3 дня" />
            </Form.Item>
          </Collapse.Panel>

          <Collapse.Panel header="Ставки" key="rates">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="interestRateFrom" label="Процент от">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите процент от"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="interestRateTo" label="Процент до">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите процент до"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="effectiveRateFrom"
                  label="Эффективная ставка от"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите эффективную ставку от"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="effectiveRateTo" label="Эффективная ставка до">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите эффективную ставку до"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Collapse.Panel>

          <Collapse.Panel header="Возраст и доход" key="age">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="ageMin" label="Мин. возраст">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите минимальный возраст"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ageMax" label="Макс. возраст">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите максимальный возраст"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="incomeRequirement" label="Требуемый доход">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите требуемый доход"
              />
            </Form.Item>
          </Collapse.Panel>

          <Collapse.Panel header="Документы" key="documents">
            <Form.Item
              name="documentsRequired"
              label="Документы"
              tooltip="Введите каждый документ с новой строки"
              getValueFromEvent={(e) => e.target.value.split("\n")}
              getValueProps={(value) => ({
                value: Array.isArray(value) ? value.join("\n") : "",
              })}
            >
              <Input.TextArea
                rows={4}
                placeholder="Каждый документ с новой строки"
              />
            </Form.Item>
          </Collapse.Panel>
        </Collapse>
      </Form>
    </Modal>
  );
};
