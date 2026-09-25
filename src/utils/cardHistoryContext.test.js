import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCardHistoryPath, buildCardHistoryRequestURL } from './cardHistoryContext.js';

test('card history keeps the authorized client context for cross-office cards', () => {
  assert.equal(
    buildCardHistoryPath('100002572912', '5100.045870'),
    '/processing/transactions/100002572912?clientIndex=5100.045870',
  );
  assert.equal(
    buildCardHistoryRequestURL('http://daily.test', '100002572912,', '2026-08-24', '2026-09-23', '5100.045870'),
    'http://daily.test/api/processing-history/by-cards?cardIds=100002572912&fromDate=2026-08-24&toDate=2026-09-23&clientIndex=5100.045870',
  );
});

test('card history rejects an injected client context', () => {
  assert.throws(() => buildCardHistoryPath('100002572912', '5100.045870&admin=true'));
});
