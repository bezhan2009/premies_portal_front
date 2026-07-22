import * as XLSX from "xlsx";
import { useCallback } from "react";

export const useExcelExport = () => {
  const exportToExcel = useCallback((data, columns, fileName = "export") => {
    if (!data || !data.length) {
      console.warn("No data to export");
      return;
    }

    const sheetRows = data.map((row) => {
      const newRow = {};
      columns.forEach((col) => {
        let value;

        // Access value based on key type (function, nested path string, or simple key)
        if (typeof col.key === "function") {
          value = col.key(row);
        } else if (typeof col.key === "string" && col.key.includes(".")) {
          value = col.key.split(".").reduce((obj, k) => (obj || {})[k], row);
        } else {
          value = row[col.key];
        }

        // Apply formatting if provided
        if (col.format) {
          value = col.format(value, row);
        }

        newRow[col.label] = value;
      });
      return newRow;
    });

    const ws = XLSX.utils.json_to_sheet(sheetRows);

    // Auto-width logic
    const keys = Object.keys(sheetRows[0] || {});
    ws["!cols"] = keys.map((k) => {
      const maxLen = Math.max(
        k.length,
        ...sheetRows.map((row) => String(row[k] ?? "").length),
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    // Ensure filename ends with .xlsx
    const finalFileName = fileName.endsWith(".xlsx")
      ? fileName
      : `${fileName}.xlsx`;
    XLSX.writeFile(wb, finalFileName);
  }, []);

  return { exportToExcel };
};
