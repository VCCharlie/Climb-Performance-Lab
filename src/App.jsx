import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, ComposedChart, Bar 
} from 'recharts';
import { 
  Activity, Upload, TrendingUp, ChevronDown, ChevronRight, ChevronUp,
  Timer, Search, Zap, Mountain, Gauge, Brain, Battery, 
  Droplets, Utensils, Minus, Plus, Link as LinkIcon, Download,
  Map, Cloud, Trash2, AlertTriangle, Info, CheckCircle, ArrowUpDown
} from 'lucide-react';

// --- FIREBASE CONFIGURATION & INIT ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Jouw configuratie
const firebaseConfig = {
  apiKey: "AIzaSyBNWzcEXhzra-iCkHiZj_FdYUf0NcKvHAk",
  authDomain: "climb-performance-lab.firebaseapp.com",
  projectId: "climb-performance-lab",
  storageBucket: "climb-performance-lab.firebasestorage.app",
  messagingSenderId: "97555677694",
  appId: "1:97555677694:web:fa84b31445639e260cc0af",
  measurementId: "G-G4WLCWCXFK"
};

let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase init error:", error);
}

/**
 * ============================================================================
 * 1. CLIMB DATABASE & CONSTANTS
 * ============================================================================
 */

const getClimbUrl = (name, country) => {
  if (country === 'Zwift') return `https://zwiftinsider.com/?s=${name.replace(/\s+/g, '+')}`;
  return `https://climbfinder.com/en/climbs/${name.toLowerCase().replace(/[\s/().']+/g, '-').replace(/-+$/, '')}`;
};

const CLIMB_DATABASE = [
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
{ id: 'nl_cauberg', name: "Cauberg", country: "NL", region: "Limburg", flag: "🇳🇱", lengthKm: 0.8, elevation: 65, avgGrade: 5.8 },
{ id: 'nl_camerig', name: "Camerig", country: "NL", region: "Limburg", flag: "🇳🇱", lengthKm: 4.6, elevation: 175, avgGrade: 3.8 },
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
{ id: 'at_grossglockner', name: "Grossglockner", country: "AT", region: "Alpen", flag: "🇦🇹", lengthKm: 14.0, elevation: 1280, avgGrade: 9.5 },
{ id: 'at_kitzbuheler', name: "Kitzbüheler Horn", country: "AT", region: "Tirol", flag: "🇦🇹", lengthKm: 9.7, elevation: 1290, avgGrade: 12.9 },
// Duitsland
{ id: 'de_nebelhorn', name: "Nebelhorn", country: "DE", region: "Beieren", flag: "🇩🇪", lengthKm: 7.3, elevation: 1102, avgGrade: 15.1 },
{ id: 'de_schlappold', name: "Alpe Schlappold", country: "DE", region: "Beieren", flag: "🇩🇪", lengthKm: 7.3, elevation: 876, avgGrade: 12.0 },

// --- REAL WORLD: UK ---
{ id: 'uk_hardknott', name: "Hardknott Pass", country: "UK", region: "Lake District", flag: "🇬🇧", lengthKm: 2.2, elevation: 298, avgGrade: 13.3 },
{ id: 'uk_wrynose', name: "Wrynose Pass", country: "UK", region: "Lake District", flag: "🇬🇧", lengthKm: 2.7, elevation: 280, avgGrade: 10.4 },
{ id: 'uk_green_lane', name: "Green Lane", country: "UK", region: "England", flag: "🇬🇧", lengthKm: 5.7, elevation: 347, avgGrade: 6.1 },
{ id: 'uk_park_rash', name: "Park Rash", country: "UK", region: "England", flag: "🇬🇧", lengthKm: 4.2, elevation: 302, avgGrade: 7.2 },

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
{ id: 'zp_pike', name: "Cote de Pike", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 2.0, elevation: 200, avgGrade: 10.0 },
{ id: 'zp_tourmalet', name: "Col du Tourmalet", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 16.9, elevation: 1268, avgGrade: 7.4 },
{ id: 'zp_aspin', name: "Col d'Aspin", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 12.0, elevation: 779, avgGrade: 6.5 },
{ id: 'zp_puy_dome', name: "Puy de Dôme", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 10.5, elevation: 882, avgGrade: 8.4 },
{ id: 'zp_superplanche', name: "Superplanche", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 7.0, elevation: 614, avgGrade: 8.7 },
{ id: 'zp_couillole', name: "Col de la Couillole", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 15.8, elevation: 1157, avgGrade: 7.3 },
{ id: 'zp_eze', name: "Col d'Eze", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 10.0, elevation: 501, avgGrade: 4.9 },
{ id: 'zp_willunga', name: "Old Willunga Hill", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 3.0, elevation: 227, avgGrade: 7.6 },
{ id: 'zp_crow_road', name: "Crow Road", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 5.6, elevation: 273, avgGrade: 4.8 },
{ id: 'zp_fuji', name: "Mt. Fuji (Subaru Line)", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 22.2, elevation: 1182, avgGrade: 5.3 },
{ id: 'zp_rocacorba', name: "Rocacorba", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 10.0, elevation: 650, avgGrade: 6.5 },
{ id: 'zp_aravis', name: "Col des Aravis", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 4.4, elevation: 257, avgGrade: 5.8 },
{ id: 'zp_domancy', name: "Cote de Domancy", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 2.6, elevation: 218, avgGrade: 8.4 },
{ id: 'zp_tre_cime', name: "Tre Cime di Lavaredo", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 7.5, elevation: 574, avgGrade: 7.6 },
{ id: 'zp_lusk', name: "Luskentyre", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 3.2, elevation: 85, avgGrade: 2.7 },
{ id: 'zp_valparola', name: "Passo Valparola", country: "Zwift", region: "Climb Portal", flag: "🟧", lengthKm: 13.9, elevation: 813, avgGrade: 5.8 },
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
].map(c => ({...c, url: c.url || getClimbUrl(c.name, c.country)}));

const COGGAN_ZONES = [
  { name: 'Z1 Recovery', min: 0, max: 0.55, color: '#9ca3af' },
  { name: 'Z2 Endurance', min: 0.56, max: 0.75, color: '#3b82f6' },
  { name: 'Z3 Tempo', min: 0.76, max: 0.90, color: '#22c55e' },
  { name: 'Z4 Threshold', min: 0.91, max: 1.05, color: '#eab308' },
  { name: 'Z5 VO2 Max', min: 1.06, max: 1.20, color: '#f97316' },
  { name: 'Z6 Anaerobic', min: 1.21, max: 1.50, color: '#ef4444' },
  { name: 'Z7 Neuro', min: 1.51, max: 10.0, color: '#a855f7' }
];

const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * ============================================================================
 * 2. HELPERS & PARSERS
 * ============================================================================
 */

const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    return dateStr;
};

const formatDateDDMMYYYY = (isoDateString) => {
  if (!isoDateString || isoDateString === 'Invalid Date') return '-';
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return isoDateString; 
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatTime = (seconds) => {
  // Safe number check
  const sNum = Number(seconds);
  if (!sNum || isNaN(sNum)) return "00:00";
  const h = Math.floor(sNum / 3600);
  const m = Math.floor((sNum % 3600) / 60);
  const s = Math.floor(sNum % 60);
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseDurationToSeconds = (str) => {
  if(!str) return 0;
  if(typeof str === 'number') return str;
  if(str.includes('h') || str.includes('m')) {
    let s = 0;
    const h = str.match(/(\d+)h/);
    const m = str.match(/(\d+)m/);
    if(h) s += parseInt(h[1]) * 3600;
    if(m) s += parseInt(m[1]) * 60;
    return s;
  }
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

// NaN Protected Rolling Average
const calculateRollingTrend = (activities, targetDateStr, metricKey, windowDays = 15) => {
  const targetDate = new Date(targetDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  const inWindow = activities.filter(a => {
    const d = new Date(a.date);
    const diffDays = Math.abs((targetDate - d) / msPerDay);
    // Explicit Number() conversion to avoid string concatenation or NaNs
    const val = Number(a[metricKey]);
    return diffDays <= windowDays && !isNaN(val) && val > 0;
  });

  if (inWindow.length === 0) return 0;
  
  const sum = inWindow.reduce((acc, curr) => acc + (Number(curr[metricKey]) || 0), 0);
  return sum / inWindow.length;
};

const smartParseCSV = (text, type = 'generic') => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
  const rawHeaders = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));

  const mapHeader = (h) => {
    if (h === 'name' || h === 'title' || h === 'activity_name' || h === 'activity') return 'title';
    if (h.includes('date') || h.includes('datum')) return 'date';
    if (h.includes('moving') || h.includes('elapsed') || h.includes('tijd')) return 'moving_time';
    if (h.includes('distance') || h.includes('afstand')) return 'distance';
    if (h.includes('climb') || h.includes('elevation') || h.includes('hoogte')) return 'climbing';
    if (h.includes('speed') || h.includes('snelheid')) return 'avg_speed';
    if (h.includes('norm') || h.includes('np')) return 'norm_power';
    if (h.includes('avg power') || h.includes('gem. vermogen')) return 'avg_power';
    if (h === 'load' || h === 'tss' || h === 'icu_training_load' || h === 'training_load') return 'load';
    if (h === 'rpe' || h === 'icu_rpe' || h === 'feel') return 'rpe';
    if (h.includes('5m') || h.includes('5 min')) return 'best_5min';
    if (h.includes('20m') || h.includes('20 min')) return 'best_20min';
    if (h.includes('60m') || h.includes('60 min')) return 'best_60min';
    return null;
  };

  const colMap = rawHeaders.map(mapHeader);

  return lines.slice(1).map(line => {
    const cols = line.split(delimiter);
    const entry = {};
    
    colMap.forEach((key, idx) => {
      if (key && cols[idx]) {
        let val = cols[idx].trim().replace(/['"]+/g, '');
        if (key === 'date') {
            val = normalizeDate(val);
        } else if (key !== 'title') {
          if (key === 'moving_time' && val.includes(':')) {
            val = parseDurationToSeconds(val);
          } else {
            val = parseFloat(val.replace(',', '.'));
          }
          if (isNaN(val)) val = 0;
        }
        entry[key] = val;
      }
    });

    if (!entry.title) entry.title = "Untitled Activity"; 
    if (!entry.id) entry.id = Math.random().toString(36).substr(2, 9);
    if (!entry.date || entry.date === 'Invalid Date') entry.date = new Date().toISOString().split('T')[0];
    
    // Safety defaults for NaN prevention
    ['load', 'norm_power', 'avg_power', 'climbing', 'distance'].forEach(k => {
        if(!entry[k]) entry[k] = 0;
    });

    return entry;
  }).filter(e => e.distance > 0 || e.moving_time > 0);
};

/**
 * ============================================================================
 * 3. SUB-COMPONENTS
 * ============================================================================
 */

const PhysicsEngine = ({ userSettings, setUserSettings, selectedClimb, onUpdateClimb }) => {
  const [mode, setMode] = useState('target'); 
  const [targetTimeStr, setTargetTimeStr] = useState("59:00");
  const [targetWatts, setTargetWatts] = useState(userSettings.ftp);
  const [calc, setCalc] = useState({ watts: 0, wkg: 0, time: "", vam: 0, zone: null });
  const [countryFilter, setCountryFilter] = useState('All');

  const updateWeight = (type, delta) => {
    const current = type === 'body' ? userSettings.weight : userSettings.bikeWeight;
    const newVal = parseFloat((current + delta).toFixed(1));
    setUserSettings(prev => ({ ...prev, [type === 'body' ? 'weight' : 'bikeWeight']: newVal }));
  };

  useEffect(() => {
    if (!selectedClimb) return;
    const totalWeight = userSettings.weight + userSettings.bikeWeight;
    const grade = selectedClimb.avgGrade / 100;
    const distance = selectedClimb.lengthKm * 1000;
    const elevation = selectedClimb.elevation;
    const g = 9.81; const rho = 1.225; const cda = 0.32; const crr = 0.004; const loss = 0.03;

    let watts = 0, seconds = 0;

    if (mode === 'target') {
      seconds = parseDurationToSeconds(targetTimeStr);
      if (seconds > 0) {
        const v = distance / seconds; 
        const F_g = totalWeight * g * Math.sin(Math.atan(grade));
        const F_r = totalWeight * g * Math.cos(Math.atan(grade)) * crr;
        const F_a = 0.5 * rho * cda * v * v;
        const P_wheel = (F_g + F_r + F_a) * v;
        watts = P_wheel / (1 - loss);
      }
    } else {
      watts = parseFloat(targetWatts);
      const P_wheel = watts * (1 - loss);
      const theta = Math.atan(grade);
      const K1 = 0.5 * rho * cda;
      const K2 = totalWeight * g * (Math.sin(theta) + crr * Math.cos(theta));
      let v = 3; 
      for(let i=0; i<10; i++) {
        const f = K1 * Math.pow(v, 3) + K2 * v - P_wheel;
        const df = 3 * K1 * Math.pow(v, 2) + K2;
        v = v - f / df;
      }
      seconds = v > 0 ? distance / v : 0;
    }

    const wkg = watts / userSettings.weight;
    const vam = seconds > 0 ? (elevation / seconds) * 3600 : 0;
    const zone = COGGAN_ZONES.find(z => (watts / userSettings.ftp) >= z.min && (watts / userSettings.ftp) <= z.max) || COGGAN_ZONES[6];

    setCalc({ watts: Math.round(watts), wkg: wkg.toFixed(2), time: formatTime(seconds), vam: Math.round(vam), zone: zone });
  }, [mode, targetTimeStr, targetWatts, selectedClimb, userSettings]);

  const filteredClimbs = useMemo(() => {
    if(countryFilter === 'All') return CLIMB_DATABASE;
    return CLIMB_DATABASE.filter(c => c.country === countryFilter);
  }, [countryFilter]);

  const climbsGrouped = useMemo(() => {
    const groups = {};
    filteredClimbs.forEach(c => {
      let key = c.country;
      if(c.country === 'Zwift') key = `Zwift - ${c.region}`; 
      if(!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [filteredClimbs]);

  const uniqueCountries = useMemo(() => ['All', ...new Set(CLIMB_DATABASE.map(c => c.country))].sort(), []);

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><Mountain className="w-6 h-6" /> Physics Engine</h2>
            <a href={selectedClimb.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white flex items-center gap-1 text-xs" title="View Info">
              <Info size={14}/> Climb Detail
            </a>
        </div>
        <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {uniqueCountries.map(c => (
                    <button 
                        key={c} onClick={() => setCountryFilter(c)}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${countryFilter === c ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        {c === 'All' ? '🌍 All' : c}
                    </button>
                ))}
            </div>
            <select 
              className="w-full bg-slate-900 text-white rounded p-3 text-sm border border-slate-600 outline-none focus:border-yellow-400"
              value={selectedClimb.id}
              onChange={(e) => onUpdateClimb(CLIMB_DATABASE.find(c => c.id === e.target.value))}
            >
              {Object.keys(climbsGrouped).sort().map(group => (
                <optgroup key={group} label={group}>
                  {climbsGrouped[group].map(c => <option key={c.id} value={c.id}>{c.name} ({c.lengthKm}km @ {c.avgGrade}%)</option>)}
                </optgroup>
              ))}
            </select>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Rider</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => updateWeight('body', -0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Minus size={14}/></button>
                        <span className="font-mono w-16 text-center">{userSettings.weight.toFixed(1)} kg</span>
                        <button onClick={() => updateWeight('body', 0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Plus size={14}/></button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Bike</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => updateWeight('bike', -0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Minus size={14}/></button>
                        <span className="font-mono w-16 text-center">{userSettings.bikeWeight.toFixed(1)} kg</span>
                        <button onClick={() => updateWeight('bike', 0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Plus size={14}/></button>
                    </div>
                </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-1 flex">
                <button onClick={() => setMode('target')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode==='target'?'bg-yellow-400 text-slate-900':'text-slate-300'}`}>Target Time</button>
                <button onClick={() => setMode('predict')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode==='predict'?'bg-yellow-400 text-slate-900':'text-slate-300'}`}>Predict</button>
            </div>
            <div className="bg-slate-900 border border-yellow-400/30 p-4 rounded-lg">
                <label className="text-xs text-yellow-400 uppercase font-bold mb-2 block">{mode === 'target' ? 'Desired Time' : 'Sustainable Power'}</label>
                {mode === 'target' ? (
                   <input value={targetTimeStr} onChange={e => setTargetTimeStr(e.target.value)} className="w-full bg-transparent text-3xl font-mono text-white outline-none border-b border-slate-700 focus:border-yellow-400" />
                ) : (
                   <input type="number" value={targetWatts} onChange={e => setTargetWatts(e.target.value)} className="w-full bg-transparent text-3xl font-mono text-white outline-none border-b border-slate-700 focus:border-yellow-400" />
                )}
            </div>
        </div>
        <div className="lg:col-span-8 grid grid-cols-2 gap-4">
             <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
                <span className="text-xs text-slate-400 uppercase mb-1">Required Power</span>
                <span className="text-3xl font-bold text-white">{calc.watts} <small className="text-sm text-slate-500">W</small></span>
             </div>
             <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
                <span className="text-xs text-slate-400 uppercase mb-1">Power / Weight</span>
                <span className="text-3xl font-bold text-yellow-400">{calc.wkg} <small className="text-sm text-yellow-600">W/kg</small></span>
             </div>
             <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
                <span className="text-xs text-slate-400 uppercase mb-1">Est. Time</span>
                <span className="text-3xl font-bold text-white font-mono">{calc.time}</span>
             </div>
             <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
                <span className="text-xs text-slate-400 uppercase mb-1">VAM</span>
                <span className="text-3xl font-bold text-white">{calc.vam} <small className="text-sm text-slate-500">m/h</small></span>
             </div>
             <div className="col-span-2 bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-white">Intensity Zone</span>
                    {calc.zone && <span style={{color: calc.zone.color}} className="font-bold text-sm uppercase">{calc.zone.name}</span>}
                </div>
                <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex">
                    {COGGAN_ZONES.map((z, i) => (
                        <div key={i} style={{width: `${(z.max - z.min)/0.15 * 10}%`, background: z.color}} className="h-full opacity-30 hover:opacity-100 transition-opacity"></div>
                    ))}
                </div>
                <div className="relative w-full h-2 mt-1">
                     <div 
                        className="absolute w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white transform -translate-x-1/2 transition-all duration-500"
                        style={{ left: `${Math.min(Math.max((calc.watts/userSettings.ftp)/1.5 * 100, 0), 100)}%` }}
                     ></div>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

const DataHub = ({ activities, onImport, onDelete }) => {
  const [internalTab, setInternalTab] = useState('log');
  const [importText, setImportText] = useState("");
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null); 
  const [expandedYears, setExpandedYears] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const handleImport = (type) => {
    const data = smartParseCSV(importText, type);
    if(data.length) {
      onImport(data);
      setImportText("");
      setInternalTab('log');
      alert(`Succes: ${data.length} activiteiten toegevoegd!`);
    } else {
        alert("Geen geldige data. Controleer de headers.");
    }
  };

  const handleSync = async () => {
    if (!db) {
        alert("Firebase is niet correct geladen. Check je console.");
        return;
    }
    const btn = document.getElementById('sync-btn');
    if(btn) { btn.innerHTML = '↻ Syncing...'; btn.disabled = true; }
    
    try {
        let count = 0;
        for (const act of activities) {
            await setDoc(doc(db, "activities", String(act.id)), act, { merge: true });
            count++;
        }
        alert(`Cloud Sync Voltooid! (${count} items)`);
    } catch (e) {
        alert("Sync Error: " + e.message);
    } finally {
        if(btn) { btn.innerHTML = 'Cloud Sync'; btn.disabled = false; }
    }
  };

  const toggleYear = (year) => setExpandedYears(p => ({...p, [year]: !p[year]}));

  // --- SORTING LOGIC ---
  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // 1. Process Activities (Filter & Sort)
  const processedActivities = useMemo(() => {
    let filtered = activities.filter(a => a.title?.toLowerCase().includes(search.toLowerCase()) || a.date.includes(search));
    
    // Sort
    if (sortConfig.key) {
        filtered.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // String comparison (case insensitive)
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal ? bVal.toLowerCase() : '';
            } else {
                // Number safety
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return filtered;
  }, [activities, search, sortConfig]);

  // 2. Group (Only if sorting by Date, otherwise show flat list)
  const isGroupedView = sortConfig.key === 'date';

  const groupedActivities = useMemo(() => {
    if (!isGroupedView) return null;
    
    const groups = {};
    processedActivities.forEach(act => {
        const d = new Date(act.date);
        const y = d.getFullYear();
        const m = d.toLocaleString('en-US', { month: 'long' });
        if(!groups[y]) groups[y] = {};
        if(!groups[y][m]) groups[y][m] = [];
        groups[y][m].push(act);
    });
    return groups;
  }, [processedActivities, isGroupedView]);

  // --- RENDER HELPERS ---
  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 ml-1 inline" />;
    return sortConfig.direction === 'asc' 
        ? <ChevronUp size={12} className="text-yellow-400 ml-1 inline" /> 
        : <ChevronDown size={12} className="text-yellow-400 ml-1 inline" />;
  };

  const Header = ({ label, colKey, align = 'left' }) => (
    <th 
        className={`p-3 cursor-pointer hover:bg-slate-800 transition-colors select-none text-${align}`}
        onClick={() => requestSort(colKey)}
    >
        <span className="flex items-center gap-1 justify-end">
             {align === 'left' && <span className="flex-1 text-left">{label}</span>}
             {align === 'left' ? <SortIcon colKey={colKey}/> : <>{label} <SortIcon colKey={colKey}/></>}
        </span>
    </th>
  );

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
        <div className="flex border-b border-slate-700">
            <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Activity Log</button>
            <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>CSV / Excel</button>
            <button onClick={() => setInternalTab('intervals')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'intervals' ? 'bg-slate-700 text-orange-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Intervals.icu</button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col">
            {internalTab === 'log' && (
                <>
                    <div className="flex justify-between items-center mb-4 gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"/>
                            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zoek op datum, naam..." className="w-full bg-slate-900 border border-slate-600 rounded pl-10 pr-4 py-2 text-sm text-white focus:border-yellow-400 outline-none" />
                        </div>
                        <button id="sync-btn" onClick={handleSync} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-all whitespace-nowrap">
                            <Cloud size={16}/> Sync Cloud
                        </button>
                    </div>

                    <div className="overflow-x-auto flex-1 border border-slate-700 rounded-lg">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-900 text-slate-400 uppercase font-bold sticky top-0 z-10">
                                <tr>
                                    <Header label="Date" colKey="date" align="left" />
                                    <Header label="Title" colKey="title" align="left" />
                                    <Header label="Time" colKey="moving_time" align="right" />
                                    <Header label="Dist" colKey="distance" align="right" />
                                    <Header label="Elev" colKey="climbing" align="right" />
                                    <Header label="Spd" colKey="avg_speed" align="right" />
                                    <Header label="NP" colKey="norm_power" align="right" />
                                    <Header label="Avg" colKey="avg_power" align="right" />
                                    <Header label="Load" colKey="load" align="right" />
                                    <Header label="RPE" colKey="rpe" align="right" />
                                    <Header label="5m" colKey="best_5min" align="right" />
                                    <Header label="20m" colKey="best_20min" align="right" />
                                    <Header label="60m" colKey="best_60min" align="right" />
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 bg-slate-800">
                                {/* SCENARIO A: GROUPED VIEW (If sorting by Date) */}
                                {isGroupedView && groupedActivities && Object.keys(groupedActivities).sort((a,b)=> sortConfig.direction === 'asc' ? a-b : b-a).map(year => (
                                    <React.Fragment key={year}>
                                        <tr className="bg-slate-700/50">
                                            <td colSpan="14" className="p-2">
                                                <button onClick={()=>toggleYear(year)} className="flex items-center gap-2 font-bold text-slate-300 w-full text-left">
                                                    {expandedYears[year] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} {year}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedYears[year] && Object.keys(groupedActivities[year])
                                            .sort((a, b) => {
                                                const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a);
                                                return sortConfig.direction === 'asc' ? -diff : diff;
                                            })
                                            .map(month => (
                                            <React.Fragment key={month}>
                                                <tr className="bg-slate-700/20">
                                                    <td colSpan="14" className="px-8 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">{month}</td>
                                                </tr>
                                                {groupedActivities[year][month].map(act => (
                                                    <Row key={act.id} act={act} onDelete={onDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}/>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}

                                {/* SCENARIO B: FLAT SORTED VIEW (If sorting by anything else) */}
                                {!isGroupedView && processedActivities.map(act => (
                                     <Row key={act.id} act={act} onDelete={onDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}/>
                                ))}

                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {internalTab === 'import' && (
                <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded border border-slate-600">
                        <h3 className="font-bold text-white mb-2">CSV / Excel Paste</h3>
                        <p className="text-xs text-slate-400 mb-4">
                            Auto-detectie van 13 kolommen (Datum, Titel, Tijd, Afstand, Hoogte, Snelheid, NP, AvgPwr, Load, RPE, 5m, 20m, 60m).
                        </p>
                        <textarea 
                            className="w-full h-48 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white outline-none focus:border-yellow-400"
                            placeholder="Date;Title;Distance;Norm Power..."
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                        />
                        <button onClick={() => handleImport('generic')} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold py-3 rounded">Import & Parse</button>
                    </div>
                </div>
            )}

            {internalTab === 'intervals' && (
                <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded border border-slate-600">
                        <div className="flex items-center gap-2 mb-4">
                           <div className="p-2 bg-orange-500/20 rounded text-orange-400"><Activity size={20}/></div>
                           <h3 className="font-bold text-white">Intervals.icu Import</h3>
                        </div>
                        <p className="text-sm text-slate-300 mb-4">
                           Plak hier je Intervals.icu CSV export. De app herkent automatisch velden als `icu_training_load` en `icu_rpe`.
                        </p>
                        <textarea 
                            className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white outline-none focus:border-orange-400"
                            placeholder="date,name,moving_time,distance,icu_training_load,icu_rpe..."
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                        />
                        <button onClick={() => handleImport('intervals')} className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded">Parse Intervals CSV</button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

// Extracted Row Component to avoid duplication
const Row = ({ act, onDelete, deleteConfirm, setDeleteConfirm }) => (
    <tr className="hover:bg-slate-700/50 transition-colors border-b border-slate-700/50">
        <td className="p-3 text-slate-300">{formatDateDDMMYYYY(act.date)}</td>
        <td className="p-3 font-medium text-white max-w-[150px] truncate" title={act.title}>{act.title}</td>
        <td className="p-3 text-right text-slate-400">{formatTime(act.moving_time)}</td>
        <td className="p-3 text-right text-slate-400">{parseFloat(act.distance).toFixed(1)}</td>
        <td className="p-3 text-right text-slate-400">{Math.round(act.climbing || 0)}</td>
        <td className="p-3 text-right text-slate-400">{act.avg_speed ? parseFloat(act.avg_speed).toFixed(1) : '-'}</td>
        <td className="p-3 text-right font-bold text-yellow-400">{Math.round(act.norm_power || 0)}</td>
        <td className="p-3 text-right text-slate-400">{Math.round(act.avg_power || 0)}</td>
        <td className="p-3 text-right text-blue-400">{Math.round(act.load || 0)}</td>
        <td className="p-3 text-right text-slate-400">{act.rpe || '-'}</td>
        <td className="p-3 text-right text-slate-500">{act.best_5min ? Math.round(act.best_5min) : '-'}</td>
        <td className="p-3 text-right text-slate-500">{act.best_20min ? Math.round(act.best_20min) : '-'}</td>
        <td className="p-3 text-right text-slate-500">{act.best_60min ? Math.round(act.best_60min) : '-'}</td>
        <td className="p-3 text-right">
            {deleteConfirm === act.id ? (
                <div className="flex gap-2 justify-end">
                    <button onClick={() => onDelete(act.id)} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-slate-400 text-xs px-2 py-1">Cancel</button>
                </div>
            ) : (
                <button onClick={() => setDeleteConfirm(act.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14}/>
                </button>
            )}
        </td>
    </tr>
);

const FuelingStrategy = () => {
    const [duration, setDuration] = useState(180); 
    const [intensity, setIntensity] = useState(0.85);
    const [bidonSize, setBidonSize] = useState(750);

    const requirements = useMemo(() => {
        const carbsPerHour = intensity > 0.9 ? 90 : intensity > 0.8 ? 75 : 60;
        const totalCarbs = (duration / 60) * carbsPerHour;
        const fluidPerHour = 600;
        const totalFluid = (duration / 60) * fluidPerHour;
        const totalBidons = Math.ceil(totalFluid / bidonSize); 
        const fluidCarbs = totalBidons * 40; 
        const remainingCarbs = Math.max(0, totalCarbs - fluidCarbs);
        const gels = Math.round((remainingCarbs * 0.6) / 30);
        const bars = Math.round((remainingCarbs * 0.4) / 45);

        return { carbsPerHour, totalCarbs, fluidPerHour, totalFluid, totalBidons, gels, bars };
    }, [duration, intensity, bidonSize]);

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Utensils className="text-green-400"/> Race Fueling Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <label className="text-xs text-slate-400 uppercase font-bold">Verwachte Duur</label>
                        <div className="flex items-center gap-4 mt-2">
                             <input type="range" min="30" max="600" step="15" value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="flex-1 accent-yellow-400"/>
                             <span className="w-20 font-mono text-white text-right">{Math.floor(duration/60)}h {duration%60}m</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 uppercase font-bold">Intensity Factor (IF)</label>
                        <div className="flex items-center gap-4 mt-2">
                             <input type="range" min="0.5" max="1.1" step="0.01" value={intensity} onChange={e=>setIntensity(parseFloat(e.target.value))} className="flex-1 accent-red-500"/>
                             <span className="w-20 font-mono text-white text-right">{(intensity*100).toFixed(0)}%</span>
                        </div>
                    </div>
                    <div>
                         <label className="text-xs text-slate-400 uppercase font-bold">Bidon Grootte</label>
                         <div className="flex bg-slate-900 rounded p-1 mt-2 w-fit">
                            <button onClick={()=>setBidonSize(500)} className={`px-4 py-1 text-xs rounded ${bidonSize===500 ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>500ml</button>
                            <button onClick={()=>setBidonSize(750)} className={`px-4 py-1 text-xs rounded ${bidonSize===750 ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>750ml</button>
                         </div>
                    </div>
                    
                    <div className="p-4 bg-slate-900 rounded border border-slate-700 mt-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-slate-800 p-2 rounded">
                                <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1"/>
                                <div className="text-lg font-bold text-white">{requirements.carbsPerHour}g</div>
                                <div className="text-[10px] text-slate-400">Carbs/hr</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1"/>
                                <div className="text-lg font-bold text-white">{requirements.fluidPerHour}ml</div>
                                <div className="text-[10px] text-slate-400">Vocht/hr</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <Battery className="w-4 h-4 text-green-400 mx-auto mb-1"/>
                                <div className="text-lg font-bold text-white">{Math.round(requirements.totalCarbs)}g</div>
                                <div className="text-[10px] text-slate-400">Total Load</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="relative bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col justify-between">
                    <div>
                         <h3 className="text-slate-300 font-bold mb-4 uppercase tracking-wider flex items-center gap-2"><CheckCircle size={16}/> Packing List</h3>
                         <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-500/20 p-2 rounded text-blue-400"><Droplets size={20}/></div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{requirements.totalBidons}x</div>
                                        <div className="text-xs text-slate-400">Bidons ({bidonSize}ml) met Mix</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-500/20 p-2 rounded text-yellow-400"><Zap size={20}/></div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{requirements.gels}x</div>
                                        <div className="text-xs text-slate-400">Energy Gels (30g)</div>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-500/20 p-2 rounded text-green-400"><Utensils size={20}/></div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{requirements.bars}x</div>
                                        <div className="text-xs text-slate-400">Solid Bars (45g)</div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ClimbProfileCard = ({ climb }) => {
    const sectors = [
        { name: 'Start', km: '0 - ' + (climb.lengthKm * 0.3).toFixed(1), grade: (climb.avgGrade * 0.8).toFixed(1), focus: 'Find rhythm, control HR' },
        { name: 'Middle', km: (climb.lengthKm * 0.3).toFixed(1) + ' - ' + (climb.lengthKm * 0.8).toFixed(1), grade: (climb.avgGrade * 1.1).toFixed(1), focus: 'Sweetspot power, aero posture' },
        { name: 'Finale', km: (climb.lengthKm * 0.8).toFixed(1) + ' - Top', grade: (climb.avgGrade * 1.2).toFixed(1), focus: 'Empty the tank, out of saddle' },
    ];

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-full">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Map className="text-yellow-400" size={20}/> Tactical Profile: {climb.name}
            </h3>
            
            <div className="flex gap-4 mb-6">
                 <div className="bg-slate-900 p-3 rounded flex-1 text-center">
                    <div className="text-xs text-slate-500 uppercase">Length</div>
                    <div className="text-xl font-bold text-white">{climb.lengthKm} km</div>
                 </div>
                 <div className="bg-slate-900 p-3 rounded flex-1 text-center">
                    <div className="text-xs text-slate-500 uppercase">Elevation</div>
                    <div className="text-xl font-bold text-white">{climb.elevation} m</div>
                 </div>
                 <div className="bg-slate-900 p-3 rounded flex-1 text-center">
                    <div className="text-xs text-slate-500 uppercase">Avg Grade</div>
                    <div className="text-xl font-bold text-yellow-400">{climb.avgGrade}%</div>
                 </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">Key Sectors</h4>
                {sectors.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded border-l-2 border-yellow-400">
                        <div>
                            <span className="text-white font-bold text-sm block">{s.name}</span>
                            <span className="text-xs text-slate-500">{s.km} km</span>
                        </div>
                        <div className="text-right">
                             <span className="text-yellow-400 font-bold block">{s.grade}%</span>
                             <span className="text-[10px] text-slate-400">{s.focus}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [userSettings, setUserSettings] = useState({
    weight: 70.0,
    bikeWeight: 7.5,
    ftp: 280,
    maxHr: 190
  });

  const [selectedClimb, setSelectedClimb] = useState(CLIMB_DATABASE[0]);

  const [activities, setActivities] = useState([
    { id: '1', date: '2023-09-01', title: 'Base Miles', distance: 60, climbing: 400, norm_power: 200, avg_power: 180, load: 80, best_5min: 250, best_20min: 220, best_60min: 200, rpe: 4, moving_time: 7200, avg_speed: 30.0 },
    { id: '2', date: '2023-09-05', title: 'Intervals', distance: 45, climbing: 600, norm_power: 260, avg_power: 210, load: 110, best_5min: 350, best_20min: 280, best_60min: 220, rpe: 8, moving_time: 5400, avg_speed: 30.0 },
    { id: '3', date: '2023-10-12', title: 'Alpe Test', distance: 40, climbing: 1100, norm_power: 275, avg_power: 270, load: 130, best_5min: 310, best_20min: 295, best_60min: 270, rpe: 9, moving_time: 6000, avg_speed: 24.0 },
  ]);

  const [timeRange, setTimeRange] = useState('ALL');

  const chartData = useMemo(() => {
    let sorted = [...activities].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    if(timeRange !== 'ALL') {
        const now = new Date();
        const months = timeRange === '6M' ? 6 : 12;
        const cutoff = new Date(now.setMonth(now.getMonth() - months));
        sorted = sorted.filter(a => new Date(a.date) >= cutoff);
    }

    return sorted.map(act => ({
        date: act.date,
        rawFtp: act.best_20min * 0.95,
        rollingFtp: calculateRollingTrend(activities, act.date, 'norm_power', 15), 
        load: act.load
    }));
  }, [activities, timeRange]);

  // Safe Total Load Calc
  const totalLoad = activities.reduce((acc, c) => acc + (Number(c.load) || 0), 0);
  const avgLoad = activities.length > 0 ? Math.round(totalLoad / activities.length) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-yellow-400 selection:text-slate-900 pb-20">
      
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center text-slate-900 font-black text-xl italic shadow-lg shadow-yellow-500/20">CL</div>
             <div>
               <h1 className="font-bold text-white text-lg leading-tight">Climb Lab <span className="text-yellow-400 text-xs px-1 border border-yellow-400 rounded">ELITE</span></h1>
             </div>
           </div>
           <div className="flex gap-6 text-sm">
              <div className="hidden md:block">
                 <span className="text-slate-500 block text-[10px] uppercase">Sys. Weight</span>
                 <span className="text-white font-mono font-bold">{(userSettings.weight + userSettings.bikeWeight).toFixed(1)} kg</span>
              </div>
              <div className="hidden md:block">
                 <span className="text-slate-500 block text-[10px] uppercase">W/kg (FTP)</span>
                 <span className="text-yellow-400 font-mono font-bold">{(userSettings.ftp / userSettings.weight).toFixed(2)}</span>
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        <nav className="flex overflow-x-auto gap-2 pb-2 md:pb-0 scrollbar-hide">
           {[
             {id: 'dashboard', label: 'Dashboard', icon: Gauge},
             {id: 'physics', label: 'Physics Engine', icon: Mountain},
             {id: 'data', label: 'Data Hub', icon: Activity},
             {id: 'fueling', label: 'Fueling', icon: Utensils},
           ].map(item => (
             <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === item.id ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
             >
                <item.icon className="w-4 h-4"/> {item.label}
             </button>
           ))}
        </nav>

        {activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">FTP</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white">{userSettings.ftp}</span>
                                <span className="text-sm text-slate-500">W</span>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Weight</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-white">{userSettings.weight.toFixed(1)}</span>
                                <div className="flex gap-1">
                                    <button onClick={()=>setUserSettings(s=>({...s, weight: parseFloat((s.weight-0.1).toFixed(1))}))} className="p-1 bg-slate-700 rounded hover:bg-slate-600">-</button>
                                    <button onClick={()=>setUserSettings(s=>({...s, weight: parseFloat((s.weight+0.1).toFixed(1))}))} className="p-1 bg-slate-700 rounded hover:bg-slate-600">+</button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Load (Avg)</h3>
                            <span className="text-3xl font-bold text-blue-400">{avgLoad}</span>
                        </div>
                      </div>

                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-yellow-400"/> FTP & Load</h3>
                            <div className="flex bg-slate-900 rounded p-1">
                                {['6M','1Y','ALL'].map(r => (
                                    <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1 text-xs font-bold rounded ${timeRange===r ? 'bg-yellow-400 text-slate-900' : 'text-slate-400'}`}>{r}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} tickFormatter={d => d.substring(5)} />
                                    <YAxis yAxisId="left" stroke="#facc15" tick={{fontSize: 12}} domain={['dataMin - 20', 'auto']} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" tick={{fontSize: 12}} />
                                    <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc'}}/>
                                    <Bar yAxisId="right" dataKey="load" fill="#3b82f6" opacity={0.3} barSize={20} name="TSS/Load" />
                                    <Area yAxisId="left" type="monotone" dataKey="rollingFtp" stroke="#facc15" strokeWidth={3} fillOpacity={0.1} fill="#facc15" name="Trend NP (15d)" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                      </div>
                  </div>
                  
                  <div className="lg:col-span-1">
                     <ClimbProfileCard climb={selectedClimb} />
                  </div>
              </div>
           </div>
        )}

        {activeTab === 'physics' && <PhysicsEngine userSettings={userSettings} setUserSettings={setUserSettings} selectedClimb={selectedClimb} onUpdateClimb={setSelectedClimb} />}
        {activeTab === 'data' && <DataHub activities={activities} onImport={(n) => setActivities([...activities, ...n])} onDelete={(id) => setActivities(activities.filter(a => a.id !== id))} />}
        {activeTab === 'fueling' && <FuelingStrategy />}
      </main>
    </div>
  );
};

export default App;

