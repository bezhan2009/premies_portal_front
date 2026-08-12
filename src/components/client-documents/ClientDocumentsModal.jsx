import React from "react";
import Modal from "../general/Modal.jsx";
import ClientDocumentsTable from "./ClientDocumentsTable.jsx";
import { Plus } from "lucide-react";

export default function ClientDocumentsModal({
  isOpen,
  onClose,
  documents = [],
  onPreview,
  title = "Документы клиента",
  subtitle = "",
  isLoading = false,
  tableId = "client-documents-modal",
  onAddDocument,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="client-documents-modal">
        {subtitle && (
          <div className="client-documents-modal__subtitle">{subtitle}</div>
        )}

        {onAddDocument && (
          <div className="client-documents-modal__actions">
            <button type="button" className="client-documents-modal__add" onClick={onAddDocument}>
              <Plus size={17} />
              Добавить документ
            </button>
          </div>
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
