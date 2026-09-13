import ClientChangeStatement from './ClientChangeStatement';
import { frontovikActorID } from '../../../utils/frontovikIdentity';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Col, Form, Input, Modal, Row, Select, Space, Spin, Typography } from 'antd';
import { getEditableProfile, getProfileChange, submitProfileChange } from '../../../api/ABS_frotavik/changeClientProfile';
import { newPhoneChangeID } from '../../../api/ABS_frotavik/changeClientPhone';
import { PassportFields } from './ClientCreationFields';
import ClientAddressFields from './ClientAddressFields';
const titles = {
  name: 'Изменение ФИО',
  inn: 'Изменение ИНН',
  passport: 'Изменение паспорта',
  address: 'Изменение адреса'
};
const terminal = job => ['completed', 'failed', 'rejected'].includes(job?.status);
const errorText = error => error?.response?.data?.error || 'Связь прервана. Проверяем состояние запроса.';
const required = {
  required: true,
  message: 'Обязательное поле'
};
export default function ChangeClientProfileModal({
  client,
  kind,
  onClose,
  onUpdated
}) {
  const code = client.client_code;
  const storageKey = `frontovik-profile-change:${frontovikActorID()}:${code}`;
  const [form] = Form.useForm();
  const [draftID] = useState(newPhoneChangeID);
  const [statement, setStatement] = useState(null);
  const changedValues = Form.useWatch([], form);
  const [profile, setProfile] = useState(null),
    [job, setJob] = useState(null),
    [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [notAccepted, setNotAccepted] = useState(false);
  const alive = useRef(true),
    submitting = useRef(false),
    notified = useRef('');
  const callback = useRef(onUpdated);
  callback.current = onUpdated;
  const accept = useCallback(result => {
    if (!alive.current) return;
    setJob(result);
    setError('');
    setNotAccepted(false);
    if (terminal(result)) {
      sessionStorage.removeItem(storageKey);
      if (notified.current !== result.request_id) {
        notified.current = result.request_id;
        Promise.resolve(callback.current?.(code)).catch(() => {
          if (alive.current) setError('Операция завершена. Повторите поиск клиента, чтобы обновить карточку.');
        });
      }
    }
  }, [code, storageKey]);
  useEffect(() => {
    alive.current = true;
    const load = async () => {
      let saved;
      try {
        saved = JSON.parse(sessionStorage.getItem(storageKey));
      } catch {/* invalid draft */}
      if (saved) setPending(saved);
      try {
        let active;
        try {
          active = await getProfileChange(code, 'active');
        } catch (cause) {
          if (cause?.response?.status !== 404) throw cause;
        }
        if (!alive.current) return;
        if (active) {
          setPending({
            request_id: active.request_id
          });
          accept(active);
          return;
        }
        if (saved) {
          try {
            accept(await getProfileChange(code, saved.request_id));
          } catch (cause) {
            if (alive.current) {
              setNotAccepted(cause?.response?.status === 404);
              setError(errorText(cause));
            }
          }
          return;
        }
        const data = await getEditableProfile(code);
        if (!alive.current) return;
        if (data.client_type !== 'individual') throw new Error('individual required');
        setProfile(data);
        const passport = data.passports?.find(p => !p.is_archival && p.is_default) || data.passports?.find(p => !p.is_archival);
        form.setFieldsValue({
          name: data.name,
          inn: data.inn,
          address: data.address,
          passport: passport && {
            ...passport,
            type: {
              code: passport.type.code.padStart(3, '0')
            }
          }
        });
      } catch (cause) {
        if (alive.current) setError(errorText(cause));
      } finally {
        if (alive.current) setBusy(false);
      }
    };
    void load();
    return () => {
      alive.current = false;
    };
  }, [code, form, storageKey, accept]);
  useEffect(() => {
    if (!pending || terminal(job) || notAccepted || busy) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await getProfileChange(code, pending.request_id);
        if (active) accept(result);
      } catch (cause) {
        if (!active) return;
        setError(errorText(cause));
        if (cause?.response?.status === 404 && pending.data) setNotAccepted(true);else setJob(current => ({
          ...current,
          checked_at: Date.now()
        }));
      }
    }, 2000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pending, job, notAccepted, busy, code, accept]);
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      let request = pending;
      if (!request) {
        if (!statement) { setError('Загрузите подписанное заявление'); return; }
        const values = await form.validateFields();
        const data = {
          kind,
          version: profile.version,
          [kind]: values[kind]
        };
        request = {
          request_id: draftID,
          document_id: statement?.id,
          data
        };
      }
      if (!request.data) return;
      sessionStorage.setItem(storageKey, JSON.stringify(request));
      setPending(request);
      setBusy(true);
      setError('');
      setNotAccepted(false);
      accept(await submitProfileChange(code, request));
    } catch (cause) {
      if (cause?.errorFields) return;
      if (!alive.current) return;
      // A rejected request has made no mutation; an uncertain request keeps its ID.
      if ([400, 403].includes(cause?.response?.status)) {
        sessionStorage.removeItem(storageKey);
        setPending(null);
      }
      if (cause?.response?.status === 409) {
        try {
          const active = await getProfileChange(code, 'active');
          setPending({
            request_id: active.request_id
          });
          accept(active);
          return;
        } catch {/* keep original ID for status reconciliation */}
      }
      setError(errorText(cause));
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const running = pending && !terminal(job) && !notAccepted;
  const nameField = (key, label, needed) => <Col xs={24} md={8} key={key}><Form.Item name={['name', key]} label={label} rules={needed ? [required] : []}><Input maxLength={100} /></Form.Item></Col>;
  return <Modal open width={kind === 'inn' ? 520 : 920} title={titles[job?.kind || pending?.data?.kind || kind]} onCancel={onClose} maskClosable={false} footer={<Space><Button onClick={onClose}>{running ? 'Закрыть — операция продолжится' : 'Закрыть'}</Button>{!terminal(job) && <Button type="primary" onClick={submit} loading={busy} disabled={Boolean(running) || (!statement && !pending) || !profile && !pending?.data}>{notAccepted ? 'Повторить отправку' : 'Отправить на санкцию'}</Button>}</Space>}>
    <Space direction="vertical" size="middle" style={{
      width: '100%'
    }}>
      <Typography.Text>{client.long_name} · {code}</Typography.Text>
      {busy && !pending && <Spin />}
      {profile && !pending && <Form form={form} layout="vertical" disabled={busy}>
        {kind === 'name' && <Row gutter={18}>{nameField('last_name', 'Фамилия', true)}{nameField('first_name', 'Имя', true)}{nameField('middle_name', 'Отчество', false)}{nameField('latin_last_name', 'Фамилия латиницей', false)}{nameField('latin_first_name', 'Имя латиницей', false)}{nameField('latin_middle_name', 'Отчество латиницей', false)}</Row>}
        {kind === 'inn' && <Form.Item name="inn" label="ИНН" rules={[required, {
          pattern: /^\d{9,14}$/,
          message: 'Введите от 9 до 14 цифр'
        }]}><Input inputMode="numeric" maxLength={14} /></Form.Item>}
        {kind === 'passport' && <><Form.Item name={['passport', 'nord']} label="Изменяемый документ" rules={[required]}><Select options={(profile.passports || []).filter(p => !p.is_archival).map(p => ({
              value: p.nord,
              label: `${p.series} ${p.number}`
            }))} onChange={nord => {
              const p = profile.passports.find(p => p.nord === nord);
              form.setFieldsValue({
                passport: {
                  ...p,
                  type: {
                    code: p.type.code.padStart(3, '0')
                  }
                }
              });
            }} /></Form.Item><PassportFields /></>}
        {kind === 'address' && <ClientAddressFields form={form} />}
      </Form>}
      {!pending && <ClientChangeStatement client={client} scopeID={draftID} kind={kind} changes={{ before: profile, after: changedValues }} document={statement} onDocument={setStatement} disabled={busy} />}
      {error && <Alert type="error" showIcon message={error} />}
      {running && <Alert type={job?.status === 'recovery_pending' ? 'warning' : 'info'} showIcon icon={<Spin size="small" />} message={job?.message || 'Проверяем и сохраняем данные клиента. Повторная отправка не требуется.'} />}
      {terminal(job) && <Alert type={job.status === 'completed' ? 'success' : 'error'} showIcon message={job.message} />}
      {pending && <Typography.Text type="secondary">Номер запроса: {pending.request_id}</Typography.Text>}
    </Space>
  </Modal>;
}
