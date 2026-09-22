import { tajikistanAddressRows, tajikistanOkatoHierarchy } from "./tajikistanAddressData.js";

const toOptions = (rows) => rows.map(([value, name]) => ({ value, label: `${value} — ${name}` }));

export const serviceGroupOptions = toOptions([
  ["5000", 'Создан при импорте счета с наименованием: "MIGR MANUAL"'],
  ["5000.000", 'ЗАО "АКТИВ БАНК"'], ["5100", "ДУШАНБИНСКИЙ ФИЛИАЛ"],
  ["5102", "ОКОиПД (касса пересчета)"], ["5103", "VIP центр"],
  ["5104", "Центр банковского обслуживания №4 (Саховат)"],
  ["5105", "Центр банковского обслуживания №5 (Гиссар)"],
  ["5106", "Центр банковского обслуживания №6 (Шератон/Хилтон)"],
  ["5107", "Центр банковского обслуживания №7 (Серена)"],
  ["5108", "Центр банковского обслуживания №8"], ["5109", "Центр банковского обслуживания №9"],
  ["5110", "Центр банковского обслуживания №10"], ["5111", "МХБ №1 Корвон"],
  ["5198", "РКО Операционного Управления Душанбинского Филиала"], ["5200", "ХУДЖАНДСКИЙ ФИЛИАЛ"],
  ["5201", "Центр банковского обслуживания №1"], ["5202", "Центр банковского обслуживания №2"],
  ["5203", "Центр банковского обслуживания №3"], ["5204", "МХБ №10 Бустон"],
  ["5298", "РКО Операционного Управления Худжандского Филиала"], ["5299", "ОКОиПД (касса пересчета) ХФ"],
  ["5300", "ФИЛИАЛ БОХТАР"], ["5400", "ФИЛИАЛИ ВАХДАТ"], ["5401", "МХБ №9 (ВАХДАТ)"],
  ["5500", "ФИЛИАЛИ ТУРСУНЗОДА"], ["5600", "ФИЛИАЛИ ШАХРИНАВ"], ["5700", "ФИЛИАЛИ ХИСОР"],
  ["5800", "ФИЛИАЛИ КУЛОБ"], ["5900", "ФИЛИАЛИ ХУЧАНД2"], ["6000", "ФИЛИАЛИ КУБОДИЁН"],
  ["6100", "МУДИРИЯТИ АМАЛИЁТИ №2 (Душанбе)"], ["6200", "МХБ №7 ВОСЕЪ"],
  ["6300", "МХБ №8 ШАХРИТУС"], ["6400", "МХБ №11 ПАНЧАКЕНТ"],
  ["6500", "МХБ №12 дар н. Чайхун"], ["6600", "ФИЛИАЛИ дар н.И.СОМОНИ ш.Душанбе"],
  ["6700", "МХБ №14 дар н. Файзобод"], ["6800", "МХБ №15 дар н. Дангара"],
]);

export const tariffCategoryOptions = toOptions([
  ["003", "Тарифы для документарных операций"], ["003_1", "Тариф по аккредитивам"],
  ["003_2", "Тариф по гарантиям"], ["100", "ЮЛ"], ["150", "VIP ЮЛ"],
  ["151", "ИНДВ ЮЛ"], ["160", "КУ ЮЛ"], ["200", "ФЛ"], ["300", "Розница"],
  ["408", "Тарифы по карточной системе"], ["500", "Тарифы по системам денежных переводов"],
  ["600", "Тарифы систем денежных переводов"],
]);

export const economySectorOptions = toOptions([
  ["1", "Сектор органов денежно-кредитного регулирования"], ["2", "Сектор государственного управления"],
  ["3", "Банковский сектор"], ["4", "Сектор нефинансовых предприятий"],
  ["5", "Совместные предприятия"], ["6", "Международные организации"],
  ["7", "Физические лица"], ["8", "Небанковские кредитные организации"],
]);

export const passportTypeOptions = toOptions([
  ["58", "Паспорт Республики Таджикистан"], ["59", "Паспорт РФ (с серией)"],
  ["60", "Военный билет"], ["61", "Свидетельство о рождении"],
  ["62", "Паспорт РФ (без серии)"], ["63", "Загранпаспорт гражданина РФ"],
  ["64", "Паспорт СССР"], ["65", "Заграничный паспорт РТ"],
  ["66", "Служ. карт."], ["67", "Паспорт"], ["68", "Заграничный паспорт ин."],
  ["69", "Удостоверение"],
]);

export const kopfOptions = toOptions([["4", "ДОМАШНИЕ ХОЗЯЙСТВА"]]);

const CITY_DISTRICTS = [
  ["Худжанд", "Худжандский район", "Согдийская область"],
  ["Бохтар", "Бохтарский район", "Хатлонская область"],
  ["Куляб", "Кулябский район", "Хатлонская область"],
  ["Хорог", "Хорогский район", "Горно-Бадахшанская Автономная область"],
  ["Истаравшан", "Истаравшанский район", "Согдийская область"],
  ["Исфара", "Исфаринский район", "Согдийская область"],
  ["Канибадам", "Канибадамский район", "Согдийская область"],
  ["Пенджикент", "Пенджикентский район", "Согдийская область"],
  ["Турсунзаде", "Турсунзадевский район", "Районы Республиканского подчинения Республики Таджикистан"],
  ["Вахдат", "Вахдатский район", "Районы Республиканского подчинения Республики Таджикистан"],
  ["Гиссар", "Гиссарский район", "Районы Республиканского подчинения Республики Таджикистан"],
  ["Рогун", "Рогунский район", "Районы Республиканского подчинения Республики Таджикистан"],
  ["Нурек", "Нурекский район", "Хатлонская область"],
  ["Левакант", "Левакантский район", "Хатлонская область"],
  ["Бустон", "Бустонский район", "Согдийская область"],
  ["Гулистон", "Гулистонский район", "Согдийская область"],
  ["Истиклол", "Истиклолский район", "Согдийская область"],
];

const normalizeName = (value) => String(value || "")
  .toLocaleLowerCase("ru")
  .replace(/^г\.\s*/, "")
  .replace(/[-‐‑–—\s.]/g, "");

const hierarchyByCode = new Map(tajikistanOkatoHierarchy.map((item) => [item.code, item]));
const regionRoots = ["3501", "3507", "3505", "3509", "3590"];
const regionNameByCode = {
  "3501": "Душанбе",
  "3507": "Хатлонская область",
  "3505": "Согдийская область",
  "3509": "Районы Республиканского подчинения Республики Таджикистан",
  "3590": "Горно-Бадахшанская Автономная область",
};

const findRegionCode = (node) => {
  let current = node;
  while (current) {
    if (regionRoots.includes(current.code)) return current.code;
    current = hierarchyByCode.get(current.parent);
  }
  return "";
};

const hierarchyDistricts = tajikistanOkatoHierarchy
  .filter((item) => item.type === "Район")
  .map((item) => ({ ...item, region: regionNameByCode[findRegionCode(item)] || "" }));
const cityCodes = new Map(tajikistanOkatoHierarchy
  .filter((item) => item.type === "Город")
  .map((item) => [normalizeName(item.name), item.code]));
const districtCodes = new Map(hierarchyDistricts.map((item) => [normalizeName(item.name), item.code]));
const fallbackRegionCodes = Object.fromEntries(Object.entries(regionNameByCode).map(([code, name]) => [name, code]));

const enrichedAddressRows = [...tajikistanAddressRows];
CITY_DISTRICTS.forEach(([city, district, region]) => {
  const match = enrichedAddressRows.find((item) =>
    item.region === region && item.district === district && normalizeName(item.settlement) === normalizeName(city));
  if (match) return;
  const cityCode = cityCodes.get(normalizeName(city));
  const districtCode = districtCodes.get(normalizeName(district));
  enrichedAddressRows.push({
    region, district, settlement: city,
    okato: cityCode || districtCode || fallbackRegionCodes[region] || "3500",
    inheritedOkato: !cityCode,
  });
});

export const addressRegionOptions = Object.values(regionNameByCode).map((name) => ({ value: name, label: name }));

export const getAddressDistrictOptions = (region) => {
  if (!region) return [];
  const values = new Map();
  hierarchyDistricts.filter((item) => item.region === region).forEach((item) => {
    values.set(item.name, { value: item.name, label: item.name, okato: item.code });
  });
  enrichedAddressRows.filter((item) => item.region === region).forEach((item) => {
    const okato = districtCodes.get(normalizeName(item.district)) || fallbackRegionCodes[region] || item.okato;
    values.set(item.district, { value: item.district, label: item.district, okato });
  });
  return [...values.values()].sort((a, b) => a.label.localeCompare(b.label, "ru"));
};

export const getAddressSettlementOptions = (region, district) => {
  if (!region || !district) return [];
  const city = CITY_DISTRICTS.find((item) => item[1] === district)?.[0];
  return enrichedAddressRows
    .filter((item) => item.region === region && item.district === district)
    .sort((a, b) => {
      if (normalizeName(a.settlement) === normalizeName(city)) return -1;
      if (normalizeName(b.settlement) === normalizeName(city)) return 1;
      return a.settlement.localeCompare(b.settlement, "ru");
    })
    .map((item) => ({ value: item.settlement, label: item.settlement, okato: item.okato, inheritedOkato: item.inheritedOkato }));
};

export const getAddressDistrictOkato = (region, district) =>
  getAddressDistrictOptions(region).find((item) => item.value === district)?.okato || fallbackRegionCodes[region] || "";
