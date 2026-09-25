import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

globalThis.localStorage = { getItem: () => 'current-session' };

const transactions = await import('./transactions.js');

test('every Frontovik card mutation carries the selected client context', async () => {
  const requests = [];
  const originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  };

  try {
    await transactions.changeCardStatus('102', '24', 'reason', '5100.000001');
    await transactions.unblockCard('102', 'reason', '5100.000001');
    await transactions.validateCard('102', '5100.000001');
    await transactions.changeCardStatusRest('102', '24', '5100.000001');
    await transactions.resetPinCounter('102', '5100.000001');
    await transactions.generatePin('102', '992805885555', '1234', '5100.000001');
    await transactions.sendPinOtp('102', '992805885555', '5100.000001');
    await transactions.checkPinOtp('102', '992805885555', '1111', '5100.000001');
    await transactions.manageCardService({ cardId: '102', action: 'enable' }, '5100.000001');
    await transactions.changeCardLimit({ cardId: '102', amount: 50 }, '5100.000001');
    await transactions.activateCardSoap('61_102', '102', '5100.000001');
	await transactions.executeFrontovikCardAction({ clientIndex: '5100.000001', cardId: '102', action: 'activate' });
  } finally {
    axios.defaults.adapter = originalAdapter;
  }

	assert.equal(requests.length, 12);
  for (const request of requests) {
    assert.match(request.url, /[?&]clientIndex=5100\.000001(?:&|$)/);
  }

  const otpBodies = requests.slice(6, 8).map((request) => JSON.parse(request.data));
  assert.deepEqual(otpBodies.map((body) => body.cardId), ['102', '102']);
	const actionRequest = requests.at(-1);
	assert.match(actionRequest.url, /\/api\/transactions\/card-action/);
	assert.deepEqual(JSON.parse(actionRequest.data), {
		cardId: '102', action: 'activate', reason: '', comment: ''
	});
});

test('selected client context rejects missing or injected client indexes', () => {
  assert.throws(() => transactions.withSelectedClient('/api/transactions/validate-card', ''));
  assert.throws(() => transactions.withSelectedClient('/api/transactions/validate-card', '5100.000001&admin=true'));
});
