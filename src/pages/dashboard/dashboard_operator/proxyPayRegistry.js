const allowedRegistryFilters=['direction','search','from','to','payment_status','conversion_status','difference_status','utrnno'];

export function proxyRegistryDownloadURL(baseURL,filters={}) {
 const query=new URLSearchParams();
 for(const key of allowedRegistryFilters){
  const value=filters[key];
  if(value!==undefined && value!==null && String(value).trim()!=='')query.set(key,String(value));
 }
 const encoded=query.toString();
 return `${baseURL}/reports/registry.xlsx${encoded?`?${encoded}`:''}`;
}
