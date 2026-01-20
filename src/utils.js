// Helper: Bepaal correcte type (Forceer Zwift -> VirtualRide)
export const determineActivityType = (type, title) => {
    const t = type || 'Ride';
    const name = title ? title.toLowerCase() : '';
    if (name.includes('zwift') || name.includes('virtual')) return 'VirtualRide';
    return t;
};

// ... (Andere helpers: normalizeDate, formatTime, etc. blijven hetzelfde als vorige keer) ...
// Zorg dat je normalizeDate, formatDateDDMMYYYY, formatTime, parseDurationToSeconds, calculateRollingTrend hier hebt staan!
// Ik herhaal ze kort voor volledigheid:

export const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
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

// De Regex Parser (Handelt "enters" in CSV titels af)
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
                currentCell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) { // Pas aan als delimiter anders is in smartParseCSV
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (currentCell || currentRow.length > 0) currentRow.push(currentCell);
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
            if (char === '\r' && nextChar === '\n') i++;
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) currentRow.push(currentCell);
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
};

export const smartParseCSV = (text) => {
  // Detecteer delimiter VOORDAT we splitten (simpele check op eerste regel)
  const firstLineEnd = text.indexOf('\n');
  const firstLine = text.substring(0, firstLineEnd > -1 ? firstLineEnd : text.length);
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

  // Omdat splitCSVRows hard op komma's werkt, vervangen we tijdelijk de delimiter als het geen komma is
  // Dit is een hack, maar voor nu de veiligste manier zonder complexe regex rewrite.
  // Voor tab-delimited files (zoals Intervals export vaak is) werkt normale split('\n') vaak wel beter omdat tabs geen quotes gebruiken.
  let rows;
  if (delimiter === ',') {
      rows = splitCSVRows(text);
  } else {
      // Fallback voor Tab/Puntkomma (vaak geen quotes rondom newlines probleem)
      rows = text.trim().split('\n').map(l => l.split(delimiter));
  }

  if (rows.length < 2) return [];

  const rawHeaders = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  const mapHeader = (h) => {
    if (h === 'name' || h === 'title' || h === 'activity_name' || h === 'activity') return 'title';
    if (h === 'type' || h === 'activity type') return 'type';
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

  return rows.slice(1).map(row => {
    const entry = {};
    
    row.forEach((cell, idx) => {
      const key = colMap[idx];
      if (key) {
        let val = cell.trim().replace(/^"|"$/g, '');
        if (key === 'date') val = normalizeDate(val);
        else if (key === 'moving_time') val = parseDurationToSeconds(val);
        else if (key !== 'title' && key !== 'type') {
            val = parseFloat(val.replace(',', '.'));
            if (isNaN(val)) val = 0;
        }
        entry[key] = val;
      }
    });

    if (!entry.title) entry.title = "Untitled"; 
    if (!entry.id) entry.id = Math.random().toString(36).substr(2, 9);
    if (!entry.date || entry.date === 'Invalid Date') entry.date = new Date().toISOString().split('T')[0];
    
    // FIX: Detecteer VirtualRide als het in de titel staat
    entry.type = determineActivityType(entry.type, entry.title);

    // Conversies
    if (entry.distance > 1000) entry.distance = (entry.distance / 1000).toFixed(2);
    if (entry.avg_speed < 20 && entry.avg_speed > 0) entry.avg_speed = (entry.avg_speed * 3.6).toFixed(1);

    return entry;
  }).filter(e => e.distance > 0 || e.moving_time > 0);
};