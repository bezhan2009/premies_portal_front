export const CUSTOMER_DIRECTORY_INITIAL_FILTERS = Object.freeze({
  search: "",
  creatorUsername: "",
  departments: [],
  resident: "",
  overdue: "",
  terror: "",
  complianceScore: "",
  sortBy: "created_at",
  sortOrder: "desc",
});

export function buildCustomerDirectoryQuery({ page, filters, limit = 30 }) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const search = String(filters.search || "").trim();
  const creator = String(filters.creatorUsername || "").trim();

  if (search) params.set("search", search);
  if (creator) params.set("creator_username", creator);
  if (filters.departments?.length) params.set("departments", filters.departments.join(","));
  if (filters.resident) params.set("resident", filters.resident);
  if (filters.overdue) params.set("overdue", filters.overdue);
  if (filters.terror) params.set("terror", filters.terror);
  if (filters.complianceScore) params.set("compliance_score", filters.complianceScore);
  params.set("sort_by", filters.sortBy || "created_at");
  params.set("sort_order", filters.sortOrder || "desc");

  return params;
}
