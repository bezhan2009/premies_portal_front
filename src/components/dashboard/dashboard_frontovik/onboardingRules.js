// ISO 3166-1 alpha-2. Store codes, never translated labels, in ABS requests.
const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const countryNames = new Intl.DisplayNames(['ru'], { type: 'region' });
export const countries = countryCodes.map(value => ({ value, label: `${value} — ${value === 'TJ' ? 'Таджикистан' : countryNames.of(value)}` }));
export const validCreationINN = value => /^[0-9]{9}$/.test(String(value || ''));

export function tajikPassportExpiry(issued) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issued || '')) return '';
  const date = new Date(`${issued}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== issued) return '';
  // Calendar +10 years (Feb 29 clamps to Feb 28), then subtract one day.
  const year = date.getUTCFullYear() + 10, month = date.getUTCMonth();
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day - 1)).toISOString().slice(0, 10);
}

// These HTTP responses definitively reject admission. A timeout/5xx must be
// reconciled with the SAME id, because a background job may already exist.
export const admissionRejected = error => [400, 401, 403, 413, 422].includes(error?.response?.status);
