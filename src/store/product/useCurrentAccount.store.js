import { create } from "zustand";
import { currentAccountService } from "../../api/product/currentAccount.service";

export const useAccountStore = create((set) => ({
  accounts: [],
  loading: false,
  error: null,

  fetchAccounts: async () => {
    set({ loading: true, error: null });

    try {
      const res = await currentAccountService.getAll(1, 100);
      console.log("📥 Raw API response:", res.data);

      const accounts = (res.data.data || []).map((account) => {
        let accountType = 0;

        if (account.accountType) {
          switch (account.accountType) {
            case "Current":
            case "Текущий счет":
              accountType = 0;
              break;
            case "Salary":
            case "Зарплатный":
              accountType = 1;
              break;
            case "Savings":
            case "Сберегательный":
              accountType = 2;
              break;
            case "Corporate":
            case "Корпоративный":
              accountType = 3;
              break;
            default:
              const num = Number(account.accountType);
              accountType = isNaN(num) ? 0 : num;
          }
        }

        let currency = 0;

        if (account.currency) {
          switch (account.currency) {
            case "TJS":
              currency = 0;
              break;
            case "USD":
              currency = 1;
              break;
            case "RUB":
              currency = 2;
              break;
            default:
              const num = Number(account.currency);
              currency = isNaN(num) ? 0 : num;
          }
        }

        return {
          ...account,
          id: Number(account.id) || 0,
          bankId: Number(account.bankId) || 0,
          accountType,
          currency,
          openingFee: Number(account.openingFee) || 0,
          monthlyFee: Number(account.monthlyFee) || 0,
          interestOnBalance: Number(account.interestOnBalance) || 0,
          overdraftAllowed: Boolean(account.overdraftAllowed),
          overdraftRate: Number(account.overdraftRate) || 0,
          freeTransfersCount: Number(account.freeTransfersCount) || 0,
          onlineOpening: Boolean(account.onlineOpening),
          isActive: Boolean(account.isActive),
          updateDate: account.updateDate || new Date().toISOString(),
        };
      });

      console.log("📥 Transformed accounts:", accounts);

      set({ accounts, error: null });
    } catch (error) {
      console.error("❌ Ошибка при получении счетов:", error);
      set({ error: "Не удалось загрузить счета" });
    } finally {
      set({ loading: false });
    }
  },

  createAccount: async (account) => {
    try {
      set({ loading: true, error: null });

      const payload = {
        ...account,
        name: account.name?.trim() || "Новый счет",
        accountType: Number(account.accountType) || 0,
        currency: Number(account.currency) || 0,
        bankId: Number(account.bankId) || 0,
        openingFee: Number(account.openingFee) || 0,
        monthlyFee: Number(account.monthlyFee) || 0,
        interestOnBalance: Number(account.interestOnBalance) || 0,
        overdraftAllowed: Boolean(account.overdraftAllowed),
        overdraftRate: Number(account.overdraftRate) || 0,
        freeTransfersCount: Number(account.freeTransfersCount) || 0,
        onlineOpening: Boolean(account.onlineOpening),
        isActive: Boolean(account.isActive),
        updateDate: account.updateDate || new Date().toISOString(),
      };

      console.log("📤 POST payload:", payload);

      const res = await currentAccountService.create(payload);

      set((state) => ({
        accounts: [...state.accounts, res.data],
        error: null,
      }));
    } catch (error) {
      console.error(
        "❌ Ошибка при создании счета:",
        error.response?.data || error,
      );
      set({ error: "Не удалось создать счет" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateAccount: async (id, account) => {
    try {
      set({ loading: true, error: null });

      const payload = {
        ...account,
        accountType: Number(account.accountType) || 0,
        currency: Number(account.currency) || 0,
        bankId: Number(account.bankId) || 0,
        openingFee: Number(account.openingFee) || 0,
        monthlyFee: Number(account.monthlyFee) || 0,
        interestOnBalance: Number(account.interestOnBalance) || 0,
        overdraftAllowed: Boolean(account.overdraftAllowed),
        overdraftRate: Number(account.overdraftRate) || 0,
        freeTransfersCount: Number(account.freeTransfersCount) || 0,
        onlineOpening: Boolean(account.onlineOpening),
        isActive: Boolean(account.isActive),
        updateDate: account.updateDate || new Date().toISOString(),
      };

      console.log("📤 PUT payload:", payload);

      const res = await currentAccountService.update(id, payload);

      set((state) => ({
        accounts: state.accounts.map((a) =>
          a.id === id ? { ...a, ...res.data } : a,
        ),
        error: null,
      }));

      return res.data;
    } catch (error) {
      console.error(
        "❌ Ошибка при обновлении счета:",
        error.response?.data || error,
      );
      set({ error: "Не удалось обновить счет" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteAccount: async (id) => {
    try {
      set({ loading: true, error: null });
      await currentAccountService.delete(id);

      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        error: null,
      }));
    } catch (error) {
      console.error("Ошибка при удалении счета:", error);
      set({ error: "Не удалось удалить счет" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
