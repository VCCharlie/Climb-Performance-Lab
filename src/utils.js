/**
 * src/utils.js
 * Helper functies voor berekeningen en ROBUUSTE data-parsing
 */

// --- DATUM FORMATTERS ---
export const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    // Formaat: dd/mm/yyyy
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    // Formaat: dd-mm-yyyy
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
         const parts = dateStr.split('-');
         if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
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
  // 1h 30m formaat
  if(str.includes('h') || str.includes('m')) {
      let total = 0;
      const h = str.match(/(\d+)h/);
      const m = str.match(/(\d+)m/);
      const s = str.match(/(\d+)s/);
      if(h) total += parseInt(h[1]) * 3600;
      if(m) total += parseInt(m[1]) * 60;
      if(s) total += parseInt(s[1]);
      return total;
  }
  return 0;
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

// --- TYPE DETECTIE (INC. MYWHOOSH, ROUVY ETC) ---
export const determineActivityType = (type, title) => {
    let cleanType = type ? type.toString().replace(/\s+/g, '') : 'Ride';
    
    // 1. Check Bron Type
    if (cleanType.toLowerCase() === 'virtualride') return 'VirtualRide';
    if (cleanType.toLowerCase() === 'run') return 'Run';
    if (cleanType.toLowerCase() === 'walk') return 'Walk';
    if (cleanType.toLowerCase() === 'hike') return 'Hike';

    // 2. Check Titel op Keywords
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

// --- DE NIEUWE CSV PARSER (BETERE DELIMITER DETECTIE) ---
const detectDelimiter = (text) => {
    const firstLine = text.split('\n')[0];
    const commas = (firstLine.match(/,/g) || []).length;
    const semis = (firstLine.match(/;/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    
    if (tabs > commas && tabs > semis) return '\t';
    if (semis > commas) return ';';
    return ',';
};

const splitCSVLine = (line, delimiter) => {
    const values = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuote && line[i+1] === '"') {
                current += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === delimiter && !inQuote) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
};

export const smartParseCSV = (text) => {
  if (!text || !text.trim()) return [];

  const delimiter = detectDelimiter(text);
  const lines = text.trim().split(/\r?\n/);
  
  if (lines.length < 2) return [];

  // Headers (Row 0)
  const rawHeaders = splitCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  const mapHeader = (h) => {
    if (h === 'name' || h === 'title' || h === 'activity_name' || h === 'activity') return 'title';
    if (h === 'type' || h === 'activity type') return 'type';
    if (h.includes('date') || h.includes('datum')) return 'date';
    if (h.includes('moving') || h.includes('elapsed') || h.includes('tijd')) return 'moving_time';
    if (h.includes('distance') || h.includes('afstand')) return 'distance';
    if (h.includes('climb') || h.includes('elevation') || h.includes('hoogte') || h.includes('total_elevation_gain')) return 'climbing';
    if (h.includes('speed') || h.includes('snelheid')) return 'avg_speed';
    if (h.includes('norm') || h.includes('np') || h === 'icu_weighted_avg_watts') return 'norm_power';
    // Power fix: pak ook 'power' kolom als avg niet expliciet is
    if (h.includes('avg power') || h.includes('gem. vermogen') || h === 'average_watts' || h === 'power') return 'avg_power';
    if (h === 'load' || h === 'tss' || h === 'icu_training_load' || h === 'training_load') return 'load';
    if (h === 'rpe' || h === 'icu_rpe' || h === 'feel') return 'rpe';
    return null;
  };

  const colMap = rawHeaders.map(mapHeader);

  // Data rows
  return lines.slice(1).map(line => {
    // Skip empty lines
    if (!line.trim()) return null;

    const cells = splitCSVLine(line, delimiter);
    const entry = {};
    
    colMap.forEach((key, idx) => {
      if (key && cells[idx] !== undefined) {
        let val = cells[idx].trim().replace(/^"|"$/g, '');
        
        if (key === 'date') val = normalizeDate(val);
        else if (key === 'moving_time') val = parseDurationToSeconds(val);
        else if (key !== 'title' && key !== 'type') {
            // Getallen: vervang komma door punt (NL formaat fix)
            val = val.replace(',', '.');
            // Verwijder duizendtallen scheidingstekens als ze er zijn
            // Maar pas op: 1.000,50 -> 1000.50
            if (val.includes('.') && val.lastIndexOf('.') < val.indexOf(',')) {
                 // Amerikaans formaat met komma als duizend? Nee, intervals doet dat zelden.
                 // We gaan uit van standaard floats.
            }
            val = parseFloat(val);
            if (isNaN(val)) val = 0;
        }
        entry[key] = val;
      }
    });

    // Fallbacks
    if (!entry.title) entry.title = "Untitled"; 
    if (!entry.id) entry.id = Math.random().toString(36).substr(2, 9);
    if (!entry.date || entry.date === 'Invalid Date') entry.date = new Date().toISOString().split('T')[0];
    
    // Type bepalen (inclusief fix voor MyWhoosh, Rouvy, etc.)
    entry.type = determineActivityType(entry.type, entry.title);

    // Conversies
    // Intervals API export is vaak meters, CSV is soms km. We gokken op basis van grootte.
    // > 1000 = waarschijnlijk meters
    if (entry.distance > 2000) entry.distance = (entry.distance / 1000).toFixed(2);
    
    // Snelheid: m/s naar km/h? Als < 25 en > 0 is het waarschijnlijk m/s (niemand fietst gemiddeld 25 km/h als getal 6.9 is)
    // Maar CSV kan ook gewoon 28.5 zijn.
    if (entry.avg_speed > 0 && entry.avg_speed < 15) entry.avg_speed = (entry.avg_speed * 3.6).toFixed(1);

    return entry;
  }).filter(e => e && (e.distance > 0 || e.moving_time > 0));
};