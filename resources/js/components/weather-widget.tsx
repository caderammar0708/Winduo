import axios from 'axios';
import {
    AlertCircle,
    ArrowRight,
    ArrowUp,
    Check,
    Cloud,
    CloudDrizzle,
    CloudLightning,
    CloudRain,
    CloudSun,
    Droplets,
    Loader2,
    MapPin,
    Search,
    Sparkles,
    Sun,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface WeatherCurrent {
    temperature: number;
    feels_like: number;
    summary: string;
    icon: string;
    wind_speed: number;
    wind_speed_knots: number;
    wind_dir: string;
    wind_angle: number;
    humidity: number;
    kitesurf_condition: string;
    kitesurf_rating: string;
    kitesurf_color: string;
    updated_at?: string;
}

interface WeatherResponse {
    place_id: string;
    location: string;
    current: WeatherCurrent;
}

interface PlaceSuggestion {
    name: string;
    place_id: string;
    adm_area1?: string;
    adm_area2?: string;
    country: string;
}

interface WeatherWidgetProps {
    defaultPlaceId?: string;
    className?: string;
}

export default function WeatherWidget({ defaultPlaceId = 'kalpitiya-1242089', className = '' }: WeatherWidgetProps) {
    const [weather, setWeather] = useState<WeatherResponse | null>(null);
    const [selectedPlaceId, setSelectedPlaceId] = useState(defaultPlaceId);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Close suggestions on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial weather fetch
    useEffect(() => {
        fetchSpotWeather(selectedPlaceId);
    }, [selectedPlaceId]);

    const fetchSpotWeather = async (placeId: string, customName?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/weather', {
                params: { place_id: placeId },
            });
            if (res.data?.success && res.data.data) {
                const data = res.data.data;
                if (customName) {
                    data.location = customName;
                }
                setWeather(data);
            } else {
                setError('Unable to load spot weather');
            }
        } catch {
            setError('Weather service temporarily unavailable');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchInput = (val: string) => {
        setSearchQuery(val);
        setShowSuggestions(true);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await axios.get('/api/weather/search-locations', {
                    params: { q: val },
                });
                if (res.data?.success && Array.isArray(res.data.data)) {
                    setSuggestions(res.data.data);
                }
            } catch (err) {
                console.warn(err);
            } finally {
                setIsSearching(false);
            }
        }, 250);
    };

    const handleSelectPlace = (place: PlaceSuggestion) => {
        const displayName = place.adm_area2 ? `${place.name}, ${place.adm_area2}` : `${place.name}, ${place.country}`;
        setSelectedPlaceId(place.place_id);
        setSearchQuery(place.name);
        setShowSuggestions(false);
        fetchSpotWeather(place.place_id, displayName);
    };

    const renderWeatherIcon = (iconName: string, sizeClass = 'h-7 w-7') => {
        const iconStr = String(iconName).toLowerCase();
        if (iconStr.includes('rain') || iconStr.includes('shower')) return <CloudRain className={sizeClass} />;
        if (iconStr.includes('drizzle')) return <CloudDrizzle className={sizeClass} />;
        if (iconStr.includes('thunder') || iconStr.includes('storm')) return <CloudLightning className={sizeClass} />;
        if (iconStr.includes('cloud') || iconStr.includes('overcast')) return <Cloud className={sizeClass} />;
        if (iconStr.includes('partly') || iconStr.includes('sun')) return <CloudSun className={sizeClass} />;
        return <Sun className={sizeClass} />;
    };

    return (
        <div
            className={`relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 dark:border-white/15 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-[#0a1226]/90 dark:to-slate-950/95 dark:shadow-2xl dark:backdrop-blur-2xl ${className}`}
        >
            {/* Header: Title & Spot Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:border-[#5bb4ff]/30 dark:bg-[#1f6eff]/15 dark:text-[#8acbff]">
                        <Sparkles className="h-3 w-3 text-blue-600 dark:text-[#5bb4ff]" />
                        <span>Live Satellite Wind &amp; Weather</span>
                    </div>
                    <h3 className="mt-1 text-lg font-black text-slate-900 sm:text-xl dark:text-white">Spot Wind Station</h3>
                </div>

                {/* Spot Search Autocomplete Input */}
                <div ref={searchRef} className="relative w-full sm:w-64">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onFocus={() => {
                                setShowSuggestions(true);
                                if (suggestions.length === 0) handleSearchInput('');
                            }}
                            onChange={(e) => handleSearchInput(e.target.value)}
                            placeholder="Search Sri Lanka spot..."
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 pr-8 pl-8 text-xs text-slate-900 placeholder-slate-400 shadow-inner transition-all focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:outline-none dark:border-white/15 dark:bg-slate-950/70 dark:text-white dark:placeholder-slate-400/60 dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]/40"
                        />
                        {isSearching ? (
                            <Loader2 className="absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-blue-600 dark:text-[#5bb4ff]" />
                        ) : searchQuery ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSuggestions([]);
                                }}
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        ) : null}
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && (
                        <div className="absolute top-full right-0 z-50 mt-1 max-h-56 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#070b14]/95 dark:backdrop-blur-2xl">
                            {suggestions.length > 0 ? (
                                suggestions.map((item) => (
                                    <button
                                        key={item.place_id}
                                        type="button"
                                        onClick={() => handleSelectPlace(item)}
                                        className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                                    >
                                        <div className="flex items-center gap-1.5 truncate">
                                            <MapPin className="h-3 w-3 shrink-0 text-blue-600 dark:text-[#5bb4ff]" />
                                            <span className="truncate font-semibold text-slate-800 dark:text-white">{item.name}</span>
                                            <span className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                                ({item.adm_area2 || item.country})
                                            </span>
                                        </div>
                                        {item.place_id === selectedPlaceId && (
                                            <Check className="h-3 w-3 shrink-0 text-blue-600 dark:text-[#5bb4ff]" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="p-2 text-center text-xs text-slate-500 dark:text-slate-400">No spots found for "{searchQuery}"</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Spots Shortcut Row */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {['Kalpitiya', 'Mannar', 'Arugam Bay', 'Bentota'].map((name) => {
                    const id =
                        name === 'Kalpitiya'
                            ? 'kalpitiya-1242089'
                            : name === 'Mannar'
                              ? 'mannar-1236150'
                              : name === 'Arugam Bay'
                                ? 'arugam-bay-1250935'
                                : 'bentota';
                    const active = selectedPlaceId === id;
                    return (
                        <button
                            key={name}
                            type="button"
                            onClick={() => {
                                setSelectedPlaceId(id);
                                fetchSpotWeather(id, `${name}, Sri Lanka`);
                            }}
                            className={`cursor-pointer rounded-lg px-2.5 py-1 font-semibold transition-all ${
                                active
                                    ? 'bg-blue-600 text-white shadow-sm dark:bg-[#1f6eff]'
                                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-transparent dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white'
                            }`}
                        >
                            {name}
                        </button>
                    );
                })}
            </div>

            {/* Widget Body */}
            {isLoading && !weather ? (
                <div className="my-6 flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-[#5bb4ff]" />
                    <span>Fetching live spot metrics...</span>
                </div>
            ) : error ? (
                <div className="my-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchSpotWeather(selectedPlaceId)}
                        className="cursor-pointer font-bold text-rose-700 underline hover:text-rose-900 dark:text-white dark:hover:text-rose-200"
                    >
                        Retry
                    </button>
                </div>
            ) : weather ? (
                <div className="mt-4 space-y-4">
                    {/* Main Row: Location, Temp, Wind Dial */}
                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.03]">
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-[#8acbff]">
                                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-[#5bb4ff]" />
                                <span>{weather.location}</span>
                            </div>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900 sm:text-4xl dark:text-white">
                                    {weather.current.temperature}°C
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Feels like {weather.current.feels_like}°C</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                {renderWeatherIcon(weather.current.icon, 'h-4 w-4 text-blue-600 dark:text-[#5bb4ff]')}
                                <span>{weather.current.summary}</span>
                                <span className="text-slate-400 dark:text-slate-500">·</span>
                                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                    <Droplets className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                                    {weather.current.humidity}% humidity
                                </span>
                            </div>
                        </div>

                        {/* Wind Hero Pill */}
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/80 p-3 sm:justify-end dark:border-[#5bb4ff]/30 dark:bg-[#1f6eff]/10">
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">Current Wind</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
                                        {weather.current.wind_speed_knots}
                                    </span>
                                    <span className="text-xs font-bold text-blue-600 dark:text-[#5bb4ff]">KTS</span>
                                </div>
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{weather.current.wind_speed} m/s</span>
                            </div>

                            {/* Compass Needle */}
                            <div className="flex flex-col items-center">
                                <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs dark:border-white/20 dark:bg-slate-950/80">
                                    <ArrowUp
                                        style={{ transform: `rotate(${weather.current.wind_angle}deg)` }}
                                        className="h-4 w-4 text-blue-600 transition-transform duration-500 dark:text-[#5bb4ff]"
                                    />
                                </div>
                                <span className="mt-0.5 text-[11px] font-bold text-slate-800 dark:text-white">{weather.current.wind_dir}</span>
                            </div>
                        </div>
                    </div>

                    {/* Condition Badge and Deep Link */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="inline-flex items-center gap-2 text-xs">
                            <span
                                className={`h-2 w-2 rounded-full ${
                                    weather.current.kitesurf_color === 'emerald'
                                        ? 'bg-emerald-500 dark:bg-emerald-400'
                                        : weather.current.kitesurf_color === 'amber'
                                          ? 'bg-amber-500 dark:bg-amber-400'
                                          : 'bg-sky-500 dark:bg-sky-400'
                                }`}
                            />
                            <span className="font-bold text-slate-800 dark:text-white">{weather.current.kitesurf_rating}:</span>
                            <span className="font-medium text-blue-600 dark:text-[#8acbff]">{weather.current.kitesurf_condition}</span>
                        </div>

                        <a
                            href={`/weather?place_id=${selectedPlaceId}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-[#5bb4ff] dark:hover:text-[#8acbff]"
                        >
                            <span>Full 24h &amp; 7-Day Forecast</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
