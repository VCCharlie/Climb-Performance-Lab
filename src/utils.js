/**
 * src/utils.js
 * Helper functies voor berekeningen en ROBUUSTE data-parsing
 */

// Datum normalisatie (dd/mm/yyyy of ISO -> yyyy-mm-dd)
export const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // ISO string (2026-01-19T18:40:45)
    if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
    }

    // Slashes (31/01/2025)
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
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

// --- NIEUWE ROBUUSTE PARSER ---
// Deze functie splitst CSV regels correct, zelfs als er enters in de tekst staan (zoals bij jouw voorbeeld)
const splitCSVRows = (text) => {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Escaped quote ("") -> enkele quote
                currentCell += '"';
                i++;
            } else {
                // Toggle quote status
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // Einde van cel
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            // Einde van regel
            if (currentCell || currentRow.length > 0) currentRow.push(currentCell);
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
            // Skip eventuele extra \n na \r
            if (char === '\r' && nextChar === '\n') i++;
        } else {
            currentCell += char;
        }
    }
    // Laatste restje
    if (currentCell || currentRow.length > 0) currentRow.push(currentCell);
    if (currentRow.length > 0) rows.push(currentRow);

    return rows;
};

export const smartParseCSV = (text) => {
  const rows = splitCSVRows(text);
  if (rows.length < 2) return [];

  // Headers (Row 0) - lowercase en clean
  const rawHeaders = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  // Mapping functie
  const mapHeader = (h) => {
    if (h === 'name' || h === 'title' || h === 'activity_name' || h === 'activity') return 'title';
    if (h === 'type' || h === 'activity type') return 'type';
    if (h.includes('date') || h.includes('datum')) return 'date';
    if (h === 'moving time' || h === 'moving_time' || h.includes('tijd')) return 'moving_time';
    if (h === 'distance' || h === 'afstand') return 'distance';
    if (h === 'climbing' || h === 'elevation' || h === 'total_elevation_gain') return 'climbing';
    if (h === 'avg speed' || h === 'average speed' || h === 'snelheid') return 'avg_speed';
    
    // Power Fields specific for Intervals.icu
    if (h === 'norm power' || h === 'norm_power' || h === 'np' || h === 'icu_weighted_avg_watts') return 'norm_power';
    if (h === 'avg power' || h === 'average power' || h === 'average_watts') return 'avg_power';
    
    if (h === 'load' || h === 'tss' || h === 'icu_training_load' || h === 'training_load') return 'load';
    if (h === 'rpe' || h === 'icu_rpe' || h === 'feel') return 'rpe';
    return null;
  };

  const colMap = rawHeaders.map(mapHeader);

  return rows.slice(1).map(row => {
    const entry = {};
    
    row.forEach((cell, idx) => {
      const key = colMap[idx];
      if (key) {
        let val = cell.trim();
        
        // Specifieke parsing per type
        if (key === 'date') {
            val = normalizeDate(val);
        } else if (key === 'title' || key === 'type') {
            // Strings laten we met rust (alleen buitenste quotes weg als parser dat niet deed)
            val = val.replace(/^"|"$/g, '');
        } else {
            // Getallen schoonmaken
            val = val.replace(/^"|"$/g, ''); // Quotes weg
            if (key === 'moving_time') {
                val = parseDurationToSeconds(val);
            } else {
                val = parseFloat(val.replace(',', '.')); // 1,5 -> 1.5
                if (isNaN(val)) val = 0;
            }
        }
        entry[key] = val;
      }
    });

    // Fallbacks
    if (!entry.title) entry.title = "Untitled Activity"; 
    if (!entry.id) entry.id = Math.random().toString(36).substr(2, 9);
    if (!entry.date || entry.date === 'Invalid Date') entry.date = new Date().toISOString().split('T')[0];
    if (!entry.type) entry.type = 'Ride';

    // Conversies voor Intervals data (vaak in meters/seconden)
    // Als afstand > 1000 lijkt het meters, converteer naar km
    if (entry.distance > 1000) entry.distance = (entry.distance / 1000).toFixed(2);
    
    // Als snelheid in m/s is (bv 8.3), converteer naar km/h (30)
    // Intervals geeft vaak m/s in CSV
    if (entry.avg_speed < 20 && entry.avg_speed > 0) entry.avg_speed = (entry.avg_speed * 3.6).toFixed(1);

    return entry;
  }).filter(e => e.distance > 0 || e.moving_time > 0);
};