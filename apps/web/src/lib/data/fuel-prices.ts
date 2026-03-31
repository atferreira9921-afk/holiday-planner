/**
 * Average retail petrol (95 octane) prices in EUR per litre.
 * Source: GlobalPetrolPrices.com, European Commission weekly oil bulletin — Q1 2025.
 * Non-euro prices converted at representative exchange rates.
 * Used as default fill value when a user adds a car; they can always override it.
 */
export const FUEL_PRICES_EUR_PER_LITRE: Record<string, number> = {
  // ── Western Europe ──────────────────────────────────────────────────────────
  AD: 1.42, // Andorra (low-tax, but still higher than often quoted)
  AT: 1.62, // Austria
  BE: 1.78, // Belgium
  CH: 1.95, // Switzerland
  CY: 1.52, // Cyprus
  DE: 1.88, // Germany
  DK: 1.98, // Denmark
  ES: 1.72, // Spain
  FI: 1.92, // Finland
  FR: 1.92, // France
  GB: 1.65, // UK (£1.42 ≈ €1.65 at 2025 rates)
  GI: 1.28, // Gibraltar
  GR: 1.92, // Greece
  IE: 1.88, // Ireland
  IS: 2.15, // Iceland
  IT: 1.90, // Italy
  LI: 1.90, // Liechtenstein
  LU: 1.55, // Luxembourg (lowest tax in EU, but not as low as often cited)
  MC: 1.88, // Monaco
  MT: 1.58, // Malta
  NL: 2.12, // Netherlands (consistently among highest in EU)
  NO: 2.38, // Norway (NOK — among the highest in Europe)
  PT: 1.85, // Portugal
  SE: 1.82, // Sweden (SEK converted)
  SM: 1.90, // San Marino

  // ── Central & Eastern Europe ─────────────────────────────────────────────
  AL: 1.55, // Albania
  BA: 1.52, // Bosnia
  BG: 1.55, // Bulgaria
  BY: 0.78, // Belarus (state-controlled)
  CZ: 1.52, // Czechia (CZK)
  EE: 1.68, // Estonia
  HR: 1.62, // Croatia
  HU: 1.58, // Hungary (HUF — partially regulated)
  KZ: 0.65, // Kazakhstan
  LT: 1.58, // Lithuania
  LV: 1.60, // Latvia
  MD: 1.45, // Moldova
  ME: 1.58, // Montenegro
  MK: 1.52, // North Macedonia
  PL: 1.52, // Poland (PLN)
  RO: 1.52, // Romania (RON)
  RS: 1.60, // Serbia (RSD)
  RU: 0.78, // Russia (RUB — subsidised)
  SI: 1.55, // Slovenia
  SK: 1.58, // Slovakia
  UA: 1.35, // Ukraine

  // ── Middle East & North Africa ───────────────────────────────────────────
  AE: 0.88, // UAE (subsidised)
  BH: 0.58, // Bahrain
  DZ: 0.42, // Algeria (heavily subsidised)
  EG: 0.48, // Egypt (subsidised)
  IL: 1.98, // Israel
  IQ: 0.65, // Iraq (subsidised)
  IR: 0.15, // Iran (heavily subsidised)
  JO: 1.18, // Jordan
  KW: 0.42, // Kuwait (subsidised)
  LB: 1.45, // Lebanon
  LY: 0.10, // Libya (heavily subsidised)
  MA: 1.38, // Morocco
  OM: 0.62, // Oman
  QA: 0.65, // Qatar
  SA: 0.52, // Saudi Arabia (subsidised)
  SY: 0.95, // Syria
  TN: 0.95, // Tunisia
  TR: 1.35, // Turkey (TRY — after currency depreciation adjustment)
  YE: 0.92, // Yemen

  // ── Sub-Saharan Africa ───────────────────────────────────────────────────
  AO: 0.78, // Angola
  CM: 1.05, // Cameroon
  CI: 1.12, // Ivory Coast
  ET: 1.05, // Ethiopia
  GH: 1.15, // Ghana (GHS)
  KE: 1.28, // Kenya
  MG: 1.35, // Madagascar
  MZ: 1.10, // Mozambique
  NA: 1.18, // Namibia
  NG: 0.68, // Nigeria (partially subsidised)
  SN: 1.12, // Senegal
  TZ: 1.22, // Tanzania
  UG: 1.28, // Uganda
  ZA: 1.18, // South Africa (ZAR)
  ZM: 1.32, // Zambia
  ZW: 1.42, // Zimbabwe

  // ── South & Southeast Asia ──────────────────────────────────────────────
  BD: 0.92, // Bangladesh
  ID: 0.70, // Indonesia (subsidised)
  IN: 1.08, // India (INR — varies by state)
  KH: 1.18, // Cambodia
  LK: 1.15, // Sri Lanka
  MM: 0.98, // Myanmar
  MY: 0.48, // Malaysia (heavily subsidised — RON95 capped)
  NP: 1.05, // Nepal
  PH: 1.18, // Philippines
  PK: 0.98, // Pakistan
  SG: 2.28, // Singapore (consistently among most expensive in Asia)
  TH: 1.12, // Thailand
  VN: 1.10, // Vietnam

  // ── East Asia & Pacific ─────────────────────────────────────────────────
  AU: 1.42, // Australia (AUD — varies significantly by state)
  CN: 0.98, // China (state-controlled)
  HK: 2.65, // Hong Kong (highest in Asia)
  JP: 1.45, // Japan (JPY — rose sharply since 2022)
  KR: 1.58, // South Korea (KRW)
  NZ: 1.55, // New Zealand (NZD)
  TW: 1.08, // Taiwan

  // ── Americas ────────────────────────────────────────────────────────────
  AR: 1.05, // Argentina (ARS — volatile, adjusted for recent deregulation)
  BO: 0.52, // Bolivia (heavily subsidised)
  BR: 1.15, // Brazil (BRL — Petrobras pricing)
  CA: 1.22, // Canada (CAD — varies by province, BC/ON avg)
  CL: 1.25, // Chile
  CO: 0.95, // Colombia (partially subsidised)
  CR: 1.12, // Costa Rica
  CU: 0.82, // Cuba
  DO: 1.15, // Dominican Republic
  EC: 0.68, // Ecuador (subsidised)
  GT: 1.12, // Guatemala
  HN: 1.18, // Honduras
  MX: 1.12, // Mexico (MXN — IEPS tax partially offsets subsidy)
  NI: 1.25, // Nicaragua
  PA: 0.98, // Panama
  PE: 1.22, // Peru
  PY: 1.12, // Paraguay
  SV: 1.18, // El Salvador
  US: 1.05, // USA (avg $3.95/gal ÷ 3.785 × 1.01 USD/EUR)
  UY: 1.52, // Uruguay
  VE: 0.02, // Venezuela (essentially free — subsidised)
};

/** Returns the average fuel price (€/L) for a given ISO country code. */
export function getFuelPrice(countryCode: string): number | null {
  return FUEL_PRICES_EUR_PER_LITRE[countryCode.toUpperCase()] ?? null;
}

/** Returns a display label for the fuel price with country name. */
export function getFuelPriceLabel(countryCode: string, countryName: string): string {
  const price = getFuelPrice(countryCode);
  if (!price) return "";
  return `${countryName} avg: €${price.toFixed(2)}/L`;
}
