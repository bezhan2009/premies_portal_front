export const formaterDate = (date, type) => {
  if (type === "dateOnly") return date.split("T")[0];
};
