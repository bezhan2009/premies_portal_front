import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Button,Card,Col,DatePicker,Descriptions,Input,Modal,Row,Select,Space,Statistic,Table,Tabs,Tag,Typography,Tooltip} from 'antd';
import {apiClient} from '../../../api/utils/apiClient.js';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import {useNavigate} from 'react-router-dom';
import ProxyPayManualJournal from './ProxyPayManualJournal.jsx';
import ProxyPayDirectionChart from './ProxyPayDirectionChart.jsx';
import {proxyRegistryDownloadURL} from './proxyPayRegistry.js';
import {activeBankExportHeaders,activeBankExportRow,forecastText,ledgerCanOpen,ledgerCanPay,ledgerDate,ledgerDirection,ledgerMoney,ledgerShouldShowQuote,ledgerStatus,proxyOperationStatusBatches,proxyPaymentAction} from './proxyLedgerUtils.js';
import './ProxyPayPage.css';

const URL=`${import.meta.env.VITE_BACKEND_URL}/proxy-pay`;
const errorText=e=>e.response?.data?.error || 'Сервис временно недоступен';
const states=['manual','sending','accepted','executed','unknown','error','no_difference'].map(value=>({value,label:ledgerStatus(value)}));
const statusTag=value=><Tag color={{executed:'green',error:'red',unknown:'orange',sending:'blue',accepted:'gold',no_difference:'default'}[value]}>{ledgerStatus(value)}</Tag>;
const wholeMoney=value=>value==null?'—':Number(value).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
const rateText=value=>value==null?'—':Number(value).toFixed(4);
const exportWidths=[21,25,22,24,17,17,12,12,17,14,18,21,23,19];

function TransferLedger(){
 const navigate=useNavigate();
 const [data,setData]=useState({items:[],summary:{},sync:{},total:0});
 const [metrics,setMetrics]=useState(null),[metricsError,setMetricsError]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(null),[loading,setLoading]=useState(false);
 const [filters,setFilters]=useState({}),[search,setSearch]=useState(''),[range,setRange]=useState(null);
 const [page,setPage]=useState(1),[revision,setRevision]=useState(0);
 const [selected,setSelected]=useState(null),[prepared,setPrepared]=useState(null),[stageHistory,setStageHistory]=useState(null);
 const [confirming,setConfirming]=useState(false);
 const [busy,setBusy]=useState(''),[modalError,setModalError]=useState('');
 const [statusProgress,setStatusProgress]=useState(null);
 const [rateHistory,setRateHistory]=useState(null);
 const actionRef=useRef(false),generation=useRef(0);
 const requestFilters=useMemo(()=>({...filters,from:range?.[0]?.format('YYYY-MM-DDTHH:mm:ss'),to:range?.[1]?.format('YYYY-MM-DDTHH:mm:ss')}),[filters,range]);
 const refresh=()=>setRevision(v=>v+1);
 useEffect(()=>{const timer=setTimeout(()=>{setFilters(v=>({...v,search}));setPage(1);},350);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  apiClient.get(`${URL}/transfers`,{params:{...requestFilters,page},signal:controller.signal}).then(({data:value})=>setData(value)).catch(e=>{if(!controller.signal.aborted)setError(errorText(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[requestFilters,page,revision]);
 const loadMetrics=useCallback(async()=>{try{const {data:value}=await apiClient.get(`${URL}/ledger-metrics`,{timeout:30000});setMetrics(value);setMetricsError('');}catch(e){setMetricsError(errorText(e));}},[]);
 useEffect(()=>{loadMetrics();const timer=setInterval(()=>{loadMetrics();setRevision(v=>v+1);},300000);return()=>clearInterval(timer);},[loadMetrics]);
 const pending=data.items.some(r=>['payment_status','conversion_status','difference_status'].some(key=>['sending','accepted'].includes(r[key])));
 useEffect(()=>{if(!pending)return;const timer=setInterval(()=>setRevision(v=>v+1),30000);return()=>clearInterval(timer);},[pending]);
 const filter=(key,value)=>{setFilters(v=>({...v,[key]:value}));setPage(1);};
 const loadPrepared=async(row,kind)=>(await apiClient.get(`${URL}/transfers/${row.id}/${kind}/prepare`,{timeout:35000})).data;
 const closeStage=()=>{generation.current++;setSelected(null);setPrepared(null);setStageHistory(null);setConfirming(false);};
 const openStage=async(row,kind)=>{
  const current=++generation.current;setSelected({row,kind});setPrepared(null);setStageHistory(null);setConfirming(false);setModalError('');
  const operationId=row[`${kind}_operation_id`];
  const canPay=ledgerCanPay(row,kind);
  if(kind==='conversion'&&!row.quote_at&&!operationId&&!row.legacy_settled)return;
  setBusy('prepare');try{
   const [value,history]=await Promise.all([
    canPay?loadPrepared(row,kind):Promise.resolve(null),
    operationId?apiClient.get(`${URL}/operations/${operationId}`).then(response=>response.data):Promise.resolve(null),
   ]);
   if(current===generation.current){setPrepared(value);setStageHistory(history);if(value?.transfer)setSelected({row:{...row,...value.transfer},kind});}
  }catch(e){if(current===generation.current)setModalError(errorText(e));}finally{if(current===generation.current)setBusy('');}
 };
 const quote=async()=>{if(actionRef.current)return;actionRef.current=true;setBusy('quote');setConfirming(false);setModalError('');try{
  await apiClient.post(`${URL}/transfers/${selected.row.id}/quote`,{},{timeout:55000});
  const {data:list}=await apiClient.get(`${URL}/transfers`,{params:{utrnno:selected.row.utrnno},timeout:35000});
  const fresh=(list.items||[]).find(item=>item.id===selected.row.id)||selected.row;
  setSelected({...selected,row:fresh});
  setPrepared(ledgerCanPay(fresh,'conversion')?await loadPrepared(fresh,'conversion'):null);
  setNotice({type:'success',text:`№${selected.row.utrnno}: курсы обновлены. Проверьте курсовую разницу перед конвертацией.`});
  refresh();
 }catch(e){setModalError(errorText(e));}finally{actionRef.current=false;setBusy('');}};
 const pay=async()=>{
  if(actionRef.current)return;actionRef.current=true;setBusy('pay');setModalError('');try{
   const {data:value}=await apiClient.post(`${URL}/transfers/${selected.row.id}/${selected.kind}/execute`,{confirm:true,quote_version:selected.row.quote_version},{timeout:165000});
   setNotice({type:value.operation.status==='executed'?'success':'warning',text:`№${selected.row.utrnno}: ${ledgerStatus(value.operation.status)}. ${value.operation.message||''}`});closeStage();refresh();
  }catch(e){setModalError(`${errorText(e)}. Обновите реестр перед дальнейшими действиями.`);setConfirming(false);setPrepared(null);refresh();}finally{actionRef.current=false;setBusy('');}
 };
 const paymentClick=()=>{
  const action=proxyPaymentAction({prepared:!!prepared,canPay:ledgerCanPay(selected?.row,selected?.kind),confirming,busy:!!busy});
  if(action==='review')setConfirming(true);
  if(action==='submit')void pay();
 };
 const sync=async()=>{setBusy('sync');try{const {data:state}=await apiClient.post(`${URL}/transfers/sync`,{},{timeout:185000});if(state.last_error)setError(state.last_error);refresh();}catch(e){setError(errorText(e));}finally{setBusy('');}};
 const checkStatuses=async(row)=>{setBusy(`status-${row.id}`);try{for(const id of [row.payment_operation_id,row.conversion_operation_id,row.difference_operation_id].filter(Boolean))await apiClient.post(`${URL}/operations/${id}/status`,{},{timeout:145000});refresh();}catch(e){setError(errorText(e));}finally{setBusy('');}};
 const checkAllStatuses=async()=>{setBusy('status-all');setStatusProgress(null);setError('');try{
  const all=[];let nextPage=1,total=0;
  do{const {data:value}=await apiClient.get(`${URL}/operations`,{params:{page:nextPage++,page_size:200},timeout:120000});total=value.total||0;all.push(...(value.items||[]));if(!(value.items||[]).length)break;}while(all.length<total);
  const batches=proxyOperationStatusBatches(all,10);
  const skipped=all.filter(item=>item?.operation?.status!=='executed'&&!item?.operation?.reference).length;
  if(!batches.length){setNotice({type:'info',text:'Нет операций, требующих обновления статуса.'});return;}
  const failures=[];setStatusProgress({done:0,total:batches.length});
  for(let index=0;index<batches.length;index++){
   try{const {data:result}=await apiClient.post(`${URL}/operations/statuses`,batches[index],{timeout:165000});failures.push(...(result.errors||[]));}
   catch(e){failures.push(`Пакет ${index+1}: ${errorText(e)}`);}
   setStatusProgress({done:index+1,total:batches.length});
  }
  setNotice({type:failures.length||skipped?'warning':'success',text:failures.length?`Статусы обновлены с замечаниями: ${failures.slice(0,3).join('; ')}${failures.length>3?` (ещё ${failures.length-3})`:''}`:skipped?`Статусы обновлены. Без ID АБС пропущено операций: ${skipped}.`:'Статусы всех незавершённых операций обновлены.'});
  refresh();await loadMetrics();
 }catch(e){setError(errorText(e));}finally{setBusy('');setStatusProgress(null);}};
 const showRates=async()=>{setBusy('rates');try{const {data:value}=await apiClient.get(`${URL}/rate-history`);setRateHistory(value.items||[]);}catch(e){setError(errorText(e));}finally{setBusy('');}};
 const downloadProxyRegistry=async()=>{setBusy('export-proxy');try{
  const response=await apiClient.get(proxyRegistryDownloadURL(URL,requestFilters),{responseType:'blob',timeout:120000});
  const objectURL=window.URL.createObjectURL(response.data);
  const link=document.createElement('a');link.href=objectURL;link.download=`proxy-pay-register-${dayjs().format('YYYY-MM-DD-HHmm')}.xlsx`;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>window.URL.revokeObjectURL(objectURL),1000);
 }catch(e){setError(errorText(e));}finally{setBusy('');}};
 const exportActiveBank=async()=>{setBusy('export-activebank');try{
  const {data:value}=await apiClient.get(`${URL}/transfers`,{params:{...requestFilters,export:1},timeout:120000});
  const all=value.items||[];
  const sheet=XLSX.utils.aoa_to_sheet([activeBankExportHeaders,...all.map(activeBankExportRow)]);sheet['!cols']=activeBankExportHeaders.map((_,i)=>({wch:exportWidths[i]}));
  const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'Активбанк');XLSX.writeFile(workbook,`activbank-register-${dayjs().format('YYYY-MM-DD-HHmm')}.xlsx`);
 }catch(e){setError(errorText(e));}finally{setBusy('');}};
 const columns=[
  {title:'Операция',key:'operation',fixed:'left',width:185,render:(_,r)=><><Typography.Text strong>№ {r.utrnno}</Typography.Text><div className="proxy-muted">{ledgerDate(r.occurred_at)}</div>{r.historical&&<Tag>Историческая</Tag>}</>},
  {title:'Направление / получатель',width:225,render:(_,r)=><><Tag color={{visa:'blue',km:'purple',internal:'cyan'}[r.direction]}>{ledgerDirection(r.direction)}</Tag><div>{r.card_number||'—'}</div><Typography.Text copyable={!!r.account}>{r.account||'—'}</Typography.Text></>},
  {title:'Сумма ПЦ',dataIndex:'amount_minor',align:'right',width:140,render:ledgerMoney},
  {title:'Сумма АБС',dataIndex:'tjs_minor',align:'right',width:145,render:ledgerMoney},
  {title:'Курс ПЦ',dataIndex:'pc_rate',align:'right',width:115,render:rateText},
  {title:'Курс АБС',dataIndex:'abs_rate',align:'right',width:115,render:rateText},
  {title:'Сумма в РУБ',dataIndex:'rub_minor',align:'right',width:145,render:ledgerMoney},
  {title:'Разница, TJS',dataIndex:'difference_minor',align:'right',width:130,render:v=><Typography.Text type={v<0?'danger':undefined}>{ledgerMoney(v)}</Typography.Text>},
  {title:'Платежка / Курс. разница / конвертация',width:235,render:(_,r)=><Space direction="vertical" size={6}><Tooltip title={r.payment_message}>{statusTag(r.payment_status)}</Tooltip><Tooltip title={r.difference_message}>{statusTag(r.difference_status)}</Tooltip><Tooltip title={r.conversion_message}>{statusTag(r.conversion_status)}</Tooltip>{r.block_reason&&<Typography.Text type="danger">{r.block_reason}</Typography.Text>}</Space>},
  {title:'Действия',key:'actions',width:430,fixed:'right',render:(_,r)=><><div className="proxy-stage-actions"><Button size="small" disabled={!ledgerCanOpen(r,'payment')} onClick={()=>openStage(r,'payment')}>Платежка</Button><Button size="small" disabled={!ledgerCanOpen(r,'difference')} onClick={()=>openStage(r,'difference')}>Курс. разница</Button><Button size="small" disabled={!ledgerCanOpen(r,'conversion')} onClick={()=>openStage(r,'conversion')}>Конвертация</Button></div>{(r.payment_operation_id||r.conversion_operation_id||r.difference_operation_id)&&<Button type="link" size="small" loading={busy===`status-${r.id}`} onClick={()=>checkStatuses(r)}>Проверить статусы</Button>}</>},
 ];
 return <div className="proxy-ledger">
  <div className="proxy-title"><div><Typography.Title level={3}>P2P · Proxy Pay</Typography.Title><Typography.Text type="secondary">P2PSP279 · время Душанбе (UTC+5)</Typography.Text></div><Space wrap><Button onClick={()=>{refresh();loadMetrics();}}>Обновить</Button><Button loading={busy==='sync'} onClick={sync}>Сверить с процессингом</Button></Space></div>
  <Row gutter={[16,16]} className="proxy-metrics">
   <Col xs={24} lg={8}><Card><Statistic title="Баланс Proxy Pay · RUB" value={metrics?.balance??'—'} precision={2}/><div className="proxy-metric-note">{forecastText(metrics)}</div><Typography.Text type="secondary">За 7 дней: суммы RUB известны для {metrics?.week_quoted??0} из {metrics?.week_count??0} операций</Typography.Text><div><Button size="small" onClick={()=>navigate('/operator/proxy-pay/statement')}>Выписка</Button></div></Card></Col>
   <Col xs={24} lg={8}><Card><Statistic title="Курс RUB → TJS" value={metrics?.rate??'—'} precision={4}/><div className="proxy-metric-note">{metrics?.rate_delta?<Tag color={metrics.rate_delta>0?'green':'red'}>{metrics.rate_delta>0?'+':''}{Number(metrics.rate_delta).toFixed(4)}</Tag>:<Tag>{metrics?.rate_changed_at?'Без нового изменения':'Первое наблюдение'}</Tag>}</div><Typography.Text type="secondary">Изменение замечено: {ledgerDate(metrics?.rate_changed_at)}<br/>Проверен: {ledgerDate(metrics?.checked_at)}</Typography.Text><div><Button size="small" loading={busy==='rates'} onClick={showRates}>История курсов</Button></div></Card></Col>
   <Col xs={24} lg={8}><Card><div className="proxy-muted">Курсовая разница · TJS</div><div className="proxy-difference">{ledgerMoney(metrics?.difference_minor)} <span>/</span> {wholeMoney(metrics?.fx_balance)}</div><Typography.Text type="secondary">Сумма разниц / баланс счёта<br/>17507972590808713206</Typography.Text>{metrics?.balance_error&&<div className="proxy-warning">{metrics.balance_error}</div>}</Card></Col>
  </Row>
  {(error||metricsError)&&<Alert showIcon type="error" message={error||metricsError}/>} {notice&&<Alert showIcon closable onClose={()=>setNotice(null)} type={notice.type} message={notice.text}/>}
  <Alert showIcon type="info" message="Получение операций и финансовые проводки настраиваются отдельными задачами." description="Повторная отправка доступна после подтверждённой ошибки. Этапы «Отправляется», «Ожидает исполнения» и «Требует сверки» сначала нужно проверить в АБС, чтобы не создать двойной платёж."/>
  <Card className="proxy-filter-card"><Row gutter={[12,12]}>
   <Col xs={24} lg={10}><Input allowClear value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по всем полям таблицы"/></Col>
   <Col xs={24} lg={14}><DatePicker.RangePicker showTime={{format:'HH:mm:ss'}} format="DD.MM.YYYY HH:mm:ss" value={range} onChange={value=>{setRange(value);setPage(1);}} style={{width:'100%'}}/></Col>
   <Col xs={24} md={6}><Select allowClear placeholder="Направление перевода" value={filters.direction} onChange={v=>filter('direction',v)} options={['internal','visa','km','unknown'].map(value=>({value,label:ledgerDirection(value)}))}/></Col>
   <Col xs={24} md={6}><Select allowClear placeholder="Статус платежки" value={filters.payment_status} onChange={v=>filter('payment_status',v)} options={states}/></Col>
   <Col xs={24} md={6}><Select allowClear placeholder="Статус конвертации" value={filters.conversion_status} onChange={v=>filter('conversion_status',v)} options={states}/></Col>
   <Col xs={24} md={6}><Select allowClear placeholder="Статус КР" value={filters.difference_status} onChange={v=>filter('difference_status',v)} options={states}/></Col>
   <Col xs={24} md={6}><Input.Search allowClear placeholder="Номер операции" onSearch={v=>filter('utrnno',v)}/></Col>
  </Row></Card>
  <ProxyPayDirectionChart metrics={data.direction_metrics||[]}/>
  <div className="proxy-table-summary"><Space wrap><Typography.Text strong>Операций: {data.total.toLocaleString('ru-RU')}</Typography.Text><span>Зачислено: {ledgerMoney(data.summary.amount_minor)} TJS</span><span>Разница: {ledgerMoney(data.summary.difference_minor)} TJS · расчёт у {data.summary.quoted??0} операций</span></Space><Space wrap><Typography.Text type="secondary">Последняя загрузка: {ledgerDate(data.sync.last_success_at)}</Typography.Text><Button loading={busy==='status-all'} onClick={checkAllStatuses}>{statusProgress?`Обновление статусов ${statusProgress.done}/${statusProgress.total}`:'Обновить все статусы операций'}</Button><Button loading={busy==='export-proxy'} onClick={downloadProxyRegistry}>Реестр Прокси Пэй</Button><Button loading={busy==='export-activebank'} onClick={exportActiveBank}>Реестр Активбанк</Button></Space></div>
  {data.sync.last_error&&<Alert type="warning" message={`Ошибка загрузки: ${data.sync.last_error}`}/>}
  {data.sync.backfill_date&&<Typography.Paragraph type="secondary">Архив с 01.08.2026. Следующий день для сверки: {data.sync.backfill_date}.</Typography.Paragraph>}
  <Table rowKey="id" dataSource={data.items} columns={columns} loading={loading} scroll={{x:2060}} pagination={{current:page,pageSize:50,total:data.total,showSizeChanger:false,onChange:setPage,showTotal:total=>`${total} операций`}}/>
  <Modal open={!!selected} title={`${({payment:'Платежка',conversion:'Конвертация',difference:'Курс. разница'})[selected?.kind]||''} · №${selected?.row.utrnno??''}`} width={860} maskClosable={false} onCancel={()=>{if(!busy)closeStage();}} closable={!busy} footer={selected&&<Space><Button disabled={!!busy} onClick={closeStage}>Закрыть</Button>{confirming&&<Button disabled={!!busy} onClick={()=>setConfirming(false)}>Назад к документу</Button>}{selected.kind==='conversion'&&!confirming&&ledgerShouldShowQuote(selected.row)&&<Tooltip title={selected.row.can_refresh_quote?'Запросить актуальные курсы':'Если этап ещё обрабатывается, сервер попросит сначала обновить его статус'}><Button loading={busy==='quote'} disabled={!!busy&&busy!=='quote'} onClick={quote}>Обновить курсы</Button></Tooltip>}<Button type="primary" loading={busy==='pay'} disabled={proxyPaymentAction({prepared:!!prepared,canPay:ledgerCanPay(selected.row,selected.kind),confirming,busy:!!busy})==='blocked'} onClick={paymentClick}>{confirming?'Подтвердить оплату':'Оплатить'}</Button></Space>}>
   {selected&&<Space direction="vertical" size={16} style={{width:'100%'}}>
    {selected.row.historical&&<Alert type="info" message={selected.row.legacy_settled?'Историческая операция полностью выполнена':'Историческая операция доступна для проводки при отсутствии ранее выполненного этапа'}/>}
    {selected.row.block_reason&&<Alert type="error" message={selected.row.block_reason}/>}
    {selected.kind==='conversion'&&selected.row.payment_status!=='executed'&&<Alert type="warning" message="Конвертация доступна после исполнения платежки (BOOKED). Курсы можно получить заранее."/>}
    {!ledgerCanPay(selected.row,selected.kind)&&['sending','accepted','unknown'].includes(selected.row[`${selected.kind}_status`])&&<Alert type="warning" message="Повторная отправка заблокирована до сверки текущей операции с АБС."/>}
    {modalError&&<Alert type="error" message={modalError}/>}
    {confirming&&prepared&&<Alert type="warning" showIcon message="Проверьте реквизиты перед отправкой в АБС" description={<Space direction="vertical"><strong>{({payment:'Платежка',conversion:'Конвертация',difference:'Курс. разница'})[selected.kind]} · №{selected.row.utrnno}</strong><span>Сумма: {prepared.input.amount} {selected.kind==='conversion'?'RUB':'TJS'}</span><span>Списание: {prepared.input.payer_iban}</span><span>Зачисление: {prepared.input.beneficiary_iban}</span><span>Запрос будет отправлен один раз после нажатия «Подтвердить оплату».</span></Space>}/>}
    <Descriptions bordered size="small" column={2} items={[
     {key:'direction',label:'Направление',children:ledgerDirection(selected.row.direction)},{key:'date',label:'Дата операции',children:ledgerDate(selected.row.occurred_at)},
     {key:'payment',label:'Платежка',children:`${ledgerMoney(selected.row.payment_amount_minor)} TJS`},{key:'pc',label:'Сумма ПЦ',children:`${ledgerMoney(selected.row.amount_minor)} TJS`},
     {key:'conversion-rub',label:'Конвертация · RUB',children:`${ledgerMoney(selected.row.conversion_rub_minor)} RUB`},{key:'conversion-tjs',label:'Конвертация · TJS',children:`${ledgerMoney(selected.row.conversion_tjs_minor)} TJS`},
     {key:'pc-rate',label:'Курс ПЦ',children:rateText(selected.row.pc_rate)},{key:'abs-rate',label:'Курс АБС',children:rateText(selected.row.abs_rate)},
     {key:'difference',label:'Курс. разница · ABS − PC',children:`${ledgerMoney(selected.row.difference_minor)} TJS`},{key:'quote',label:'Расчёт курса',children:ledgerDate(selected.row.quote_at)},
    ]}/>
    {busy==='prepare'&&<Typography.Text>Подготовка реквизитов…</Typography.Text>}
    {selected.row.legacy_settled&&!stageHistory&&<Alert type="info" message="Этап выполнен ранее; журнал запроса для этой исторической операции отсутствует."/>}
    {prepared&&<><Descriptions bordered size="small" column={1} items={[
     {key:'payer',label:'Плательщик',children:`${prepared.input.payer_name} · ИНН ${prepared.input.payer_idn} · ${prepared.input.payer_iban}`},
     {key:'beneficiary',label:'Получатель',children:`${prepared.input.beneficiary_name} · ИНН ${prepared.input.beneficiary_idn} · ${prepared.input.beneficiary_iban}`},
     {key:'purpose',label:'Назначение',children:prepared.input.payment_details},
    ]}/>{prepared.request_xml&&<details><summary>{stageHistory&&!ledgerCanPay(selected.row,selected.kind)?'Отправленный запрос в АБС':'Запрос в АБС'}</summary><pre className="proxy-xml">{prepared.request_xml}</pre></details>}</>}
    {!prepared&&stageHistory?.request_xml&&<details><summary>Отправленный запрос в АБС</summary><pre className="proxy-xml">{stageHistory.request_xml}</pre></details>}
    {stageHistory&&<><Alert type={stageHistory.operation?.status==='error'?'error':'info'} message={`Статус: ${ledgerStatus(stageHistory.operation?.status)}${stageHistory.operation?.abs_status?` · АБС: ${stageHistory.operation.abs_status}`:''}`} description={stageHistory.operation?.message||undefined}/>{stageHistory.response_xml&&<details><summary>Ответ АБС</summary><pre className="proxy-xml">{stageHistory.response_xml}</pre></details>}{stageHistory.status_request_xml&&<details><summary>Запрос статуса</summary><pre className="proxy-xml">{stageHistory.status_request_xml}</pre></details>}{stageHistory.status_response_xml&&<details><summary>Ответ статуса</summary><pre className="proxy-xml">{stageHistory.status_response_xml}</pre></details>}</>}
   </Space>}
  </Modal>
  <Modal open={rateHistory!==null} title="История курсов Proxy Pay" width={680} footer={<Button onClick={()=>setRateHistory(null)}>Закрыть</Button>} onCancel={()=>setRateHistory(null)}><Table rowKey="id" size="small" dataSource={rateHistory||[]} pagination={{pageSize:20}} columns={[{title:'Зафиксировано',dataIndex:'observed_at',render:ledgerDate},{title:'Курс до',dataIndex:'prior_rate',render:rateText},{title:'Новый курс',dataIndex:'rate',render:rateText},{title:'Источник',dataIndex:'source_at'}]}/></Modal>
 </div>;
}

export default function ProxyPayPage(){return <Tabs defaultActiveKey="transfers" items={[{key:'transfers',label:'Переводы P2P',children:<TransferLedger/>},{key:'journal',label:'Журнал проводок',children:<ProxyPayManualJournal/>}]}/>;}
