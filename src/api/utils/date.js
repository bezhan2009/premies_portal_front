import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function getMonthName(monthNumber) {
    const months = [
        "Янв", // 1
        "Фев", // 2
        "Мар", // 3
        "Апр", // 4
        "Май", // 5
        "Июн", // 6
        "Июл", // 7
        "Авг", // 8
        "Сен", // 9
        "Окт", // 10
        "Ноя", // 11
        "Дек"  // 12
    ];

    if (monthNumber >= 1 && monthNumber <= 12) {
        return months[monthNumber - 1];
    } else {
        return "Некорректный месяц";
    }
}

export function formatDate(dateString) {
    if (!dateString || dateString === "0001-01-01T00:00:00Z") return "—";
    try {
        return format(new Date(dateString), "dd.MM.yyyy HH:mm:ss", { locale: ru });
    } catch {
        return dateString;
    }
}