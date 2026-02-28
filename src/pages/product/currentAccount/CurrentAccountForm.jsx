import { useEffect } from "react";
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Switch,
  Row,
  Col,
  Input,
  Collapse,
} from "antd";
import { AccountTypeDict, CurrencyTypeDict } from "../../domain/dictionaries";

export const CurrentAccountForm = ({
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
        accountType: Number(initialValues.accountType),
        currency: Number(initialValues.currency),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        accountType: 0,
        currency: 0,
        overdraftAllowed: false,
        onlineOpening: false,
        isActive: true,
        openingFee: 0,
        monthlyFee: 0,
        interestOnBalance: 0,
        overdraftRate: 0,
        freeTransfersCount: 0,
      });
    }
  }, [initialValues, open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      const account = {
        ...(initialValues && initialValues.id ? { id: initialValues.id } : {}),
        bankId: Number(values.bankId || 0),
        name: values.name || "",
        accountType: Number(values.accountType || 0),
        currency: Number(values.currency || 0),
        openingFee: Number(values.openingFee || 0),
        monthlyFee: Number(values.monthlyFee || 0),
        interestOnBalance: Number(values.interestOnBalance || 0),
        overdraftAllowed: !!values.overdraftAllowed,
        overdraftRate: Number(values.overdraftRate || 0),
        freeTransfersCount: Number(values.freeTransfersCount || 0),
        onlineOpening: !!values.onlineOpening,
        isActive: !!values.isActive,
        updateDate: new Date().toISOString(),
      };

      await onSubmit(account);
      form.resetFields();
    } catch (error) {
      console.error("Validation error:", error);
    }
  };

  const overdraftAllowed = Form.useWatch("overdraftAllowed", form);

  return (
    <Modal
      open={open}
      title={initialValues ? "Редактировать счет" : "Новый счет"}
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
          defaultActiveKey={["main", "credit", "fees", "limits", "status"]}
        >
          <Collapse.Panel header="Основные данные" key="main">
            <Form.Item name="bankId" label="ID Банка">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите ID Банка"
                min={0}
              />
            </Form.Item>
            <Form.Item name="name" label="Название счета">
              <Input placeholder="Введите название счета" />
            </Form.Item>
            <Form.Item name="accountType" label="Тип счета">
              <Select
                placeholder="Выберите тип счета"
                style={{ width: "100%" }}
                allowClear
              >
                {Object.entries(AccountTypeDict).map(([key, val]) => (
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

          <Collapse.Panel header="Кредиты / овердрафт" key="credit">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="overdraftAllowed"
                  label="Овердрафт разрешен"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="interestOnBalance" label="Процент на остаток">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите процент на остаток"
                    min={0}
                    max={100}
                    step={0.1}
                  />
                </Form.Item>
              </Col>
            </Row>

            {overdraftAllowed && (
              <Form.Item
                name="overdraftRate"
                label="Ставка овердрафта"
                rules={[
                  {
                    required: true,
                    message: "Пожалуйста, введите ставку овердрафта",
                  },
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="Введите ставку овердрафта"
                  min={0}
                  max={100}
                  step={0.1}
                />
              </Form.Item>
            )}
          </Collapse.Panel>

          <Collapse.Panel header="Комиссии" key="fees">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="openingFee" label="Комиссия за открытие">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите комиссию за открытие"
                    min={0}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="monthlyFee" label="Ежемесячная комиссия">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Введите ежемесячную комиссию"
                    min={0}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Collapse.Panel>

          <Collapse.Panel header="Лимиты" key="limits">
            <Form.Item name="freeTransfersCount" label="Бесплатные переводы">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите количество бесплатных переводов"
                min={0}
              />
            </Form.Item>
          </Collapse.Panel>

          <Collapse.Panel header="Статус / Прочее" key="status">
            <Row gutter={16}>
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
