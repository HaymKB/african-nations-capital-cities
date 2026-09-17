// ---------------------------------------------------------------------------
// African Safari Geography Quiz — shared dataset, question generators,
// persistence helpers (notebook / mastered / daily leaderboard / streaks /
// high scores), the daily seed, Base64 challenge links and the Web Speech
// pronunciation engine. Pure TypeScript, no Phaser runtime deps.
// ---------------------------------------------------------------------------

export type Region = 'north' | 'east' | 'west' | 'central' | 'southern' | 'island';
export type QuestionType = 'capital' | 'flag' | 'landmark' | 'reverse' | 'locator';
export type GameMode = 'full' | 'sprint' | 'survival' | 'landmark' | 'daily';

export interface FlagSpec {
    dir: 'h' | 'v';
    bands: string[];
    emblem?: 'star' | 'crescent' | 'circle' | 'triangle' | 'shield' | 'bird' | 'snow';
    emblemColor?: string;
    canton?: string;
}

export interface Country {
    id: number;
    country: string;
    capital: string;
    region: Region;
    x: number;
    y: number;
    phonetic: string;
    flag: FlagSpec;
    landmark: string;
    fact: string;
}

export const REGIONS: Record<Region, { label: string; color: number; css: string }> = {
    north: { label: 'North Africa', color: 0xf59e0b, css: '#f59e0b' },
    east: { label: 'East Africa', color: 0x16a34a, css: '#16a34a' },
    west: { label: 'West Africa', color: 0x38bdf8, css: '#38bdf8' },
    central: { label: 'Central Africa', color: 0xa855f7, css: '#a855f7' },
    southern: { label: 'Southern Africa', color: 0xdc2626, css: '#dc2626' },
    island: { label: 'Island Nations', color: 0xfbbf24, css: '#fbbf24' },
};

export const ALL_REGIONS: Region[] = ['north', 'east', 'west', 'central', 'southern', 'island'];
export const ALL_TYPES: QuestionType[] = ['capital', 'flag', 'landmark', 'reverse', 'locator'];

export const ISLAND_NATIONS = new Set([7, 11, 30, 34, 41, 43]); // Cabo Verde, Comoros, Madagascar, Mauritius, São Tomé, Seychelles
// Island nations need the deepest map zoom to be reachable.
export const ISLAND_ZOOM: Record<number, number> = { 7: 4.5, 11: 5, 30: 3, 34: 5.5, 41: 5.5, 43: 5 };

// ---------------------------------------------------------------------------
// Natural Earth island archipelago nodes — offsets (dx, dy) in 0-100 map
// space relative to each island nation's cartographic centerpoint, with a
// relative radius `r`. Used by AfricaMap to render true-position island
// polygons + pulsing locator beacons.
// ---------------------------------------------------------------------------
export interface IslandNode { name: string; dx: number; dy: number; r: number; }

export const ISLAND_ARCHIPELAGOS: Record<number, IslandNode[]> = {
    7: [ // Cabo Verde — Barlavento (NW) + Sotavento (SE) chains
        { name: 'Santo Antão', dx: -2.3, dy: -1.7, r: 0.55 },
        { name: 'São Vicente', dx: -1.4, dy: -1.3, r: 0.45 },
        { name: 'Sal', dx: 1.1, dy: -1.1, r: 0.4 },
        { name: 'Boa Vista', dx: 2.0, dy: -0.4, r: 0.5 },
        { name: 'Santiago', dx: 0.1, dy: 0.6, r: 0.7 },
        { name: 'Fogo', dx: -0.6, dy: 1.7, r: 0.55 },
    ],
    41: [ // São Tomé and Príncipe — dual volcanic chain, Gulf of Guinea
        { name: 'Príncipe', dx: -1.1, dy: -1.2, r: 0.45 },
        { name: 'São Tomé', dx: 0.4, dy: 0.7, r: 0.7 },
    ],
    11: [ // Comoros — Mozambique Channel chain
        { name: 'Grande Comore', dx: -0.9, dy: -0.5, r: 0.6 },
        { name: 'Mohéli', dx: -0.2, dy: 0.6, r: 0.45 },
        { name: 'Anjouan', dx: 0.8, dy: -0.2, r: 0.5 },
        { name: 'Mayotte', dx: 1.7, dy: 0.9, r: 0.45 },
    ],
    43: [ // Seychelles — inner granitic cluster NE of Madagascar
        { name: 'Mahé', dx: -0.2, dy: 0.7, r: 0.6 },
        { name: 'Praslin', dx: 1.1, dy: -0.3, r: 0.45 },
        { name: 'La Digue', dx: 1.6, dy: -0.6, r: 0.35 },
    ],
    34: [ // Mauritius — main volcanic island + Rodrigues east of Madagascar
        { name: 'Mauritius', dx: 0, dy: 0, r: 0.8 },
        { name: 'Rodrigues', dx: 3.6, dy: 1.1, r: 0.5 },
    ],
};

// Madagascar — accurate Mozambique Channel coastline (Cap d'Ambre north,
// Cap Sainte-Marie south) in 0-100 map space, rendered as its own polygon.
export const MADAGASCAR_PATH =
    'M66.4 63.2 C67.3 62.8 68.2 63.4 68.8 64.2 C69.4 65.2 69.9 66.4 70.1 67.6 ' +
    'C70.3 69 70.1 70.4 69.7 71.8 C69.3 73.2 68.7 74.6 68 75.8 ' +
    'C67.5 76.6 66.9 77.2 66.3 77 C65.8 76.7 65.9 75.8 66.1 74.8 ' +
    'C66.4 73.4 66.5 71.8 66.4 70.2 C66.3 68.6 66 67 65.7 65.6 ' +
    'C65.5 64.6 65.7 63.6 66.4 63.2 Z';

export const COUNTRIES: Country[] = [
    { id: 1, country: 'Algeria', capital: 'Algiers', region: 'north', x: 34, y: 22, phonetic: 'al-JEERZ', landmark: 'Tassili n’Ajjer', flag: { dir: 'v', bands: ['#006233', '#ffffff'], emblem: 'star', emblemColor: '#d21034' }, fact: 'Largest country in Africa, dominated by the Sahara Desert.' },
    { id: 2, country: 'Angola', capital: 'Luanda', region: 'southern', x: 40, y: 62, phonetic: 'loo-AHN-dah', landmark: 'Kalandula Falls', flag: { dir: 'h', bands: ['#cc092f', '#000000'], emblem: 'circle', emblemColor: '#ffcd00' }, fact: 'Rich in oil and diamonds, with an Atlantic coastline.' },
    { id: 3, country: 'Benin', capital: 'Porto-Novo', region: 'west', x: 30, y: 44, phonetic: 'POR-toh NOH-voh', landmark: 'Royal Palaces of Abomey', flag: { dir: 'h', bands: ['#fcd116', '#e8112d'], canton: '#008751' }, fact: 'Cradle of Vodun and the historic Kingdom of Dahomey.' },
    { id: 4, country: 'Botswana', capital: 'Gaborone', region: 'southern', x: 52, y: 74, phonetic: 'gah-boh-ROH-neh', landmark: 'Okavango Delta', flag: { dir: 'h', bands: ['#6da9d2', '#000000', '#6da9d2'] }, fact: 'Home to the Okavango Delta, the world’s largest inland delta.' },
    { id: 5, country: 'Burkina Faso', capital: 'Ouagadougou', region: 'west', x: 33, y: 41, phonetic: 'wah-gah-DOO-goo', landmark: 'Domes of Fabedougou', flag: { dir: 'h', bands: ['#009e49', '#ef3b24'], emblem: 'star', emblemColor: '#fcd116' }, fact: 'Land of Honest People, famed for vibrant textile arts.' },
    { id: 6, country: 'Burundi', capital: 'Gitega', region: 'east', x: 53, y: 58, phonetic: 'gee-TAY-gah', landmark: 'Source of the Nile', flag: { dir: 'h', bands: ['#ce1126', '#ffffff', '#1eb53a'], emblem: 'circle', emblemColor: '#ce1126' }, fact: 'Near the source of the Nile, known for royal drumming.' },
    { id: 7, country: 'Cabo Verde', capital: 'Praia', region: 'island', x: 12, y: 38, phonetic: 'KAB-oh VURD-uh', landmark: 'Pico do Fogo', flag: { dir: 'h', bands: ['#003893', '#ffffff', '#cf2027'], emblem: 'circle', emblemColor: '#f7d116' }, fact: 'Volcanic island nation off West Africa, home of Morna music.' },
    { id: 8, country: 'Cameroon', capital: 'Yaoundé', region: 'central', x: 44, y: 49, phonetic: 'yow-DEH', landmark: 'Mount Cameroon', flag: { dir: 'v', bands: ['#007a5e', '#ce1126', '#fcd116'], emblem: 'star', emblemColor: '#fcd116' }, fact: 'Called “Africa in miniature” for its diversity.' },
    { id: 9, country: 'Central African Republic', capital: 'Bangui', region: 'central', x: 49, y: 46, phonetic: 'BAHN-ghee', landmark: 'Bossembele Stone Circles', flag: { dir: 'h', bands: ['#0030a0', '#ffffff', '#289728'], emblem: 'star', emblemColor: '#ffd700' }, fact: 'Rich in diamonds and dense equatorial rainforest.' },
    { id: 10, country: 'Chad', capital: 'N’Djamena', region: 'central', x: 45, y: 38, phonetic: 'in-JAH-meh-nah', landmark: 'Lakes of Ounianga', flag: { dir: 'v', bands: ['#002664', '#fecb00', '#c60c00'] }, fact: 'Desert in the north, savanna in the south, named after Lake Chad.' },
    { id: 11, country: 'Comoros', capital: 'Moroni', region: 'island', x: 62, y: 66, phonetic: 'moh-ROH-nee', landmark: 'Mount Karthala', flag: { dir: 'h', bands: ['#ffb200', '#000000', '#e52031', '#003366'], emblem: 'crescent', emblemColor: '#ffffff' }, fact: 'The “Perfume Islands”, known for ylang-ylang.' },
    { id: 12, country: 'Congo (Republic)', capital: 'Brazzaville', region: 'central', x: 46, y: 54, phonetic: 'brah-zah-VEEL', landmark: 'Congo River Rapids', flag: { dir: 'h', bands: ['#00b140', '#ffff00', '#cd0000'] }, fact: 'One of the largest rainforests on Earth.' },
    { id: 13, country: 'Côte d’Ivoire', capital: 'Yamoussoukro', region: 'west', x: 26, y: 45, phonetic: 'shah-moo-SOH-kroh', landmark: 'Basilica of Yamoussoukro', flag: { dir: 'v', bands: ['#f77f00', '#ffffff', '#009e60'] }, fact: 'The world’s largest cocoa producer.' },
    { id: 14, country: 'DR Congo', capital: 'Kinshasa', region: 'central', x: 48, y: 55, phonetic: 'kin-SHAH-sah', landmark: 'Virunga National Park', flag: { dir: 'h', bands: ['#007fff', '#f7d618', '#ce1021'], emblem: 'star', emblemColor: '#f7d618' }, fact: 'Heart of the Congo Basin, home to mountain gorillas.' },
    { id: 15, country: 'Djibouti', capital: 'Djibouti', region: 'east', x: 66, y: 44, phonetic: 'jee-BOO-tee', landmark: 'Lake Assal', flag: { dir: 'h', bands: ['#00a0de', '#007a87'], canton: '#e21d38', emblem: 'star', emblemColor: '#ffffff' }, fact: 'Strategic port at the mouth of the Red Sea.' },
    { id: 16, country: 'Egypt', capital: 'Cairo', region: 'north', x: 58, y: 22, phonetic: 'KY-roh', landmark: 'Pyramids of Giza', flag: { dir: 'h', bands: ['#ce1126', '#ffffff', '#000000'], emblem: 'bird', emblemColor: '#c09330' }, fact: 'Home to the Pyramids of Giza and the Great Sphinx.' },
    { id: 17, country: 'Equatorial Guinea', capital: 'Malabo', region: 'central', x: 41, y: 51, phonetic: 'mah-LAH-boh', landmark: 'Pico Basile', flag: { dir: 'h', bands: ['#0073cf', '#ffffff', '#289728'], emblem: 'shield', emblemColor: '#ce1126' }, fact: 'The only Spanish-speaking nation in Africa.' },
    { id: 18, country: 'Eritrea', capital: 'Asmara', region: 'east', x: 65, y: 40, phonetic: 'ahz-MAH-rah', landmark: 'Fiat Tagliero Building', flag: { dir: 'h', bands: ['#2ba537', '#000000', '#ea0438'], emblem: 'circle', emblemColor: '#ffc10e' }, fact: 'Known for well-preserved Italian modernist architecture.' },
    { id: 19, country: 'Eswatini', capital: 'Mbabane', region: 'southern', x: 57, y: 78, phonetic: 'm-bah-BAH-neh', landmark: 'Mlolozane Caves', flag: { dir: 'h', bands: ['#3a75c4', '#ffda00', '#b10c1c', '#ffda00'], emblem: 'shield', emblemColor: '#000000' }, fact: 'One of the smallest kingdoms in the world.' },
    { id: 20, country: 'Ethiopia', capital: 'Addis Ababa', region: 'east', x: 63, y: 46, phonetic: 'AH-dis AH-bah-bah', landmark: 'Rock-Hewn Churches of Lalibela', flag: { dir: 'h', bands: ['#078930', '#fcdd09', '#da121a'], emblem: 'star', emblemColor: '#0f47af' }, fact: 'Cradle of humanity and home of ancient coffee.' },
    { id: 21, country: 'Gabon', capital: 'Libreville', region: 'central', x: 41, y: 53, phonetic: 'lee-bruh-VEEL', landmark: 'Loango National Park', flag: { dir: 'h', bands: ['#009e60', '#fdb913', '#3a75c4'] }, fact: 'Over 80% of its land is protected tropical forest.' },
    { id: 22, country: 'Gambia', capital: 'Banjul', region: 'west', x: 18, y: 42, phonetic: 'BAHN-jool', landmark: 'Kunta Kinteh Island', flag: { dir: 'h', bands: ['#ce1126', '#ffffff', '#0c1c8c', '#3a7725'] }, fact: 'Smallest mainland nation, wrapped by Senegal along a river.' },
    { id: 23, country: 'Ghana', capital: 'Accra', region: 'west', x: 28, y: 45, phonetic: 'uh-KRAH', landmark: 'Cape Coast Castle', flag: { dir: 'h', bands: ['#ce1126', '#fcd116', '#006b3f'], emblem: 'star', emblemColor: '#000000' }, fact: 'First sub-Saharan nation to gain independence.' },
    { id: 24, country: 'Guinea', capital: 'Conakry', region: 'west', x: 19, y: 44, phonetic: 'KOH-nah-kree', landmark: 'Fouta Djallon Highlands', flag: { dir: 'v', bands: ['#ce1126', '#fcd116', '#009e60'] }, fact: 'Rich in bauxite and rhythmic djembe drumming.' },
    { id: 25, country: 'Guinea-Bissau', capital: 'Bissau', region: 'west', x: 16, y: 42, phonetic: 'bih-SOW', landmark: 'Bijagós Archipelago', flag: { dir: 'h', bands: ['#ce1126', '#fcd116'], canton: '#000000', emblem: 'star', emblemColor: '#fcd116' }, fact: 'A former Portuguese colony with a rich coastal archipelago.' },
    { id: 26, country: 'Kenya', capital: 'Nairobi', region: 'east', x: 60, y: 53, phonetic: 'nahy-ROH-bee', landmark: 'Maasai Mara', flag: { dir: 'h', bands: ['#000000', '#bb0000', '#006600'], emblem: 'shield', emblemColor: '#bb0000' }, fact: 'Famous for the Great Rift Valley and the wildebeest migration.' },
    { id: 27, country: 'Lesotho', capital: 'Maseru', region: 'southern', x: 54, y: 82, phonetic: 'mah-SEH-roo', landmark: 'Sehlabathebe Plateau', flag: { dir: 'h', bands: ['#00209f', '#00a1de', '#008c45'], emblem: 'snow', emblemColor: '#000000' }, fact: 'The only country entirely above 1,000 m elevation.' },
    { id: 28, country: 'Liberia', capital: 'Monrovia', region: 'west', x: 22, y: 46, phonetic: 'mon-ROH-vee-uh', landmark: 'Sapo National Park', flag: { dir: 'h', bands: ['#bf0a30', '#ffffff'], canton: '#002868', emblem: 'star', emblemColor: '#ffffff' }, fact: 'Founded by freed American slaves, unique cultural blend.' },
    { id: 29, country: 'Libya', capital: 'Tripoli', region: 'north', x: 46, y: 25, phonetic: 'TRI-poh-lee', landmark: 'Leptis Magna', flag: { dir: 'h', bands: ['#ce1126', '#000000', '#239e46'], emblem: 'crescent', emblemColor: '#ffffff' }, fact: 'Home to the superb Roman ruins of Leptis Magna.' },
    { id: 30, country: 'Madagascar', capital: 'Antananarivo', region: 'island', x: 68, y: 70, phonetic: 'an-tuh-nan-uh-REE-voh', landmark: 'Avenue of the Baobabs', flag: { dir: 'v', bands: ['#ffffff', '#007e3a'], canton: '#fc3d32' }, fact: 'Island where over 90% of wildlife is found nowhere else.' },
    { id: 31, country: 'Malawi', capital: 'Lilongwe', region: 'southern', x: 58, y: 68, phonetic: 'lee-LONG-weh', landmark: 'Lake Malawi', flag: { dir: 'h', bands: ['#ce1126', '#000000', '#339e35'], emblem: 'circle', emblemColor: '#ff0000' }, fact: 'Known as “The Warm Heart of Africa”.' },
    { id: 32, country: 'Mali', capital: 'Bamako', region: 'west', x: 28, y: 38, phonetic: 'bah-MAH-koh', landmark: 'Great Mosque of Djenné', flag: { dir: 'v', bands: ['#14b531', '#fcd116', '#ce1126'] }, fact: 'Once the center of the Mali Empire and Timbuktu scholarship.' },
    { id: 33, country: 'Mauritania', capital: 'Nouakchott', region: 'west', x: 21, y: 33, phonetic: 'noo-AHK-saht', landmark: 'Richat Structure', flag: { dir: 'h', bands: ['#006233', '#006233'], emblem: 'star', emblemColor: '#d31f26' }, fact: 'Mostly Sahara, with rich Islamic heritage.' },
    { id: 34, country: 'Mauritius', capital: 'Port Louis', region: 'island', x: 74, y: 72, phonetic: 'port LOO-ee', landmark: 'Le Morne Brabant', flag: { dir: 'h', bands: ['#ea2839', '#1a207d', '#ffd500', '#00a551'] }, fact: 'Indian Ocean island, home of the extinct dodo.' },
    { id: 35, country: 'Morocco', capital: 'Rabat', region: 'north', x: 22, y: 22, phonetic: 'rah-BAHT', landmark: 'Medina of Fes', flag: { dir: 'h', bands: ['#c1272d'], emblem: 'star', emblemColor: '#006233' }, fact: 'Berber heritage, souks, and the ancient walled city of Fes.' },
    { id: 36, country: 'Mozambique', capital: 'Maputo', region: 'southern', x: 60, y: 72, phonetic: 'mah-POO-toh', landmark: 'Island of Mozambique', flag: { dir: 'h', bands: ['#009e49', '#ffffff', '#000000'], canton: '#fcd116', emblem: 'star', emblemColor: '#fcd116' }, fact: 'Famed Indian Ocean coastline and dhow sailing culture.' },
    { id: 37, country: 'Namibia', capital: 'Windhoek', region: 'southern', x: 45, y: 74, phonetic: 'VIND-hohk', landmark: 'Sossusvlei Dunes', flag: { dir: 'h', bands: ['#003580', '#ffffff', '#d21034'], emblem: 'circle', emblemColor: '#ffcd00' }, fact: 'Home to the towering red dunes of the Namib.' },
    { id: 38, country: 'Niger', capital: 'Niamey', region: 'west', x: 38, y: 39, phonetic: 'nee-AH-may', landmark: 'Gadoufaoua Dinosaur Site', flag: { dir: 'h', bands: ['#e05206', '#ffffff', '#0f8121'], emblem: 'circle', emblemColor: '#e05206' }, fact: 'Named after the Niger River, Sahara in the north.' },
    { id: 39, country: 'Nigeria', capital: 'Abuja', region: 'west', x: 39, y: 46, phonetic: 'ah-BOO-jah', landmark: 'Zuma Rock', flag: { dir: 'v', bands: ['#008751', '#ffffff', '#008751'] }, fact: 'Africa’s most populous nation, famed for Nollywood.' },
    { id: 40, country: 'Rwanda', capital: 'Kigali', region: 'east', x: 54, y: 54, phonetic: 'kee-GAH-lee', landmark: 'Volcanoes National Park', flag: { dir: 'h', bands: ['#00a1de', '#fbbd00', '#318d42'], emblem: 'circle', emblemColor: '#e5be01' }, fact: 'Land of a Thousand Hills and mountain gorillas.' },
    { id: 41, country: 'São Tomé and Príncipe', capital: 'São Tomé', region: 'island', x: 40, y: 52, phonetic: 'sown tuh-MAY', landmark: 'Pico Cão Grande', flag: { dir: 'h', bands: ['#009966', '#ffcc00', '#009966'], canton: '#d40000', emblem: 'star', emblemColor: '#000000' }, fact: 'Gulf of Guinea islands famed for cacao.' },
    { id: 42, country: 'Senegal', capital: 'Dakar', region: 'west', x: 15, y: 41, phonetic: 'dah-KAHR', landmark: 'Lake Retba', flag: { dir: 'v', bands: ['#00853f', '#fdef42', '#e31b23'], emblem: 'star', emblemColor: '#00853f' }, fact: 'Westernmost point of mainland Africa, vibrant art scene.' },
    { id: 43, country: 'Seychelles', capital: 'Victoria', region: 'island', x: 68, y: 60, phonetic: 'vik-TOR-ee-uh', landmark: 'Vallée de Mai', flag: { dir: 'h', bands: ['#003399', '#fdd700', '#00b04f', '#dc2229', '#000000'] }, fact: 'Granite archipelago famed for giant tortoises.' },
    { id: 44, country: 'Sierra Leone', capital: 'Freetown', region: 'west', x: 20, y: 45, phonetic: 'FREE-tohn', landmark: 'Bunce Island', flag: { dir: 'h', bands: ['#1eb53a', '#ffffff', '#0072c6'] }, fact: 'Known for diamond mines and a historic harbor.' },
    { id: 45, country: 'Somalia', capital: 'Mogadishu', region: 'east', x: 71, y: 47, phonetic: 'moh-gah-DISH-oo', landmark: 'Laas Geel Caves', flag: { dir: 'h', bands: ['#4189dd'], emblem: 'star', emblemColor: '#ffffff' }, fact: 'The Land of Punt with Africa’s longest coastline.' },
    { id: 46, country: 'South Africa', capital: 'Pretoria', region: 'southern', x: 50, y: 84, phonetic: 'prih-TOH-ree-uh', landmark: 'Table Mountain', flag: { dir: 'h', bands: ['#002395', '#ffffff', '#007a4d'], emblem: 'triangle', emblemColor: '#ffb612' }, fact: 'Has three capital cities; Cape Town holds the legislature.' },
    { id: 47, country: 'South Sudan', capital: 'Juba', region: 'east', x: 56, y: 48, phonetic: 'JOO-bah', landmark: 'Sudd Wetlands', flag: { dir: 'h', bands: ['#000000', '#ce1126', '#0f7a29'], canton: '#000000', emblem: 'star', emblemColor: '#fcd116' }, fact: 'The world’s newest nation, rich in Nile wetlands.' },
    { id: 48, country: 'Sudan', capital: 'Khartoum', region: 'north', x: 58, y: 34, phonetic: 'kar-TOOM', landmark: 'Pyramids of Meroë', flag: { dir: 'h', bands: ['#d21034', '#ffffff', '#000000'], canton: '#007a3d' }, fact: 'Home to more pyramids than Egypt, at ancient Meroë.' },
    { id: 49, country: 'Tanzania', capital: 'Dodoma', region: 'east', x: 58, y: 60, phonetic: 'doh-DOH-mah', landmark: 'Mount Kilimanjaro', flag: { dir: 'h', bands: ['#1eb53a', '#fcd116', '#00a3dd'], emblem: 'triangle', emblemColor: '#000000' }, fact: 'Home to Kilimanjaro and the Serengeti plains.' },
    { id: 50, country: 'Togo', capital: 'Lomé', region: 'west', x: 31, y: 45, phonetic: 'loh-MAY', landmark: 'Kokrobite Beach', flag: { dir: 'h', bands: ['#006a4e', '#ffce00', '#d10000'], emblem: 'star', emblemColor: '#ffffff' }, fact: 'Palm-lined coast and rolling hill country.' },
    { id: 51, country: 'Tunisia', capital: 'Tunis', region: 'north', x: 43, y: 20, phonetic: 'TEE-nis', landmark: 'Amphitheatre of El Djem', flag: { dir: 'h', bands: ['#e70013'], emblem: 'crescent', emblemColor: '#ffffff' }, fact: 'Birthplace of ancient Carthage on the Mediterranean.' },
    { id: 52, country: 'Uganda', capital: 'Kampala', region: 'east', x: 55, y: 51, phonetic: 'kahm-PAH-lah', landmark: 'Murchison Falls', flag: { dir: 'h', bands: ['#000000', '#fcdc04', '#d21034'] }, fact: 'The Pearl of Africa, lush and full of wildlife.' },
    { id: 53, country: 'Zambia', capital: 'Lusaka', region: 'southern', x: 53, y: 66, phonetic: 'loo-SAH-kah', landmark: 'Victoria Falls', flag: { dir: 'h', bands: ['#198a00', '#ef7d00', '#de1010'], canton: '#2e8b57' }, fact: 'Home to Victoria Falls, shared with Zimbabwe.' },
    { id: 54, country: 'Zimbabwe', capital: 'Harare', region: 'southern', x: 55, y: 72, phonetic: 'hah-RAH-ree', landmark: 'Great Zimbabwe Ruins', flag: { dir: 'h', bands: ['#318b42', '#fcd116', '#de1010', '#000000'], canton: '#318b42', emblem: 'bird', emblemColor: '#fcd116' }, fact: 'Named after Great Zimbabwe, a medieval stone city.' },
];

// ---------------------------------------------------------------------------
// Filters & challenge configuration
// ---------------------------------------------------------------------------
export interface FilterConfig {
    regions: Region[];
    types: QuestionType[];
    count: number; // 0 = all available
}

export const DEFAULT_FILTERS: FilterConfig = {
    regions: [...ALL_REGIONS],
    types: [...ALL_TYPES],
    count: 10,
};

export function loadFilters(): FilterConfig {
    try {
        const raw = localStorage.getItem('safari-odyssey-filters');
        if (raw) {
            const f = JSON.parse(raw) as FilterConfig;
            if (f && Array.isArray(f.regions) && Array.isArray(f.types)) {
                return {
                    regions: f.regions.filter(r => ALL_REGIONS.includes(r)),
                    types: f.types.filter(ty => ALL_TYPES.includes(ty)),
                    count: typeof f.count === 'number' ? f.count : 10,
                };
            }
        }
    } catch { /* ignore */ }
    return { ...DEFAULT_FILTERS, regions: [...ALL_REGIONS], types: [...ALL_TYPES] };
}

export function saveFilters(f: FilterConfig): void {
    try { localStorage.setItem('safari-odyssey-filters', JSON.stringify(f)); } catch { /* ignore */ }
}

export interface ChallengeConfig {
    mode: GameMode;
    filters?: FilterConfig;
    count?: number;
    name?: string;
}

// ---------------------------------------------------------------------------
// Deterministic daily seed
// ---------------------------------------------------------------------------
export function dailyKey(d: Date = new Date()): string {
    return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export function seededRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

export function seedFromDate(key: string): number {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Deterministic 10-question daily set: country ids + question type per id. */
export function dailyQuestionSet(key: string = dailyKey()): { ids: number[]; types: QuestionType[] } {
    const rng = seededRng(seedFromDate(key));
    const pool = COUNTRIES.map(c => c.id);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const ids = pool.slice(0, 10);
    const types = ids.map(() => ALL_TYPES[Math.floor(rng() * ALL_TYPES.length)]);
    return { ids, types };
}

// ---------------------------------------------------------------------------
// Question generation
// ---------------------------------------------------------------------------
export interface GeneratedQuestion {
    countryId: number;
    country: string;
    type: QuestionType;
    prompt: string;
    options: string[];
    answerIndex: number;
    correctValue: string;
    fact: string;
    flag?: FlagSpec;
}

function pickDistractors(pool: string[], correct: string, n = 3): string[] {
    const uniq = Array.from(new Set(pool.filter(v => v && v !== correct)));
    const picked: string[] = [];
    let guard = 0;
    while (picked.length < n && uniq.length > 0 && guard < 50) {
        guard++;
        const idx = Math.floor(Math.random() * uniq.length);
        picked.push(uniq.splice(idx, 1)[0]);
    }
    return picked;
}

export function generateQuestion(c: Country, type: QuestionType): GeneratedQuestion {
    let options: string[] = [];
    let correctValue = '';
    let prompt = '';
    switch (type) {
        case 'capital':
            correctValue = c.capital;
            options = pickDistractors(COUNTRIES.map(x => x.capital), c.capital);
            prompt = `What is the capital of ${c.country}?`;
            break;
        case 'reverse':
            correctValue = c.country;
            options = pickDistractors(COUNTRIES.map(x => x.country), c.country);
            prompt = `${c.capital} is the capital of which country?`;
            break;
        case 'landmark':
            correctValue = c.country;
            options = pickDistractors(COUNTRIES.map(x => x.country), c.country);
            prompt = `Where is ${c.landmark} located?`;
            break;
        case 'flag':
            correctValue = c.country;
            options = pickDistractors(COUNTRIES.map(x => x.country), c.country);
            prompt = 'Which country flies this flag?';
            break;
        case 'locator':
        default:
            correctValue = c.country;
            options = []; // answered by tapping the map, not by option cards
            prompt = `Tap ${c.country} on the Africa map.`;
            break;
    }
    const all = options.length > 0 ? shuffle([correctValue, ...options]) : [];
    return {
        countryId: c.id,
        country: c.country,
        type,
        prompt,
        options: all,
        answerIndex: all.indexOf(correctValue),
        correctValue,
        fact: c.fact,
        flag: type === 'flag' ? c.flag : undefined,
    };
}

/** Build a full question sequence for a mode + filters. */
export function buildQuestions(mode: GameMode, filters: FilterConfig): GeneratedQuestion[] {
    let pool = COUNTRIES.filter(c => filters.regions.includes(c.region));
    let types = filters.types.filter(ty => ty !== 'locator' || mode === 'landmark');
    if (mode === 'landmark') types = ['flag', 'landmark'];
    if (types.length === 0) types = ['capital'];
    if (pool.length === 0) pool = [...COUNTRIES];
    let qs = shuffle([...pool]).map((c, i) => generateQuestion(c, types[i % types.length]));
    if (mode === 'daily') {
        const set = dailyQuestionSet();
        qs = set.ids
            .map(id => COUNTRIES.find(c => c.id === id))
            .filter((c): c is Country => !!c)
            .map((c, i) => generateQuestion(c, set.types[i] ?? 'capital'));
    } else if (filters.count > 0 && mode !== 'survival' && mode !== 'sprint') {
        qs = qs.slice(0, filters.count);
    }
    if (mode === 'sprint') qs = shuffle([...COUNTRIES]).slice(0, 20).map((c, i) => generateQuestion(c, types[i % types.length]));
    return qs;
}

// ---------------------------------------------------------------------------
// Base64 URL challenge link generator
// ---------------------------------------------------------------------------
export function encodeChallenge(cfg: ChallengeConfig): string {
    try { return btoa(encodeURIComponent(JSON.stringify(cfg))); } catch { return ''; }
}

export function decodeChallenge(encoded: string): ChallengeConfig | null {
    try {
        const cfg = JSON.parse(decodeURIComponent(atob(encoded))) as ChallengeConfig;
        if (cfg && typeof cfg.mode === 'string') return cfg;
        return null;
    } catch { return null; }
}

export function getChallengeFromURL(): ChallengeConfig | null {
    if (typeof window === 'undefined') return null;
    const encoded = new URLSearchParams(window.location.search).get('challenge');
    return encoded ? decodeChallenge(encoded) : null;
}

export function buildChallengeURL(cfg: ChallengeConfig): string {
    const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '/';
    return `${base}?challenge=${encodeChallenge(cfg)}`;
}

// ---------------------------------------------------------------------------
// Persistence — Safari Notebook, mastered flashcards, daily leaderboard,
// streaks and all-time high scores (localStorage).
// ---------------------------------------------------------------------------
const LS_NOTEBOOK = 'safari_notebook_v2';
const LS_MASTERED = 'safari_mastered_v1';
const LS_DAILY = 'safari_daily_leaderboard_v1';
const LS_DAILY_STREAK = 'safari_daily_streak_v1';
const LS_HIGHSCORES = 'safari_highscores';

export interface NotebookEntry { seen: number; correct: number; }
export type Notebook = Record<number, NotebookEntry>;

export function loadNotebook(): Notebook {
    try { return JSON.parse(localStorage.getItem(LS_NOTEBOOK) || '{}') as Notebook; } catch { return {}; }
}

export function recordNotebook(id: number, correct: boolean): Notebook {
    const nb = loadNotebook();
    const e = nb[id] || { seen: 0, correct: 0 };
    e.seen++;
    if (correct) e.correct++;
    nb[id] = e;
    try { localStorage.setItem(LS_NOTEBOOK, JSON.stringify(nb)); } catch { /* ignore */ }
    return nb;
}

export function loadMastered(): number[] {
    try { return JSON.parse(localStorage.getItem(LS_MASTERED) || '[]') as number[]; } catch { return []; }
}

export function toggleMastered(id: number): number[] {
    const list = loadMastered();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    try { localStorage.setItem(LS_MASTERED, JSON.stringify(list)); } catch { /* ignore */ }
    return list;
}

export interface DailyEntry { name: string; score: number; date: string; }

const MOCK_COMPETITORS: Array<[string, number]> = [
    ['Amara', 1450], ['Kofi', 1280], ['Zola', 1120], ['Youssef', 980],
    ['Chidi', 850], ['Fatou', 720], ['Baraka', 610], ['Nia', 480],
];

export function loadDailyBoard(day: string): DailyEntry[] {
    try {
        const all = JSON.parse(localStorage.getItem(LS_DAILY) || '{}') as Record<string, DailyEntry[]>;
        const mine = all[day] || [];
        const entries: DailyEntry[] = MOCK_COMPETITORS
            .filter(([name]) => !mine.some(m => m.name === name))
            .map(([name, base]) => ({ name, score: base + (seedFromDate(day + name) % 200) - 100, date: day }));
        return [...mine, ...entries].sort((a, b) => b.score - a.score).slice(0, 12);
    } catch { return []; }
}

export function submitDailyScore(day: string, score: number): DailyEntry[] {
    try {
        const all = JSON.parse(localStorage.getItem(LS_DAILY) || '{}') as Record<string, DailyEntry[]>;
        const mine = all[day] || [];
        const existing = mine.find(m => m.name === 'You');
        if (existing) existing.score = Math.max(existing.score, score);
        else mine.push({ name: 'You', score, date: day });
        all[day] = mine;
        localStorage.setItem(LS_DAILY, JSON.stringify(all));
    } catch { /* ignore */ }
    return loadDailyBoard(day);
}

export interface StreakState { lastDay: string; count: number; }

export function loadDailyStreak(): StreakState {
    try { return JSON.parse(localStorage.getItem(LS_DAILY_STREAK) || '{"lastDay":"","count":0}') as StreakState; } catch { return { lastDay: '', count: 0 }; }
}

export function bumpDailyStreak(today: string): StreakState {
    const s = loadDailyStreak();
    if (s.lastDay === today) return s;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const next: StreakState = { lastDay: today, count: s.lastDay === yesterday ? s.count + 1 : 1 };
    try { localStorage.setItem(LS_DAILY_STREAK, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
}

export interface HighScore { mode: string; score: number; date: string; }

export function loadHighScores(): HighScore[] {
    try { return JSON.parse(localStorage.getItem(LS_HIGHSCORES) || '[]') as HighScore[]; } catch { return []; }
}

export function saveHighScore(mode: string, score: number): HighScore[] {
    const list = loadHighScores();
    list.push({ mode, score, date: new Date().toISOString().slice(0, 10) });
    list.sort((a, b) => b.score - a.score);
    const trimmed = list.slice(0, 10);
    try { localStorage.setItem(LS_HIGHSCORES, JSON.stringify(trimmed)); } catch { /* ignore */ }
    return trimmed;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function getCountryById(id: number): Country | undefined {
    return COUNTRIES.find(c => c.id === id);
}

export function isIslandNation(id: number): boolean {
    return ISLAND_NATIONS.has(id);
}

// ---------------------------------------------------------------------------
// Web Speech pronunciation engine
// ---------------------------------------------------------------------------
export function speak(text: string, lang = 'en-US'): void {
    try {
        const synth = window.speechSynthesis;
        if (!synth) return;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = 0.9;
        const voices = synth.getVoices();
        const match = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
        if (match) u.voice = match;
        synth.speak(u);
    } catch { /* speech unsupported */ }
}