export function auditLogErrorMessage(error) {
    if (error?.response?.status === 401) {
        return 'Сессия завершена. Войдите в систему повторно.';
    }
    if (error?.response?.status === 403) {
        return 'Нет доступа к журналу действий. Требуется роль «Аудитор логов».';
    }
    return 'Не удалось загрузить журнал действий. Попробуйте обновить страницу журнала.';
}
