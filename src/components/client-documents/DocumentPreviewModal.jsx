import React from "react";
import Modal from "../general/Modal.jsx";
import {
  getClientDocumentSourceLabel,
  getClientDocumentTypeLabel,
  isImageDocument,
  isPdfDocument,
  resolveClientDocumentUrl,
} from "../../utils/clientDocuments.js";

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
  oval = false,
  title,
}) {
  if (!document) {
    return null;
  }

  const documentUrl = resolveClientDocumentUrl(document);
  const documentTitle = title || document.title || "Предпросмотр документа";
  const isImage = isImageDocument(document);
  const isPdf = isPdfDocument(document);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={documentTitle}>
      <div className="client-document-preview">
        <div className="client-document-preview__meta">
          <span>
            Тип:{" "}
            {getClientDocumentTypeLabel(document.document_type, document.title)}
          </span>
          <span>Источник: {getClientDocumentSourceLabel(document.source)}</span>
        </div>

        {isImage && (
          <div
            className={`client-document-preview__image-wrapper ${
              oval ? "client-document-preview__image-wrapper--oval" : ""
            }`}
          >
            <img
              src={documentUrl}
              alt={document.title || "Документ клиента"}
              className="client-document-preview__image"
            />
          </div>
        )}

        {!isImage && isPdf && (
          <iframe
            src={documentUrl}
            title={document.title || "PDF документ"}
            className="client-document-preview__frame"
          />
        )}

        {!isImage && !isPdf && (
          <div className="client-document-preview__fallback">
            <p>Для этого файла нет встроенного предпросмотра.</p>
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="client-document-preview__link"
            >
              Открыть документ
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
