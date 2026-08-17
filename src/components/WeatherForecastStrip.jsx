import React from 'react';
import { Droplets } from 'lucide-react';

// WMO weather codes → emoji (open-meteo daily weathercode / weather_code)
const WMO_ICONS = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '❄️', 73: '❄️', 75: '❄️', 77: '🌨️',
    80: '🌦️', 81: '🌦️', 82: '🌧️',
    85: '🌨️', 86: '🌨️',
    95: '⛈️', 96: '⛈️', 99: '⛈️',
};

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Wind direction degrees → compass abbreviation
const WIND_DIR = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const windAbbr = (deg) => WIND_DIR[Math.round((deg ?? 0) / 45) % 8];

const wmoIcon = (code) =>
    WMO_ICONS[code] ??
    (code <= 3 ? '⛅' : code <= 49 ? '🌫️' : code <= 69 ? '🌧️' :
        code <= 79 ? '❄️' : code <= 82 ? '🌦️' : '⛈️');

const tempClass = (t) =>
    t >= 30 ? 'text-red-400' :
        t >= 22 ? 'text-orange-500' :
            t >= 14 ? 'text-yellow-500' :
                t >= 5 ? 'text-green-500' :
                    'text-blue-500';

// A day is "good for climbing" when conditions are comfortable
const isGoodDay = (day) =>
    day.temperature_2m_max >= 8 &&
    day.temperature_2m_max <= 25 &&
    (day.precipitation_sum || 0) < 2 &&
    (day.windspeed_10m_max || 0) < 25 &&
    (day.weathercode ?? 0) < 51; // no rain, snow or thunderstorm code

const WeatherForecastStrip = ({ forecastData, locationLabel }) => {
    if (!forecastData?.length) return null;

    return (
        <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-s font-bold text-cdmuted uppercase tracking-wide">
                    14-day forecast
                    {locationLabel && (
                        <span className="ml-1 font-normal normal-case text-cdmuted/60">
                            — {locationLabel}
                        </span>
                    )}
                </span>
                <span className="text-s text-cdmuted/40 italic">Open-Meteo</span>
            </div>

            {/* Scrollable day cards */}
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                {forecastData.map((day, idx) => {
                    // Add T12:00:00 to avoid timezone-shift date-off-by-one
                    const d = new Date(day.time + 'T12:00:00');
                    const isToday = idx === 0;
                    const good = isGoodDay(day);
                    const precip = day.precipitation_sum || 0;
                    const icon = wmoIcon(day.weathercode ?? 0);

                    return (
                        <div
                            key={day.time}
                            className={`flex-shrink-0 w-[56px] rounded-lg border flex flex-col items-center gap-0.5 py-2 px-1 text-center
                                ${isToday
                                    ? 'border-cyan-500/70 bg-cyan-500/10'
                                    : good
                                        ? 'border-green-500/70 bg-green-100'
                                        : 'border-cdborder bg-cdbg/40'
                                }`}
                        >
                            {/* Day name */}
                            <span className={`text-s font-semibold leading-none ${isToday ? 'text-cyan-500' : 'text-cdtext'}`}>
                                {isToday ? 'now' : DAY_ABBR[d.getDay()]}
                            </span>

                            {/* Short date */}
                            <span className="text-s text-cdmuted/50 leading-none">
                                {d.getDate()}/{d.getMonth() + 1}
                            </span>

                            {/* Weather icon + optional good-day check */}
                            <div className="relative mt-0.5">
                                <span className="text-xl leading-none">{icon}</span>
                                {good && (
                                    <span className="absolute -top-1 -right-2 text-green-500 text-[10px] font-bold" aria-hidden>✓</span>
                                )}
                            </div>

                            {/* Max temperature */}
                            <span className={`text-s font-bold leading-none mt-0.5 ${tempClass(day.temperature_2m_max)}`}>
                                {Math.round(day.temperature_2m_max)}°
                            </span>

                            {/* Min temperature */}
                            <span className={`text-s leading-none opacity-60 ${tempClass(day.temperature_2m_min)}`}>
                                {Math.round(day.temperature_2m_min)}°
                            </span>

                            {/* Precipitation */}
                            <span className={`text-s leading-none flex items-center gap-px mt-0.5
                                ${precip >= 2 ? 'text-blue-500' : precip > 0 ? 'text-blue-500' : 'text-cdmuted/25'}`}>
                                <Droplets size={10} aria-hidden />
                                <span>{precip > 0 ? (precip < 1 ? '<1' : Math.round(precip)) : '—'}</span>
                            </span>

                            {/* Wind: direction abbreviation + max speed */}
                            <span className="text-[12px] leading-none text-cyan-500 mt-0.5">
                                {windAbbr(day.winddirection_10m_dominant)}&nbsp;{Math.round(day.windspeed_10m_max || 0)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 text-s text-cdmuted/40">
                <span>💧 precipitation (mm) · wind: direction + km/h</span>
                <span className="text-green-500">✓ good climb day (5–25°C, dry, calm)</span>
            </div>
        </div>
    );
};

export default WeatherForecastStrip;
