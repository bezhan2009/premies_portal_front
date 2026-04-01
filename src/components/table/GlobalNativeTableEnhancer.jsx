import { useEffect } from "react";
import "../../styles/components/FlexibleTable.scss";

const DEFAULT_MIN_COLUMN_WIDTH = 140;

const controllers = new WeakMap();

const compareValues = (left, right) => {
  const leftValue = left ?? "";
  const rightValue = right ?? "";

  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  const leftIsNumber =
    leftValue !== "" && !Number.isNaN(leftNumber) && Number.isFinite(leftNumber);
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

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_а-яё]/gi, "")
    .slice(0, 100);

const getPersistedState = (storageKey) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
};

const buildResponsiveWidths = (columnOrder, columnWidths, containerWidth) => {
  const totalBaseWidth = columnOrder.reduce(
    (sum, index) => sum + (columnWidths[index] || DEFAULT_MIN_COLUMN_WIDTH),
    0,
  );

  if (!containerWidth || totalBaseWidth >= containerWidth || !totalBaseWidth) {
    return {
      widths: { ...columnWidths },
      totalWidth: totalBaseWidth,
    };
  }

  const scale = containerWidth / totalBaseWidth;
  const widths = columnOrder.reduce((accumulator, index) => {
    accumulator[index] = Math.max(
      DEFAULT_MIN_COLUMN_WIDTH,
      Math.round((columnWidths[index] || DEFAULT_MIN_COLUMN_WIDTH) * scale),
    );
    return accumulator;
  }, {});

  const totalWidth = Object.values(widths).reduce((sum, width) => sum + width, 0);

  return { widths, totalWidth };
};

const createDragPreview = (text) => {
  const preview = document.createElement("div");
  preview.className = "flexible-table__drag-preview";
  preview.textContent = text || "Колонка";
  document.body.appendChild(preview);
  return preview;
};

class NativeTableController {
  constructor(table) {
    this.table = table;
    this.storageKey = this.buildStorageKey();
    this.state = {
      columnOrder: [],
      columnWidths: {},
      sort: null,
    };
    this.dragSourceIndex = null;
    this.handleDocumentMouseMove = null;
    this.handleDocumentMouseUp = null;
    this.draggedColumnIndex = null;
    this.dropTargetIndex = null;
    this.lastContainerWidth = 0;
    this.restoreState();
    this.refresh();
  }

  buildStorageKey() {
    const explicitId = this.table.dataset.flexTableId;
    if (explicitId) {
      return `native-flex-table:${explicitId}`;
    }

    const headerTexts = Array.from(
      this.table.tHead?.rows?.[0]?.cells || [],
    ).map((cell) => cell.textContent?.trim() || "");

    return `native-flex-table:${slugify(window.location.pathname)}:${slugify(
      headerTexts.join("-"),
    )}`;
  }

  restoreState() {
    const persistedState = getPersistedState(this.storageKey);
    if (Array.isArray(persistedState.columnOrder)) {
      this.state.columnOrder = persistedState.columnOrder;
    }
    if (
      persistedState.columnWidths &&
      typeof persistedState.columnWidths === "object"
    ) {
      this.state.columnWidths = persistedState.columnWidths;
    }
    if (persistedState.sort) {
      this.state.sort = persistedState.sort;
    }
  }

  persistState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  get headerRow() {
    return this.table.tHead?.rows?.[0] || null;
  }

  get headerCells() {
    return Array.from(this.headerRow?.cells || []);
  }

  get bodyRows() {
    return Array.from(this.table.tBodies || []).flatMap((tbody) =>
      Array.from(tbody.rows || []),
    );
  }

  get usesBuiltInSort() {
    return !this.headerCells.some((cell) =>
      cell.classList.contains("sortable-header"),
    );
  }

  isLockedColumn(cellOrIndex) {
    const cell =
      typeof cellOrIndex === "number"
        ? this.headerCells[cellOrIndex]
        : cellOrIndex;

    if (!cell) {
      return false;
    }

    const normalizedLabel = cell.textContent
      ?.replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    return (
      cell.dataset.flexLocked === "true" ||
      cell.classList.contains("eqms-th--checkbox") ||
      cell.classList.contains("active-table") ||
      normalizedLabel === "действия" ||
      normalizedLabel === "actions"
    );
  }

  // Drag активен — applyLayout заблокирован
  get isDragging() {
    return this.draggedColumnIndex !== null;
  }

  refresh() {
    if (!this.headerRow || !this.headerCells.length) {
      return;
    }

    // Не трогаем DOM во время drag — это вызовет dragend
    if (this.isDragging) {
      return;
    }

    this.columnCount = this.headerCells.length;
    this.state.columnOrder = this.normalizeOrder(this.state.columnOrder);
    this.captureDefaultWidths();
    this.decorateTable();
    this.bindHeaders();
    this.applyLayout();
    this.applySorting();
  }

  normalizeOrder(order) {
    const indexes = Array.from({ length: this.columnCount }, (_, index) => index);
    const filteredOrder = order.filter((index) => indexes.includes(index));
    const missingIndexes = indexes.filter((index) => !filteredOrder.includes(index));
    return [...filteredOrder, ...missingIndexes];
  }

  captureDefaultWidths() {
    this.headerCells.forEach((cell, index) => {
      if (!this.state.columnWidths[index]) {
        const measuredWidth = Math.round(
          cell.getBoundingClientRect().width || DEFAULT_MIN_COLUMN_WIDTH,
        );
        this.state.columnWidths[index] = Math.max(
          DEFAULT_MIN_COLUMN_WIDTH,
          measuredWidth,
        );
      }
    });
  }

  decorateTable() {
    this.table.classList.add("native-flex-table");
    this.table.dataset.flexEnhanced = "true";

    if (this.table.tHead) {
      this.table.tHead.classList.add("native-flex-table__head");
    }

    Array.from(this.table.tBodies || []).forEach((tbody) => {
      tbody.classList.add("native-flex-table__body");
    });
  }

  bindHeaders() {
    this.headerCells.forEach((cell, index) => {
      const isLockedColumn = this.isLockedColumn(cell);

      if (cell.dataset.flexBound === "true") {
        cell.dataset.flexColumnIndex = String(index);
        cell.dataset.flexLocked = String(isLockedColumn);
        cell.draggable = !isLockedColumn;
        cell.classList.toggle("native-flex-table__th--locked", isLockedColumn);
        return;
      }

      cell.dataset.flexBound = "true";
      cell.dataset.flexColumnIndex = String(index);
      cell.dataset.flexLocked = String(isLockedColumn);
      cell.draggable = !isLockedColumn;
      cell.classList.add("native-flex-table__th");
      cell.classList.toggle("native-flex-table__th--locked", isLockedColumn);

      cell.addEventListener("dragstart", (event) => {
        if (isLockedColumn) {
          event.preventDefault();
          return;
        }

        this.dragSourceIndex = index;
        this.draggedColumnIndex = index;
        this.dropTargetIndex = null;
        this.syncDragClasses();
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
        const preview = createDragPreview(
          event.currentTarget.innerText?.replace(/\s+/g, " ").trim(),
        );
        event.dataTransfer.setDragImage(preview, 16, 16);
        requestAnimationFrame(() => preview.remove());
      });

      cell.addEventListener("dragover", (event) => {
        if (isLockedColumn) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });

      cell.addEventListener("dragenter", (event) => {
        if (isLockedColumn) {
          return;
        }

        event.preventDefault();

        if (this.dragSourceIndex === null || this.dragSourceIndex === index) {
          return;
        }

        // Только подсветка — никакого applyLayout здесь.
        // applyLayout меняет cell.style.order на перетаскиваемой ячейке,
        // браузер считает что элемент "переехал" в DOM и стреляет dragend.
        this.dropTargetIndex = index;
        this.syncDragClasses();
      });

      cell.addEventListener("drop", (event) => {
        if (isLockedColumn) {
          this.clearDragState();
          return;
        }

        event.preventDefault();
        const sourceIndex = Number(
          event.dataTransfer.getData("text/plain") ?? this.dragSourceIndex,
        );

        if (Number.isNaN(sourceIndex) || sourceIndex === index) {
          this.clearDragState();
          return;
        }

        // Сначала перемещаем (только обновляет state.columnOrder + persistState),
        // затем clearDragState снимает флаг isDragging и вызывает applyLayout.
        this.moveColumn(sourceIndex, index);
        this.clearDragState();
      });

      cell.addEventListener("dragend", () => {
        if (isLockedColumn) {
          return;
        }

        this.clearDragState();
      });

      if (this.usesBuiltInSort) {
        cell.classList.add("native-flex-table__th--sortable");
        cell.addEventListener("click", (event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest(".native-flex-table__resize-handle")
          ) {
            return;
          }

          this.toggleSort(index);
        });
      }

      let resizeHandle = cell.querySelector(".native-flex-table__resize-handle");
      if (!resizeHandle && !isLockedColumn) {
        resizeHandle = document.createElement("span");
        resizeHandle.className = "native-flex-table__resize-handle";
        resizeHandle.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.startResize(index, cell, event);
        });
        cell.appendChild(resizeHandle);
      }
    });
  }

  clearDragState() {
    this.dragSourceIndex = null;
    this.draggedColumnIndex = null;  // снимаем isDragging
    this.dropTargetIndex = null;
    this.syncDragClasses();
    // Теперь isDragging === false, applyLayout выполнится полноценно
    this.applyLayout();
  }

  syncDragClasses() {
    this.headerCells.forEach((cell, index) => {
      cell.classList.toggle("is-dragging", this.draggedColumnIndex === index);
      cell.classList.toggle("is-drop-target", this.dropTargetIndex === index);
    });
  }

  startResize(columnIndex, cell, event) {
    const startX = event.clientX;
    const initialWidth =
      this.state.columnWidths[columnIndex] ||
      Math.round(cell.getBoundingClientRect().width) ||
      DEFAULT_MIN_COLUMN_WIDTH;

    this.handleDocumentMouseMove = (moveEvent) => {
      const nextWidth = Math.max(
        DEFAULT_MIN_COLUMN_WIDTH,
        initialWidth + (moveEvent.clientX - startX),
      );

      this.state.columnWidths[columnIndex] = Math.round(nextWidth);
      this.applyLayout();
    };

    this.handleDocumentMouseUp = () => {
      document.removeEventListener("mousemove", this.handleDocumentMouseMove);
      document.removeEventListener("mouseup", this.handleDocumentMouseUp);
      this.persistState();
    };

    document.addEventListener("mousemove", this.handleDocumentMouseMove);
    document.addEventListener("mouseup", this.handleDocumentMouseUp);
  }

  moveColumn(sourceIndex, targetIndex) {
    if (
      Number.isNaN(sourceIndex) ||
      Number.isNaN(targetIndex) ||
      this.isLockedColumn(sourceIndex) ||
      this.isLockedColumn(targetIndex) ||
      sourceIndex === targetIndex
    ) {
      return;
    }

    const nextOrder = [...this.state.columnOrder];
    const fromPosition = nextOrder.indexOf(sourceIndex);
    const targetPosition = nextOrder.indexOf(targetIndex);

    if (fromPosition === -1 || targetPosition === -1) {
      return;
    }

    nextOrder.splice(fromPosition, 1);
    const insertIndex =
      fromPosition < targetPosition ? targetPosition - 1 : targetPosition;
    nextOrder.splice(insertIndex, 0, sourceIndex);
    this.state.columnOrder = nextOrder;

    // НЕ вызываем applyLayout здесь — isDragging ещё true.
    // applyLayout вызовет clearDragState сразу после этого метода.
    this.persistState();
  }

  toggleSort(columnIndex) {
    if (
      this.state.sort?.columnIndex === columnIndex &&
      this.state.sort?.direction === "asc"
    ) {
      this.state.sort = { columnIndex, direction: "desc" };
    } else if (
      this.state.sort?.columnIndex === columnIndex &&
      this.state.sort?.direction === "desc"
    ) {
      this.state.sort = null;
    } else {
      this.state.sort = { columnIndex, direction: "asc" };
    }

    this.persistState();
    this.applySorting();
  }

  applyLayout() {
    // Блокируем во время drag: изменение cell.style.order на перетаскиваемой
    // ячейке заставляет браузер думать, что элемент переехал в DOM → dragend.
    // syncDragClasses() (classList.toggle) тоже триггерит MutationObserver →
    // enhanceNativeTables() → refresh() → сюда. Без этого guard'а drag ломается.
    if (this.isDragging) {
      return;
    }

    let containerWidth = Math.round(
      this.table.parentElement?.getBoundingClientRect().width || 0,
    );

    if (Math.abs(containerWidth - this.lastContainerWidth) < 2 && this.lastContainerWidth !== 0) {
      containerWidth = this.lastContainerWidth;
    } else {
      this.lastContainerWidth = containerWidth;
    }

    const { widths: responsiveWidths, totalWidth } = buildResponsiveWidths(
      this.state.columnOrder,
      this.state.columnWidths,
      containerWidth,
    );

    this.table.style.display = "block";
    this.table.style.width =
      totalWidth <= containerWidth && containerWidth
        ? "100%"
        : `${Math.max(totalWidth, DEFAULT_MIN_COLUMN_WIDTH)}px`;
    this.table.style.minWidth = `${Math.max(totalWidth, containerWidth || 0)}px`;

    if (this.table.tHead) {
      this.table.tHead.style.display = "block";
      this.table.tHead.style.width = this.table.style.width;
    }

    this.headerCells.forEach((cell, index) => {
      this.applyCellStyles(cell, index, responsiveWidths);
    });

    Array.from(this.table.tBodies || []).forEach((tbody) => {
      tbody.style.display = "flex";
      tbody.style.flexDirection = "column";
      tbody.style.width = this.table.style.width;
    });

    this.bodyRows.forEach((row, rowIndex) => {
      const cells = Array.from(row.cells || []);
      const isSimpleRow =
        cells.length === this.columnCount &&
        cells.every(
          (cell) =>
            Number(cell.colSpan || 1) === 1 && Number(cell.rowSpan || 1) === 1,
        );

      row.dataset.flexRowIndex = String(rowIndex);
      row.classList.add("native-flex-table__row");

      if (!isSimpleRow) {
        row.style.display = "block";
        row.style.width = "100%";
        row.style.order = String(rowIndex);
        cells.forEach((cell) => {
          cell.style.width = "100%";
          cell.style.flex = "1 1 auto";
          cell.style.order = "0";
        });
        return;
      }

      row.style.display = "flex";
      row.style.width = this.table.style.width;
      cells.forEach((cell, cellIndex) =>
        this.applyCellStyles(cell, cellIndex, responsiveWidths),
      );
    });
  }

  applyCellStyles(cell, columnIndex, responsiveWidths) {
    const order = this.state.columnOrder.indexOf(columnIndex);
    const width = Math.max(
      DEFAULT_MIN_COLUMN_WIDTH,
      responsiveWidths[columnIndex] || DEFAULT_MIN_COLUMN_WIDTH,
    );

    cell.style.order = String(order);
    cell.style.flex = `0 0 ${width}px`;
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.maxWidth = `${width}px`;
    cell.style.boxSizing = "border-box";
    cell.classList.add("native-flex-table__cell");
  }

  applySorting() {
    this.headerCells.forEach((cell, index) => {
      cell.classList.remove(
        "native-flex-table__th--sorted-asc",
        "native-flex-table__th--sorted-desc",
      );

      if (!this.usesBuiltInSort) {
        return;
      }

      if (this.state.sort?.columnIndex === index) {
        cell.classList.add(
          this.state.sort.direction === "asc"
            ? "native-flex-table__th--sorted-asc"
            : "native-flex-table__th--sorted-desc",
        );
      }
    });

    if (!this.usesBuiltInSort) {
      return;
    }

    const sortableRows = this.bodyRows.filter((row) => {
      const cells = Array.from(row.cells || []);
      return (
        cells.length === this.columnCount &&
        cells.every(
          (cell) =>
            Number(cell.colSpan || 1) === 1 && Number(cell.rowSpan || 1) === 1,
        )
      );
    });

    const passiveRows = this.bodyRows.filter((row) => !sortableRows.includes(row));
    const rowsInOrder = [...sortableRows];

    if (this.state.sort?.columnIndex !== undefined && this.state.sort) {
      rowsInOrder.sort((leftRow, rightRow) => {
        const leftValue = this.getCellValue(leftRow, this.state.sort.columnIndex);
        const rightValue = this.getCellValue(rightRow, this.state.sort.columnIndex);
        const result = compareValues(leftValue, rightValue);
        return this.state.sort.direction === "asc" ? result : result * -1;
      });
    } else {
      rowsInOrder.sort(
        (leftRow, rightRow) =>
          Number(leftRow.dataset.flexRowIndex) -
          Number(rightRow.dataset.flexRowIndex),
      );
    }

    rowsInOrder.forEach((row, index) => {
      row.style.order = String(index);
    });

    passiveRows.forEach((row, index) => {
      row.style.order = String(rowsInOrder.length + index);
    });
  }

  getCellValue(row, columnIndex) {
    const cell = row.cells?.[columnIndex];
    if (!cell) {
      return "";
    }

    return (
      cell.dataset.sortValue ||
      cell.innerText?.trim() ||
      cell.textContent?.trim() ||
      ""
    );
  }
}

const canEnhanceNativeTable = (table) => {
  if (!(table instanceof HTMLTableElement)) {
    return false;
  }

  if (
    table.closest(".site-calendar-dropdown") ||
    table.closest(".ant-picker-dropdown") ||
    table.closest(".ant-picker-panel")
  ) {
    return false;
  }

  if (table.closest(".ant-table")) {
    return false;
  }

  if (table.dataset.flexIgnore === "true") {
    return false;
  }

  const headRows = table.tHead?.rows;
  if (!headRows || headRows.length !== 1) {
    return false;
  }

  const headerCells = Array.from(headRows[0].cells || []);
  if (!headerCells.length) {
    return false;
  }

  if (
    headerCells.some(
      (cell) => Number(cell.colSpan || 1) > 1 || Number(cell.rowSpan || 1) > 1,
    )
  ) {
    return false;
  }

  return true;
};

const enhanceNativeTables = () => {
  const tables = Array.from(document.querySelectorAll("table"));

  tables.forEach((table) => {
    if (!canEnhanceNativeTable(table)) {
      return;
    }

    const existingController = controllers.get(table);
    if (existingController) {
      existingController.refresh();
      return;
    }

    controllers.set(table, new NativeTableController(table));
  });
};

export default function GlobalNativeTableEnhancer() {
  useEffect(() => {
    enhanceNativeTables();

    // Дебаунс предотвращает шквал вызовов при пачке DOM-мутаций
    // (например, при изменении классов во время drag)
    let mutationTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimer);
      mutationTimer = setTimeout(enhanceNativeTables, 50);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const handleResize = () => {
      enhanceNativeTables();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(mutationTimer);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}
