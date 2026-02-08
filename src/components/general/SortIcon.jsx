import React from "react";
import { MdArrowUpward } from "react-icons/md";

/**
 * Component to display sorting icon in table headers
 * @param {Object} props
 * @param {Object} props.sortConfig - Current sort configuration { key, direction }
 * @param {string} props.sortKey - The key this header sorts by
 */
const SortIcon = ({ sortConfig, sortKey }) => {
  const isActive = sortConfig && sortConfig.key === sortKey;
  const direction = isActive ? sortConfig.direction : "asc";

  return (
    <span
      className={`sort-icon ${isActive ? "active" : ""} ${direction === "desc" ? "desc" : ""}`}
    >
      <MdArrowUpward />
    </span>
  );
};

export default SortIcon;
