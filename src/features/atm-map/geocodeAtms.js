import { RAW_ATMS, REGION_CENTERS } from "./atmAddresses";


/** ====== ВСПОМОГАТЕЛЬНЫЕ ====== */
function normalizeRegion(raw) {
  return (raw || "")
    .replace(/\s+/g, " ")
    .replace(/^ш\.\s*/i, "")
    .replace(/^н\.?\s*/i, "")
    .replace(/^ш\./i, "")
    .trim()
    .replace(/^Хучанд$/i, "Хуҷанд")
    .replace(/^Рогун$/i, "Роғун");
}

function normalizeAddress(raw) {
  return (raw || "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*$/, "")
    .trim();
}

function toNumberOrNull(x) {
  // забираем только число (если после "—" есть комментарии)
  const s = String(x || "").trim();
  if (!s || s === "—" || s === "-") return null;

  // найдём первое число в строке
  const m = s.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!m) return null;

  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

// небольшой “разброс” вокруг центра региона
function jitterCoords(center, radiusKm = 2.5) {
  const dLat = (radiusKm / 111) * (Math.random() * 2 - 1);
  const dLng =
    (radiusKm / (111 * Math.cos((center.lat * Math.PI) / 180))) *
    (Math.random() * 2 - 1);

  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

function parseRawAtms(raw) {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  return lines.map((line) => {
    const parts = line.split("\t").map((p) => (p || "").trim());
    const [regionRaw, addressRaw, latRaw, lngRaw] = parts;

    const region = normalizeRegion(regionRaw);
    const addressLine = normalizeAddress(addressRaw);

    const lat = toNumberOrNull(latRaw);
    const lng = toNumberOrNull(lngRaw);

    return {
      region,
      addressLine,
      lat,
      lng,
      hasCoords: lat != null && lng != null,
    };
  });
}

/** Собираем список банкоматов:
 * - если есть координаты -> используем
 * - если нет -> берём jitter от центра региона
 * - если региона нет в REGION_CENTERS -> пропускаем (чтобы не рисовать "абы где")
 */
function buildAtmsFromList(list) {
  const seen = new Set();
  const atms = [];
  let id = 1;

  for (const item of list) {
    const region = item.region;
    if (!region) continue;

    let lat = item.lat;
    let lng = item.lng;
    let approx = false;

    if (lat == null || lng == null) {
      const center = REGION_CENTERS[region];
      if (!center) continue; // нет центра региона -> не рисуем

      const radius = region === "Душанбе" ? 4 : 2.5;
      const p = jitterCoords(center, radius);
      lat = p.lat;
      lng = p.lng;
      approx = true;
    }

    // ключ с округлением, чтобы jitter не создавал "ложные дубликаты"
    const key = `${region}|${item.addressLine}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    atms.push({
      id: String(id++),
      city: region,
      lat,
      lng,
      title: "Банкомат",
      address: `${region}, ${item.addressLine}`,
      
    });
  }

  return atms;
}

/** Центры регионов по фактическим (и сгенерированным) координатам:
 * пригодится для фильтра/центрации карты.
 */
function buildCentersFromAtms(atms, fallbackCenters) {
  const acc = new Map(); // region -> {sumLat,sumLng,count}

  for (const a of atms) {
    const region = a.city;
    const cur = acc.get(region) || { sumLat: 0, sumLng: 0, count: 0 };
    cur.sumLat += a.lat;
    cur.sumLng += a.lng;
    cur.count += 1;
    acc.set(region, cur);
  }

  const centers = { ...fallbackCenters };
  for (const [region, v] of acc.entries()) {
    centers[region] = { lat: v.sumLat / v.count, lng: v.sumLng / v.count };
  }

  return centers;
}

/** ====== ЭКСПОРТЫ ====== */
const parsed = parseRawAtms(RAW_ATMS);

export const ATMS = buildAtmsFromList(parsed);

// Для совместимости со старым кодом, где использовался CITY_CENTERS
export const CITY_CENTERS = buildCentersFromAtms(ATMS, REGION_CENTERS);

// Если где-то в UI вызывают buildMockAtms() — оставляем
export function buildMockAtms() {
  return ATMS;
}
// === ПРОСТОЙ ТЕСТОВЫЙ СЧЁТЧИК ===
console.log("ATM TOTAL:", ATMS.length);


// Статистика (удобно проверить)
export const ATMS_STATS = {
  totalRows: parsed.length,
  withRealCoords: parsed.filter((x) => x.hasCoords).length,
  withApproxCoords: parsed.filter((x) => !x.hasCoords && REGION_CENTERS[x.region]).length,
  skippedNoRegionCenter: parsed.filter((x) => !x.hasCoords && !REGION_CENTERS[x.region]).length,
};
