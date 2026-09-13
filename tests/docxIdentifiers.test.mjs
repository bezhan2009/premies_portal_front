import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDocxValueByKey, buildDocxPayload } from '../src/utils/docxTemplateHelpers.js';

test('client codes retain every digit in generated statement mappings', () => {
  const values = ['5100.052140', '0010.000123'];
  for (const value of values) {
    assert.equal(formatDocxValueByKey('client.clientCode', value), value);
    const payload = buildDocxPayload({ keys: [{ docxKey: 'clientCode', systemKey: 'client.clientCode' }] }, { 'client.clientCode': value });
    assert.equal(payload.clientCode, value);
  }
});

test('identifier formatting preserves bank details and existing monetary rounding', () => {
  assert.equal(formatDocxValueByKey('client.inn', '001234567'), '001234567');
  assert.equal(formatDocxValueByKey('accountNumber', '20216972481304438618'), '20216972481304438618');
  assert.equal(formatDocxValueByKey('amount', '123.4567'), '123.46');
});
