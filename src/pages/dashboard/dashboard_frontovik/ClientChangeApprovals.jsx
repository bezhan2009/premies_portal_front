import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, InputNumber, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { frontovikActorID } from '../../../utils/frontovikIdentity';
import { decideChangeApproval, downloadWorkflowAttachment, getChangePermissions, listChangeApprovals, workflowError } from '../../../api/frontovikWorkflow';

const changeLabels = { read: 'Просмотр клиента', phone: 'Телефон', inn: 'ИНН', address: 'Адрес', passport: 'Паспорт', name: 'ФИО' };
const statusLabels = { awaiting_approval: 'Ожидает санкции', approved: 'Подтверждено', rejected: 'Отклонено', queued: 'Принято АБС', processing: 'Выполняется', completed: 'Выполнено', failed: 'Ошибка', recovery_pending: 'Проверка результата' };
const valueLabels = { phone: 'Телефон', expected_phone: 'Текущий телефон', first_name: 'Имя', last_name: 'Фамилия', middle_name: 'Отчество', latin_first_name: 'Имя латиницей', latin_last_name: 'Фамилия латиницей', latin_middle_name: 'Отчество латиницей', number: 'Номер', series: 'Серия', issued: 'Дата выдачи', expires: 'Срок действия', issuer: 'Кем выдан', region: 'Область', district: 'Район', city: 'Город', street: 'Улица', house: 'Дом', flat: 'Квартира', zip: 'Индекс', text: 'Полный адрес', country_name: 'Страна' };
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
  const [minutes,setMinutes]=useState(10);
  const [params] = useSearchParams();
  const actor = frontovikActorID();
  const targetID = params.get('requestId');
  const refresh = useCallback(async () => {
    try { const data = await listChangeApprovals(); setRows(data); setSelected(old => data.find(x => x.request_id === (old?.request_id || targetID)) || null); setError(''); }
    catch (e) { setRows([]); setSelected(null); setError(workflowError(e)); } finally { setLoading(false); }
  }, [targetID]);
  useEffect(() => { getChangePermissions().then(setPermissions).catch(() => {}); void refresh(); const t = setInterval(refresh, 10000); return () => clearInterval(t); }, [refresh]);
  const decide = async decision => {
    setBusy(true);
    try { await decideChangeApproval(selected.request_id, decision, reason, minutes); setReason(''); await refresh(); message.success(decision === 'approved' ? 'Решение сохранено' : 'Заявка отклонена'); }
    catch (e) { message.error(workflowError(e)); } finally { setBusy(false); }
  };
  const canDecide = permissions.approve && selected?.status === 'awaiting_approval' && selected.actor_id !== actor;
  return <Card title="Заявки на санкции" extra={<Button onClick={refresh}>Обновить</Button>}>
    <Typography.Paragraph type="secondary">Другой сотрудник с правом санкции согласовывает просмотр на указанный срок или однократное изменение данных с подписанным заявлением.</Typography.Paragraph>
    {error && <Alert type="error" message={error} showIcon />}
    <Table rowKey="request_id" dataSource={rows} loading={loading} scroll={{ x: 850 }} columns={[
      { title: 'Клиент', render: (_, r) => <>{r.client_name}<br /><Typography.Text type="secondary">{r.client_code}</Typography.Text></> },
      { title: 'Действие', dataIndex: 'kind', render: k => changeLabels[k] },
      { title: 'Подал', dataIndex: 'actor_name' },
      { title: 'Статус', render: (_, r) => <Tag color={r.execution?.status === 'completed' ? 'green' : r.status === 'rejected' ? 'red' : 'gold'}>{statusLabels[r.execution?.status || r.status] || r.status}</Tag> },
      { title: 'Дата', dataIndex: 'created_at', render: v => new Date(v).toLocaleString('ru-RU') },
      { title: '', render: (_, r) => <Button onClick={() => { setSelected(r); setReason(''); setMinutes(10); }}>Открыть</Button> },
    ]} />
    <Modal open={Boolean(selected)} title={selected?.kind === 'read' ? 'Санкция на просмотр клиента' : 'Проверка изменения данных клиента'} width={780} onCancel={() => setSelected(null)} footer={<Space>
      <Button onClick={() => setSelected(null)}>Закрыть</Button>
      {canDecide && <><Button danger disabled={!reason.trim()} loading={busy} onClick={() => decide('rejected')}>Отклонить</Button><Button type="primary" loading={busy} disabled={selected?.kind === 'read' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)} onClick={() => decide('approved')}>{selected?.kind === 'read' ? 'Разрешить просмотр' : 'Подтвердить изменение'}</Button></>}
    </Space>}>
      {selected && <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Typography.Text strong>{selected.client_name} · {selected.client_code} · ИНН {selected.inn}</Typography.Text>
        {selected.kind !== 'read' && <><Typography.Text strong>Текущие данные</Typography.Text><Descriptions bordered size="small" column={1} items={proposedValues(selected.before)} />
        <Typography.Text strong>Предлагаемые данные</Typography.Text><Descriptions bordered size="small" column={1} items={proposedValues(selected.data)} /></>}
        {selected.document_id && <Button onClick={() => downloadWorkflowAttachment(selected.document_id).catch(e => message.error(workflowError(e)))}>Скачать подписанное заявление</Button>}
        {selected.kind === "read" && <><Typography.Text>Причина запроса: {selected.requested_reason || selected.reason}</Typography.Text>{canDecide && <label>Срок доступа, минуты (1–1440): <InputNumber aria-label="Срок доступа в минутах" min={1} max={1440} value={minutes} onChange={setMinutes} /></label>}{selected.expires_at && <Typography.Text>Доступ до: {new Date(selected.expires_at).toLocaleString("ru-RU")}</Typography.Text>}{selected.actor_id === actor && selected.status === "approved" && new Date(selected.expires_at).getTime() > Date.now() && <Button href={`/frontovik/abs-search?clientIndex=${encodeURIComponent(selected.client_code)}`}>Открыть клиента</Button>}</>}
        <Typography.Text>Подал: {selected.actor_name}. Подтвердил: {selected.checker_name || '—'}</Typography.Text>
        <Alert type={selected.status === 'rejected' ? 'error' : 'info'} showIcon message={selected.execution?.message || selected.message} description={selected.reason} />
        {canDecide && <Input.TextArea aria-label="Причина отказа" placeholder="Причина отказа обязательна при отклонении" maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} />}
        {selected.actor_id === actor && selected.status === 'awaiting_approval' && <Typography.Text type="secondary">Собственную заявку подтверждать нельзя.</Typography.Text>}
      </Space>}
    </Modal>
  </Card>;
}
