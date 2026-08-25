import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Cloud, Wind, Thermometer, Droplets, Sun, AlertTriangle, Search, RefreshCw, Lightbulb } from 'lucide-react';
import { useClimbDatabase } from '../hooks/useClimbDatabase';
import { getDefaultClimb } from '../services/climbDatabase';
import WeatherForecastStrip from './WeatherForecastStrip';
import FlagIcon from './FlagIcon';
import { geocodeLocation, fetchCurrentWeather } from '../services/openWeatherProxy';
import { WEATHER_CLIMB_LOCATIONS } from '../utils/weatherClimbLocations';
import AnchoredDropdownPortal from './ui/AnchoredDropdownPortal';

// Re-export for components that imported CLIMB_LOCATIONS from here historically
const CLIMB_LOCATIONS = WEATHER_CLIMB_LOCATIONS;

const WeatherClimb = ({ userSettings, initialState, onStateChange }) => {
    const { climbs: climbDatabase, loadFull } = useClimbDatabase();

    useEffect(() => {
        loadFull();
    }, [loadFull]);

    const [selectedClimb, setSelectedClimb] = useState(initialState?.selectedClimb || getDefaultClimb());
    const [targetPower, setTargetPower] = useState(initialState?.targetPower || userSettings.ftp * 0.85);

    // Weather conditions
    const [temperature, setTemperature] = useState(initialState?.temperature || 20);
    const [windSpeed, setWindSpeed] = useState(initialState?.windSpeed || 0);
    const [windDirection, setWindDirection] = useState(initialState?.windDirection || 'none');
    const [humidity, setHumidity] = useState(initialState?.humidity || 50);

    // Weather API
    const [locationInput, setLocationInput] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null); // { q, lat, lon, label }
    const apiKey = userSettings?.openweatherApiKey || '';
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);
    const [weatherError, setWeatherError] = useState(null);
    const [weatherSuccess, setWeatherSuccess] = useState(null);

    // 14-day forecast (Open-Meteo, no API key required)
    const [forecastData, setForecastData] = useState(null);
    const [forecastLocation, setForecastLocation] = useState('');

    // Autocomplete state
    const [suggestions, setSuggestions] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef(null);
    const suggestionsRef = useRef(null);
    const locationInputRef = useRef(null);

    // Sync state changes to parent
    useEffect(() => {
        if (onStateChange) {
            onStateChange({ selectedClimb, targetPower, temperature, windSpeed, windDirection, humidity });
        }
    }, [selectedClimb, targetPower, temperature, windSpeed, windDirection, humidity, onStateChange]);

    // Auto-set location when climb changes
    useEffect(() => {
        const climbLocation = CLIMB_LOCATIONS[selectedClimb.id];
        if (climbLocation) {
            setSelectedLocation(climbLocation);
            setLocationInput(climbLocation.label);
        } else if (selectedClimb.country === 'ZWIFT') {
            // Virtual climbs have no real location
            setSelectedLocation(null);
            setLocationInput('');
        } else {
            // Generic fallback: use climb name as search hint
            const label = selectedClimb.name.split('(')[0].trim();
            setSelectedLocation({ q: label, label });
            setLocationInput(label);
        }
        setWeatherError(null);
        setWeatherSuccess(null);
        setForecastData(null);
        setForecastLocation('');
    }, [selectedClimb]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                if (!e.target.closest?.('[data-anchored-dropdown]')) {
                    setShowSuggestions(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced geocoding search
    const searchLocations = (query) => {
        setLocationInput(query);
        setSelectedLocation(null);
        setSuggestions([]);

        if (!query || query.length < 3) {
            setShowSuggestions(false);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            if (!apiKey) {
                setShowSuggestions(false);
                return;
            }

            setIsLoadingSuggestions(true);
            try {
                const data = await geocodeLocation(query, apiKey);
                const results = data.map((item) => ({
                    q: `${item.lat},${item.lon}`,
                    lat: item.lat,
                    lon: item.lon,
                    label: [item.name, item.state, item.country].filter(Boolean).join(', '),
                }));
                setSuggestions(results);
                setShowSuggestions(results.length > 0);
            } catch {
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsLoadingSuggestions(false);
            }
        }, 400);
    };

    const selectSuggestion = (suggestion) => {
        setSelectedLocation(suggestion);
        setLocationInput(suggestion.label);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // Fetch weather from OpenWeatherMap API
    const fetchWeather = async () => {
        if (!apiKey) {
            setWeatherError('Enter an OpenWeatherMap API key in Settings (free at openweathermap.org).');
            return;
        }

        if (!locationInput.trim()) {
            setWeatherError('Enter a location');
            return;
        }

        if (selectedClimb.country === 'ZWIFT') {
            setWeatherError('Zwift climbs are virtual – no weather data available.');
            return;
        }

        setIsLoadingWeather(true);
        setWeatherError(null);
        setWeatherSuccess(null);

        try {
            const location = selectedLocation?.lat !== undefined && selectedLocation?.lon !== undefined
                ? { lat: selectedLocation.lat, lon: selectedLocation.lon }
                : { q: selectedLocation?.q || locationInput.trim() };

            const data = await fetchCurrentWeather(location, apiKey);

            setTemperature(Math.round(data.main.temp));
            setHumidity(data.main.humidity);
            setWindSpeed(Math.round(data.wind.speed * 3.6)); // m/s to km/h
            setWindDirection('none');
            setWeatherSuccess(`Weather data loaded for ${data.name} (${data.sys?.country || ''})`);
            setWeatherError(null);

            // Also fetch the 14-day forecast via Open-Meteo
            fetchForecast(
                selectedLocation?.lat ?? data.coord?.lat,
                selectedLocation?.lon ?? data.coord?.lon,
                data.name
            );
        } catch (error) {
            setWeatherError(error.message || 'Error fetching weather');
        } finally {
            setIsLoadingWeather(false);
        }
    };

    // Fetch 14-day daily forecast from Open-Meteo (free, no API key)
    const fetchForecast = async (lat, lon, cityName) => {
        try {
            let fLat = lat;
            let fLon = lon;

            // No coordinates? Open-Meteo geocoding as fallback
            if (fLat == null || fLon == null) {
                const geoRes = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&format=json`
                );
                const geoData = await geoRes.json();
                if (!geoData.results?.length) return;
                fLat = geoData.results[0].latitude;
                fLon = geoData.results[0].longitude;
            }

            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${fLat}&longitude=${fLon}` +
                `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant` +
                `&timezone=auto&forecast_days=14`
            );
            if (!res.ok) return;
            const data = await res.json();
            if (!data.daily?.time) return;

            setForecastData(data.daily.time.map((time, i) => ({
                time,
                // weather_code is the current name; weathercode kept as fallback
                weathercode: data.daily.weather_code?.[i] ?? data.daily.weathercode?.[i] ?? 0,
                temperature_2m_max: data.daily.temperature_2m_max[i],
                temperature_2m_min: data.daily.temperature_2m_min[i],
                precipitation_sum: data.daily.precipitation_sum?.[i] || 0,
                windspeed_10m_max: data.daily.windspeed_10m_max?.[i] || 0,
                winddirection_10m_dominant: data.daily.winddirection_10m_dominant?.[i] || 0,
            })));
            setForecastLocation(cityName);
        } catch {
            // Fail silently — forecast is optional
        }
    };

    // Physics constants
    const CRR = 0.004;
    const BASE_CDA = 0.32;
    const AIR_DENSITY_BASE = 1.225;
    const DRIVETRAIN_LOSS = 0.975;
    const GRAVITY = 9.81;

    const weatherAdjustedCalculation = useMemo(() => {
        const totalMass = userSettings.weight + userSettings.bikeWeight;
        const distanceM = selectedClimb.lengthKm * 1000;
        const gradeRad = Math.atan(selectedClimb.avgGrade / 100);

        const tempFactor = 1 - ((temperature - 15) * 0.004);
        const humidityFactor = 1 - (humidity / 100) * 0.015;
        const airDensity = AIR_DENSITY_BASE * tempFactor * humidityFactor;

        const gravityForce = totalMass * GRAVITY * Math.sin(gradeRad);
        const rollingForce = totalMass * GRAVITY * CRR * Math.cos(gradeRad);

        let v = 5;
        let effectiveSpeed = null;
        for (let i = 0; i < 20; i++) {
            const airResistance = 0.5 * BASE_CDA * airDensity * v * v;
            const totalForce = gravityForce + rollingForce + airResistance;
            const powerNeeded = totalForce * v / DRIVETRAIN_LOSS;
            if (Math.abs(powerNeeded - targetPower) < 1) { effectiveSpeed = v; break; }
            v = v * Math.pow(targetPower / powerNeeded, 0.3);
        }
        if (!effectiveSpeed) effectiveSpeed = v;

        const windSpeedMs = windSpeed / 3.6;
        let vWithWind = effectiveSpeed;

        if (windDirection === 'headwind') {
            for (let i = 0; i < 20; i++) {
                const effectiveAirSpeed = vWithWind + windSpeedMs;
                const airResistance = 0.5 * BASE_CDA * airDensity * effectiveAirSpeed * effectiveAirSpeed;
                const totalForce = gravityForce + rollingForce + airResistance;
                const powerNeeded = totalForce * vWithWind / DRIVETRAIN_LOSS;
                if (Math.abs(powerNeeded - targetPower) < 1) break;
                vWithWind = vWithWind * Math.pow(targetPower / powerNeeded, 0.3);
            }
        } else if (windDirection === 'tailwind') {
            for (let i = 0; i < 20; i++) {
                const effectiveAirSpeed = Math.max(0.1, vWithWind - windSpeedMs);
                const airResistance = 0.5 * BASE_CDA * airDensity * effectiveAirSpeed * effectiveAirSpeed;
                const totalForce = gravityForce + rollingForce + airResistance;
                const powerNeeded = totalForce * vWithWind / DRIVETRAIN_LOSS;
                if (Math.abs(powerNeeded - targetPower) < 1) break;
                vWithWind = vWithWind * Math.pow(targetPower / powerNeeded, 0.3);
            }
        }

        let powerOutputFactor = 1.0;
        if (temperature > 20) {
            powerOutputFactor = 1 - ((temperature - 20) / 5) * 0.01;
        } else if (temperature < 10) {
            powerOutputFactor = 1 - ((10 - temperature) / 5) * 0.005;
        }

        const adjustedPower = targetPower * powerOutputFactor;
        let vFinal = vWithWind;
        if (powerOutputFactor !== 1.0) {
            for (let i = 0; i < 20; i++) {
                const effectiveAirSpeed = windDirection === 'headwind' ? vFinal + windSpeedMs :
                    windDirection === 'tailwind' ? Math.max(0.1, vFinal - windSpeedMs) : vFinal;
                const airResistance = 0.5 * BASE_CDA * airDensity * effectiveAirSpeed * effectiveAirSpeed;
                const totalForce = gravityForce + rollingForce + airResistance;
                const powerNeeded = totalForce * vFinal / DRIVETRAIN_LOSS;
                if (Math.abs(powerNeeded - adjustedPower) < 1) break;
                vFinal = vFinal * Math.pow(adjustedPower / powerNeeded, 0.3);
            }
        }

        const baseTime = distanceM / effectiveSpeed;
        const adjustedTime = distanceM / vFinal;
        const baseTimeMinutes = baseTime / 60;
        const adjustedTimeMinutes = adjustedTime / 60;
        const timeDifference = adjustedTimeMinutes - baseTimeMinutes;

        const warnings = [];
        if (temperature > 30) warnings.push('High temperature (>30°C): increased risk of hyperthermia. Extra hydration needed!');
        else if (temperature > 25) warnings.push('Warm conditions: drink extra and consider an earlier start.');
        if (temperature < 5) warnings.push('Low temperature (<5°C): make sure you have warm enough clothing!');
        if (windDirection === 'headwind' && windSpeed > 20) warnings.push('Strong headwind (>20 km/h): expect significantly lower speed.');
        if (humidity > 80) warnings.push('High humidity (>80%): sweat evaporates poorly, risk of overheating.');

        return {
            baseTime: baseTimeMinutes,
            adjustedTime: adjustedTimeMinutes,
            timeDifference,
            baseSpeed: effectiveSpeed * 3.6,
            adjustedSpeed: vFinal * 3.6,
            powerOutputFactor,
            airDensityFactor: airDensity / AIR_DENSITY_BASE,
            warnings
        };
    }, [selectedClimb, targetPower, temperature, windSpeed, windDirection, humidity, userSettings]);

    return (
        <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-cdtext flex items-center gap-2">
                    <Cloud className="text-cyan-400" />
                    Weather-Adjusted Climb Predictions
                </h2>
                <div className="text-xs text-cdmuted bg-cdbg px-3 py-1 rounded-full border border-cdborder">
                    Real-World Conditions
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-bold text-sm mb-2">ℹ️ How does this work?</h4>
                <div className="text-xs text-cdtext space-y-1">
                    <p><strong>• Temperature:</strong> Affects air density (-0.4%/°C) and power output (heat/cold stress)</p>
                    <p><strong>• Wind:</strong> Headwind increases air resistance, tailwind reduces it</p>
                    <p><strong>• Humidity:</strong> High humidity reduces sweat evaporation (overheating risk)</p>
                    <p><strong>💡 Tip:</strong> Plan your climbs in the morning on hot days!</p>
                </div>
            </div>

            {/* Weather API Section */}
            <div className="bg-cdbg p-4 rounded border border-cdborder space-y-4">
                <h3 className="text-cdtext font-bold text-sm flex items-center gap-2">
                    <Cloud className="text-cyan-400" size={16} />
                    Fetch Live Weather Data (Optional)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location Search with Autocomplete */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="text-xs text-cdmuted uppercase block mb-1">Location</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1" ref={suggestionsRef}>
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cdmuted z-10" size={14} />
                                <input
                                    ref={locationInputRef}
                                    type="text"
                                    placeholder="Search city or town..."
                                    value={locationInput}
                                    onChange={(e) => searchLocations(e.target.value)}
                                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                    role="combobox"
                                    aria-expanded={showSuggestions && suggestions.length > 0}
                                    aria-autocomplete="list"
                                    className="w-full pl-9 pr-3 py-2.5 min-h-11 bg-cdborder border border-cdborder rounded text-cdtext text-sm focus:border-cyan-400 outline-none cd-focus-ring"
                                />
                                {isLoadingSuggestions && (
                                    <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-cdmuted" />
                                )}
                                <AnchoredDropdownPortal
                                    open={showSuggestions && suggestions.length > 0}
                                    anchorRef={locationInputRef}
                                    onClose={() => setShowSuggestions(false)}
                                    align="start"
                                    minWidth={280}
                                    role="listbox"
                                    aria-label="Location suggestions"
                                >
                                    {suggestions.map((s, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            role="option"
                                            onMouseDown={() => selectSuggestion(s)}
                                            className="w-full text-left px-3 py-3 text-sm text-cdtext hover:bg-cdborder active:bg-cdborder/80 transition-colors border-b border-cdborder/50 last:border-0 cd-focus-ring cd-min-touch-y"
                                        >
                                            <Search size={11} className="inline mr-2 text-cdmuted" aria-hidden />
                                            {s.label}
                                        </button>
                                    ))}
                                </AnchoredDropdownPortal>
                            </div>
                            <button
                                onClick={fetchWeather}
                                disabled={isLoadingWeather || !apiKey || !locationInput.trim()}
                                className={`px-4 py-2 rounded text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${isLoadingWeather || !apiKey || !locationInput.trim()
                                    ? 'bg-cdborder text-cdmuted cursor-not-allowed'
                                    : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                    }`}
                            >
                                {isLoadingWeather ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={14} />
                                )}
                                Fetch
                            </button>
                        </div>
                        <p className="text-xs text-cdmuted mt-1">
                            OpenWeather API key is stored on this device only — re-enter in Settings on each browser you use.
                        </p>
                        {!apiKey && locationInput.length >= 3 && (
                            <p className="text-xs text-cdprimary mt-1">Enter an API key in Settings for location suggestions.</p>
                        )}
                    </div>
                </div>

                {/* Error/Success Messages */}
                {weatherError && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-red-500 text-sm flex items-start gap-2">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        {weatherError}
                    </div>
                )}
                {weatherSuccess && !weatherError && (
                    <div className="bg-green-100 border border-green-500/50 rounded p-3 text-green-500 text-sm">
                        ✓ {weatherSuccess}
                    </div>
                )}

                {/* 14-day visual forecast */}
                <WeatherForecastStrip forecastData={forecastData} locationLabel={forecastLocation} />
                {!weatherError && !weatherSuccess && !isLoadingWeather && locationInput && (
                    <div className="text-xs text-cdmuted flex items-center gap-1">
                        <Lightbulb size={12} className="text-cdprimary" />
                        {selectedLocation?.lat !== undefined
                            ? `Coordinates available for ${locationInput} – click "Fetch"`
                            : `Click "Fetch" for ${locationInput}`
                        }
                    </div>
                )}
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Climb & Power */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide">Climb & Power</h3>
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-3">
                        <div>
                            <label className="text-xs text-cdmuted uppercase">Climb</label>
                            <select
                                onChange={(e) => {
                                    const climb = climbDatabase.find(c => c.id === e.target.value);
                                    if (climb) setSelectedClimb(climb);
                                }}
                                value={selectedClimb.id}
                                className="w-full bg-cdborder border border-cdborder rounded px-3 py-2 text-cdtext text-sm mt-1"
                            >
                                {climbDatabase.map(climb => (
                                    <option key={climb.id} value={climb.id}>
                                        {climb.country} - {climb.name} ({climb.lengthKm}km @ {climb.avgGrade}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span>Target Power</span>
                                <span className="tabular-nums text-cdprimary">{Math.round(targetPower)}W</span>
                            </div>
                            <input
                                type="range"
                                min={userSettings.ftp * 0.5}
                                max={userSettings.ftp * 1.2}
                                step="5"
                                value={targetPower}
                                onChange={(e) => setTargetPower(parseInt(e.target.value))}
                                className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-cdprimary"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Weather */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide">Weather Conditions</h3>
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-4">
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span className="flex items-center gap-1"><Thermometer size={12} /> Temperature</span>
                                <span className="tabular-nums text-orange-400">{temperature}°C</span>
                            </div>
                            <input type="range" min="-5" max="40" step="1" value={temperature}
                                onChange={(e) => setTemperature(parseInt(e.target.value))}
                                className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-orange-400" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span className="flex items-center gap-1"><Wind size={12} /> Wind Speed</span>
                                <span className="tabular-nums text-cyan-400">{windSpeed} km/h</span>
                            </div>
                            <input type="range" min="0" max="50" step="5" value={windSpeed}
                                onChange={(e) => setWindSpeed(parseInt(e.target.value))}
                                className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase">Wind Direction</label>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                                {[
                                    { id: 'none', label: 'None' },
                                    { id: 'headwind', label: 'Headwind' },
                                    { id: 'tailwind', label: 'Tailwind' }
                                ].map(option => (
                                    <button key={option.id} onClick={() => setWindDirection(option.id)}
                                        className={`px-2 py-1 text-xs rounded uppercase ${windDirection === option.id ? 'bg-cyan-500 text-white font-bold' : 'bg-cdsurface text-cdmuted hover:bg-cdborder'}`}>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span className="flex items-center gap-1"><Droplets size={12} /> Humidity</span>
                                <span className="tabular-nums text-blue-400">{humidity}%</span>
                            </div>
                            <input type="range" min="20" max="100" step="5" value={humidity}
                                onChange={(e) => setHumidity(parseInt(e.target.value))}
                                className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-blue-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="bg-cdbg p-6 rounded border border-cdborder space-y-4">
                <h3 className="text-cdtext font-bold text-sm uppercase tracking-wide">Prediction</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-cdsurface p-4 rounded border border-cdborder">
                        <div className="flex items-center gap-2 mb-2">
                            <Sun className="text-cdprimary" size={16} />
                            <span className="text-xs text-cdmuted uppercase">Ideal Conditions</span>
                        </div>
                        <div className="text-2xl font-bold text-cdtext">
                            {Math.floor(weatherAdjustedCalculation.baseTime / 60)}h{Math.round(weatherAdjustedCalculation.baseTime % 60).toString().padStart(2, '0')}m
                        </div>
                        <div className="text-xs text-cdmuted mt-1">{weatherAdjustedCalculation.baseSpeed.toFixed(1)} km/h avg</div>
                    </div>
                    <div className="bg-cdsurface p-4 rounded border border-cdborder">
                        <div className="flex items-center gap-2 mb-2">
                            <Cloud className="text-cyan-400" size={16} />
                            <span className="text-xs text-cdmuted uppercase">With Weather Adjustment</span>
                        </div>
                        <div className={`text-2xl font-bold ${weatherAdjustedCalculation.timeDifference > 0 ? 'text-red-400' : weatherAdjustedCalculation.timeDifference < 0 ? 'text-green-400' : 'text-cdtext'}`}>
                            {Math.floor(weatherAdjustedCalculation.adjustedTime / 60)}h{Math.round(weatherAdjustedCalculation.adjustedTime % 60).toString().padStart(2, '0')}m
                        </div>
                        <div className="text-xs text-cdmuted mt-1">{weatherAdjustedCalculation.adjustedSpeed.toFixed(1)} km/h avg</div>
                    </div>
                </div>

                <div className={`p-3 rounded border text-center ${Math.abs(weatherAdjustedCalculation.timeDifference) < 1
                    ? 'bg-green-100 border-green-500/50 text-green-500'
                    : weatherAdjustedCalculation.timeDifference > 5
                        ? 'bg-red-100 border-red-500/50 text-red-500'
                        : 'bg-cdprimarycontainer/40 border-cdprimary/50 text-cdprimary'
                    }`}>
                    <p className="font-bold text-sm">
                        {weatherAdjustedCalculation.timeDifference > 0 ? '+' : ''}
                        {Math.round(weatherAdjustedCalculation.timeDifference)} minutes difference
                    </p>
                    <p className="text-xs mt-1">
                        {Math.abs(weatherAdjustedCalculation.timeDifference) < 1 && 'Minimal impact from weather conditions'}
                        {weatherAdjustedCalculation.timeDifference >= 1 && weatherAdjustedCalculation.timeDifference <= 5 && 'Moderate impact – allow extra time'}
                        {weatherAdjustedCalculation.timeDifference > 5 && 'Strong impact – consider another day or lower power'}
                        {weatherAdjustedCalculation.timeDifference < -1 && 'Favorable conditions – faster time possible!'}
                    </p>
                </div>

                {weatherAdjustedCalculation.warnings.length > 0 && (
                    <div className="space-y-2">
                        {weatherAdjustedCalculation.warnings.map((warning, idx) => (
                            <div key={idx} className="bg-cdprimarycontainer/40 border border-cdprimary/50 rounded p-3 flex items-start gap-2">
                                <AlertTriangle className="text-cdprimary flex-shrink-0 mt-0.5" size={16} />
                                <p className="text-sm text-cdprimary">{warning}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherClimb;
