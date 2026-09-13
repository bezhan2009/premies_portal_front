import ClientChangeStatement from './ClientChangeStatement';
import { frontovikActorID } from '../../../utils/frontovikIdentity';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Space, Spin, Typography } from 'antd';
import { changeClientPhone, getClientPhoneChange, normalizeClientPhone, newPhoneChangeID } from '../../../api/ABS_frotavik/changeClientPhone';

const terminal = (job) => job?.status === 'completed' || ['failed', 'rejected'].includes(job?.status);
const errorText = (error) => error?.response?.data?.error || 'Связь с сервером прервана. Проверьте состояние запроса.';

export default function ChangeClientPhoneModal({ client, onClose, onUpdated }) {
  const clientCode = client.client_code;
  const storageKey = `frontovik-phone-change:${frontovikActorID()}:${clientCode}`;
  const [draftID] = useState(newPhoneChangeID);
  const [statement, setStatement] = useState(null);
  const [phone, setPhone] = useState(client.phone || '');
  const [job, setJob] = useState(null);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notAccepted, setNotAccepted] = useState(false);
  const submitting = useRef(false);
  const alive = useRef(true);
  const updated = useRef('');
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  const acceptJob = useCallback((result) => {
    if (!alive.current) return;
    setJob(result); setPhone(result.new_phone); setError(''); setNotAccepted(false);
    if (terminal(result)) {
      sessionStorage.removeItem(storageKey);
      if (result.phone && result.classifiers_restored && updated.current !== result.request_id) {
        updated.current = result.request_id;
        onUpdatedRef.current(result.phone, clientCode);
      }
    }
  }, [clientCode, storageKey]);

  useEffect(() => {
    alive.current = true;
    const load = async () => {
      let saved = null;
      try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* invalid draft */ }
      if (saved) { setRequest(saved); setPhone(saved.phone); }
      try {
        const active = await getClientPhoneChange(clientCode, 'active');
        if (!alive.current) return;
        const pending = { request_id: active.request_id, phone: active.new_phone, expected_phone: active.old_phone };
        setRequest(pending); sessionStorage.setItem(storageKey, JSON.stringify(pending)); acceptJob(active);
      } catch (cause) {
        if (!alive.current) return;
        if (cause?.response?.status !== 404) setError(errorText(cause));
        else if (saved) {
          try { acceptJob(await getClientPhoneChange(clientCode, saved.request_id)); }
          catch (statusError) { if (alive.current) { setNotAccepted(statusError?.response?.status === 404); setError(errorText(statusError)); } }
        }
      } finally { if (alive.current) setLoading(false); }
    };
    void load();
    return () => { alive.current = false; };
  }, [clientCode, storageKey, acceptJob]);

  useEffect(() => {
    if (!request || terminal(job) || notAccepted || loading) return;
    let active = true;
    const timer = setTimeout(async () => {
      try { const result = await getClientPhoneChange(clientCode, request.request_id); if (active) acceptJob(result); }
      catch (cause) {
        if (!active) return;
        if (cause?.response?.status === 404) { setNotAccepted(true); setError('Сервер не подтвердил приём запроса. Можно повторить отправку с тем же номером запроса.'); }
        else { setError(errorText(cause)); setJob((current) => ({ ...current, status: current?.status || 'queued', checked_at: Date.now() })); }
      }
    }, 2000);
    return () => { active = false; clearTimeout(timer); };
  }, [request, job, notAccepted, loading, clientCode, acceptJob]);

  const submit = async () => {
    if (submitting.current) return;
    const nextPhone = normalizeClientPhone(phone);
    const expected = normalizeClientPhone(client.phone);
    if (!nextPhone) { setError('Введите +992 и 9 цифр номера телефона'); return; }
    if (!expected) { setError('Обновите карточку клиента: текущий мобильный телефон не определён'); return; }
    if (!request && !statement) { setError('Загрузите подписанное заявление'); return; }
    const pending = request || { request_id: draftID, document_id: statement?.id, phone: nextPhone, expected_phone: expected };
    submitting.current = true; setLoading(true); setError(''); setNotAccepted(false); setRequest(pending);
    sessionStorage.setItem(storageKey, JSON.stringify(pending));
    try { acceptJob(await changeClientPhone(clientCode, pending)); }
    catch (cause) {
      if (!alive.current) return;
      if ([400, 403].includes(cause?.response?.status)) {
        sessionStorage.removeItem(storageKey); setRequest(null); setNotAccepted(false);
      }
      const existingID = cause?.response?.status === 409 && cause.response.data.request_id;
      if (existingID) {
        const pendingOther = { ...pending, request_id: existingID };
        setRequest(pendingOther); sessionStorage.setItem(storageKey, JSON.stringify(pendingOther));
      }
      setError(errorText(cause));
    } finally { submitting.current = false; if (alive.current) setLoading(false); }
  };
  const running = Boolean(request && !terminal(job) && !notAccepted);
  const changed = normalizeClientPhone(phone) && normalizeClientPhone(phone) !== normalizeClientPhone(client.phone);
  return <Modal open title="Изменение телефона клиента" onCancel={onClose} maskClosable={false}
    footer={<Space><Button onClick={onClose}>{running ? 'Закрыть — операция продолжится' : 'Закрыть'}</Button>
      {!terminal(job) && <Button type="primary" onClick={submit} loading={loading} disabled={running || !changed || (!statement && !request) || Boolean(error && !request)}>{notAccepted ? 'Повторить отправку' : 'Отправить на санкцию'}</Button>}</Space>}>
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Text>{client.long_name || [client.surname, client.name, client.patronymic].filter(Boolean).join(' ')} · {clientCode}</Typography.Text>
      <Typography.Text type="secondary">Текущий телефон: {client.phone || 'Не указан'}</Typography.Text>
      <label htmlFor="client-new-phone">Новый телефон</label>
      <Input id="client-new-phone" type="tel" autoComplete="off" placeholder="+992 900 00 11 22" maxLength={24} value={phone} onChange={(event) => { setPhone(event.target.value); setError(''); }} disabled={loading || Boolean(request)} />
      {!request && <ClientChangeStatement client={client} scopeID={draftID} kind="phone" changes={{ old_phone: client.phone, new_phone: phone }} document={statement} onDocument={document => { setStatement(document); setError(''); }} disabled={loading} />}
      {error && <Alert type="error" showIcon message={error} />}
      {running && <Alert type={job?.status === 'recovery_pending' ? 'warning' : 'info'} showIcon icon={<Spin size="small" />} message={job?.message || 'Изменяем телефон и проверяем данные клиента. Повторная отправка не требуется.'} />}
      {terminal(job) && <Alert type={job.status === 'completed' ? 'success' : 'error'} showIcon message={job.message} />}
      {request && <Typography.Text type="secondary">Номер запроса: {request.request_id}</Typography.Text>}
    </Space>
  </Modal>;
}
