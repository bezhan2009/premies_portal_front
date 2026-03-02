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
  CardTypeDict,
  CurrencyTypeDict,
} from "../../../domain/product/dictionaries";

export const CardForm = ({
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
        cardType: Number(initialValues.cardType),
        currency: Number(initialValues.currency),
        // currency: initialValues.currency,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        cardType: 0,
        currency: 0,
        isActive: true,
      });
    }
  }, [initialValues, form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const card = {
        ...(initialValues?.id && { id: initialValues.id }),
        bankId: Number(values.bankId || 0),
        name: values.name || "",
        cardType: Number(values.cardType || 0),
        paymentSystem: values.paymentSystem || "",
        currency: Number(values.currency || 0),

        issuanceFee: Number(values.issuanceFee || 0),
        annualFee: Number(values.annualFee || 0),

        cashbackCategories: values.cashbackCategories || "",
        interestOnBalance: Number(values.interestOnBalance || 0),

        creditLimitMin: Number(values.creditLimitMin || 0),
        creditLimitMax: Number(values.creditLimitMax || 0),
        gracePeriodDays: Number(values.gracePeriodDays || 0),

        withdrawalFeeOwnAtm: Number(values.withdrawalFeeOwnAtm || 0),
        withdrawalFeeOtherAtm: Number(values.withdrawalFeeOtherAtm || 0),
        withdrawalFeeInterAtm: Number(values.withdrawalFeeInterAtm || 0),

        transferFee: Number(values.transferFee || 0),
        smsInformingFee: Number(values.smsInformingFee || 0),

        onlineApplication: !!values.onlineApplication,
        deliveryAvailable: !!values.deliveryAvailable,
        customizableLimits: !!values.customizableLimits,
        isActive: !!values.isActive,

        dailyCashWithdrawalOwnAtmLimit: Number(
          values.dailyCashWithdrawalOwnAtmLimit || 0,
        ),
        dailyCashWithdrawalDomesticOtherAtmLimit: Number(
          values.dailyCashWithdrawalDomesticOtherAtmLimit || 0,
        ),
        dailyCashWithdrawalAbroadAtmLimit: Number(
          values.dailyCashWithdrawalAbroadAtmLimit || 0,
        ),

        monthlyCashWithdrawalOwnAtmLimit: Number(
          values.monthlyCashWithdrawalOwnAtmLimit || 0,
        ),
        monthlyCashWithdrawalDomesticOtherAtmLimit: Number(
          values.monthlyCashWithdrawalDomesticOtherAtmLimit || 0,
        ),
        monthlyCashWithdrawalAbroadAtmLimit: Number(
          values.monthlyCashWithdrawalAbroadAtmLimit || 0,
        ),

        dailyPosPurchaseDomesticLimit: Number(
          values.dailyPosPurchaseDomesticLimit || 0,
        ),
        dailyPosPurchaseAbroadLimit: Number(
          values.dailyPosPurchaseAbroadLimit || 0,
        ),
        monthlyPosPurchaseDomesticLimit: Number(
          values.monthlyPosPurchaseDomesticLimit || 0,
        ),
        monthlyPosPurchaseAbroadLimit: Number(
          values.monthlyPosPurchaseAbroadLimit || 0,
        ),

        dailyOnlinePurchaseLimit: Number(values.dailyOnlinePurchaseLimit || 0),
        monthlyOnlinePurchaseLimit: Number(
          values.monthlyOnlinePurchaseLimit || 0,
        ),

        dailyTotalSpendingLimit: Number(values.dailyTotalSpendingLimit || 0),
        monthlyTotalSpendingLimit: Number(
          values.monthlyTotalSpendingLimit || 0,
        ),

        updateDate: new Date().toISOString(),
      };

      await onSubmit(card);
      form.resetFields();
    } catch (error) {
      console.error("Validation error:", error);
    }
  };

  return (
    <Modal
      open={open}
      title={initialValues ? "Редактировать карту" : "Новая карта"}
      onCancel={onClose}
      onOk={handleOk}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={loading}
      okButtonProps={{ className: "red-button" }}
      cancelButtonProps={{ className: "red-button-outline" }}
      width={800}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Collapse
          accordion
          defaultActiveKey={["main", "logic", "credit", "fees", "limits"]}
        >
          {/* Основные данные */}
          <Collapse.Panel header="Основные данные" key="main">
            <Form.Item name="bankId" label="ID Банка">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Введите ID Банка"
              />
            </Form.Item>

            <Form.Item name="name" label="Название карты">
              <Input placeholder="Введите название карты" />
            </Form.Item>

            <Form.Item name="cardType" label="Тип карты">
              <Select
                placeholder="Выберите тип карты"
                style={{ width: "100%" }}
                allowClear
              >
                {Object.entries(CardTypeDict).map(([key, val]) => (
                  <Select.Option key={key} value={Number(key)}>
                    {val}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="paymentSystem" label="Платёжная система">
              <Select
                placeholder="Выберите платёжную систему"
                style={{ width: "100%" }}
                allowClear
              >
                <Select.Option value="Visa">Visa</Select.Option>
                <Select.Option value="MasterCard">MasterCard</Select.Option>
                <Select.Option value="Корти миллӣ">Корти миллӣ</Select.Option>
                <Select.Option value="UnionPay">UnionPay</Select.Option>
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
              {/* <Input placeholder="Введите валюту" /> */}
            </Form.Item>
          </Collapse.Panel>

          {/* Логические поля */}
          <Collapse.Panel header="Логические поля" key="logic">
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="onlineApplication"
                  label="Онлайн заявка"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="deliveryAvailable"
                  label="Доставка доступна"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="customizableLimits"
                  label="Настраиваемые лимиты"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="isActive"
                  label="Активна"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Collapse.Panel>

          {/* Кредитные параметры */}
          <Collapse.Panel header="Кредитные параметры" key="credit">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="creditLimitMin" label="Мин. кредитный лимит">
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="creditLimitMax" label="Макс. кредитный лимит">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="interestOnBalance" label="Процент на остаток">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="gracePeriodDays" label="Льготный период (дни)">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="cashbackCategories" label="Категории кешбэка">
              <Input />
            </Form.Item>
          </Collapse.Panel>

          {/* Комиссии */}
          <Collapse.Panel header="Комиссии" key="fees">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="issuanceFee" label="Стоимость выпуска">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="annualFee" label="Годовая комиссия">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="withdrawalFeeOwnAtm" label="Снятие (свой ATM)">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="withdrawalFeeOtherAtm"
                  label="Снятие (другой банк)"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="withdrawalFeeInterAtm"
              label="Снятие (за границей)"
            >
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item name="transferFee" label="Комиссия за перевод">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item name="smsInformingFee" label="SMS информирование">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          </Collapse.Panel>

          {/* Лимиты */}
          <Collapse.Panel header="Лимиты операций" key="limits">
            {/* ATM */}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="dailyCashWithdrawalOwnAtmLimit"
                  label="Снятие свой ATM/день"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="dailyCashWithdrawalDomesticOtherAtmLimit"
                  label="Снятие чужой ATM/день"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="dailyCashWithdrawalAbroadAtmLimit"
                  label="Снятие за границей/день"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="monthlyCashWithdrawalOwnAtmLimit"
                  label="Снятие свой ATM/месяц"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="monthlyCashWithdrawalDomesticOtherAtmLimit"
                  label="Снятие чужой ATM/месяц"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="monthlyCashWithdrawalAbroadAtmLimit"
                  label="Снятие за границей/месяц"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            {/* POS */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="dailyPosPurchaseDomesticLimit"
                  label="POS день (внутр.)"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="dailyPosPurchaseAbroadLimit"
                  label="POS день (за границей)"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="monthlyPosPurchaseDomesticLimit"
                  label="POS месяц (внутр.)"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="monthlyPosPurchaseAbroadLimit"
                  label="POS месяц (за границей)"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            {/* Онлайн и общий */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dailyOnlinePurchaseLimit" label="Онлайн/день">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="monthlyOnlinePurchaseLimit"
                  label="Онлайн/месяц"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dailyTotalSpendingLimit" label="Общий/день">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="monthlyTotalSpendingLimit" label="Общий/месяц">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
          </Collapse.Panel>
        </Collapse>
      </Form>
    </Modal>
  );
};
