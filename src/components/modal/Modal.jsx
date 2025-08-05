import React from "react";
import { useModal } from "../../hooks/useModal";

export default function Modal() {
  const { modal, setModal } = useModal();
  if (!modal.open) return;
  return (
    <div className="modal" onClick={() => setModal({ open: false, url: null })}>
      <main>
        <img src={modal.url} alt="modal-img" />
      </main>
    </div>
  );
}
