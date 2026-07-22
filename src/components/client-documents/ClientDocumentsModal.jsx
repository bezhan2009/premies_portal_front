import React from "react";
import Modal from "../general/Modal.jsx";
import ClientDocumentsTable from "./ClientDocumentsTable.jsx";

export default function ClientDocumentsModal({
  isOpen,
  onClose,
  documents = [],
  onPreview,
  title = "Документы клиента",
  subtitle = "",
  isLoading = false,
  tableId = "client-documents-modal",
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="client-documents-modal">
        {subtitle && (
          <div className="client-documents-modal__subtitle">{subtitle}</div>
        )}

        {isLoading ? (
          <div className="client-documents-modal__empty">
            Загрузка документов...
          </div>
        ) : documents.length === 0 ? (
          <div className="client-documents-modal__empty">
            Документы клиента не найдены
          </div>
        ) : (
          <ClientDocumentsTable
            documents={documents}
            onPreview={onPreview}
            tableId={tableId}
            scrollY={360}
          />
        )}
      </div>
    </Modal>
  );
}
