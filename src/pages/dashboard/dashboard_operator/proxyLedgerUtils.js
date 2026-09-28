export const ledgerMoney = minor => minor == null ? '—' : (Number(minor)/100).toLocaleString('ru-RU', {minimumFractionDigits:2,maximumFractionDigits:2});
export const ledgerDirection = value => ({internal:'Внутрибанковский',visa:'VISA доместик',km:'КМ доместик'}[value] || 'Не определено');
export const ledgerDate = value => value ? new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value)) : '—';
export const ledgerStatus = value => ({manual:'Ручная проводка',sending:'Отправляется',accepted:'Ожидает исполнения',executed:'Исполнено',unknown:'Требует сверки',error:'Ошибка',no_difference:'Нет КР'}[value] || value || 'Ручная проводка');
export const activeBankExportHeaders=['Дата и время операции','Направление перевола','Номер карты','Номер счета','Сумма в ПЦ','Сумма в АБС','Курс ПЦ','Курс АБС','Сумма в РУБ','Разница','Номер операции','Статус платежки','Статус конвертации','Статус КР'];
export const activeBankExportRow=row=>[
 ledgerDate(row.occurred_at),ledgerDirection(row.direction),row.card_number||'',row.account||'',
 row.amount_minor==null?'':row.amount_minor/100,row.tjs_minor==null?'':row.tjs_minor/100,
 row.pc_rate==null?'':Number(Number(row.pc_rate).toFixed(4)),row.abs_rate==null?'':Number(Number(row.abs_rate).toFixed(4)),
 row.rub_minor==null?'':row.rub_minor/100,row.tjs_minor==null||row.amount_minor==null?'':(row.tjs_minor-row.amount_minor)/100,row.utrnno,
 ledgerStatus(row.payment_status),ledgerStatus(row.conversion_status),ledgerStatus(row.difference_status),
];
export function proxyDirectionChartData(metrics=[]){
 const byDirection=new Map((metrics||[]).map(item=>[item.direction,item]));
 const directions=['internal','visa','km'];
 if(byDirection.has('unknown'))directions.push('unknown');
 return directions.map(direction=>{
  const item=byDirection.get(direction)||{};
  return {direction,name:ledgerDirection(direction),count:Number(item.count)||0,amount:(Number(item.amount_minor)||0)/100};
 });
}
export const outstandingDifferenceMinor=rows=>(rows||[]).reduce((total,row)=>total+(row?.difference_status==='executed'?0:Number(row?.difference_minor)||0),0);
export function proxyStatusBatches(rows,size=10){
 const payment=[],conversion=[],seenPayment=new Set(),seenConversion=new Set();
 const add=(target,seen,value,status)=>{if(value&&status!=='executed'&&!seen.has(value)){seen.add(value);target.push(value);}};
 for(const row of rows||[]){
  add(payment,seenPayment,row.payment_operation_id,row.payment_status);
  add(payment,seenPayment,row.difference_operation_id,row.difference_status);
  add(conversion,seenConversion,row.conversion_operation_id,row.conversion_status);
 }
 const count=Math.max(Math.ceil(payment.length/size),Math.ceil(conversion.length/size));
 return Array.from({length:count},(_,index)=>({payment_ids:payment.slice(index*size,(index+1)*size),conversion_ids:conversion.slice(index*size,(index+1)*size)}));
}
export function proxyOperationStatusBatches(items,size=10){
 const payment=[],conversion=[],seenPayment=new Set(),seenConversion=new Set();
 const add=(target,seen,operation)=>{
  if(!operation?.id||operation.status==='executed'||!operation.reference||seen.has(operation.id))return;
  seen.add(operation.id);target.push(operation.id);
 };
 for(const item of items||[]){
  const operation=item?.operation||item;
  if(operation?.kind==='conversion')add(conversion,seenConversion,operation);
  else if(operation?.kind==='payment'||operation?.kind==='difference')add(payment,seenPayment,operation);
 }
 const count=Math.max(Math.ceil(payment.length/size),Math.ceil(conversion.length/size));
 return Array.from({length:count},(_,index)=>({payment_ids:payment.slice(index*size,(index+1)*size),conversion_ids:conversion.slice(index*size,(index+1)*size)}));
}
export function ledgerCanPay(row,kind) {
 return !!row?.[`can_${kind}`];
}
export function ledgerCanOpen(row, kind) {
 if (!row) return false;
 if(row.legacy_settled || row[`${kind}_operation_id`] || ledgerCanPay(row,kind))return true;
 return kind==='conversion' && ledgerShouldShowQuote(row) && !!(row.can_refresh_quote || row.payment_operation_id);
}
export function ledgerCanQuoteConversion(row){
 return !!row?.can_refresh_quote;
}
export function ledgerShouldShowQuote(row){
 return !!row && !row.legacy_settled && row.conversion_abs_status!=='BOOKED';
}
export function proxyPaymentAction({prepared, canPay, confirming, busy}) {
 if (!prepared || !canPay || busy) return 'blocked';
 return confirming ? 'submit' : 'review';
}
export const forecastText = data => data?.forecast_days == null ? 'Недостаточно данных для прогноза' : `Хватит примерно на: ${Number(data.forecast_days).toLocaleString('ru-RU',{maximumFractionDigits:1})} дней`;
