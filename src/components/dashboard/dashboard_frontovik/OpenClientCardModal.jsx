import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Descriptions, Input, Modal, Radio, Select, Space, Spin, Steps, Tag } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { cardOpeningCapabilities, getCardOpening, openClientCard, selectCardAccount } from '../../../api/ABS_frotavik/openClientCard';
import { newPhoneChangeID } from '../../../api/ABS_frotavik/changeClientPhone';
import { isFrontovik } from '../../../api/roleHelper';
import visaImage from '../../../assets/visa.jpg';
import mastercardImage from '../../../assets/mc.jpg';
import nationalImage from '../../../assets/nc.jpg';
import './OpenClientCardModal.css';

const groups = [
  { key: 'visa', name: 'Visa', image: visaImage },
  { key: 'mastercard', name: 'Mastercard', image: mastercardImage },
  { key: 'national', name: 'Корти Милли', image: nationalImage },
];
const stopped = job => ['completed', 'failed', 'needs_review', 'awaiting_account'].includes(job?.status);
const errorText = error => error?.response?.data?.error || 'Связь прервана. Состояние операции сохранено; проверяем ответ сервера.';
const stepNumber = step => {
  if (['load_client'].includes(step)) return 0;
  if (['load_accounts'].includes(step)) return 1;
  if (['create_sca', 'sca_submitting', 'reload_accounts', 'select_account'].includes(step)) return 2;
  if (['register_card', 'register_submitting', 'account_mismatch'].includes(step)) return 3;
  if (['verify_application', 'verify_card'].includes(step)) return 4;
  return 5;
};

export function OpenClientCardButton({ client, onOpened }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    if (isFrontovik()) cardOpeningCapabilities().then(result => { if (active) setEnabled(result.enabled); }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!enabled || !client?.client_code) return null;
  return <>
    <Button type="primary" aria-label="Открыть карту" icon={<CreditCardOutlined />} onClick={() => setOpen(true)}>Открыть карту</Button>
    {open && <OpenClientCardModal client={client} onOpened={onOpened} onClose={() => setOpen(false)} />}
  </>;
}

export default function OpenClientCardModal({ client, onClose, onOpened }) {
  const code = client.client_code;
  const storageKey = `frontovik-card-opening:${localStorage.getItem('user_id') || 'session'}:${code}`;
  const [catalog, setCatalog] = useState([]), [product, setProduct] = useState(''), [currency, setCurrency] = useState('TJS');
  const [search, setSearch] = useState(''), [selectedAccount, setSelectedAccount] = useState('');
  const [job, setJob] = useState(null), [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [notAccepted, setNotAccepted] = useState(false), [enabled, setEnabled] = useState(false);
  const alive = useRef(true), submitting = useRef(false), notified = useRef('');
  const callback = useRef(onOpened); callback.current = onOpened;
  const chosen = catalog.find(card => card.code === product);

  const accept = useCallback(result => {
    if (!alive.current) return;
    setJob(result); setError(''); setNotAccepted(false);
    if (result.status === 'completed' || result.status === 'failed') {
      sessionStorage.removeItem(storageKey);
      if (result.status === 'completed' && notified.current !== result.request_id) {
        notified.current = result.request_id;
        Promise.resolve(callback.current?.(code, result)).catch(() => {
          if (alive.current) setError('Карта открыта. Повторите поиск клиента, чтобы обновить список карт и счетов.');
        });
      }
    }
  }, [code, storageKey]);

  useEffect(() => {
    alive.current = true;
    const load = async () => {
      let saved;
      try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* no valid pending operation */ }
      if (saved?.request_id) setPending(saved);
      try {
        const [capabilities, active] = await Promise.all([
          cardOpeningCapabilities(),
          getCardOpening(code, 'active').catch(cause => { if (cause?.response?.status === 404) return null; throw cause; }),
        ]);
        if (!alive.current) return;
        setEnabled(capabilities.enabled); setCatalog(capabilities.products || []);
        if (!capabilities.enabled) setError('Открытие карт сейчас недоступно');
        if (active) { setPending({ request_id: active.request_id }); accept(active); return; }
        if (saved?.request_id) {
          try { accept(await getCardOpening(code, saved.request_id)); }
          catch (cause) { if (alive.current) { setNotAccepted(cause?.response?.status === 404); setError(errorText(cause)); } }
        }
      } catch (cause) { if (alive.current) setError(errorText(cause)); }
      finally { if (alive.current) setLoading(false); }
    };
    void load();
    return () => { alive.current = false; };
  }, [accept, code, storageKey]);

  const requestID = job?.request_id || pending?.request_id;
  const pollingStopped = stopped(job);
  const poll = useCallback(async () => {
    if (!requestID) return;
    try { accept(await getCardOpening(code, requestID)); }
    catch (cause) { if (alive.current) { setError(errorText(cause)); setNotAccepted(cause?.response?.status === 404); } }
  }, [accept, code, requestID]);
  useEffect(() => {
    if (!requestID || pollingStopped || notAccepted) return;
    let cancelled = false, timer;
    const tick = async () => { await poll(); if (!cancelled) timer = setTimeout(tick, 4000); };
    timer = setTimeout(tick, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pollingStopped, notAccepted, poll, requestID]);

  const submit = async (retry = false) => {
    if (submitting.current || (!retry && pending)) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const input = retry ? pending : { request_id: newPhoneChangeID(), data: { product, currency, issue_type: 'NAMED' } };
      if (!input?.data) throw new Error('Request parameters missing');
      // Save the id before sending. Retries always keep the same id and input.
      sessionStorage.setItem(storageKey, JSON.stringify(input)); setPending(input); setNotAccepted(false);
      accept(await openClientCard(code, input));
    } catch (cause) {
      if (alive.current) {
        setError(errorText(cause));
        if (cause?.response?.status === 409) {
          try { const active = await getCardOpening(code, 'active'); setPending({ request_id: active.request_id }); accept(active); } catch { /* keep the original request id for reconciliation */ }
        }
      }
    } finally { submitting.current = false; if (alive.current) setBusy(false); }
  };
  const chooseAccount = async () => {
    if (submitting.current || !selectedAccount) return;
    submitting.current = true; setBusy(true); setError('');
    try { accept(await selectCardAccount(code, requestID, selectedAccount)); }
    catch (cause) { if (alive.current) setError(errorText(cause)); await poll(); }
    finally { submitting.current = false; if (alive.current) setBusy(false); }
  };

  const alertType = job?.status === 'completed' ? 'success' : ['needs_review', 'failed'].includes(job?.status) ? 'error' : 'info';
  return <Modal open title="Открыть именную карту" width={1050} onCancel={onClose} footer={
    <Space wrap>
      <Button onClick={onClose}>{job?.status === 'completed' ? 'Готово' : 'Закрыть'}</Button>
      {requestID && <Button onClick={poll} disabled={busy}>Обновить состояние</Button>}
      {notAccepted && pending?.data && <Button type="primary" loading={busy} onClick={() => submit(true)}>Повторить сохранённый запрос</Button>}
      {job?.status === 'awaiting_account' && <Button type="primary" loading={busy} disabled={!selectedAccount} onClick={chooseAccount}>Продолжить с выбранным счётом</Button>}
      {!pending && !job && <Button type="primary" loading={busy} disabled={loading || !enabled || !chosen?.named || !chosen?.currencies.includes(currency)} onClick={() => submit()}>Открыть карту</Button>}
    </Space>
  }>
    <div className="card-open-content">
      <div className="card-open-client"><strong>{job?.client?.name || [client.surname, client.name, client.patronymic].filter(Boolean).join(' ')}</strong><span>Клиент {code}</span><Tag>Именная карта</Tag></div>
      {error && <Alert type="warning" showIcon message={error} />}
      {loading ? <div className="card-open-loading"><Spin tip="Загружаем продукты и состояние операции"><div style={{ height: 60 }} /></Spin></div> : job ? <>
        <Steps size="small" current={stepNumber(job.step)} status={alertType === 'error' ? 'error' : job.status === 'completed' ? 'finish' : 'process'} items={['Клиент', 'Карты и счета', 'Выбор счёта', 'Заявление', 'Проверка'].map(title => ({ title }))} />
        <Alert type={alertType} showIcon message={job.message} description={job.status === 'completed' && 'Выпуск зарегистрирован в АБС. Статус заявления и карты указан ниже.'} />
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Продукт">{catalog.find(card => card.code === job.product)?.name || job.product} · {job.product}</Descriptions.Item>
          <Descriptions.Item label="Валюта">{job.currency}</Descriptions.Item>
          {job.client?.card_holder && <Descriptions.Item label="Имя на карте">{job.client.card_holder}</Descriptions.Item>}
          {job.created_sca && <Descriptions.Item label="Созданный СКС">{job.created_sca}</Descriptions.Item>}
          {job.selected_account && <Descriptions.Item label="Карточный счёт">{job.selected_account}</Descriptions.Item>}
          {job.application_code && <Descriptions.Item label="Заявление">{job.application_code}</Descriptions.Item>}
          {job.application && <Descriptions.Item label="Статус заявления">{job.application.status === 'APPL' ? 'Заявление на выпуск введено (APPL)' : job.application.status} · {job.application.processing_date}</Descriptions.Item>}
          {job.card && <>
            <Descriptions.Item label="Статус карты">{job.card.status_name} ({job.card.status_code})</Descriptions.Item>
            <Descriptions.Item label="Срок действия">{job.card.expiration_date}</Descriptions.Item>
            <Descriptions.Item label="Card ID">{job.card.card_id}</Descriptions.Item>
            <Descriptions.Item label="Colvir Reference">{job.card.card_colvir_reference_id}</Descriptions.Item>
          </>}
        </Descriptions>
        {job.status === 'awaiting_account' && <Radio.Group className="card-open-accounts" value={selectedAccount} onChange={event => setSelectedAccount(event.target.value)}>
          {(job.free_accounts || []).map(account => <Radio key={account.account_number} value={account.account_number}><strong>{account.account_number}</strong> · {account.currency} <Tag color="green">Свободен</Tag></Radio>)}
        </Radio.Group>}
        <div className="card-open-operation">Номер операции: {job.operation_id}<br />{!stopped(job) && 'Можно закрыть окно. Daily продолжит операцию; её состояние будет доступно при повторном открытии.'}</div>
      </> : pending ? <Alert type="info" showIcon message="Проверяем сохранённый запрос на открытие карты" description="Не отправляйте новую заявку. Состояние можно обновить кнопкой ниже." /> : <>
        <div className="card-open-controls"><Input.Search placeholder="Найти карту по названию или коду" value={search} onChange={event => setSearch(event.target.value)} allowClear /><label>Валюта <Select aria-label="Валюта карты" value={currency} onChange={setCurrency} options={(chosen?.currencies || ['TJS', 'USD', 'EUR']).map(value => ({ value, label: value }))} /></label></div>
        <div className="card-open-groups">
          {groups.map(group => <section key={group.key} className="card-open-group"><div className="card-open-group-heading"><img src={group.image} alt={group.name} /><h3>{group.name}</h3></div>
            <Radio.Group value={product} onChange={event => { const value = event.target.value; setProduct(value); const item = catalog.find(card => card.code === value); if (!item.currencies.includes(currency)) setCurrency(item.currencies[0]); }}>
              {catalog.filter(card => card.group === group.key && `${card.name} ${card.code}`.toLowerCase().includes(search.toLowerCase())).map(card => <Radio key={card.code} value={card.code} disabled={!card.named} className={product === card.code ? 'is-selected' : ''}><span>{card.name}<small>{card.code}{!card.named && ' · Неименная — позже'}</small></span></Radio>)}
            </Radio.Group>
          </section>)}
        </div>
        <p className="card-open-note">Daily возьмёт данные клиента из АБС, проверит свободный карточный счёт и зарегистрирует заявление на выпуск. Если свободных счетов несколько, вы сможете выбрать нужный.</p>
      </>}
    </div>
  </Modal>;
}
