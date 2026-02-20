import { create } from "zustand";
import { creditService } from "../../api/product/credit.service";

export const useCreditStore = create((set) => ({
  credits: [],
  loading: false,
  error: null,

  fetchCredits: async () => {
    set({ loading: true, error: null });
    try {
      const res = await creditService.getAll(1, 100);

      const credits = (res.data.data || []).map((credit) => {
        const currency = ["TJS", "USD", "RUB"].indexOf(credit.currency);
        const currencyNum =
          currency >= 0 ? currency : Number(credit.currency) || 0;

        const loanType = ["Mortgage", "CarLoan", "BusinessRefinancing"].indexOf(
          credit.loanType,
        );
        const loanTypeNum =
          loanType >= 0 ? loanType : Number(credit.loanType) || 0;

        return {
          ...credit,
          id: Number(credit.id) || 0,
          bankId: Number(credit.bankId) || 0,
          name: credit.name || "",
          loanType: loanTypeNum,
          currency: currencyNum,
          minAmount: Number(credit.minAmount) || 0,
          maxAmount: Number(credit.maxAmount) || 0,
          minTermInMonths: Number(credit.minTermInMonths) || 0,
          maxTermInMonths: Number(credit.maxTermInMonths) || 0,
          interestRateFrom: Number(credit.interestRateFrom) || 0,
          interestRateTo: Number(credit.interestRateTo) || 0,
          effectiveRateFrom: Number(credit.effectiveRateFrom) || 0,
          effectiveRateTo: Number(credit.effectiveRateTo) || 0,
          gracePeriodMonths: Number(credit.gracePeriodMonths) || 0,
          collateralRequired: Boolean(credit.collateralRequired),
          insuranceRequired: Boolean(credit.insuranceRequired),
          earlyRepaymentFee: Number(credit.earlyRepaymentFee) || 0,
          applicationProcessingTime: credit.applicationProcessingTime || "",
          ageMin: Number(credit.ageMin) || 0,
          ageMax: Number(credit.ageMax) || 0,
          incomeRequirement: Number(credit.incomeRequirement) || 0,
          documentsRequired: credit.documentsRequired || [],
          onlineApplication: Boolean(credit.onlineApplication),
          updateDate: credit.updateDate || new Date().toISOString(),
          isActive: Boolean(credit.isActive),
          extras: credit.extras || {},
        };
      });

      console.log("📥 Transformed credits:", credits);
      set({ credits, error: null });
    } catch (error) {
      console.error("❌ Ошибка при получении кредитов:", error);
      set({ error: "Не удалось загрузить кредиты" });
    } finally {
      set({ loading: false });
    }
  },

  createCredit: async (credit) => {
    try {
      set({ loading: true, error: null });
      const res = await creditService.create(credit);
      set((state) => ({
        credits: [...state.credits, res.data],
        error: null,
      }));
    } catch (error) {
      console.error("❌ Ошибка при создании кредита:", error);
      set({ error: "Не удалось создать кредит" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateCredit: async (id, credit) => {
    try {
      set({ loading: true, error: null });
      const { id: _id, ...rest } = credit;

      const payload = {
        ...rest,
        loanType: Number(rest.loanType),
        currency: Number(rest.currency),
      };

      const res = await creditService.update(id, payload);
      set((state) => ({
        credits: state.credits.map((c) =>
          c.id === id ? { ...c, ...res.data } : c,
        ),
        error: null,
      }));

      return res.data;
    } catch (error) {
      console.error("❌ Ошибка при обновлении кредита:", error);
      set({ error: "Не удалось обновить кредит" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteCredit: async (id) => {
    try {
      set({ loading: true, error: null });
      await creditService.delete(id);
      set((state) => ({
        credits: state.credits.filter((c) => c.id !== id),
        error: null,
      }));
    } catch (error) {
      console.error("❌ Ошибка при удалении кредита:", error);
      set({ error: "Не удалось удалить кредит" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
