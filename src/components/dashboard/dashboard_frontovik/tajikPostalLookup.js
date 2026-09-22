import { postalRows, postalSource } from './tajikPostData.js';
export { postalSource };

const aliases = {
  'кургантюбе':'бохтар', 'кургонтеппа':'бохтар', 'хучанд':'худжанд', 'хуҷанд':'худжанд',
  'чкаловск':'бустон', 'кайраккум':'гулистон', 'сарбанд':'левакант', 'кулоб':'куляб',
  'хисор':'гиссар', 'панчакент':'пенджикент', 'конободом':'канибадам',
  'айнин':'айни', 'аштин':'ашт', 'исфарин':'исфара', 'матчин':'матча',
  'ганчин':'деваштич', 'ганчи':'деваштич', 'кухистонимастчох':'кматча',
  'джабаррасулов':'драсулов', 'бгафуров':'гафуров', 'таджикобод':'таджикабад', 'тоджикобод':'таджикабад',
  'таджикабад':'таджикабад', 'джиргаталь':'лахш', 'тавильдарин':'сангвор',
  'нурабад':'нуробад', 'рошткалин':'рошткала', 'турсунзадев':'турсунзаде',
  'дангаран':'дангара', 'бальджувон':'бальджуван', 'колхозабад':'дбалхи',
  'бохтар':'бохтар', 'файзобод':'файзабад'
};
export const postalName = value => {
  const key = String(value || '').toLocaleLowerCase('ru').replace(/[ҷ]/g,'ч').replace(/[ҳ]/g,'х').replace(/[қ]/g,'к').replace(/[ӣ]/g,'и').replace(/[ӯ]/g,'у').replace(/ё/g,'е')
    .replace(/район|нохияи|нохия|шахри/g,'').trim().replace(/(?:ский|ская|ское)\s*$/,'').replace(/[^а-яa-z0-9]/g,'');
  return aliases[key] || key;
};
export function lookupPostalCode(address, rows = postalRows) {
  const region = address?.region_key;
  const district = postalName(address?.district?.name);
  const city = postalName(address?.city?.name);
  if (!region || !city) return null;
  const matches = rows.filter(([r, parent, name, , kind]) => r === region && postalName(name) === city &&
    (postalName(parent) === district || region === 'dushanbe' && city === 'душанбе' || kind === 'city' && postalName(parent) === city && district === city));
  const codes = [...new Set(matches.map(row => row[3]))];
  return codes.length === 1 ? { zip: codes[0], source: postalSource, level: matches[0][4] } : null;
}
