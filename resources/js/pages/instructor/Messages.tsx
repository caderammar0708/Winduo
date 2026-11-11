import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage, usePoll } from '@inertiajs/react';
import { Building2, Check, CheckCheck, MessageSquare, Search, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface OtherUser {
    id: number;
    name: string;
    avatar?: string;
    role: string;
}

interface LastMessage {
    body: string;
    created_at: string;
    is_mine: boolean;
}

interface ConversationItem {
    id: number;
    type: 'client' | 'school';
    other_user: OtherUser;
    last_message?: LastMessage;
    unread_count: number;
    last_message_at?: string;
}

interface Message {
    id: number;
    conversation_id: number;
    sender_id: number;
    body: string;
    read_at?: string;
    created_at: string;
    sender?: { id: number; name: string; profile_picture?: string };
}

interface MessagesProps {
    conversations?: ConversationItem[];
    activeConversationId?: number;
    messages?: Message[];
    otherUser?: OtherUser;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Instructor Dashboard',
        href: '/instructor/dashboard',
    },
    {
        title: 'Messages & Chat',
        href: '/instructor/messages',
    },
];

export default function Messages({ conversations = [], activeConversationId, messages = [], otherUser }: MessagesProps) {
    const { auth } = usePage<SharedData>().props;

    // Automatically poll every 2.5s for incoming chat messages & live read receipts (single tick -> double tick)
    usePoll(2500, { only: ['messages', 'conversations'] });

    const [selectedFilter, setSelectedFilter] = useState<'all' | 'client' | 'school'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [inputMessage, setInputMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [localMessages, setLocalMessages] = useState<Message[]>(messages);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Sync localMessages when incoming props change from polling or navigation
    useEffect(() => {
        setLocalMessages(messages);
    }, [messages]);

    const prevMessagesLengthRef = useRef(localMessages.length);
    const prevActiveConvIdRef = useRef(activeConversationId);

    // Scroll to bottom when new messages arrive or conversation changes (do not jump on read_at status update)
    useEffect(() => {
        const isConvChanged = activeConversationId !== prevActiveConvIdRef.current;
        const hasNewMessage = localMessages.length > prevMessagesLengthRef.current;

        if (isConvChanged) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        } else if (hasNewMessage) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }

        prevMessagesLengthRef.current = localMessages.length;
        prevActiveConvIdRef.current = activeConversationId;
    }, [localMessages, activeConversationId]);

    // Fast sync when notification bell detects an incoming message
    useEffect(() => {
        const handleNewMessage = () => {
            router.reload({ only: ['messages', 'conversations'] });
        };
        window.addEventListener('winduo:new-message', handleNewMessage);
        return () => window.removeEventListener('winduo:new-message', handleNewMessage);
    }, []);

    // Sync navbar notification bell whenever messages are viewed
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('winduo:refresh-notifications'));
    }, [activeConversationId, localMessages.length]);

    const filteredConversations = conversations.filter((c) => {
        if (selectedFilter !== 'all' && c.type !== selectedFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return c.other_user?.name?.toLowerCase().includes(q) || c.last_message?.body?.toLowerCase().includes(q);
        }
        return true;
    });

    const handleSelectConversation = (convId: number) => {
        router.get(route('instructor.messages.show', convId), {}, { preserveState: true });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = inputMessage.trim();
        if (!text || !activeConversationId || sending) return;

        // Instantly clear the input bar so user can keep typing without waiting
        setInputMessage('');

        // Optimistically render bubble on screen immediately (0ms latency, no page refresh!)
        const tempId = -Date.now();
        const optimisticMsg: Message = {
            id: tempId,
            conversation_id: activeConversationId,
            sender_id: auth?.user?.id ?? 0,
            body: text,
            read_at: undefined,
            created_at: new Date().toISOString(),
            sender: {
                id: auth?.user?.id ?? 0,
                name: auth?.user?.name ?? 'Instructor',
                profile_picture: auth?.user?.avatar,
            },
        };

        setLocalMessages((prev) => [...prev, optimisticMsg]);
        setSending(true);

        try {
            const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
            const res = await fetch(route('instructor.messages.store', activeConversationId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': metaTag?.content ?? '',
                },
                body: JSON.stringify({ body: text }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data?.message) {
                    setLocalMessages((prev) =>
                        prev.map((m) => (m.id === tempId ? data.message : m))
                    );
                }
            } else {
                // If API returned error status, quietly sync with Inertia
                router.reload({ only: ['messages', 'conversations'] });
            }
        } catch {
            // Network fallback: silent reload
            router.reload({ only: ['messages', 'conversations'] });
        } finally {
            setSending(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Instructor Inbox & Messages - Winduo" />

            <div className="relative min-h-full p-4 text-slate-800 selection:bg-blue-600/30 selection:text-blue-900 sm:p-6 lg:p-8 dark:text-slate-100 dark:selection:bg-[#3b82f6]/30 dark:selection:text-white">
                {/* 2-Column Chat Box Window */}
                <div className="grid h-[calc(100vh-14rem)] min-h-[550px] grid-cols-1 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 md:grid-cols-12 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl">
                    {/* Left Sidebar (4 cols on desktop) */}
                    <div className="flex h-full min-h-0 flex-col border-b border-slate-200 md:col-span-4 md:border-r md:border-b-0 dark:border-white/10">
                        {/* Header & Filter Tags */}
                        <div className="shrink-0 border-b border-slate-200 p-4 dark:border-white/10">
                            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-[#5bb4ff]" />
                                Direct Messages
                            </h2>

                            {/* Search */}
                            <div className="relative mt-3">
                                <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search chats..."
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pr-3 pl-8 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:placeholder-slate-500"
                                />
                            </div>

                            {/* Filter Tags */}
                            <div className="mt-3 flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setSelectedFilter('all')}
                                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                        selectedFilter === 'all'
                                            ? 'bg-blue-600 text-white shadow-xs dark:bg-[#1f6eff]'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFilter('client')}
                                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                        selectedFilter === 'client'
                                            ? 'bg-blue-600 text-white shadow-xs dark:bg-[#1f6eff]'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    Clients
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFilter('school')}
                                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                        selectedFilter === 'school'
                                            ? 'bg-blue-600 text-white shadow-xs dark:bg-[#1f6eff]'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    Kite Schools
                                </button>
                            </div>
                        </div>

                        {/* Conversations List */}
                        <div className="flex-1 min-h-0 divide-y divide-slate-100 overflow-y-auto dark:divide-white/5">
                            {filteredConversations.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-500">No conversations found.</div>
                            ) : (
                                filteredConversations.map((conv) => {
                                    const isSelected = activeConversationId === conv.id;
                                    const isSchool = conv.type === 'school';

                                    return (
                                        <div
                                            key={conv.id}
                                            onClick={() => handleSelectConversation(conv.id)}
                                            className={`flex cursor-pointer items-center justify-between p-3.5 transition ${
                                                isSelected
                                                    ? 'border-l-2 border-blue-600 bg-blue-50/80 dark:border-[#5bb4ff] dark:bg-[#1f6eff]/20'
                                                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="relative">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-blue-600 dark:border-white/15 dark:bg-slate-800 dark:text-[#8acbff]">
                                                        {conv.other_user?.avatar ? (
                                                            <img
                                                                src={conv.other_user.avatar}
                                                                alt={conv.other_user?.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            conv.other_user?.name?.charAt(0) || 'U'
                                                        )}
                                                    </div>
                                                    {isSchool && (
                                                        <div
                                                            className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] text-white"
                                                            title="Kite School"
                                                        >
                                                            <Building2 className="h-2.5 w-2.5" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                                            {conv.other_user?.name || 'User'}
                                                        </span>
                                                    </div>
                                                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                        {conv.last_message?.body || 'Start conversation...'}
                                                    </p>
                                                </div>
                                            </div>

                                            {conv.unread_count > 0 && (
                                                <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white dark:bg-[#1f6eff]">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Active Chat Thread (8 cols) */}
                    <div className="flex h-full min-h-0 flex-col bg-slate-50/40 md:col-span-8 dark:bg-slate-950/20">
                        {activeConversationId && otherUser ? (
                            <>
                                {/* Active Chat Top Bar */}
                                <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-blue-600 dark:border-white/15 dark:bg-slate-800 dark:text-[#8acbff]">
                                            {otherUser.avatar ? (
                                                <img src={otherUser.avatar} alt={otherUser.name} className="h-full w-full object-cover" />
                                            ) : (
                                                otherUser.name?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{otherUser.name}</h3>
                                            <span className="text-[11px] text-slate-500 capitalize dark:text-slate-400">
                                                {otherUser.role === 'admin'
                                                    ? 'Platform Administrator'
                                                    : otherUser.role === 'school'
                                                      ? 'Kite Center Partner'
                                                      : 'Student Rider'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages Bubble Scroll Area */}
                                <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4 sm:p-6">
                                    {localMessages.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-center text-xs text-slate-500">
                                            Send a message to start communicating.
                                        </div>
                                    ) : (
                                        localMessages.map((msg) => {
                                            const isMine = msg.sender_id === auth?.user?.id || msg.sender_id !== otherUser.id;

                                            return (
                                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                    <div
                                                        className={`max-w-xs rounded-2xl p-3.5 text-xs sm:max-w-md ${
                                                            isMine
                                                                ? 'rounded-br-xs bg-gradient-to-r from-blue-600 to-[#1f6eff] text-white shadow-sm'
                                                                : 'rounded-bl-xs border border-slate-200 bg-white text-slate-900 shadow-xs dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100'
                                                        }`}
                                                    >
                                                        <p className="leading-relaxed">{msg.body}</p>
                                                        <div
                                                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                                                                isMine ? 'text-blue-100' : 'text-slate-400'
                                                            }`}
                                                        >
                                                            <span>
                                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                            {isMine &&
                                                                (msg.read_at ? (
                                                                    <CheckCheck className="h-3 w-3 text-sky-200" />
                                                                ) : (
                                                                    <Check className="h-3 w-3 text-blue-100" />
                                                                ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Chat Input Bar */}
                                <form
                                    onSubmit={handleSendMessage}
                                    className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4 dark:border-white/10 dark:bg-white/[0.02]"
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            placeholder="Type your reply here..."
                                            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 shadow-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-slate-950/60 dark:text-white dark:placeholder-slate-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputMessage.trim() || sending}
                                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-[#1f6eff] text-white shadow-sm transition hover:scale-105 disabled:opacity-40"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
                                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 shadow-xs dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500">
                                    <MessageSquare className="h-7 w-7" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select a conversation</h3>
                                <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                                    Choose a client or school on the left to view messages and reply in real time.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
