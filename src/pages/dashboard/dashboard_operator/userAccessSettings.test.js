import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUserAccessPayload, selectApproverDepartment, readUserManagementResponse, saveUserPermissions } from './userAccessSettings.js';

test('empty access does not erase selected approver departments', () => {
 assert.deepEqual(buildUserAccessPayload([], ['5100'], true, ' EMP '), {department_codes:[],approver_departments:['5100'],creator_username:'EMP'});
 assert.throws(() => buildUserAccessPayload(['5000'], ['5100','5000'], true, ''), /подразделени/i);
 assert.throws(() => buildUserAccessPayload(['5000'], ['5100'], true, ''), /подразделени/i);
 assert.deepEqual(buildUserAccessPayload(['5000'], [], true, ''), {department_codes:['5000'],approver_departments:[],creator_username:''});
 assert.deepEqual(buildUserAccessPayload([], ['5100'], false, '').approver_departments, []);
});
test('granting approval saves scope first; revoking approval saves role first', async () => {
 for (const canApprove of [true,false]) {
  const calls=[];
  await saveUserPermissions(canApprove, async()=>calls.push('roles'),async()=>calls.push('access'));
  assert.deepEqual(calls,canApprove?['access','roles']:['roles','access']);
  const failed=[];
  const first=canApprove?'access':'roles';
  const call=async name=>{failed.push(name);if(name===first) throw new Error('network failure');};
  await assert.rejects(saveUserPermissions(canApprove,()=>call('roles'),()=>call('access')),/network failure/);
  assert.deepEqual(failed,[first]);
 }
});
test('selecting an approver never narrows unrestricted client access', () => {
 assert.deepEqual(selectApproverDepartment([], '5100'), []);
 assert.deepEqual(selectApproverDepartment(['5000'], '5100'), ['5000','5100']);
});
test('empty forbidden response shows meaningful error, not JSON syntax error', async () => {
 await assert.rejects(readUserManagementResponse(new Response(null,{status:403}), 'Не удалось сохранить доступ'), /Не удалось сохранить доступ.*403/);
 await assert.rejects(readUserManagementResponse(new Response('<html>error</html>',{status:502}), 'Не удалось сохранить доступ'), /502/);
 await assert.rejects(readUserManagementResponse(new Response(JSON.stringify({error:'Войдите заново'}),{status:401}), 'Ошибка'), /Войдите заново/);
 assert.deepEqual(await readUserManagementResponse(new Response(JSON.stringify({department_codes:[]})), 'Ошибка'), {department_codes:[]});
});

test('valid JSON null from users without office restrictions is not malformed JSON', async () => {
 assert.equal(await readUserManagementResponse(new Response('null'), 'Офисы'), null);
 await assert.rejects(readUserManagementResponse(new Response('<html>proxy</html>'), 'Офисы'), /некорректный ответ/);
});
