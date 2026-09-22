export function paginateRows(rows, page, pageSize) {
  const size = Math.max(1, Math.trunc(Number(pageSize)) || 25);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(pages, Math.max(1, Math.trunc(Number(page)) || 1));
  const offset = (current - 1) * size;
  return { rows: rows.slice(offset, offset + size), total, pages, current,
    from: total ? offset + 1 : 0, to: Math.min(offset + size, total) };
}

export function togglePageSelection(selected, rows) {
  const ids = new Set(rows.map((row) => row.id));
  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));
  return allSelected ? selected.filter((id) => !ids.has(id)) : [...new Set([...selected, ...ids])];
}
