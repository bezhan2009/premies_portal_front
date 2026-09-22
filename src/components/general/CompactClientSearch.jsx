import React, {useEffect,useRef,useState} from 'react';
import {Alert,Button,Input,Select,Space,Table} from 'antd';
import {TYPE_SEARCH_CLIENT} from '../../const/defConst.js';
import {compactSearchEndpoint,clientCodeFromResult,complianceClientFields} from '../../utils/compactClientSearch.js';

export default function CompactClientSearch({onSelect}) {
  const [mode,setMode]=useState(TYPE_SEARCH_CLIENT[0].value);
  const [term,setTerm]=useState('');
  const [results,setResults]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [searched,setSearched]=useState(false);
  const request=useRef(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  const read=async(url,atm,signal)=>{
    const response=await fetch(url,{signal,headers:atm?{}:{Authorization:`Bearer ${localStorage.getItem('access_token')||''}`}});
    if(response.status===404) return [];
    if(!response.ok) throw new Error(`Поиск недоступен (HTTP ${response.status})`);
    return response.json();
  };
  const reset=()=>{request.current?.abort();request.current=null;setBusy(false);setResults([]);setError('');setSearched(false);};
  const search=async()=>{
    request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');setResults([]);setSearched(false);
    try {
      const endpoint=compactSearchEndpoint(mode,term,import.meta.env.VITE_BACKEND_ABS_SERVICE_URL,import.meta.env.VITE_BACKEND_ATM_SERVICE_URL);
      const data=await read(endpoint.url,endpoint.atm,controller.signal);
      if(request.current!==controller)return;
      const rows=(Array.isArray(data)?data:[data]).filter(Boolean);
      const seen=new Set();
      setResults(rows.flatMap(item=>{const code=clientCodeFromResult(item);if(!code||seen.has(code))return [];seen.add(code);return [{code,raw:item,needsDetails:endpoint.atm}];}));setSearched(true);
    } catch(e) {if(e.name!=='AbortError'&&request.current===controller)setError(e.message);}
    finally {if(request.current===controller)setBusy(false);}
  };
  const choose=async row=>{
    request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');
    try {
      let client=row.raw;
      if(row.needsDetails){const endpoint=compactSearchEndpoint(TYPE_SEARCH_CLIENT[1].value,row.code,import.meta.env.VITE_BACKEND_ABS_SERVICE_URL,'');client=await read(endpoint.url,false,controller.signal);}
      if(request.current!==controller)return;
      if(Array.isArray(client))client=client[0];
      if(!client || !clientCodeFromResult(client))throw new Error('Карточка клиента не найдена');
      onSelect(complianceClientFields(client));
    } catch(e) {if(e.name!=='AbortError'&&request.current===controller)setError(e.message);}
    finally {if(request.current===controller)setBusy(false);}
  };
  return <section aria-label="Поиск текущих клиентов" style={{padding:16,background:'#f8fafc',borderRadius:10,marginBottom:18}}>
    <strong>Найти клиента в АБС</strong>
    <Space direction="vertical" style={{width:'100%',marginTop:10}}>
      <Select aria-label="Параметр поиска клиента" value={mode} onChange={value=>{reset();setMode(value);}} options={TYPE_SEARCH_CLIENT.map(item=>({value:item.value,label:item.label}))} style={{width:'100%'}}/>
      <Input.Search aria-label="Значение поиска клиента" placeholder={TYPE_SEARCH_CLIENT.find(item=>item.value===mode)?.inputLabel} value={term} onChange={event=>{reset();setTerm(event.target.value);}} onSearch={search} loading={busy} enterButton="Найти"/>
      {error&&<Alert type="error" showIcon message={error}/>}
      {searched&&<Table size="small" rowKey="code" dataSource={results} loading={busy} pagination={{pageSize:5,showSizeChanger:false}} locale={{emptyText:'Клиенты не найдены'}} columns={[
        {title:'Клиент',render:(_,row)=><span>{row.code}<br/>{row.raw?.LongName||row.raw?.long_name||row.raw?.longname||''}</span>},
        {title:'',width:110,render:(_,row)=><Button disabled={busy} onClick={()=>choose(row)}>Выбрать</Button>},
      ]}/>}
      <small>После выбора проверьте заполненные поля и нажмите «Сохранить». Поиск не добавляет клиента в список.</small>
    </Space>
  </section>;
}
