/**
 * src/utils.js
 * Helper functies voor berekeningen en ROBUUSTE data-parsing
 */

// --- DATUM FORMATTERS ---
export const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    
    // Formaat: dd/mm/yyyy of dd-mm-yyyy fix
    if (dateStr.includes('/') || dateStr.includes('-')) {
        const sep = dateStr.includes('/') ? '/' : '-';
        const parts = dateStr.split(sep);
        if (parts.length === 3) {
             // Als eerste deel klein is (dag) en laatste groot (jaar) -> dd-mm-yyyy
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
    
    if (cleanType.toLowerCase() === 'virtualride') return 'VirtualRide';
    if (cleanType.toLowerCase() === 'run') return 'Run';
    if (cleanType.toLowerCase() === 'walk') return 'Walk';
    if (cleanType.toLowerCase() === 'hike') return 'Hike';

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
    
    // String opschonen
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
    // Neem een sample van de eerste 5 echte regels
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
      lines.shift(); // Verwijder de sep= regel
      text = lines.join('\n'); // Herbouw tekst zonder die regel
  }

  // STAP 2: Detecteer delimiter op schone data
  const delimiter = detectDelimiter(lines);
  
  // STAP 3: Parse volledige tekst
  const rows = parseCSVToRows(text, delimiter);

  if (rows.length < 2) return [];

  // Headers (alles lowercase en zonder quotes)
  const rawHeaders = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  const mapHeader = (h) => {
    // Vervang underscores door spaties (fix voor training_load vs Training Load)
    h = h.replace(/_/g, ' '); 

    if (h === 'name' || h === 'title' || h.includes('activity name')) return 'title';
    if (h === 'type' || h.includes('activity type')) return 'type';
    if (h.includes('date') || h.includes('datum')) return 'date';
    if (h.includes('moving') || h.includes('elapsed') || h.includes('tijd')) return 'moving_time';
    if (h.includes('distance') || h.includes('afstand')) return 'distance';
    if (h.includes('climb') || h.includes('elevation') || h.includes('hoogte') || h.includes('gain')) return 'climbing';
    if (h.includes('speed') || h.includes('snelheid')) return 'avg_speed';
    // Power (NP)
    if (h.includes('norm') || h.includes('np') || h.includes('weighted avg')) return 'norm_power';
    // Power (Avg) - check ook op simpele 'power' of 'watts'
    if (h.includes('avg power') || h.includes('gem. vermogen') || h.includes('average watts') || h === 'power' || h === 'watts') return 'avg_power';
    // Load fix
    if (h === 'load' || h === 'tss' || h.includes('training load')) return 'load';
    if (h === 'rpe' || h.includes('feel')) return 'rpe';
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
    if (!entry.id) entry.id = Math.random().toString(36).substr(2, 9);
    if (!entry.date || entry.date === 'Invalid Date') entry.date = new Date().toISOString().split('T')[0];
    
    entry.type = determineActivityType(entry.type, entry.title);

    // Conversies
    if (entry.distance > 2000) entry.distance = (entry.distance / 1000).toFixed(2);
    if (entry.avg_speed > 0 && entry.avg_speed < 15) entry.avg_speed = (entry.avg_speed * 3.6).toFixed(1);

    return entry;
  }).filter(e => e.distance > 0 || e.moving_time > 0);
};