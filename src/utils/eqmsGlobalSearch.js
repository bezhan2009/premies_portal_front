export function matchesEqmsSearch(row, query, displayedValues=[]) {
  const needle=String(query||'').trim().toLocaleLowerCase('ru');
  if(!needle)return true;
  const values=value=>value==null?[]:Array.isArray(value)?value.flatMap(values):typeof value==='object'?Object.values(value).flatMap(values):[String(value)];
  return values([row,displayedValues]).join(' ').toLocaleLowerCase('ru').includes(needle);
}
