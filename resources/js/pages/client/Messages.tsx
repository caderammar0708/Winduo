import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage, usePoll } from '@inertiajs/react';
import { Award, Check, CheckCheck, MessageSquare, Search, Send, Shield, Sparkles } from 'lucide-react';
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
    type: 'client' | 'school' | string;
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
    activeConversationId?: number | null;
    messages?: Message[];
    otherUser?: OtherUser | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Messages',
        href: '/client/messages',
    },
];

export default function Messages({ conversations = [], activeConversationId, messages = [], otherUser }: MessagesProps) {
    const { auth } = usePage<SharedData>().props;

    // Automatically poll every 2.5s for incoming chat messages & live read receipts (single tick -> double tick)
    usePoll(2500, { only: ['messages', 'conversations'] });

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
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return c.other_user?.name?.toLowerCase().includes(q) || c.last_message?.body?.toLowerCase().includes(q);
        }
        return true;
    });

    const handleSelectConversation = (convId: number) => {
        router.get(route('client.messages.show', convId), {}, { preserveState: true });
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
                name: auth?.user?.name ?? 'Client',
                profile_picture: auth?.user?.avatar,
            },
        };

        setLocalMessages((prev) => [...prev, optimisticMsg]);
        setSending(true);

        try {
            const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
            const res = await fetch(route('client.messages.store', activeConversationId), {
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
            <Head title="Direct Messages - Winduo" />

            <div className="relative min-h-full p-4 text-slate-800 selection:bg-blue-600/30 selection:text-blue-900 sm:p-6 lg:p-8 dark:text-slate-100 dark:selection:bg-[#3b82f6]/30 dark:selection:text-white">
                {/* 2-Column Chat Box Window */}
                <div className="grid h-[calc(100vh-14rem)] min-h-[550px] grid-cols-1 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 md:grid-cols-12 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl">
                    {/* Left Sidebar (4 cols on desktop) */}
                    <div className="flex h-full min-h-0 flex-col border-b border-slate-200 md:col-span-4 md:border-r md:border-b-0 dark:border-white/10">
                        {/* Header & Search */}
                        <div className="shrink-0 border-b border-slate-200 p-4 dark:border-white/10">
                            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-[#5bb4ff]" />
                                Direct Messages
                            </h2>

                            {/* Search */}
                            <div className="relative mt-3">
                                <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search instructors or messages..."
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pr-3 pl-8 text-xs text-slate-900 placeholder-slate-400 transition-all focus:border-blue-600 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder-slate-500"
                                />
                            </div>
                        </div>

                        {/* Conversations List */}
                        <div className="flex-1 min-h-0 divide-y divide-slate-100 overflow-y-auto dark:divide-white/5">
                            {filteredConversations.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                                    <MessageSquare className="mx-auto mb-2 h-7 w-7 text-slate-400 dark:text-slate-600" />
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">No Conversations Yet</p>
                                    <p className="mt-1 text-slate-500">
                                        Book a lesson with an instructor to start chatting about spot conditions, equipment, and lesson times.
                                    </p>
                                </div>
                            ) : (
                                filteredConversations.map((conv) => {
                                    const isActive = conv.id === activeConversationId;
                                    return (
                                        <button
                                            key={conv.id}
                                            type="button"
                                            onClick={() => handleSelectConversation(conv.id)}
                                            className={`flex w-full cursor-pointer items-start gap-3 p-3.5 text-left transition-all ${
                                                isActive
                                                    ? 'border-l-2 border-blue-600 bg-blue-50/80 dark:border-[#3b82f6] dark:bg-white/[0.08]'
                                                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            {/* Avatar */}
                                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs dark:border-white/10 dark:bg-slate-900">
                                                {conv.other_user?.avatar ? (
                                                    <img
                                                        src={conv.other_user.avatar}
                                                        alt={conv.other_user.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-blue-50 text-sm font-bold text-blue-600 dark:bg-gradient-to-br dark:from-[#1f6eff]/20 dark:to-[#5bb4ff]/10 dark:text-[#8acbff]">
                                                        {conv.other_user?.name?.charAt(0) || 'I'}
                                                    </div>
                                                )}
                                                {conv.unread_count > 0 && (
                                                    <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600 dark:border-[#070b12] dark:bg-[#3b82f6]" />
                                                )}
                                            </div>

                                            {/* Preview Details */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                                        {conv.other_user?.name || 'Instructor'}
                                                    </h3>
                                                    {conv.last_message?.created_at && (
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                            {conv.last_message.created_at}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {conv.last_message ? (
                                                        <>
                                                            {conv.last_message.is_mine && (
                                                                <span className="font-semibold text-blue-600 dark:text-[#8acbff]">You: </span>
                                                            )}
                                                            {conv.last_message.body}
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400 italic dark:text-slate-500">No messages yet</span>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Unread Count Badge */}
                                            {conv.unread_count > 0 && (
                                                <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white dark:bg-[#3b82f6]">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Chat Panel (8 cols on desktop) */}
                    <div className="flex h-full min-h-0 flex-col bg-slate-50/40 md:col-span-8 dark:bg-transparent">
                        {activeConversationId && otherUser ? (
                            <>
                                {/* Chat Header */}
                                <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white p-4 px-6 dark:border-white/10 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs dark:border-white/10 dark:bg-slate-900">
                                            {otherUser.avatar ? (
                                                <img src={otherUser.avatar} alt={otherUser.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-blue-50 text-sm font-bold text-blue-600 dark:bg-[#1f6eff]/20 dark:text-[#8acbff]">
                                                    {otherUser.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">{otherUser.name}</h3>
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-[#8acbff]">
                                                    {otherUser.role === 'admin' ? (
                                                        <>
                                                            <Shield className="h-3 w-3" />
                                                            Platform Administrator
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Award className="h-3 w-3" />
                                                            {otherUser.role === 'school' ? 'Kite School' : 'Certified Instructor'}
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="hidden items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 sm:inline-flex dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400">
                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
                                            Active Chat
                                        </span>
                                    </div>
                                </div>

                                {/* Messages Stream */}
                                <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
                                    {localMessages.length === 0 ? (
                                        <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                                            <Sparkles className="mb-2 h-8 w-8 text-blue-600 dark:text-[#5bb4ff]" />
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">Start the Conversation</p>
                                            <p className="mt-1 max-w-sm text-slate-500 dark:text-slate-400">
                                                Say hi to {otherUser.name}! Coordinate lesson location, equipment rental, or wind forecasts.
                                            </p>
                                        </div>
                                    ) : (
                                        localMessages.map((msg) => {
                                            const isMine = msg.sender_id === auth?.user?.id || msg.sender_id !== otherUser.id;
                                            return (
                                                <div key={msg.id} className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                    {!isMine && (
                                                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                                                            {otherUser.avatar ? (
                                                                <img
                                                                    src={otherUser.avatar}
                                                                    alt={otherUser.name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-blue-600 dark:text-[#8acbff]">
                                                                    {otherUser.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-sm sm:max-w-[70%] sm:text-sm ${
                                                            isMine
                                                                ? 'rounded-br-xs bg-gradient-to-r from-blue-600 to-[#1f6eff] text-white shadow-blue-500/20'
                                                                : 'rounded-bl-xs border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100'
                                                        }`}
                                                    >
                                                        <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
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
                                                            {isMine && (
                                                                <>
                                                                    {msg.read_at ? (
                                                                        <CheckCheck className="h-3 w-3 text-sky-200" />
                                                                    ) : (
                                                                        <Check className="h-3 w-3 text-blue-200" />
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Composer */}
                                <form
                                    onSubmit={handleSendMessage}
                                    className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4 dark:border-white/10 dark:bg-white/[0.02]"
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            placeholder={`Message ${otherUser.name}...`}
                                            className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none sm:text-sm dark:border-white/15 dark:bg-slate-950/60 dark:text-white dark:placeholder-slate-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputMessage.trim() || sending}
                                            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-[#1f6eff] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:scale-105 hover:from-blue-500 hover:to-blue-700 disabled:opacity-50 sm:text-sm"
                                        >
                                            <Send className="h-4 w-4" />
                                            <span className="hidden sm:inline">Send</span>
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 shadow-sm dark:border-[#5bb4ff]/30 dark:bg-gradient-to-br dark:from-[#1f6eff]/20 dark:to-[#5bb4ff]/10 dark:text-[#5bb4ff]">
                                    <MessageSquare className="h-8 w-8" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">Select a Conversation</h3>
                                <p className="mt-1 max-w-sm text-slate-500 dark:text-slate-400">
                                    Select an instructor from the left list or click "Message Instructor" on any of your confirmed bookings to open a
                                    chat.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
