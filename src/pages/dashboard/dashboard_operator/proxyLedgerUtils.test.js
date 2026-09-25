import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerMoney, ledgerCanPay, ledgerDirection, forecastText } from './proxyLedgerUtils.js';
test('processing amount uses hundredths and missing amounts stay unknown',()=>{assert.equal(ledgerMoney(1730),'17,30');assert.equal(ledgerMoney(null),'—');assert.equal(ledgerMoney(0),'0,00');});
test('historical and uncertain payments cannot be sent twice',()=>{
 assert.equal(ledgerCanPay({historical:true},'payment'),false);
 assert.equal(ledgerCanPay({payment_operation_id:12},'payment'),false);
 assert.equal(ledgerCanPay({direction:'visa'},'payment'),true);
 assert.equal(ledgerCanPay({direction:'visa',payment_status:'accepted',quote_at:new Date().toISOString()},'conversion'),false);
 assert.equal(ledgerCanPay({direction:'visa',payment_status:'executed',payment_abs_status:'BOOKED',quote_at:new Date().toISOString(),quote_version:'v',rub_minor:100,tjs_minor:10},'conversion'),true);
});
test('forecast never invents days from incomplete ruble history',()=>{assert.match(forecastText({forecast_days:null}),/Недостаточно/);assert.match(forecastText({forecast_days:2.8}),/2,8/);assert.equal(ledgerDirection('km'),'КМ доместик');});
