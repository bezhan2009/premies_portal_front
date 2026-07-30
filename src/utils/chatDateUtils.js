export const getMessageDayKey = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatChatDayLabel = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const dayKey = getMessageDayKey(isoString);

  if (dayKey === getMessageDayKey(today.toISOString())) {
    return "Сегодня";
  }

  if (dayKey === getMessageDayKey(yesterday.toISOString())) {
    return "Вчера";
  }

  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

