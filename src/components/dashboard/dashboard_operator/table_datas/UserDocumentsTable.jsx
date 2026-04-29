import React, { useCallback, useEffect, useState } from "react";
import "../../../../styles/components/Table.scss";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { formatDate } from "../../../../api/utils/date.js";

const UserDocumentsTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(`${backendURL}/user-documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result || []);
    } catch (error) {
      console.error("Error loading user documents:", error);
    } finally {
      setLoading(false);
    }
  }, [backendURL]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    const columns = [
      { key: "file_name", label: "Название файла" },
      { key: "user_email", label: "Кто сгенерировал" },
      { key: "created_at", label: "Дата генерации" },
    ];

    const exportData = data.map(item => ({
        ...item,
        user_email: item.user?.email || "Неизвестно",
        created_at: formatDate(item.CreatedAt)
    }));

    exportToExcel(exportData, columns, "База документов пользователей");
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions" style={{ marginBottom: "10px" }}>
        <h2>База документов пользователей</h2>
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      <Table
        tableId="user-documents-table"
        dataSource={data}
        rowKey={(record) => record.ID}
        loading={loading}
        bordered
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Нет данных" }}
      >
        <Table.Column
          title="Название файла"
          dataIndex="file_name"
          key="file_name"
          render={(text, record) => (
            <a 
              href={`${backendURL}/${record.file_path}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#1890ff', textDecoration: 'underline' }}
            >
              {text}
            </a>
          )}
        />
        <Table.Column
          title="Кто сгенерировал"
          dataIndex={["user", "email"]}
          key="user_email"
          render={(text) => text || "Неизвестно"}
        />
        <Table.Column
          title="Дата генерации"
          dataIndex="CreatedAt"
          key="created_at"
          render={(text) => formatDate(text)}
        />
      </Table>
    </div>
  );
};

export default UserDocumentsTable;
