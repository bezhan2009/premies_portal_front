export const documentScopeOptions = (clientIndex) => {
  const selectedClient = typeof clientIndex === "string" ? clientIndex.trim() : "";
  return selectedClient ? { params: { clientIndex: selectedClient } } : {};
};

export const scopedDocumentUrl = (url, clientIndex) => {
  const selectedClient = typeof clientIndex === "string" ? clientIndex.trim() : "";
  if (!url || !selectedClient) return url;
  const scoped = new URL(url);
  scoped.searchParams.set("clientIndex", selectedClient);
  return scoped.toString();
};
