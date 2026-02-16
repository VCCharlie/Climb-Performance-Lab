import React, { useState, useMemo } from 'react';
import { Cloud, Wind, Thermometer, Droplets, Sun, CloudRain, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { CLIMB_DATABASE } from '../climbs';

// Approximate locations for popular climbs (city/town for weather lookup)
const CLIMB_LOCATIONS = {
    fr_alpe: 'Bourg-d\'Oisans,FR',
    fr_ventoux: 'Bédoin,FR',
    fr_ventoux_mal: 'Malaucène,FR',
    fr_tourmalet: 'Luz-Saint-Sauveur,FR',
    fr_galibier: 'Valloire,FR',
    fr_aubisque: 'Laruns,FR',
    it_stelvio: 'Prato allo Stelvio,IT',
    it_zoncolan: 'Ovaro,IT',
    it_gavia: 'Bormio,IT',
    ch_grimsel: 'Gletsch,CH',
    ch_furka: 'Realp,CH',
    // Add more as needed
};

const WeatherClimb = ({ userSettings, initialState, onStateChange }) => {
    const [selectedClimb, setSelectedClimb] = useState(initialState?.selectedClimb || CLIMB_DATABASE[0]);
    const [targetPower, setTargetPower] = useState(initialState?.targetPower || userSettings.ftp * 0.85);

    // Weather conditions
    const [temperature, setTemperature] = useState(initialState?.temperature || 20);
    const [windSpeed, setWindSpeed] = useState(initialState?.windSpeed || 0);
    const [windDirection, setWindDirection] = useState(initialState?.windDirection || 'none'); // headwind, tailwind, none
    const [humidity, setHumidity] = useState(initialState?.humidity || 50);

    // Weather API
    const [location, setLocation] = useState('');
    const [apiKey, setApiKey] = useState(localStorage.getItem('openweather_api_key') || '');
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);
    const [weatherError, setWeatherError] = useState(null);

    // Sync state changes to parent
    React.useEffect(() => {
        if (onStateChange) {
            onStateChange({ selectedClimb, targetPower, temperature, windSpeed, windDirection, humidity });
        }
    }, [selectedClimb, targetPower, temperature, windSpeed, windDirection, humidity, onStateChange]);

    // Auto-set location when climb changes
    React.useEffect(() => {
        const climbLocation = CLIMB_LOCATIONS[selectedClimb.id];
        if (climbLocation) {
            setLocation(climbLocation);
        } else {
            // Generic location based on climb name
            setLocation(`${selectedClimb.name.split('(')[0].trim()},${selectedClimb.country}`);
        }
    }, [selectedClimb]);

    // Fetch weather from OpenWeatherMap API
    const fetchWeather = async () => {
        if (!apiKey) {
            setWeatherError('Voer eerst een OpenWeatherMap API key in (gratis op openweathermap.org)');
            return;
        }

        if (!location) {
            setWeatherError('Voer een locatie in');
            return;
        }

        setIsLoadingWeather(true);
        setWeatherError(null);

        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
            );

            if (!response.ok) {
                throw new Error('Locatie niet gevonden of ongeldige API key');
            }

            const data = await response.json();

            // Update weather conditions
            setTemperature(Math.round(data.main.temp));
            setHumidity(data.main.humidity);
            setWindSpeed(Math.round(data.wind.speed * 3.6)); // m/s to km/h

            // Determine wind direction relative to climb (simplified)
            // In reality, you'd need climb orientation data
            setWindDirection('none'); // Default, user can adjust

            setWeatherError(null);
        } catch (error) {
            setWeatherError(error.message || 'Fout bij ophalen weer');
        } finally {
            setIsLoadingWeather(false);
        }
    };

    // Save API key to localStorage
    const saveApiKey = (key) => {
        setApiKey(key);
        if (key) {
            localStorage.setItem('openweather_api_key', key);
        } else {
            localStorage.removeItem('openweather_api_key');
        }
    };

    // Physics constants
    const CRR = 0.004;
    const BASE_CDA = 0.32;
    const AIR_DENSITY_BASE = 1.225;
    const DRIVETRAIN_LOSS = 0.975;
    const GRAVITY = 9.81;

    // Calculate climb time with weather adjustments
    const weatherAdjustedCalculation = useMemo(() => {
        const totalMass = userSettings.weight + userSettings.bikeWeight;
        const distanceM = selectedClimb.lengthKm * 1000;
        const gradeRad = Math.atan(selectedClimb.avgGrade / 100);

        // --- Weather Adjustments ---

        // 1. Air density adjustment (temperature + humidity)
        // Density decreases ~0.4% per degree C above 15°C
        const tempFactor = 1 - ((temperature - 15) * 0.004);
        // Humidity increases air density slightly (water vapor is lighter than dry air)
        const humidityFactor = 1 - (humidity / 100) * 0.015;
        const airDensity = AIR_DENSITY_BASE * tempFactor * humidityFactor;

        // 2. Wind adjustment
        let effectiveSpeed = null;
        let windPowerCost = 0;

        // Calculate base speed first (no wind)
        const gravityForce = totalMass * GRAVITY * Math.sin(gradeRad);
        const rollingForce = totalMass * GRAVITY * CRR * Math.cos(gradeRad);

        let v = 5; // m/s initial
        for (let i = 0; i < 20; i++) {
            const airResistance = 0.5 * BASE_CDA * airDensity * v * v;
            const totalForce = gravityForce + rollingForce + airResistance;
            const powerNeeded = totalForce * v / DRIVETRAIN_LOSS;

            if (Math.abs(powerNeeded - targetPower) < 1) {
                effectiveSpeed = v;
                break;
            }
            v = v * Math.pow(targetPower / powerNeeded, 0.3);
        }

        // Now calculate with wind
        const windSpeedMs = windSpeed / 3.6; // km/h to m/s
        let vWithWind = effectiveSpeed || 5;

        if (windDirection === 'headwind') {
            // Headwind: effective air speed increases
            for (let i = 0; i < 20; i++) {
                const effectiveAirSpeed = vWithWind + windSpeedMs;
                const airResistance = 0.5 * BASE_CDA * airDensity * effectiveAirSpeed * effectiveAirSpeed;
                const totalForce = gravityForce + rollingForce + airResistance;
                const powerNeeded = totalForce * vWithWind / DRIVETRAIN_LOSS;

                if (Math.abs(powerNeeded - targetPower) < 1) {
                    break;
                }
                vWithWind = vWithWind * Math.pow(targetPower / powerNeeded, 0.3);
            }
        } else if (windDirection === 'tailwind') {
            // Tailwind: effective air speed decreases
            for (let i = 0; i < 20; i++) {
                const effectiveAirSpeed = Math.max(0.1, vWithWind - windSpeedMs);
                const airResistance = 0.5 * BASE_CDA * airDensity * effectiveAirSpeed * effectiveAirSpeed;
                const totalForce = gravityForce + rollingForce + airResistance;
                const powerNeeded = totalForce * vWithWind / DRIVETRAIN_LOSS;

                if (Math.abs(powerNeeded - targetPower) < 1) {
                    break;
                }
                vWithWind = vWithWind * Math.pow(targetPower / powerNeeded, 0.3);
            }
        } else {
            vWithWind = effectiveSpeed || 5;
        }

        // 3. Temperature effect on power output
        // Performance decreases ~1% per 5°C above 20°C (heat stress)
        // Performance decreases ~0.5% per 5°C below 10°C (cold)
        let powerOutputFactor = 1.0;
        if (temperature > 20) {
            powerOutputFactor = 1 - ((temperature - 20) / 5) * 0.01;
        } else if (temperature < 10) {
            powerOutputFactor = 1 - ((10 - temperature) / 5) * 0.005;
        }

        const adjustedPower = targetPower * powerOutputFactor;

        // Recalculate with adjusted power
        let vFinal = vWithWind;
        if (powerOutputFactor !== 1.0) {
            for (let i = 0; i < 20; i++) {
                const effectiveAirSpeed = windDirection === 'headwind' ? vFinal + windSpeedMs :
                    windDirection === 'tailwind' ? Math.max(0.1, vFinal - windSpeedMs) : vFinal;
                const airResistance = 0.5 * BASE_CDA * airDensity * effectiveAirSpeed * effectiveAirSpeed;
                const totalForce = gravityForce + rollingForce + airResistance;
                const powerNeeded = totalForce * vFinal / DRIVETRAIN_LOSS;

                if (Math.abs(powerNeeded - adjustedPower) < 1) {
                    break;
                }
                vFinal = vFinal * Math.pow(adjustedPower / powerNeeded, 0.3);
            }
        }

        // Calculate times
        const baseTime = distanceM / (effectiveSpeed || 5);
        const adjustedTime = distanceM / vFinal;

        const baseTimeMinutes = baseTime / 60;
        const adjustedTimeMinutes = adjustedTime / 60;
        const timeDifference = adjustedTimeMinutes - baseTimeMinutes;

        // Warnings
        const warnings = [];
        if (temperature > 30) {
            warnings.push('🔥 Hoge temperatuur (>30°C): verhoogd risico op hyperthermie. Extra hydratatie nodig!');
        } else if (temperature > 25) {
            warnings.push('☀️ Warme omstandigheden: drink extra en overweeg vroeger te starten.');
        }

        if (temperature < 5) {
            warnings.push('🥶 Lage temperatuur (<5°C): zorg voor voldoende warmte kleding!');
        }

        if (windDirection === 'headwind' && windSpeed > 20) {
            warnings.push('💨 Sterke tegenwind (>20 km/h): verwacht significant lagere snelheid.');
        }

        if (humidity > 80) {
            warnings.push('💧 Hoge luchtvochtigheid (>80%): zweet verdampt slecht, risico op oververhitting.');
        }

        return {
            baseTime: baseTimeMinutes,
            adjustedTime: adjustedTimeMinutes,
            timeDifference,
            baseSpeed: (effectiveSpeed || 5) * 3.6,
            adjustedSpeed: vFinal * 3.6,
            powerOutputFactor,
            airDensityFactor: airDensity / AIR_DENSITY_BASE,
            warnings
        };
    }, [selectedClimb, targetPower, temperature, windSpeed, windDirection, humidity, userSettings]);

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Cloud className="text-cyan-400" />
                    Weather-Adjusted Climb Predictions
                </h2>
                <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                    Real-World Conditions
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-bold text-sm mb-2">ℹ️ Hoe werkt dit?</h4>
                <div className="text-xs text-slate-300 space-y-1">
                    <p><strong>• Temperatuur:</strong> Beïnvloedt luchtdichtheid (-0.4%/°C) én power output (warmte/koude stress)</p>
                    <p><strong>• Wind:</strong> Tegenwind verhoogt luchtweerstand, meewind verlaagt deze</p>
                    <p><strong>• Luchtvochtigheid:</strong> Hoge vochtigheid vermindert zweet verdamping (oververhitting risico)</p>
                    <p><strong>💡 Tip:</strong> Plan je beklimmingen in de ochtend bij warme dagen!</p>
                </div>
            </div>

            {/* Weather API Section */}
            <div className="bg-slate-900 p-4 rounded border border-slate-700 space-y-4">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Cloud className="text-cyan-400" size={16} />
                    Live Weersgegevens Ophalen (Optioneel)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* API Key Input */}
                    <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">
                            OpenWeatherMap API Key
                            <a
                                href="https://openweathermap.org/api"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline ml-2"
                            >
                                (Gratis aanmaken →)
                            </a>
                        </label>
                        <input
                            type="text"
                            placeholder="Vul je API key in..."
                            value={apiKey}
                            onChange={(e) => saveApiKey(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-cyan-400 outline-none"
                        />
                    </div>

                    {/* Location Search */}
                    <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Locatie</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Bijv. Bourg-d'Oisans,FR"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-cyan-400 outline-none"
                                />
                            </div>
                            <button
                                onClick={fetchWeather}
                                disabled={isLoadingWeather || !apiKey}
                                className={`px-4 py-2 rounded text-sm font-bold transition-colors flex items-center gap-2 ${
                                    isLoadingWeather || !apiKey
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                }`}
                            >
                                {isLoadingWeather ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Laden...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={14} />
                                        Haal op
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error/Success Messages */}
                {weatherError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-300 text-sm">
                        ⚠️ {weatherError}
                    </div>
                )}

                {!weatherError && !isLoadingWeather && location && (
                    <div className="text-xs text-slate-500">
                        💡 Klik op "Haal op" om actuele weersgegevens voor {location} te laden
                    </div>
                )}
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Climb & Power */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Climb & Power</h3>

                    <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-3">
                        <div>
                            <label className="text-xs text-slate-400 uppercase">Beklimming</label>
                            <select
                                onChange={(e) => {
                                    const climb = CLIMB_DATABASE.find(c => c.id === e.target.value);
                                    if (climb) setSelectedClimb(climb);
                                }}
                                value={selectedClimb.id}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm mt-1"
                            >
                                {CLIMB_DATABASE.map(climb => (
                                    <option key={climb.id} value={climb.id}>
                                        {climb.flag} {climb.name} ({climb.lengthKm}km @ {climb.avgGrade}%)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-slate-300 mb-1">
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
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Weather */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Weersomstandigheden</h3>

                    <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-4">
                        {/* Temperature */}
                        <div>
                            <div className="flex justify-between text-xs text-slate-300 mb-1">
                                <span className="flex items-center gap-1">
                                    <Thermometer size={12} />
                                    Temperatuur
                                </span>
                                <span className="font-mono text-orange-400">{temperature}°C</span>
                            </div>
                            <input
                                type="range"
                                min="-5"
                                max="40"
                                step="1"
                                value={temperature}
                                onChange={(e) => setTemperature(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-400"
                            />
                        </div>

                        {/* Wind */}
                        <div>
                            <div className="flex justify-between text-xs text-slate-300 mb-1">
                                <span className="flex items-center gap-1">
                                    <Wind size={12} />
                                    Windsnelheid
                                </span>
                                <span className="font-mono text-cyan-400">{windSpeed} km/h</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                step="5"
                                value={windSpeed}
                                onChange={(e) => setWindSpeed(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                        </div>

                        {/* Wind Direction */}
                        <div>
                            <label className="text-xs text-slate-400 uppercase">Windrichting</label>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                                {[
                                    { id: 'none', label: 'Geen' },
                                    { id: 'headwind', label: 'Tegenwind' },
                                    { id: 'tailwind', label: 'Meewind' }
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => setWindDirection(option.id)}
                                        className={`px-2 py-1 text-xs rounded uppercase ${windDirection === option.id
                                                ? 'bg-cyan-500 text-white font-bold'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Humidity */}
                        <div>
                            <div className="flex justify-between text-xs text-slate-300 mb-1">
                                <span className="flex items-center gap-1">
                                    <Droplets size={12} />
                                    Luchtvochtigheid
                                </span>
                                <span className="font-mono text-blue-400">{humidity}%</span>
                            </div>
                            <input
                                type="range"
                                min="20"
                                max="100"
                                step="5"
                                value={humidity}
                                onChange={(e) => setHumidity(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="bg-slate-900 p-6 rounded border border-slate-700 space-y-4">
                <h3 className="text-white font-bold text-sm uppercase tracking-wide">Voorspelling</h3>

                {/* Comparison */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded border border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Sun className="text-yellow-400" size={16} />
                            <span className="text-xs text-slate-400 uppercase">Ideale omstandigheden</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {Math.floor(weatherAdjustedCalculation.baseTime / 60)}h{Math.round(weatherAdjustedCalculation.baseTime % 60).toString().padStart(2, '0')}m
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            {weatherAdjustedCalculation.baseSpeed.toFixed(1)} km/h avg
                        </div>
                    </div>

                    <div className="bg-slate-800 p-4 rounded border border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Cloud className="text-cyan-400" size={16} />
                            <span className="text-xs text-slate-400 uppercase">Met weer correctie</span>
                        </div>
                        <div className={`text-2xl font-bold ${weatherAdjustedCalculation.timeDifference > 0 ? 'text-red-400' : weatherAdjustedCalculation.timeDifference < 0 ? 'text-green-400' : 'text-white'}`}>
                            {Math.floor(weatherAdjustedCalculation.adjustedTime / 60)}h{Math.round(weatherAdjustedCalculation.adjustedTime % 60).toString().padStart(2, '0')}m
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            {weatherAdjustedCalculation.adjustedSpeed.toFixed(1)} km/h avg
                        </div>
                    </div>
                </div>

                {/* Time Difference */}
                <div className={`p-3 rounded border text-center ${Math.abs(weatherAdjustedCalculation.timeDifference) < 1
                        ? 'bg-green-500/10 border-green-500/30 text-green-300'
                        : weatherAdjustedCalculation.timeDifference > 5
                            ? 'bg-red-500/10 border-red-500/30 text-red-300'
                            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                    }`}>
                    <p className="font-bold text-sm">
                        {weatherAdjustedCalculation.timeDifference > 0 ? '+' : ''}
                        {Math.round(weatherAdjustedCalculation.timeDifference)} minuten verschil
                    </p>
                    <p className="text-xs mt-1">
                        {Math.abs(weatherAdjustedCalculation.timeDifference) < 1 && 'Minimale impact van weersomstandigheden'}
                        {weatherAdjustedCalculation.timeDifference >= 1 && weatherAdjustedCalculation.timeDifference <= 5 && 'Matige impact - plan extra tijd in'}
                        {weatherAdjustedCalculation.timeDifference > 5 && 'Sterke impact - overweeg andere dag of lagere power'}
                        {weatherAdjustedCalculation.timeDifference < -1 && 'Gunstige omstandigheden - snellere tijd mogelijk!'}
                    </p>
                </div>

                {/* Warnings */}
                {weatherAdjustedCalculation.warnings.length > 0 && (
                    <div className="space-y-2">
                        {weatherAdjustedCalculation.warnings.map((warning, idx) => (
                            <div key={idx} className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 flex items-start gap-2">
                                <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                                <p className="text-sm text-yellow-300">{warning}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherClimb;
