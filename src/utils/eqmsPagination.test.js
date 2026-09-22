import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateRows, togglePageSelection } from './eqmsPagination.js';

const rows = Array.from({ length: 63 }, (_, index) => ({ id: index + 1 }));
test('first page has 25 rows, correct range and total', () => {
  const page = paginateRows(rows, 1, 25);
  assert.deepEqual([page.rows.length, page.from, page.to, page.total, page.pages], [25, 1, 25, 63, 3]);
});
test('second page has no overlap', () => assert.deepEqual(paginateRows(rows, 2, 25).rows.map(r => r.id), rows.slice(25, 50).map(r => r.id)));
test('last partial page', () => assert.deepEqual([paginateRows(rows, 3, 25).from, paginateRows(rows, 3, 25).to], [51, 63]));
test('empty result is page one, 0–0', () => {
  const page = paginateRows([], 8, 25);
  assert.deepEqual([page.current, page.pages, page.from, page.to], [1, 1, 0, 0]);
});
test('filter shrinking data clamps current page', () => assert.equal(paginateRows(rows.slice(0, 3), 3, 25).current, 1));
test('all supported page sizes', () => {
  for (const size of [10, 25, 50, 100]) assert.equal(paginateRows(rows, 1, size).rows.length, Math.min(size, 63));
});
test('out of range and invalid input', () => {
  assert.equal(paginateRows(rows, -1, 25).current, 1);
  assert.equal(paginateRows(rows, 999, 25).current, 3);
  assert.equal(paginateRows(rows, NaN, NaN).rows.length, 25);
});
test('pagination preserves original full sorted data', () => {
  const original = [...rows]; paginateRows(rows, 2, 25); assert.deepEqual(rows, original);
});
test('sorting occurs before paging', () => assert.equal(paginateRows([...rows].reverse(), 2, 25).rows[0].id, 38));
test('select page preserves selection on other pages', () => assert.deepEqual(togglePageSelection([40], rows.slice(0, 2)), [40, 1, 2]));
test('deselect page preserves selection on other pages', () => assert.deepEqual(togglePageSelection([1, 2, 40], rows.slice(0, 2)), [40]));
test('partial selection does not duplicate ids', () => assert.deepEqual(togglePageSelection([1], rows.slice(0, 2)), [1, 2]));
test('empty page leaves selection unchanged', () => assert.deepEqual(togglePageSelection([40], []), [40]));
