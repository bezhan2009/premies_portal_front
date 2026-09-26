import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyRegistryDownloadURL } from './proxyPayRegistry.js';

test('registry URL preserves active filters and omits empty values',()=>{
 const url=proxyRegistryDownloadURL('/proxy-pay',{
  direction:'visa',
  search:'505827 ****',
  from:'2026-09-01T00:00:00',
  to:'2026-09-02T23:59:59',
  payment_status:undefined,
  utrnno:'',
 });
 assert.equal(url,'/proxy-pay/reports/registry.xlsx?direction=visa&search=505827+****&from=2026-09-01T00%3A00%3A00&to=2026-09-02T23%3A59%3A59');
});

test('registry URL does not append an empty query string',()=>{
 assert.equal(proxyRegistryDownloadURL('/proxy-pay',{}),'/proxy-pay/reports/registry.xlsx');
});
