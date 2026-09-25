export const getCardActionCapabilities = (card, roleIds = []) => {
  const pc = String(card?.details?.hotCardStatus ?? card?.hotCardStatus ?? '').trim();
  const abs = String(card?.statusName ?? card?.status ?? '').trim().toLowerCase();
  const denied = { canBlock: false, canActivate: false, canUnblock: false };
  if (pc === '21') return denied;

  const activationState =
    (pc === '17' && (abs === 'активирована' || abs === 'карта выпущена')) ||
    (pc === '0' && abs === 'карта выпущена');
  const unblockState =
    (pc === '0' && abs === 'заблокирована') ||
    (pc !== '0' && pc !== '17' && abs !== 'заблокирована') ||
    (pc !== '0' && pc !== '17' && abs === 'заблокирована');

  return {
    canBlock: roleIds.includes(29) && pc === '0' && abs === 'активирована',
    canActivate: roleIds.includes(51) && activationState,
    canUnblock: roleIds.includes(52) && unblockState,
  };
};
