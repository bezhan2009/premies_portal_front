import { create } from "zustand";
import { depositService } from "../../api/product/deposit.service";

export const useDepositStore = create((set) => ({
  deposits: [],
  loading: false,
  error: null,

  fetchDeposits: async () => {
    set({ loading: true, error: null });
    try {
      const res = await depositService.getAll(1, 100);

      const deposits = (res.data.data || []).map((deposit) => {
        const currencyList = ["TJS", "USD", "RUB"];
        const depositTypeList = [
          "Urgent",
          "AdditionalСlaims",
          "Cumulative",
          "Savings",
        ];
        const capitalizationList = ["monthly", "quarterly"];

        const currency =
          currencyList.indexOf(deposit.currency) >= 0
            ? currencyList.indexOf(deposit.currency)
            : Number(deposit.currency) || 0;

        const depositType =
          depositTypeList.indexOf(deposit.depositType) >= 0
            ? depositTypeList.indexOf(deposit.depositType)
            : Number(deposit.depositType) || 0;

        const capitalization =
          capitalizationList.indexOf(deposit.capitalization) >= 0
            ? capitalizationList.indexOf(deposit.capitalization)
            : Number(deposit.capitalization) || 0;

        return {
          ...deposit,
          id: Number(deposit.id) || 0,
          bankId: Number(deposit.bankId) || 0,
          name: deposit.name || "",
          depositType,
          currency,
          minAmount: Number(deposit.minAmount) || 0,
          maxAmount: Number(deposit.maxAmount) || 0,
          termInMonths: Number(deposit.termInMonths) || 0,
          interestRate: Number(deposit.interestRate) || 0,
          interestRateVariable: Boolean(deposit.interestRateVariable),
          capitalization,
          replenishmentAllowed: Boolean(deposit.replenishmentAllowed),
          partialWithdrawalAllowed: Boolean(deposit.partialWithdrawalAllowed),
          autoProlongation: Boolean(deposit.autoProlongation),
          earlyWithdrawalPenalty: Number(deposit.earlyWithdrawalPenalty) || 0,
          insurance: Boolean(deposit.insurance),
          onlineOpening: Boolean(deposit.onlineOpening),
          isActive: Boolean(deposit.isActive),
          updateDate: deposit.updateDate || new Date().toISOString(),
        };
      });

      set({ deposits, error: null });
    } catch (error) {
      console.error("❌ Ошибка при получении депозитов:", error);
      set({ error: "Не удалось загрузить депозиты" });
    } finally {
      set({ loading: false });
    }
  },

  createDeposit: async (deposit) => {
    try {
      set({ loading: true, error: null });

      const payload = {
        ...deposit,
        depositType: Number(deposit.depositType),
        currency: Number(deposit.currency),
        capitalization: Number(deposit.capitalization),
      };

      const res = await depositService.create(payload);

      set((state) => ({
        deposits: [...state.deposits, res.data],
        error: null,
      }));
    } catch (error) {
      console.error("❌ Ошибка при создании депозита:", error);
      set({ error: "Не удалось создать депозит" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateDeposit: async (id, deposit) => {
    try {
      set({ loading: true, error: null });

      const { id: _id, ...rest } = deposit;

      const payload = {
        ...rest,
        depositType: Number(rest.depositType),
        currency: Number(rest.currency),
        capitalization: Number(rest.capitalization),
      };

      const res = await depositService.update(id, payload);

      set((state) => ({
        deposits: state.deposits.map((d) =>
          d.id === id ? { ...d, ...res.data } : d,
        ),
        error: null,
      }));

      return res.data;
    } catch (error) {
      console.error("❌ Ошибка при обновлении депозита:", error);
      set({ error: "Не удалось обновить депозит" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteDeposit: async (id) => {
    try {
      set({ loading: true, error: null });

      await depositService.delete(id);

      set((state) => ({
        deposits: state.deposits.filter((d) => d.id !== id),
        error: null,
      }));
    } catch (error) {
      console.error("❌ Ошибка при удалении депозита:", error);
      set({ error: "Не удалось удалить депозит" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
