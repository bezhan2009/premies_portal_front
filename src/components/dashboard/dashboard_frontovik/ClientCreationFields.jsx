import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Col, Form, Input, Row, Select, Space, Steps, Tooltip, Typography } from 'antd';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import { serviceCodes } from '../../../utils/serviceCodes';
import { creationDomain } from '../../../api/ABS_frotavik/createClient';
import { normalizeClientPhone } from '../../../api/ABS_frotavik/changeClientPhone';
import ClientAddressFields from './ClientAddressFields';
import { transliterateName } from './clientProfileUtils';
import CustomDateInput from '../../elements/CustomDateInput';
const stepNames = [['CHECK_INN', 'Проверка ИНН'], ['CHECK_PHONE', 'Проверка телефона'], ['CREATE_CLIENT', 'Создание картотеки'], ['SAVE_CODEWORD', 'Сохранение кодового слова'], ['SAVE_ADDRESS', 'Создание адреса'], ['LINK_ADDRESS', 'Привязка адреса'], ['SET_KOPF', 'Настройка КОПФ'], ['SET_OKATO', 'Настройка ОКАТО'], ['VERIFY', 'Проверка данных']];
const required = {
  required: true,
  message: 'Обязательное поле'
};
const documentTypes = ['Паспорт Республики Таджикистан', 'Паспорт РФ (с серией)', 'Военный билет', 'Свидетельство о рождении', 'Паспорт РФ (без серии)', 'Загранпаспорт гражданина РФ', 'Паспорт СССР', 'Заграничный паспорт РТ', 'Служебная карта', 'Паспорт', 'Заграничный паспорт иностранца', 'Удостоверение'].map((label, n) => ({
  value: String(58 + n).padStart(3, '0'),
  label
}));
export function IdentityCheckIcon({
  kind,
  value,
  check
}) {
  const normalized = kind === 'phone' ? normalizeClientPhone(value) : String(value || '').trim();
  if (!normalized || !check || check.value !== normalized) return null;
  if (check.state === 'unique') return <Tooltip title="Клиентов с такими данными нет"><span aria-label="Данные свободны" style={{
      color: '#16a34a'
    }}><FaCheckCircle /></span></Tooltip>;
  if (check.state === 'duplicate') return <Tooltip title="Клиент с таким ИНН или Телефоном уже существует, укажите другие данные"><span tabIndex={0} aria-label="Клиент уже существует" style={{
      color: '#dc2626'
    }}><FaTimesCircle /></span></Tooltip>;
  if (check.state === 'loading') return <FaSpinner aria-label="Проверяем уникальность" className="animate-spin" />;
  if (check.state === 'error') return <Tooltip title="Не удалось проверить данные. Повторите проверку"><span aria-label="Проверка недоступна" style={{
      color: '#d97706'
    }}>!</span></Tooltip>;
  return null;
}
export function PassportFields() {
  const field = (name, label, needed = true) => <Col xs={24} md={8} key={name}><Form.Item name={['passport', name]} label={label} rules={needed ? [required] : []}><Input /></Form.Item></Col>;
  const dateField = (name, label) => <Col xs={24} md={8} key={name}><Form.Item name={['passport', name]} label={label} rules={[required]}><CustomDateInput type="date" style={{ width: '100%' }} /></Form.Item></Col>;
  return <Row gutter={18}><Col xs={24} md={8}><Form.Item name={['passport', 'type', 'code']} label="Тип документа" rules={[required]}><Select options={documentTypes} /></Form.Item></Col>{field('series', 'Серия', false)}{field('number', 'Номер документа')}{dateField('issued', 'Дата выдачи')}{field('issuer', 'Кем выдан')}{dateField('expires', 'Срок действия')}</Row>;
}
export function ClientCreationFields({
  form
}) {
  const [domains, setDomains] = useState({}),
    [error, setError] = useState('');
  const { first_name, middle_name, last_name } = Form.useWatch([], form) || {};
  const generated = useRef({});
  useEffect(() => {
    let active = true;
    for (const kind of ['service_group', 'kopf', 'sector', 'tariff']) creationDomain(kind).then(rows => {
      if (active) setDomains(d => ({
        ...d,
        [kind]: rows
      }));
    }).catch(() => {
      if (active) setError('Не удалось загрузить справочники картотеки. Повторите открытие формы.');
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const patch = {};
    for (const [key, source] of Object.entries({ first_name, middle_name, last_name })) {
      const latin = 'latin_' + key,
        current = form.getFieldValue(latin) || '',
        next = transliterateName(source);
      if (!current || current === generated.current[latin]) {
        if (current !== next) patch[latin] = next;
        generated.current[latin] = next;
      }
    }
    if (Object.keys(patch).length) form.setFieldsValue(patch);
  }, [first_name, middle_name, last_name, form]);
  const field = (name, label, needed = true) => <Col xs={24} md={8} key={name}><Form.Item name={name} label={label} rules={needed ? [required] : []}><Input maxLength={100} /></Form.Item></Col>;
  const select = (name, label) => <Col xs={24} md={8}><Form.Item name={name} label={label} rules={[required]}><Select showSearch optionFilterProp="label" loading={!domains[name] && !error} options={(domains[name] || []).map(v => ({
        value: v.code,
        label: `${v.code} — ${v.name}`
      }))} /></Form.Item></Col>;
  return <>
 <section className="new-client-form-section"><div className="new-client-form-section__title"><strong>Данные для картотеки АБС</strong></div><Row gutter={18}>
 <Col xs={24} md={8}><Form.Item name="department" label="Филиал" rules={[required]}><Select showSearch optionFilterProp="label" options={Object.entries(serviceCodes).map(([value, label]) => ({
              value,
              label: `${value} — ${label}`
            }))} /></Form.Item></Col>
 <Col xs={24} md={8}><Form.Item name="sex" label="Пол" rules={[required]}><Select options={[{
              value: 'M',
              label: 'Мужской'
            }, {
              value: 'F',
              label: 'Женский'
            }]} /></Form.Item></Col>
 <Col xs={24} md={8}><Form.Item name="country" label="Страна"><Input readOnly /></Form.Item></Col>
 {field('latin_last_name', 'Фамилия латиницей')}{field('latin_first_name', 'Имя латиницей')}{field('latin_middle_name', 'Отчество латиницей', false)}
 {select('service_group', 'Группа обслуживания')}
 <Col xs={24} md={8}><Form.Item name="codeword" label="Кодовое слово" rules={[required]}><Input.Password maxLength={100} autoComplete="new-password" placeholder="Введите кодовое слово" /></Form.Item></Col>
 </Row><Typography.Text type="secondary">Латиница формируется автоматически. При необходимости исправьте её по паспорту.</Typography.Text></section>
 <section className="new-client-form-section"><div className="new-client-form-section__title"><strong>Паспорт</strong></div><PassportFields /></section>
 <section className="new-client-form-section"><div className="new-client-form-section__title"><strong>Адрес регистрации</strong></div><ClientAddressFields form={form} /></section>
 <section className="new-client-form-section"><Row gutter={18}>{select('kopf', 'Организационно-правовая форма / КОПФ')}{select('sector', 'Сектор экономики')}{select('tariff', 'Тарифная категория')}</Row>{error && <Alert showIcon type="error" message={error} />}</section>
 </>;
}
export function ClientCreationProgress({
  creation,
  onDone
}) {
  const {
    job,
    pending,
    error,
    busy
  } = creation;
  if (!pending && !error) return null;
  let step = job?.step;
  if (step === 'CREATE_SUBMITTING') step = 'CREATE_CLIENT';
  if (step === 'CODEWORD_SUBMITTING') step = 'SAVE_CODEWORD';
  if (step === 'ADDRESS_SUBMITTING') step = 'SAVE_ADDRESS';
  const current = job?.status === 'completed' ? stepNames.length : Math.max(0, stepNames.findIndex(([k]) => k === step));
  return <Space direction="vertical" size="middle" style={{
    width: '100%',
    margin: '16px 0'
  }}>
  {pending && <Steps size="small" direction="vertical" current={current} status={job?.status === 'partial' || job?.status === 'failed' ? 'error' : 'process'} items={stepNames.map(([, title]) => ({
      title
    }))} />}
  {error && <Alert showIcon type="error" message={error} />}
  {job?.message && <Alert showIcon type={job.status === 'completed' ? 'success' : job.status === 'partial' || job.status === 'failed' ? 'warning' : 'info'} message={job.message} />}
  {job?.error_log && <Alert showIcon type="error" message="Лог ошибки АБС" description={<Typography.Text copyable style={{
      whiteSpace: 'pre-wrap'
    }}>{`Шаг: ${step || 'не определён'}\n${job.error_log}`}</Typography.Text>} />}
  {job?.client_code && <Typography.Text>Код клиента: {job.client_code}</Typography.Text>}
  {pending && <Typography.Text type="secondary">Номер запроса: {pending.request_id}</Typography.Text>}
  {job?.status === 'partial' && <Button loading={busy} onClick={creation.retry}>Продолжить с сохранённого шага</Button>}
  {pending && !job?.status && error && <Button loading={busy} onClick={() => creation.submit({})}>Проверить / повторить приём запроса</Button>}
  {job?.status === 'completed' && <Button type="primary" onClick={() => onDone(job)}>Открыть клиента</Button>}
 </Space>;
}
