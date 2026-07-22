import { useState, useMemo } from "react";

/**
 * Helper to get value from nested object by path
 * @param {Object} obj
 * @param {string} path
 * @returns {*}
 */
const getValueByPath = (obj, path) => {
  if (!path) return undefined;
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Hook for sorting table data
 * @param {Array} items - Initial data array
 * @returns {Object} { items: sortedItems, requestSort, sortConfig }
 */
export const useTableSort = (items = []) => {
  const [sortConfig, setSortConfig] = useState(null);

  const sortedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];

    // Create a copy to avoid mutating the original array
    let sortableItems = [...items];

    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = getValueByPath(a, sortConfig.key);
        let bValue = getValueByPath(b, sortConfig.key);

        // Handle null/undefined values
        if (aValue === undefined || aValue === null) aValue = "";
        if (bValue === undefined || bValue === null) bValue = "";

        // Check if both values are valid numbers
        // We trim and check if it's a numeric string to avoid sorting things like "123 Main St" as 123
        const aStr = String(aValue).trim();
        const bStr = String(bValue).trim();

        const aNum = parseFloat(aStr);
        const bNum = parseFloat(bStr);

        const isANum = !isNaN(aNum) && isFinite(aNum) && String(aNum) === aStr;
        const isBNum = !isNaN(bNum) && isFinite(bNum) && String(bNum) === bStr;

        if (isANum && isBNum) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }

        // Default to string comparison
        const aLower = aStr.toLowerCase();
        const bLower = bStr.toLowerCase();

        if (aLower < bLower) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aLower > bLower) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  /**
   * Toggles sorting for a given key
   * Order: asc -> desc -> default (null)
   * @param {string} key
   */
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else {
        direction = null;
      }
    }
    setSortConfig(direction ? { key, direction } : null);
  };

  return { items: sortedItems, requestSort, sortConfig };
};
