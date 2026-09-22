import test from 'node:test';
import assert from 'node:assert/strict';
import { canOpenCard, isFrontovik } from './roleHelper.js';
test('opening cards has a separate role and no implied grants', () => {
 const before = globalThis.localStorage;
 try {
  for (const [roles, card, client] of [[[17],false,true],[[50],true,false],[[17,50],true,true],[[44],false,false],[[6,10],false,false],[[],false,false]]) {
   globalThis.localStorage={getItem:()=>JSON.stringify(roles)};
   assert.equal(canOpenCard(),card);assert.equal(isFrontovik(),client);
  }
 } finally { globalThis.localStorage=before; }
});
