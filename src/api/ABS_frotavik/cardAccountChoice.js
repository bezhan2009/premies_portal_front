export const NEW_CARD_ACCOUNT = '__new__';

export function cardAccountChoicePayload(choice) {
  if (choice === NEW_CARD_ACCOUNT) return { create_new: true };
  if (typeof choice !== 'string' || !/^[0-9A-Z]{16,34}$/.test(choice)) {
    throw new Error('Выберите новый или существующий карточный счёт');
  }
  return { account_number: choice };
}

export const cardOpeningSteps = ['Клиент', 'Карты и счета', 'Выбор счёта', 'Подтверждение счёта', 'Заявление', 'Проверка'];
export function cardOpeningStepNumber(step) {
  if (step === 'load_client') return 0;
  if (step === 'load_accounts') return 1;
  if (step === 'select_account') return 2;
  if (['create_sca', 'sca_submitting', 'reload_accounts'].includes(step)) return 3;
  if (['register_card', 'register_submitting', 'account_mismatch'].includes(step)) return 4;
  if (['verify_application', 'verify_card'].includes(step)) return 5;
  return 6;
}
