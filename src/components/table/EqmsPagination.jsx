export default function EqmsPagination({ page, pageSize, onPageChange, onPageSizeChange, disabled }) {
  return (
    <nav className="eqms-pagination" aria-label="Пагинация EQMS">
      <span aria-live="polite">Записи {page.from}–{page.to} из {page.total}</span>
      <label>На странице
        <select aria-label="Записей на странице" value={pageSize} disabled={disabled}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <div className="eqms-pagination__navigation">
        <button type="button" aria-label="Первая страница" disabled={disabled || page.current === 1} onClick={() => onPageChange(1)}>«</button>
        <button type="button" aria-label="Предыдущая страница" disabled={disabled || page.current === 1} onClick={() => onPageChange(page.current - 1)}>‹</button>
        <span>Страница {page.current} из {page.pages}</span>
        <button type="button" aria-label="Следующая страница" disabled={disabled || page.current === page.pages} onClick={() => onPageChange(page.current + 1)}>›</button>
        <button type="button" aria-label="Последняя страница" disabled={disabled || page.current === page.pages} onClick={() => onPageChange(page.pages)}>»</button>
      </div>
    </nav>
  );
}
