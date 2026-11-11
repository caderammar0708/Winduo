import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    AlertOctagon,
    Calendar,
    ChevronRight,
    Clock,
    Download,
    FileText,
    Globe,
    History,
    Key,
    Layers,
    Lock,
    LogIn,
    LogOut,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    UserX,
    X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface AuditLogItem {
    id: number;
    user_id: number | null;
    user_name: string | null;
    user_role: string | null;
    event: string;
    auditable_type: string | null;
    auditable_id: number | null;
    description: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    url: string | null;
    method: string | null;
    created_at: string;
}

interface LoginStats {
    total_logins: number;
    total_failed: number;
    repeated_failed: Array<{
        ip_address: string;
        failed_count: number;
        last_attempt_at: string;
        last_attempted_identifier: string;
    }>;
    last_logins: Array<{
        user_id: number;
        user_name: string;
        user_role: string;
        last_login_at: string;
        ip_address: string;
    }>;
}

interface AuditLogsProps {
    logs: {
        data: AuditLogItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        tab: 'all' | 'logins';
        search: string;
        role: string;
        event: string;
        model_type: string;
        preset: string;
        date_from: string;
        date_to: string;
    };
    loginStats: LoginStats | null;
    availableEvents: string[];
    availableModels: string[];
    totalCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/dashboard' },
    { title: 'Audit Log', href: '/admin/audit-logs' },
];

export default function AuditLogs({
    logs,
    filters,
    loginStats,
    availableEvents,
    availableModels,
    totalCount,
}: AuditLogsProps) {
    const [activeTab, setActiveTab] = useState<'all' | 'logins'>(filters.tab || 'all');
    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');
    const [eventFilter, setEventFilter] = useState(filters.event || 'all');
    const [modelFilter, setModelFilter] = useState(filters.model_type || 'all');
    const [presetFilter, setPresetFilter] = useState(filters.preset || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    // Detail drawer state
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
    const [drawerTab, setDrawerTab] = useState<'diff' | 'raw'>('diff');

    const applyFilters = (overrides: Partial<typeof filters> = {}) => {
        const params = {
            tab: overrides.tab !== undefined ? overrides.tab : activeTab,
            search: overrides.search !== undefined ? overrides.search : search,
            role: overrides.role !== undefined ? overrides.role : roleFilter,
            event: overrides.event !== undefined ? overrides.event : eventFilter,
            model_type: overrides.model_type !== undefined ? overrides.model_type : modelFilter,
            preset: overrides.preset !== undefined ? overrides.preset : presetFilter,
            date_from: overrides.date_from !== undefined ? overrides.date_from : dateFrom,
            date_to: overrides.date_to !== undefined ? overrides.date_to : dateTo,
        };

        router.get('/admin/audit-logs', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const handleTabChange = (newTab: 'all' | 'logins') => {
        setActiveTab(newTab);
        applyFilters({ tab: newTab });
    };

    const handlePresetChange = (preset: string) => {
        setPresetFilter(preset);
        applyFilters({ preset });
    };

    const handleResetFilters = () => {
        setSearch('');
        setRoleFilter('all');
        setEventFilter('all');
        setModelFilter('all');
        setPresetFilter('all');
        setDateFrom('');
        setDateTo('');
        router.get('/admin/audit-logs', { tab: activeTab }, { preserveState: true, preserveScroll: true });
    };

    const handleExportCsv = () => {
        const queryParams = new URLSearchParams();
        queryParams.set('tab', activeTab);
        if (search) queryParams.set('search', search);
        if (roleFilter !== 'all') queryParams.set('role', roleFilter);
        if (eventFilter !== 'all') queryParams.set('event', eventFilter);
        if (modelFilter !== 'all') queryParams.set('model_type', modelFilter);
        if (presetFilter !== 'all') queryParams.set('preset', presetFilter);
        if (presetFilter === 'custom') {
            if (dateFrom) queryParams.set('date_from', dateFrom);
            if (dateTo) queryParams.set('date_to', dateTo);
        }

        window.location.href = `/admin/audit-logs/export?${queryParams.toString()}`;
    };

    // Helper for event badge colors & icons
    const getEventBadge = (event: string) => {
        const lower = event.toLowerCase();
        if (lower.includes('login_failed') || lower.includes('fail')) {
            return {
                bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800/40',
                icon: AlertOctagon,
                label: 'Login Failed',
            };
        }
        if (lower === 'login') {
            return {
                bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
                icon: LogIn,
                label: 'Login',
            };
        }
        if (lower === 'logout') {
            return {
                bg: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border-slate-200 dark:border-white/10',
                icon: LogOut,
                label: 'Logout',
            };
        }
        if (lower.includes('password')) {
            return {
                bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
                icon: Key,
                label: 'Password Changed',
            };
        }
        if (lower.includes('approved') || lower.includes('approve')) {
            return {
                bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
                icon: ShieldCheck,
                label: 'Approved',
            };
        }
        if (lower.includes('reject')) {
            return {
                bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800/40',
                icon: X,
                label: 'Rejected',
            };
        }
        if (lower.includes('suspend')) {
            return {
                bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800/40',
                icon: UserX,
                label: 'Suspended',
            };
        }
        if (lower.includes('reactivat')) {
            return {
                bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/40',
                icon: RefreshCw,
                label: 'Reactivated',
            };
        }
        if (lower.includes('cancel')) {
            return {
                bg: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800/40',
                icon: AlertOctagon,
                label: 'Cancelled',
            };
        }
        if (lower.includes('delete')) {
            return {
                bg: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800/40',
                icon: AlertOctagon,
                label: 'Deleted',
            };
        }
        if (lower.includes('created')) {
            return {
                bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',
                icon: Layers,
                label: 'Created',
            };
        }
        if (lower.includes('update') || lower.includes('settings')) {
            return {
                bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40',
                icon: Activity,
                label: lower.replace('_', ' '),
            };
        }

        return {
            bg: 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-300 border-slate-200 dark:border-white/10',
            icon: History,
            label: event.replace('_', ' '),
        };
    };

    // Helper for role badge colors
    const getRoleBadge = (role: string | null) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800/40';
            case 'instructor':
                return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/40';
            case 'school':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800/40';
            case 'client':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-400 border-slate-200 dark:border-white/10';
        }
    };

    // Compute diff keys for the drawer
    const diffKeys = useMemo(() => {
        if (!selectedLog) return [];
        const oldKeys = Object.keys(selectedLog.old_values || {});
        const newKeys = Object.keys(selectedLog.new_values || {});
        return Array.from(new Set([...oldKeys, ...newKeys]));
    }, [selectedLog]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Log - Winduo Admin" />

            <div className="flex-1 space-y-6 p-4 md:p-8">
                {/* Header with Title and Actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Security & Audit Log
                            </h1>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                {totalCount} Recorded Events
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Immutable, append-only trail of authentication, data modifications, and administrative actions.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleExportCsv}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-white/[0.05] dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/[0.08] transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            <span>Export CSV</span>
                        </button>

                        <button
                            onClick={() => applyFilters()}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Tabs: All Activity vs Logins & Security */}
                <div className="flex border-b border-slate-200 dark:border-white/10">
                    <button
                        onClick={() => handleTabChange('all')}
                        className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'all'
                                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <History className="h-4 w-4" />
                        <span>All Activity Trail</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('logins')}
                        className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'logins'
                                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <Lock className="h-4 w-4" />
                        <span>Authentication & Logins</span>
                        {loginStats && loginStats.repeated_failed.length > 0 && (
                            <span className="ml-1 rounded-full bg-rose-500 px-2 py-0.2 text-[10px] font-bold text-white">
                                {loginStats.repeated_failed.length} Alert{loginStats.repeated_failed.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </button>
                </div>

                {/* Logins Tab Analytics & Alerts */}
                {activeTab === 'logins' && loginStats && (
                    <div className="space-y-4">
                        {/* Brute force alert if any */}
                        {loginStats.repeated_failed.length > 0 && (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300">
                                        <ShieldAlert className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                                            Security Notice: Repeated Failed Login Attempts Detected
                                        </h3>
                                        <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
                                            The following IP addresses have registered 3 or more failed authentication attempts in the past 7 days:
                                        </p>
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {loginStats.repeated_failed.map((alert, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between rounded-xl bg-white/80 p-2.5 text-xs border border-rose-200/80 dark:bg-black/30 dark:border-rose-900/40"
                                                >
                                                    <div>
                                                        <span className="font-mono font-semibold text-rose-900 dark:text-rose-200">
                                                            {alert.ip_address}
                                                        </span>
                                                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                                            Target: {alert.last_attempted_identifier}
                                                        </span>
                                                    </div>
                                                    <span className="rounded-lg bg-rose-100 px-2 py-1 font-bold text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                                                        {alert.failed_count} fails
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Login Metric Cards */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Logins</span>
                                    <LogIn className="h-4 w-4 text-emerald-500" />
                                </div>
                                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                    {loginStats.total_logins}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Failed Attempts</span>
                                    <AlertOctagon className="h-4 w-4 text-rose-500" />
                                </div>
                                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                    {loginStats.total_failed}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Suspicious IPs</span>
                                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                                </div>
                                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                    {loginStats.repeated_failed.length}
                                </p>
                            </div>
                        </div>

                        {/* Recent Login per User */}
                        {loginStats.last_logins.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                                    Recent Active User Sign-ins
                                </h3>
                                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                                    {loginStats.last_logins.map((u) => (
                                        <div
                                            key={u.user_id}
                                            className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-white/5 dark:bg-white/[0.02]"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-slate-900 dark:text-white truncate">
                                                    {u.user_name}
                                                </span>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${getRoleBadge(u.user_role)}`}>
                                                    {u.user_role}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                                                {new Date(u.last_login_at).toLocaleString()}
                                            </span>
                                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block mt-0.5">
                                                {u.ip_address}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Filters Section */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03] space-y-4">
                    {/* Top Row: Search & Dropdowns */}
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                        {/* Search Input */}
                        <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2 md:col-span-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search action, user, IP..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:bg-transparent"
                            />
                        </form>

                        {/* Role Filter */}
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                applyFilters({ role: e.target.value });
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="instructor">Instructor</option>
                            <option value="school">School</option>
                            <option value="client">Client</option>
                            <option value="guest">Guest / Unauthenticated</option>
                        </select>

                        {/* Event Filter */}
                        <select
                            value={eventFilter}
                            onChange={(e) => {
                                setEventFilter(e.target.value);
                                applyFilters({ event: e.target.value });
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                        >
                            <option value="all">All Event Types</option>
                            {availableEvents.map((evt) => (
                                <option key={evt} value={evt}>
                                    {evt.replace('_', ' ').toUpperCase()}
                                </option>
                            ))}
                        </select>

                        {/* Model Type Filter */}
                        <select
                            value={modelFilter}
                            onChange={(e) => {
                                setModelFilter(e.target.value);
                                applyFilters({ model_type: e.target.value });
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                        >
                            <option value="all">All Models</option>
                            {availableModels.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Bottom Row: Date Presets & Custom Pickers */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" /> Date:
                            </span>
                            {[
                                { id: 'all', label: 'All Time' },
                                { id: 'today', label: 'Today' },
                                { id: '7d', label: 'Last 7 Days' },
                                { id: '30d', label: 'Last 30 Days' },
                                { id: 'custom', label: 'Custom' },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handlePresetChange(p.id)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                        presetFilter === p.id
                                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom Date Inputs */}
                        {presetFilter === 'custom' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                                />
                                <span className="text-xs text-slate-400">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => applyFilters()}
                                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                                >
                                    Apply
                                </button>
                            </div>
                        )}

                        {/* Reset Filters Link */}
                        {(search || roleFilter !== 'all' || eventFilter !== 'all' || modelFilter !== 'all' || presetFilter !== 'all') && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="text-xs text-rose-600 hover:underline dark:text-rose-400 ml-auto"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Audit Logs Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                                    <th className="px-4 py-3.5 whitespace-nowrap">Timestamp</th>
                                    <th className="px-4 py-3.5 whitespace-nowrap">User</th>
                                    <th className="px-4 py-3.5 whitespace-nowrap">Event</th>
                                    <th className="px-4 py-3.5 whitespace-nowrap">Target</th>
                                    <th className="px-4 py-3.5">Description</th>
                                    <th className="px-4 py-3.5 whitespace-nowrap">IP & Client</th>
                                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {logs.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-slate-500 dark:text-slate-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-white/5">
                                                    <History className="h-6 w-6" />
                                                </div>
                                                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                                                    No audit records found
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    Try adjusting your search filters or date range.
                                                </p>
                                                <button
                                                    onClick={handleResetFilters}
                                                    className="mt-4 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                                                >
                                                    Reset filters
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.data.map((log) => {
                                        const badge = getEventBadge(log.event);
                                        const EventIcon = badge.icon;
                                        const modelShort = log.auditable_type
                                            ? log.auditable_type.split('\\').pop()
                                            : null;

                                        return (
                                            <tr
                                                key={log.id}
                                                onClick={() => setSelectedLog(log)}
                                                className="cursor-pointer transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                                            >
                                                {/* Timestamp */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        <Clock className="h-3 w-3 text-slate-400" />
                                                        <span>{new Date(log.created_at).toLocaleString()}</span>
                                                    </div>
                                                </td>

                                                {/* User Info */}
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                                            {log.user_name ? log.user_name.charAt(0).toUpperCase() : '?'}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-slate-900 dark:text-white block">
                                                                {log.user_name || 'Guest / Unauth'}
                                                            </span>
                                                            <span className={`inline-block rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase border ${getRoleBadge(log.user_role)}`}>
                                                                {log.user_role || 'guest'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Event Badge */}
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${badge.bg}`}>
                                                        <EventIcon className="h-3 w-3" />
                                                        <span className="capitalize">{badge.label}</span>
                                                    </span>
                                                </td>

                                                {/* Model / Target */}
                                                <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                                                    {modelShort ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-white/5 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                                            {modelShort} {log.auditable_id ? `#${log.auditable_id}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>

                                                {/* Description */}
                                                <td className="max-w-md truncate px-4 py-3.5 text-slate-600 dark:text-slate-300">
                                                    {log.description || 'Action recorded'}
                                                </td>

                                                {/* IP & Method */}
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                                        {log.ip_address || '127.0.0.1'}
                                                    </div>
                                                    {log.method && (
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">
                                                            {log.method}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Detail trigger */}
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                                        <span>Inspect</span>
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logs.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-white/10">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Page <strong className="text-slate-900 dark:text-white">{logs.current_page}</strong> of{' '}
                                <strong className="text-slate-900 dark:text-white">{logs.last_page}</strong> ({logs.total} total)
                            </span>
                            <div className="flex gap-1">
                                {logs.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        disabled={!link.url}
                                        onClick={() => {
                                            if (link.url) router.get(link.url, {}, { preserveState: true, preserveScroll: true });
                                        }}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                            link.active
                                                ? 'bg-blue-600 text-white font-bold'
                                                : link.url
                                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'
                                                  : 'opacity-40 cursor-not-allowed text-slate-400'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-over Detail Drawer */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div
                        onClick={() => setSelectedLog(null)}
                        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
                    />

                    <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
                        <div className="w-screen max-w-xl bg-white shadow-2xl dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 flex flex-col">
                            {/* Drawer Header */}
                            <div className="border-b border-slate-200 p-5 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                                        <History className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                            Audit Entry #{selectedLog.id}
                                        </h2>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            Recorded {new Date(selectedLog.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {/* Event & User Summary Banner */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.02] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Event Action</span>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${getEventBadge(selectedLog.event).bg}`}>
                                            {selectedLog.event.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Actor</span>
                                        <div className="text-right">
                                            <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                                {selectedLog.user_name || 'System / Guest'}
                                            </span>
                                            <span className={`ml-2 inline-block rounded-full px-2 py-0.2 text-[9px] font-bold uppercase border ${getRoleBadge(selectedLog.user_role)}`}>
                                                {selectedLog.user_role || 'guest'}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedLog.auditable_type && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Entity</span>
                                            <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                                                {selectedLog.auditable_type.split('\\').pop()} #{selectedLog.auditable_id}
                                            </span>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                            Description
                                        </span>
                                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                                            {selectedLog.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Request Context */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/[0.02] space-y-2.5 text-xs">
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Globe className="h-4 w-4 text-blue-500" /> Request Details
                                    </h4>

                                    <div className="grid grid-cols-3 gap-1 pt-1">
                                        <span className="text-slate-500 dark:text-slate-400">IP Address:</span>
                                        <span className="col-span-2 font-mono text-slate-800 dark:text-slate-200">
                                            {selectedLog.ip_address || '127.0.0.1'}
                                        </span>
                                    </div>

                                    {selectedLog.method && (
                                        <div className="grid grid-cols-3 gap-1">
                                            <span className="text-slate-500 dark:text-slate-400">HTTP Method:</span>
                                            <span className="col-span-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                {selectedLog.method}
                                            </span>
                                        </div>
                                    )}

                                    {selectedLog.url && (
                                        <div className="grid grid-cols-3 gap-1">
                                            <span className="text-slate-500 dark:text-slate-400">URL Endpoint:</span>
                                            <span className="col-span-2 font-mono text-slate-800 dark:text-slate-200 break-all">
                                                {selectedLog.url}
                                            </span>
                                        </div>
                                    )}

                                    {selectedLog.user_agent && (
                                        <div className="grid grid-cols-3 gap-1">
                                            <span className="text-slate-500 dark:text-slate-400">User Agent:</span>
                                            <span className="col-span-2 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                                                {selectedLog.user_agent}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Values / Diff Viewer */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/[0.02] space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-white/5">
                                        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                                            <FileText className="h-4 w-4 text-indigo-500" /> Data Changes & Values
                                        </h4>
                                        <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] dark:bg-white/10">
                                            <button
                                                onClick={() => setDrawerTab('diff')}
                                                className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                                                    drawerTab === 'diff'
                                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                                }`}
                                            >
                                                Before / After Diff
                                            </button>
                                            <button
                                                onClick={() => setDrawerTab('raw')}
                                                className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                                                    drawerTab === 'raw'
                                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                                }`}
                                            >
                                                Raw JSON
                                            </button>
                                        </div>
                                    </div>

                                    {drawerTab === 'diff' ? (
                                        diffKeys.length === 0 ? (
                                            <p className="py-4 text-center text-xs text-slate-400">
                                                No structured before/after field changes recorded for this entry.
                                            </p>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {diffKeys.map((key) => {
                                                    const oldVal = selectedLog.old_values ? selectedLog.old_values[key] : undefined;
                                                    const newVal = selectedLog.new_values ? selectedLog.new_values[key] : undefined;
                                                    const isAdded = oldVal === undefined && newVal !== undefined;
                                                    const isRemoved = oldVal !== undefined && newVal === undefined;
                                                    const isModified = oldVal !== undefined && newVal !== undefined && oldVal !== newVal;

                                                    const formatVal = (v: unknown) => {
                                                        if (v === null) return 'null';
                                                        if (v === undefined) return 'undefined';
                                                        if (typeof v === 'boolean') return v ? 'true' : 'false';
                                                        if (typeof v === 'object') return JSON.stringify(v);
                                                        return String(v);
                                                    };

                                                    return (
                                                        <div
                                                            key={key}
                                                            className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-white/5 dark:bg-white/[0.02]"
                                                        >
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                                                    {key}
                                                                </span>
                                                                <span
                                                                    className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                                                                        isAdded
                                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                            : isRemoved
                                                                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                                              : isModified
                                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                                                : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                                                                    }`}
                                                                >
                                                                    {isAdded ? 'Added' : isRemoved ? 'Removed' : isModified ? 'Modified' : 'Unchanged'}
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                                                <div className="rounded-lg bg-rose-50/70 p-2 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30">
                                                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block mb-0.5">
                                                                        BEFORE
                                                                    </span>
                                                                    <span className="text-rose-900 dark:text-rose-200 break-all">
                                                                        {formatVal(oldVal)}
                                                                    </span>
                                                                </div>

                                                                <div className="rounded-lg bg-emerald-50/70 p-2 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                                                                        AFTER
                                                                    </span>
                                                                    <span className="text-emerald-900 dark:text-emerald-200 break-all">
                                                                        {formatVal(newVal)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    ) : (
                                        <div className="space-y-3 text-xs font-mono">
                                            {selectedLog.old_values && (
                                                <div>
                                                    <span className="text-slate-400 font-bold block mb-1">OLD VALUES:</span>
                                                    <pre className="rounded-xl bg-slate-900 p-3 text-[11px] text-slate-200 overflow-x-auto">
                                                        {JSON.stringify(selectedLog.old_values, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {selectedLog.new_values && (
                                                <div>
                                                    <span className="text-slate-400 font-bold block mb-1">NEW VALUES:</span>
                                                    <pre className="rounded-xl bg-slate-900 p-3 text-[11px] text-slate-200 overflow-x-auto">
                                                        {JSON.stringify(selectedLog.new_values, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
