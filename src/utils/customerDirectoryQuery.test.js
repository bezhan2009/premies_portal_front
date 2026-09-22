import {test} from 'node:test';import assert from 'node:assert/strict';
import {customerDirectoryQuery} from './customerDirectoryQuery.js';
test('same selection drives table, totals and all-row export',()=>{
 const f={search:'A&B',departments:['5100','5200'],creator:'TEST',mobile_bank:'false',complianceScore:'2',sortBy:'created_at',sortOrder:'desc',resident:''};
 const report=customerDirectoryQuery(f),table=customerDirectoryQuery(f,3);
 assert.equal(table.get('page'),'3');assert.equal(report.has('page'),false);
 for(const [key,value]of report)assert.equal(table.get(key),value);
 assert.equal(report.get('mobile_bank'),'false');assert.equal(report.get('creator'),'TEST');assert.equal(report.get('departments'),'5100,5200');assert.equal(report.has('resident'),false);assert.equal(report.get('compliance_score'),'2');
});
