export const IB_DOCX_PLACEMENTS = [
  ["overview", "Главная", "Рядом с обзором компании", "ib.company.*, ib.user.*"],
  ["transfers", "Переводы и конвертация", "Над формой перевода: общие заявления компании", "ib.company.*, ib.user.*"],
  ["account", "Документы счёта", "В окне документов выбранного счёта", "ib.account.*, ib.company.*, transactions"],
  ["card", "Документы карты", "В окне документов выбранной карты", "ib.card.*, ib.company.*"],
  ["credit", "Документы кредита", "В окне документов выбранного кредита", "ib.credit.*, ib.company.*"],
  ["deposit", "Документы депозита", "В окне документов выбранного депозита", "ib.deposit.*, ib.company.*"],
  ["operation", "Операция в истории", "В деталях сохранённого перевода или конвертации", "ib.operation.*, ib.company.*"],
].map(([id,title,hint,scope])=>({id,title,hint,scope,page:"InternetBanking",section:id,group:"Интернет-банкинг"}));

export const initialBankingDocx = () => ({enabled:false,placement:"overview",label:"",tooltip:"",style:"outline",size:"medium",icon:"file",order:100,formats:["pdf","docx"],defaultFormat:"pdf",requiresPeriod:false});

const dictionary = (category,prefix,fields) => ({category,keys:fields.map(([key,description])=>({key:prefix+key,description}))});
export const ibDocxDictionary = [
 dictionary("ИБ: компания и пользователь","ib.",[["company.name","Название выбранной компании"],["company.code","Код компании в АБС"],["company.inn","ИНН компании"],["company.address","Адрес компании"],["user.name","ФИО пользователя интернет-банка"],["user.id","ID пользователя"],["access.id","ID доступа к компании"]]),
 dictionary("ИБ: выбранный счёт","ib.account.",[["number","Номер счёта"],["balance","Остаток"],["currency","Валюта"],["openDate","Дата открытия"],["status","Статус"],["branch","Филиал"],["type","Тип счёта"]]),
 dictionary("ИБ: выбранная карта","ib.card.",[["cardId","ID карты"],["cardNumber","Номер карты"],["expireDate","Срок действия"]]),
 dictionary("ИБ: выбранный кредит","ib.credit.",[["referenceId","Идентификатор кредита"],["contractNumber","Номер договора"],["amount","Сумма"],["currency","Валюта"]]),
 dictionary("ИБ: выбранный депозит","ib.deposit.",[["agreementId","Идентификатор депозита"],["code","Номер договора"],["amount","Сумма"],["currency","Валюта"]]),
 dictionary("ИБ: сохранённая операция","ib.operation.",[["operation_number","Номер операции"],["operation_type","Тип операции"],["status","Статус операции"],["document_number","Номер документа"],["amount","Сумма списания"],["currency","Валюта списания"],["amount_to","Сумма зачисления при конвертации"],["currency_to","Валюта зачисления"],["conversion_rate","Курс конвертации"],["payer_name","Название плательщика"],["payer_inn","ИНН плательщика"],["payer_account","Счёт списания"],["beneficiary_name","Получатель"],["beneficiary_inn","ИНН получателя"],["beneficiary_account","Счёт получателя"],["beneficiary_bank_name","Банк получателя"],["beneficiary_bank_bic","БИК получателя"],["payment_details","Назначение"],["colvir_reference_id","Номер операции в АБС"],["provider_status","Статус в АБС"],["executed_at","Время исполнения"],["signatures_required","Необходимое число подписей"],["signatures_received","Полученное число подписей"]]),
];
