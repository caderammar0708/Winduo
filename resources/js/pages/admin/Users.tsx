import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Mail,
    MessageSquare,
    Pencil,
    Phone,
    Plus,
    Power,
    Search,
    Send,
    Shield,
    ShieldCheck,
    Trash2,
    UserCog,
    Users as UsersIcon,
    X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

type UserRole = 'admin' | 'instructor' | 'school' | 'client';

interface ManagedUser {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    role: UserRole;
    is_suspended: boolean;
    profile_picture?: string | null;
    created_at: string;
    bookings_count: number;
    instructor?: {
        id: number;
        status: string;
        license_number?: string | null;
        location?: string | null;
    } | null;
    school?: {
        id: number;
        name: string;
        status: string;
        location?: string | null;
    } | null;
}

interface DirectMessage {
    id: number;
    conversation_id: number;
    sender_id: number;
    body: string;
    read_at?: string | null;
    created_at: string;
    sender?: {
        id: number;
        name: string;
        role?: string;
        profile_picture?: string | null;
    } | null;
}

interface UsersProps {
    users: {
        data: ManagedUser[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    initialMessageUser?: ManagedUser | null;
    filters: {
        search: string;
        role: string;
        status: string;
    };
    counts: {
        total: number;
        active: number;
        inactive: number;
        admins: number;
        instructors: number;
        schools: number;
        clients: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/dashboard' },
    { title: 'User Management', href: '/admin/users' },
];

const ROLE_META: Record<
    UserRole,
    { label: string; description: string; badgeClass: string; avatarClass: string }
> = {
    admin: {
        label: 'Admin',
        description: 'Full platform control, approvals, settings, and user management.',
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
        avatarClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    },
    instructor: {
        label: 'Instructor',
        description: 'Manage teaching profile, availability, bookings, and earnings.',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        avatarClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
    school: {
        label: 'School',
        description: 'Manage kite center profile, instructor roster, and lesson packages.',
        badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
        avatarClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    },
    client: {
        label: 'Client',
        description: 'Browse instructors & schools, book lessons, and message coaches.',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        avatarClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
};

const ROLE_OPTIONS: UserRole[] = ['client', 'instructor', 'school', 'admin'];

function getCsrfHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };

    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    if (metaTag?.content) {
        headers['X-CSRF-TOKEN'] = metaTag.content;
    }

    const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]+)'));
    if (match) {
        headers['X-XSRF-TOKEN'] = decodeURIComponent(match[2]);
    }

    return headers;
}

export default function UsersManagement({ users, initialMessageUser, filters, counts }: UsersProps) {
    const { auth, flash } = usePage<SharedData>().props;
    const currentAdminId = auth?.user?.id;

    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [dismissedFlash, setDismissedFlash] = useState(false);

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
    const [roleModalUser, setRoleModalUser] = useState<ManagedUser | null>(null);
    const [statusModalUser, setStatusModalUser] = useState<ManagedUser | null>(null);
    const [deleteModalUser, setDeleteModalUser] = useState<ManagedUser | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Direct message modal state
    const [messageUser, setMessageUser] = useState<ManagedUser | null>(initialMessageUser ?? null);
    const [threadMessages, setThreadMessages] = useState<DirectMessage[]>([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const [messageBody, setMessageBody] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [messageError, setMessageError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setDismissedFlash(false);
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        if (!messageUser) {
            return;
        }

        let cancelled = false;
        setLoadingThread(true);
        setMessageError(null);

        fetch(`/admin/users/${messageUser.id}/messages`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('Failed to load messages');
                }
                return res.json();
            })
            .then((data) => {
                if (!cancelled) {
                    setThreadMessages(Array.isArray(data.messages) ? data.messages : []);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setMessageError('Unable to load previous messages.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingThread(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [messageUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [threadMessages]);

    // Forms
    const createForm = useForm({
        name: '',
        email: '',
        phone: '',
        role: 'client' as UserRole,
        password: '',
        password_confirmation: '',
        is_active: true as boolean,
        school_name: '',
        license_number: '',
        location: '',
    });

    const editForm = useForm({
        name: '',
        email: '',
        phone: '',
        role: 'client' as UserRole,
        password: '',
        password_confirmation: '',
        is_active: true as boolean,
        school_name: '',
        license_number: '',
        location: '',
    });

    const roleForm = useForm({
        role: 'client' as UserRole,
    });

    const applyFilter = (overrides?: { status?: string; role?: string; search?: string }) => {
        router.get(
            '/admin/users',
            {
                status: overrides?.status ?? statusFilter,
                role: overrides?.role ?? roleFilter,
                search: overrides?.search ?? search,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter({ search });
    };

    const openCreateModal = () => {
        createForm.reset();
        createForm.clearErrors();
        setShowCreateModal(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/users', {
            preserveScroll: true,
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
        });
    };

    const openEditModal = (user: ManagedUser) => {
        editForm.setData({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            password: '',
            password_confirmation: '',
            is_active: !user.is_suspended,
            school_name: user.school?.name || '',
            license_number: user.instructor?.license_number || '',
            location: user.school?.location || user.instructor?.location || '',
        });
        editForm.clearErrors();
        setEditingUser(user);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) {
            return;
        }
        editForm.put(`/admin/users/${editingUser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingUser(null);
            },
        });
    };

    const openRoleModal = (user: ManagedUser) => {
        roleForm.setData('role', user.role);
        roleForm.clearErrors();
        setRoleModalUser(user);
    };

    const handleRoleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleModalUser) {
            return;
        }
        roleForm.patch(`/admin/users/${roleModalUser.id}/role`, {
            preserveScroll: true,
            onSuccess: () => {
                setRoleModalUser(null);
            },
        });
    };

    const confirmToggleStatus = () => {
        if (!statusModalUser) {
            return;
        }
        setIsTogglingStatus(true);
        router.post(
            `/admin/users/${statusModalUser.id}/toggle-status`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsTogglingStatus(false);
                    setStatusModalUser(null);
                },
            },
        );
    };

    const confirmDelete = () => {
        if (!deleteModalUser) {
            return;
        }
        setIsDeleting(true);
        router.delete(`/admin/users/${deleteModalUser.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setDeleteModalUser(null);
            },
        });
    };

    const handleSendDirectMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageUser || sendingMessage) {
            return;
        }
        const trimmed = messageBody.trim();
        if (!trimmed) {
            setMessageError('Please enter a message before sending.');
            return;
        }

        setSendingMessage(true);
        setMessageError(null);

        try {
            const res = await fetch(`/admin/users/${messageUser.id}/message`, {
                method: 'POST',
                headers: getCsrfHeaders(),
                body: JSON.stringify({ body: trimmed }),
            });

            const data = await res.json();
            if (!res.ok) {
                setMessageError(data?.message || 'Could not send message.');
                return;
            }

            if (data?.message) {
                setThreadMessages((prev) => [...prev, data.message]);
            }
            setMessageBody('');
            window.dispatchEvent(new CustomEvent('winduo:refresh-notifications'));
        } catch {
            setMessageError('Network error while sending message.');
        } finally {
            setSendingMessage(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management - Winduo Admin" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 text-slate-900 transition-colors duration-200 sm:p-6 lg:p-8 dark:text-slate-100">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                            <Shield className="h-3.5 w-3.5" />
                            Admin Only Controls
                        </div>
                        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                            User Management
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                            Create accounts, edit profiles, assign roles, activate or inactivate access, delete users, and send direct in-app messages.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none sm:text-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Create User
                    </button>
                </div>

                {/* Flash Feedback Banner */}
                {!dismissedFlash && (flash?.success || flash?.error) && (
                    <div
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold sm:text-sm ${
                            flash?.error
                                ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {flash?.error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                            <span>{flash?.error || flash?.success}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDismissedFlash(true)}
                            className="rounded-lg p-1 opacity-70 transition hover:opacity-100"
                            aria-label="Dismiss alert"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                        { label: 'Total Users', value: counts.total, filterRole: 'all', filterStatus: 'all', accent: 'text-slate-900 dark:text-white' },
                        { label: 'Active', value: counts.active, filterRole: 'all', filterStatus: 'active', accent: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Inactive', value: counts.inactive, filterRole: 'all', filterStatus: 'inactive', accent: 'text-rose-600 dark:text-rose-400' },
                        { label: 'Admins', value: counts.admins, filterRole: 'admin', filterStatus: 'all', accent: 'text-rose-600 dark:text-rose-300' },
                        { label: 'Instructors', value: counts.instructors, filterRole: 'instructor', filterStatus: 'all', accent: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Schools & Clients', value: counts.schools + counts.clients, filterRole: 'client', filterStatus: 'all', accent: 'text-purple-600 dark:text-purple-400' },
                    ].map((stat) => (
                        <button
                            key={stat.label}
                            type="button"
                            onClick={() => {
                                setRoleFilter(stat.filterRole);
                                setStatusFilter(stat.filterStatus);
                                applyFilter({ role: stat.filterRole, status: stat.filterStatus });
                            }}
                            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left shadow-sm transition hover:border-blue-300 dark:border-white/10 dark:bg-[#0c1220] dark:hover:border-blue-500/40"
                        >
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{stat.label}</p>
                            <p className={`mt-1 text-xl font-extrabold ${stat.accent}`}>{stat.value}</p>
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center dark:border-white/10 dark:bg-[#0c1220]">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Filter Pills */}
                        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                            {(['all', 'active', 'inactive'] as const).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter(s);
                                        applyFilter({ status: s });
                                    }}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                                        statusFilter === s
                                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Role Filter Pills */}
                        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                            {(['all', ...ROLE_OPTIONS] as const).map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => {
                                        setRoleFilter(r);
                                        applyFilter({ role: r });
                                    }}
                                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition ${
                                        roleFilter === r
                                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    {r === 'all' ? 'All Roles' : r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSearchSubmit} className="relative min-w-[260px]">
                        <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, email, or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-8 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    applyFilter({ search: '' });
                                }}
                                className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                aria-label="Clear search"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </form>
                </div>

                {/* Users Table */}
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0c1220]">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400">
                                    <th className="px-4 py-3.5">User</th>
                                    <th className="px-4 py-3.5">Role</th>
                                    <th className="px-4 py-3.5">Status</th>
                                    <th className="px-4 py-3.5">Joined</th>
                                    <th className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs dark:divide-white/5">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-500">
                                            <UsersIcon className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                                            <p className="font-semibold text-slate-700 dark:text-slate-300">No users matched your filters</p>
                                            <p className="mt-1 text-xs text-slate-400">Try clearing the search or role filter, or create a new user.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((u) => {
                                        const isSelf = u.id === currentAdminId;
                                        const meta = ROLE_META[u.role] ?? ROLE_META.client;

                                        return (
                                            <tr key={u.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        {u.profile_picture ? (
                                                            <img
                                                                src={u.profile_picture}
                                                                alt={u.name}
                                                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div
                                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${meta.avatarClass}`}
                                                            >
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="truncate font-bold text-slate-900 dark:text-white">{u.name}</p>
                                                                {isSelf && (
                                                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                                <Mail className="h-3 w-3 shrink-0" />
                                                                {u.email}
                                                            </p>
                                                            {u.phone && (
                                                                <p className="flex items-center gap-1 truncate text-[11px] text-slate-400 dark:text-slate-500">
                                                                    <Phone className="h-3 w-3 shrink-0" />
                                                                    {u.phone}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3.5">
                                                    <button
                                                        type="button"
                                                        disabled={isSelf}
                                                        onClick={() => openRoleModal(u)}
                                                        title={isSelf ? 'Cannot change your own role' : 'Click to assign role'}
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${meta.badgeClass} ${
                                                            isSelf ? 'cursor-default opacity-80' : 'cursor-pointer hover:ring-2 hover:ring-blue-500/30'
                                                        }`}
                                                    >
                                                        <ShieldCheck className="h-3 w-3" />
                                                        {meta.label}
                                                    </button>
                                                </td>

                                                <td className="px-4 py-3.5">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                            !u.is_suspended
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${
                                                                !u.is_suspended ? 'bg-emerald-500' : 'bg-rose-500'
                                                            }`}
                                                        />
                                                        {u.is_suspended ? 'Inactive' : 'Active'}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>

                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={isSelf}
                                                            onClick={() => setMessageUser(u)}
                                                            className="rounded-lg p-1.5 text-sky-600 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-sky-400 dark:hover:bg-sky-950/40"
                                                            title={isSelf ? 'Cannot message yourself' : 'Direct Message User'}
                                                        >
                                                            <MessageSquare className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={isSelf}
                                                            onClick={() => openRoleModal(u)}
                                                            className="rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                                                            title="Assign Role"
                                                        >
                                                            <UserCog className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(u)}
                                                            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                                                            title="Edit User"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={isSelf}
                                                            onClick={() => setStatusModalUser(u)}
                                                            className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-30 ${
                                                                u.is_suspended
                                                                    ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
                                                                    : 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30'
                                                            }`}
                                                            title={u.is_suspended ? 'Activate User' : 'Inactivate User'}
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={isSelf}
                                                            onClick={() => setDeleteModalUser(u)}
                                                            className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 p-4 sm:flex-row dark:border-white/5">
                            <span className="text-xs text-slate-500">
                                Showing page {users.current_page} of {users.last_page} ({users.total} total users)
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                                {users.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                                            link.active
                                                ? 'bg-blue-600 text-white'
                                                : link.url
                                                  ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                                                  : 'text-slate-400 opacity-40'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0c1220]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Create New User</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Add a user and assign their role and status.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.data.name}
                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                        placeholder="Alex Mercer"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                    {createForm.errors.name && <p className="mt-1 text-rose-500">{createForm.errors.name}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={createForm.data.email}
                                        onChange={(e) => createForm.setData('email', e.target.value)}
                                        placeholder="alex@winduo.com"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                    {createForm.errors.email && <p className="mt-1 text-rose-500">{createForm.errors.email}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                                    <input
                                        type="text"
                                        value={createForm.data.phone}
                                        onChange={(e) => createForm.setData('phone', e.target.value)}
                                        placeholder="+1 555 010 9988"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                    {createForm.errors.phone && <p className="mt-1 text-rose-500">{createForm.errors.phone}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Role *</label>
                                    <select
                                        value={createForm.data.role}
                                        onChange={(e) => createForm.setData('role', e.target.value as UserRole)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-[#0f172a] dark:text-white"
                                    >
                                        {ROLE_OPTIONS.map((r) => (
                                            <option key={r} value={r}>
                                                {ROLE_META[r].label}
                                            </option>
                                        ))}
                                    </select>
                                    {createForm.errors.role && <p className="mt-1 text-rose-500">{createForm.errors.role}</p>}
                                </div>
                            </div>

                            {createForm.data.role === 'school' && (
                                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-purple-200/70 bg-purple-50/40 p-3 sm:grid-cols-2 dark:border-purple-500/20 dark:bg-purple-950/15">
                                    <div>
                                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">School / Center Name</label>
                                        <input
                                            type="text"
                                            value={createForm.data.school_name}
                                            onChange={(e) => createForm.setData('school_name', e.target.value)}
                                            placeholder="Tarifa Wind Center"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Location</label>
                                        <input
                                            type="text"
                                            value={createForm.data.location}
                                            onChange={(e) => createForm.setData('location', e.target.value)}
                                            placeholder="Tarifa, Spain"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {createForm.data.role === 'instructor' && (
                                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-blue-200/70 bg-blue-50/40 p-3 sm:grid-cols-2 dark:border-blue-500/20 dark:bg-blue-950/15">
                                    <div>
                                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">License Number</label>
                                        <input
                                            type="text"
                                            value={createForm.data.license_number}
                                            onChange={(e) => createForm.setData('license_number', e.target.value)}
                                            placeholder="IKO-L2-4920"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Location</label>
                                        <input
                                            type="text"
                                            value={createForm.data.location}
                                            onChange={(e) => createForm.setData('location', e.target.value)}
                                            placeholder="Cabarete, DR"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        value={createForm.data.password}
                                        onChange={(e) => createForm.setData('password', e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                    {createForm.errors.password && <p className="mt-1 text-rose-500">{createForm.errors.password}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Confirm Password *</label>
                                    <input
                                        type="password"
                                        required
                                        value={createForm.data.password_confirmation}
                                        onChange={(e) => createForm.setData('password_confirmation', e.target.value)}
                                        placeholder="Repeat password"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                </div>
                            </div>

                            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">Account Active</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Inactive users cannot sign in until activated by an admin.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={createForm.data.is_active}
                                    onChange={(e) => createForm.setData('is_active', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </label>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createForm.processing}
                                    className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {createForm.processing ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0c1220]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit User: {editingUser.name}</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Update user details, role, status, or reset password.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                    {editForm.errors.name && <p className="mt-1 text-rose-500">{editForm.errors.name}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={editForm.data.email}
                                        onChange={(e) => editForm.setData('email', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                    {editForm.errors.email && <p className="mt-1 text-rose-500">{editForm.errors.email}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                                    <input
                                        type="text"
                                        value={editForm.data.phone}
                                        onChange={(e) => editForm.setData('phone', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                    {editForm.errors.phone && <p className="mt-1 text-rose-500">{editForm.errors.phone}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Role *</label>
                                    <select
                                        value={editForm.data.role}
                                        disabled={editingUser.id === currentAdminId}
                                        onChange={(e) => editForm.setData('role', e.target.value as UserRole)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none disabled:opacity-60 dark:border-white/10 dark:bg-[#0f172a] dark:text-white"
                                    >
                                        {ROLE_OPTIONS.map((r) => (
                                            <option key={r} value={r}>
                                                {ROLE_META[r].label}
                                            </option>
                                        ))}
                                    </select>
                                    {editForm.errors.role && <p className="mt-1 text-rose-500">{editForm.errors.role}</p>}
                                </div>
                            </div>

                            {editForm.data.role === 'school' && (
                                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-purple-200/70 bg-purple-50/40 p-3 sm:grid-cols-2 dark:border-purple-500/20 dark:bg-purple-950/15">
                                    <div>
                                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">School / Center Name</label>
                                        <input
                                            type="text"
                                            value={editForm.data.school_name}
                                            onChange={(e) => editForm.setData('school_name', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Location</label>
                                        <input
                                            type="text"
                                            value={editForm.data.location}
                                            onChange={(e) => editForm.setData('location', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {editForm.data.role === 'instructor' && (
                                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-blue-200/70 bg-blue-50/40 p-3 sm:grid-cols-2 dark:border-blue-500/20 dark:bg-blue-950/15">
                                    <div>
                                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">License Number</label>
                                        <input
                                            type="text"
                                            value={editForm.data.license_number}
                                            onChange={(e) => editForm.setData('license_number', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Location</label>
                                        <input
                                            type="text"
                                            value={editForm.data.location}
                                            onChange={(e) => editForm.setData('location', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                                        New Password <span className="font-normal text-slate-400">(optional)</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={editForm.data.password}
                                        onChange={(e) => editForm.setData('password', e.target.value)}
                                        placeholder="Leave blank to keep current"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                    {editForm.errors.password && <p className="mt-1 text-rose-500">{editForm.errors.password}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={editForm.data.password_confirmation}
                                        onChange={(e) => editForm.setData('password_confirmation', e.target.value)}
                                        placeholder="Repeat new password"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                </div>
                            </div>

                            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">Account Active</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {editingUser.id === currentAdminId
                                            ? 'Your own admin account must remain active.'
                                            : 'Uncheck to inactivate this user account.'}
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    disabled={editingUser.id === currentAdminId}
                                    checked={editForm.data.is_active}
                                    onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </label>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {editForm.processing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Assign Role Modal */}
            {roleModalUser && (
                <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0c1220]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Assign Role</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Select a role for <span className="font-semibold text-slate-700 dark:text-slate-200">{roleModalUser.name}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRoleModalUser(null)}
                                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleRoleSubmit} className="mt-4 space-y-2.5 text-xs">
                            {ROLE_OPTIONS.map((r) => {
                                const meta = ROLE_META[r];
                                const selected = roleForm.data.role === r;
                                return (
                                    <label
                                        key={r}
                                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                                            selected
                                                ? 'border-blue-500 bg-blue-50/70 dark:border-blue-500/60 dark:bg-blue-950/30'
                                                : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value={r}
                                            checked={selected}
                                            onChange={() => roleForm.setData('role', r)}
                                            className="mt-0.5 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}>
                                                {meta.label}
                                            </span>
                                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{meta.description}</p>
                                        </div>
                                    </label>
                                );
                            })}

                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setRoleModalUser(null)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={roleForm.processing}
                                    className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {roleForm.processing ? 'Updating...' : 'Assign Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Activate / Inactivate Confirmation Modal */}
            {statusModalUser && (
                <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0c1220]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {statusModalUser.is_suspended ? 'Activate User Account' : 'Inactivate User Account'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setStatusModalUser(null)}
                                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="mt-4 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
                            {statusModalUser.is_suspended
                                ? `Are you sure you want to activate ${statusModalUser.name} (${statusModalUser.email})? They will regain access to the platform.`
                                : `Are you sure you want to inactivate ${statusModalUser.name} (${statusModalUser.email})? They will be signed out and blocked from logging in until reactivated.`}
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setStatusModalUser(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isTogglingStatus}
                                onClick={confirmToggleStatus}
                                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50 ${
                                    statusModalUser.is_suspended ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                {isTogglingStatus
                                    ? 'Processing...'
                                    : statusModalUser.is_suspended
                                      ? 'Confirm Activate'
                                      : 'Confirm Inactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalUser && (
                <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0c1220]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
                            <h2 className="text-base font-bold text-rose-600 dark:text-rose-400">Delete User Account</h2>
                            <button
                                type="button"
                                onClick={() => setDeleteModalUser(null)}
                                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="mt-4 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
                            Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{deleteModalUser.name}</span> (
                            {deleteModalUser.email})? This action soft-deletes the user account and disables linked profiles.
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteModalUser(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={confirmDelete}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Direct Message Modal */}
            {messageUser && (
                <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="flex h-[540px] max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0c1220]">
                        {/* Modal Header */}
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-4 sm:px-6 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                                        (ROLE_META[messageUser.role] ?? ROLE_META.client).avatarClass
                                    }`}
                                >
                                    {messageUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{messageUser.name}</h2>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                (ROLE_META[messageUser.role] ?? ROLE_META.client).badgeClass
                                            }`}
                                        >
                                            {(ROLE_META[messageUser.role] ?? ROLE_META.client).label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Direct in-app message &bull; {messageUser.email}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setMessageUser(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Message History */}
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-5 dark:bg-slate-950/30">
                            {loadingThread ? (
                                <div className="space-y-3">
                                    <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                                    <div className="ml-auto h-12 w-1/2 animate-pulse rounded-2xl bg-blue-200/70 dark:bg-blue-500/20" />
                                </div>
                            ) : threadMessages.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-500">
                                    <MessageSquare className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">No messages yet</p>
                                    <p className="mt-1 max-w-xs text-[11px] text-slate-400">
                                        Send a direct message below. {messageUser.name} will receive an instant in-app notification and can reply directly.
                                    </p>
                                </div>
                            ) : (
                                threadMessages.map((m) => {
                                    const isMine = m.sender_id === currentAdminId;
                                    return (
                                        <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                            <div
                                                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                                                    isMine
                                                        ? 'rounded-br-sm bg-blue-600 text-white'
                                                        : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200'
                                                }`}
                                            >
                                                <p className="whitespace-pre-line">{m.body}</p>
                                            </div>
                                            <span className="mt-1 px-1 text-[10px] text-slate-400">
                                                {isMine ? 'You' : m.sender?.name || messageUser.name} &bull;{' '}
                                                {new Date(m.created_at).toLocaleString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Compose Form */}
                        <form
                            onSubmit={handleSendDirectMessage}
                            className="shrink-0 border-t border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-[#0c1220]"
                        >
                            {messageError && <p className="mb-2 text-xs font-medium text-rose-500">{messageError}</p>}
                            <div className="flex items-end gap-2">
                                <textarea
                                    rows={2}
                                    value={messageBody}
                                    onChange={(e) => setMessageBody(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendDirectMessage(e);
                                        }
                                    }}
                                    placeholder={`Write a direct message to ${messageUser.name}...`}
                                    className="min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={sendingMessage || !messageBody.trim()}
                                    className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    {sendingMessage ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
