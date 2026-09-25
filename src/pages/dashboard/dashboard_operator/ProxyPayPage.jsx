import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiClient } from '../../../api/utils/apiClient.js';
import { useExcelExport } from '../../../hooks/useExcelExport.js';
import { createProxyKey, isCurrentProxyQuote, proxyKind, proxyOperationStatus, proxyQuotePayload, proxyStatistics, replaceProxyOperation, validateProxyAccount, validateProxyAmount } from './proxyPayUtils.js';

const URL = `${import.meta.env.VITE_BACKEND_URL}/proxy-pay`;
const PENDING = 'proxy_pay_pending_request';
const fieldLabels = {
  document_number: 'Номер документа', amount: 'Сумма операции', payer_idn: 'ИНН плательщика',
  payer_name: 'ФИО плательщика', payer_iban: 'Счёт плательщика', beneficiary_idn: 'ИНН получателя',
  beneficiary_name: 'ФИО получателя', beneficiary_iban: 'Счёт получателя', payment_details: 'Назначение платежа',
};
const money = (value) => Number(value).toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const errorText = (e) => e.response?.data?.error || 'Сервис недоступен. Попробуйте обновить журнал';
const validation = (check) => ({validator: (_, value) => check(value) ? Promise.reject(new Error(check(value))) : Promise.resolve()});
const statusTag = (operation) => {
  const view = proxyOperationStatus(operation);
  return <Tag color={view.color} style={{whiteSpace: 'normal'}}>{view.text}</Tag>;
};

export default function ProxyPayPage() {
  const [data, setData] = useState({items: [], total: 0, stats: [], days: []});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  const metricsRequest = useRef(null);
  const [range, setRange] = useState([]);
  const [kindFilter, setKindFilter] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [kind, setKind] = useState(null);
  const [key, setKey] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const quoteRequestGeneration = useRef(0);
  const [pending, setPending] = useState(() => {try {return JSON.parse(sessionStorage.getItem(PENDING) || 'null');} catch {return null;}});
  const [detail, setDetail] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(() => new Set());
  const [form] = Form.useForm();
  const amount = Form.useWatch('amount', form);
  const payerIban = Form.useWatch('payer_iban', form);
  const { exportToExcel } = useExcelExport();
  const filters = useMemo(() => ({start_date: range[0]?.format('YYYY-MM-DD'), end_date: range[1]?.format('YYYY-MM-DD'), kind: kindFilter || undefined}), [range, kindFilter]);

  useEffect(() => {
    let active = true;
    // A single request per mounted page, also under React StrictMode. Never tied to table refresh.
    metricsRequest.current ||= apiClient.get(`${URL}/metrics`, {timeout: 20000});
    metricsRequest.current.then(({data: value}) => {if (active) setMetrics(value);}).catch((e) => {if (active) setMetricsError(errorText(e));});
    return () => {active = false;};
  }, []);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    apiClient.get(`${URL}/operations`, {params: {...filters, page, page_size: 50}})
      .then(({data: value}) => {if (active) setData(value);})
      .catch((e) => {if (active) setError(errorText(e));})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [filters, page, revision]);
  useEffect(() => {
    quoteRequestGeneration.current += 1;
    setQuote(null); setQuoteError(''); setQuoteLoading(false);
  }, [kind, amount, payerIban]);
  const requestQuote = useCallback(async () => {
    if (kind !== 'conversion') return;
    const values = form.getFieldsValue(['amount', 'payer_iban']);
    const payload = proxyQuotePayload(values.amount, values.payer_iban);
    if (!payload) {
      quoteRequestGeneration.current += 1;
      setQuote(null); setQuoteError(''); setQuoteLoading(false);
      return;
    }
    const generation = ++quoteRequestGeneration.current;
    setQuote(null); setQuoteError(''); setQuoteLoading(true);
    try {
      const {data: value} = await apiClient.post(`${URL}/quote`, payload, {timeout: 25000});
      const current = form.getFieldsValue(['amount', 'payer_iban']);
      if (generation === quoteRequestGeneration.current && isCurrentProxyQuote(payload, current.amount, current.payer_iban)) {
        setQuote({...value, ...payload});
      }
    } catch (e) {
      if (generation === quoteRequestGeneration.current) setQuoteError(errorText(e));
    } finally {
      if (generation === quoteRequestGeneration.current) setQuoteLoading(false);
    }
  }, [form, kind]);

  const stats = proxyStatistics(data.stats);
  const chart = useMemo(() => {
    const days = new Map();
    for (const row of data.days || []) {
      const d = days.get(row.date) || {date: row.date, rub: 0, tjs: 0};
      d[row.kind === 'conversion' ? 'rub' : 'tjs'] += row.amount_minor / 100; days.set(row.date, d);
    }
    return [...days.values()];
  }, [data.days]);
  const open = (type) => {
    form.resetFields(); setKind(type); setKey(createProxyKey()); setQuote(null); setNotice(null);
    if (type === 'conversion') form.setFieldsValue({beneficiary_idn: '020025471', beneficiary_name: 'ЗАО Актив Банк', beneficiary_iban: '17507972390808713147'});
  };
  const send = async (input, requestKey) => {
    if (sendingRef.current) return;
    sendingRef.current = true; setSending(true);
    const saved = {input, key: requestKey};
    try {
      // Retain the SAME key and payload across refresh/network failures; never silently resend.
      sessionStorage.setItem(PENDING, JSON.stringify(saved)); setPending(saved);
      const {data: result} = await apiClient.post(`${URL}/operations`, input, {headers: {'Idempotency-Key': requestKey}, timeout: 165000});
      sessionStorage.removeItem(PENDING); setPending(null); setKind(null);
      const op = result.operation;
      setNotice({type: op.status === 'executed' ? 'success' : 'warning', text: `Документ №${op.document_number}: ${proxyOperationStatus(op).text}. ${op.message || ''}`});
      setRevision((v) => v + 1);
    } catch (e) {
      if ([400, 401, 403, 409].includes(e.response?.status)) {
        sessionStorage.removeItem(PENDING); setPending(null);
        setNotice({type: 'error', text: errorText(e)});
      } else {
        setKind(null); setNotice({type: 'warning', text: 'Ответ не получен. Запрос сохранён с защитой от дубля. Не создавайте новый платёж — сначала проверьте журнал и документ в АБС.'});
      }
    } finally {sendingRef.current = false; setSending(false);}
  };
  const confirm = (input, requestKey) => setConfirmation({input, key: requestKey});
  const submit = (values) => {
    if (kind === 'conversion' && (!quote || quote.amount !== String(values.amount) || quote.payer_iban !== values.payer_iban)) {
      setQuoteError('Дождитесь расчёта для текущей суммы и счёта'); return;
    }
    confirm({...values, kind, amount: String(values.amount)}, key);
  };
  const showDetails = async (id) => {
    try {const {data: value} = await apiClient.get(`${URL}/operations/${id}`); setDetail(value);} catch (e) {setError(errorText(e));}
  };
  const refreshStatus = async (id) => {
    if (refreshingStatus.has(id)) return;
    setRefreshingStatus((current) => new Set(current).add(id));
    try {
      const {data: refreshed} = await apiClient.post(`${URL}/operations/${id}/status`, null, {timeout: 165000});
      setData((current) => replaceProxyOperation(current, refreshed));
      if (detail?.operation?.id === id) await showDetails(id);
      setNotice({type: refreshed.operation.status === 'executed' ? 'success' : 'info', text: `Документ №${refreshed.operation.document_number}: ${proxyOperationStatus(refreshed.operation).text}`});
    } catch (e) {
      setNotice({type: 'error', text: errorText(e)});
    } finally {
      setRefreshingStatus((current) => {const next = new Set(current); next.delete(id); return next;});
    }
  };
  const exportRows = async () => {
    setExporting(true);
    try {
      const all = []; let p = 1, total = 0;
      do {const {data: value} = await apiClient.get(`${URL}/operations`, {params: {...filters, page: p++, page_size: 200}}); total = value.total; all.push(...value.items); if (!value.items.length) break;} while (all.length < total);
      exportToExcel(all, [
        {key: 'operation.id', label: 'ID'}, {key: 'operation.created_at', label: 'Дата'}, {key: (r) => proxyKind(r.operation.kind), label: 'Тип'},
        ...Object.entries(fieldLabels).map(([k, label]) => ({key: `input.${k}`, label})),
        {key: 'operation.currency', label: 'Валюта'}, {key: 'operation.amount_to', label: 'Расчёт в сомони'},
        {key: (r) => proxyOperationStatus(r.operation).text, label: 'Статус'},
        {key: 'operation.abs_status', label: 'Код статуса АБС'}, {key: 'operation.abs_status_text', label: 'Текст АБС'},
        {key: 'operation.status_technical_error', label: 'Техническая ошибка проверки'}, {key: 'operation.reference', label: 'ID АБС'},
        {key: 'operation.status_attempts', label: 'Автопроверок'}, {key: 'operation.last_status_check_at', label: 'Последняя проверка'},
        {key: 'operation.next_status_check_at', label: 'Следующая проверка'},
        {key: 'operation.created_by_login', label: 'Оператор'}, {key: 'operation.message', label: 'Ответ'},
      ], 'Proxy_Pay');
    } catch (e) {setError(errorText(e));} finally {setExporting(false);}
  };
  const columns = [
    {title: 'Дата', key: 'date', render: (_, r) => new Date(r.operation.created_at).toLocaleString('ru-RU', {timeZone: 'Asia/Dushanbe'})},
    {title: 'Документ', dataIndex: ['operation', 'document_number']},
    {title: 'Тип', render: (_, r) => proxyKind(r.operation.kind)},
    {title: 'Плательщик', dataIndex: ['input', 'payer_name']},
    {title: 'Получатель', dataIndex: ['input', 'beneficiary_name']},
    {title: 'Сумма', render: (_, r) => `${money(r.input.amount)} ${r.operation.currency}`},
    {title: 'Статус', render: (_, r) => <Space direction="vertical" size={2}>{statusTag(r.operation)}{r.operation.status_technical_error && <Typography.Text type="warning">Проверка АБС: {r.operation.status_technical_error}</Typography.Text>}</Space>},
    {title: 'Оператор', dataIndex: ['operation', 'created_by_login']},
    {title: '', render: (_, r) => <Space wrap><Button onClick={() => showDetails(r.operation.id)}>Подробнее</Button>{r.operation.reference && <Button loading={refreshingStatus.has(r.operation.id)} onClick={() => refreshStatus(r.operation.id)}>Обновить статус в АБС</Button>}</Space>},
  ];
  return <div style={{padding: 24, minWidth: 0}}>
    <Typography.Title level={2}>Proxy Pay</Typography.Title>
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}><Card><Statistic title="Курс НПСР · RUB → TJS" value={metrics?.rate ?? '—'} precision={4}/></Card></Col>
      <Col xs={24} md={12}><Card><Statistic title="Баланс Proxy Pay" value={metrics?.balance ?? '—'} precision={2}/></Card></Col>
    </Row>
    <Typography.Paragraph type="secondary" style={{marginTop: 8}}>Данные источника: {metrics?.fromdate || '—'}. Курс и баланс обновляются только при открытии или перезагрузке страницы.</Typography.Paragraph>
    {metricsError && <Alert type="warning" message={metricsError} showIcon style={{marginBottom: 16}}/>}
    {error && <Alert type="error" message={error} showIcon closable onClose={() => setError('')} style={{marginBottom: 16}}/>}
    {notice && <Alert type={notice.type} message={notice.text} showIcon style={{marginBottom: 16}}/>}
    {pending && <Alert type="warning" showIcon message={`Есть запрос с неподтверждённым ответом: документ №${pending.input.document_number}`} description="Сначала проверьте журнал. Повтор с тем же ключом не создаёт дубль, если запрос уже зарегистрирован." action={<Button disabled={sending} onClick={() => confirm(pending.input, pending.key)}>Повторить защищённый запрос</Button>} style={{marginBottom: 16}}/>}
    <Space wrap style={{marginBottom: 20}}>
      <Button type="primary" onClick={() => open('conversion')} disabled={sending || !!pending}>Конвертация</Button>
      <Button type="primary" onClick={() => open('payment')} disabled={sending || !!pending}>Платежка</Button>
      <DatePicker.RangePicker format="DD.MM.YYYY" onChange={(v) => {setRange(v || []); setPage(1);}}/>
      <Select aria-label="Тип операции" value={kindFilter} style={{width: 170}} onChange={(v) => {setKindFilter(v); setPage(1);}} options={[{value: '', label: 'Все операции'}, {value: 'conversion', label: 'Конвертация'}, {value: 'payment', label: 'Платежка'}]}/>
      <Button onClick={() => setRevision((v) => v + 1)} loading={loading}>Обновить журнал</Button>
      <Button onClick={exportRows} loading={exporting} disabled={!data.total}>Экспорт Excel</Button>
    </Space>
    <Row gutter={[16, 16]} style={{marginBottom: 20}}>
      <Col xs={24} sm={12} xl={6}><Card><Statistic title="Операций за период" value={stats.count}/></Card></Col>
      <Col xs={24} sm={12} xl={6}><Card><Statistic title="Исполненные конвертации · RUB" value={stats.rub} precision={2}/></Card></Col>
      <Col xs={24} sm={12} xl={6}><Card><Statistic title="Исполненные платежи · TJS" value={stats.tjs} precision={2}/></Card></Col>
      <Col xs={24} sm={12} xl={6}><Card><Statistic title="Ожидают подтверждения / проверки" value={stats.unconfirmed}/></Card></Col>
    </Row>
    {!!chart.length && <Card title="Исполненные операции по дням" style={{marginBottom: 20}}><ResponsiveContainer width="100%" height={260}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis yAxisId="rub"/><YAxis yAxisId="tjs" orientation="right"/><Tooltip/><Legend/><Bar yAxisId="rub" dataKey="rub" name="Конвертация, RUB" fill="#b5122b"/><Bar yAxisId="tjs" dataKey="tjs" name="Платежка, TJS" fill="#1677ff"/></BarChart></ResponsiveContainer></Card>}
    <Table rowKey={(r) => r.operation.id} columns={columns} dataSource={data.items} loading={loading} scroll={{x: 1200}} pagination={{current: page, pageSize: 50, total: data.total, showSizeChanger: false, onChange: setPage}}/>
    <Modal open={!!kind} title={kind === 'conversion' ? 'Конвертация RUB → TJS' : 'Платежка · Внутри банка'} width={860} onCancel={() => {if (!sending) setKind(null);}} maskClosable={false} closable={!sending} footer={null}>
      <Form form={form} layout="vertical" onFinish={submit} disabled={sending}>
        <Row gutter={16}>
          <Col xs={24} md={12}><Form.Item name="document_number" label="Номер документа" rules={[{required: true, message: 'Введите номер документа'}, {pattern: /^[A-Za-z0-9/-]{1,32}$/, message: 'До 32 букв или цифр, допустимы / и -'}]}><Input maxLength={32}/></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="amount" label={`Сумма операции в ${kind === 'conversion' ? 'рублях' : 'сомони'}`} rules={[validation(validateProxyAmount)]}><Input inputMode="decimal" placeholder="0.00" onBlur={requestQuote}/></Form.Item></Col>
          {kind === 'conversion' && <Col span={24}><Form.Item label="Сумма в сомони"><Input readOnly value={quoteLoading ? 'Расчёт…' : quote?.amount_to || '0'}/></Form.Item>{quoteError && <Alert type="warning" message={quoteError} style={{marginBottom: 16}}/>}<Typography.Paragraph type="secondary">Расчёт предварительный. Итоговая конвертация выполняется по условиям АБС на момент отправки.</Typography.Paragraph></Col>}
          {['payer_idn', 'payer_name', 'payer_iban', 'beneficiary_idn', 'beneficiary_name', 'beneficiary_iban'].map((name) => <Col xs={24} md={12} key={name}><Form.Item name={name} label={fieldLabels[name]} rules={[
            {required: true, whitespace: true, message: 'Заполните поле'},
            ...(name.endsWith('iban') ? [validation((v) => validateProxyAccount(v, name === 'payer_iban' ? kind : 'payment'))] : name.endsWith('idn') ? [{pattern: /^[0-9]{5,20}$/, message: 'Введите ИНН цифрами'}] : []),
          ]}><Input maxLength={name.endsWith('iban') || name.endsWith('idn') ? 20 : 1000} onBlur={name === 'payer_iban' ? requestQuote : undefined}/></Form.Item></Col>)}
          <Col span={24}><Form.Item name="payment_details" label="Назначение платежа" rules={[{required: true, whitespace: true, message: 'Введите назначение платежа'}]}><Input.TextArea rows={3} maxLength={1000} showCount/></Form.Item></Col>
        </Row>
        <Space style={{display: 'flex', justifyContent: 'flex-end'}}><Button onClick={() => setKind(null)} disabled={sending}>Отмена</Button><Button type="primary" htmlType="submit" loading={sending} disabled={!!pending || (kind === 'conversion' && (!quote || quoteLoading))}>Проверить и отправить</Button></Space>
      </Form>
    </Modal>
    <Modal open={!!confirmation} title="Подтвердите отправку в АБС" okText="Подтвердить и отправить" cancelText="Отмена" confirmLoading={sending} cancelButtonProps={{disabled: sending}} closable={!sending} maskClosable={false} onCancel={() => {if (!sending) setConfirmation(null);}} onOk={async () => {await send(confirmation.input, confirmation.key); setConfirmation(null);}}>
      {confirmation && <Space direction="vertical"><strong>{proxyKind(confirmation.input.kind)} · {money(confirmation.input.amount)} {confirmation.input.kind === 'conversion' ? 'RUB' : 'TJS'}</strong><span>Документ №{confirmation.input.document_number}</span><span>Списание: {confirmation.input.payer_iban}</span><span>Получатель: {confirmation.input.beneficiary_name}</span><span>Зачисление: {confirmation.input.beneficiary_iban}</span><span>Будет отправлен реальный запрос в АБС.</span></Space>}
    </Modal>
    <Modal open={!!detail} title="Данные операции Proxy Pay" width={950} footer={null} onCancel={() => setDetail(null)}>
      {detail && <><Descriptions bordered column={1} size="small" items={[
        {key: 'type', label: 'Тип', children: proxyKind(detail.operation.kind)},
        ...Object.entries(fieldLabels).map(([name, label]) => ({key: name, label, children: detail.input[name]})),
        {key: 'status', label: 'Статус', children: statusTag(detail.operation)},
        {key: 'rate', label: 'Расчёт в сомони', children: detail.operation.amount_to || '—'},
        {key: 'ref', label: 'ID АБС', children: detail.operation.reference || '—'},
        {key: 'abs', label: 'Код статуса АБС', children: detail.operation.abs_status || '—'},
        {key: 'abs_text', label: 'Текст АБС', children: detail.operation.abs_status_text || '—'},
        {key: 'technical', label: 'Техническая ошибка проверки', children: detail.operation.status_technical_error || '—'},
        {key: 'attempts', label: 'Автоматических проверок', children: `${detail.operation.status_attempts || 0} из 5`},
        {key: 'last_check', label: 'Последняя проверка', children: detail.operation.last_status_check_at ? new Date(detail.operation.last_status_check_at).toLocaleString('ru-RU', {timeZone: 'Asia/Dushanbe'}) : '—'},
        {key: 'next_check', label: 'Следующая проверка', children: detail.operation.next_status_check_at ? new Date(detail.operation.next_status_check_at).toLocaleString('ru-RU', {timeZone: 'Asia/Dushanbe'}) : detail.operation.status_check_exhausted ? 'Лимит автоматических проверок исчерпан' : '—'},
        {key: 'msg', label: 'Ответ', children: detail.operation.message || '—'},
      ]}/><details style={{marginTop: 16}}><summary>Запрос и ответ операции</summary><pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{detail.request_xml}</pre><hr/><pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{detail.response_xml || 'Ответ не получен'}</pre></details><details style={{marginTop: 16}}><summary>Последний запрос проверки статуса и ответ АБС</summary><pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{detail.status_request_xml || 'Проверка ещё не выполнялась'}</pre><hr/><pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{detail.status_response_xml || 'Ответ проверки ещё не получен'}</pre></details></>}
    </Modal>
  </div>;
}
