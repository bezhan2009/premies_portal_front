export const ledgerMoney = minor => minor == null ? '—' : (Number(minor)/100).toLocaleString('ru-RU', {minimumFractionDigits:2,maximumFractionDigits:2});
export const ledgerDirection = value => ({internal:'Внутрибанковский',visa:'VISA доместик',km:'КМ доместик'}[value] || 'Не определено');
export const ledgerDate = value => value ? new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value)) : '—';
export const ledgerStatus = value => ({manual:'Ручная проводка',sending:'Отправляется',accepted:'Ожидает исполнения',executed:'Исполнено',unknown:'Требует сверки',error:'Ошибка',no_difference:'Нет КР'}[value] || value || 'Ручная проводка');
export const proxyDirectionChartData = metrics => ['internal','visa','km'].map(direction=>{
 const item=(metrics||[]).find(value=>value.direction===direction)||{};
 return {direction,name:ledgerDirection(direction),count:Number(item.count||0),amount:Number(item.amount_minor||0)/100};
});
const stageFlag={payment:'can_payment',difference:'can_difference',conversion:'can_conversion'};

export function proxyStageActions(row) {
 const pendingDifference=row?.settlement?.pending?.find(entry=>entry.operation_id) || row?.settlement?.pending?.[0];
 return {
  order:['payment','difference','conversion'],
  payment:{enabled:!!row?.can_payment,operationId:row?.payment_operation_id||null},
  refreshQuote:{enabled:!!row?.can_refresh_quote && row?.conversion_abs_status!=='BOOKED'},
  difference:{enabled:!!row?.can_difference,operationId:pendingDifference?.operation_id||row?.difference_operation_id||null},
  conversion:{enabled:!!row?.can_conversion,operationId:row?.conversion_operation_id||null},
 };
}

export function ledgerCanPay(row,kind) {
 if (!row || !stageFlag[kind]) return false;
 return row[stageFlag[kind]]===true;
}
export function ledgerCanOpen(row, kind) {
 if (!row) return false;
 const action=proxyStageActions(row)[kind];
 if (row.legacy_settled || action?.operationId) return true;
 if (kind === 'conversion') return !row.block_reason && (!!row.can_refresh_quote || !!row.payment_operation_id || row.payment_status === 'executed');
 return ledgerCanPay(row, kind);
}
export const forecastText = data => data?.forecast_days == null ? 'Недостаточно данных для прогноза' : `Хватит примерно на: ${Number(data.forecast_days).toLocaleString('ru-RU',{maximumFractionDigits:1})} дней`;
