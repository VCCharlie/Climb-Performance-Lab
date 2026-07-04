import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Globe, SortAsc, SortDesc, ChevronDown, ChevronUp, Minus, Plus, LocateFixed, X } from 'lucide-react';
import { CLIMB_DATABASE } from '../../climbs';
import { calculateClimbCategory, haversineDistance } from '../../utils/calculations';
import FlagIcon from '../FlagIcon';

// RepeatButton: Hold to repeat action (with acceleration)
const RepeatButton = ({ onAction, children, className }) => {
  const intervalRef = React.useRef(null);
  const timeoutRef = React.useRef(null);
  const isRunning = React.useRef(false);

  const start = (e) => {
    if (e.cancelable) e.preventDefault();
    if (isRunning.current) return;
    isRunning.current = true;
    onAction();
    timeoutRef.current = setTimeout(() => {
      let speed = 150;
      let count = 0;
      const run = () => {
        if (!isRunning.current) return;
        onAction();
        count++;
        if (count > 5) speed = 50;
        if (count > 20) speed = 20;
        intervalRef.current = setTimeout(run, speed);
      };
      run();
    }, 400);
  };

  const stop = () => {
    isRunning.current = false;
    clearTimeout(timeoutRef.current);
    clearTimeout(intervalRef.current);
  };

  return (
    <button onMouseDown={start} onMouseUp={stop} onMouseLeave={stop} onTouchStart={start} onTouchEnd={stop} className={className}>
      {children}
    </button>
  );
};

// Compact number input with +/- repeat buttons
const NumberFilter = ({ label, value, onChange, min, max, step = 1, showDecimals = false }) => {
  const [inputVal, setInputVal] = React.useState(showDecimals ? Number(value).toFixed(1) : String(value));

  React.useEffect(() => {
    setInputVal(showDecimals ? Number(value).toFixed(1) : String(value));
  }, [value, showDecimals]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setInputVal(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && raw !== '' && raw !== '-') {
      onChange(Math.min(max, Math.max(min, num)));
    }
  };

  const handleBlur = () => {
    const num = parseFloat(inputVal);
    if (isNaN(num) || inputVal === '') {
      const clamped = Math.min(max, Math.max(min, value));
      setInputVal(showDecimals ? clamped.toFixed(1) : String(clamped));
    } else {
      const clamped = Math.min(max, Math.max(min, num));
      onChange(clamped);
      setInputVal(showDecimals ? clamped.toFixed(1) : String(clamped));
    }
  };

  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase text-cdmuted font-bold mb-1">{label}</span>
      <div className="flex items-center bg-cdsurface rounded border border-cdborder">
        <RepeatButton
          onAction={() => onChange(Math.max(min, Number((value - step).toFixed(showDecimals ? 1 : 0))))}
          className="px-2 py-1 text-cdmuted hover:text-cdtext hover:bg-cdborder transition-colors select-none"
        >
          <Minus size={12} />
        </RepeatButton>
        <input
          type="number"
          value={inputVal}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-14 text-center bg-transparent text-xs text-cdtext outline-none font-mono"
        />
        <RepeatButton
          onAction={() => onChange(Math.min(max, Number((value + step).toFixed(showDecimals ? 1 : 0))))}
          className="px-2 py-1 text-cdmuted hover:text-cdtext hover:bg-cdborder transition-colors select-none"
        >
          <Plus size={12} />
        </RepeatButton>
      </div>
    </div>
  );
};

const CAT_OPTIONS = ['All', 'HC', '1', '2', '3', '4'];
const SORT_OPTIONS = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'grade', label: 'Gradient %' },
  { value: 'length', label: 'Length km' },
  { value: 'score', label: 'Score' },
  { value: 'fiets', label: 'Bike' },
];

const RADIUS_OPTIONS = [50, 100, 200, 500];

/**
 * ClimbSelector – Shared climb filtering + selection component.
 *
 * Props:
 *   mode               'single' | 'multi'  (default: 'single')
 *   selected           climb object | null  (used in single mode for controlled value + category badge)
 *   onSelect           (climb) => void      called on each selection
 *   excludeIds         string[]             climb ids to hide (multi mode: already-added climbs)
 *   showCategoryBadge  bool                 show UCI cat badge next to dropdown (single mode)
 *   showNearbyFilter   bool                 show GPS "in de buurt" filter (default false)
 *   className          string
 */
const ClimbSelector = ({
  mode = 'single',
  selected = null,
  onSelect,
  excludeIds = [],
  showCategoryBadge = false,
  showNearbyFilter = false,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [catFilter, setCatFilter] = useState('All');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // GPS nearby state
  const [userPos, setUserPos] = useState(null);
  const [nearbyRadius, setNearbyRadius] = useState(100);
  const [nearbyActive, setNearbyActive] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // Range filters — initialized to cover full range
  // ⚡ Bolt Optimization: Use single-pass reduce instead of Math.max(...array.map())
  const dataMaxScore = useMemo(() => CLIMB_DATABASE.reduce((max, c) => Math.max(max, c.score || 0), 0), []);
  const dataMaxFiets = useMemo(() => CLIMB_DATABASE.reduce((max, c) => Math.max(max, c.fiets || 0), 0), []);

  const [minKm, setMinKm] = useState(0);
  const [maxKm, setMaxKm] = useState(200);
  const [minGrade, setMinGrade] = useState(0);
  const [maxGrade, setMaxGrade] = useState(25);
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [minFiets, setMinFiets] = useState(0);
  const [maxFiets, setMaxFiets] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Set dynamic max values on mount
  useEffect(() => {
    setMaxScore(dataMaxScore);
    setMaxFiets(dataMaxFiets);
  }, [dataMaxScore, dataMaxFiets]);

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const uniqueCountries = useMemo(() => {
    const countries = [...new Set(CLIMB_DATABASE.map(c => c.country))].sort();
    return ['All', ...countries];
  }, []);

  const uniqueRegions = useMemo(() => {
    if (countryFilter === 'All') return [];
    const regions = CLIMB_DATABASE
      .filter(c => c.country === countryFilter)
      .map(c => c.region)
      .filter(Boolean);
    return ['All', ...new Set(regions)].sort();
  }, [countryFilter]);

  const filteredClimbs = useMemo(() => {
    let climbs = CLIMB_DATABASE;

    if (excludeSet.size > 0) climbs = climbs.filter(c => !excludeSet.has(c.id));

    // GPS nearby filter: verberg Zwift (geen coördinaten) en filter op afstand
    if (nearbyActive && userPos) {
      climbs = climbs.filter(c =>
        c.lat != null && c.lon != null &&
        haversineDistance(userPos.lat, userPos.lng, c.lat, c.lon) <= nearbyRadius
      );
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      climbs = climbs.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.country.toLowerCase().includes(lower) ||
        (c.region && c.region.toLowerCase().includes(lower))
      );
    }

    if (countryFilter !== 'All') climbs = climbs.filter(c => c.country === countryFilter);
    if (regionFilter !== 'All') climbs = climbs.filter(c => c.region === regionFilter);
    if (catFilter !== 'All') climbs = climbs.filter(c => c.cat === catFilter);

    climbs = climbs.filter(c => c.lengthKm >= minKm && c.lengthKm <= maxKm);
    climbs = climbs.filter(c => c.avgGrade >= minGrade && c.avgGrade <= maxGrade);
    if (maxScore > 0) climbs = climbs.filter(c => (c.score || 0) >= minScore && (c.score || 0) <= maxScore);
    if (maxFiets > 0) climbs = climbs.filter(c => (c.fiets || 0) >= minFiets && (c.fiets || 0) <= maxFiets);

    return [...climbs].sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case 'grade':  valA = a.avgGrade;    valB = b.avgGrade;    break;
        case 'length': valA = a.lengthKm;    valB = b.lengthKm;    break;
        case 'score':  valA = a.score || 0;  valB = b.score || 0;  break;
        case 'fiets':  valA = a.fiets || 0;  valB = b.fiets || 0;  break;
        default:       valA = a.name;        valB = b.name;
      }
      if (typeof valA === 'string') return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [searchTerm, countryFilter, regionFilter, catFilter, minKm, maxKm, minGrade, maxGrade, minScore, maxScore, minFiets, maxFiets, sortBy, sortDir, excludeSet, nearbyActive, userPos, nearbyRadius]);

  // Auto-select on unique match (single mode only)
  useEffect(() => {
    if (mode === 'single' && searchTerm.length >= 3 && filteredClimbs.length === 1) {
      if (filteredClimbs[0].id !== selected?.id) {
        onSelect(filteredClimbs[0]);
      }
    }
  }, [mode, searchTerm, filteredClimbs, selected, onSelect]);

  const climbsGrouped = useMemo(() => {
    const groups = {};
    filteredClimbs.forEach(c => {
      const key = c.country === 'ZWIFT' ? `Zwift - ${c.region}` : c.country;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [filteredClimbs]);

  const handleCountryChange = useCallback((c) => {
    setCountryFilter(c);
    setRegionFilter('All');
  }, []);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not available.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyActive(true);
        setLocating(false);
      },
      (err) => {
        setLocError('Could not determine location.');
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }, []);

  const clearNearby = useCallback(() => {
    setNearbyActive(false);
    setUserPos(null);
    setLocError('');
  }, []);

  const selectedCategory = useMemo(() => {
    if (!showCategoryBadge || !selected) return null;
    return calculateClimbCategory(selected.lengthKm, selected.avgGrade);
  }, [showCategoryBadge, selected]);

  const optionLabel = (c) =>
    `${c.name} (${c.lengthKm}km @ ${c.avgGrade}%${c.cat ? ' · ' + c.cat : ''}${c.score ? ' · ' + c.score.toLocaleString('nl-NL') : ''})`;

  // Track active filters count for badge
  const activeFilterCount = [
    countryFilter !== 'All',
    regionFilter !== 'All',
    catFilter !== 'All',
    minKm > 0,
    maxKm < 200,
    minGrade > 0,
    maxGrade < 25,
    minScore > 0,
    maxScore < dataMaxScore,
    minFiets > 0,
    maxFiets < dataMaxFiets,
  ].filter(Boolean).length;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Row 1: Search + filter toggle + optioneel GPS */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-cdmuted" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search climbs (name, country, region)..."
            className="w-full bg-cdsurface border border-cdborder rounded pl-10 pr-4 py-2 text-sm text-cdtext outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
          />
        </div>
        {showNearbyFilter && (
          nearbyActive && userPos ? (
            <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 rounded px-2">
              <LocateFixed size={12} className="text-blue-400 shrink-0" />
              <select
                value={nearbyRadius}
                onChange={e => setNearbyRadius(Number(e.target.value))}
                className="text-xs bg-transparent text-blue-400 outline-none font-bold"
              >
                {RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r} km</option>)}
              </select>
              <button onClick={clearNearby} aria-label="Clear nearby filter" className="text-blue-400 hover:text-blue-200 ml-0.5 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded">
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={locateMe}
              disabled={locating}
              title="Filter climbs nearby"
              className="flex items-center gap-1 px-2.5 py-2 rounded border text-xs font-bold transition-colors text-cdmuted border-cdborder hover:text-blue-400 hover:border-blue-400"
            >
              <LocateFixed size={13} className={locating ? 'animate-pulse text-blue-400' : ''} />
              {locating ? '...' : 'Nearby'}
            </button>
          )
        )}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`relative px-3 py-2 rounded border text-xs font-bold flex items-center gap-1 transition-colors ${showAdvanced ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400' : 'text-cdmuted border-cdborder hover:text-cdtext'}`}
        >
          Filters {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-900 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
      {showNearbyFilter && locError && (
        <p className="text-xs text-red-400">{locError}</p>
      )}

      {/* Category filter pills (always visible — quick and common filter) */}
      <div className="flex gap-1.5 flex-wrap">
        {CAT_OPTIONS.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${catFilter === cat ? 'bg-purple-500 text-white border border-purple-400' : 'bg-cdsurface border border-cdborder text-cdmuted hover:text-cdtext'}`}
          >
            {cat === 'All' ? 'Cat: All' : `Cat ${cat}`}
          </button>
        ))}
      </div>

      {/* Country filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {uniqueCountries.map(c => (
          <button
            key={c}
            onClick={() => handleCountryChange(c)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${countryFilter === c ? 'bg-yellow-400 text-slate-900 border border-yellow-400' : 'bg-cdsurface border-cdborder border text-cdmuted hover:text-cdtext'}`}
          >
            {c === 'All' ? <><Globe size={12} />All</> : <><FlagIcon country={c} size="sm" />{c}</>}
          </button>
        ))}
      </div>

      {/* Region filter pills (conditional) */}
      {countryFilter !== 'All' && uniqueRegions.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {uniqueRegions.map(r => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${regionFilter === r ? 'bg-orange-400 text-slate-900 border border-orange-400' : 'bg-cdsurface border border-cdborder text-cdmuted hover:text-cdtext'}`}
            >
              {r === 'All' ? 'All regions' : r}
            </button>
          ))}
        </div>
      )}

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="bg-cdbg/50 p-3 rounded-lg border border-cdborder space-y-3">
          {/* Length + Grade */}
          <div>
            <p className="text-[10px] text-cdmuted uppercase font-bold mb-2">Length &amp; Gradient</p>
            <div className="flex flex-wrap gap-3">
              <NumberFilter label="Min km" value={minKm} onChange={setMinKm} min={0} max={maxKm} step={1} />
              <NumberFilter label="Max km" value={maxKm} onChange={setMaxKm} min={minKm} max={200} step={1} />
              <NumberFilter label="Min %" value={minGrade} onChange={setMinGrade} min={0} max={maxGrade} step={0.5} showDecimals />
              <NumberFilter label="Max %" value={maxGrade} onChange={setMaxGrade} min={minGrade} max={25} step={0.5} showDecimals />
            </div>
          </div>
          {/* Score + Fiets */}
          <div>
            <p className="text-[10px] text-cdmuted uppercase font-bold mb-2">Score &amp; Bike</p>
            <div className="flex flex-wrap gap-3">
              <NumberFilter label="Min Score" value={minScore} onChange={setMinScore} min={0} max={maxScore} step={1000} />
              <NumberFilter label="Max Score" value={maxScore} onChange={setMaxScore} min={minScore} max={dataMaxScore} step={1000} />
              <NumberFilter label="Min Bike" value={minFiets} onChange={setMinFiets} min={0} max={maxFiets} step={100} />
              <NumberFilter label="Max Bike" value={maxFiets} onChange={setMaxFiets} min={minFiets} max={dataMaxFiets} step={100} />
            </div>
          </div>
          {/* Sort */}
          <div className="flex items-center gap-2 pt-1 border-t border-cdborder/50">
            <span className="text-[10px] text-cdmuted uppercase font-bold">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs bg-cdsurface border border-cdborder rounded px-2 py-1 text-cdtext outline-none focus:border-yellow-400"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded border border-cdborder text-cdmuted hover:text-cdtext hover:bg-cdsurface transition-colors"
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDir === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />}
            </button>
          </div>
        </div>
      )}

      {/* Dropdown + optional category badge */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute right-8 top-3 text-[10px] text-cdmuted pointer-events-none z-10">
            {filteredClimbs.length} results
          </span>
          <select
            className="w-full bg-cdsurface text-cdtext rounded p-3 text-sm border border-cdborder outline-none focus:border-yellow-400"
            value={mode === 'single' ? (selected?.id || '') : ''}
            onChange={e => {
              const climb = CLIMB_DATABASE.find(c => c.id === e.target.value);
              if (climb) {
                onSelect(climb);
                if (mode === 'single') e.target.blur();
              }
            }}
          >
            {mode === 'multi' && <option value="">Choose and add...</option>}
            {Object.keys(climbsGrouped).sort().map(group => (
              <optgroup key={group} label={group}>
                {climbsGrouped[group].map(c => (
                  <option key={c.id} value={c.id}>{optionLabel(c)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {selectedCategory && selectedCategory.label !== '-' && (
          <div
            className={`flex flex-col items-center justify-center px-4 rounded border ${selectedCategory.className} min-w-[60px] cursor-help transition-transform hover:scale-105`}
            title={selectedCategory.full}
          >
            <span className="text-lg leading-none">{selectedCategory.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClimbSelector;
