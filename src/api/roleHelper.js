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
export const ROLE_PROCESSING = 18;

// Роли для доступа к выпискам счетов
export const ROLE_ACCOUNT_OPERATIONS = 20;

// Роль Фронтовика
export const ROLE_FRONTOVIK = 17;
export const ROLE_CLIENT_DOCUMENTS = 27;

export const ROLE_BLOCK_CARD = 29;
export const ROLE_CHANGE_PIN = 30;
export const ROLE_OPEN_CARD = 50;
export const ROLE_ACTIVATE_CARD = 51;
export const ROLE_UNBLOCK_CARD = 52;

export const canAccessTransactions = () => hasRole(ROLE_PROCESSING);
export const canAccessAccountOperations = () => hasRole(ROLE_ACCOUNT_OPERATIONS);
export const isFrontovik = () => hasRole(ROLE_FRONTOVIK);
export const canAccessClientDocuments = () => hasRole(ROLE_CLIENT_DOCUMENTS);
export const canBlockCard = () => hasRole(ROLE_BLOCK_CARD);
export const canChangePin = () => hasRole(ROLE_CHANGE_PIN);
export const canOpenCard = () => hasRole(ROLE_OPEN_CARD);
export const canActivateCard = () => hasRole(ROLE_ACTIVATE_CARD);
export const canUnblockCard = () => hasRole(ROLE_UNBLOCK_CARD);
