const APPLICATION_BACKEND_URL = import.meta.env.VITE_BACKEND_APPLICATION_URL;

const DOCUMENT_TYPE_LABELS = {
  front_side_of_the_passport: "Лицевая сторона паспорта",
  back_side_of_the_passport: "Обратная сторона паспорта",
  selfie_with_passport: "Селфи с паспортом",
};

const SOURCE_LABELS = {
  applications_portal: "Заявки",
  premies_portal: "Портал",
};

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];

export const getDocumentId = (document) =>
  document?.ID ?? document?.id ?? document?.key ?? document?.path;

export const getDocumentPath = (document) =>
  typeof document === "string" ? document : document?.path || "";

export const getClientDocumentTypeLabel = (documentType, fallbackTitle = "") =>
  DOCUMENT_TYPE_LABELS[documentType] || fallbackTitle || "Документ";

export const getClientDocumentSourceLabel = (source) =>
  SOURCE_LABELS[source] || source || "Не указан";

export const resolveClientDocumentUrl = (document) => {
  const rawPath = getDocumentPath(document)?.trim();
  if (!rawPath) {
    return "";
  }

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const normalizedPath = rawPath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "");

  return `${APPLICATION_BACKEND_URL}/uploads/${normalizedPath}`;
};

export const getClientDocumentExtension = (document) => {
  const path = getDocumentPath(document).toLowerCase();
  const lastDotIndex = path.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return path.slice(lastDotIndex);
};

export const isImageDocument = (document) => {
  const mimeType = String(document?.mime_type || document?.mimeType || "").toLowerCase();
  if (mimeType.startsWith("image/")) {
    return true;
  }

  return IMAGE_EXTENSIONS.includes(getClientDocumentExtension(document));
};

export const isPdfDocument = (document) => {
  const mimeType = String(document?.mime_type || document?.mimeType || "").toLowerCase();
  return mimeType === "application/pdf" || getClientDocumentExtension(document) === ".pdf";
};

export const isPreviewableClientDocument = (document) =>
  isImageDocument(document) || isPdfDocument(document);

export const formatClientDocumentDate = (value) => {
  if (!value) {
    return "Не указано";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Не указано";
  }

  return date.toLocaleString("ru-RU");
};

export const normalizeClientDocumentRecord = (document) => ({
  ...document,
  id: getDocumentId(document),
  title: document?.title || "Документ",
  documentTypeLabel: getClientDocumentTypeLabel(
    document?.document_type,
    document?.title,
  ),
  sourceLabel: getClientDocumentSourceLabel(document?.source),
  createdAtLabel: formatClientDocumentDate(document?.CreatedAt || document?.created_at),
  url: resolveClientDocumentUrl(document),
});

export const getClientSelfieDocument = (documents = []) =>
  documents.find((document) => document?.document_type === "selfie_with_passport") ||
  documents.find((document) => isImageDocument(document)) ||
  null;
