import React, { useMemo } from "react";
import { FiEye, FiFile, FiFileText, FiImage } from "react-icons/fi";
import { Table } from "../table/FlexibleAntTable.jsx";
import {
  isImageDocument,
  isPdfDocument,
  normalizeClientDocumentRecord,
} from "../../utils/clientDocuments.js";

const getDocumentIcon = (document) => {
  if (isImageDocument(document)) {
    return <FiImage size={18} />;
  }

  if (isPdfDocument(document)) {
    return <FiFileText size={18} />;
  }

  return <FiFile size={18} />;
};

export default function ClientDocumentsTable({
  documents = [],
  onPreview,
  tableId = "client-documents",
  scrollY = 420,
  showINN = false,
}) {
  const dataSource = useMemo(
    () =>
      documents.map((document) => {
        const normalizedDocument = normalizeClientDocumentRecord(document);

        return {
          ...normalizedDocument,
          key: normalizedDocument.id,
        };
      }),
    [documents],
  );

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: "",
        key: "icon",
        width: 72,
        sortable: false,
        render: (_, record) => (
          <span className="client-documents-table__icon">
            {getDocumentIcon(record)}
          </span>
        ),
      },
      {
        title: "Название",
        dataIndex: "title",
        key: "title",
        width: 260,
      },
      {
        title: "Тип документа",
        dataIndex: "documentTypeLabel",
        key: "documentTypeLabel",
        width: 240,
      },
      {
        title: "Источник",
        dataIndex: "sourceLabel",
        key: "sourceLabel",
        width: 150,
      },
      {
        title: "Дата добавления",
        dataIndex: "createdAtLabel",
        key: "createdAtLabel",
        width: 200,
        sortValue: (record) => record.CreatedAt || record.created_at || "",
      },
      {
        title: "Действия",
        key: "actions",
        width: 160,
        sortable: false,
        render: (_, record) => (
          <button
            type="button"
            className="client-documents-table__preview-btn"
            onClick={() => onPreview?.(record)}
          >
            <FiEye size={16} />
            Предпросмотр
          </button>
        ),
      },
    ];

    if (!showINN) {
      return baseColumns;
    }

    return [
      ...baseColumns.slice(0, 3),
      {
        title: "ИНН",
        dataIndex: "inn",
        key: "inn",
        width: 180,
      },
      ...baseColumns.slice(3),
    ];
  }, [onPreview, showINN]);

  return (
    <Table
      tableId={tableId}
      rowKey="id"
      columns={columns}
      dataSource={dataSource}
      sticky
      pagination={
        dataSource.length > 10
          ? {
              pageSize: 10,
            }
          : false
      }
      scroll={{ y: scrollY }}
      locale={{ emptyText: "Документы не найдены" }}
    />
  );
}
