import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Cloud, Wind, Thermometer, Droplets, Sun, AlertTriangle, Search, RefreshCw, Lightbulb } from 'lucide-react';
import { CLIMB_DATABASE } from '../climbs';
import WeatherForecastStrip from './WeatherForecastStrip';

// Approximate locations for popular climbs (city/town for weather lookup)
const CLIMB_LOCATIONS = {
    fr_alpe: { q: 'Le Bourg-d\'Oisans,FR', label: 'Bourg-d\'Oisans, France' },
    fr_ventoux: { q: 'Bedoin,FR', label: 'Bédoin, France' },
    fr_ventoux_mal: { q: 'Malaucene,FR', label: 'Malaucène, France' },
    fr_tourmalet: { q: 'Luz-Saint-Sauveur,FR', label: 'Luz-Saint-Sauveur, France' },
    fr_galibier: { q: 'Valloire,FR', label: 'Valloire, France' },
    fr_aubisque: { q: 'Laruns,FR', label: 'Laruns, France' },
    fr_izoard: { q: 'Guillestre,FR', label: 'Guillestre, France' },
    fr_croix_de_fer: { q: 'Saint-Jean-de-Maurienne,FR', label: 'Saint-Jean-de-Maurienne, France' },
    it_stelvio: { q: 'Prato allo Stelvio,IT', label: 'Prato allo Stelvio, Italy' },
    it_zoncolan: { q: 'Ovaro,IT', label: 'Ovaro, Italy' },
    it_gavia: { q: 'Bormio,IT', label: 'Bormio, Italy' },
    it_mortirolo: { q: 'Mazzo di Valtellina,IT', label: 'Mazzo di Valtellina, Italy' },
    ch_grimsel: { q: 'Meiringen,CH', label: 'Meiringen, Switzerland' },
    ch_furka: { q: 'Realp,CH', label: 'Realp, Switzerland' },
    ch_gotthard: { q: 'Airolo,CH', label: 'Airolo, Switzerland' },
};

const WeatherClimb = ({ userSettings, initialState, onStateChange }) => {
    const [selectedClimb, setSelectedClimb] = useState(initialState?.selectedClimb || CLIMB_DATABASE[0]);
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

    // 14-day forecast (Open-Meteo, geen API key nodig)
    const [forecastData, setForecastData] = useState(null);
    const [forecastLocation, setForecastLocation] = useState('');

    // Autocomplete state
    const [suggestions, setSuggestions] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef(null);
    const suggestionsRef = useRef(null);

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
                setShowSuggestions(false);
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
                // Show suggestions without API key hint
                setShowSuggestions(false);
                return;
            }

            setIsLoadingSuggestions(true);
            try {
                const res = await fetch(
                    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
                );
                if (!res.ok) throw new Error('Geocoding failed');
                const data = await res.json();
                const results = data.map(item => ({
                    q: `${item.lat},${item.lon}`,
                    lat: item.lat,
                    lon: item.lon,
                    label: [item.name, item.state, item.country].filter(Boolean).join(', ')
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
            setWeatherError('Voer eerst een OpenWeatherMap API key in via Settings (gratis op openweathermap.org)');
            return;
        }

        if (!locationInput.trim()) {
            setWeatherError('Voer een locatie in');
            return;
        }

        if (selectedClimb.country === 'ZWIFT') {
            setWeatherError('Zwift-klimmen zijn virtueel – geen weersdata beschikbaar.');
            return;
        }

        setIsLoadingWeather(true);
        setWeatherError(null);
        setWeatherSuccess(null);

        try {
            let url;
            if (selectedLocation?.lat !== undefined && selectedLocation?.lon !== undefined) {
                // Use coordinates for more reliable lookup
                url = `https://api.openweathermap.org/data/2.5/weather?lat=${selectedLocation.lat}&lon=${selectedLocation.lon}&appid=${apiKey}&units=metric`;
            } else {
                // Fall back to city name query
                const q = selectedLocation?.q || locationInput.trim();
                url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${apiKey}&units=metric`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    throw new Error('Ongeldige API key. Controleer je sleutel op openweathermap.org');
                } else if (response.status === 404) {
                    throw new Error('Locatie niet gevonden. Zoek een stad in de buurt van de klim.');
                } else {
                    throw new Error(errData.message || 'Onbekende fout bij ophalen weersdata');
                }
            }

            const data = await response.json();

            setTemperature(Math.round(data.main.temp));
            setHumidity(data.main.humidity);
            setWindSpeed(Math.round(data.wind.speed * 3.6)); // m/s to km/h
            setWindDirection('none');
            setWeatherSuccess(`Weersdata geladen voor ${data.name} (${data.sys?.country || ''})`);
            setWeatherError(null);

            // Haal ook de 14-daagse prognose op via Open-Meteo
            fetchForecast(
                selectedLocation?.lat ?? data.coord?.lat,
                selectedLocation?.lon ?? data.coord?.lon,
                data.name
            );
        } catch (error) {
            setWeatherError(error.message || 'Fout bij ophalen weer');
        } finally {
            setIsLoadingWeather(false);
        }
    };

    // Fetch 14-day daily forecast from Open-Meteo (gratis, geen API key)
    const fetchForecast = async (lat, lon, cityName) => {
        try {
            let fLat = lat;
            let fLon = lon;

            // Geen coördinaten? Open-Meteo geocoding als fallback
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
            // Stil falen — prognose is optioneel
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
        if (temperature > 30) warnings.push('Hoge temperatuur (>30°C): verhoogd risico op hyperthermie. Extra hydratatie nodig!');
        else if (temperature > 25) warnings.push('Warme omstandigheden: drink extra en overweeg vroeger te starten.');
        if (temperature < 5) warnings.push('Lage temperatuur (<5°C): zorg voor voldoende warme kleding!');
        if (windDirection === 'headwind' && windSpeed > 20) warnings.push('Sterke tegenwind (>20 km/h): verwacht significant lagere snelheid.');
        if (humidity > 80) warnings.push('Hoge luchtvochtigheid (>80%): zweet verdampt slecht, risico op oververhitting.');

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
                <h4 className="text-blue-400 font-bold text-sm mb-2">ℹ️ Hoe werkt dit?</h4>
                <div className="text-xs text-cdtext space-y-1">
                    <p><strong>• Temperatuur:</strong> Beïnvloedt luchtdichtheid (-0.4%/°C) én power output (warmte/koude stress)</p>
                    <p><strong>• Wind:</strong> Tegenwind verhoogt luchtweerstand, meewind verlaagt deze</p>
                    <p><strong>• Luchtvochtigheid:</strong> Hoge vochtigheid vermindert zweet verdamping (oververhitting risico)</p>
                    <p><strong>💡 Tip:</strong> Plan je beklimmingen in de ochtend bij warme dagen!</p>
                </div>
            </div>

            {/* Weather API Section */}
            <div className="bg-cdbg p-4 rounded border border-cdborder space-y-4">
                <h3 className="text-cdtext font-bold text-sm flex items-center gap-2">
                    <Cloud className="text-cyan-400" size={16} />
                    Live Weersgegevens Ophalen (Optioneel)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location Search with Autocomplete */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="text-xs text-cdmuted uppercase block mb-1">Locatie</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1" ref={suggestionsRef}>
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cdmuted z-10" size={14} />
                                <input
                                    type="text"
                                    placeholder="Zoek stad of dorp..."
                                    value={locationInput}
                                    onChange={(e) => searchLocations(e.target.value)}
                                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                    className="w-full pl-9 pr-3 py-2 bg-cdborder border border-cdborder rounded text-cdtext text-sm focus:border-cyan-400 outline-none"
                                />
                                {isLoadingSuggestions && (
                                    <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-cdmuted" />
                                )}
                                {/* Autocomplete Dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-cdsurface border border-cdborder rounded shadow-xl overflow-hidden">
                                        {suggestions.map((s, idx) => (
                                            <button
                                                key={idx}
                                                onMouseDown={() => selectSuggestion(s)}
                                                className="w-full text-left px-3 py-2 text-sm text-cdtext hover:bg-cdborder transition-colors border-b border-cdborder/50 last:border-0"
                                            >
                                                <Search size={11} className="inline mr-2 text-cdmuted" />
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
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
                                Haal op
                            </button>
                        </div>
                        {!apiKey && locationInput && (
                            <p className="text-xs text-yellow-500 mt-1">Voer een API key in voor locatie-suggesties</p>
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

                {/* 14-daagse visuele prognose */}
                <WeatherForecastStrip forecastData={forecastData} locationLabel={forecastLocation} />
                {!weatherError && !weatherSuccess && !isLoadingWeather && locationInput && (
                    <div className="text-xs text-cdmuted flex items-center gap-1">
                        <Lightbulb size={12} className="text-yellow-500" />
                        {selectedLocation?.lat !== undefined
                            ? `Coördinaten beschikbaar voor ${locationInput} – klik "Haal op"`
                            : `Klik op "Haal op" voor ${locationInput}`
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
                            <label className="text-xs text-cdmuted uppercase">Beklimming</label>
                            <select
                                onChange={(e) => {
                                    const climb = CLIMB_DATABASE.find(c => c.id === e.target.value);
                                    if (climb) setSelectedClimb(climb);
                                }}
                                value={selectedClimb.id}
                                className="w-full bg-cdborder border border-cdborder rounded px-3 py-2 text-cdtext text-sm mt-1"
                            >
                                {CLIMB_DATABASE.map(climb => (
                                    <option key={climb.id} value={climb.id}>
                                        {climb.flag} {climb.name} ({climb.lengthKm}km @ {climb.avgGrade}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span>Target Power</span>
                                <span className="font-mono text-yellow-400">{Math.round(targetPower)}W</span>
                            </div>
                            <input
                                type="range"
                                min={userSettings.ftp * 0.5}
                                max={userSettings.ftp * 1.2}
                                step="5"
                                value={targetPower}
                                onChange={(e) => setTargetPower(parseInt(e.target.value))}
                                className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-yellow-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Weather */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide">Weersomstandigheden</h3>
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-4">
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span className="flex items-center gap-1"><Thermometer size={12} /> Temperatuur</span>
                                <span className="font-mono text-orange-400">{temperature}°C</span>
                            </div>
                            <input type="range" min="-5" max="40" step="1" value={temperature}
                                onChange={(e) => setTemperature(parseInt(e.target.value))}
                                className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-orange-400" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span className="flex items-center gap-1"><Wind size={12} /> Windsnelheid</span>
                                <span className="font-mono text-cyan-400">{windSpeed} km/h</span>
                            </div>
                            <input type="range" min="0" max="50" step="5" value={windSpeed}
                                onChange={(e) => setWindSpeed(parseInt(e.target.value))}
                                className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                        </div>
                        <div>
                            <label className="text-xs text-cdmuted uppercase">Windrichting</label>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                                {[
                                    { id: 'none', label: 'Geen' },
                                    { id: 'headwind', label: 'Tegenwind' },
                                    { id: 'tailwind', label: 'Meewind' }
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
                                <span className="flex items-center gap-1"><Droplets size={12} /> Luchtvochtigheid</span>
                                <span className="font-mono text-blue-400">{humidity}%</span>
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
                <h3 className="text-cdtext font-bold text-sm uppercase tracking-wide">Voorspelling</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-cdsurface p-4 rounded border border-cdborder">
                        <div className="flex items-center gap-2 mb-2">
                            <Sun className="text-yellow-400" size={16} />
                            <span className="text-xs text-cdmuted uppercase">Ideale omstandigheden</span>
                        </div>
                        <div className="text-2xl font-bold text-cdtext">
                            {Math.floor(weatherAdjustedCalculation.baseTime / 60)}h{Math.round(weatherAdjustedCalculation.baseTime % 60).toString().padStart(2, '0')}m
                        </div>
                        <div className="text-xs text-cdmuted mt-1">{weatherAdjustedCalculation.baseSpeed.toFixed(1)} km/h avg</div>
                    </div>
                    <div className="bg-cdsurface p-4 rounded border border-cdborder">
                        <div className="flex items-center gap-2 mb-2">
                            <Cloud className="text-cyan-400" size={16} />
                            <span className="text-xs text-cdmuted uppercase">Met weercorrectie</span>
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
                        : 'bg-yellow-100 border-yellow-500/50 text-yellow-500'
                    }`}>
                    <p className="font-bold text-sm">
                        {weatherAdjustedCalculation.timeDifference > 0 ? '+' : ''}
                        {Math.round(weatherAdjustedCalculation.timeDifference)} minuten verschil
                    </p>
                    <p className="text-xs mt-1">
                        {Math.abs(weatherAdjustedCalculation.timeDifference) < 1 && 'Minimale impact van weersomstandigheden'}
                        {weatherAdjustedCalculation.timeDifference >= 1 && weatherAdjustedCalculation.timeDifference <= 5 && 'Matige impact – plan extra tijd in'}
                        {weatherAdjustedCalculation.timeDifference > 5 && 'Sterke impact – overweeg andere dag of lagere power'}
                        {weatherAdjustedCalculation.timeDifference < -1 && 'Gunstige omstandigheden – snellere tijd mogelijk!'}
                    </p>
                </div>

                {weatherAdjustedCalculation.warnings.length > 0 && (
                    <div className="space-y-2">
                        {weatherAdjustedCalculation.warnings.map((warning, idx) => (
                            <div key={idx} className="bg-yellow-100 border border-yellow-500/50 rounded p-3 flex items-start gap-2">
                                <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                                <p className="text-sm text-yellow-400">{warning}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherClimb;
