/**
 * src/utils.js
 * Helper functies voor berekeningen en data-parsing
 */

// Datum normalisatie (dd/mm/yyyy -> yyyy-mm-dd)
export const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        // Verwacht DD/MM/YYYY
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

// Slimme parser voor tijd (herkent "01:30:00" en "90m")
export const parseDurationToSeconds = (str) => {
  if(!str) return 0;
  if(typeof str === 'number') return str;
  
  // Tabular string (uu:mm:ss)
  if (str.includes(':')) {
      const parts = str.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  
  // Natural string (1h 30m)
  if(str.includes('h') || str.includes('m')) {
    let s = 0;
    const h = str.match(/(\d+)h/);
    const m = str.match(/(\d+)m/);
    if(h) s += parseInt(h[1]) * 3600;
    if(m) s += parseInt(m[1]) * 60;
    return s;
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

// --- DE GECORRIGEERDE PARSER ---
export const smartParseCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Detecteer delimiter (Tab voor Intervals export, anders komma/puntkomma)
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  
  // Headers normaliseren
  const rawHeaders = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));

  const mapHeader = (h) => {
    if (h === 'name' || h === 'title' || h === 'activity_name' || h === 'activity') return 'title';
    if (h === 'type' || h === 'activity type') return 'type'; // FIX: Voeg Type toe
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
        let val = cols[idx].trim().replace(/['"]+/g, ''); // Verwijder quotes
        
        if (key === 'date') {
            val = normalizeDate(val);
        } 
        else if (key === 'type' || key === 'title') {
            // Strings: niets doen, direct overnemen
            // Dit zorgt dat "VirtualRide" niet kapot gaat
        }
        else if (key === 'moving_time') {
            val = parseDurationToSeconds(val);
        } 
        else {
            // Getallen: Vervang komma door punt (Europese notatie fix)
            val = parseFloat(val.replace(',', '.'));
            if (isNaN(val)) val = 0;
        }
        entry[key] = val;
      }
    });

    if (!entry.title) entry.title = "Untitled Activity"; 
    if (!entry.id) entry.id = Math.random().toString(36).substr(2, 9);
    if (!entry.date || entry.date === 'Invalid Date') entry.date = new Date().toISOString().split('T')[0];
    
    // Vul missende waarden met 0 om crashes te voorkomen
    ['load', 'norm_power', 'avg_power', 'climbing', 'distance'].forEach(k => {
        if(!entry[k]) entry[k] = 0;
    });

    return entry;
  }).filter(e => e.distance > 0 || e.moving_time > 0);
};