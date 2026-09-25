// Filter changes can overlap: only the newest query may update the journal UI.
export function createAuditLogsLoader(client) {
    let latestRequest = 0;
    return async (params, { onStart, onSuccess, onError, onFinish }) => {
        const request = ++latestRequest;
        onStart();
        try {
            const response = await client.get('/audit/logs', { params });
            if (request === latestRequest) onSuccess(response.data);
        } catch (error) {
            if (request === latestRequest) onError(error);
        } finally {
            if (request === latestRequest) onFinish();
        }
    };
}
