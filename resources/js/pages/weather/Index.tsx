import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    ArrowUp,
    Check,
    Cloud,
    CloudDrizzle,
    CloudLightning,
    CloudRain,
    CloudSun,
    Compass,
    Droplets,
    Gauge,
    Loader2,
    MapPin,
    Navigation,
    RefreshCw,
    Search,
    Sparkles,
    Sun,
    Wind,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface WeatherCurrent {
    temperature: number;
    temperature_int?: number;
    feels_like: number;
    summary: string;
    icon: string;
    icon_num: number;
    wind_speed: number;
    wind_speed_knots: number;
    wind_dir: string;
    wind_angle: number;
    cloud_cover: number;
    precipitation: number;
    humidity: number;
    kitesurf_condition: string;
    kitesurf_rating: string;
    kitesurf_color: string;
    updated_at?: string;
}

interface HourlyItem {
    date: string;
    time: string;
    time_24: string;
    temperature: number;
    summary: string;
    icon: number | string;
    weather: string;
    wind_speed: number;
    wind_speed_knots: number;
    wind_dir: string;
    wind_angle: number;
    precipitation: number;
}

interface DailyItem {
    day: string;
    day_name: string;
    date_formatted: string;
    summary: string;
    weather: string;
    icon: number | string;
    temp_min: number;
    temp_max: number;
    wind_speed: number;
    wind_speed_knots: number;
    wind_dir: string;
    precipitation_total: number;
}

interface WeatherData {
    place_id: string;
    location: string;
    timezone: string;
    elevation?: number;
    current: WeatherCurrent;
    hourly: HourlyItem[];
    daily: DailyItem[];
}

interface PlaceSuggestion {
    name: string;
    place_id: string;
    adm_area1?: string;
    adm_area2?: string;
    country: string;
    lat?: string;
    lon?: string;
}

interface WeatherPageProps {
    initialWeather?: WeatherData | null;
    defaultPlaceId?: string;
    defaultPlaceName?: string;
}

const QUICK_SPOTS = [
    { name: 'Kalpitiya Lagoon', place_id: 'kalpitiya-1242089', tag: 'Top Kiting Spot' },
    { name: 'Mannar Island', place_id: 'mannar-1236150', tag: 'Endless Flat Water' },
    { name: 'Arugam Bay', place_id: 'arugam-bay-1250935', tag: 'East Coast Surf' },
    { name: 'Trincomalee', place_id: 'trincomalee', tag: 'Deep Bay Winds' },
    { name: 'Bentota', place_id: 'bentota', tag: 'South West Coastal' },
    { name: 'Mirissa', place_id: 'mirissa-city', tag: 'South Coast Waves' },
];

export default function WeatherIndex({
    initialWeather,
    defaultPlaceId = 'kalpitiya-1242089',
    defaultPlaceName = 'Kalpitiya, Sri Lanka',
}: WeatherPageProps) {
    const { auth } = usePage<SharedData>().props;
    const isInstructor = auth?.user?.role === 'instructor';

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: isInstructor ? 'Instructor Dashboard' : 'Dashboard',
            href: isInstructor ? '/instructor/dashboard' : '/dashboard',
        },
        {
            title: 'Live Spot Weather',
            href: '/weather',
        },
    ];

    const [weather, setWeather] = useState<WeatherData | null>(initialWeather || null);
    const [selectedPlaceId, setSelectedPlaceId] = useState<string>(defaultPlaceId);
    const [selectedPlaceName, setSelectedPlaceName] = useState<string>(defaultPlaceName);

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [isLoadingWeather, setIsLoadingWeather] = useState(false);
    const [weatherError, setWeatherError] = useState<string | null>(null);

    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Close suggestions dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial weather fetch if not provided in props
    useEffect(() => {
        if (!weather) {
            fetchWeather(selectedPlaceId, selectedPlaceName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounced search call
    const handleSearchInput = (val: string) => {
        setSearchQuery(val);
        setShowSuggestions(true);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await axios.get('/api/weather/search-locations', {
                    params: { q: val },
                });
                if (res.data?.success && Array.isArray(res.data.data)) {
                    setSuggestions(res.data.data);
                }
            } catch (err) {
                console.warn('Location search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 250);
    };

    const handleSelectPlace = (place: PlaceSuggestion) => {
        const displayName = place.adm_area2 ? `${place.name}, ${place.adm_area2}` : `${place.name}, ${place.country}`;
        setSelectedPlaceId(place.place_id);
        setSelectedPlaceName(displayName);
        setSearchQuery(place.name);
        setShowSuggestions(false);
        fetchWeather(place.place_id, displayName);
    };

    const fetchWeather = async (placeId: string, placeName?: string) => {
        setIsLoadingWeather(true);
        setWeatherError(null);
        try {
            const res = await axios.get('/api/weather', {
                params: { place_id: placeId },
            });
            if (res.data?.success && res.data.data) {
                const data = res.data.data;
                if (placeName) {
                    data.location = placeName;
                }
                setWeather(data);
            } else {
                setWeatherError('Unable to load weather data for this spot. Please try again.');
            }
        } catch (err: unknown) {
            const errObj = err as { response?: { data?: { error?: string } } };
            setWeatherError(errObj?.response?.data?.error || 'Unable to connect to weather service. Please check your connection and retry.');
        } finally {
            setIsLoadingWeather(false);
        }
    };

    // Recommended kite size calculation
    const getRecommendedKite = (knots: number) => {
        if (knots >= 28) return '5m – 7m (High Wind)';
        if (knots >= 22) return '7m – 9m (Strong)';
        if (knots >= 17) return '9m – 11m (Optimal)';
        if (knots >= 13) return '11m – 14m (Cruising)';
        if (knots >= 10) return '15m+ or Hydrofoil';
        return 'Too Light / No Wind (<10 kts)';
    };

    // Render weather icon according to summary/icon
    const renderWeatherIcon = (iconName: string | number, className = 'h-8 w-8') => {
        const iconStr = String(iconName).toLowerCase();
        if (iconStr.includes('rain') || iconStr.includes('shower')) return <CloudRain className={className} />;
        if (iconStr.includes('drizzle')) return <CloudDrizzle className={className} />;
        if (iconStr.includes('thunder') || iconStr.includes('storm')) return <CloudLightning className={className} />;
        if (iconStr.includes('cloud') || iconStr.includes('overcast')) return <Cloud className={className} />;
        if (iconStr.includes('partly') || iconStr.includes('sun')) return <CloudSun className={className} />;
        return <Sun className={className} />;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Live Spot Weather & Kitesurf Wind Forecast - Winduo" />

            <div className="relative mx-auto min-h-full max-w-7xl space-y-6 p-4 text-slate-800 selection:bg-blue-600/30 selection:text-blue-900 sm:p-6 lg:p-8 dark:text-slate-100 dark:selection:bg-[#3b82f6]/30 dark:selection:text-white">
                {/* Header & Spot Search */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-[#5bb4ff]/30 dark:bg-[#1f6eff]/10 dark:text-[#8acbff]">
                            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-[#5bb4ff]" />
                            <span>Powered by Meteosource Satellite Forecast</span>
                        </div>
                        <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
                            <Wind className="h-8 w-8 text-blue-600 dark:text-[#5bb4ff]" />
                            Live Weather &amp; Wind Station
                        </h1>
                        <p className="mt-1 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
                            Real-time wind speeds, gust analysis, and 7-day atmospheric forecasts for all spots across Sri Lanka.
                        </p>
                    </div>

                    {/* Location Autocomplete Search Bar */}
                    <div ref={searchContainerRef} className="relative w-full md:w-80 lg:w-96">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onFocus={() => {
                                    setShowSuggestions(true);
                                    if (suggestions.length === 0) handleSearchInput('');
                                }}
                                onChange={(e) => handleSearchInput(e.target.value)}
                                placeholder="Search any Sri Lankan spot or city..."
                                className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pr-10 pl-10 text-xs text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none sm:text-sm dark:border-white/15 dark:bg-slate-950/70 dark:text-white dark:placeholder-slate-400/70 dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]/40"
                            />
                            {isSearching ? (
                                <Loader2 className="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600 dark:text-[#5bb4ff]" />
                            ) : searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSuggestions([]);
                                    }}
                                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            ) : null}
                        </div>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && (
                            <div className="absolute top-full z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/15 dark:bg-[#070b14]/95 dark:backdrop-blur-2xl">
                                <div className="px-2 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    {searchQuery ? `Matching Locations (${suggestions.length})` : 'Popular Sri Lankan Spots'}
                                </div>
                                {suggestions.length > 0 ? (
                                    suggestions.map((item) => (
                                        <button
                                            key={item.place_id}
                                            type="button"
                                            onClick={() => handleSelectPlace(item)}
                                            className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                                        >
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-[#5bb4ff]" />
                                                <div>
                                                    <span className="font-semibold text-slate-800 dark:text-white">{item.name}</span>
                                                    <span className="ml-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                        {item.adm_area2 || item.adm_area1 || item.country}
                                                    </span>
                                                </div>
                                            </div>
                                            {item.place_id === selectedPlaceId && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-[#5bb4ff]" />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                                        No locations found for "{searchQuery}". Try "Kalpitiya", "Mannar", or "Bentota".
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Spot Shortcuts */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="shrink-0 text-[11px] font-bold text-slate-500 uppercase dark:text-slate-400">Quick Spots:</span>
                    {QUICK_SPOTS.map((s) => {
                        const isCurrent = s.place_id === selectedPlaceId;
                        return (
                            <button
                                key={s.place_id}
                                type="button"
                                onClick={() => {
                                    setSelectedPlaceId(s.place_id);
                                    setSelectedPlaceName(s.name + ', Sri Lanka');
                                    fetchWeather(s.place_id, s.name + ', Sri Lanka');
                                }}
                                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                                    isCurrent
                                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600 dark:border-[#3b82f6] dark:bg-[#1f6eff]/20 dark:text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white'
                                }`}
                            >
                                <Navigation className="h-3 w-3 text-blue-600 dark:text-[#5bb4ff]" />
                                <span>{s.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Error Banner */}
                {weatherError && (
                    <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                            <span>{weatherError}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => fetchWeather(selectedPlaceId, selectedPlaceName)}
                            className="inline-flex cursor-pointer items-center gap-1 font-bold text-rose-700 underline hover:text-rose-900 dark:text-white dark:hover:text-rose-200"
                        >
                            <RefreshCw className="h-3.5 w-3.5" /> Retry
                        </button>
                    </div>
                )}

                {/* Main Weather Display */}
                {isLoadingWeather && !weather ? (
                    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-[#5bb4ff]" />
                        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Loading Weather Data</h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Fetching live atmospheric &amp; wind metrics for {selectedPlaceName}...
                        </p>
                    </div>
                ) : weather ? (
                    <div className="space-y-6">
                        {/* Hero Live Condition & Wind Card */}
                        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8 dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-[#0a1122]/90 dark:to-slate-950/90 dark:shadow-2xl">
                            {/* Decorative ambient background blur */}
                            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl dark:bg-[#1f6eff]/15" />
                            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-50/60 blur-3xl dark:bg-[#5bb4ff]/10" />

                            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                                {/* Left Side: Location, Temp & Summary */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-[#8acbff]">
                                            <MapPin className="h-4 w-4 text-blue-600 dark:text-[#5bb4ff]" />
                                            <span>{weather.location}</span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Updated at {weather.current.updated_at || 'Just now'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-baseline gap-4">
                                        <div className="flex items-start gap-1">
                                            <span className="text-5xl font-black text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">
                                                {weather.current.temperature}
                                            </span>
                                            <span className="text-2xl font-bold text-blue-600 sm:text-3xl dark:text-[#8acbff]">°C</span>
                                        </div>

                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                                                {renderWeatherIcon(weather.current.icon, 'h-6 w-6 text-blue-600 dark:text-[#5bb4ff]')}
                                                <span>{weather.current.summary}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Feels like{' '}
                                                <strong className="text-slate-800 dark:text-slate-200">{weather.current.feels_like}°C</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Kiting Condition Badge */}
                                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold dark:border-white/10 dark:bg-white/[0.04]">
                                        <span
                                            className={`h-2.5 w-2.5 rounded-full ${
                                                weather.current.kitesurf_color === 'emerald'
                                                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40 dark:bg-emerald-400'
                                                    : weather.current.kitesurf_color === 'amber'
                                                      ? 'bg-amber-500 shadow-sm shadow-amber-500/40 dark:bg-amber-400'
                                                      : weather.current.kitesurf_color === 'rose'
                                                        ? 'bg-rose-500 shadow-sm shadow-rose-500/40 dark:bg-rose-400'
                                                        : 'bg-sky-500 shadow-sm shadow-sky-500/40 dark:bg-sky-400'
                                            }`}
                                        />
                                        <span className="font-bold text-slate-800 dark:text-white">{weather.current.kitesurf_rating} Rating:</span>
                                        <span className="font-medium text-blue-600 dark:text-[#8acbff]">{weather.current.kitesurf_condition}</span>
                                    </div>
                                </div>

                                {/* Right Side: Wind Master Card */}
                                <div className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm sm:p-6 lg:min-w-[340px] dark:border-[#5bb4ff]/30 dark:bg-gradient-to-br dark:from-[#1f6eff]/15 dark:via-slate-900/60 dark:to-slate-950/70">
                                    <div className="flex items-center justify-between border-b border-blue-100 pb-3 dark:border-white/10">
                                        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                                            <Wind className="h-4 w-4 text-blue-600 dark:text-[#5bb4ff]" />
                                            Wind &amp; Riding Factor
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => fetchWeather(selectedPlaceId, selectedPlaceName)}
                                            disabled={isLoadingWeather}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100/60 disabled:opacity-50 dark:text-[#8acbff] dark:hover:bg-white/10"
                                        >
                                            <RefreshCw className={`h-3 w-3 ${isLoadingWeather ? 'animate-spin' : ''}`} />
                                            <span>Refresh</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-4xl font-black text-slate-900 sm:text-5xl dark:text-white">
                                                    {weather.current.wind_speed_knots}
                                                </span>
                                                <span className="text-sm font-bold text-blue-600 dark:text-[#5bb4ff]">KNOTS</span>
                                            </div>
                                            <div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                {weather.current.wind_speed} m/s · {Math.round(weather.current.wind_speed * 3.6)} km/h
                                            </div>
                                        </div>

                                        {/* Wind Direction Compass Dial */}
                                        <div className="flex flex-col items-center">
                                            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-200 bg-white shadow-xs dark:border-white/20 dark:bg-slate-950/80">
                                                <ArrowUp
                                                    style={{ transform: `rotate(${weather.current.wind_angle}deg)` }}
                                                    className="h-6 w-6 text-blue-600 transition-transform duration-500 ease-out dark:text-[#5bb4ff]"
                                                />
                                            </div>
                                            <span className="mt-1 text-xs font-black text-slate-900 dark:text-white">
                                                {weather.current.wind_dir} ({weather.current.wind_angle}°)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Kite Size Recommendation */}
                                    <div className="rounded-xl border border-blue-100 bg-white p-2.5 text-xs dark:border-white/10 dark:bg-white/[0.04]">
                                        <span className="block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                            Coach Recommendation:
                                        </span>
                                        <p className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                                            {getRecommendedKite(weather.current.wind_speed_knots)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Metrics Bar */}
                            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-200 pt-6 sm:grid-cols-4 dark:border-white/10">
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                                    <Droplets className="h-5 w-5 shrink-0 text-sky-500 dark:text-sky-400" />
                                    <div>
                                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">Humidity</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{weather.current.humidity}%</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                                    <Cloud className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" />
                                    <div>
                                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">Cloud Cover</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{weather.current.cloud_cover}%</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                                    <CloudRain className="h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                                    <div>
                                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">Precipitation</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{weather.current.precipitation} mm</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                                    <Compass className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
                                    <div>
                                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">Timezone</span>
                                        <span className="block max-w-[120px] truncate text-xs font-bold text-slate-900 dark:text-white">
                                            {weather.timezone}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hourly Forecast Strip (24 Hours) */}
                        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                    <Gauge className="h-5 w-5 text-blue-600 dark:text-[#5bb4ff]" />
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">24-Hour Wind &amp; Temperature Profile</h3>
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Hourly trajectory</span>
                            </div>

                            <div className="mt-4 flex gap-3 overflow-x-auto pt-1 pb-3">
                                {weather.hourly.map((h, i) => {
                                    const isStrong = h.wind_speed_knots >= 16;
                                    return (
                                        <div
                                            key={h.date || i}
                                            className={`flex min-w-[92px] flex-col items-center rounded-2xl border p-3 text-center transition-all duration-200 ${
                                                isStrong
                                                    ? 'border-blue-300 bg-blue-50/80 text-slate-900 dark:border-[#3b82f6]/40 dark:bg-[#1f6eff]/10 dark:text-white'
                                                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300'
                                            }`}
                                        >
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{h.time}</span>
                                            <div className="my-2">{renderWeatherIcon(h.icon, 'h-6 w-6 text-blue-600 dark:text-[#5bb4ff]')}</div>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{h.temperature}°</span>

                                            <div className="mt-2 flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-transparent dark:bg-white/[0.06] dark:text-emerald-400">
                                                <Wind className="h-3 w-3 text-blue-600 dark:text-[#5bb4ff]" />
                                                <span>{h.wind_speed_knots} kts</span>
                                            </div>

                                            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                                <ArrowUp style={{ transform: `rotate(${h.wind_angle}deg)` }} className="h-2.5 w-2.5 text-slate-400" />
                                                <span>{h.wind_dir}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 7-Day Spot Outlook */}
                        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                    <CloudSun className="h-5 w-5 text-blue-600 dark:text-[#5bb4ff]" />
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">7-Day Kiting &amp; Weather Outlook</h3>
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Multi-day forecast</span>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {weather.daily.map((d, idx) => (
                                    <div
                                        key={d.day || idx}
                                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-slate-950/50 dark:hover:border-white/20 dark:hover:bg-slate-950/80"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{d.day_name}</span>
                                                <span className="block text-[11px] text-slate-500 dark:text-slate-400">{d.date_formatted}</span>
                                            </div>
                                            {renderWeatherIcon(d.icon, 'h-7 w-7 text-blue-600 dark:text-[#5bb4ff]')}
                                        </div>

                                        <p className="my-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{d.summary}</p>

                                        <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 dark:border-white/10">
                                            <div className="flex items-baseline gap-1.5 text-xs font-semibold">
                                                <span className="font-bold text-slate-900 dark:text-white">{d.temp_max}°</span>
                                                <span className="text-slate-500 dark:text-slate-400">/ {d.temp_min}°C</span>
                                            </div>

                                            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-emerald-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-emerald-400">
                                                <Wind className="h-3 w-3 text-blue-600 dark:text-[#5bb4ff]" />
                                                <span>{d.wind_speed_knots} kts</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </AppLayout>
    );
}
