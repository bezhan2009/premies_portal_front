import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Space, Table, Typography, message } from 'antd';

const labels = { phone: 'Телефон', inn: 'ИНН', address: 'Адрес', passport: 'Паспорт', name: 'ФИО и данные', read: 'Просмотр клиента' };
export default function DirectorSanctions() {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(''), [error, setError] = useState('');
  const request = async (options = {}) => {
    const r = await fetch(`${import.meta.env.VITE_BACKEND_URL}/client-access/policies`, { ...options, headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' } });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Не удалось загрузить санкции'); return data;
  };
  const load = () => { setLoading(true); request().then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);
  const save = async row => { setSaving(row.department_code); try { setRows(await request({ method: 'PUT', body: JSON.stringify(row) })); setError(''); message.success('Настройки санкций сохранены'); } catch (e) { setError(e.message); } finally { setSaving(''); } };
  return <Card title="Санкции" extra={<Button onClick={load}>Обновить</Button>}>
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Paragraph>Выберите действия, для которых требуется подтверждение другого сотрудника. Настройки действуют только для назначенных вам подразделений. Санкция не расширяет права по кодам клиентов.</Typography.Paragraph>
      <Alert type="info" showIcon message="Просмотр — на срок, изменение — на одну операцию" description="Срок просмотра задаёт согласующий. Одобрение изменения относится только к данным конкретной заявки. Подписанное заявление остаётся обязательным." />
      {error && <Alert type="error" showIcon message={error} />}
      <Table rowKey="department_code" loading={loading} dataSource={rows} pagination={false} scroll={{ x: 950 }} locale={{ emptyText: <Empty description="Вам не назначены коды клиентов. Обратитесь к оператору." /> }} columns={[
        { title: 'Код клиентов', dataIndex: 'department_code' },
        ...Object.entries(labels).map(([kind, label]) => ({ title: label, render: (_, row) => <Checkbox aria-label={`${row.department_code}: ${label}`} checked={row.rules[kind]} disabled={Boolean(saving)} onChange={e => setRows(old => old.map(r => r.department_code === row.department_code ? { ...r, rules: { ...r.rules, [kind]: e.target.checked } } : r))} /> })),
        { title: '', render: (_, row) => <Button type="primary" loading={saving === row.department_code} disabled={Boolean(saving)} onClick={() => save(row)}>Сохранить</Button> },
      ]} />
    </Space>
  </Card>;
}
