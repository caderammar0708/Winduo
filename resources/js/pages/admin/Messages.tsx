import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { MessageSquare, Search, Shield } from 'lucide-react';
import React, { useState } from 'react';

interface ConversationItem {
    id: number;
    type: string;
    last_message_at: string;
    messages_count: number;
    participant_one?: {
        name: string;
        email: string;
        role: string;
        profile_picture?: string | null;
    };
    participant_two?: {
        name: string;
        email: string;
        role: string;
        profile_picture?: string | null;
    };
}

interface MessageItem {
    id: number;
    sender_id: number;
    body?: string;
    content?: string;
    created_at: string;
    sender?: {
        name: string;
        role: string;
        profile_picture?: string | null;
    };
}

interface MessagesProps {
    conversations: {
        data: ConversationItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    activeConversation?: {
        id: number;
        messages: MessageItem[];
        participant_one?: {
            id: number;
            name: string;
            role: string;
        };
        participant_two?: {
            id: number;
            name: string;
            role: string;
        };
    } | null;
    filters: {
        search: string;
    };
    totalConversations: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/dashboard' },
    { title: 'Messages Monitor', href: '/admin/messages' },
];

export default function MessagesMonitor({ conversations, activeConversation, filters, totalConversations }: MessagesProps) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/messages', { search }, { preserveState: true, preserveScroll: true });
    };

    const handleSelectConversation = (id: number) => {
        router.get('/admin/messages', { conversation_id: id, search }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Messages Monitor - Winduo Admin" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 text-slate-900 transition-colors duration-200 sm:p-6 lg:p-8 dark:text-slate-100">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
                            <Shield className="h-3.5 w-3.5" />
                            Safety & Support Audit Mode
                        </div>
                        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Messages Monitor</h1>
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                            Inspect communications between students and instructors for quality assurance and safety compliance.
                        </p>
                    </div>

                    <span className="text-xs font-semibold text-slate-500">{totalConversations} Total Conversations</span>
                </div>

                {/* Main 2-column layout */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left Conversations List (5 cols) */}
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-5 dark:border-white/10 dark:bg-[#0c1220]">
                        <form onSubmit={handleSearch} className="relative mb-4">
                            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by participant name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                            />
                        </form>

                        <div className="max-h-[600px] divide-y divide-slate-100 overflow-y-auto dark:divide-white/5">
                            {conversations.data.length === 0 ? (
                                <p className="py-8 text-center text-xs text-slate-500">No conversations found.</p>
                            ) : (
                                conversations.data.map((c) => {
                                    const isSelected = activeConversation?.id === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleSelectConversation(c.id)}
                                            className={`w-full rounded-2xl p-3 text-left transition-all ${
                                                isSelected
                                                    ? 'border border-blue-200 bg-blue-50 dark:border-blue-800/40 dark:bg-blue-950/30'
                                                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                                    {c.participant_one?.name} & {c.participant_two?.name}
                                                </p>
                                                <span className="text-[10px] text-slate-400">
                                                    {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ''}
                                                </span>
                                            </div>

                                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                                <span>
                                                    {c.participant_one?.role} ↔ {c.participant_two?.role}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                    {c.messages_count} msgs
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Conversation Thread Viewer (7 cols) */}
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 dark:border-white/10 dark:bg-[#0c1220]">
                        {activeConversation ? (
                            <div>
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/5">
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Conversation Thread #{activeConversation.id}
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {activeConversation.participant_one?.name} ({activeConversation.participant_one?.role}) and{' '}
                                            {activeConversation.participant_two?.name} ({activeConversation.participant_two?.role})
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        Read-only
                                    </span>
                                </div>

                                <div className="mt-4 max-h-[500px] space-y-3 overflow-y-auto p-2">
                                    {activeConversation.messages.map((m) => {
                                        return (
                                            <div
                                                key={m.id}
                                                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs dark:border-white/5 dark:bg-white/[0.03]"
                                            >
                                                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {m.sender?.name} ({m.sender?.role})
                                                    </span>
                                                    <span>
                                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">{m.body ?? m.content}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <MessageSquare className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Conversation Selected</h3>
                                <p className="mt-1 text-xs text-slate-500">Click any conversation on the left to monitor the chat thread.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
