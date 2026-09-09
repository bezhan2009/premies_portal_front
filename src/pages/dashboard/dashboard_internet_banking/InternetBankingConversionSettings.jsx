import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Space, Switch, Typography, message } from "antd";
import { getInternetBankingConversionSettings, saveInternetBankingConversionSettings } from "../../../api/internetBanking.js";

export default function InternetBankingConversionSettings() {
  const [form] = Form.useForm();
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    setBusy(true); setError("");
    try { const result = await getInternetBankingConversionSettings(); setSettings(result); form.setFieldsValue(result); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async (values) => {
    setBusy(true); setError("");
    try {
      const result = await saveInternetBankingConversionSettings({ ...values, rate_group: values.rate_group || "", version: settings.version });
      setSettings(result); form.setFieldsValue(result); message.success("Настройки конвертации сохранены");
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  const codeRule = { pattern: /^[A-Z0-9_]{1,64}$/, message: "Код АБС: латинские заглавные буквы, цифры и знак _" };
  return <Card title="Конвертация валют" extra={<Button onClick={load} loading={busy}>Обновить</Button>}>
    <Space direction="vertical" style={{ width: "100%", maxWidth: 680 }} size="large">
      <Typography.Text type="secondary">Параметры расчёта курса в Colvir. Дата расчёта — текущий день в Таджикистане. Для указанных кодов в АБС должны быть настроены актуальные курсы.</Typography.Text>
      {error && <Alert type="error" showIcon message={error} />}
      <Form form={form} layout="vertical" onFinish={save} disabled={busy || !settings}>
        <Form.Item name="enabled" label="Конвертация доступна клиентам" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item name="rate_source" label="Источник курса (rateSource)" rules={[{ required: true }, codeRule]}><Input placeholder="E_RATE" maxLength={64} /></Form.Item>
        <Form.Item name="rate_type" label="Тип курса (rateType)" rules={[{ required: true }, codeRule]}><Input placeholder="RAT_FIZ" maxLength={64} /></Form.Item>
        <Form.Item name="rate_group" label="Группа курса (rateGroup)" rules={[codeRule]}><Input placeholder="Не задана" maxLength={64} /></Form.Item>
        <Form.Item name="quote_ttl_seconds" label="Срок подтверждения расчёта, секунд" rules={[{ required: true }]}><InputNumber min={30} max={600} precision={0} /></Form.Item>
        <Alert type="info" showIcon message="После изменения настроек ранее рассчитанные операции потребуют нового расчёта и подписей. Уже отправленные операции продолжают получать статус АБС." style={{ marginBottom: 20 }} />
        <Button type="primary" htmlType="submit" loading={busy}>Сохранить настройки</Button>
      </Form>
      {settings?.updated_at && <Typography.Text type="secondary">Изменено: {new Date(settings.updated_at).toLocaleString("ru-RU")} · Версия {settings.version}</Typography.Text>}
    </Space>
  </Card>;
}
