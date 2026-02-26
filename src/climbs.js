/**
 * src/climbs.js
 * Database voor Climb Performance Lab
 */

// Helper: Genereer Climbfinder URL
const getClimbUrl = (name, country) => {
  if (country === 'Zwift') return `https://zwiftinsider.com/?s=${name.replace(/\s+/g, '+')}`;
  return `https://climbfinder.com/en/climbs/${name.toLowerCase().replace(/[\s/().']+/g, '-').replace(/-+$/, '')}`;
};

export const COGGAN_ZONES = [
  { name: 'Z1 Recovery', min: 0, max: 0.55, color: '#9ca3af' },
  { name: 'Z2 Endurance', min: 0.56, max: 0.75, color: '#3b82f6' },
  { name: 'Z3 Tempo', min: 0.76, max: 0.90, color: '#22c55e' },
  { name: 'Z4 Threshold', min: 0.91, max: 1.05, color: '#eab308' },
  { name: 'Z5 VO2 Max', min: 1.06, max: 1.20, color: '#f97316' },
  { name: 'Z6 Anaerobic', min: 1.21, max: 1.50, color: '#ef4444' },
  { name: 'Z7 Neuro', min: 1.51, max: 10.0, color: '#a855f7' }
];

// De volledige lijst (afgekapt in chat-weergave, maar hier compleet maken in je bestand)
const RAW_CLIMBS = [
  // --- REAL WORLD: FRANKRIJK ---
  { id: 'fr_alpe', name: "Alpe d'Huez", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 13.8, elevation: 1061, avgGrade: 8.1 },
  { id: 'fr_ventoux', name: "Mont Ventoux (Bédoin)", country: "FR", region: "Provence", flag: "🇫🇷", lengthKm: 21.5, elevation: 1610, avgGrade: 7.5 },
  { id: 'fr_ventoux_mal', name: "Mont Ventoux (Malaucène)", country: "FR", region: "Provence", flag: "🇫🇷", lengthKm: 21.2, elevation: 1535, avgGrade: 7.2 },
  { id: 'fr_galibier', name: "Col du Galibier (Valloire)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 18.1, elevation: 1245, avgGrade: 6.9 },
  { id: 'fr_glandon', name: "Col du Glandon", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 21.3, elevation: 1472, avgGrade: 6.9 },
  { id: 'fr_madeleine', name: "Col de la Madeleine", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 19.2, elevation: 1522, avgGrade: 7.9 },
  { id: 'fr_izoard', name: "Col d'Izoard", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 14.1, elevation: 1000, avgGrade: 7.1 },
  { id: 'fr_croix_fer', name: "Col de la Croix-de-Fer", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 29.4, elevation: 1520, avgGrade: 5.2 },
  { id: 'fr_telegraphe', name: "Col du Télégraphe", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 11.8, elevation: 856, avgGrade: 7.3 },
  { id: 'fr_tourmalet', name: "Col du Tourmalet (Luz)", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 19.0, elevation: 1404, avgGrade: 7.4 },
  { id: 'fr_aubisque', name: "Col d'Aubisque", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 16.6, elevation: 1190, avgGrade: 7.2 },
  { id: 'fr_hautacam', name: "Hautacam", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 13.5, elevation: 1050, avgGrade: 7.8 },
  { id: 'fr_grand_colombier', name: "Grand Colombier (Culoz)", country: "FR", region: "Jura", flag: "🇫🇷", lengthKm: 18.3, elevation: 1255, avgGrade: 6.9 },
  { id: 'fr_bonette', name: "Cime de la Bonette", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 24.0, elevation: 1589, avgGrade: 6.6 },
  { id: 'fr_puy_dome', name: "Puy de Dôme", country: "FR", region: "Massif Central", flag: "🇫🇷", lengthKm: 13.3, elevation: 1033, avgGrade: 7.7 },
  { id: 'fr_loze', name: "Col de la Loze", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 21.5, elevation: 1675, avgGrade: 7.8 },
  { id: 'fr_iseran', name: "Col de l'Iseran (Bonneval)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 13.4, elevation: 977, avgGrade: 7.3 },
  { id: 'fr_granon', name: "Col du Granon", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 11.5, elevation: 1053, avgGrade: 9.2 },
  { id: 'fr_joux_plane', name: "Col de Joux Plane", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 11.6, elevation: 990, avgGrade: 8.5 },
  { id: 'fr_colombiere', name: "Col de la Colombière", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 16.3, elevation: 1108, avgGrade: 6.8 },
  { id: 'fr_roselend', name: "Cormet de Roselend", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 20.3, elevation: 1227, avgGrade: 6.0 },
  { id: 'fr_aravis', name: "Col des Aravis (Thônes)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 18.9, elevation: 867, avgGrade: 4.6 },
  { id: 'fr_saisies', name: "Col des Saisies", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 15.0, elevation: 950, avgGrade: 6.4 },
  { id: 'fr_ramaz', name: "Col de la Ramaz", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 14.0, elevation: 980, avgGrade: 7.0 },
  { id: 'fr_romme', name: "Col de Romme", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 9.3, elevation: 815, avgGrade: 8.8 },
  { id: 'fr_croix_fry', name: "Col de la Croix Fry", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 12.8, elevation: 843, avgGrade: 6.6 },
  { id: 'fr_glieres', name: "Col des Glières", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 14.0, elevation: 960, avgGrade: 6.8 },
  { id: 'fr_semnoz', name: "Semnoz (Annecy)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 17.4, elevation: 1212, avgGrade: 7.0 },
  { id: 'fr_revard', name: "Mont Revard", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 21.0, elevation: 1276, avgGrade: 6.0 },
  { id: 'fr_forclaz', name: "Col de la Forclaz (Montmin)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 8.5, elevation: 680, avgGrade: 8.0 },
  { id: 'fr_chamrousse', name: "Chamrousse", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 19.0, elevation: 1250, avgGrade: 6.6 },
  { id: 'fr_deux_alpes', name: "Les Deux Alpes", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 9.0, elevation: 750, avgGrade: 8.3 },
  { id: 'fr_val_thorens', name: "Val Thorens", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 36.0, elevation: 1850, avgGrade: 5.2 },
  { id: 'fr_plagne', name: "La Plagne", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 19.1, elevation: 1400, avgGrade: 7.3 },
  { id: 'fr_courchevel', name: "Courchevel (Altiport)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 18.0, elevation: 1200, avgGrade: 6.5 },
  { id: 'fr_mont_cenis', name: "Col du Mont Cenis", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 9.8, elevation: 694, avgGrade: 7.1 },
  { id: 'fr_cayolle', name: "Col de la Cayolle", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 29.0, elevation: 1190, avgGrade: 4.1 },
  { id: 'fr_allos', name: "Col d'Allos", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 17.5, elevation: 1108, avgGrade: 6.3 },
  { id: 'fr_champs', name: "Col des Champs", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 11.4, elevation: 790, avgGrade: 6.9 },
  { id: 'fr_vars', name: "Col de Vars", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 19.4, elevation: 1111, avgGrade: 5.7 },
  { id: 'fr_risoul', name: "Risoul 1850", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 12.8, elevation: 885, avgGrade: 6.9 },
  { id: 'fr_pra_loup', name: "Pra Loup", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 6.2, elevation: 378, avgGrade: 6.1 },
  { id: 'fr_lombarde', name: "Col de la Lombarde", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 21.3, elevation: 1477, avgGrade: 6.9 },
  { id: 'fr_turini', name: "Col de Turini", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 24.0, elevation: 1268, avgGrade: 5.2 },
  { id: 'fr_braus', name: "Col de Braus", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 10.0, elevation: 661, avgGrade: 6.6 },
  { id: 'fr_madone_real', name: "Col de la Madone (Menton)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 13.6, elevation: 925, avgGrade: 6.8 },
  { id: 'fr_eze_real', name: "Col d'Eze (Nice)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 10.0, elevation: 490, avgGrade: 4.9 },
  { id: 'fr_noyer', name: "Col du Noyer", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 7.5, elevation: 615, avgGrade: 8.2 },
  { id: 'fr_chaussy', name: "Col du Chaussy (Montvernier)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 14.0, elevation: 1050, avgGrade: 7.5 },
  { id: 'fr_sabot', name: "Col du Sabot", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 14.5, elevation: 1290, avgGrade: 8.9 },
  { id: 'fr_mollard', name: "Col du Mollard", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 17.6, elevation: 980, avgGrade: 5.6 },

  // --- REAL WORLD: VOSGES —
  { id: 'fr_planche', name: "Planche des Belles Filles", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 5.9, elevation: 500, avgGrade: 8.5 },
  { id: 'fr_ballon_alsace', name: "Ballon d'Alsace", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 12.4, elevation: 643, avgGrade: 5.2 },
  { id: 'fr_grand_ballon', name: "Grand Ballon", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 13.5, elevation: 950, avgGrade: 7.0 },
  { id: 'fr_schlucht', name: "Col de la Schlucht (Munster)", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 18.0, elevation: 755, avgGrade: 4.2 },
  { id: 'fr_markstein', name: "Le Markstein (Guebwiller)", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 24.0, elevation: 893, avgGrade: 3.7 },
  { id: 'fr_petit_ballon', name: "Petit Ballon (Munster)", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 9.3, elevation: 755, avgGrade: 8.1 },
  { id: 'fr_platzerwasel', name: "Col du Platzerwasel", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 7.1, elevation: 606, avgGrade: 8.5 },
  { id: 'fr_champ_feu', name: "Champ du Feu", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 12.0, elevation: 795, avgGrade: 6.6 },
  { id: 'fr_ste_odile', name: "Mont Sainte-Odile", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 9.0, elevation: 500, avgGrade: 5.5 },
  { id: 'fr_donon', name: "Col du Donon", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 15.0, elevation: 650, avgGrade: 4.3 },
  { id: 'fr_calvaire', name: "Col du Calvaire", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 12.0, elevation: 720, avgGrade: 6.0 },
  { id: 'fr_bagenelles', name: "Col des Bagenelles", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 8.8, elevation: 525, avgGrade: 6.0 },
  { id: 'fr_bramont', name: "Col du Bramont", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 7.6, elevation: 454, avgGrade: 6.0 },
  { id: 'fr_oderen', name: "Col d'Oderen", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 11.0, elevation: 570, avgGrade: 5.2 },
  { id: 'fr_hundsruck', name: "Col du Hundsruck", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 5.3, elevation: 391, avgGrade: 7.4 },
  { id: 'fr_firstplan', name: "Col du Firstplan", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 8.5, elevation: 465, avgGrade: 5.5 },
  { id: 'fr_grosse_pierre', name: "Col de la Grosse Pierre", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 9.4, elevation: 500, avgGrade: 5.3 },
  { id: 'fr_lac_blanc', name: "Le Lac Blanc", country: "FR", region: "Vogezen", flag: "🇫🇷", lengthKm: 10.0, elevation: 600, avgGrade: 6.0 },

  // --- REAL WORLD: ITALIË ---
  { id: 'it_stelvio', name: "Passo dello Stelvio (Prato)", country: "IT", region: "Alpen", flag: "🇮🇹", lengthKm: 24.8, elevation: 1845, avgGrade: 7.4 },
  { id: 'it_gavia', name: "Passo di Gavia", country: "IT", region: "Alpen", flag: "🇮🇹", lengthKm: 17.3, elevation: 1363, avgGrade: 7.9 },
  { id: 'it_mortirolo', name: "Passo del Mortirolo", country: "IT", region: "Alpen", flag: "🇮🇹", lengthKm: 12.4, elevation: 1300, avgGrade: 10.5 },
  { id: 'it_zoncolan', name: "Monte Zoncolan", country: "IT", region: "Alpen", flag: "🇮🇹", lengthKm: 10.1, elevation: 1210, avgGrade: 11.9 },
  { id: 'it_finestre', name: "Colle delle Finestre", country: "IT", region: "Alpen", flag: "🇮🇹", lengthKm: 18.6, elevation: 1694, avgGrade: 9.1 },
  { id: 'it_tre_cime', name: "Tre Cime di Lavaredo", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 7.2, elevation: 546, avgGrade: 7.6 },
  { id: 'it_grappa', name: "Monte Grappa", country: "IT", region: "Veneto", flag: "🇮🇹", lengthKm: 19.0, elevation: 1530, avgGrade: 8.1 },

  // --- REAL WORLD: SPANJE ---
  { id: 'es_angliru', name: "Alto de l'Angliru", country: "ES", region: "Asturië", flag: "🇪🇸", lengthKm: 12.5, elevation: 1266, avgGrade: 10.1 },
  { id: 'es_lagos', name: "Lagos de Covadonga", country: "ES", region: "Asturië", flag: "🇪🇸", lengthKm: 12.2, elevation: 866, avgGrade: 7.2 },
  { id: 'es_teide', name: "Mount Teide", country: "ES", region: "Tenerife", flag: "🇪🇸", lengthKm: 45.0, elevation: 2300, avgGrade: 5.1 },
  { id: 'es_sa_calobra', name: "Sa Calobra", country: "ES", region: "Mallorca", flag: "🇪🇸", lengthKm: 9.4, elevation: 668, avgGrade: 7.1 },
  { id: 'es_veleta', name: "Pico de Veleta", country: "ES", region: "Granada", flag: "🇪🇸", lengthKm: 43.0, elevation: 2700, avgGrade: 6.2 },

  // --- REAL WORLD: BENELUX/DE/AT ---
  // Nederland
  { id: 'nl_cauberg', name: "Cauberg", country: "NL", region: "Zuid-Limburg", flag: "🇳🇱", lengthKm: 0.8, elevation: 65, avgGrade: 5.8 },
  { id: 'nl_camerig', name: "Camerig", country: "NL", region: "Zuid-Limburg", flag: "🇳🇱", lengthKm: 4.6, elevation: 175, avgGrade: 3.8 },
  { id: 'nl_vaals', name: "Vaalserberg", country: "NL", region: "Zuid-Limburg", flag: "🇳🇱", lengthKm: 2.6, elevation: 110, avgGrade: 4.2 },
  { id: 'nl_keuten', name: "Keutenberg", country: "NL", region: "Zuid-Limburg", flag: "🇳🇱", lengthKm: 1.2, elevation: 68, avgGrade: 5.9 },
  { id: 'nl_eyser', name: "Eyserbosweg", country: "NL", region: "Zuid-Limburg", flag: "🇳🇱", lengthKm: 1.1, elevation: 90, avgGrade: 8.1 },
  { id: 'nl_gulper', name: "Gulperberg", country: "NL", region: "Zuid-Limburg", flag: "🇳🇱", lengthKm: 0.6, elevation: 55, avgGrade: 9.8 },
  { id: 'nl_loor', name: "Loorberg", country: "NL", region: "Zuid-Limburg", flag: "🇳🇱", lengthKm: 1.5, elevation: 80, avgGrade: 5.3 },
  { id: 'nl_from', name: "Fromberg", country: "NL", region: "Zuid-Limburg", flag: "🇳🇱", lengthKm: 1.6, elevation: 65, avgGrade: 4.0 },
  { id: 'nl_posbank', name: "Posbank", country: "NL", region: "Veluwe", flag: "🇳🇱", lengthKm: 2.2, elevation: 85, avgGrade: 3.9 },
  { id: 'nl_amerong', name: "Amerongse Berg", country: "NL", region: "Utrechtse Heuvelrug", flag: "🇳🇱", lengthKm: 1.8, elevation: 65, avgGrade: 3.6 },
  { id: 'nl_italia', name: "Italiaanseweg", country: "NL", region: "Veluwe", flag: "🇳🇱", lengthKm: 1.2, elevation: 55, avgGrade: 4.5 },
  { id: 'nl_grebbe', name: "Grebbeberg", country: "NL", region: "Utrechtse Heuvelrug", flag: "🇳🇱", lengthKm: 0.7, elevation: 40, avgGrade: 5.5 },
  { id: 'nl_holter', name: "Holterberg", country: "NL", region: "Overijssel", flag: "🇳🇱", lengthKm: 2.5, elevation: 50, avgGrade: 2.0 },
  { id: 'nl_vam', name: "VAM-Berg", country: "NL", region: "Drenthe", flag: "🇳🇱", lengthKm: 0.5, elevation: 40, avgGrade: 9.6 },
  // België
  { id: 'be_redoute', name: "Côte de la Redoute", country: "BE", region: "Ardennen", flag: "🇧🇪", lengthKm: 1.6, elevation: 147, avgGrade: 9.2 },
  { id: 'be_stockeu', name: "Côte de Stockeu", country: "BE", region: "Ardennen", flag: "🇧🇪", lengthKm: 2.3, elevation: 227, avgGrade: 9.9 },
  { id: 'be_rosier', name: "Col du Rosier", country: "BE", region: "Ardennen", flag: "🇧🇪", lengthKm: 4.4, elevation: 255, avgGrade: 5.8 },
  { id: 'be_huy', name: "Mur de Huy", country: "BE", region: "Ardennen", flag: "🇧🇪", lengthKm: 1.3, elevation: 125, avgGrade: 9.6 },
  { id: 'be_thier', name: "Thier de Coo", country: "BE", region: "Ardennen", flag: "🇧🇪", lengthKm: 2.6, elevation: 220, avgGrade: 8.5 },
  { id: 'be_baraque', name: "Baraque de Fraiture", country: "BE", region: "Ardennen", flag: "🇧🇪", lengthKm: 6.0, elevation: 280, avgGrade: 4.6 },
  { id: 'be_haussire', name: "Col de Haussire", country: "BE", region: "Ardennen", flag: "🇧🇪", lengthKm: 3.8, elevation: 250, avgGrade: 6.5 },
  { id: 'be_wanne', name: "Côte de Wanne", country: "BE", region: "Ardennen", flag: "🇧🇪", lengthKm: 2.2, elevation: 165, avgGrade: 7.5 },
  { id: 'be_roche', name: "La Roche-aux-Faucons", country: "BE", region: "Ardennen", flag: "🇧🇪", lengthKm: 1.3, elevation: 145, avgGrade: 11.0 },
  { id: 'be_kwaremont', name: "Oude Kwaremont", country: "BE", region: "Vlaanderen", flag: "🇧🇪", lengthKm: 2.2, elevation: 93, avgGrade: 4.2 },
  { id: 'be_pater', name: "Paterberg", country: "BE", region: "Vlaanderen", flag: "🇧🇪", lengthKm: 0.4, elevation: 48, avgGrade: 12.9 },
  { id: 'be_koppen', name: "Koppenberg", country: "BE", region: "Vlaanderen", flag: "🇧🇪", lengthKm: 0.6, elevation: 64, avgGrade: 11.6 },
  { id: 'be_kemmel', name: "Kemmelberg", country: "BE", region: "Vlaanderen", flag: "🇧🇪", lengthKm: 1.4, elevation: 109, avgGrade: 7.8 },
  { id: 'be_muur', name: "Muur van Geraardsbergen", country: "BE", region: "Vlaanderen", flag: "🇧🇪", lengthKm: 1.1, elevation: 92, avgGrade: 8.7 },
  // Luxemburg
  { id: 'lu_vianden', name: "Mont Saint-Nicolas", country: "LU", region: "Luxemburg", flag: "🇱🇺", lengthKm: 3.5, elevation: 290, avgGrade: 8.3 },
  { id: 'lu_bourscheid', name: "Bourscheid-Moulin", country: "LU", region: "Luxemburg", flag: "🇱🇺", lengthKm: 3.6, elevation: 265, avgGrade: 7.4 },
  { id: 'lu_esch', name: "Esch-sur-Sûre", country: "LU", region: "Luxemburg", flag: "🇱🇺", lengthKm: 2.5, elevation: 160, avgGrade: 6.4 },
  { id: 'lu_putscheid', name: "Putscheid", country: "LU", region: "Luxemburg", flag: "🇱🇺", lengthKm: 2.8, elevation: 210, avgGrade: 7.5 },
  { id: 'lu_kauten', name: "Kautenbach", country: "LU", region: "Luxemburg", flag: "🇱🇺", lengthKm: 4.5, elevation: 230, avgGrade: 5.1 },
  // Austria
  { id: 'at_grossglockner', name: "Grossglockner (Edelweissspitze)", country: "AT", region: "Alpen", flag: "🇦🇹", lengthKm: 14.0, elevation: 2571, avgGrade: 9.5 },
  { id: 'at_kitzbuheler', name: "Kitzbüheler Horn", country: "AT", region: "Tirol", flag: "🇦🇹", lengthKm: 9.7, elevation: 1670, avgGrade: 12.9 },
  { id: 'at_rettenbach', name: "Rettenbachferner (Sölden)", country: "AT", region: "Ötztal", flag: "🇦🇹", lengthKm: 13.5, elevation: 2670, avgGrade: 10.5 },
  { id: 'at_kuhtai', name: "Kühtai (Oetz)", country: "AT", region: "Tirol", flag: "🇦🇹", lengthKm: 18.5, elevation: 2017, avgGrade: 6.1 },
  { id: 'at_timmelsjoch', name: "Timmelsjoch (Sölden)", country: "AT", region: "Ötztal", flag: "🇦🇹", lengthKm: 29.0, elevation: 2509, avgGrade: 3.8 },
  { id: 'at_horn', name: "Zillertaler Höhenstrasse", country: "AT", region: "Zillertal", flag: "🇦🇹", lengthKm: 13.0, elevation: 2020, avgGrade: 10.0 },

  // Duitsland
  { id: 'de_nebelhorn', name: "Nebelhorn", country: "DE", region: "Beieren", flag: "🇩🇪", lengthKm: 7.3, elevation: 1102, avgGrade: 15.1 },
  { id: 'de_schlappold', name: "Alpe Schlappold", country: "DE", region: "Beieren", flag: "🇩🇪", lengthKm: 7.3, elevation: 876, avgGrade: 12.0 },
  { id: 'de_rossfeld', name: "Rossfeld Panoramastrasse", country: "DE", region: "Beieren", flag: "🇩🇪", lengthKm: 15.4, elevation: 1540, avgGrade: 7.0 },
  { id: 'de_schauinsland', name: "Schauinsland", country: "DE", region: "Zwarte Woud", flag: "🇩🇪", lengthKm: 11.5, elevation: 1200, avgGrade: 6.5 },
  { id: 'de_kandel', name: "Kandel", country: "DE", region: "Zwarte Woud", flag: "🇩🇪", lengthKm: 12.0, elevation: 1241, avgGrade: 8.0 },
  { id: 'de_belchen', name: "Belchen", country: "DE", region: "Zwarte Woud", flag: "🇩🇪", lengthKm: 10.0, elevation: 1350, avgGrade: 6.0 },

  // Andorra
  { id: 'ad_arcalis', name: "Ordino-Arcalís", country: "AD", region: "Andorra", flag: "🇦🇩", lengthKm: 10.5, elevation: 2229, avgGrade: 7.1 },
  { id: 'ad_cen', name: "Port de Cabús", country: "AD", region: "Andorra", flag: "🇦🇩", lengthKm: 18.0, elevation: 2328, avgGrade: 6.2 },

  // --- REAL WORLD: FRANKRIJK (Extra 2) ---
  { id: 'fr_plateau_beille', name: "Plateau de Beille", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 15.8, elevation: 1790, avgGrade: 7.9 },
  { id: 'fr_luz_ardiden', name: "Luz Ardiden", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 14.7, elevation: 1720, avgGrade: 6.9 },
  { id: 'fr_ax_3', name: "Ax-3-Domaines", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 7.8, elevation: 1351, avgGrade: 8.2 },
  { id: 'fr_agnel', name: "Col Agnel", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 20.5, elevation: 2744, avgGrade: 6.6 },
  { id: 'fr_izoard_sud', name: "Col d'Izoard (Zuid)", country: "FR", region: "Alpen", flag: "🇫🇷", lengthKm: 15.9, elevation: 2360, avgGrade: 6.9 },

  // --- REAL WORLD: SPANJE (Extra) ---
  { id: 'es_bola', name: "Bola del Mundo", country: "ES", region: "Madrid", flag: "🇪🇸", lengthKm: 3.5, elevation: 2247, avgGrade: 11.8 },
  { id: 'es_cabarga', name: "Peña Cabarga", country: "ES", region: "Cantabria", flag: "🇪🇸", lengthKm: 6.0, elevation: 569, avgGrade: 9.2 },
  { id: 'es_zoncolan_es', name: "Alto de l'Angliru (korter)", country: "ES", region: "Asturië", flag: "🇪🇸", lengthKm: 6.5, elevation: 1570, avgGrade: 13.0 },

  // --- REAL WORLD: ITALIË (Extra 2) ---
  { id: 'it_falzarego', name: "Passo Falzarego", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 15.0, elevation: 2105, avgGrade: 5.8 },
  { id: 'it_valparola', name: "Passo Valparola", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 13.0, elevation: 2192, avgGrade: 6.0 },
  { id: 'it_san_pellegrino', name: "Passo San Pellegrino", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 11.5, elevation: 1918, avgGrade: 6.5 },

  // --- REAL WORLD: UK ---
  { id: 'uk_hardknott', name: "Hardknott Pass", country: "UK", region: "Lake District", flag: "🇬🇧", lengthKm: 2.2, elevation: 298, avgGrade: 13.3 },
  { id: 'uk_wrynose', name: "Wrynose Pass", country: "UK", region: "Lake District", flag: "🇬🇧", lengthKm: 2.7, elevation: 280, avgGrade: 10.4 },
  { id: 'uk_green_lane', name: "Green Lane", country: "UK", region: "England", flag: "🇬🇧", lengthKm: 5.7, elevation: 347, avgGrade: 6.1 },
  { id: 'uk_park_rash', name: "Park Rash", country: "UK", region: "England", flag: "🇬🇧", lengthKm: 4.2, elevation: 302, avgGrade: 7.2 },

  // --- REAL WORLD: ZWITSERLAND ---
  { id: 'ch_gotthard', name: "Gotthard Pass (Tremola)", country: "CH", region: "Alpen", flag: "🇨🇭", lengthKm: 12.7, elevation: 932, avgGrade: 7.3 },
  { id: 'ch_furka', name: "Furka Pass", country: "CH", region: "Alpen", flag: "🇨🇭", lengthKm: 12.1, elevation: 890, avgGrade: 7.3 },
  { id: 'ch_grimsel', name: "Grimsel Pass", country: "CH", region: "Alpen", flag: "🇨🇭", lengthKm: 26.0, elevation: 1540, avgGrade: 5.9 },
  { id: 'ch_nufenen', name: "Nufenen Pass", country: "CH", region: "Alpen", flag: "🇨🇭", lengthKm: 13.6, elevation: 1144, avgGrade: 8.4 },
  { id: 'ch_albula', name: "Albula Pass", country: "CH", region: "Alpen", flag: "🇨🇭", lengthKm: 22.4, elevation: 1432, avgGrade: 6.4 },
  { id: 'ch_bernina', name: "Bernina Pass", country: "CH", region: "Alpen", flag: "🇨🇭", lengthKm: 18.2, elevation: 1285, avgGrade: 7.1 },
  { id: 'ch_grosse_scheidegg', name: "Grosse Scheidegg (Meiringen)", country: "CH", region: "Alpen", flag: "🇨🇭", lengthKm: 16.4, elevation: 1360, avgGrade: 8.1 },
  { id: 'ch_susten', name: "Susten Pass", country: "CH", region: "Alpen", flag: "🇨🇭", lengthKm: 17.4, elevation: 1308, avgGrade: 7.5 },
  { id: 'ch_san_bernardino', name: "San Bernardino Pass", country: "CH", region: "Alpen", flag: "🇨🇭", lengthKm: 25.0, elevation: 1615, avgGrade: 6.2 },

  // --- REAL WORLD: ITALIË (Extra) ---
  { id: 'it_giau', name: "Passo Giau (Selva)", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 9.9, elevation: 922, avgGrade: 9.3 },
  { id: 'it_fedaia', name: "Passo Fedaia (Malga Ciapela)", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 14.1, elevation: 1048, avgGrade: 7.5 },
  { id: 'it_sella', name: "Passo Sella", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 5.5, elevation: 393, avgGrade: 7.3 },
  { id: 'it_pardoi', name: "Passo Pordoi (Canazei)", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 12.0, elevation: 790, avgGrade: 6.5 },
  { id: 'it_gardena', name: "Passo Gardena", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 9.6, elevation: 580, avgGrade: 6.2 },
  { id: 'it_campolongo', name: "Passo Campolongo", country: "IT", region: "Dolomieten", flag: "🇮🇹", lengthKm: 3.9, elevation: 236, avgGrade: 6.0 },

  // --- REAL WORLD: FRANKRIJK (Extra) ---
  { id: 'fr_peyre', name: "Col de Peyresourde", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 9.9, elevation: 720, avgGrade: 7.4 },
  { id: 'fr_aspin', name: "Col d'Aspin (Arreau)", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 12.0, elevation: 779, avgGrade: 6.5 },
  { id: 'fr_superbag', name: "Superbagnères", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 18.5, elevation: 1170, avgGrade: 6.3 },
  { id: 'fr_portet', name: "Col de Portet", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 16.0, elevation: 1400, avgGrade: 8.7 },
  { id: 'fr_soulor', name: "Col du Soulor", country: "FR", region: "Pyreneeën", flag: "🇫🇷", lengthKm: 7.0, elevation: 560, avgGrade: 8.0 },

  // --- REAL WORLD: USA ---
  { id: 'us_pikes', name: "Pikes Peak", country: "USA", region: "Colorado", flag: "🇺🇸", lengthKm: 39.5, elevation: 2390, avgGrade: 6.1 },
  { id: 'us_evans', name: "Mount Evans", country: "USA", region: "Colorado", flag: "🇺🇸", lengthKm: 44.3, elevation: 1999, avgGrade: 4.5 },
  { id: 'us_lemmon', name: "Mount Lemmon", country: "USA", region: "Arizona", flag: "🇺🇸", lengthKm: 34.0, elevation: 1650, avgGrade: 4.9 },
  { id: 'us_haleakala', name: "Haleakala", country: "USA", region: "Hawaii", flag: "🇺🇸", lengthKm: 56.0, elevation: 3050, avgGrade: 5.5 },
  { id: 'us_onion', name: "Onion Valley", country: "USA", region: "California", flag: "🇺🇸", lengthKm: 20.8, elevation: 1610, avgGrade: 7.8 },

  // --- REAL WORLD: OVERIG ---
  { id: 'co_letras', name: "Alto de Letras", country: "CO", region: "Andes", flag: "🇨🇴", lengthKm: 80.0, elevation: 3200, avgGrade: 4.0 },
  { id: 'tw_wuling', name: "Wuling Pass", country: "TW", region: "Taiwan", flag: "🇹🇼", lengthKm: 85.0, elevation: 3275, avgGrade: 4.0 },

  // ==========================================
  // ZWIFT: WATOPIA (Regulars)
  // ==========================================
  { id: 'zw_alpe', name: "Alpe du Zwift", country: "Zwift", region: "Watopia", flag: "🟧", lengthKm: 12.2, elevation: 1036, avgGrade: 8.5 },
  { id: 'zw_epic', name: "Epic KOM", country: "Zwift", region: "Watopia", flag: "🟧", lengthKm: 9.4, elevation: 540, avgGrade: 5.9 },
  { id: 'zw_epic_rev', name: "Epic KOM Reverse", country: "Zwift", region: "Watopia", flag: "🟧", lengthKm: 6.2, elevation: 364, avgGrade: 5.9 },
  { id: 'zw_radio', name: "Radio Tower", country: "Zwift", region: "Watopia", flag: "🟧", lengthKm: 1.1, elevation: 150, avgGrade: 13.7 },
  { id: 'zw_volcano', name: "Volcano KOM", country: "Zwift", region: "Watopia", flag: "🟧", lengthKm: 3.75, elevation: 120, avgGrade: 3.2 },
  { id: 'zw_hilly', name: "Hilly KOM", country: "Zwift", region: "Watopia", flag: "🟧", lengthKm: 0.9, elevation: 50, avgGrade: 5.5 },
  { id: 'zw_hilly_rev', name: "Hilly KOM Reverse", country: "Zwift", region: "Watopia", flag: "🟧", lengthKm: 2.5, elevation: 49, avgGrade: 1.8 },
  { id: 'z_titans', name: "Titans Grove KOM", country: "Zwift", region: "Watopia", flag: "🟧", lengthKm: 2.6, elevation: 119, avgGrade: 4.6 },

  // ==========================================
  // ZWIFT: WORLD MAPS (Regulars)
  // ==========================================
  { id: 'zw_ven_top', name: "Ven-Top", country: "Zwift", region: "France", flag: "🟧", lengthKm: 20.9, elevation: 1534, avgGrade: 7.3 },
  { id: 'zw_petit_kom', name: "Petit KOM", country: "Zwift", region: "France", flag: "🟧", lengthKm: 2.7, elevation: 106, avgGrade: 4.0 },
  { id: 'zw_innsbruck', name: "Innsbruck KOM", country: "Zwift", region: "Innsbruck", flag: "🟧", lengthKm: 7.4, elevation: 400, avgGrade: 5.4 },
  { id: 'z_igls', name: "Igls (Reverse)", country: "Zwift", region: "Innsbruck", flag: "🟧", lengthKm: 5.6, elevation: 230, avgGrade: 4.1 },
  { id: 'zw_box_hill', name: "Box Hill", country: "Zwift", region: "London", flag: "🟧", lengthKm: 3.0, elevation: 137, avgGrade: 4.3 },
  { id: 'zw_leith_hill', name: "Leith Hill", country: "Zwift", region: "London", flag: "🟧", lengthKm: 1.9, elevation: 134, avgGrade: 6.8 },
  { id: 'zw_keith_hill', name: "Keith Hill", country: "Zwift", region: "London", flag: "🟧", lengthKm: 4.2, elevation: 228, avgGrade: 5.2 },
  { id: 'zw_fox_hill', name: "Fox Hill", country: "Zwift", region: "London", flag: "🟧", lengthKm: 2.4, elevation: 118, avgGrade: 4.9 },
  { id: 'zw_ny_kom', name: "New York KOM", country: "Zwift", region: "New York", flag: "🟧", lengthKm: 1.4, elevation: 89, avgGrade: 6.1 },
  { id: 'zw_richmond_kom', name: "Richmond KOM", country: "Zwift", region: "Richmond", flag: "🟧", lengthKm: 0.28, elevation: 19, avgGrade: 6.5 },
  { id: 'zw_richmond_23', name: "23rd Street", country: "Zwift", region: "Richmond", flag: "🟧", lengthKm: 0.27, elevation: 26, avgGrade: 10.0 },
  { id: 'zw_bologna', name: "San Luca (Bologna)", country: "Zwift", region: "Bologna", flag: "🟧", lengthKm: 2.0, elevation: 218, avgGrade: 10.8 },
  { id: 'zw_sgurr', name: "Sgurr Summit", country: "Zwift", region: "Scotland", flag: "🟧", lengthKm: 3.3, elevation: 113, avgGrade: 3.4 },
  { id: 'zw_yorkshire', name: "Yorkshire KOM", country: "Zwift", region: "Yorkshire", flag: "🟧", lengthKm: 1.2, elevation: 55, avgGrade: 5.5 },
  { id: 'zw_temple', name: "Temple KOM", country: "Zwift", region: "Makuri Islands", flag: "🟧", lengthKm: 1.9, elevation: 64, avgGrade: 3.6 },
  { id: 'zw_rooftop', name: "Rooftop KOM", country: "Zwift", region: "Makuri Islands", flag: "🟧", lengthKm: 1.87, elevation: 80, avgGrade: 4.3 },
  { id: 'zw_castle', name: "Castle KOM", country: "Zwift", region: "Makuri Islands", flag: "🟧", lengthKm: 2.7, elevation: 68, avgGrade: 2.5 },

  // ==========================================
  // ZWIFT: CLIMB PORTAL (The Simulation List)
  // ==========================================
  { id: 'zp_pike', name: "Cote de Pike", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 2.0, elevation: 200, avgGrade: 10.0 },
  { id: 'zp_tourmalet', name: "Col du Tourmalet", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 16.9, elevation: 1268, avgGrade: 7.4 },
  { id: 'zp_aspin', name: "Col d'Aspin", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 12.0, elevation: 779, avgGrade: 6.5 },
  { id: 'zp_puy_dome', name: "Puy de Dôme", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 10.5, elevation: 882, avgGrade: 8.4 },
  { id: 'zp_superplanche', name: "Superplanche", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 7.0, elevation: 614, avgGrade: 8.7 },
  { id: 'zp_couillole', name: "Col de la Couillole", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 15.8, elevation: 1157, avgGrade: 7.3 },
  { id: 'zp_eze', name: "Col d'Eze", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 10.0, elevation: 501, avgGrade: 4.9 },
  { id: 'zp_willunga', name: "Old Willunga Hill", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 3.0, elevation: 227, avgGrade: 7.6 },
  { id: 'zp_crow_road', name: "Crow Road", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 5.6, elevation: 273, avgGrade: 4.8 },
  { id: 'zp_fuji', name: "Mt. Fuji (Subaru Line)", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 22.2, elevation: 1182, avgGrade: 5.3 },
  { id: 'zp_rocacorba', name: "Rocacorba", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 10.0, elevation: 650, avgGrade: 6.5 },
  { id: 'zp_aravis', name: "Col des Aravis", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 4.4, elevation: 257, avgGrade: 5.8 },
  { id: 'zp_domancy', name: "Cote de Domancy", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 2.6, elevation: 218, avgGrade: 8.4 },
  { id: 'zp_tre_cime', name: "Tre Cime di Lavaredo", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 7.5, elevation: 574, avgGrade: 7.6 },
  { id: 'zp_valparola', name: "Passo Valparola", country: "Zwift", region: "Climb Portal", flag: "🌀", lengthKm: 13.9, elevation: 813, avgGrade: 5.8 },
  // Rotations
  { id: 'zp_bealach', name: "Bealach na Bà", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 9.0, elevation: 632, avgGrade: 7.0 },
  { id: 'zp_cauberg', name: "Cauberg", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 0.8, elevation: 57, avgGrade: 7.1 },
  { id: 'zp_cheddar', name: "Cheddar Gorge", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 4.7, elevation: 171, avgGrade: 3.6 },
  { id: 'zp_cipressa', name: "Cipressa", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 6.4, elevation: 228, avgGrade: 3.5 },
  { id: 'zp_croix', name: "Col de la Croix Saint-Robert", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 5.7, elevation: 346, avgGrade: 6.1 },
  { id: 'zp_madeleine', name: "Col de la Madeleine", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 14.3, elevation: 1118, avgGrade: 7.8 },
  { id: 'zp_madone', name: "Col de la Madone", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 16.3, elevation: 902, avgGrade: 5.5 },
  { id: 'zp_peyresourde', name: "Col de Peyresourde", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 8.3, elevation: 559, avgGrade: 6.7 },
  { id: 'zp_platzer', name: "Col du Platzerwasel", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 7.8, elevation: 592, avgGrade: 7.3 },
  { id: 'zp_rosier', name: "Col du Rosier", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 5.0, elevation: 222, avgGrade: 4.5 },
  { id: 'zp_ordino', name: "Coll d'Ordino", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 10.3, elevation: 511, avgGrade: 5.0 },
  { id: 'zp_redoute', name: "Côte de La Redoute", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 1.5, elevation: 153, avgGrade: 10.2 },
  { id: 'zp_trebiac', name: "Cote de Trebiac", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 4.6, elevation: 207, avgGrade: 4.2 },
  { id: 'zp_forche', name: "Côte des Forche", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 3.0, elevation: 148, avgGrade: 4.9 },
  { id: 'zp_gotthard', name: "Gotthard Pass", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 14.4, elevation: 909, avgGrade: 6.3 },
  { id: 'zp_hardknott', name: "Hardknott Pass", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 2.7, elevation: 306, avgGrade: 11.5 },
  { id: 'zp_hautacam', name: "Hautacam", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 12.7, elevation: 1029, avgGrade: 8.1 },
  { id: 'zp_isola', name: "Isola 2000", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 18.9, elevation: 1145, avgGrade: 5.9 },
  { id: 'zp_laguna', name: "La Laguna Negra", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 9.1, elevation: 510, avgGrade: 5.6 },
  { id: 'zp_turbie', name: "La Turbie + Col d'Eze", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 15.2, elevation: 616, avgGrade: 3.1 },
  { id: 'zp_lagos', name: "Lagos de Covadonga", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 14.5, elevation: 976, avgGrade: 6.7 },
  { id: 'zp_chinaillon', name: "Montée du Chinaillon", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 8.1, elevation: 353, avgGrade: 4.4 },
  { id: 'zp_hamilton', name: "Mt. Hamilton", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 31.3, elevation: 1259, avgGrade: 3.5 },
  { id: 'zp_mur_bretagne', name: "Mûr de Bretagne", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 2.0, elevation: 129, avgGrade: 6.6 },
  { id: 'zp_norton', name: "Norton Summit", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 8.7, elevation: 363, avgGrade: 4.0 },
  { id: 'zp_old_la_honda', name: "Old La Honda", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 5.6, elevation: 396, avgGrade: 7.1 },
  { id: 'zp_kwaremont', name: "Oude Kwaremont", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 1.5, elevation: 64, avgGrade: 4.3 },
  { id: 'zp_peyrol', name: "Pas de Peyrol/Puy Mary", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 10.2, elevation: 603, avgGrade: 5.9 },
  { id: 'zp_pla_adet', name: "Pla d'Adet", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 12.1, elevation: 847, avgGrade: 6.9 },
  { id: 'zp_poggio', name: "Poggio", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 4.3, elevation: 136, avgGrade: 3.2 },
  { id: 'zp_trollstigen', name: "Trollstigen", country: "Zwift", region: "Portal", flag: "🌀", lengthKm: 12.4, elevation: 784, avgGrade: 6.3 },
];

export const CLIMB_DATABASE = RAW_CLIMBS.map(c => ({
  ...c,
  url: c.url || getClimbUrl(c.name, c.country)
}));
