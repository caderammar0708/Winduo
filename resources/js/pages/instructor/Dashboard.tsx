import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Award,
    Briefcase,
    Calendar,
    CalendarCheck,
    CheckCircle2,
    Clock,
    Compass,
    DollarSign,
    GraduationCap,
    MapPin,
    MessageSquare,
    PlusCircle,
    Sparkles,
    Star,
    TrendingUp,
    User,
    Wind,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface Client {
    id: number;
    name: string;
    email: string;
    profile_picture?: string;
}

interface Booking {
    id: number;
    student_id?: number;
    student?: Client;
    date: string;
    time?: string;
    lesson_type?: string;
    status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | string;
    total_price?: number;
    price?: number;
    location?: string;
    notes?: string;
}

interface Stats {
    upcoming?: number;
    pending_requests?: number;
    students_taught?: number;
    average_rating?: number;
    total_bookings?: number;
    completed?: number;
    total_earnings?: number;
    monthly_revenue?: number;
    profile_completion?: number;
    hire_requests_count?: number;
}

interface InstructorData {
    id: number;
    bio?: string;
    experience_years?: number;
    location?: string;
    certifications?: string;
    hourly_rate?: number;
    daily_rate?: number;
    profile_photo?: string;
    is_freelance?: boolean;
    is_active?: boolean;
    school?: { name: string };
    user?: { name: string; email: string; profile_picture?: string };
}

interface DashboardProps {
    instructor?: InstructorData;
    bookings?: Booking[];
    stats?: Stats;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Instructor Dashboard',
        href: '/instructor/dashboard',
    },
];

export default function Dashboard({ instructor, bookings = [], stats }: DashboardProps) {
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const instructorName = instructor?.user?.name ?? 'Instructor';
    const instructorLocation = instructor?.location || 'Kalpitiya, Sri Lanka';
    const certifications = instructor?.certifications || 'IKO Certified';

    const upcomingCount = stats?.upcoming ?? bookings.filter((b) => b.status === 'confirmed').length;
    const pendingCount = stats?.pending_requests ?? bookings.filter((b) => b.status === 'pending').length;
    const monthlyRev = stats?.monthly_revenue ?? 0;
    const avgRating = stats?.average_rating ?? 4.9;
    const profileProgress = stats?.profile_completion ?? 80;

    const handleAcceptBooking = (id: number) => {
        setActionLoading(id);
        router.post(
            route('instructor.bookings.accept', id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setActionLoading(null),
            },
        );
    };

    const handleDeclineBooking = (id: number) => {
        setActionLoading(id);
        router.post(
            route('instructor.bookings.decline', id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setActionLoading(null),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Instructor Dashboard - Winduo" />

            <div className="relative min-h-full space-y-6 p-4 text-slate-800 selection:bg-blue-600/30 selection:text-blue-900 sm:p-6 lg:p-8 dark:text-slate-100 dark:selection:bg-[#3b82f6]/30 dark:selection:text-white">
                {/* Hero / Greeting Glass Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 p-6 shadow-sm dark:border-white/10 dark:bg-gradient-to-r dark:from-blue-950/40 dark:via-slate-900/60 dark:to-slate-950/70 dark:shadow-2xl dark:backdrop-blur-xl">
                    <div className="pointer-events-none absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-[#3b82f6]/10" />

                    <div className="relative z-1 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                        <div className="flex items-center gap-4">
                            <div className="group relative">
                                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-blue-400/40 bg-white shadow-[0_0_20px_rgba(59,130,246,0.15)] sm:h-20 sm:w-20 dark:border-[#5bb4ff]/40 dark:bg-slate-900 dark:shadow-[0_0_20px_rgba(91,180,255,0.25)]">
                                    {instructor?.profile_photo || instructor?.user?.profile_picture ? (
                                        <img
                                            src={instructor.profile_photo || instructor.user?.profile_picture}
                                            alt={instructorName}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent dark:from-[#b8e6ff] dark:to-[#4da6ff]">
                                            {instructorName.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <div
                                    className={`absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white dark:border-[#070b12] ${
                                        instructor?.is_active !== false ? 'bg-emerald-500' : 'bg-slate-500'
                                    }`}
                                    title={instructor?.is_active !== false ? 'Online & Available' : 'Paused'}
                                />
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                                        Welcome back, {instructorName}!
                                    </h1>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-[#5bb4ff]/30 dark:bg-[#5bb4ff]/15 dark:text-[#8acbff]">
                                        <Sparkles className="h-3 w-3" />
                                        {certifications}
                                    </span>
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                        <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-[#5bb4ff]" />
                                        {instructorLocation}
                                    </span>
                                    <span>•</span>
                                    <span>{instructor?.is_freelance ? 'Freelance Coach' : instructor?.school?.name || 'School Partner'}</span>
                                    {instructor?.hourly_rate && (
                                        <>
                                            <span>•</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">${instructor.hourly_rate}/hr</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href="/instructor/availability"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 sm:text-sm dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12] dark:hover:text-white"
                            >
                                <Calendar className="h-4 w-4 text-blue-600 dark:text-[#5bb4ff]" />
                                Set Calendar
                            </Link>
                            <Link
                                href="/instructor/profile"
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] sm:text-sm dark:from-[#4ba9ff] dark:to-[#1f6eff] dark:shadow-blue-600/30"
                            >
                                <User className="h-4 w-4" />
                                Edit Profile
                            </Link>
                        </div>
                    </div>

                    {/* Profile Completion Bar */}
                    <div className="mt-6 border-t border-slate-200/80 pt-4 dark:border-white/10">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <Award className="h-4 w-4 text-blue-600 dark:text-[#5bb4ff]" />
                                Profile Completion
                            </span>
                            <span className="font-bold text-blue-600 dark:text-[#8acbff]">{profileProgress}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/80">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-sky-500 transition-all duration-500"
                                style={{ width: `${profileProgress}%` }}
                            />
                        </div>
                        {profileProgress < 100 && (
                            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                Tip: Add languages, daily rates, and certification docs in{' '}
                                <Link href="/instructor/profile" className="text-blue-600 underline dark:text-[#5bb4ff]">
                                    My Profile
                                </Link>{' '}
                                to reach 100% and get more student inquiries.
                            </p>
                        )}
                    </div>
                </div>

                {/* Hire Request Alert Banner (if any pending) */}
                {Boolean(stats?.hire_requests_count && stats.hire_requests_count > 0) && (
                    <div className="flex items-center justify-between rounded-2xl border border-sky-300 bg-sky-50 p-4 shadow-sm dark:border-sky-500/30 dark:bg-sky-950/30 dark:shadow-lg dark:backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-[#38bdf8]">
                                <Briefcase className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    You have {stats?.hire_requests_count} new School Hire Request{(stats?.hire_requests_count ?? 0) > 1 ? 's' : ''}!
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    A partner kite center sent you a teaching contract offer.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/instructor/hire-requests"
                            className="shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
                        >
                            Review Offers
                        </Link>
                    </div>
                )}

                {/* 5 Core Summary Widgets */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5">
                    {/* 1. Monthly Revenue */}
                    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:border-emerald-300 hover:bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-xl dark:backdrop-blur-xl dark:hover:border-emerald-400/40 dark:hover:bg-white/[0.08]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Monthly Revenue</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-400">
                                <DollarSign className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">${monthlyRev}</span>
                            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="h-3 w-3" />
                                This month earnings
                            </p>
                        </div>
                    </div>

                    {/* 2. Upcoming Lessons */}
                    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:border-blue-300 hover:bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-xl dark:backdrop-blur-xl dark:hover:border-[#5bb4ff]/40 dark:hover:bg-white/[0.08]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                Upcoming Lessons
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 transition-transform group-hover:scale-110 dark:border-[#3b82f6]/30 dark:bg-[#3b82f6]/15 dark:text-[#5bb4ff]">
                                <CalendarCheck className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{upcomingCount}</span>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Confirmed sessions</p>
                        </div>
                    </div>

                    {/* 3. Pending Requests */}
                    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:border-amber-300 hover:bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-xl dark:backdrop-blur-xl dark:hover:border-amber-400/40 dark:hover:bg-white/[0.08]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                Pending Requests
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-amber-600 transition-transform group-hover:scale-110 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-400">
                                <Clock className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{pendingCount}</span>
                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                {pendingCount > 0 ? 'Action required' : 'All responded'}
                            </p>
                        </div>
                    </div>

                    {/* 4. Average Rating */}
                    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:border-amber-300 hover:bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-xl dark:backdrop-blur-xl dark:hover:border-amber-400/40 dark:hover:bg-white/[0.08]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Avg Rating</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-amber-600 transition-transform group-hover:scale-110 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-400">
                                <Star className="h-5 w-5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{avgRating}</span>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">From student reviews</p>
                        </div>
                    </div>

                    {/* 5. Total Students */}
                    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:border-sky-300 hover:bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-xl dark:backdrop-blur-xl dark:hover:border-[#38bdf8]/40 dark:hover:bg-white/[0.08]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Students Taught</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300 bg-sky-50 text-sky-600 transition-transform group-hover:scale-110 dark:border-[#38bdf8]/30 dark:bg-[#38bdf8]/15 dark:text-[#38bdf8]">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                                {stats?.students_taught ?? stats?.completed ?? 0}
                            </span>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Unique riders trained</p>
                        </div>
                    </div>
                </div>

                {/* Quick Action Navigation Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    <Link
                        href="/instructor/bookings?tab=pending"
                        className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-blue-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-[#5bb4ff]/40 dark:hover:bg-white/[0.08]"
                    >
                        <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-[#5bb4ff]" />
                        <div className="text-left">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Bookings Hub</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage all sessions</p>
                        </div>
                    </Link>

                    <Link
                        href="/instructor/revenue"
                        className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-emerald-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-emerald-400/40 dark:hover:bg-white/[0.08]"
                    >
                        <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <div className="text-left">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Earnings & Payouts</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Invoices & banking</p>
                        </div>
                    </Link>

                    <Link
                        href="/instructor/messages"
                        className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-sky-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-[#38bdf8]/40 dark:hover:bg-white/[0.08]"
                    >
                        <MessageSquare className="h-5 w-5 text-sky-600 dark:text-[#38bdf8]" />
                        <div className="text-left">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Inbox & Chat</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Clients & schools</p>
                        </div>
                    </Link>

                    <Link
                        href="/instructor/browse"
                        className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-indigo-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-400/40 dark:hover:bg-white/[0.08]"
                    >
                        <Compass className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <div className="text-left">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Coach Network</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Browse instructors</p>
                        </div>
                    </Link>
                </div>

                {/* Recent Bookings Section */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-2xl dark:backdrop-blur-xl">
                    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                                <Calendar className="h-5 w-5 text-blue-600 dark:text-[#5bb4ff]" />
                                Recent Booking Inquiries
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                                Review new incoming requests or track upcoming confirmed lessons
                            </p>
                        </div>

                        <Link
                            href="/instructor/bookings"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-[#5bb4ff] dark:hover:text-[#8acbff]"
                        >
                            View All Bookings ({bookings.length}) →
                        </Link>
                    </div>

                    {bookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-12 text-center sm:py-16 dark:border-white/10 dark:bg-slate-950/20">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 shadow-md dark:border-[#5bb4ff]/30 dark:bg-gradient-to-br dark:from-[#1f6eff]/20 dark:to-[#5bb4ff]/10 dark:text-[#5bb4ff]">
                                <Wind className="h-7 w-7 animate-pulse" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Bookings Yet</h3>
                            <p className="mt-1 mb-5 max-w-md text-xs text-slate-500 dark:text-slate-400">
                                Once riders book sessions from your profile, you will receive real-time notifications and manage them right here.
                            </p>
                            <Link
                                href="/instructor/availability"
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110 dark:from-[#4ba9ff] dark:to-[#1f6eff]"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Set Your Open Dates
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:border-white/10 dark:text-slate-400">
                                        <th className="px-3 pb-3">Student</th>
                                        <th className="px-3 pb-3">Date & Time</th>
                                        <th className="px-3 pb-3">Lesson Type</th>
                                        <th className="px-3 pb-3">Price</th>
                                        <th className="px-3 pb-3">Status</th>
                                        <th className="px-3 pb-3 text-right">Quick Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {bookings.map((booking) => {
                                        const statusBadge = getStatusBadge(booking.status);
                                        const isPending = booking.status === 'pending';

                                        return (
                                            <tr key={booking.id} className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.04]">
                                                <td className="px-3 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-blue-600 dark:border-white/10 dark:bg-slate-800 dark:text-[#8acbff]">
                                                            {booking.student?.profile_picture ? (
                                                                <img
                                                                    src={booking.student.profile_picture}
                                                                    alt={booking.student?.name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                booking.student?.name?.charAt(0) || 'S'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                                                                {booking.student?.name || 'Student'}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                {booking.student?.email || 'Rider'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3.5 text-xs text-slate-700 dark:text-slate-300">
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-[#5bb4ff]" />
                                                        {booking.date}
                                                    </div>
                                                    {booking.time && (
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{booking.time}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3.5 text-xs text-slate-700 dark:text-slate-300">
                                                    {booking.lesson_type || 'Kitesurf Coaching'}
                                                </td>
                                                <td className="px-3 py-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                    ${booking.total_price ?? booking.price ?? instructor?.hourly_rate ?? 65}
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge.className}`}
                                                    >
                                                        {statusBadge.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3.5 text-right">
                                                    {isPending ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading === booking.id}
                                                                onClick={() => handleAcceptBooking(booking.id)}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Accept
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading === booking.id}
                                                                onClick={() => handleDeclineBooking(booking.id)}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-50"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                Decline
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <Link
                                                            href="/instructor/bookings"
                                                            className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                                        >
                                                            Details →
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function getStatusBadge(status: string) {
    switch (status?.toLowerCase()) {
        case 'confirmed':
            return {
                label: 'Confirmed',
                className: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
            };
        case 'pending':
            return {
                label: 'Pending Request',
                className: 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
            };
        case 'completed':
            return {
                label: 'Completed',
                className:
                    'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
            };
        case 'cancelled':
            return {
                label: 'Cancelled',
                className: 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
            };
        default:
            return {
                label: status || 'Active',
                className: 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
            };
    }
}
