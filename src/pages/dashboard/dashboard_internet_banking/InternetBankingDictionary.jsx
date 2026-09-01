import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Input, Space, Table, message } from "antd";
import { RefreshCw, Save, Search } from "lucide-react";

import { listInternetBankingTranslations, saveInternetBankingTranslations } from "../../../api/internetBanking.js";
import { defaultTranslations } from "../../../data/internetBankingTranslations.js";

function mergeTranslations(remote = []) {
  const byKey = new Map(remote.map((row) => [row.key, row]));
  return defaultTranslations.map((row) => ({ ...row, ...(byKey.get(row.key) || {}), key: row.key }));
}

export default function InternetBankingDictionary() {
  const [rows, setRows] = useState(defaultTranslations);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const payload = await listInternetBankingTranslations();
      setRows(mergeTranslations(payload?.items));
      setDirty(false);
    } catch (error) {
      message.error(error.message);
      setRows(defaultTranslations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (key, language, value) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, [language]: value } : row));
    setDirty(true);
  };

  const save = async () => {
    const incomplete = rows.find((row) => !row.ru.trim() || !row.en.trim() || !row.tj.trim());
    if (incomplete) {
      message.error("Заполните все три языка перед сохранением");
      return;
    }
    setSaving(true);
    try {
      const payload = await saveInternetBankingTranslations(rows);
      setRows(mergeTranslations(payload?.items));
      setDirty(false);
      message.success("Словарь интернет-банка сохранён");
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("ru-RU");
    if (!value) return rows;
    return rows.filter((row) => [row.key, row.ru, row.en, row.tj].some((text) => text.toLocaleLowerCase("ru-RU").includes(value)));
  }, [query, rows]);

  const columns = [
    { title: "Русский", dataIndex: "ru", width: "33.33%", render: (value, row) => <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} value={value} onChange={(event) => update(row.key, "ru", event.target.value)} /> },
    { title: "English", dataIndex: "en", width: "33.33%", render: (value, row) => <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} value={value} onChange={(event) => update(row.key, "en", event.target.value)} /> },
    { title: "Тоҷикӣ", dataIndex: "tj", width: "33.33%", render: (value, row) => <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} value={value} onChange={(event) => update(row.key, "tj", event.target.value)} /> },
  ];

  return <Card className="ib-section-card ib-dictionary-card" bordered>
    <Alert type="info" showIcon message="Единый словарь интернет-банка" description="Изменения применяются на странице авторизации и во всех разделах интернет-банка. Новые интерфейсные тексты необходимо добавлять в этот словарь." />
    <div className="ib-dictionary-toolbar">
      <Input prefix={<Search size={16} />} allowClear value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по русскому, английскому или таджикскому тексту" />
      <Space>
        <Button icon={<RefreshCw size={16} />} onClick={load} disabled={saving}>Обновить</Button>
        <Button type="primary" icon={<Save size={16} />} onClick={save} loading={saving} disabled={!dirty}>Сохранить изменения</Button>
      </Space>
    </div>
    <Table rowKey="key" loading={loading} dataSource={filtered} columns={columns} tableLayout="fixed" pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100], showTotal: (total) => `Всего фраз: ${total}` }} />
  </Card>;
}
