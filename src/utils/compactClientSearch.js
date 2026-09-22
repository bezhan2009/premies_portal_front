import { normalizePhoneSearchValue } from '../components/dashboard/dashboard_frontovik/absSearchUtils.js';
export const compactSearchEndpoint = (mode, input, absBase, atmBase) => {
  const value=String(input||'').trim();
  if(!value) throw new Error('Введите значение для поиска');
  const atmModes={ 'client/info?phoneNumber=':['clientcode.php','phone',normalizePhoneSearchValue(value)],byCardId:['innbyidn.php','cardidn',value],byAccount:['clientcode.php','acc',value],byName:['clientcode.php','longname',value],byLast4:['clientcode.php','last4',value] };
  if(atmModes[mode]) {const [path,key,term]=atmModes[mode];return {url:`${atmBase.replace(/\/$/,'')}/services/${path}?${key}=${encodeURIComponent(term)}`,atm:true};}
  if(!['client/info/client-index?clientIndex=','client/info/inn?inn='].includes(mode)) throw new Error('Неизвестный тип поиска');
  return {url:`${absBase.replace(/\/$/,'')}/${mode}${encodeURIComponent(value)}`,atm:false};
};
export const clientCodeFromResult = item => String(typeof item==='string'?item:item?.Code||item?.code||item?.clicode||item?.client_code||item?.clientCode||'').trim();
export const complianceClientFields = client => ({
  inn: String(client?.TaxIdentificationNumber?.Code || client?.tax_code || client?.inn || ''),
  full_name: client?.LongName || client?.long_name || [client?.LastName,client?.FirstName,client?.MiddleName].filter(Boolean).join(' '),
  birth_date: String(client?.BirthDate || client?.birth_date || '').slice(0,10),
});
