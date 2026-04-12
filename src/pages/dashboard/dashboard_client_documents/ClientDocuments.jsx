import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import AlertMessage from "../../../components/general/AlertMessage.jsx";
import ClientDocumentsTable from "../../../components/client-documents/ClientDocumentsTable.jsx";
import DocumentPreviewModal from "../../../components/client-documents/DocumentPreviewModal.jsx";
import { getClientDocumentsByINN } from "../../../api/clientsDataFiles/clientsDataFiles.js";
import { getClientSelfieDocument } from "../../../utils/clientDocuments.js";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/ClientDocuments.scss";

export default function DashboardClientDocuments() {
  const [inn, setInn] = useState("");
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const normalizedINN = inn.replace(/\s+/g, "").trim();
  const selfieDocument = useMemo(
    () => getClientSelfieDocument(documents),
    [documents],
  );

  const showAlert = (message, type = "success") => {
    setAlert({
      show: true,
      message,
      type,
    });
  };

  const hideAlert = () => {
    setAlert({
      show: false,
      message: "",
      type: "success",
    });
  };

  const handleSearch = async () => {
    if (!normalizedINN) {
      showAlert("Введите ИНН клиента", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const response = await getClientDocumentsByINN(normalizedINN);
      setDocuments(response || []);

      if (response?.length) {
        showAlert(`Найдено документов: ${response.length}`, "success");
      } else {
        showAlert("По этому ИНН документы не найдены", "warning");
      }
    } catch (error) {
      console.error("Ошибка загрузки документов клиента:", error);
      setDocuments([]);
      showAlert("Не удалось загрузить документы клиента", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInn("");
    setDocuments([]);
    setPreviewDocument(null);
    hideAlert();
  };

  return (
    <>
      <Helmet>
        <title>База документов клиентов</title>
      </Helmet>

      <div className="block_info_prems content-page" align="center">
        {alert.show && (
          <AlertMessage
            message={alert.message}
            type={alert.type}
            onClose={hideAlert}
            duration={3000}
          />
        )}

        <div className="processing-integration">
          <div className="processing-integration__container">
            <div className="search-card">
              <div className="client-documents-page__toolbar">
                <input
                  type="text"
                  className="client-documents-page__input"
                  placeholder="Введите ИНН клиента"
                  value={inn}
                  onChange={(event) => setInn(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />

                <button
                  type="button"
                  className="search-card__button"
                  onClick={handleSearch}
                  disabled={isLoading}
                >
                  {isLoading ? "Поиск..." : "Найти документы"}
                </button>

                <button
                  type="button"
                  className="search-card__button search-card__button--secondary"
                  onClick={handleClear}
                  disabled={isLoading}
                >
                  Очистить
                </button>
              </div>

              {documents.length > 0 && (
                <div className="client-documents-page__summary">
                  <span className="client-documents-page__chip">
                    ИНН: {normalizedINN}
                  </span>
                  <span className="client-documents-page__chip">
                    Документов: {documents.length}
                  </span>
                  {selfieDocument && (
                    <button
                      type="button"
                      className="client-documents-table__preview-btn"
                      onClick={() => setPreviewDocument(selfieDocument)}
                    >
                      Посмотреть селфи
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="processing-integration__limits-table">
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">
                    База документов клиента
                  </h2>
                </div>

                <div className="limits-table__wrapper">
                  {isLoading ? (
                    <div className="processing-integration__loading">
                      <div className="spinner"></div>
                    </div>
                  ) : documents.length > 0 ? (
                    <ClientDocumentsTable
                      documents={documents}
                      onPreview={setPreviewDocument}
                      tableId="client-documents-page"
                      scrollY={520}
                    />
                  ) : (
                    <div className="client-documents-modal__empty">
                      Выполните поиск по ИНН, чтобы увидеть документы клиента
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DocumentPreviewModal
        isOpen={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
      />
    </>
  );
}
