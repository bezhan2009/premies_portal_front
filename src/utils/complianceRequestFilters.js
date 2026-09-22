export const matchEntries = value => {
  try { const parsed=typeof value==='string'?JSON.parse(value):value; return (Array.isArray(parsed)?parsed:[parsed]).filter(Boolean); } catch { return []; }
};
const searchable = value => value == null ? '' : typeof value==='object' ? Object.values(value).map(searchable).join(' ') : String(value);
const bankDate = value => {
  if(!value || Number.isNaN(new Date(value).getTime())) return '';
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
export const filterComplianceRequests = (requests, filters) => requests.filter(item => {
  const status=item.status||'pending';
  if(filters.status && status!==filters.status) return false;
  if(filters.source && !matchEntries(item.best_match).some(match=>match.source===filters.source)) return false;
  if(filters.score!=='' && filters.score!=null && Number(item.compliance_score||0)!==Number(filters.score)) return false;
  const date=bankDate(item.created_at);
  if(filters.from && (!date || date<filters.from)) return false;
  if(filters.to && (!date || date>filters.to)) return false;
  const labels={pending:'На проверке',approved:'Одобрено',rejected:'Отклонено'};
  return `${searchable(item)} ${searchable(matchEntries(item.best_match))} ${labels[status]||status}`.toLocaleLowerCase('ru').includes((filters.search||'').trim().toLocaleLowerCase('ru'));
});
