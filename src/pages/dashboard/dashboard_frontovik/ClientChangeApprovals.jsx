import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { decideChangeApproval, downloadWorkflowAttachment, getChangePermissions, listChangeApprovals, workflowError } from '../../../api/frontovikWorkflow';

const changeLabels = { phone: 'Телефон', inn: 'ИНН', address: 'Адрес', passport: 'Паспорт', name: 'ФИО' };
const statusLabels = { awaiting_approval: 'Ожидает санкции', approved: 'Подтверждено', rejected: 'Отклонено', queued: 'Принято АБС', processing: 'Выполняется', completed: 'Выполнено', failed: 'Ошибка', recovery_pending: 'Проверка результата' };
const valueLabels = { phone: 'Новый телефон', expected_phone: 'Текущий телефон', first_name: 'Имя', last_name: 'Фамилия', middle_name: 'Отчество', latin_first: 'Имя латиницей', latin_last: 'Фамилия латиницей', latin_middle: 'Отчество латиницей', number: 'Номер', series: 'Серия', issued: 'Дата выдачи', expires: 'Срок действия', issuer: 'Кем выдан', region: 'Область', district: 'Район', city: 'Город', street: 'Улица', house: 'Дом', flat: 'Квартира', zip: 'Индекс', text: 'Полный адрес', country_name: 'Страна' };
function proposedValues(value, prefix = '') {
  return Object.entries(value || {}).flatMap(([key, item]) => {
    if (['kind', 'version', 'address_id', 'nord', 'is_archival', 'is_default'].includes(key) || item == null || item === '') return [];
    const label = [prefix, valueLabels[key] || changeLabels[key] || key].filter(Boolean).join(' / ');
    return typeof item === 'object' ? proposedValues(item, label) : [{ key: label, label, children: String(item) }];
  });
}
export default function ClientChangeApprovals() {
  const [rows, setRows] = useState([]), [selected, setSelected] = useState(null), [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [reason, setReason] = useState('');
  const [params] = useSearchParams();
  const actor = Number(localStorage.getItem('user_id'));
  const targetID = params.get('requestId');
  const refresh = useCallback(async () => {
    try { const data = await listChangeApprovals(); setRows(data); setSelected(old => data.find(x => x.request_id === (old?.request_id || targetID)) || old); setError(''); }
    catch (e) { setError(workflowError(e)); } finally { setLoading(false); }
  }, [targetID]);
  useEffect(() => { getChangePermissions().then(setPermissions).catch(() => {}); void refresh(); const t = setInterval(refresh, 10000); return () => clearInterval(t); }, [refresh]);
  const decide = async decision => {
    setBusy(true);
    try { await decideChangeApproval(selected.request_id, decision, reason); setReason(''); await refresh(); message.success(decision === 'approved' ? 'Санкция сохранена. Операция выполняется' : 'Заявка отклонена'); }
    catch (e) { message.error(workflowError(e)); } finally { setBusy(false); }
  };
  const canDecide = permissions.approve && selected?.status === 'awaiting_approval' && selected.actor_id !== actor;
  return <Card title="Санкции изменения данных" extra={<Button onClick={refresh}>Обновить</Button>}>
    <Typography.Paragraph type="secondary">Сотрудник подаёт заявку с заявлением. Другой сотрудник с правом санкции проверяет документ и подтверждает изменение.</Typography.Paragraph>
    {error && <Alert type="error" message={error} showIcon />}
    <Table rowKey="request_id" dataSource={rows} loading={loading} scroll={{ x: 850 }} columns={[
      { title: 'Клиент', render: (_, r) => <>{r.client_name}<br /><Typography.Text type="secondary">{r.client_code}</Typography.Text></> },
      { title: 'Изменение', dataIndex: 'kind', render: k => changeLabels[k] },
      { title: 'Подал', dataIndex: 'actor_name' },
      { title: 'Статус', render: (_, r) => <Tag color={r.execution?.status === 'completed' ? 'green' : r.status === 'rejected' ? 'red' : 'gold'}>{statusLabels[r.execution?.status || r.status] || r.status}</Tag> },
      { title: 'Дата', dataIndex: 'created_at', render: v => new Date(v).toLocaleString('ru-RU') },
      { title: '', render: (_, r) => <Button onClick={() => { setSelected(r); setReason(''); }}>Открыть</Button> },
    ]} />
    <Modal open={Boolean(selected)} title="Проверка изменения данных клиента" width={780} onCancel={() => setSelected(null)} footer={<Space>
      <Button onClick={() => setSelected(null)}>Закрыть</Button>
      {canDecide && <><Button danger disabled={!reason.trim()} loading={busy} onClick={() => decide('rejected')}>Отклонить</Button><Button type="primary" loading={busy} onClick={() => decide('approved')}>Подтвердить изменение</Button></>}
    </Space>}>
      {selected && <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Typography.Text strong>{selected.client_name} · {selected.client_code} · ИНН {selected.inn}</Typography.Text>
        <Typography.Text strong>Текущие данные</Typography.Text><Descriptions bordered size="small" column={1} items={proposedValues(selected.before)} />
        <Typography.Text strong>Предлагаемые данные</Typography.Text><Descriptions bordered size="small" column={1} items={proposedValues(selected.data)} />
        <Button onClick={() => downloadWorkflowAttachment(selected.document_id).catch(e => message.error(workflowError(e)))}>Скачать подписанное заявление</Button>
        <Typography.Text>Подал: {selected.actor_name}. Подтвердил: {selected.checker_name || '—'}</Typography.Text>
        <Alert type={selected.status === 'rejected' ? 'error' : 'info'} showIcon message={selected.execution?.message || selected.message} description={selected.reason} />
        {canDecide && <Input.TextArea aria-label="Причина отказа" placeholder="Причина отказа обязательна при отклонении" maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} />}
        {selected.actor_id === actor && selected.status === 'awaiting_approval' && <Typography.Text type="secondary">Собственную заявку подтверждать нельзя.</Typography.Text>}
      </Space>}
    </Modal>
  </Card>;
}
