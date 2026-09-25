import { withClientProductRead } from './clientProductRead.js';

const normalizedCardIds = (cardIds) => String(cardIds ?? '').replace(/,+$/, '');

export const buildCardHistoryPath = (cardIds, clientIndex = '') =>
  withClientProductRead(
    `/processing/transactions/${normalizedCardIds(cardIds)}`,
    String(clientIndex ?? '').trim(),
  );

export const buildCardHistoryRequestURL = (
  baseUrl,
  cardIds,
  fromDate = null,
  toDate = null,
  clientIndex = '',
) => {
  const url = new URL(`${String(baseUrl ?? '').replace(/\/+$/, '')}/api/processing-history/by-cards`);
  url.searchParams.set('cardIds', normalizedCardIds(cardIds));
  if (fromDate) url.searchParams.set('fromDate', fromDate);
  if (toDate) url.searchParams.set('toDate', toDate);
  return withClientProductRead(url.toString(), String(clientIndex ?? '').trim());
};
