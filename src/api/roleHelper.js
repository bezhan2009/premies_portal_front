export const hasRole = (roleId) => {
    try {
        const userRoles = JSON.parse(localStorage.getItem('role_ids') || '[]');
        return userRoles.includes(roleId);
    } catch (error) {
        console.error('Ошибка при проверке ролей:', error);
        return false;
    }
};

// Роли для доступа к транзакциям (история карт)
export const ROLE_PROCESSING = 17;

// Роли для доступа к выпискам счетов
export const ROLE_ACCOUNT_OPERATIONS = 17;

// Роль Фронтовика
export const ROLE_FRONTOVIK = 17;

export const canAccessTransactions = () => hasRole(ROLE_PROCESSING);
export const canAccessAccountOperations = () => hasRole(ROLE_ACCOUNT_OPERATIONS);
export const isFrontovik = () => hasRole(ROLE_FRONTOVIK);
