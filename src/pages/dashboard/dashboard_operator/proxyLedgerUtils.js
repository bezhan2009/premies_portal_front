export const ledgerMoney = minor => minor == null ? '—' : (Number(minor)/100).toLocaleString('ru-RU', {minimumFractionDigits:2,maximumFractionDigits:2});
export const ledgerDirection = value => ({internal:'Внутрибанковский',visa:'VISA доместик',km:'КМ доместик'}[value] || 'Не определено');
export const ledgerDate = value => value ? new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value)) : '—';
export const ledgerStatus = value => ({manual:'Ручная проводка',sending:'Отправляется',accepted:'Ожидает исполнения',executed:'Исполнено',unknown:'Требует сверки',error:'Ошибка',no_difference:'Нет КР'}[value] || value || 'Ручная проводка');
export function ledgerCanPay(row,kind) {
 if (!row || row.legacy_settled || row.block_reason || !['visa','km','internal'].includes(row.direction)) return false;
 const retryable=(id,status,absStatus)=>!id || (status==='error' && !!absStatus);
 if(kind==='payment') return retryable(row.payment_operation_id,row.payment_status,row.payment_abs_status);
 if(kind==='difference') return row.difference_minor!=null && row.difference_minor!==0 && retryable(row.difference_operation_id,row.difference_status,row.difference_abs_status) && row.conversion_status==='executed' && row.conversion_abs_status==='BOOKED';
 return retryable(row.conversion_operation_id,row.conversion_status,row.conversion_abs_status) && row.payment_status==='executed' && row.payment_abs_status==='BOOKED' && row.rub_minor>0 && row.tjs_minor>0 && !!row.quote_version && !!row.quote_at && Date.now()-new Date(row.quote_at).getTime()<300000;
}
export function ledgerCanOpen(row, kind) {
 if (!row) return false;
 if (row.legacy_settled || row[`${kind}_operation_id`]) return true;
 if (kind === 'conversion') return !row.block_reason && !!(row.payment_operation_id || row.payment_status === 'executed');
 return ledgerCanPay(row, kind);
}
export const forecastText = data => data?.forecast_days == null ? 'Недостаточно данных для прогноза' : `Хватит примерно на: ${Number(data.forecast_days).toLocaleString('ru-RU',{maximumFractionDigits:1})} дней`;
