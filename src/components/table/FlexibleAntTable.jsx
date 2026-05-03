import React, {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Table as AntTable, ConfigProvider, theme } from "antd";
import ruRU from "antd/locale/ru_RU";
import "../../styles/components/FlexibleTable.scss";
import useThemeStore from "../../store/useThemeStore";

// Static parts of the theme
const BASE_THEME_CONFIG = {
  token: {
    borderRadius: 12,
    fontFamily: "inherit",
  },
};

const DEFAULT_MIN_COLUMN_WIDTH = 140;

const getValueByPath = (record, dataIndex) => {
  if (!record || dataIndex === undefined || dataIndex === null) {
    return undefined;
  }

  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((acc, part) => acc?.[part], record);
  }

  if (typeof dataIndex === "string" && dataIndex.includes(".")) {
    return dataIndex.split(".").reduce((acc, part) => acc?.[part], record);
  }

  return record?.[dataIndex];
};

const normalizeValue = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const compareValues = (left, right) => {
  const leftValue = normalizeValue(left);
  const rightValue = normalizeValue(right);

  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  const leftIsNumber =
    leftValue !== "" &&
    !Number.isNaN(leftNumber) &&
    Number.isFinite(leftNumber);
  const rightIsNumber =
    rightValue !== "" &&
    !Number.isNaN(rightNumber) &&
    Number.isFinite(rightNumber);

  if (leftIsNumber && rightIsNumber) {
    return leftNumber - rightNumber;
  }

  const leftDate = Date.parse(leftValue);
  const rightDate = Date.parse(rightValue);
  const leftIsDate =
    typeof leftValue === "string" &&
    leftValue.length >= 8 &&
    !Number.isNaN(leftDate);
  const rightIsDate =
    typeof rightValue === "string" &&
    rightValue.length >= 8 &&
    !Number.isNaN(rightDate);

  if (leftIsDate && rightIsDate) {
    return leftDate - rightDate;
  }

  return String(leftValue).localeCompare(String(rightValue), "ru", {
    numeric: true,
    sensitivity: "base",
  });
};

const extractText = (node) => {
  if (node === undefined || node === null || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node
      .map((item) => extractText(item))
      .join(" ")
      .trim();
  }

  if (isValidElement(node)) {
    return extractText(node.props?.children);
  }

  return "";
};

const moveColumnKey = (columnKeys, sourceKey, targetKey) => {
  const nextKeys = [...columnKeys];
  const sourceIndex = nextKeys.indexOf(sourceKey);
  const targetIndex = nextKeys.indexOf(targetKey);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return nextKeys;
  }

  nextKeys.splice(sourceIndex, 1);
  const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  nextKeys.splice(insertIndex, 0, sourceKey);

  return nextKeys;
};

const buildResponsiveWidths = (columns, widthMap, containerWidth) => {
  const baseWidths = columns.reduce((accumulator, column) => {
    accumulator[column.key] = Math.max(
      DEFAULT_MIN_COLUMN_WIDTH,
      Number(widthMap[column.key] ?? column.width ?? DEFAULT_MIN_COLUMN_WIDTH),
    );
    return accumulator;
  }, {});

  const totalBaseWidth = Object.values(baseWidths).reduce(
    (sum, width) => sum + width,
    0,
  );

  if (!containerWidth || totalBaseWidth >= containerWidth || !totalBaseWidth) {
    return {
      widths: baseWidths,
      totalWidth: totalBaseWidth,
    };
  }

  const scale = containerWidth / totalBaseWidth;
  const responsiveWidths = Object.entries(baseWidths).reduce(
    (accumulator, [columnKey, width]) => {
      accumulator[columnKey] = Math.max(
        DEFAULT_MIN_COLUMN_WIDTH,
        Math.round(width * scale),
      );
      return accumulator;
    },
    {},
  );

  const totalWidth = Object.values(responsiveWidths).reduce(
    (sum, width) => sum + width,
    0,
  );

  return {
    widths: responsiveWidths,
    totalWidth,
  };
};

const createDragPreview = (text) => {
  const preview = document.createElement("div");
  preview.className = "flexible-table__drag-preview";
  preview.textContent = text || "Колонка";
  document.body.appendChild(preview);
  return preview;
};

const columnsFromChildren = (children) =>
  Children.toArray(children)
    .filter(isValidElement)
    .map((child, index) => ({
      ...child.props,
      key:
        child.key ??
        child.props?.key ??
        child.props?.dataIndex ??
        `column-${index}`,
    }));

const ResizableHeaderCell = ({
  children,
  columnKey,
  dragColumnKey,
  onResizeStart,
  onMoveColumn,
  onHoverColumn,
  onStartColumnDrag,
  onFinishColumnDrag,
  draggedColumnKey,
  dropTargetKey,
  ...restProps
}) => {
  const handleMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onResizeStart?.(columnKey, event);
  };

  const handleDragStart = (event) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(columnKey));
    dragColumnKey.current = columnKey;
    onStartColumnDrag?.(columnKey);

    const preview = createDragPreview(
      event.currentTarget.innerText?.replace(/\s+/g, " ").trim(),
    );
    event.dataTransfer.setDragImage(preview, 16, 16);
    requestAnimationFrame(() => preview.remove());
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    // DOM-узлы больше не перемещаются во время drag (setColumnOrder убран из handleHoverColumn),
    // поэтому dragColumnKey.current остаётся валидным на протяжении всего перетаскивания.
    const sourceKey = dragColumnKey.current ?? draggedColumnKey;
    onHoverColumn?.(sourceKey, columnKey);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    // dataTransfer.getData() доступен только в drop-обработчике (не в dragenter).
    const sourceKey =
      event.dataTransfer.getData("text/plain") ||
      dragColumnKey.current ||
      draggedColumnKey;

    if (!sourceKey || sourceKey === String(columnKey)) {
      return;
    }

    onMoveColumn?.(sourceKey, columnKey);
    onFinishColumnDrag?.();
  };

  return (
    <th
      {...restProps}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragEnd={onFinishColumnDrag}
      onDrop={handleDrop}
      className={`${restProps.className || ""} flexible-ant-table__th ${
        draggedColumnKey === columnKey ? "is-dragging" : ""
      } ${dropTargetKey === columnKey ? "is-drop-target" : ""}`.trim()}
    >
      <div className="flexible-ant-table__th-inner">{children}</div>
      <span
        className="flexible-ant-table__resize-handle"
        onMouseDown={handleMouseDown}
      />
    </th>
  );
};

export const Table = ({
  columns,
  dataSource,
  onColumnOrderChange,
  children,
  tableId,
  onChange,
  ...restProps
}) => {
  const { primaryColor, theme: currentTheme } = useThemeStore();

  const dynamicTheme = useMemo(
    () => ({
      ...BASE_THEME_CONFIG,
      algorithm: currentTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        ...BASE_THEME_CONFIG.token,
        colorPrimary: primaryColor,
        colorBgContainer: "var(--bg-surface)",
        colorBgLayout: "var(--bg-color)",
        colorText: "var(--text-color)",
        colorBorder: "var(--border-color)",
        colorFillAlter: "var(--bg-secondary)",
        colorFillContent: "var(--bg-secondary)",
      },
      components: {
        Table: {
          headerBg: "var(--bg-secondary)",
          headerColor: "var(--text-color)",
          headerSortHoverBg: "rgba(var(--primary-rgb), 0.05)",
          headerSortActiveBg: "rgba(var(--primary-rgb), 0.1)",
          bodySortBg: "rgba(var(--primary-rgb), 0.02)",
          rowHoverBg: "rgba(var(--primary-rgb), 0.08)",
          selectedRowBg: "rgba(var(--primary-rgb), 0.12)",
          selectedRowHoverBg: "rgba(var(--primary-rgb), 0.15)",
        },
        Pagination: {
          itemActiveBg: primaryColor,
          itemActiveColor: "#fff",
          itemActiveBgDisabled: "rgba(0, 0, 0, 0.15)",
        },
        Select: {
          activeBorderColor: primaryColor,
          hoverBorderColor: primaryColor,
        },
        Button: {
          colorPrimary: primaryColor,
          colorPrimaryHover: primaryColor,
        },
        Checkbox: {
          colorPrimary: primaryColor,
        },
        Radio: {
          colorPrimary: primaryColor,
        },
      },
    }),
    [primaryColor],
  );

  const dragColumnKey = useRef(null);
  const wrapperRef = useRef(null);
  const storageKey = useMemo(() => {
    if (tableId) {
      return `flexible-ant-table:${tableId}`;
    }

    const sourceColumns =
      Array.isArray(columns) && columns.length
        ? columns
        : columnsFromChildren(children);

    const baseId = sourceColumns
      .map(
        (column) =>
          column?.dataIndex ?? column?.key ?? extractText(column?.title),
      )
      .filter(Boolean)
      .join("-");

    return `flexible-ant-table:${baseId || "default"}`;
  }, [children, columns, tableId]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [columnWidths, setColumnWidths] = useState({});
  const [sortState, setSortState] = useState({ columnKey: null, order: null });
  const [paginationState, setPaginationState] = useState({
    current: 1,
    pageSize: restProps.pagination?.pageSize ?? 15,
  });
  const [containerWidth, setContainerWidth] = useState(0);
  const [draggedColumnKey, setDraggedColumnKey] = useState(null);
  const [dropTargetKey, setDropTargetKey] = useState(null);
  const prevContainerWidth = useRef(0);

  const sourceColumns = useMemo(
    () =>
      Array.isArray(columns) && columns.length
        ? columns
        : columnsFromChildren(children),
    [children, columns],
  );

  const normalizedColumns = useMemo(
    () =>
      sourceColumns.map((column, index) => ({
        ...column,
        key:
          column.key ??
          (Array.isArray(column.dataIndex)
            ? column.dataIndex.join(".")
            : column.dataIndex) ??
          `column-${index}`,
      })),
    [sourceColumns],
  );

  useEffect(() => {
    try {
      const persistedState = JSON.parse(
        localStorage.getItem(storageKey) || "{}",
      );
      if (Array.isArray(persistedState.columnOrder)) {
        setColumnOrder(persistedState.columnOrder);
      }
      if (
        persistedState.columnWidths &&
        typeof persistedState.columnWidths === "object"
      ) {
        setColumnWidths(persistedState.columnWidths);
      }
    } catch (error) {
      console.error("Не удалось прочитать настройки таблицы:", error);
    }
  }, [storageKey]);

  useEffect(() => {
    const availableKeys = normalizedColumns.map((column) => column.key);
    setColumnOrder((previousOrder) => {
      const filteredKeys = previousOrder.filter((key) =>
        availableKeys.includes(key),
      );
      const missingKeys = availableKeys.filter(
        (key) => !filteredKeys.includes(key),
      );
      return [...filteredKeys, ...missingKeys];
    });
  }, [normalizedColumns]);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        columnOrder,
        columnWidths,
      }),
    );
  }, [columnOrder, columnWidths, storageKey]);

  useEffect(() => {
    if (!wrapperRef.current) {
      return undefined;
    }

    const updateWidth = () => {
      const newWidth = Math.round(wrapperRef.current?.clientWidth || 0);
      if (Math.abs(newWidth - prevContainerWidth.current) > 1) {
        prevContainerWidth.current = newWidth;
        setContainerWidth(newWidth);
      }
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(wrapperRef.current);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const columnMap = useMemo(
    () => new Map(normalizedColumns.map((column) => [column.key, column])),
    [normalizedColumns],
  );

  const orderedColumns = useMemo(() => {
    if (!columnOrder.length) {
      return normalizedColumns;
    }

    return columnOrder.map((key) => columnMap.get(key)).filter(Boolean);
  }, [columnMap, columnOrder, normalizedColumns]);

  const { widths: responsiveWidths, totalWidth } = useMemo(
    () => buildResponsiveWidths(orderedColumns, columnWidths, containerWidth),
    [columnWidths, containerWidth, orderedColumns],
  );

  const sortedDataSource = useMemo(() => {
    if (!sortState.columnKey || !sortState.order) {
      return dataSource;
    }

    const sortColumn = normalizedColumns.find(
      (column) => column.key === sortState.columnKey,
    );

    if (!sortColumn) {
      return dataSource;
    }

    const direction = sortState.order === "ascend" ? 1 : -1;
    const comparator =
      typeof sortColumn.sorterCompare === "function"
        ? sortColumn.sorterCompare
        : (leftRecord, rightRecord) => {
            const leftValue =
              typeof sortColumn.sortValue === "function"
                ? sortColumn.sortValue(leftRecord)
                : getValueByPath(
                    leftRecord,
                    sortColumn.dataIndex ?? sortColumn.key,
                  );
            const rightValue =
              typeof sortColumn.sortValue === "function"
                ? sortColumn.sortValue(rightRecord)
                : getValueByPath(
                    rightRecord,
                    sortColumn.dataIndex ?? sortColumn.key,
                  );

            return compareValues(leftValue, rightValue);
          };

    return [...dataSource].sort((leftRecord, rightRecord) => {
      const result = comparator(leftRecord, rightRecord);
      return result * direction;
    });
  }, [dataSource, normalizedColumns, sortState]);

  const handleResizeStart = useCallback(
    (columnKey, event) => {
      const startX = event.clientX;
      const currentWidth =
        columnWidths[columnKey] ??
        event.currentTarget.parentElement?.getBoundingClientRect().width ??
        DEFAULT_MIN_COLUMN_WIDTH;

      const handleMouseMove = (moveEvent) => {
        const nextWidth = Math.max(
          DEFAULT_MIN_COLUMN_WIDTH,
          currentWidth + (moveEvent.clientX - startX),
        );

        setColumnWidths((previousWidths) => ({
          ...previousWidths,
          [columnKey]: Math.round(nextWidth),
        }));
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [columnWidths],
  );

  // Перемещение применяется ТОЛЬКО при drop.
  // Вызов setColumnOrder во время drag перемещает DOM-узел перетаскиваемого <th>,
  // браузер стреляет dragend, и состояние drag сбрасывается до окончания операции.
  const handleMoveColumn = useCallback((sourceKey, targetKey) => {
    setColumnOrder((previousOrder) =>
      moveColumnKey(previousOrder, String(sourceKey), String(targetKey)),
    );
  }, []);

  // Во время hover — только подсвечиваем целевой столбец, не трогаем DOM.
  const handleHoverColumn = useCallback((sourceKey, targetKey) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) {
      return;
    }
    setDropTargetKey(String(targetKey));
  }, []);

  const handleStartColumnDrag = useCallback((columnKey) => {
    dragColumnKey.current = String(columnKey);
    setDraggedColumnKey(String(columnKey));
    setDropTargetKey(null);
  }, []);

  const handleFinishColumnDrag = useCallback(() => {
    dragColumnKey.current = null;
    setDraggedColumnKey(null);
    setDropTargetKey(null);
  }, []);

  const enhancedColumns = useMemo(
    () =>
      orderedColumns.map((column) => {
        const isSortable =
          column.sortable !== false &&
          (column.dataIndex !== undefined ||
            column.key !== undefined ||
            typeof column.sortValue === "function" ||
            typeof column.sorterCompare === "function");

        return {
          ...column,
          width: responsiveWidths[column.key] ?? column.width,
          sorter: isSortable ? true : column.sorter,
          sortOrder:
            sortState.columnKey === column.key ? sortState.order : null,
          onHeaderCell: (headerColumn) => ({
            ...column.onHeaderCell?.(headerColumn),
            columnKey: column.key,
            dragColumnKey,
            onResizeStart: handleResizeStart,
            onMoveColumn: handleMoveColumn,
            onHoverColumn: handleHoverColumn,
            onStartColumnDrag: handleStartColumnDrag,
            onFinishColumnDrag: handleFinishColumnDrag,
            draggedColumnKey,
            dropTargetKey,
          }),
        };
      }),
    [
      draggedColumnKey,
      dropTargetKey,
      handleFinishColumnDrag,
      handleHoverColumn,
      handleMoveColumn,
      handleResizeStart,
      handleStartColumnDrag,
      orderedColumns,
      responsiveWidths,
      sortState,
    ],
  );

  const handleTableChange = useCallback(
    (pagination, filters, sorter, extra) => {
      const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;

      setSortState({
        columnKey: normalizedSorter?.columnKey ?? null,
        order: normalizedSorter?.order ?? null,
      });

      setPaginationState({
        current: pagination.current,
        pageSize: pagination.pageSize,
      });

      onChange?.(pagination, filters, sorter, extra);
    },
    [onChange],
  );

  return (
    <ConfigProvider locale={ruRU} theme={dynamicTheme}>
      <div className="flexible-ant-table" ref={wrapperRef}>
        <AntTable
          {...restProps}
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          columns={enhancedColumns}
          dataSource={sortedDataSource}
          onChange={handleTableChange}
          pagination={
            restProps.pagination !== false
              ? {
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "15", "20", "50", "100"],
                  ...restProps.pagination,
                  ...paginationState,
                }
              : false
          }
          scroll={{
            ...restProps.scroll,
            x: Math.max(totalWidth, containerWidth || 0),
          }}
        />
      </div>
    </ConfigProvider>
  );
};

Table.Column = AntTable.Column;
Table.ColumnGroup = AntTable.ColumnGroup;

export default Table;
