import test from 'node:test';
import assert from 'node:assert/strict';
import {
 ledgerMoney,
 ledgerCanPay,
 ledgerCanOpen,
 ledgerDirection,
 forecastText,
 activeBankExportHeaders,
 activeBankExportRow,
 proxyStatusBatches,
 proxyOperationStatusBatches,
 outstandingDifferenceMinor,
 ledgerCanQuoteConversion,
 ledgerShouldShowQuote,
 proxyDirectionChartData,
} from './proxyLedgerUtils.js';
import * as ledgerActions from './proxyLedgerUtils.js';
test('processing amount uses hundredths and missing amounts stay unknown',()=>{assert.equal(ledgerMoney(1730),'17,30');assert.equal(ledgerMoney(null),'—');assert.equal(ledgerMoney(0),'0,00');});
test('stage availability follows server permissions instead of rebuilding financial rules in the browser',()=>{
 assert.equal(ledgerCanPay({can_payment:true},'payment'),true);
 assert.equal(ledgerCanPay({can_payment:false,direction:'visa',payment_status:'error'},'payment'),false);
 assert.equal(ledgerCanPay({can_difference:true,conversion_status:'executed',conversion_abs_status:'BOOKED'},'difference'),true);
 assert.equal(ledgerCanPay({can_conversion:true,payment_status:'executed',payment_abs_status:'BOOKED'},'conversion'),true);
 assert.equal(ledgerCanPay({can_conversion:false,quote_at:new Date().toISOString(),quote_version:'v'},'conversion'),false);
});
test('forecast never invents days from incomplete ruble history',()=>{assert.match(forecastText({forecast_days:null}),/Недостаточно/);assert.match(forecastText({forecast_days:2.8}),/2,8/);assert.equal(ledgerDirection('km'),'КМ доместик');});
test('settled Proxy Pay stages remain inspectable without allowing another payment',()=>{
 const paid={payment_operation_id:41,payment_status:'executed',payment_abs_status:'BOOKED',can_payment:false};
 assert.equal(ledgerCanOpen(paid,'payment'),true);
 assert.equal(ledgerCanPay(paid,'payment'),false);
 assert.equal(ledgerCanOpen({...paid,legacy_settled:true},'conversion'),true);
 assert.equal(ledgerCanOpen({...paid,legacy_settled:true},'difference'),true);
 assert.equal(ledgerCanOpen({conversion_operation_id:42,can_conversion:false},'conversion'),true);
 assert.equal(ledgerCanOpen({payment_operation_id:41,can_refresh_quote:true,can_conversion:false},'conversion'),true);
 assert.equal(ledgerCanOpen({difference_operation_id:43,can_difference:false},'difference'),true);
 assert.equal(ledgerCanOpen({historical:true,conversion_abs_status:'BOOKED',can_difference:true},'difference'),true);
 assert.equal(ledgerCanPay({historical:true,conversion_abs_status:'BOOKED',can_difference:true},'difference'),true);
});
test('payment needs a visible review step before submitting once',()=>{
 assert.equal(typeof ledgerActions.proxyPaymentAction,'function');
 assert.equal(ledgerActions.proxyPaymentAction({prepared:true,canPay:true,confirming:false,busy:false}),'review');
 assert.equal(ledgerActions.proxyPaymentAction({prepared:true,canPay:true,confirming:true,busy:false}),'submit');
 assert.equal(ledgerActions.proxyPaymentAction({prepared:false,canPay:true,confirming:true,busy:false}),'blocked');
 assert.equal(ledgerActions.proxyPaymentAction({prepared:true,canPay:false,confirming:true,busy:false}),'blocked');
 assert.equal(ledgerActions.proxyPaymentAction({prepared:true,canPay:true,confirming:true,busy:true}),'blocked');
});
test('only confirmed failed financial stages can be retried from their payment dialog',()=>{
 const base={can_payment:false};
 for(const status of ['sending','accepted','unknown']){
  assert.equal(ledgerCanPay({...base,payment_operation_id:11,payment_status:status},'payment'),false,status);
 }
 assert.equal(ledgerCanPay({...base,payment_operation_id:11,payment_status:'error',can_payment:true},'payment'),true);
 assert.equal(ledgerCanPay({...base,payment_operation_id:11,payment_status:'executed'},'payment'),false);
 assert.equal(ledgerCanPay({...base,difference_operation_id:12,difference_status:'error',can_difference:true},'difference'),true);
});
test('executed exchange differences are excluded from the outstanding total',()=>{
 assert.equal(outstandingDifferenceMinor([
  {difference_minor:125,difference_status:'manual'},
  {difference_minor:-25,difference_status:'error'},
  {difference_minor:900,difference_status:'executed'},
  {difference_minor:null,difference_status:'manual'},
 ]),100);
});
test('Activebank register has the exact visible ledger columns and values',()=>{
 assert.deepEqual(activeBankExportHeaders,[
  'Дата и время операции','Направление перевола','Номер карты','Номер счета','Сумма в ПЦ','Сумма в АБС','Курс ПЦ','Курс АБС','Сумма в РУБ','Разница','Номер операции','Статус платежки','Статус конвертации','Статус КР',
 ]);
 const row=activeBankExportRow({occurred_at:'2026-09-25T05:00:00Z',direction:'visa',card_number:'4***1',account:'2020',amount_minor:1250,tjs_minor:1200,pc_rate:0.123456,abs_rate:0.123499,rub_minor:10000,difference_minor:50,utrnno:'77',payment_status:'executed',conversion_status:'accepted',difference_status:'manual'});
 assert.equal(row.length,14);
 assert.deepEqual(row.slice(1),['VISA доместик','4***1','2020',12.5,12,0.1235,0.1235,100,-0.5,'77','Исполнено','Ожидает исполнения','Ручная проводка']);
});
test('status refresh batches contain at most ten domestic and ten conversion operations',()=>{
 const rows=[];
 for(let i=1;i<=23;i++) rows.push({payment_operation_id:i,payment_status:'accepted',conversion_operation_id:100+i,conversion_status:'unknown'});
 rows.push({payment_operation_id:1,payment_status:'accepted',difference_operation_id:999,difference_status:'error'});
 rows.push({payment_operation_id:500,payment_status:'executed',conversion_operation_id:600,conversion_status:'executed',difference_operation_id:700,difference_status:'executed'});
 const batches=proxyStatusBatches(rows,10);
 assert.equal(batches.length,3);
 assert.deepEqual(batches.map(v=>[v.payment_ids.length,v.conversion_ids.length]),[[10,10],[10,10],[4,3]]);
 assert.equal(batches[2].payment_ids.at(-1),999);
 assert.ok(batches.every(v=>new Set(v.payment_ids).size===v.payment_ids.length));
});
test('status refresh discovers every incomplete journal attempt, including superseded ones',()=>{
 const items=[];
 for(let i=1;i<=12;i++) items.push({operation:{id:i,kind:'payment',status:'accepted',reference:`P-${i}`}});
 items.push({operation:{id:100,kind:'difference',status:'error',reference:'D-100'}});
 items.push({operation:{id:101,kind:'conversion',status:'unknown',reference:'C-101'}});
 items.push({operation:{id:102,kind:'payment',status:'executed',reference:'P-102'}});
 items.push({operation:{id:103,kind:'payment',status:'unknown',reference:''}});
 const batches=proxyOperationStatusBatches(items,10);
 assert.deepEqual(batches.map(v=>[v.payment_ids.length,v.conversion_ids.length]),[[10,1],[3,0]]);
 assert.equal(batches[1].payment_ids.at(-1),100);
 assert.ok(batches.flatMap(v=>v.payment_ids).includes(1));
 assert.ok(!batches.flatMap(v=>v.payment_ids).includes(102));
 assert.ok(!batches.flatMap(v=>v.payment_ids).includes(103));
});
test('rate refresh stays visible until conversion is BOOKED and server controls safe refresh',()=>{
 assert.equal(ledgerShouldShowQuote({conversion_abs_status:'',legacy_settled:false}),true);
 assert.equal(ledgerShouldShowQuote({conversion_status:'error',conversion_abs_status:'REJECTED'}),true);
 assert.equal(ledgerShouldShowQuote({conversion_status:'executed',conversion_abs_status:'BOOKED'}),false);
 assert.equal(ledgerCanQuoteConversion({can_refresh_quote:true}),true);
 assert.equal(ledgerCanQuoteConversion({can_refresh_quote:false}),false);
});
test('direction chart maps the filtered API metrics to both amount and count',()=>{
 assert.deepEqual(proxyDirectionChartData([
  {direction:'visa',count:3,amount_minor:12345},
  {direction:'internal',count:2,amount_minor:500},
  {direction:'km',count:0,amount_minor:0},
 ]),[
  {direction:'internal',name:'Внутрибанковский',count:2,amount:5},
  {direction:'visa',name:'VISA доместик',count:3,amount:123.45},
  {direction:'km',name:'КМ доместик',count:0,amount:0},
 ]);
});
