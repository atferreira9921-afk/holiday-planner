export interface TripTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  destination_city: string;
  destination_country: string;
  suggested_duration_days: number;
  vehicle_type: 'flight' | 'car' | 'bus';
  budget_per_person_eur: number;
  destination_hint: string;
  packing_template: 'Beach trip' | 'City break' | 'Mountains' | 'Road trip';
  highlights: string[];
}

export const TRIP_TEMPLATES: TripTemplate[] = [
  {
    id: 'weekend-seville',
    name: 'Weekend in Seville',
    emoji: '💃',
    description:
      'Immerse yourself in flamenco, tapas and Moorish architecture in the beating heart of Andalusia.',
    destination_city: 'Seville',
    destination_country: 'ES',
    suggested_duration_days: 3,
    vehicle_type: 'flight',
    budget_per_person_eur: 350,
    destination_hint: 'Seville, Spain',
    packing_template: 'City break',
    highlights: [
      'Explore the stunning Alcázar palace and its lush gardens',
      'Wander the narrow lanes of the Santa Cruz old quarter',
      'Watch a live flamenco show in an intimate tablao',
      'Taste authentic tapas with a glass of local fino sherry',
      'Climb La Giralda tower for panoramic views of the city',
    ],
  },
  {
    id: 'algarve-road-trip',
    name: 'Lisbon to Algarve Road Trip',
    emoji: '🚗',
    description:
      'Drive south from Lisbon along the Portuguese coast, ending on the golden cliffs and beaches of the Algarve.',
    destination_city: 'Faro',
    destination_country: 'PT',
    suggested_duration_days: 7,
    vehicle_type: 'car',
    budget_per_person_eur: 600,
    destination_hint: 'Algarve, Portugal',
    packing_template: 'Road trip',
    highlights: [
      'Stop at Setúbal and the Arrábida natural park for dramatic coastal scenery',
      'Visit the medieval walled city of Évora in the Alentejo',
      'Discover the hidden sea caves and arches near Lagos',
      'Relax on Praia da Marinha, one of Europe\'s most beautiful beaches',
      'Sample fresh seafood cataplana and local wines along the way',
    ],
  },
  {
    id: 'amsterdam-city-break',
    name: 'Amsterdam City Break',
    emoji: '🚲',
    description:
      'Cycle along scenic canals, visit world-class museums and soak up the relaxed Dutch way of life.',
    destination_city: 'Amsterdam',
    destination_country: 'NL',
    suggested_duration_days: 3,
    vehicle_type: 'flight',
    budget_per_person_eur: 500,
    destination_hint: 'Amsterdam, Netherlands',
    packing_template: 'City break',
    highlights: [
      'Explore the Rijksmuseum and Van Gogh Museum',
      'Take a guided canal boat tour through the historic centre',
      'Visit the Anne Frank House for a moving historical experience',
      'Browse the vibrant Albert Cuyp street market',
      'Day trip to windmill village Zaanse Schans',
    ],
  },
  {
    id: 'madeira-escape',
    name: 'Madeira Island Escape',
    emoji: '🌺',
    description:
      'Discover the lush volcanic island of Madeira — rugged mountains, levada walks and exotic gardens.',
    destination_city: 'Funchal',
    destination_country: 'PT',
    suggested_duration_days: 7,
    vehicle_type: 'flight',
    budget_per_person_eur: 750,
    destination_hint: 'Funchal, Madeira',
    packing_template: 'Mountains',
    highlights: [
      'Hike along the ancient levada (irrigation channel) trails through laurel forest',
      'Take the famous Monte Palace tropical garden cable car',
      'Go whale and dolphin watching in the Atlantic',
      'Try local specialities: espada fish, poncha and bolo do caco bread',
      'Explore the old town and visit the colourful Mercado dos Lavradores',
    ],
  },
  {
    id: 'swiss-alps-hiking',
    name: 'Swiss Alps Hiking',
    emoji: '🏔️',
    description:
      'Trek through some of the most spectacular mountain scenery in Europe, with iconic views of the Matterhorn and Eiger.',
    destination_city: 'Zermatt',
    destination_country: 'CH',
    suggested_duration_days: 7,
    vehicle_type: 'flight',
    budget_per_person_eur: 1800,
    destination_hint: 'Zermatt, Switzerland',
    packing_template: 'Mountains',
    highlights: [
      'Hike to the Gornergrat viewpoint for up-close Matterhorn views',
      'Walk the iconic Haute Route between Zermatt and Chamonix',
      'Take the Jungfraujoch cogwheel train to the "Top of Europe"',
      'Enjoy Swiss fondue and raclette in a traditional mountain hut',
      'Explore car-free Zermatt village on foot or by electric taxi',
    ],
  },
  {
    id: 'rome-cultural-tour',
    name: 'Rome Cultural Tour',
    emoji: '🏛️',
    description:
      'Walk through 2,500 years of history in the Eternal City — ancient ruins, Renaissance art and world-class cuisine.',
    destination_city: 'Rome',
    destination_country: 'IT',
    suggested_duration_days: 5,
    vehicle_type: 'flight',
    budget_per_person_eur: 800,
    destination_hint: 'Rome, Italy',
    packing_template: 'City break',
    highlights: [
      'Visit the Colosseum, Roman Forum and Palatine Hill',
      'Explore Vatican City — St. Peter\'s Basilica and the Sistine Chapel',
      'Toss a coin in the Trevi Fountain at sunrise before the crowds',
      'Discover Baroque piazzas: Navona, del Popolo and Campo de\' Fiori',
      'Eat your way through Trastevere for authentic Roman pasta and wine',
    ],
  },
  {
    id: 'tokyo-adventure',
    name: 'Tokyo Adventure',
    emoji: '🗼',
    description:
      'Experience the electrifying blend of ultra-modern technology and ancient tradition in one of the world\'s greatest cities.',
    destination_city: 'Tokyo',
    destination_country: 'JP',
    suggested_duration_days: 10,
    vehicle_type: 'flight',
    budget_per_person_eur: 2200,
    destination_hint: 'Tokyo, Japan',
    packing_template: 'City break',
    highlights: [
      'Explore the neon-lit streets of Shinjuku and the quirky Harajuku district',
      'Visit the serene Senso-ji temple in ancient Asakusa',
      'Experience the world\'s most efficient public transport network',
      'Eat your way through ramen, sushi, yakitori and street food',
      'Day trip to historic Kyoto for temples, geishas and bamboo forests',
    ],
  },
  {
    id: 'bali-beach',
    name: 'Bali Beach & Culture',
    emoji: '🌴',
    description:
      'Surf world-class waves, discover Hindu temples draped in flowers, and unwind in lush rice terrace landscapes.',
    destination_city: 'Denpasar',
    destination_country: 'ID',
    suggested_duration_days: 10,
    vehicle_type: 'flight',
    budget_per_person_eur: 1400,
    destination_hint: 'Bali, Indonesia',
    packing_template: 'Beach trip',
    highlights: [
      'Catch sunrise from the crater rim of Mount Batur volcano',
      'Surf the famous breaks at Uluwatu or Seminyak',
      'Explore Ubud\'s rice terraces, art galleries and monkey forest',
      'Watch a traditional Kecak fire dance at a clifftop temple',
      'Enjoy a Balinese massage and spa treatment surrounded by nature',
    ],
  },
  {
    id: 'morocco-culture',
    name: 'Morocco Culture & Medinas',
    emoji: '🕌',
    description:
      'Lose yourself in the labyrinthine medinas of Marrakech and Fès, ride camels in the Sahara and sleep under the stars.',
    destination_city: 'Marrakech',
    destination_country: 'MA',
    suggested_duration_days: 8,
    vehicle_type: 'flight',
    budget_per_person_eur: 900,
    destination_hint: 'Marrakech, Morocco',
    packing_template: 'City break',
    highlights: [
      'Get lost in the colourful souks and dye pits of the Marrakech medina',
      'Visit the tanneries and ancient university of Fès el-Bali',
      'Spend a night in a luxury desert camp in Erg Chebbi, Sahara',
      'Hike in the Atlas Mountains and visit traditional Berber villages',
      'Sip mint tea and feast on a traditional tagine with locals',
    ],
  },
  {
    id: 'new-york-city-break',
    name: 'New York City Break',
    emoji: '🗽',
    description:
      'The city that never sleeps — iconic skylines, world-class food, Broadway shows and endless neighbourhoods to explore.',
    destination_city: 'New York',
    destination_country: 'US',
    suggested_duration_days: 7,
    vehicle_type: 'flight',
    budget_per_person_eur: 2500,
    destination_hint: 'New York, USA',
    packing_template: 'City break',
    highlights: [
      'Walk across the Brooklyn Bridge and explore DUMBO',
      'Visit the Metropolitan Museum of Art and Central Park',
      'Take the ferry to the Statue of Liberty and Ellis Island',
      'Explore diverse neighbourhoods: Harlem, Greenwich Village, Chinatown',
      'Catch a Broadway show and dine in world-class restaurants',
    ],
  },
  {
    id: 'iceland-road-trip',
    name: 'Iceland Ring Road',
    emoji: '🌋',
    description:
      'Drive the iconic Ring Road circling Iceland — waterfalls, geysers, glaciers, black sand beaches and the Northern Lights.',
    destination_city: 'Reykjavik',
    destination_country: 'IS',
    suggested_duration_days: 10,
    vehicle_type: 'car',
    budget_per_person_eur: 2800,
    destination_hint: 'Iceland',
    packing_template: 'Road trip',
    highlights: [
      'Hunt for the Northern Lights (aurora borealis) in winter',
      'Hike on the Vatnajökull glacier, Europe\'s largest ice cap',
      'Walk the black sand beach at Reynisfjara near Vík',
      'Swim in the warm geothermal waters of the Blue Lagoon',
      'Watch Strokkur geyser erupt every few minutes at Geysir',
    ],
  },
  {
    id: 'greek-islands',
    name: 'Greek Islands Hopping',
    emoji: '⛵',
    description:
      'Sail between iconic whitewashed villages, volcanic beaches and crystal-clear Aegean waters.',
    destination_city: 'Santorini',
    destination_country: 'GR',
    suggested_duration_days: 10,
    vehicle_type: 'flight',
    budget_per_person_eur: 1600,
    destination_hint: 'Cyclades, Greece',
    packing_template: 'Beach trip',
    highlights: [
      'Watch the legendary sunset from Oia in Santorini',
      'Explore the colourful streets and windmills of Mykonos Town',
      'Swim in the volcanic hot springs near Nea Kameni crater',
      'Discover ancient history at the ruins of Akrotiri',
      'Island-hop by ferry and sample fresh grilled octopus by the harbour',
    ],
  },
];

export function getTripTemplate(id: string): TripTemplate | undefined {
  return TRIP_TEMPLATES.find((t) => t.id === id);
}
