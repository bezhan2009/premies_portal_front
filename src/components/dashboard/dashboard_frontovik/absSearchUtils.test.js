import test from "node:test";
import assert from "node:assert/strict";

import * as searchUtils from "./absSearchUtils.js";
const { resolveClientSearch } = searchUtils;

test("client code overrides a mistakenly selected name search", () => {
  assert.deepEqual(
    resolveClientSearch(" 5400.001610 ", "byName"),
    {
      searchValue: "5400.001610",
      searchType: "client/info/client-index?clientIndex=",
    },
  );
});

test('all PHP lookup modes use authorized gateway and normalize local phones', () => {
 assert.equal(typeof searchUtils.scopedClientLookupURL,'function');
 for(const [mode,value,query] of [
  ['client/info?phoneNumber=','+992 973794747','phone=973794747'],
  ['client/info?phoneNumber=','973794747','phone=973794747'],
  ['byCardId','100002572912','cardidn=100002572912'],
  ['byAccount','20216972185304544918','acc=20216972185304544918'],
  ['byLast4','0644','last4=0644'],
  ['byName','А & Б','longname=%D0%90%20%26%20%D0%91'],
 ]) assert.equal(searchUtils.scopedClientLookupURL('/client-access',mode,value),`/client-access/lookup?${query}`);
});

test("regular full name keeps the selected name search", () => {
  assert.deepEqual(
    resolveClientSearch(" Хошимов Хабибулло ", "byName"),
    {
      searchValue: "Хошимов Хабибулло",
      searchType: "byName",
    },
  );
});
