import { useEffect } from "react";
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
  TransferTypeDict,
  DirectionTypeDict,
  CurrencyTypeDict,
} from "../../../domain/product/dictionaries";

export const MoneyTransferForm = ({
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
        transferType: Number(initialValues.transferType),
        direction: Number(initialValues.direction),
        currency: Number(initialValues.currency),
        currencyTo: Number(initialValues.currencyTo),
        isActive: Boolean(initialValues.isActive),
        channels: initialValues.channels || [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        bankId: 0,
        name: "",
        transferType: undefined,
        direction: undefined,
        currency: undefined,
        currencyTo: undefined,
        feePercent: 0,
        feeFixed: 0,
        minAmount: 0,
        maxAmountPerTransaction: 0,
        maxAmountPerDay: 0,
        executionTime: "",
        channels: [],
        freeTransfersCount: 0,
        isActive: true,
      });
    }
  }, [initialValues, form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      const transfer = {
        ...(initialValues?.id && { id: initialValues.id }),
        bankId: Number(values.bankId ?? 0),
        name: String(values.name ?? ""),
        transferType: Number(values.transferType ?? 0),
        direction: Number(values.direction ?? 0),
        currency: Number(values.currency ?? 0),
        currencyTo: Number(values.currencyTo ?? 0),
        feePercent: Number(values.feePercent ?? 0),
        feeFixed: Number(values.feeFixed ?? 0),
        minAmount: Number(values.minAmount ?? 0),
        maxAmountPerTransaction: Number(values.maxAmountPerTransaction ?? 0),
        maxAmountPerDay: Number(values.maxAmountPerDay ?? 0),
        executionTime: String(values.executionTime ?? ""),
        channels: values.channels || [],
        freeTransfersCount: Number(values.freeTransfersCount ?? 0),
        isActive: Boolean(values.isActive),
        updateDate: new Date().toISOString(),
      };

      await onSubmit(transfer);
      form.resetFields();
    } catch (error) {
      console.error("Validation error:", error);
    }
  };

  return (
    <Modal
      open={open}
      title={initialValues ? "Редактировать перевод" : "Новый перевод"}
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
          defaultActiveKey={["main", "amount", "limits", "channels"]}
        >
          <Collapse.Panel header="Основные данные" key="main">
            <Form.Item name="bankId" label="ID Банка">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите ID Банка"
                min={0}
              />
            </Form.Item>

            <Form.Item name="name" label="Название перевода">
              <Input placeholder="Введите название перевода" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="transferType" label="Тип перевода">
                  <Select
                    placeholder="Выберите тип перевода"
                    style={{ width: "100%" }}
                    allowClear
                  >
                    {Object.entries(TransferTypeDict).map(([key, val]) => (
                      <Select.Option key={key} value={Number(key)}>
                        {val}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item name="direction" label="Направление">
                  <Select
                    placeholder="Выберите направление"
                    style={{ width: "100%" }}
                    allowClear
                  >
                    {Object.entries(DirectionTypeDict).map(([key, val]) => (
                      <Select.Option key={key} value={Number(key)}>
                        {val}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="currency" label="Валюта отправки">
                  <Select
                    placeholder="Выберите валюту отправки"
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
              </Col>

              <Col span={12}>
                <Form.Item name="currencyTo" label="Валюта получения">
                  <Select
                    placeholder="Выберите валюту получения"
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
              </Col>
            </Row>
          </Collapse.Panel>

          <Collapse.Panel header="Сумма и комиссии" key="amount">
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
                <Form.Item
                  name="maxAmountPerTransaction"
                  label="Макс. сумма/транзакция"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите максимальную сумму за транзакцию"
                    min={0}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="maxAmountPerDay" label="Макс. сумма/день">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите максимальную сумму за день"
                    min={0}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="freeTransfersCount"
                  label="Бесплатные переводы"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите количество бесплатных переводов"
                    min={0}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="feePercent" label="Комиссия (%)">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите комиссию в процентах"
                    min={0}
                    max={100}
                    step={0.1}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item name="feeFixed" label="Фиксированная комиссия">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите фиксированную комиссию"
                    min={0}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="executionTime" label="Время исполнения">
              <Input placeholder="Например: 1–2 рабочих дня" />
            </Form.Item>
          </Collapse.Panel>

          <Collapse.Panel header="Каналы" key="channels">
            <Form.Item
              name="channels"
              label="Каналы"
              tooltip="Введите каждый канал с новой строки"
              getValueFromEvent={(e) => e.target.value.split("\n")}
              getValueProps={(value) => ({
                value: Array.isArray(value) ? value.join("\n") : "",
              })}
            >
              <Input.TextArea
                rows={4}
                placeholder="Каждый канал с новой строки"
              />
            </Form.Item>

            <Form.Item name="isActive" label="Активен" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Collapse.Panel>
        </Collapse>
      </Form>
    </Modal>
  );
};
