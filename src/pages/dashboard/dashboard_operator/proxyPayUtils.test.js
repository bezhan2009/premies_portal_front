import test from 'node:test';
import assert from 'node:assert/strict';
import { isCurrentProxyQuote, proxyOperationStatus, proxyQuotePayload, replaceProxyOperation, validateProxyAccount, validateProxyAmount, proxyStatistics } from './proxyPayUtils.js';

test('an empty journal with null statistics renders zero totals', () => {
 assert.deepEqual(proxyStatistics(null), {count:0,rub:0,tjs:0,unconfirmed:0});
});

test('conversion accepts only a 20-digit payer account with RUB in positions 6–8', () => {
 assert.equal(validateProxyAccount('20218643881304400667', 'conversion'), '');
 for (const value of ['20216972881304400667', '', '6431864388130440066', '2021864388130440066x']) {
  assert.equal(validateProxyAccount(value, 'conversion'), 'Введите счет в рублях');
 }
 assert.equal(validateProxyAccount('20216972881304400667', 'payment'), '');
});
test('money rejects nonpositive, exponent, fractional kopecks and oversized values', () => {
 for (const v of ['0','-1','1e3','1.001','NaN','10000000000']) assert.ok(validateProxyAmount(v));
 for (const v of ['10','10.01','0.01']) assert.equal(validateProxyAmount(v), '');
});
test('statistics never mix RUB with TJS or count unconfirmed amounts as executed', () => {
 assert.deepEqual(proxyStatistics([
  {kind:'conversion',status:'executed',count:2,amount_minor:10000},
  {kind:'payment',status:'executed',count:1,amount_minor:15510},
  {kind:'conversion',status:'unknown',count:1,amount_minor:5000},
 ]), {count:4,rub:100,tjs:155.1,unconfirmed:1});
});
test('quote payload exists only when both amount and RUB payer account are valid', () => {
 assert.deepEqual(proxyQuotePayload('10.50', '20218643881304400667'), {amount:'10.50', payer_iban:'20218643881304400667'});
 for (const [amount, account] of [['', '20218643881304400667'], ['10', ''], ['0', '20218643881304400667'], ['10', '20216972881304400667']]) {
  assert.equal(proxyQuotePayload(amount, account), null);
 }
});
test('quote result is applied only to the exact amount and account that requested it', () => {
 const payload = {amount:'10', payer_iban:'20218643881304400667'};
 assert.equal(isCurrentProxyQuote(payload, '10', '20218643881304400667'), true);
 assert.equal(isCurrentProxyQuote(payload, '11', '20218643881304400667'), false);
 assert.equal(isCurrentProxyQuote(payload, '10', '20218643881304400668'), false);
});
test('operation status renders normalized ABS outcomes and exact business error text', () => {
 assert.deepEqual(proxyOperationStatus({status:'executed', abs_status:'BOOKED'}), {text:'Исполнено', color:'success'});
 assert.deepEqual(proxyOperationStatus({status:'accepted', abs_status:'NOT_BOOKED'}), {text:'Ожидание', color:'processing'});
 assert.deepEqual(proxyOperationStatus({status:'error', abs_status_text:'Недостаточно средств <ABS>'}), {text:'Ошибка: Недостаточно средств <ABS>', color:'error'});
 assert.deepEqual(proxyOperationStatus({status:'accepted', abs_status:'NOT_BOOKED', status_technical_error:'timeout'}), {text:'Ожидание', color:'processing'});
});
test('manual refresh replaces only the matching journal row', () => {
 const journal = {items:[{operation:{id:1}}, {operation:{id:2}}], total:2};
 const refreshed = {operation:{id:2,status:'executed'}, input:{amount:'10'}};
 const next = replaceProxyOperation(journal, refreshed);
 assert.equal(next.items[0], journal.items[0]);
 assert.equal(next.items[1], refreshed);
 assert.equal(next.total, 2);
});
