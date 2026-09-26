import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerMoney, ledgerCanPay, ledgerCanOpen, ledgerDirection, forecastText } from './proxyLedgerUtils.js';
test('processing amount uses hundredths and missing amounts stay unknown',()=>{assert.equal(ledgerMoney(1730),'17,30');assert.equal(ledgerMoney(null),'—');assert.equal(ledgerMoney(0),'0,00');});
test('unsettled history is payable but uncertain stages cannot be replayed',()=>{
 assert.equal(ledgerCanPay({historical:true,direction:'visa'},'payment'),true);
 assert.equal(ledgerCanPay({legacy_settled:true,direction:'visa'},'payment'),false);
 assert.equal(ledgerCanPay({direction:'visa',payment_operation_id:12},'payment'),false);
 assert.equal(ledgerCanPay({direction:'visa',payment_operation_id:12,payment_status:'error',payment_abs_status:'REJECTED'},'payment'),true);
 assert.equal(ledgerCanPay({direction:'visa'},'payment'),true);
 assert.equal(ledgerCanPay({direction:'visa',payment_status:'accepted',quote_at:new Date().toISOString()},'conversion'),false);
 assert.equal(ledgerCanPay({direction:'visa',payment_status:'executed',payment_abs_status:'BOOKED',quote_at:new Date().toISOString(),quote_version:'v',rub_minor:100,tjs_minor:10},'conversion'),true);
 assert.equal(ledgerCanPay({direction:'visa',difference_minor:20,conversion_status:'executed',conversion_abs_status:'BOOKED'},'difference'),true);
 assert.equal(ledgerCanPay({direction:'visa',difference_minor:0,conversion_status:'executed',conversion_abs_status:'BOOKED'},'difference'),false);
});
test('forecast never invents days from incomplete ruble history',()=>{assert.match(forecastText({forecast_days:null}),/Недостаточно/);assert.match(forecastText({forecast_days:2.8}),/2,8/);assert.equal(ledgerDirection('km'),'КМ доместик');});
test('settled Proxy Pay stages remain inspectable without allowing another payment',()=>{
 const paid={direction:'internal',payment_operation_id:41,payment_status:'executed',payment_abs_status:'BOOKED'};
 assert.equal(ledgerCanOpen(paid,'payment'),true);
 assert.equal(ledgerCanPay(paid,'payment'),false);
 assert.equal(ledgerCanOpen({...paid,legacy_settled:true},'conversion'),true);
 assert.equal(ledgerCanOpen({...paid,legacy_settled:true},'difference'),true);
 assert.equal(ledgerCanPay({...paid,legacy_settled:true},'payment'),false);
 assert.equal(ledgerCanOpen({direction:'internal',payment_operation_id:41,conversion_operation_id:42},'conversion'),true);
 assert.equal(ledgerCanOpen({direction:'internal',difference_operation_id:43},'difference'),true);
});
