export function translate_role_id(role_ids) {
  if (role_ids === 6) {
    return "Корт";
  } else if (role_ids === 8) {
    return "Карзхо ва дигар";
  } else if (role_ids === 22) {
    return "Банковские продукты";
  } else if (role_ids === 41) {
    return "Управление Рохат";
  } else {
    return "undefined";
  }
}
