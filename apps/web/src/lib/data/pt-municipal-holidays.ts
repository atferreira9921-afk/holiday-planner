// Portuguese municipal holidays (feriados municipais)
// Keyed by lowercase city name. Each entry is { month, day, name }.
// These are not in Nager.Date — they must be injected separately.

export interface MunicipalHoliday {
  month: number;
  day: number;
  name: string;
  localName: string;
}

const PT_MUNICIPAL: Record<string, MunicipalHoliday[]> = {
  aveiro:            [{ month: 5,  day: 12, name: "Aveiro City Day",           localName: "Nossa Senhora da Apresentação" }],
  beja:              [{ month: 2,  day: 21, name: "Beja City Day",             localName: "Padroeira de Beja" }],
  braga:             [{ month: 6,  day: 23, name: "Braga City Day",            localName: "Véspera de São João" }],
  bragança:          [{ month: 8,  day: 22, name: "Bragança City Day",         localName: "Padroeiro de Bragança" }],
  "castelo branco":  [{ month: 6,  day: 16, name: "Castelo Branco City Day",   localName: "Santa Isabel" }],
  coimbra:           [{ month: 7,  day: 4,  name: "Coimbra City Day",          localName: "Dia da Cidade de Coimbra" }],
  covilhã:           [{ month: 6,  day: 9,  name: "Covilhã City Day",          localName: "Padroeiro da Covilhã" }],
  évora:             [{ month: 6,  day: 29, name: "Évora City Day",            localName: "São Pedro" }],
  evora:             [{ month: 6,  day: 29, name: "Évora City Day",            localName: "São Pedro" }],
  faro:              [{ month: 9,  day: 7,  name: "Faro City Day",             localName: "Dia do Município de Faro" }],
  guarda:            [{ month: 10, day: 27, name: "Guarda City Day",           localName: "Padroeira da Guarda" }],
  guimarães:         [{ month: 6,  day: 24, name: "Guimarães City Day",        localName: "São João" }],
  guimaraes:         [{ month: 6,  day: 24, name: "Guimarães City Day",        localName: "São João" }],
  leiria:            [{ month: 5,  day: 22, name: "Leiria City Day",           localName: "Nossa Senhora da Encarnação" }],
  lisboa:            [{ month: 6,  day: 13, name: "Lisbon City Day",           localName: "Santo António" }],
  lisbon:            [{ month: 6,  day: 13, name: "Lisbon City Day",           localName: "Santo António" }],
  portalegre:        [{ month: 5,  day: 23, name: "Portalegre City Day",       localName: "Nossa Senhora da Esperança" }],
  porto:             [{ month: 6,  day: 24, name: "Porto City Day",            localName: "São João" }],
  santarém:          [{ month: 3,  day: 15, name: "Santarém City Day",         localName: "Mártires de Marrocos" }],
  santarem:          [{ month: 3,  day: 15, name: "Santarém City Day",         localName: "Mártires de Marrocos" }],
  setúbal:           [{ month: 9,  day: 15, name: "Setúbal City Day",          localName: "Nossa Senhora da Boa Viagem" }],
  setubal:           [{ month: 9,  day: 15, name: "Setúbal City Day",          localName: "Nossa Senhora da Boa Viagem" }],
  "viana do castelo":[{ month: 8,  day: 20, name: "Viana do Castelo City Day", localName: "Nossa Senhora da Agonia" }],
  "vila real":       [{ month: 6,  day: 13, name: "Vila Real City Day",        localName: "Santo António" }],
  viseu:             [{ month: 3,  day: 27, name: "Viseu City Day",            localName: "São Teotônio" }],
  funchal:           [{ month: 7,  day: 1,  name: "Madeira Day",               localName: "Dia da Região Autónoma da Madeira" }],
};

// PT ISO 3166-2 district code → main city name (for fallback when home_city_name is not set)
const PT_REGION_TO_CITY: Record<string, string> = {
  "PT-01": "aveiro",
  "PT-02": "beja",
  "PT-03": "braga",
  "PT-04": "bragança",
  "PT-05": "castelo branco",
  "PT-06": "coimbra",
  "PT-07": "évora",
  "PT-08": "faro",
  "PT-09": "guarda",
  "PT-10": "leiria",
  "PT-11": "lisboa",
  "PT-12": "portalegre",
  "PT-13": "porto",
  "PT-14": "santarém",
  "PT-15": "setúbal",
  "PT-16": "viana do castelo",
  "PT-17": "vila real",
  "PT-18": "viseu",
  "PT-30": "funchal",
};

/**
 * Returns synthetic PublicHoliday-shaped objects for a given city/region and year.
 * Falls back from cityName → region code → empty if neither matches.
 * Returns [] if not in Portugal or no known municipal holiday.
 */
export function getMunicipalHolidays(
  cityName: string | null | undefined,
  country: string,
  year: number,
  region?: string | null,
): { date: string; name: string; localName: string; counties: null; global: false; is_fixed: true }[] {
  if (country !== "PT") return [];
  // Try city name first, then fall back to region → city mapping
  const key = cityName?.toLowerCase().trim()
    ?? (region ? PT_REGION_TO_CITY[region] : undefined);
  if (!key) return [];
  const entries = PT_MUNICIPAL[key] ?? [];
  return entries.map(e => ({
    date: `${year}-${String(e.month).padStart(2, "0")}-${String(e.day).padStart(2, "0")}`,
    name: e.name,
    localName: e.localName,
    counties: null,
    global: false as const,
    is_fixed: true as const,
  }));
}
