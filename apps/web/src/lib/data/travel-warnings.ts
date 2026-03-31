export type WarningLevel = 'none' | 'normal' | 'high' | 'avoid_non_essential' | 'avoid_all';

export interface TravelWarning {
  level: WarningLevel;
  summary: string;
  source: string;
}

export const TRAVEL_WARNINGS: Record<string, TravelWarning> = {
  // Safe / normal destinations
  PT: {
    level: 'normal',
    summary: 'Portugal is generally safe for travellers. Exercise normal precautions against petty theft in tourist areas.',
    source: 'FCO / State Dept',
  },
  ES: {
    level: 'normal',
    summary: 'Spain is safe for travellers. Be alert to pickpockets in crowded tourist areas and markets.',
    source: 'FCO / State Dept',
  },
  FR: {
    level: 'normal',
    summary: 'France is safe for travellers. Remain vigilant in major cities and around tourist attractions.',
    source: 'FCO / State Dept',
  },
  DE: {
    level: 'normal',
    summary: 'Germany is safe for travellers. Exercise normal precautions in major cities.',
    source: 'FCO / State Dept',
  },
  IT: {
    level: 'normal',
    summary: 'Italy is safe for travellers. Be aware of pickpockets around popular tourist sites.',
    source: 'FCO / State Dept',
  },
  GB: {
    level: 'normal',
    summary: 'The United Kingdom is safe for travellers. Remain vigilant in crowded public areas.',
    source: 'FCO / State Dept',
  },
  NL: {
    level: 'normal',
    summary: 'The Netherlands is safe for travellers. Exercise standard precautions in city centres.',
    source: 'FCO / State Dept',
  },
  BE: {
    level: 'normal',
    summary: 'Belgium is safe for travellers. Remain alert in busy tourist and transit areas.',
    source: 'FCO / State Dept',
  },
  CH: {
    level: 'normal',
    summary: 'Switzerland is one of the safest countries in the world. Exercise standard precautions.',
    source: 'FCO / State Dept',
  },
  AT: {
    level: 'normal',
    summary: 'Austria is safe for travellers. Exercise normal precautions, especially in busy tourist areas.',
    source: 'FCO / State Dept',
  },
  PL: {
    level: 'normal',
    summary: 'Poland is generally safe. Be aware of petty theft in major cities and at transport hubs.',
    source: 'FCO / State Dept',
  },
  CZ: {
    level: 'normal',
    summary: 'Czechia is safe for travellers. Watch for pickpockets in Prague\'s tourist districts.',
    source: 'FCO / State Dept',
  },
  GR: {
    level: 'normal',
    summary: 'Greece is safe for travellers. Be aware of petty crime in tourist areas and on public transport.',
    source: 'FCO / State Dept',
  },
  HR: {
    level: 'normal',
    summary: 'Croatia is safe for travellers. Exercise standard precautions in busy coastal resorts.',
    source: 'FCO / State Dept',
  },
  JP: {
    level: 'normal',
    summary: 'Japan has one of the lowest crime rates in the world. Exercise standard precautions.',
    source: 'FCO / State Dept',
  },
  SG: {
    level: 'normal',
    summary: 'Singapore is very safe for travellers. Strict laws apply — be aware of local regulations.',
    source: 'FCO / State Dept',
  },
  AU: {
    level: 'normal',
    summary: 'Australia is safe for travellers. Take precautions for natural hazards and wildlife.',
    source: 'FCO / State Dept',
  },
  NZ: {
    level: 'normal',
    summary: 'New Zealand is very safe for travellers. Prepare for volcanic and seismic activity.',
    source: 'FCO / State Dept',
  },
  CA: {
    level: 'normal',
    summary: 'Canada is safe for travellers. Exercise standard precautions in urban areas.',
    source: 'FCO / State Dept',
  },

  // Elevated / high caution
  TR: {
    level: 'high',
    summary: 'Exercise increased caution. There is a risk of terrorism throughout Turkey; border areas with Syria and Iraq carry heightened risk.',
    source: 'FCO / State Dept',
  },
  MA: {
    level: 'normal',
    summary: 'Morocco is generally safe. Be alert to petty theft in medinas and exercise caution in remote border areas.',
    source: 'FCO / State Dept',
  },
  EG: {
    level: 'high',
    summary: 'Exercise increased caution in Egypt. Terrorism risk exists in the Sinai Peninsula and Western Desert; avoid these areas.',
    source: 'FCO / State Dept',
  },
  TH: {
    level: 'normal',
    summary: 'Thailand is generally safe for tourists. Avoid the southern border provinces where there is ongoing insurgency.',
    source: 'FCO / State Dept',
  },
  ID: {
    level: 'normal',
    summary: 'Indonesia is generally safe. Be aware of natural disasters (earthquakes, volcanoes) and terrorist threat in some regions.',
    source: 'FCO / State Dept',
  },
  AE: {
    level: 'normal',
    summary: 'The UAE is safe for travellers. Respect local customs and laws; some activities legal elsewhere are prohibited.',
    source: 'FCO / State Dept',
  },
  IN: {
    level: 'high',
    summary: 'Exercise increased caution. Avoid Jammu & Kashmir (except Ladakh), border areas with Pakistan and China, and some northeast states.',
    source: 'FCO / State Dept',
  },
  CN: {
    level: 'high',
    summary: 'Exercise increased caution in China. Arbitrary enforcement of laws, exit bans, and surveillance of foreigners have been reported.',
    source: 'FCO / State Dept',
  },
  BR: {
    level: 'high',
    summary: 'Exercise increased caution due to high levels of violent crime, particularly in major cities and favela areas.',
    source: 'FCO / State Dept',
  },
  MX: {
    level: 'high',
    summary: 'Exercise increased caution. Drug cartel violence is prevalent in many states; some regions are rated avoid non-essential travel.',
    source: 'FCO / State Dept',
  },
  ZA: {
    level: 'high',
    summary: 'Exercise increased caution. South Africa has high crime rates including violent crime; avoid isolated areas at night.',
    source: 'FCO / State Dept',
  },
  US: {
    level: 'normal',
    summary: 'The US is generally safe for travellers. Maintain awareness of surroundings in urban areas.',
    source: 'FCO / State Dept',
  },
  PK: {
    level: 'avoid_non_essential',
    summary: 'Avoid non-essential travel to most of Pakistan. Terrorism, kidnapping and sectarian violence are serious risks; border regions with Afghanistan are particularly dangerous.',
    source: 'FCO / State Dept',
  },
  NG: {
    level: 'avoid_non_essential',
    summary: 'Avoid non-essential travel to many parts of Nigeria. Terrorism, kidnapping and violent crime are significant risks, especially in northern states and the Niger Delta.',
    source: 'FCO / State Dept',
  },
  KE: {
    level: 'high',
    summary: 'Exercise increased caution in Kenya. Terrorism risk, especially in coastal areas and near the Somali border; crime in Nairobi.',
    source: 'FCO / State Dept',
  },
  ET: {
    level: 'avoid_non_essential',
    summary: 'Avoid non-essential travel to Ethiopia. Active armed conflicts in Tigray, Amhara and Oromia regions; civil unrest throughout the country.',
    source: 'FCO / State Dept',
  },
  TZ: {
    level: 'normal',
    summary: 'Tanzania including Zanzibar is generally safe for tourists. Exercise standard precautions and be aware of petty crime.',
    source: 'FCO / State Dept',
  },

  // Avoid non-essential / avoid all
  RU: {
    level: 'avoid_all',
    summary: 'Do not travel to Russia. The ongoing war in Ukraine and heightened risk of arbitrary detention of foreign nationals make travel extremely dangerous.',
    source: 'FCO / State Dept',
  },
  UA: {
    level: 'avoid_all',
    summary: 'Do not travel to Ukraine due to the ongoing full-scale Russian military invasion. Active combat, missile strikes and drone attacks occur across the country.',
    source: 'FCO / State Dept',
  },
  SY: {
    level: 'avoid_all',
    summary: 'Do not travel to Syria. The country remains extremely dangerous due to ongoing armed conflict, terrorism and the risk of arbitrary detention.',
    source: 'FCO / State Dept',
  },
  YE: {
    level: 'avoid_all',
    summary: 'Do not travel to Yemen. Ongoing civil war, airstrikes, terrorism, and humanitarian crisis make travel extremely dangerous.',
    source: 'FCO / State Dept',
  },
  IQ: {
    level: 'avoid_non_essential',
    summary: 'Avoid non-essential travel to Iraq. Terrorism and armed conflict pose serious risks; the Kurdistan Region is comparatively safer but still elevated.',
    source: 'FCO / State Dept',
  },
  LY: {
    level: 'avoid_all',
    summary: 'Do not travel to Libya. Ongoing armed conflict, terrorism and kidnapping make all travel extremely dangerous.',
    source: 'FCO / State Dept',
  },
  SD: {
    level: 'avoid_all',
    summary: 'Do not travel to Sudan. Active armed conflict erupted in April 2023; widespread violence, atrocities and humanitarian crisis are ongoing.',
    source: 'FCO / State Dept',
  },
  SO: {
    level: 'avoid_all',
    summary: 'Do not travel to Somalia. Al-Shabaab terrorism, piracy, civil unrest and kidnapping make the entire country extremely dangerous.',
    source: 'FCO / State Dept',
  },
  AF: {
    level: 'avoid_all',
    summary: 'Do not travel to Afghanistan. Terrorism, kidnapping, civil unrest and Taliban governance pose extreme risks to all travellers.',
    source: 'FCO / State Dept',
  },
  MM: {
    level: 'avoid_non_essential',
    summary: 'Avoid non-essential travel to Myanmar (Burma). Military coup, civil conflict and arbitrary detention of foreigners are serious risks.',
    source: 'FCO / State Dept',
  },
  KP: {
    level: 'avoid_all',
    summary: 'Do not travel to North Korea. Arbitrary enforcement of laws, risk of detention and no consular access for most nationalities.',
    source: 'FCO / State Dept',
  },
  VE: {
    level: 'avoid_non_essential',
    summary: 'Avoid non-essential travel to Venezuela. High levels of violent crime, political instability and economic crisis pose serious risks.',
    source: 'FCO / State Dept',
  },
  HT: {
    level: 'avoid_all',
    summary: 'Do not travel to Haiti. Widespread gang violence, kidnapping and political instability make travel extremely dangerous.',
    source: 'FCO / State Dept',
  },
};

export const WARNING_LABELS: Record<WarningLevel, string> = {
  none:                 "No advisory — safe to travel",
  normal:              "Normal precautions",
  high:                "Exercise increased caution",
  avoid_non_essential: "Avoid non-essential travel",
  avoid_all:           "Do not travel",
};

export function getWarning(code: string): TravelWarning {
  return (
    TRAVEL_WARNINGS[code.toUpperCase()] ?? {
      level: 'normal',
      summary: 'No specific travel advisory. Exercise normal precautions.',
      source: 'FCO / State Dept',
    }
  );
}

export const WARNING_COLORS: Record<WarningLevel, { bg: string; text: string; border: string }> = {
  none: {
    bg: '#f0fdf4',
    text: '#15803d',
    border: '#86efac',
  },
  normal: {
    bg: '#f0fdf4',
    text: '#15803d',
    border: '#86efac',
  },
  high: {
    bg: '#fefce8',
    text: '#a16207',
    border: '#fde047',
  },
  avoid_non_essential: {
    bg: '#fff7ed',
    text: '#c2410c',
    border: '#fdba74',
  },
  avoid_all: {
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#fca5a5',
  },
};
