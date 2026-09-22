import React, { useEffect, useRef, useState } from 'react';
import { Alert, AutoComplete, Col, Form, Input, Row, Select, Typography } from 'antd';
import { creationCatalogs, findCreationAddresses } from '../../../api/ABS_frotavik/createClient';
import { addressOKATO } from './clientProfileUtils';
import { lookupPostalCode, postalSource } from './tajikPostalLookup';
const required = {
  required: true,
  message: 'Обязательное поле'
};
const emptyAddress = {};
export default function ClientAddressFields({
  form
}) {
  const address = Form.useWatch('address', form) || emptyAddress;
  const [catalog, setCatalog] = useState(null),
    [error, setError] = useState(''),
    [suggestions, setSuggestions] = useState([]);
  const searchGeneration = useRef(0),
    searchTimer = useRef(null);
  const postalAddress = useRef(null);
  const postalMatch = lookupPostalCode(address);
  useEffect(() => {
    const key = JSON.stringify([address.region_key, address.district?.name, address.city?.name]);
    const changed = postalAddress.current !== null && postalAddress.current !== key && JSON.parse(postalAddress.current)[2];
    postalAddress.current = key;
    // Keep a loaded draft's manual index. Once the locality changes, an old
    // index must not silently remain attached to a different address.
    if (changed || !address.zip) form.setFieldValue(['address', 'zip'], postalMatch?.zip || '');
  }, [address.region_key, address.district?.name, address.city?.name, form]);
  useEffect(() => {
    let active = true;
    creationCatalogs().then(c => {
      if (active) setCatalog(c);
    }).catch(() => {
      if (active) setError('Не удалось загрузить справочник областей. Повторите открытие формы.');
    });
    return () => {
      active = false;
      clearTimeout(searchTimer.current);
      searchGeneration.current++;
    };
  }, []);
  useEffect(() => {
    if (!catalog) return;
    const region = catalog.regions.find(r => r.key === address.region_key || !address.region_key && [r.name, r.address_name].some(n => n.toUpperCase() === address.region?.name?.toUpperCase()));
    if (!region) return;
    const okato = addressOKATO(catalog, region.key, address.district?.name, address.city?.name);
    if (address.okato !== okato || address.region?.name !== region.address_name || address.region_key !== region.key || address.country_name !== 'ТОҶИКИСТОН') {
      form.setFieldsValue({
        address: {
          country_name: 'ТОҶИКИСТОН',
          country_code: 'TJ',
          region_key: region.key,
          region: {
            name: region.address_name,
            value: '7'
          },
          okato
        }
      });
    }
  }, [catalog, address, form]);
  const places = catalog?.places.filter(p => p.region === address.region_key) || [];
  const options = values => [...new Set(values.filter(Boolean))].map(value => ({
    value
  }));
  const districtOptions = options(places.map(p => p.district));
  const cityOptions = options(places.filter(p => p.district.toUpperCase() === address.district?.name?.toUpperCase()).map(p => p.city));
  const search = value => {
    const generation = ++searchGeneration.current;
    clearTimeout(searchTimer.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      findCreationAddresses(value).then(rows => {
        if (generation === searchGeneration.current) setSuggestions(rows);
      }).catch(() => {
        if (generation === searchGeneration.current) setSuggestions([]);
      });
    }, 400);
  };
  const field = (name, label, choices = [], needed = true, onSearch) => <Col xs={24} md={8} key={label}><Form.Item name={['address', ...name]} label={label} rules={needed ? [required] : []}><AutoComplete options={choices} onSearch={onSearch} onChange={name[0] === 'district' ? () => form.setFieldsValue({
        address: {
          city: {
            name: ''
          }
        }
      }) : undefined} filterOption={!onSearch ? (input, option) => option.value.toUpperCase().includes(input.toUpperCase()) : false} placeholder="Выберите или введите вручную" /></Form.Item></Col>;
  return <>
  {error && <Alert type="error" showIcon message={error} />}
  <Row gutter={18}>
   <Col xs={24} md={8}><Form.Item name={['address', 'region_key']} label="Область" rules={[required]}><Select showSearch loading={!catalog && !error} optionFilterProp="label" placeholder="Выберите область" options={catalog?.regions.map(r => ({
            value: r.key,
            label: r.name
          }))} onChange={() => {
            form.setFieldsValue({
              address: {
                district: {
                  name: ''
                },
                city: {
                  name: ''
                },
                street: {
                  name: ''
                },
                house: {
                  code: ''
                },
                flat: {
                  name: ''
                },
                zip: '',
                okato: ''
              }
            });
            setSuggestions([]);
          }} /></Form.Item></Col>
   {field(['district', 'name'], 'Район', districtOptions)}
   {field(['city', 'name'], 'Город / населённый пункт', cityOptions)}
   {field(['street', 'name'], 'Улица', options(suggestions.map(a => a.street?.name)), true, search)}
   {field(['house', 'code'], 'Дом', options(suggestions.filter(a => a.street?.name === address.street?.name).map(a => a.house?.house_number || a.house?.code)))}
   {field(['flat', 'name'], 'Квартира', options(suggestions.map(a => a.flat?.name)), false)}
   <Col xs={24} md={8}><Form.Item name={['address', 'zip']} label="Индекс" rules={[required, { pattern: /^[0-9]{6}$/, message: 'Почтовый индекс Таджикистана — 6 цифр' }]} extra={postalMatch ? 'Заполнен по справочнику Почты Таджикистана; при необходимости уточните отделение вручную.' : 'Точное совпадение в почтовом справочнике не найдено. Укажите индекс отделения вручную.'}><Input inputMode="numeric" maxLength={6} /></Form.Item></Col>
   <Col xs={24} md={8}><Form.Item name={['address', 'okato']} label="ОКАТО" rules={[{
          required: true,
          message: 'Уточните район для автоматического определения ОКАТО'
        }]}><Input readOnly placeholder="Заполнится по адресу" /></Form.Item></Col>
   <Form.Item name={['address', 'country_name']} hidden><Input /></Form.Item>
   <Form.Item name={['address', 'region', 'name']} hidden><Input /></Form.Item>
  </Row>
  <Typography.Text type="secondary">Страна: ТОҶИКИСТОН. ОКАТО определяется по населённому пункту, району или области. Если населённого пункта нет в справочнике, введите его вручную — используется код выбранного района.</Typography.Text>
  <div><Typography.Link href={postalSource} target="_blank" rel="noreferrer">Источник почтовых индексов — Почта Таджикистана</Typography.Link><Typography.Text type="secondary"> · Индекс не вычисляется из ОКАТО. Если точного соответствия нет, он не подставляется из другого района.</Typography.Text></div>
 </>;
}
