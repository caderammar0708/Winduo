import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    Briefcase,
    Building2,
    CalendarCheck,
    CalendarDays,
    CloudSun,
    Compass,
    DollarSign,
    History,
    LayoutDashboard,
    MessageSquare,
    Package,
    Settings,
    ShieldCheck,
    Star,
    User,
    UserCheck,
    UserCog,
    Users,
} from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth?.user?.role === 'admin';
    const isInstructor = auth?.user?.role === 'instructor';
    const isSchool = auth?.user?.role === 'school';
    const dashboardUrl = isAdmin ? '/admin/dashboard' : isInstructor ? '/instructor/dashboard' : isSchool ? '/school/dashboard' : '/dashboard';

    const adminNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/admin/dashboard',
            icon: LayoutDashboard,
        },
        {
            title: 'User Management',
            url: '/admin/users',
            icon: UserCog,
        },
        {
            title: 'Approvals',
            url: '/admin/approvals',
            icon: ShieldCheck,
        },
        {
            title: 'Instructors',
            url: '/admin/instructors',
            icon: Users,
        },
        {
            title: 'Schools',
            url: '/admin/schools',
            icon: Building2,
        },
        {
            title: 'Clients',
            url: '/admin/clients',
            icon: UserCheck,
        },
        {
            title: 'User Management',
            url: '/admin/users',
            icon: UserCog,
        },
        {
            title: 'Bookings',
            url: '/admin/bookings',
            icon: CalendarCheck,
        },
        {
            title: 'Reviews',
            url: '/admin/reviews',
            icon: Star,
        },
        {
            title: 'Messages Monitor',
            url: '/admin/messages',
            icon: MessageSquare,
        },
        {
            title: 'Weather',
            url: '/admin/weather',
            icon: CloudSun,
        },
        {
            title: 'Notifications',
            url: '/admin/notifications',
            icon: Bell,
        },
        {
            title: 'Audit Log',
            url: '/admin/audit-logs',
            icon: History,
        },
        {
            title: 'Settings',
            url: '/admin/settings',
            icon: Settings,
        },
    ];

    const instructorNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/instructor/dashboard',
            icon: LayoutDashboard,
        },
        {
            title: 'My Bookings',
            url: '/instructor/bookings',
            icon: CalendarCheck,
        },
        {
            title: 'Availability',
            url: '/instructor/availability',
            icon: CalendarDays,
        },
        {
            title: 'My Profile',
            url: '/instructor/profile',
            icon: User,
        },
        {
            title: 'Revenue & Earnings',
            url: '/instructor/revenue',
            icon: DollarSign,
        },
        {
            title: 'Student Reviews',
            url: '/instructor/reviews',
            icon: Star,
        },
        {
            title: 'Messages',
            url: '/instructor/messages',
            icon: MessageSquare,
        },
        {
            title: 'School Hire Requests',
            url: '/instructor/hire-requests',
            icon: Briefcase,
        },
        {
            title: 'Weather & Wind',
            url: '/instructor/weather',
            icon: CloudSun,
        },
        {
            title: 'Browse Instructors',
            url: '/instructor/browse',
            icon: Compass,
        },
        {
            title: 'Notifications',
            url: '/instructor/notifications',
            icon: Bell,
        },
        {
            title: 'Settings',
            url: '/instructor/settings',
            icon: Settings,
        },
    ];

    const schoolNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/school/dashboard',
            icon: LayoutDashboard,
        },
        {
            title: 'School Profile',
            url: '/school/profile',
            icon: Building2,
        },
        {
            title: 'Manage Instructors',
            url: '/school/instructors',
            icon: Users,
        },
        {
            title: 'Packages',
            url: '/school/packages',
            icon: Package,
        },
        {
            title: 'Bookings',
            url: '/school/bookings',
            icon: CalendarCheck,
        },
        {
            title: 'Messages',
            url: '/school/messages',
            icon: MessageSquare,
        },
        {
            title: 'Weather & Wind',
            url: '/school/weather',
            icon: CloudSun,
        },
        {
            title: 'Settings',
            url: '/school/settings',
            icon: Settings,
        },
    ];

    const clientNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard',
            icon: LayoutDashboard,
        },
        {
            title: 'Find Instructors',
            url: '/instructors',
            icon: Compass,
        },
        {
            title: 'Find Schools',
            url: '/schools',
            icon: Building2,
        },
        {
            title: 'Weather & Wind',
            url: '/client/weather',
            icon: CloudSun,
        },
        {
            title: 'My Bookings',
            url: '/client/bookings',
            icon: CalendarCheck,
        },
        {
            title: 'Messages',
            url: '/client/messages',
            icon: MessageSquare,
        },
        {
            title: 'Settings',
            url: '/client/settings',
            icon: Settings,
        },
    ];

    const mainNavItems = isAdmin ? adminNavItems : isInstructor ? instructorNavItems : isSchool ? schoolNavItems : clientNavItems;
    const navLabel = isAdmin ? 'Admin Menu' : isInstructor ? 'Instructor Menu' : isSchool ? 'School Menu' : 'Main Menu';

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-r border-slate-200/80 bg-white text-slate-800 transition-colors duration-200 dark:border-white/10 dark:bg-[#070b12] dark:text-slate-200"
        >
            <SidebarHeader className="border-b border-slate-200/80 px-3 py-3 dark:border-white/10">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]">
                            <Link href={dashboardUrl} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="py-2">
                <NavMain items={mainNavItems} label={navLabel} />
            </SidebarContent>

            <SidebarFooter className="border-t border-slate-200/80 p-2 dark:border-white/10">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

export default AppSidebar;
