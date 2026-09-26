import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerMoney, ledgerCanPay, ledgerCanOpen, ledgerDirection, forecastText, proxyDirectionChartData, proxyStageActions } from './proxyLedgerUtils.js';
test('processing amount uses hundredths and missing amounts stay unknown',()=>{assert.equal(ledgerMoney(1730),'17,30');assert.equal(ledgerMoney(null),'—');assert.equal(ledgerMoney(0),'0,00');});
test('server eligibility is authoritative and settlement stages stay in accounting order',()=>{
 const row={
  payment_operation_id:11,
  difference_operation_id:12,
  conversion_operation_id:13,
  can_payment:false,
  can_refresh_quote:true,
  can_difference:true,
  can_conversion:false,
  conversion_abs_status:'PENDING',
  settlement:{pending:[{operation_id:44}],entries:[{operation_id:43},{operation_id:44}]},
 };
 const actions=proxyStageActions(row);
 assert.deepEqual(actions.order,['payment','difference','conversion']);
 assert.equal(actions.payment.enabled,false);
 assert.equal(actions.refreshQuote.enabled,true);
 assert.equal(actions.difference.enabled,true);
 assert.equal(actions.difference.operationId,44);
 assert.equal(actions.conversion.enabled,false);
 assert.equal(ledgerCanPay(row,'difference'),true);
 assert.equal(ledgerCanPay(row,'conversion'),false);
 assert.equal(proxyStageActions({...row,conversion_abs_status:'BOOKED'}).refreshQuote.enabled,false);
});
test('forecast never invents days from incomplete ruble history',()=>{assert.match(forecastText({forecast_days:null}),/Недостаточно/);assert.match(forecastText({forecast_days:2.8}),/2,8/);assert.equal(ledgerDirection('km'),'КМ доместик');});
test('settled Proxy Pay stages remain inspectable without allowing another payment',()=>{
 const paid={direction:'internal',payment_operation_id:41,payment_status:'executed',payment_abs_status:'BOOKED',can_payment:false};
 assert.equal(ledgerCanOpen(paid,'payment'),true);
 assert.equal(ledgerCanPay(paid,'payment'),false);
 assert.equal(ledgerCanOpen({...paid,legacy_settled:true},'conversion'),true);
 assert.equal(ledgerCanOpen({...paid,legacy_settled:true},'difference'),true);
 assert.equal(ledgerCanPay({...paid,legacy_settled:true},'payment'),false);
 assert.equal(ledgerCanOpen({direction:'internal',payment_operation_id:41,conversion_operation_id:42},'conversion'),true);
 assert.equal(ledgerCanOpen({direction:'internal',difference_operation_id:43},'difference'),true);
});

test('signed exchange difference displays ABS minus processing amount',()=>{
 assert.equal(ledgerMoney(300),'3,00');
 assert.equal(ledgerMoney(-300),'-3,00');
});

test('direction chart keeps all directions and converts minor amounts to somoni',()=>{
 assert.deepEqual(proxyDirectionChartData([{direction:'visa',count:3,amount_minor:12345}]),[
  {direction:'internal',name:'Внутрибанковский',count:0,amount:0},
  {direction:'visa',name:'VISA доместик',count:3,amount:123.45},
  {direction:'km',name:'КМ доместик',count:0,amount:0},
 ]);
});
