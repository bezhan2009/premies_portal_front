import test from 'node:test';
import assert from 'node:assert/strict';
import * as actions from './frontovikCardActions.js';

const card = (pc, abs) => ({ statusName: abs, details: { hotCardStatus: pc } });

test('card action visibility follows independent roles and approved states', () => {
  assert.equal(typeof actions.getCardActionCapabilities, 'function');
  const rows = [
    [card('0', 'Активирована'), [29], { canBlock: true, canActivate: false, canUnblock: false }],
    [card('24', 'Активирована'), [52], { canBlock: false, canActivate: false, canUnblock: true }],
    [card('0', 'Заблокирована'), [52], { canBlock: false, canActivate: false, canUnblock: true }],
    [card('24', 'Заблокирована'), [52], { canBlock: false, canActivate: false, canUnblock: true }],
    [card('17', 'Активирована'), [51], { canBlock: false, canActivate: true, canUnblock: false }],
    [card('17', 'Карта выпущена'), [51], { canBlock: false, canActivate: true, canUnblock: false }],
    [card('0', 'Карта выпущена'), [51], { canBlock: false, canActivate: true, canUnblock: false }],
  ];
  for (const [input, roles, want] of rows) {
    assert.deepEqual(actions.getCardActionCapabilities(input, roles), want);
  }
});

test('PC status 21 and missing roles hide every card action', () => {
  assert.deepEqual(
    actions.getCardActionCapabilities(card('21', 'Заблокирована'), [29, 51, 52]),
    { canBlock: false, canActivate: false, canUnblock: false },
  );
  assert.deepEqual(
    actions.getCardActionCapabilities(card('0', 'Активирована'), []),
    { canBlock: false, canActivate: false, canUnblock: false },
  );
});
