import { create } from "zustand";
import { moneyTransferService } from "../../api/product/moneyTransfer.service";
import {
  TransferTypeDict,
  DirectionTypeDict,
} from "../../domain/product/dictionaries";

export const useMoneyTransferStore = create((set) => ({
  transfers: [],
  loading: false,
  error: null,

  fetchTransfers: async () => {
    set({ loading: true, error: null });
    try {
      const res = await moneyTransferService.getAll(1, 100);
      console.log("📥 Raw API response:", res.data);

      const transfers = (res.data.data || []).map((t) => {
        const transferTypeList = [
          "Intrabank",
          "Interbank",
          "International",
          "P2P",
        ];
        const directionList = ["Incoming", "Outgoing"];
        const currencyList = ["TJS", "USD", "RUB"];

        const transferTypeNum = transferTypeList.indexOf(
          String(t.transferType).trim(),
        );
        const transferType =
          transferTypeNum >= 0 ? transferTypeNum : Number(t.transferType) || 0;

        const directionNum = directionList.indexOf(String(t.direction).trim());
        const direction =
          directionNum >= 0 ? directionNum : Number(t.direction) || 0;

        const currency = currencyList.indexOf(String(t.currency).trim());
        const currencyTo = currencyList.indexOf(String(t.currencyTo).trim());

        return {
          ...t,
          id: Number(t.id) || 0,
          bankId: Number(t.bankId) || 0,
          name: t.name || "",

          transferType,
          transferTypeLabel: TransferTypeDict[transferType] || t.transferType,

          direction,
          directionLabel: DirectionTypeDict[direction] || t.direction,

          currency: currency >= 0 ? currency : Number(t.currency) || 0,
          currencyTo: currencyTo >= 0 ? currencyTo : Number(t.currencyTo) || 0,

          feePercent: Number(t.feePercent) || 0,
          feeFixed: Number(t.feeFixed) || 0,
          minAmount: Number(t.minAmount) || 0,
          maxAmountPerTransaction: Number(t.maxAmountPerTransaction) || 0,
          maxAmountPerDay: Number(t.maxAmountPerDay) || 0,

          executionTime: t.executionTime || "",
          channels: t.channels || [],
          freeTransfersCount: Number(t.freeTransfersCount) || 0,

          isActive: Boolean(t.isActive),
          updateDate: t.updateDate || new Date().toISOString(),
        };
      });

      console.log("📥 Transformed transfers:", transfers);
      set({ transfers, error: null });
    } catch (error) {
      console.error("❌ Ошибка при получении переводов:", error);
      set({ error: "Не удалось загрузить переводы" });
    } finally {
      set({ loading: false });
    }
  },

  createTransfer: async (transfer) => {
    try {
      set({ loading: true, error: null });

      const payload = {
        ...transfer,
        transferType: Number(transfer.transferType),
        direction: Number(transfer.direction),
        currency: Number(transfer.currency),
        currencyTo: Number(transfer.currencyTo),
      };

      const res = await moneyTransferService.create(payload);

      set((state) => ({
        transfers: [
          ...state.transfers,
          {
            ...res.data,
            transferTypeLabel:
              TransferTypeDict[res.data.transferType] || res.data.transferType,
            directionLabel:
              DirectionTypeDict[res.data.direction] || res.data.direction,
          },
        ],
        error: null,
      }));
    } catch (error) {
      console.error("❌ Ошибка при создании перевода:", error);
      set({ error: "Не удалось создать перевод" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateTransfer: async (id, transfer) => {
    try {
      set({ loading: true, error: null });
      const { id: _id, ...rest } = transfer;

      const payload = {
        ...rest,
        transferType: Number(rest.transferType),
        direction: Number(rest.direction),
        currency: Number(rest.currency),
        currencyTo: Number(rest.currencyTo),
      };

      const res = await moneyTransferService.update(id, payload);

      set((state) => ({
        transfers: state.transfers.map((t) =>
          t.id === id
            ? {
                ...t,
                ...res.data,
                transferTypeLabel:
                  TransferTypeDict[res.data.transferType] ||
                  res.data.transferType,
                directionLabel:
                  DirectionTypeDict[res.data.direction] || res.data.direction,
              }
            : t,
        ),
        error: null,
      }));

      return res.data;
    } catch (error) {
      console.error("❌ Ошибка при обновлении перевода:", error);
      set({ error: "Не удалось обновить перевод" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteTransfer: async (id) => {
    try {
      set({ loading: true, error: null });
      await moneyTransferService.delete(id);

      set((state) => ({
        transfers: state.transfers.filter((t) => t.id !== id),
        error: null,
      }));
    } catch (error) {
      console.error("❌ Ошибка при удалении перевода:", error);
      set({ error: "Не удалось удалить перевод" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
