import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhoneSearchValue,preservePhoneSearchInput} from './absSearchUtils.js';
test('phone service receives nine local digits',()=>{
 for(const value of ['885036600','992885036600','+992 (88) 503-66-00']) assert.equal(normalizePhoneSearchValue(value),'885036600');
});
test('local phone stays in phone mode throughout typing',()=>{
 const phone='885036600'; for(let length=1;length<=phone.length;length++) assert.equal(preservePhoneSearchInput(phone.slice(0,length),'client/info?phoneNumber='),true);
 assert.equal(preservePhoneSearchInput('885036600','client/info/inn?inn='),false);
 assert.equal(preservePhoneSearchInput('5000.153975','client/info?phoneNumber='),false);
});
