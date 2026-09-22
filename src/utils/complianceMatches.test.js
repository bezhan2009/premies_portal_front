import test from 'node:test';
import assert from 'node:assert/strict';
import { complianceMatches, complianceMatchFields } from './complianceRequests.js';

test('all sources retained and sorted without mutating input',()=>{
 const input=[{source:'NBT_LIST',similarity:0.4,data:{name:'TEST'}},{source:'DROPPERS_LIST',similarity:1,data:{full_name:'TEST'}}];
 assert.equal(complianceMatches(input)[0].source,'DROPPERS_LIST'); assert.equal(input[0].source,'NBT_LIST'); assert.equal(complianceMatches(JSON.stringify(input)).length,2);
});
test('invalid and null payloads are safe',()=>{for(const value of [null,undefined,'broken','null',42])assert.deepEqual(complianceMatches(value),[]);});
test('all requested dropper fields available',()=>{
 const data={org_name:'TEST BANK',bank_account:'111;222',full_name:'TEST',document_info:'A123',birth_date:'1998-02-04',phone:'900000001',residency_status:'Resident',relation_type:'Dropper',account_status:'Blocked',other_info:''};
 const fields=complianceMatchFields({data});assert.equal(fields.length,10);assert.ok(fields.some(([name,value])=>name==='Счета / карты'&&value==='111;222'));assert.equal(fields.at(-1)[1],'—');
});
