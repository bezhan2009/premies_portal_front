import test from 'node:test';
import assert from 'node:assert/strict';
import { withClientProductRead } from './clientProductRead.js';
import * as clientProductRead from './clientProductRead.js';

test('read context preserves product identifiers and names the selected client', () => {
 assert.equal(withClientProductRead('/cards?CardId=102','5100.000001'), '/cards?CardId=102&clientIndex=5100.000001');
 assert.equal(withClientProductRead('http://example.test/card-data','6100.000729'), 'http://example.test/card-data?clientIndex=6100.000729');
 assert.equal(withClientProductRead('/credits/graphs?referenceId=61_1',''), '/credits/graphs?referenceId=61_1');
 assert.throws(()=>withClientProductRead('/cards','5100.000001&admin=true'));
});

test('phone lookup names the selected client explicitly', () => {
 assert.equal(typeof clientProductRead.buildSelectedClientPhoneURL, 'function');
 assert.equal(
  clientProductRead.buildSelectedClientPhoneURL('992805885555', '6100.000729'),
  'account/user/992805885555?clientIndex=6100.000729',
 );
 assert.throws(() => clientProductRead.buildSelectedClientPhoneURL('992805885555', ''));
});
