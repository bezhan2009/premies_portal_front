// Dictionary of available data keys for DOCX template generation
export const docxDictionary = [
  {
    category: "Системные (System)",
    keys: [
      { key: "system.currentDate", description: "Текущая дата (ГГГГ-ММ-ДД)" },
      { key: "system.currentTime", description: "Текущее время (ЧЧ:ММ:СС)" },
      { key: "system.operatorName", description: "Имя оператора" },
      { key: "system.uniqueId", description: "Уникальный номер генерации" },
    ]
  },
  {
    category: "Физ. Лицо (Client - Physical)",
    keys: [
      { key: "client.firstName", description: "Имя клиента" },
      { key: "client.lastName", description: "Фамилия клиента" },
      { key: "client.middleName", description: "Отчество клиента" },
      { key: "client.pinfl", description: "ИНН / ПИНФЛ" },
      { key: "client.gender", description: "Пол" },
      { key: "client.birthDate", description: "Дата рождения" },
      { key: "client.passportSeries", description: "Серия паспорта" },
      { key: "client.passportNumber", description: "Номер паспорта" },
      { key: "client.passportIssueDate", description: "Дата выдачи паспорта" },
      { key: "client.passportExpireDate", description: "Срок действия паспорта" },
      { key: "client.passportAuthority", description: "Кем выдан паспорт" },
      { key: "client.residenceAddress", description: "Адрес проживания" },
      { key: "client.registrationAddress", description: "Адрес прописки" },
      { key: "client.phoneNumber", description: "Номер телефона" },
      { key: "client.email", description: "Email" },
    ]
  },
  {
    category: "Юр. Лицо (Client - Legal)",
    keys: [
      { key: "client.companyName", description: "Название компании" },
      { key: "client.inn", description: "ИНН" },
      { key: "client.directorName", description: "ФИО Директора" },
      { key: "client.legalAddress", description: "Юридический адрес" },
      { key: "client.actualAddress", description: "Фактический адрес" },
    ]
  },
  {
    category: "Кредит (Credit)",
    keys: [
      { key: "credit.amount", description: "Сумма кредита" },
      { key: "credit.currency", description: "Валюта кредита" },
      { key: "credit.statusName", description: "Статус кредита" },
      { key: "credit.interestRate", description: "Процентная ставка (%)" },
      { key: "credit.penaltyRate", description: "Штрафная ставка (%)" },
      { key: "credit.term", description: "Срок кредита (мес.)" },
      { key: "credit.startDate", description: "Дата начала кредита" },
      { key: "credit.endDate", description: "Дата окончания кредита" },
      { key: "credit.purposeName", description: "Цель кредита" },
      { key: "credit.department", description: "Отделение (филиал)" },
      { key: "credit.expert", description: "Кредитный эксперт" },
      { key: "credit.clientCode", description: "Код клиента (АБС)" },
      { key: "credit.debtBalance", description: "Остаток задолженности" },
    ]
  },
  {
    category: "Карта (Card)",
    keys: [
      { key: "card.cardNumber", description: "Номер карты" },
      { key: "card.balance", description: "Баланс карты" },
      { key: "card.currency", description: "Валюта карты" },
      { key: "card.expireDate", description: "Срок действия карты" },
    ]
  },
  {
    category: "Заявка (Application)",
    keys: [
      { key: "application.id", description: "Номер заявки" },
      { key: "application.amount", description: "Сумма заявки" },
      { key: "application.status", description: "Статус заявки" },
    ]
  }
];
