import { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Collapse,
  Row,
  Col,
} from "antd";
import {
  DepositTypeDict,
  CurrencyTypeDict,
  CapitalizationTypeDict,
} from "../../../domain/product/dictionaries";

export const DepositForm = ({
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
        depositType: Number(initialValues.depositType),
        currency: Number(initialValues.currency),
        capitalization: (() => {
          if (typeof initialValues.capitalization === "number") {
            return initialValues.capitalization;
          } else {
            const entry = Object.entries(CapitalizationTypeDict).find(
              ([_, v]) => v === String(initialValues.capitalization),
            );
            return entry ? Number(entry[0]) : 0;
          }
        })(),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        depositType: 0,
        currency: 0,
        capitalization: 0,
        isActive: true,
        interestRateVariable: false,
        replenishmentAllowed: false,
        partialWithdrawalAllowed: false,
        autoProlongation: false,
        insurance: false,
        onlineOpening: false,
      });
    }
  }, [initialValues, form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      const deposit = {
        ...(initialValues?.id && { id: initialValues.id }),
        bankId: Number(values.bankId ?? 0),
        name: String(values.name ?? ""),
        depositType: Number(values.depositType ?? 0),
        currency: Number(values.currency ?? 0),
        minAmount: Number(values.minAmount ?? 0),
        maxAmount: Number(values.maxAmount ?? 0),
        termInMonths: Number(values.termInMonths ?? 0),
        interestRate: Number(values.interestRate ?? 0),
        interestRateVariable: Boolean(values.interestRateVariable),
        capitalization: Number(values.capitalization ?? 0),
        replenishmentAllowed: Boolean(values.replenishmentAllowed),
        partialWithdrawalAllowed: Boolean(values.partialWithdrawalAllowed),
        autoProlongation: Boolean(values.autoProlongation),
        earlyWithdrawalPenalty: Number(values.earlyWithdrawalPenalty ?? 0),
        insurance: Boolean(values.insurance),
        onlineOpening: Boolean(values.onlineOpening),
        isActive: Boolean(values.isActive),
        updateDate: new Date().toISOString(),
      };

      await onSubmit(deposit);
      form.resetFields();
    } catch (error) {
      console.error("Validation error:", error);
    }
  };

  return (
    <Modal
      open={open}
      title={initialValues ? "Редактировать депозит" : "Новый депозит"}
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
        <Collapse accordion defaultActiveKey={["main", "params", "logic"]}>
          <Collapse.Panel header="Основные данные" key="main">
            <Form.Item name="bankId" label="ID Банка">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите ID Банка"
                min={0}
              />
            </Form.Item>

            <Form.Item name="name" label="Название депозита">
              <Input placeholder="Введите название депозита" />
            </Form.Item>

            <Form.Item name="depositType" label="Тип депозита">
              <Select
                placeholder="Выберите тип депозита"
                style={{ width: "100%" }}
                allowClear
              >
                {Object.entries(DepositTypeDict).map(([key, val]) => (
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

          <Collapse.Panel header="Параметры" key="params">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="minAmount" label="Мин. сумма">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите минимальную сумму"
                    min={0}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="maxAmount" label="Макс. сумма">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите максимальную сумму"
                    min={0}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="termInMonths" label="Срок (мес)">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите срок в месяцах"
                    min={1}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="interestRate" label="Процентная ставка">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите процентную ставку"
                    min={0}
                    max={100}
                    step={0.1}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="capitalization" label="Капитализация">
              <Select
                placeholder="Выберите капитализацию"
                style={{ width: "100%" }}
                allowClear
              >
                {Object.entries(CapitalizationTypeDict).map(([key, val]) => (
                  <Select.Option key={key} value={Number(key)}>
                    {val}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="earlyWithdrawalPenalty"
              label="Штраф при досрочном снятии"
            >
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите штраф"
                min={0}
                step={0.1}
              />
            </Form.Item>
          </Collapse.Panel>

          <Collapse.Panel header="Логические поля" key="logic">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="interestRateVariable"
                  label="Плавающая ставка"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="replenishmentAllowed"
                  label="Пополнение"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="partialWithdrawalAllowed"
                  label="Частичное снятие"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="autoProlongation"
                  label="Автопролонгация"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="insurance"
                  label="Страхование"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="onlineOpening"
                  label="Онлайн открытие"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="isActive"
                  label="Активен"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Collapse.Panel>
        </Collapse>
      </Form>
    </Modal>
  );
};
