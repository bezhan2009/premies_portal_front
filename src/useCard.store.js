import {create} from "zustand";
import { cardService } from "../services/card.service";
export const useCardStore = create((set) => ({
  cards: [],
  loading: false,
  error: null,

  fetchCards: async () => {
    set({ loading: true, error: null });
    try {
      const res = await cardService.getAll(1, 100);
      const cards = (res.data.data || []).map((card) => {
        let cardType = 0;
        switch(card.cardType) {
          case "Debit": case "Дебетовая": cardType = 0; break;
          case "Сredit": case "Кредитная": cardType = 1; break;
          case "Prepaid": case "Предоплаченная": cardType = 2; break;
          case "Virtual": case "Виртуальная": cardType = 3; break;
          case "CoBadging": case "Ко-брендинговая": cardType = 4; break;
          default: cardType = Number(card.cardType) || 0;
        }

        let currency = 0;
        switch(card.currency) {
          case "TJS": currency = 0; break;
          case "USD": currency = 1; break;
          case "EUR": currency = 2; break;
          case "MULTI": currency = 3; break;
          default: currency = Number(card.currency) || 0;
        }

        return {
          ...card,
          id: Number(card.id) || 0,
          bankId: Number(card.bankId) || 0,
          name: card.name || '',
          cardType,
          paymentSystem: card.paymentSystem || '',
          currency,
          // currency: card.currency || "",
          issuanceFee: Number(card.issuanceFee) || 0,
          annualFee: Number(card.annualFee) || 0,
          cashbackCategories: card.cashbackCategories || '',
          interestOnBalance: Number(card.interestOnBalance) || 0,
          creditLimitMin: Number(card.creditLimitMin) || 0,
          creditLimitMax: Number(card.creditLimitMax) || 0,
          gracePeriodDays: Number(card.gracePeriodDays) || 0,
          withdrawalFeeOwnAtm: Number(card.withdrawalFeeOwnAtm) || 0,
          withdrawalFeeOtherAtm: Number(card.withdrawalFeeOtherAtm) || 0,
          withdrawalFeeInterAtm: Number(card.withdrawalFeeInterAtm) || 0,
          transferFee: Number(card.transferFee) || 0,
          smsInformingFee: Number(card.smsInformingFee) || 0,
          onlineApplication: Boolean(card.onlineApplication),
          deliveryAvailable: Boolean(card.deliveryAvailable),
          customizableLimits: Boolean(card.customizableLimits),
          dailyCashWithdrawalOwnAtmLimit: Number(card.dailyCashWithdrawalOwnAtmLimit) || 0,
          dailyCashWithdrawalDomesticOtherAtmLimit: Number(card.dailyCashWithdrawalDomesticOtherAtmLimit) || 0,
          dailyCashWithdrawalAbroadAtmLimit: Number(card.dailyCashWithdrawalAbroadAtmLimit) || 0,
          monthlyCashWithdrawalOwnAtmLimit: Number(card.monthlyCashWithdrawalOwnAtmLimit) || 0,
          monthlyCashWithdrawalDomesticOtherAtmLimit: Number(card.monthlyCashWithdrawalDomesticOtherAtmLimit) || 0,
          monthlyCashWithdrawalAbroadAtmLimit: Number(card.monthlyCashWithdrawalAbroadAtmLimit) || 0,
          dailyPosPurchaseDomesticLimit: Number(card.dailyPosPurchaseDomesticLimit) || 0,
          dailyPosPurchaseAbroadLimit: Number(card.dailyPosPurchaseAbroadLimit) || 0,
          monthlyPosPurchaseDomesticLimit: Number(card.monthlyPosPurchaseDomesticLimit) || 0,
          monthlyPosPurchaseAbroadLimit: Number(card.monthlyPosPurchaseAbroadLimit) || 0,
          dailyOnlinePurchaseLimit: Number(card.dailyOnlinePurchaseLimit) || 0,
          monthlyOnlinePurchaseLimit: Number(card.monthlyOnlinePurchaseLimit) || 0,
          dailyTotalSpendingLimit: Number(card.dailyTotalSpendingLimit) || 0,
          monthlyTotalSpendingLimit: Number(card.monthlyTotalSpendingLimit) || 0,
          isActive: Boolean(card.isActive),
          updateDate: card.updateDate || new Date().toISOString(),
        };
      });
      set({ cards, error: null });
    } catch (err) {
      console.error("Ошибка при получении карт:", err);
      set({ error: "Не удалось загрузить карты" });
    } finally {
      set({ loading: false });
    }
  },

  createCard: async (card) => {
    try {
      set({ loading: true, error: null });
      const res = await cardService.create(card);
      set((state) => ({ cards: [...state.cards, res.data], error: null }));
    } catch (err) {
      console.error("Ошибка при создании карты:", err);
      set({ error: "Не удалось создать карту" });
      throw err;
    } finally { set({ loading: false }); }
  },

  updateCard: async (id, card) => {
    try {
      set({ loading: true, error: null });
      const { id: _id, ...rest } = card;
      const payload = { ...rest, cardType: Number(rest.cardType),  currency: rest.currency };
      const res = await cardService.update(id, payload);
      set((state) => ({
        cards: state.cards.map((c) => (c.id === id ? { ...c, ...res.data } : c)),
        error: null
      }));
      return res.data;
    } catch (err) {
      console.error("Ошибка при обновлении карты:", err);
      set({ error: "Не удалось обновить карту" });
      throw err;
    } finally { set({ loading: false }); }
  },

  deleteCard: async (id) => {
    try {
      set({ loading: true, error: null });
      await cardService.delete(id);
      set((state) => ({ cards: state.cards.filter(c => c.id !== id), error: null }));
    } catch (err) {
      console.error("Ошибка при удалении карты:", err);
      set({ error: "Не удалось удалить карту" });
      throw err;
    } finally { set({ loading: false }); }
  }
}));
