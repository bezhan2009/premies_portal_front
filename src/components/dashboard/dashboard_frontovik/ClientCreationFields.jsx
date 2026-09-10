import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Col, Form, Input, Row, Select, Space, Steps, Typography } from 'antd';
import { serviceCodes } from '../../../utils/serviceCodes';
import { findCreationAddresses, creationDomain } from '../../../api/ABS_frotavik/createClient';
const duplicateClientMessage = 'Данный телефон/ИНН уже используются другим клиентом, укажите уникальное значение';
const stepNames = [['CHECK_INN', 'Проверка ИНН'], ['CHECK_PHONE', 'Проверка телефона'], ['CREATE_CLIENT', 'Создание картотеки'], ['SAVE_ADDRESS', 'Создание адреса'], ['LINK_ADDRESS', 'Привязка адреса'], ['SET_KOPF', 'Настройка КОПФ'], ['SET_OKATO', 'Настройка ОКАТО'], ['VERIFY', 'Проверка данных']];
const required = {
  required: true,
  message: 'Обязательное поле'
};
const documentTypes = ['Паспорт Республики Таджикистан', 'Паспорт РФ (с серией)', 'Военный билет', 'Свидетельство о рождении', 'Паспорт РФ (без серии)', 'Загранпаспорт гражданина РФ', 'Паспорт СССР', 'Заграничный паспорт РТ', 'Служебная карта', 'Паспорт', 'Заграничный паспорт иностранца', 'Удостоверение'].map((label, n) => ({
  value: String(58 + n).padStart(3, '0'),
  label
}));
export function ClientCreationFields({
  form,
  creation
}) {
  const [addresses, setAddresses] = useState([]),
    [searching, setSearching] = useState(false),
    [addressError, setAddressError] = useState(''),
    [domains, setDomains] = useState({}),
    [domainMissing, setDomainMissing] = useState([]);
  const searchGeneration = useRef(0);
  useEffect(() => {
    let active = true;
    for (const k of ['kopf', 'okato', 'territory']) creationDomain(k).then(rows => {
      if (active) setDomains(d => ({
        ...d,
        [k]: rows
      }));
    }).catch(() => {
      if (active) setDomainMissing(d => [...d, k]);
    });
    return () => {
      active = false;
    };
  }, []);
  const field = (name, label, requiredField = true, props = {}) => <Col xs={24} md={8} key={String(name)}><Form.Item name={name} label={label} rules={requiredField ? [required] : []}><Input {...props} /></Form.Item></Col>;
  const search = async name => {
    if (name.trim().length < 3) return;
    const gen = ++searchGeneration.current;
    setSearching(true);
    try {
      const rows = await findCreationAddresses(name);
      if (gen === searchGeneration.current) {
        setAddresses(rows);
        setAddressError('');
      }
    } catch {
      if (gen === searchGeneration.current) setAddressError('Адресный справочник временно недоступен');
    } finally {
      if (gen === searchGeneration.current) setSearching(false);
    }
  };
  const applyAddress = id => {
    const a = addresses.find(x => x.id === id);
    if (a) {
      const old = form.getFieldValue('address') || {};
      form.setFieldsValue({
        address: {
          ...old,
          ...a,
          country_code: form.getFieldValue('country'),
          house: { ...a.house, code: a.house?.code || a.house?.house_number || "" },
          zip: a.zip || old.zip,
          okato: a.okato || old.okato,
          text: undefined
        }
      });
    }
  };
  const valueSelect = (name, kind, label) => <Col xs={24} md={8}><Form.Item name={name} label={label} rules={[required]}>{domains[kind]?.length ? <Select showSearch optionFilterProp="label" options={domains[kind].map(v => ({
        value: v.code,
        label: `${v.code} — ${v.name}`
      }))} /> : <Input placeholder="Код из АБС" />}</Form.Item></Col>;
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
   {field('country', 'Страна (ISO)', true, {
          maxLength: 2
        })}
   {field('latin_last_name', 'Фамилия латиницей')}{field('latin_first_name', 'Имя латиницей')}{field('latin_middle_name', 'Отчество латиницей', false)}
  </Row></section>
  <section className="new-client-form-section"><div className="new-client-form-section__title"><strong>Паспорт</strong></div><Row gutter={18}>
   <Col xs={24} md={8}><Form.Item name={['passport', 'type', 'code']} label="Тип документа" rules={[required]}><Select options={documentTypes} /></Form.Item></Col>
   {field(['passport', 'series'], 'Серия', false)}{field(['passport', 'number'], 'Номер документа')}{field(['passport', 'issued'], 'Дата выдачи', true, {
          type: 'date'
        })}{field(['passport', 'issuer'], 'Кем выдан')}{field(['passport', 'expires'], 'Срок действия', true, {
          type: 'date'
        })}
  </Row></section>
  <section className="new-client-form-section"><div className="new-client-form-section__title"><strong>Адрес регистрации</strong></div>
   <Form.Item label="Найти адрес в справочнике АБС"><Select showSearch filterOption={false} onSearch={search} onChange={applyAddress} loading={searching} placeholder="Введите улицу или населённый пункт" options={addresses.map(a => ({
          value: a.id,
          label: a.text || [a.country_name, a.region?.name, a.city?.name, a.street?.name].filter(Boolean).join(', ')
        }))} /></Form.Item>
   {addressError && <Alert type="warning" message={addressError} />}
   <Row gutter={18}>{field(['address', 'country_name'], 'Название страны')}
   {['region', 'district', 'city', 'street'].map((k, n) => field(['address', k, 'name'], ['Регион / область', 'Район', 'Город / населённый пункт', 'Улица'][n]))}
   {field(['address', 'house', 'code'], 'Дом')}{field(['address', 'flat', 'name'], 'Квартира', false)}{field(['address', 'zip'], 'Почтовый индекс')}{valueSelect(['address', 'okato'], 'okato', 'ОКАТО')}
   </Row><Row gutter={18}>{['region', 'district', 'city', 'street', 'house', 'flat'].map((k, n) => <Col xs={24} md={8} key={k}><Form.Item label={`${['Тип региона', 'Тип района', 'Тип населённого пункта', 'Тип улицы', 'Тип дома', 'Тип помещения'][n]}`} name={['address', k, 'value']}><Select allowClear showSearch optionFilterProp="label" options={(domains.territory || []).map((v, n) => ({
              value: v.code,
              label: v.description || v.name,
              key: `${n}-${v.code}`
            }))} /></Form.Item></Col>)}</Row>
   <Typography.Text type="secondary">Адрес-строка формируется из выбранных полей. Тип адреса: место регистрации.</Typography.Text>
  </section>
  <section className="new-client-form-section"><Row gutter={18}>{valueSelect('kopf', 'kopf', 'Организационно-правовая форма / КОПФ')}<Col xs={24} md={8}><Form.Item label="Сектор экономики"><Input value="7 — Физические лица" readOnly /></Form.Item></Col><Col xs={24} md={8}><Form.Item label="Тарифная категория"><Input value="200 — ФЛ" readOnly /></Form.Item></Col></Row>
   {domainMissing.some(k => k === 'kopf' || k === 'okato') && <Alert showIcon type="warning" message="Справочник классификаторов АБС недоступен. Укажите действующие коды КОПФ и ОКАТО вручную." />}
  </section>
  <Space direction="vertical" style={{
      width: '100%',
      marginBottom: 16
    }}>
   {['inn', 'phone'].map(k => {
        const s = creation.checks[k];
        return <Alert key={k} type={s?.state === 'unique' ? 'success' : s?.state === 'duplicate' || s?.state === 'error' ? 'error' : 'info'} showIcon message={s?.state === 'duplicate' ? duplicateClientMessage : s?.state === 'error' ? 'Не удалось проверить уникальность в АБС' : `${k === 'inn' ? 'ИНН' : 'Телефон'}: ${s?.state === 'unique' ? 'свободен' : s?.state === 'loading' ? 'проверяем…' : 'ожидает проверки'}`} />;
      })}
  </Space>
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
  {job?.client_code && <Typography.Text>Код клиента: {job.client_code}</Typography.Text>}
  {pending && <Typography.Text type="secondary">Номер запроса: {pending.request_id}</Typography.Text>}
  {job?.status === 'partial' && <Button loading={busy} onClick={creation.retry}>Продолжить с сохранённого шага</Button>}
  {pending && !job?.status && error && <Button loading={busy} onClick={() => creation.submit({})}>Проверить / повторить приём запроса</Button>}
  {job?.status === 'completed' && <Button type="primary" onClick={() => onDone(job)}>Открыть клиента</Button>}
 </Space>;
}
