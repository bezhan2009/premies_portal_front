import { useCallback, useEffect, useState } from "react";
import { Alert, Card, Space, Switch, Tag, Typography, message } from "antd";
import { ArrowLeftRight } from "lucide-react";

import { listInternetBankingPaymentCategories, setInternetBankingPaymentCategoryStatus } from "../../../api/internetBanking.js";

const { Text, Title } = Typography;

export default function InternetBankingPaymentCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listInternetBankingPaymentCategories();
      setItems(result?.items || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (item, checked) => {
    setSaving(item.code);
    try {
      const updated = await setInternetBankingPaymentCategoryStatus(item.code, checked);
      setItems((current) => current.map((entry) => entry.code === item.code ? updated : entry));
      message.success(checked ? "Перевод доступен в интернет-банке" : "Перевод временно отключён");
    } catch (requestError) {
      message.error(requestError.message);
    } finally {
      setSaving("");
    }
  };

  return <div className="ib-payment-categories">
    {error ? <Alert type="error" showIcon message={error} /> : null}
    <div className="ib-section-intro"><div><Title level={4}>Категории платежей и переводов</Title><Text type="secondary">Управление доступностью и настройками операций интернет-банка</Text></div></div>
    <div className="ib-category-grid">
      {items.map((item) => <Card loading={loading} key={item.code} className="ib-category-card">
        <div className="ib-category-icon"><ArrowLeftRight size={22} /></div>
        <div className="ib-category-content"><Space wrap><Title level={5}>{item.name}</Title><Tag color={item.is_active ? "green" : "red"}>{item.is_active ? "Доступен" : "Отключён"}</Tag></Space><Text type="secondary">{item.description}</Text><Text code>{item.code}</Text></div>
        <div className="ib-category-toggle"><Text strong>Доступен пользователям</Text><Switch checked={item.is_active} loading={saving === item.code} onChange={(checked) => toggle(item, checked)} /></div>
      </Card>)}
      {!loading && !items.length ? <Card><Text type="secondary">Категории пока не настроены</Text></Card> : null}
    </div>
  </div>;
}
