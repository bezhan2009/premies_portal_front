export function transliterateName(value = '') {
  const table = {
    А: 'A',
    Б: 'B',
    В: 'V',
    Г: 'G',
    Ғ: 'GH',
    Д: 'D',
    Е: 'E',
    Ё: 'YO',
    Ж: 'ZH',
    З: 'Z',
    И: 'I',
    Ӣ: 'I',
    Й: 'Y',
    К: 'K',
    Қ: 'Q',
    Л: 'L',
    М: 'M',
    Н: 'N',
    О: 'O',
    П: 'P',
    Р: 'R',
    С: 'S',
    Т: 'T',
    У: 'U',
    Ӯ: 'U',
    Ф: 'F',
    Х: 'KH',
    Ҳ: 'H',
    Ц: 'TS',
    Ч: 'CH',
    Ҷ: 'J',
    Ш: 'SH',
    Щ: 'SHCH',
    Ъ: '',
    Ы: 'Y',
    Ь: '',
    Э: 'E',
    Ю: 'YU',
    Я: 'YA'
  };
  return [...String(value).toUpperCase()].map(char => table[char] ?? char).join('').replace(/\s+/g, ' ').trim();
}
export function addressOKATO(catalog, regionKey, district = '', city = '') {
  const region = catalog?.regions?.find(r => r.key === regionKey);
  const rows = catalog?.places?.filter(p => p.region === regionKey && p.district.toUpperCase() === district.trim().toUpperCase()) || [];
  return rows.find(p => p.city && p.city.toUpperCase() === city.trim().toUpperCase())?.okato || rows[0]?.district_code || region?.okato || '';
}
