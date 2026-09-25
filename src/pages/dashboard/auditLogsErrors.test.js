import test from 'node:test';
import assert from 'node:assert/strict';
import { auditLogErrorMessage } from './auditLogsErrors.js';

test('audit journal explains missing auditor permission instead of an empty result', () => {
    assert.equal(auditLogErrorMessage({ response: { status: 403 } }),
        'Нет доступа к журналу действий. Требуется роль «Аудитор логов».');
});

test('audit journal explains an expired session', () => {
    assert.equal(auditLogErrorMessage({ response: { status: 401 } }),
        'Сессия завершена. Войдите в систему повторно.');
});

test('audit journal reports network and server failures without exposing raw responses', () => {
    for (const error of [undefined, new Error('network'), { response: { status: 500, data: '<html>internal failure</html>' } }]) {
        assert.equal(auditLogErrorMessage(error),
            'Не удалось загрузить журнал действий. Попробуйте обновить страницу журнала.');
    }
});
