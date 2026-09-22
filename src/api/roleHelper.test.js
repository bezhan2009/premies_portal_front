import test from 'node:test';
import assert from 'node:assert/strict';
import { canOpenCard, isFrontovik } from './roleHelper.js';
test('opening cards has a separate role and no implied grants', () => {
 const before = globalThis.localStorage;
 try {
  for (const [roles, card, client] of [[[17],false,true],[[44],true,false],[[17,44],true,true],[[6,10],false,false],[[],false,false]]) {
   globalThis.localStorage={getItem:()=>JSON.stringify(roles)};
   assert.equal(canOpenCard(),card);assert.equal(isFrontovik(),client);
  }
 } finally { globalThis.localStorage=before; }
});
