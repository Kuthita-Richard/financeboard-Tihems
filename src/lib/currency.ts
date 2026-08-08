/**
 * lib/currency.ts — Currency conversion utilities
 *
 * API: ExchangeRate-API open endpoint (open.er-api.com)
 *   - Zero API key required — no environment variables, no signup
 *   - 161 currencies including all major African currencies (KES, NGN, GHS, UGX, TZS)
 *   - Daily ECB reference rates — accurate for reporting dashboards
 *   - Rate limit: generous, well within any normal usage pattern
 *
 * Rates are cached for 1 hour server-side via Next.js unstable_cache.
 * This means at most ~24 API calls per day regardless of user count.
 *
 * Usage:
 *   const rates = await getExchangeRates('KES')
 *   const usd   = convertAmount(10000, rates, 'USD')  // KES 10,000 → USD
 */

import { unstable_cache } from 'next/cache'

const API_BASE = 'https://open.er-api.com/v6/latest'

export interface ExchangeRates {
  base:      string            // ISO 4217 base currency code e.g. "USD"
  rates:     Record<string, number>
  updatedAt: string            // human-readable last update date
}

// ── Internal fetch ────────────────────────────────────────────
async function _fetchRates(baseCurrency: string): Promise<ExchangeRates> {
  try {
    const res = await fetch(`${API_BASE}/${baseCurrency.toUpperCase()}`, {
      next: { revalidate: 3600 }, // Next.js fetch cache — 1 hour
    })

    if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`)

    const json = await res.json()

    return {
      base:      json.base_code ?? baseCurrency,
      rates:     json.rates ?? {},
      updatedAt: json.time_last_update_utc ?? '',
    }
  } catch {
    // Fallback: identity rates (no conversion) so the app doesn't break
    // if the exchange rate API is temporarily unreachable
    return {
      base:      baseCurrency,
      rates:     { [baseCurrency]: 1 },
      updatedAt: 'unavailable',
    }
  }
}

/**
 * Fetch exchange rates for a given base currency.
 * Cached for 1 hour via unstable_cache + Next.js fetch cache.
 * Falls back gracefully if the API is unreachable.
 */
export const getExchangeRates = unstable_cache(
  async (baseCurrency: string): Promise<ExchangeRates> =>
    _fetchRates(baseCurrency),
  ['exchange-rates'],
  { tags: ['exchange-rates'], revalidate: 3600 }
)

/**
 * Convert an amount from the base currency to a target currency.
 * Returns the original amount unchanged if the target rate is unavailable.
 */
export function convertAmount(
  amount:         number,
  rates:          ExchangeRates,
  targetCurrency: string
): number {
  if (targetCurrency === rates.base) return amount
  const rate = rates.rates[targetCurrency]
  if (!rate) return amount
  return amount * rate
}

/**
 * Get the display symbol for a given ISO currency code.
 * Falls back to the code itself if not found.
 */
export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? code
}

// ── Supported currencies ──────────────────────────────────────
/**
 * Curated list of 40 currencies covering all major regions.
 * All codes are supported by the ExchangeRate-API open endpoint.
 */
export const CURRENCIES: { code: string; symbol: string; name: string; flag: string }[] = [
  // Africa
  { code: 'KES', symbol: 'KSh',  name: 'Kenyan Shilling',       flag: '🇰🇪' },
  { code: 'NGN', symbol: '₦',    name: 'Nigerian Naira',         flag: '🇳🇬' },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand',     flag: '🇿🇦' },
  { code: 'GHS', symbol: 'GH₵',  name: 'Ghanaian Cedi',          flag: '🇬🇭' },
  { code: 'UGX', symbol: 'USh',  name: 'Ugandan Shilling',       flag: '🇺🇬' },
  { code: 'TZS', symbol: 'TSh',  name: 'Tanzanian Shilling',     flag: '🇹🇿' },
  { code: 'RWF', symbol: 'Fr',   name: 'Rwandan Franc',          flag: '🇷🇼' },
  { code: 'ETB', symbol: 'Br',   name: 'Ethiopian Birr',         flag: '🇪🇹' },
  { code: 'EGP', symbol: 'E£',   name: 'Egyptian Pound',         flag: '🇪🇬' },
  { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham',        flag: '🇲🇦' },
  { code: 'XOF', symbol: 'CFA',  name: 'West African CFA Franc', flag: '🌍' },

  // Americas
  { code: 'USD', symbol: '$',    name: 'US Dollar',              flag: '🇺🇸' },
  { code: 'CAD', symbol: 'C$',   name: 'Canadian Dollar',        flag: '🇨🇦' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso',           flag: '🇲🇽' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',         flag: '🇧🇷' },
  { code: 'ARS', symbol: 'AR$',  name: 'Argentine Peso',         flag: '🇦🇷' },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso',           flag: '🇨🇱' },

  // Europe
  { code: 'EUR', symbol: '€',    name: 'Euro',                   flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',    name: 'British Pound',          flag: '🇬🇧' },
  { code: 'CHF', symbol: 'Fr',   name: 'Swiss Franc',            flag: '🇨🇭' },
  { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona',          flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone',        flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr',   name: 'Danish Krone',           flag: '🇩🇰' },
  { code: 'PLN', symbol: 'zł',   name: 'Polish Złoty',           flag: '🇵🇱' },
  { code: 'CZK', symbol: 'Kč',   name: 'Czech Koruna',           flag: '🇨🇿' },
  { code: 'TRY', symbol: '₺',    name: 'Turkish Lira',           flag: '🇹🇷' },

  // Asia-Pacific
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',           flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan',           flag: '🇨🇳' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee',           flag: '🇮🇳' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar',      flag: '🇦🇺' },
  { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar',     flag: '🇳🇿' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar',       flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar',       flag: '🇭🇰' },
  { code: 'KRW', symbol: '₩',    name: 'South Korean Won',       flag: '🇰🇷' },
  { code: 'THB', symbol: '฿',    name: 'Thai Baht',              flag: '🇹🇭' },
  { code: 'MYR', symbol: 'RM',   name: 'Malaysian Ringgit',      flag: '🇲🇾' },
  { code: 'IDR', symbol: 'Rp',   name: 'Indonesian Rupiah',      flag: '🇮🇩' },
  { code: 'PHP', symbol: '₱',    name: 'Philippine Peso',        flag: '🇵🇭' },

  // Middle East
  { code: 'AED', symbol: 'د.إ',  name: 'UAE Dirham',             flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼',    name: 'Saudi Riyal',            flag: '🇸🇦' },
  { code: 'ILS', symbol: '₪',    name: 'Israeli Shekel',         flag: '🇮🇱' },
]
