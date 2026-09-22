export function customerDirectoryQuery(filters, page) {
  const params = new URLSearchParams();
  if (page != null) { params.set('page',String(page)); params.set('limit','30'); }
  for (const [key,value] of Object.entries(filters)) {
    if (key==='departments') { if(value.length) params.set(key,value.join(',')); continue; }
    if(value!=='' && value!=null) params.set(({complianceScore:'compliance_score',sortBy:'sort_by',sortOrder:'sort_order'})[key]||key,String(value));
  }
  return params;
}
