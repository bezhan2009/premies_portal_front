import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Empty, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { actOnEmbosserJob, getEmbosserCapabilities, getEmbosserJob, listEmbosserJobs } from '../../../api/embosser';
import './EmbosserPage.css';

const embossLabels = {
  new: 'Новая', accepted: 'В работе', ready: 'Готова к картомату', held: 'Приостановлена', defective: 'Брак',
};
const kioskLabels = {
  ready: 'Ожидает кода', sending: 'Отправка кода', sent: 'Код отправлен', verified: 'Код подтверждён',
  issuing: 'Выдача в АБС', issued: 'Выдана', failed: 'Ошибка печати', needs_review: 'Требует сверки', otp_locked: 'Код заблокирован', sms_failed: 'SMS не отправлено',
};
const actionLabels = { accept: 'Принять в работу', release: 'Передать в картомат', hold: 'Приостановить', defect: 'Отметить брак', retry: 'Разрешить повтор печати' };
const restrictedKioskStates = new Set(['issuing', 'issued', 'needs_review']);
const reasonActions = new Set(['hold', 'defect', 'retry']);

function actionsFor(item) {
  if (!item || item.opening_status !== 'completed' || restrictedKioskStates.has(item.kiosk_state)) return [];
  if (item.emboss_state === 'new') return ['accept', 'hold', 'defect'];
  if (item.emboss_state === 'accepted') return ['', 'ready'].includes(item.kiosk_state) ? ['release', 'hold', 'defect'] : ['hold', 'defect'];
  if (item.emboss_state === 'held') return ['', 'ready'].includes(item.kiosk_state) ? ['accept', 'defect'] : ['defect'];
  if (item.emboss_state === 'ready') return item.kiosk_state === 'failed' ? ['retry', 'hold', 'defect'] : ['hold', 'defect'];
  return [];
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('ru-RU') : '—';
}

function errorText(error) {
  return error?.response?.data?.error || error?.message || 'Не удалось выполнить запрос';
}

export default function EmbosserPage() {
  const [filters, setFilters] = useState({ q: '', status: '', offset: 0 });
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [capabilities, setCapabilities] = useState(null);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listEmbosserJobs({ ...filters, limit: 30 });
      setRows(result.items || []);
      setTotal(result.total || 0);
      setError('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    getEmbosserCapabilities().then(setCapabilities).catch(() => setCapabilities(null));
  }, []);

  const openDetail = useCallback(async id => {
    setDetailLoading(true);
    try {
      const result = await getEmbosserJob(id);
      setSelected(result.item);
      setEvents(result.events || []);
    } catch (err) {
      messageApi.error(errorText(err));
    } finally {
      setDetailLoading(false);
    }
  }, [messageApi]);

  const submitAction = async () => {
    if (!selected || !pendingAction || (reasonActions.has(pendingAction) && reason.trim().length < 10)) return;
    setSaving(true);
    try {
      await actOnEmbosserJob(selected.request_id, pendingAction, reason.trim());
      messageApi.success('Действие сохранено');
      setPendingAction('');
      setReason('');
      await Promise.all([openDetail(selected.request_id), load()]);
    } catch (err) {
      messageApi.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { title: 'Создана', dataIndex: 'created_at', width: 165, render: formatDate },
    { title: 'Операция', dataIndex: 'operation_id', width: 240, render: value => <Typography.Text copyable>{value}</Typography.Text> },
    { title: 'Клиент', dataIndex: 'client_code', width: 135 },
    { title: 'Продукт', dataIndex: 'product', width: 110 },
    { title: 'Держатель', dataIndex: 'cardholder', ellipsis: true, render: value => value || '—' },
    { title: 'Заявка', dataIndex: 'opening_status', width: 130, render: value => <Tag>{value}</Tag> },
    { title: 'Эмбоссирование', dataIndex: 'emboss_state', width: 175, render: value => <Tag color={value === 'ready' ? 'green' : value === 'defective' ? 'red' : 'blue'}>{embossLabels[value] || value}</Tag> },
    { title: 'Картомат', dataIndex: 'kiosk_state', width: 155, render: value => value ? <Tag color={value === 'issued' ? 'green' : value === 'needs_review' ? 'orange' : 'default'}>{kioskLabels[value] || value}</Tag> : '—' },
    { title: '', key: 'open', width: 115, render: (_, row) => <Button onClick={() => openDetail(row.request_id)}>Подробнее</Button> },
  ], [openDetail]);

  return <div className="embosser-page">
    {contextHolder}
    <div className="embosser-page__heading">
      <div><Typography.Title level={2}>Эмбоссер</Typography.Title><Typography.Text type="secondary">Очередь именных карт, печать через картомат и журнал решений</Typography.Text></div>
      <Button onClick={load} loading={loading}>Обновить</Button>
    </div>
    {capabilities && !capabilities.kiosk_enabled && <Alert type="warning" showIcon message="Выдача через картомат пока не настроена" description="Очередь и ручные решения доступны. Персонализация будет запущена только после настройки подключения картомата и Colvir." />}
    {error && <Alert type="error" showIcon message={error} />}
    <Card className="embosser-page__card">
      <div className="embosser-page__filters">
        <Input.Search placeholder="Код клиента или номер операции" value={search} onChange={e => setSearch(e.target.value)} onSearch={() => setFilters(prev => ({ ...prev, q: search.trim(), offset: 0 }))} allowClear enterButton="Найти" />
        <Select aria-label="Статус заявки" value={filters.status} onChange={status => setFilters(prev => ({ ...prev, status, offset: 0 }))} options={[{ value: '', label: 'Все заявки' }, { value: 'completed', label: 'Заявка завершена' }, { value: 'failed', label: 'Ошибка открытия' }, { value: 'awaiting_account', label: 'Ожидает счёт' }]} />
        <Typography.Text type="secondary">Найдено: {total}</Typography.Text>
      </div>
      <Table rowKey="request_id" columns={columns} dataSource={rows} loading={loading} scroll={{ x: 1200 }} locale={{ emptyText: <Empty description="Заявки не найдены" /> }} pagination={{ current: Math.floor(filters.offset / 30) + 1, pageSize: 30, total, showSizeChanger: false, onChange: page => setFilters(prev => ({ ...prev, offset: (page - 1) * 30 })) }} />
    </Card>
    <Drawer title="Заявка на карту" open={!!selected} width={640} onClose={() => { setSelected(null); setEvents([]); }} loading={detailLoading}>
      {selected && <>
        <Descriptions bordered column={1} size="small" items={[
          { key: 'operation', label: 'Номер операции', children: <Typography.Text copyable>{selected.operation_id}</Typography.Text> },
          { key: 'client', label: 'Код клиента', children: selected.client_code },
          { key: 'holder', label: 'Имя на карте', children: selected.cardholder || '—' },
          { key: 'card', label: 'Card ID', children: selected.card_id ? <Typography.Text copyable>{selected.card_id}</Typography.Text> : '—' },
          { key: 'product', label: 'Продукт', children: `${selected.product} · ${selected.currency}` },
          { key: 'application', label: 'Заявка АБС', children: selected.application_code || '—' },
          { key: 'opening', label: 'Открытие', children: selected.opening_status },
          { key: 'emboss', label: 'Эмбоссирование', children: embossLabels[selected.emboss_state] || selected.emboss_state },
          { key: 'kiosk', label: 'Картомат', children: kioskLabels[selected.kiosk_state] || selected.kiosk_state || 'Не начато' },
        ]} />
        <Typography.Paragraph className="embosser-page__hint">Картомат получает заявку по номеру операции и сам подтверждает выдачу в АБС после проверки телефона. При состоянии «Требует сверки» повторная проводка заблокирована.</Typography.Paragraph>
        <Space wrap className="embosser-page__actions">{actionsFor(selected).map(action => <Button key={action} danger={action === 'defect'} type={action === 'release' ? 'primary' : 'default'} onClick={() => { setPendingAction(action); setReason(''); }}>{actionLabels[action]}</Button>)}</Space>
        <Typography.Title level={5} className="embosser-page__history-title">История действий</Typography.Title>
        {events.length ? events.map(event => <div className="embosser-page__event" key={event.id}><strong>{actionLabels[event.action] || event.action}</strong><span>{formatDate(event.created_at)} · сотрудник #{event.actor_id}</span>{event.reason && <p>{event.reason}</p>}</div>) : <Typography.Text type="secondary">Действий пока нет</Typography.Text>}
      </>}
    </Drawer>
    <Modal title={actionLabels[pendingAction]} open={!!pendingAction} onCancel={() => setPendingAction('')} onOk={submitAction} okButtonProps={{ disabled: reasonActions.has(pendingAction) && reason.trim().length < 10, loading: saving }} okText="Подтвердить" cancelText="Отмена" destroyOnHidden>
      {reasonActions.has(pendingAction) ? <><Typography.Paragraph>Укажите причину (не менее 10 символов). Она сохранится в журнале.</Typography.Paragraph><Input.TextArea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} rows={4} /></> : <Typography.Paragraph>Действие будет записано в журнале заявки.</Typography.Paragraph>}
    </Modal>
  </div>;
}
