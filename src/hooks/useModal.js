import { create } from "zustand";

export const useModal = create((set) => ({
  modal: { open: false, url: null },

  setModal: (state) =>
    set({
      modal: state,
    }),
}));
