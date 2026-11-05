import { CITY_SUGGESTIONS } from './cities'

// Every country, with the most-searched ones first. Free-text entry still
// works for cities or regions.
const POPULAR = ['India', 'United States', 'United Kingdom', 'Canada', 'Germany', 'Singapore', 'Australia', 'United Arab Emirates']

const ALL_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin',
  'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini',
  'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia',
  'Georgia', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary',
  'Iceland', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
  'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos',
  'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives',
  'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
  'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands',
  'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Puerto Rico', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
  'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
  'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
  'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
]

export const LOCATION_SUGGESTIONS = ['Remote / Worldwide', ...POPULAR, ...ALL_COUNTRIES, ...CITY_SUGGESTIONS]

const COUNTRY_SET = new Set([...POPULAR, ...ALL_COUNTRIES].map((c) => c.toLowerCase()))

// Cities that jobs are often written with another name for.
export const CITY_ALIASES = {
  bengaluru: ['bangalore'], gurgaon: ['gurugram'], mumbai: ['bombay'], chennai: ['madras'], kolkata: ['calcutta'],
  'new delhi': ['delhi', 'ncr'], delhi: ['new delhi', 'ncr'], pune: ['poona'], kochi: ['cochin'], thiruvananthapuram: ['trivandrum'],
  vadodara: ['baroda'], mysuru: ['mysore'], visakhapatnam: ['vizag'], 'greater noida': ['noida'], noida: ['greater noida'],
  'new york city': ['new york', 'nyc'], 'san francisco': ['sf', 'bay area'], 'ho chi minh city': ['saigon'], 'mexico city': ['cdmx'],
  'são paulo': ['sao paulo'], 'zürich': ['zurich'], 'münchen': ['munich'], 'köln': ['cologne'], 'kyiv': ['kiev'],
}

/** "Gurgaon, India" -> { city: 'Gurgaon', country: 'India' }; "India" -> { country: 'India' }; other text -> { text }. */
export function parseLocation(chip = '') {
  const t = String(chip).trim()
  const i = t.lastIndexOf(',')
  if (i > 0) {
    const country = t.slice(i + 1).trim()
    if (COUNTRY_SET.has(country.toLowerCase())) return { city: t.slice(0, i).trim(), country }
  }
  if (COUNTRY_SET.has(t.toLowerCase())) return { country: t }
  return { text: t }
}

/** Every spelling worth matching for a city. */
export const cityVariants = (city) => [city.toLowerCase(), ...(CITY_ALIASES[city.toLowerCase()] ?? [])]
