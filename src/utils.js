/**
 * src/utils.js
 * Helper functies voor berekeningen en ROBUUSTE data-parsing
 * Geüpdatet: Nu inclusief Best Power curves (1m, 5m, 20m, 60m)
 */

// --- DATUM FORMATTERS ---
export const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    // Als er al T in zit (ISO), pak het eerste deel
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    
    // Formaat: dd/mm/yyyy of dd-mm-yyyy fix
    if (dateStr.includes('/') || dateStr.includes('-')) {
        const sep = dateStr.includes('/') ? '/' : '-';
        const parts = dateStr.split(sep);
        // Check of het dd-mm-yyyy is (dag <= 31, maand <= 12, jaar 4 cijfers)
        if (parts.length === 3) {
             // Simpele heuristiek: als eerste deel klein is en laatste groot -> dd-mm-yyyy
             // Soms is yyyy-mm-dd ook met streepjes, dus check lengte
             if (parts[0].length <= 2 && parts[2].length === 4) {
                 return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
             }
             return dateStr;
        }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return dateStr;
};

export const formatDateDDMMYYYY = (isoDateString) => {
  if (!isoDateString || isoDateString === 'Invalid Date') return '-';
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return isoDateString; 
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatTime = (seconds) => {
  const sNum = Number(seconds);
  if (!sNum || isNaN(sNum)) return "00:00";
  const h = Math.floor(sNum / 3600);
  const m = Math.floor((sNum % 3600) / 60);
  const s = Math.floor(sNum % 60);
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const parseDurationToSeconds = (str) => {
  if(!str) return 0;
  if(typeof str === 'number') return str;
  // hh:mm:ss formaat
  if(str.includes(':')) {
      const parts = str.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  // Intervals export "1h 30m" formaat fix
  if(str.includes('h') || str.includes('m') || str.includes('s')) {
      let total = 0;
      const h = str.match(/(\d+)h/);
      const m = str.match(/(\d+)m/);
      const s = str.match(/(\d+)s/);
      if(h) total += parseInt(h[1]) * 3600;
      if(m) total += parseInt(m[1]) * 60;
      if(s) total += parseInt(s[1]);
      return total > 0 ? total : 0;
  }
  // Gewoon een getal in stringvorm
  const rawNum = parseFloat(str.replace(',', '.'));
  return !isNaN(rawNum) ? rawNum : 0;
};

export const calculateRollingTrend = (activities, targetDateStr, metricKey, windowDays = 15) => {
  const targetDate = new Date(targetDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  const inWindow = activities.filter(a => {
    const d = new Date(a.date);
    const diffDays = Math.abs((targetDate - d) / msPerDay);
    const val = Number(a[metricKey]);
    return diffDays <= windowDays && !isNaN(val) && val > 0;
  });
  if (inWindow.length === 0) return 0;
  const sum = inWindow.reduce((acc, curr) => acc + (Number(curr[metricKey]) || 0), 0);
  return sum / inWindow.length;
};

// --- TYPE DETECTIE ---
export const determineActivityType = (type, title) => {
    let cleanType = type ? type.toString().replace(/\s+/g, '') : 'Ride';
    
    // Directe matches
    if (cleanType.toLowerCase() === 'virtualride') return 'VirtualRide';
    if (cleanType.toLowerCase() === 'run') return 'Run';
    if (cleanType.toLowerCase() === 'walk') return 'Walk';
    if (cleanType.toLowerCase() === 'hike') return 'Hike';
    if (['nordicski', 'alpineski', 'iceskate'].includes(cleanType.toLowerCase())) return 'Run'; // Of een 'Winter' categorie

    // Slimme titel detectie voor Virtual
    const name = title ? title.toLowerCase() : '';
    const virtualKeywords = [
        'virtual', 'indoor', 
        'zwift', 'watopia', 'makuri', 'richmond', 'london', 'innsbruck', 
        'yorkshire', 'bologna', 'crit city', 'scotland', 'neokyo', 'france', 'paris',
        'mywhoosh', 'rouvy', 'fulgaz', 'bkool', 'rgt', 'indievelo', 'kinomap', 
        'tacx', 'trainerroad', 'sufferfest', 'systm'
    ];

    if (virtualKeywords.some(keyword => name.includes(keyword))) {
        return 'VirtualRide';
    }
    return 'Ride';
};

// --- PARSER LOGICA ---

// 1. Getallen opschonen (NL vs US formaat)
const cleanNumber = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    
    let strVal = val.toString().trim();
    if (strVal === '') return 0;

    // 1.000,00 -> 1000.00
    if (strVal.includes('.') && strVal.includes(',')) {
        if (strVal.lastIndexOf(',') > strVal.lastIndexOf('.')) {
            strVal = strVal.replace(/\./g, '').replace(',', '.');
        } else {
            strVal = strVal.replace(/,/g, '');
        }
    } else if (strVal.includes(',')) {
        strVal = strVal.replace(',', '.');
    }
    
    const num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
};

// 2. CSV naar Regels (met Quote support)
const parseCSVToRows = (text, delimiter) => {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    // BOM en carriage returns verwijderen
    const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const nextChar = cleanText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++; 
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }
    return rows;
};

// 3. Delimiter Detectie (Negeert sep= regel)
const detectDelimiter = (lines) => {
    const sample = lines.slice(0, 5).join('\n');
    const commas = (sample.match(/,/g) || []).length;
    const semis = (sample.match(/;/g) || []).length;
    const tabs = (sample.match(/\t/g) || []).length;
    
    if (tabs > commas && tabs > semis) return '\t';
    if (semis >= commas) return ';'; 
    return ',';
};

export const smartParseCSV = (text) => {
  if (!text || !text.trim()) return [];

  // STAP 1: Filter de 'sep=' regel eruit (CRUCIAAL!)
  let lines = text.trim().split(/\r?\n/);
  if (lines.length > 0 && lines[0].toLowerCase().startsWith('sep=')) {
      lines.shift();
      text = lines.join('\n');
  }

  // STAP 2: Detecteer delimiter
  const delimiter = detectDelimiter(lines);
  
  // STAP 3: Parse volledige tekst
  const rows = parseCSVToRows(text, delimiter);

  if (rows.length < 2) return [];

  // Headers (alles lowercase en zonder quotes)
  const rawHeaders = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  // --- HEADER MAPPING (UPDATED VOOR INTERVALS.ICU & BEST POWERS) ---
  const mapHeader = (h) => {
    // Verwijder underscores voor makkelijker matchen, behalve voor specifieke keys
    const cleanH = h.replace(/_/g, ' '); 

    // ID & Basis
    if (h === 'activity id' || h === 'id' || cleanH.includes('activity id')) return 'id';
    if (h === 'name' || h === 'title' || cleanH.includes('activity name')) return 'title';
    if (h === 'type' || h === 'sub_type' || cleanH.includes('activity type')) return 'type';
    if (h === 'start_date_local' || cleanH.includes('date') || cleanH.includes('datum')) return 'date';
    
    // Tijden & Afstanden
    if (h === 'moving_time' || cleanH.includes('moving time') || cleanH.includes('elapsed time')) return 'moving_time';
    if (h === 'distance' || cleanH.includes('afstand')) return 'distance';
    if (h === 'total_elevation_gain' || cleanH.includes('climb') || cleanH.includes('elevation') || cleanH.includes('hoogte')) return 'climbing';
    if (h === 'average_speed' || cleanH.includes('speed') || cleanH.includes('snelheid')) return 'avg_speed';
    
    // POWER (NP) - Prioriteit voor 'icu_'
    if (h === 'icu_weighted_avg_watts' || cleanH.includes('weighted avg power') || cleanH.includes('norm power') || cleanH.includes('np')) return 'norm_power';
    
    // POWER (AVG) - Prioriteit voor 'icu_'
    if (h === 'icu_average_watts' || h === 'average_watts' || cleanH.includes('avg power') || cleanH.includes('average watts') || h === 'power' || h === 'watts') return 'avg_power';
    
    // LOAD
    if (h === 'icu_training_load' || h === 'training_load' || cleanH.includes('tss') || cleanH.includes('load')) return 'load';
    
    // RPE
    if (h === 'icu_rpe' || h === 'rpe' || cleanH.includes('feel')) return 'rpe';

    // --- BEST POWERS (NIEUW TOEGEVOEGD) ---
    // Intervals CSV headers zijn vaak: Best1minPower, Best5minPower, etc.
    // Of: Best 1min Power, w5min, etc.
    
    if (cleanH.includes('best1min') || cleanH.includes('best 1min') || cleanH.includes('1min power') || cleanH === 'w1min') return 'best_1min';
    if (cleanH.includes('best5min') || cleanH.includes('best 5min') || cleanH.includes('5min power') || cleanH === 'w5min') return 'best_5min';
    if (cleanH.includes('best10min') || cleanH.includes('best 10min') || cleanH.includes('10min power') || cleanH === 'w10min') return 'best_10min';
    if (cleanH.includes('best20min') || cleanH.includes('best 20min') || cleanH.includes('20min power') || cleanH === 'w20min') return 'best_20min';
    if (cleanH.includes('best60min') || cleanH.includes('best 60min') || cleanH.includes('60min power') || cleanH === 'w60min') return 'best_60min';
    
    return null;
  };

  const colMap = rawHeaders.map(mapHeader);

  return rows.slice(1).map(row => {
    const entry = {};
    
    colMap.forEach((key, idx) => {
      if (!key) return;
      let val = row[idx] !== undefined ? row[idx].trim().replace(/^"|"$/g, '') : '';

      if (key === 'date') {
          entry[key] = normalizeDate(val);
      } else if (key === 'moving_time') {
          entry[key] = parseDurationToSeconds(val);
      } else if (key === 'title' || key === 'type') {
          entry[key] = val;
      } else {
          entry[key] = cleanNumber(val);
      }
    });

    if (!entry.title) entry.title = "Untitled"; 
    if (!entry.id) entry.id = 'csv_' + Math.random().toString(36).substr(2, 9);
    if (!entry.date || entry.date === 'Invalid Date') entry.date = new Date().toISOString().split('T')[0];
    
    entry.type = determineActivityType(entry.type, entry.title);

    // Conversies
    if (entry.distance > 2000) entry.distance = (entry.distance / 1000).toFixed(2);
    if (entry.avg_speed > 0 && entry.avg_speed < 15) entry.avg_speed = (entry.avg_speed * 3.6).toFixed(1);

    return entry;
  }).filter(e => e.distance > 0 || e.moving_time > 0);
};


/**
 * Parsed JSON input (array van activiteiten) naar het App formaat.
 * Gebruikt dezelfde logica als de Python Cloud Function.
 */

export const smartParseJSON = (jsonText) => {
    try {
        const rawData = JSON.parse(jsonText);
        const dataArray = Array.isArray(rawData) ? rawData : [rawData];

        if (dataArray.length === 0) return [];

        return dataArray.map(item => {
            // HULPFUNCTIE: Veilige getallen
            const getNum = (val) => {
                const n = Number(val);
                return isNaN(n) ? 0 : n;
            };

            // HULPFUNCTIE: Fallback keten (pak A, anders B, anders C)
            const getVal = (...keys) => {
                for (const k of keys) {
                    if (item[k] !== undefined && item[k] !== null && item[k] !== "") return item[k];
                }
                return null;
            };

            // 1. BASIS MAPPING
            const id = String(getVal('id', 'activity_id') || Math.random().toString(36).substr(2, 9));
            const dateStr = getVal('start_date_local', 'start_date', 'date');
            const title = getVal('name', 'title') || "Untitled";
            
            // 2. FYSIEKE DATA
            const movingTime = getNum(getVal('moving_time', 'icu_recording_time', 'elapsed_time'));
            const distanceMeters = getNum(getVal('distance', 'icu_distance'));
            const climbing = getNum(getVal('total_elevation_gain', 'total_elevation_loss'));
            const avgSpeedMs = getNum(getVal('average_speed'));

            // 3. PERFORMANCE DATA (Met Fallbacks)
            // Power
            const normPower = getNum(getVal('icu_weighted_avg_watts', 'weighted_average_watts', 'np', 'normalized_power'));
            const avgPower = getNum(getVal('icu_average_watts', 'average_watts', 'device_watts', 'avg_power'));
            
            // Load & RPE
            const load = getNum(getVal('icu_training_load', 'training_load', 'power_load', 'hr_load', 'pace_load'));
            const rpe = getNum(getVal('icu_rpe', 'perceived_exertion', 'feel', 'session_rpe'));

            // 4. BEST POWERS
            const best1min = getNum(getVal('Best1minpower', 'best_1min_power', 'w1min'));
            const best5min = getNum(getVal('Best5minpower', 'best_5min_power', 'w5min'));
            const best10min = getNum(getVal('Best10minpower', 'best_10min_power', 'w10min'));
            const best20min = getNum(getVal('Best20minpower', 'best_20min_power', 'w20min'));
            const best60min = getNum(getVal('Best60minpower', 'best_60min_power', 'w60min'));

            // 5. TYPE DETECTIE
            // We gebruiken de bestaande determineActivityType uit utils.js
            // Let op: importeer determineActivityType als je deze functie in een ander bestand zet
            const rawType = getVal('type', 'sub_type');
            const finalType = determineActivityType(rawType, title);

            return {
                id: id,
                date: normalizeDate(dateStr), // Zorgt voor YYYY-MM-DD
                title: title,
                type: finalType,
                moving_time: movingTime,
                distance: (distanceMeters > 1000 || distanceMeters === 0) ? (distanceMeters / 1000).toFixed(2) : distanceMeters, // Aanname: input is meters
                climbing: Math.round(climbing),
                avg_speed: (avgSpeedMs < 20 && avgSpeedMs > 0) ? (avgSpeedMs * 3.6).toFixed(1) : avgSpeedMs, // Aanname: input is m/s
                norm_power: Math.round(normPower),
                avg_power: Math.round(avgPower),
                load: Math.round(load),
                rpe: rpe,
                best_1min: Math.round(best1min),
                best_5min: Math.round(best5min),
                best_10min: Math.round(best10min),
                best_20min: Math.round(best20min),
                best_60min: Math.round(best60min)
            };
        });
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return [];
    }
};
