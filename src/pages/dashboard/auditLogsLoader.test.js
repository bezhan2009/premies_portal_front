import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuditLogsLoader } from './auditLogsLoader.js';

function setup() {
    const pending = [];
    const state = { loading: false, data: null, error: null, finishes: 0 };
    const client = { get(path, { params }) {
        assert.equal(path, '/audit/logs');
        return new Promise((resolve, reject) => pending.push({ params, resolve, reject }));
    } };
    const load = createAuditLogsLoader(client);
    const callbacks = {
        onStart() { state.loading = true; state.error = null; },
        onSuccess(data) { state.data = data; },
        onError(error) { state.data = null; state.error = error.message; },
        onFinish() { state.loading = false; state.finishes++; },
    };
    return { pending, state, request: params => load(params, callbacks) };
}

test('stale audit failure cannot erase the newer successful result', async () => {
    const { pending, state, request } = setup();
    const first = request({ username: 'a' });
    const second = request({ username: 'ab' });
    const newest = { logs: [{ username: 'ab' }], total: 1 };
    pending[1].resolve({ data: newest });
    await second;
    pending[0].reject(new Error('stale failure'));
    await first;
    assert.deepEqual(state, { loading: false, data: newest, error: null, finishes: 1 });
});

test('stale audit success cannot stop loading or replace a newer request', async () => {
    const { pending, state, request } = setup();
    const first = request({ from: 0 });
    const second = request({ from: 20 });
    pending[0].resolve({ data: { logs: ['old page'] } });
    await first;
    assert.deepEqual(state, { loading: true, data: null, error: null, finishes: 0 });
    pending[1].resolve({ data: { logs: ['new page'] } });
    await second;
    assert.deepEqual(state.data, { logs: ['new page'] });
    assert.equal(state.loading, false);
});

test('current audit failure is reported and a successful retry replaces it', async () => {
    const { pending, state, request } = setup();
    const first = request({ size: 20 });
    pending[0].reject(new Error('forbidden'));
    await first;
    assert.equal(state.error, 'forbidden');
    assert.equal(state.loading, false);
    const retry = request({ size: 20 });
    assert.equal(state.error, null);
    pending[1].resolve({ data: { logs: [], total: 0 } });
    await retry;
    assert.deepEqual(state, { loading: false, data: { logs: [], total: 0 }, error: null, finishes: 2 });
});
