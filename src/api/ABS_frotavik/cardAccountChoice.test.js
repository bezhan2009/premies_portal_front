import test from 'node:test';
import assert from 'node:assert/strict';
import { NEW_CARD_ACCOUNT, cardAccountChoicePayload, cardOpeningSteps, cardOpeningStepNumber } from './cardAccountChoice.js';

test('new account intent never sends an existing account number', () => {
  assert.deepEqual(cardAccountChoicePayload(NEW_CARD_ACCOUNT), { create_new: true });
});
test('existing account choice remains explicit', () => {
  assert.deepEqual(cardAccountChoicePayload('20216972881304477649'), { account_number: '20216972881304477649' });
});
for (const choice of ['', null, undefined, {}, 'new', ' account ']) {
  test(`invalid account choice is not sent: ${String(choice)}`, () => assert.throws(() => cardAccountChoicePayload(choice)));
}
test('choice and creation verification have separate progress stages', () => {
  assert.equal(cardOpeningSteps[cardOpeningStepNumber('select_account')], 'Выбор счёта');
  for (const step of ['create_sca', 'sca_submitting', 'reload_accounts']) {
    assert.equal(cardOpeningSteps[cardOpeningStepNumber(step)], 'Подтверждение счёта');
    assert.ok(cardOpeningStepNumber(step) < cardOpeningStepNumber('register_card'));
  }
  assert.equal(cardOpeningStepNumber('verify_card'), 5);
});
