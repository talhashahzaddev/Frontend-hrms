export interface CountryCode {
  name: string;
  code: string;
  flag: string;
  cca2: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  {
    name: 'Pakistan',
    code: '+92',
    flag: 'https://flagcdn.com/w40/pk.png',
    cca2: 'PK'
  },
  {
    name: 'United States',
    code: '+1',
    flag: 'https://flagcdn.com/w40/us.png',
    cca2: 'US'
  },
  {
    name: 'United Kingdom',
    code: '+44',
    flag: 'https://flagcdn.com/w40/gb.png',
    cca2: 'GB'
  },
  {
    name: 'India',
    code: '+91',
    flag: 'https://flagcdn.com/w40/in.png',
    cca2: 'IN'
  },
  {
    name: 'Canada',
    code: '+1',
    flag: 'https://flagcdn.com/w40/ca.png',
    cca2: 'CA'
  },
  {
    name: 'Australia',
    code: '+61',
    flag: 'https://flagcdn.com/w40/au.png',
    cca2: 'AU'
  },

  // Europe
  { name: 'Germany', code: '+49', flag: 'https://flagcdn.com/w40/de.png', cca2: 'DE' },
  { name: 'France', code: '+33', flag: 'https://flagcdn.com/w40/fr.png', cca2: 'FR' },
  { name: 'Italy', code: '+39', flag: 'https://flagcdn.com/w40/it.png', cca2: 'IT' },
  { name: 'Spain', code: '+34', flag: 'https://flagcdn.com/w40/es.png', cca2: 'ES' },
  { name: 'Netherlands', code: '+31', flag: 'https://flagcdn.com/w40/nl.png', cca2: 'NL' },
  { name: 'Belgium', code: '+32', flag: 'https://flagcdn.com/w40/be.png', cca2: 'BE' },
  { name: 'Switzerland', code: '+41', flag: 'https://flagcdn.com/w40/ch.png', cca2: 'CH' },
  { name: 'Sweden', code: '+46', flag: 'https://flagcdn.com/w40/se.png', cca2: 'SE' },
  { name: 'Norway', code: '+47', flag: 'https://flagcdn.com/w40/no.png', cca2: 'NO' },
  { name: 'Denmark', code: '+45', flag: 'https://flagcdn.com/w40/dk.png', cca2: 'DK' },
  { name: 'Finland', code: '+358', flag: 'https://flagcdn.com/w40/fi.png', cca2: 'FI' },
  { name: 'Poland', code: '+48', flag: 'https://flagcdn.com/w40/pl.png', cca2: 'PL' },
  { name: 'Portugal', code: '+351', flag: 'https://flagcdn.com/w40/pt.png', cca2: 'PT' },

  // Asia
  { name: 'China', code: '+86', flag: 'https://flagcdn.com/w40/cn.png', cca2: 'CN' },
  { name: 'Japan', code: '+81', flag: 'https://flagcdn.com/w40/jp.png', cca2: 'JP' },
  { name: 'South Korea', code: '+82', flag  : 'https://flagcdn.com/w40/kr.png', cca2: 'KR' },
  { name: 'Indonesia', code: '+62', flag: 'https://flagcdn.com/w40/id.png', cca2: 'ID' },
  { name: 'Thailand', code: '+66', flag: 'https://flagcdn.com/w40/th.png', cca2: 'TH' },
  { name: 'Vietnam', code: '+84', flag: 'https://flagcdn.com/w40/vn.png', cca2: 'VN' },
  { name: 'Philippines', code: '+63', flag: 'https://flagcdn.com/w40/ph.png', cca2: 'PH' },

  // Middle East
  { name: 'Saudi Arabia', code: '+966', flag: 'https://flagcdn.com/w40/sa.png', cca2: 'SA' },
  { name: 'United Arab Emirates', code: '+971', flag: 'https://flagcdn.com/w40/ae.png', cca2: 'AE' },
  { name: 'Qatar', code: '+974', flag: 'https://flagcdn.com/w40/qa.png', cca2: 'QA' },
  { name: 'Kuwait', code: '+965', flag: 'https://flagcdn.com/w40/kw.png', cca2: 'KW' },
  { name: 'Israel', code: '+972', flag: 'https://flagcdn.com/w40/il.png', cca2: 'IL' },

  // Africa
  { name: 'South Africa', code: '+27', flag : 'https://flagcdn.com/w40/za.png', cca2: 'ZA' },
  { name: 'Nigeria', code: '+234', flag: 'https://flagcdn.com/w40/ng.png', cca2: 'NG' },
  { name: 'Egypt', code: '+20', flag: 'https://flagcdn.com/w40/eg.png', cca2: 'EG' },
  { name: 'Kenya', code: '+254', flag: 'https://flagcdn.com/w40/ke.png', cca2: 'KE' },
  { name: 'Morocco', code: '+212', flag: 'https://flagcdn.com/w40/ma.png', cca2: 'MA' },

  // Americas
  { name: 'Brazil', code: '+55', flag: 'https://flagcdn.com/w40/br.png', cca2: 'BR' },
  { name: 'Mexico', code: '+52', flag: 'https://flagcdn.com/w40/mx.png', cca2: 'MX' },
  { name: 'Argentina', code: '+54', flag: 'https://flagcdn.com/w40/ar.png', cca2: 'AR' },
  { name: 'Colombia', code: '+57', flag : 'https://flagcdn.com/w40/co.png', cca2: 'CO' },
  { name: 'Chile', code: '+56', flag: 'https://flagcdn.com/w40/cl.png', cca2: 'CL' },

  // Oceania
  { name: 'New Zealand', code: '+64', flag: 'https://flagcdn.com/w40/nz.png', cca2: 'NZ' },
  { name: 'Fiji', code: '+679', flag: 'https://flagcdn.com/w40/fj.png', cca2: 'FJ' }
];