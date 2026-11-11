import { Link } from '@inertiajs/react';
import { ChevronRight, MapPin, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';

export interface ProfileDetailItem {
    label: string;
    value: React.ReactNode;
}

export interface RenderFullProfileProps<T = unknown> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
    layoutId: string;
}

export interface ExpandableProfileCardProps<T = unknown> {
    id: string | number;
    title: string;
    location?: string | null;
    subtitle?: string | null;
    imageSrc?: string | null;
    topBadge?: React.ReactNode;
    cornerBadge?: React.ReactNode;
    bio?: string | null;
    details?: ProfileDetailItem[];
    tags?: string[];
    profileUrl: string;
    profileButtonText?: string;
    content?: React.ReactNode;
    renderFullProfile?: (props: RenderFullProfileProps<T>) => React.ReactNode;
}

export type ViewState = 'collapsed' | 'modal' | 'full';

export default function ExpandableProfileCard<T = unknown>({
    id,
    title,
    location,
    subtitle,
    imageSrc,
    topBadge,
    cornerBadge,
    bio,
    details = [],
    tags = [],
    profileUrl,
    profileButtonText = 'View Full Profile',
    content,
    renderFullProfile,
}: ExpandableProfileCardProps<T>) {
    const [viewState, setViewState] = useState<ViewState>('collapsed');
    const [fullData, setFullData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const shouldReduceMotion = useReducedMotion();
    const previousUrlRef = useRef<string | null>(null);
    const isFetchingRef = useRef<boolean>(false);

    const layoutId = `expandable-profile-card-${id}`;
    const displaySubtitle = subtitle || location || 'Spot Location';

    // Fetch full data in background once opened
    const fetchFullData = React.useCallback(() => {
        if (fullData || isFetchingRef.current || !renderFullProfile) return;
        isFetchingRef.current = true;
        setIsLoading(true);

        fetch(profileUrl, {
            headers: {
                Accept: 'application/json',
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load profile details');
                return res.json();
            })
            .then((data: T) => {
                setFullData(data);
                setIsLoading(false);
                isFetchingRef.current = false;
            })
            .catch((err: Error) => {
                setError(err.message);
                setIsLoading(false);
                isFetchingRef.current = false;
            });
    }, [fullData, profileUrl, renderFullProfile]);

    // Prefetch data as soon as modal opens
    useEffect(() => {
        if (viewState === 'modal' && !fullData && !isFetchingRef.current) {
            fetchFullData();
        }
    }, [viewState, fullData, fetchFullData]);

    // Handle Expand to Full Profile with history.pushState
    const expandToFullProfile = () => {
        if (typeof window !== 'undefined') {
            previousUrlRef.current = window.location.href;
            window.history.pushState({ winduoExpandedCardId: id, kitelinkExpandedCardId: id, viewState: 'full' }, '', profileUrl);
        }
        setViewState('full');
        fetchFullData();
    };

    // Collapse from full profile back to modal or collapsed
    const collapseFromFullProfile = React.useCallback(() => {
        if (typeof window !== 'undefined' && (window.history.state?.winduoExpandedCardId === id || window.history.state?.kitelinkExpandedCardId === id)) {
            window.history.back();
        } else {
            if (previousUrlRef.current && typeof window !== 'undefined') {
                window.history.pushState({}, '', previousUrlRef.current);
            }
            setViewState('modal');
        }
    }, [id]);

    // Listen to popstate (browser back button)
    useEffect(() => {
        const handlePopState = () => {
            if (viewState === 'full') {
                // If popstate fired while in full view, return to modal
                setViewState('modal');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [viewState]);

    // Keyboard Escape & Body Scroll Lock
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewState === 'full') {
                    collapseFromFullProfile();
                } else if (viewState === 'modal') {
                    setViewState('collapsed');
                }
            }
        };

        if (viewState !== 'collapsed') {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [viewState, collapseFromFullProfile]);

    const springTransition = shouldReduceMotion ? { duration: 0 } : { type: 'spring' as const, damping: 28, stiffness: 260 };

    return (
        <>
            {/* 1. Collapsed Card in Grid */}
            <motion.div
                layoutId={layoutId}
                onClick={() => setViewState('modal')}
                className="group relative h-72 w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#5bb4ff]/60 hover:shadow-xl sm:h-80 dark:border-white/15 dark:bg-slate-900"
                whileHover={shouldReduceMotion ? undefined : 'hover'}
                transition={springTransition}
            >
                {imageSrc ? (
                    <motion.img
                        layoutId={`image-${layoutId}`}
                        src={imageSrc}
                        alt={title}
                        className="absolute inset-0 h-full w-full object-cover"
                        variants={{
                            hover: { scale: 1.05 },
                        }}
                        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
                    />
                ) : (
                    <motion.div
                        layoutId={`image-${layoutId}`}
                        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900/60 via-slate-900 to-indigo-950 text-white"
                    >
                        <span className="bg-gradient-to-r from-[#b8e6ff] to-[#4da6ff] bg-clip-text text-5xl font-black text-transparent">
                            {title ? title.charAt(0).toUpperCase() : 'K'}
                        </span>
                    </motion.div>
                )}

                {/* Gradient Shadow Overlay for High-Contrast Text in Both Light & Dark Mode */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent opacity-85 transition-opacity duration-300 group-hover:opacity-95" />

                {/* Optional Top Badges */}
                {topBadge && <div className="absolute top-3.5 left-3.5 z-10">{topBadge}</div>}
                {cornerBadge && <div className="absolute top-3.5 right-3.5 z-10">{cornerBadge}</div>}

                {/* Card Bottom Meta */}
                <div className="absolute bottom-0 left-0 w-full translate-y-2 p-5 transition-transform duration-300 group-hover:translate-y-0 sm:p-6">
                    <motion.p
                        layoutId={`subtitle-${layoutId}`}
                        className="mb-1 flex items-center gap-1.5 truncate text-xs font-semibold tracking-wide text-[#5bb4ff] uppercase"
                    >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#5bb4ff]" />
                        <span className="truncate">{displaySubtitle}</span>
                    </motion.p>
                    <motion.h3
                        layoutId={`title-${layoutId}`}
                        className="mb-2 truncate text-lg font-bold tracking-tight text-white drop-shadow-xs sm:text-xl"
                    >
                        {title}
                    </motion.h3>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs text-slate-300 opacity-90 group-hover:opacity-100">
                        <span className="flex items-center gap-1 font-medium text-[#8acbff]">Click to expand</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-white">
                            Quick View <ChevronRight className="h-3.5 w-3.5 text-[#5bb4ff]" />
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* 2. Expanded Modal or Full Profile Panel via AnimatePresence */}
            <AnimatePresence>
                {viewState !== 'collapsed' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6">
                        {/* Backdrop Blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                if (viewState === 'full') {
                                    collapseFromFullProfile();
                                } else {
                                    setViewState('collapsed');
                                }
                            }}
                            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md dark:bg-black/80"
                        />

                        {/* ViewState === 'modal': Centered Quick View Card */}
                        {viewState === 'modal' && (
                            <motion.div
                                layoutId={layoutId}
                                className="relative z-10 flex h-auto max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl md:h-[620px] md:flex-row dark:border-white/15 dark:bg-[#0c121e]"
                                transition={springTransition}
                            >
                                {/* Close Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewState('collapsed');
                                    }}
                                    aria-label="Close modal"
                                    className="absolute top-4 right-4 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>

                                {/* Left Side: Photo */}
                                <div className="relative h-56 w-full shrink-0 overflow-hidden bg-slate-100 sm:h-64 md:h-full md:w-5/12 dark:bg-slate-950">
                                    {imageSrc ? (
                                        <motion.img
                                            layoutId={`image-${layoutId}`}
                                            src={imageSrc}
                                            alt={title}
                                            className="h-full w-full object-cover"
                                            transition={springTransition}
                                        />
                                    ) : (
                                        <motion.div
                                            layoutId={`image-${layoutId}`}
                                            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-900/60 via-slate-900 to-indigo-950"
                                            transition={springTransition}
                                        >
                                            <span className="bg-gradient-to-r from-[#b8e6ff] to-[#4da6ff] bg-clip-text text-6xl font-black text-transparent">
                                                {title ? title.charAt(0).toUpperCase() : 'K'}
                                            </span>
                                        </motion.div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent md:hidden" />
                                </div>

                                {/* Right Side: Content */}
                                <div className="flex h-full w-full flex-col overflow-y-auto p-6 text-slate-900 sm:p-8 md:w-7/12 dark:text-slate-100">
                                    <motion.p
                                        layoutId={`subtitle-${layoutId}`}
                                        className="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#5bb4ff] uppercase"
                                        transition={springTransition}
                                    >
                                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#5bb4ff]" />
                                        <span>{displaySubtitle}</span>
                                    </motion.p>

                                    <motion.h3
                                        layoutId={`title-${layoutId}`}
                                        className="mb-4 border-b border-slate-200/80 pb-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:border-white/10 dark:text-white"
                                        transition={springTransition}
                                    >
                                        {title}
                                    </motion.h3>

                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ delay: 0.15 }}
                                        className="flex grow flex-col justify-between text-sm leading-relaxed"
                                    >
                                        <div className="space-y-4">
                                            {bio && (
                                                <div>
                                                    <h4 className="mb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                                                        About
                                                    </h4>
                                                    <p className="text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">{bio}</p>
                                                </div>
                                            )}

                                            {details.length > 0 && (
                                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                                    {details.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 sm:p-3 dark:border-white/10 dark:bg-white/[0.04]"
                                                        >
                                                            <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase sm:text-[11px] dark:text-slate-400">
                                                                {item.label}
                                                            </div>
                                                            <div className="mt-0.5 text-xs font-semibold text-slate-900 sm:text-sm dark:text-slate-100">
                                                                {item.value}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {tags.length > 0 && (
                                                <div>
                                                    <h4 className="mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase sm:text-[11px] dark:text-slate-500">
                                                        Certifications &amp; Highlights
                                                    </h4>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {tags.map((tag, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {content}
                                        </div>

                                        {/* Action Footer: Expand to full profile seamlessly */}
                                        <div className="mt-6 flex items-center justify-between border-t border-slate-200/80 pt-4 dark:border-white/10">
                                            {renderFullProfile ? (
                                                <button
                                                    type="button"
                                                    onClick={expandToFullProfile}
                                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#1f6eff] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] hover:from-[#5bb4ff] hover:to-[#2e7bff] hover:shadow-blue-500/35 active:scale-[0.98] sm:text-sm"
                                                >
                                                    <span>{profileButtonText}</span>
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            ) : (
                                                <Link
                                                    href={profileUrl}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#1f6eff] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] hover:from-[#5bb4ff] hover:to-[#2e7bff] hover:shadow-blue-500/35 active:scale-[0.98] sm:text-sm"
                                                >
                                                    <span>{profileButtonText}</span>
                                                    <ChevronRight className="h-4 w-4" />
                                                </Link>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {/* ViewState === 'full': Continuous expansion into full-screen panel */}
                        {viewState === 'full' && (
                            <motion.div
                                layoutId={layoutId}
                                className="fixed inset-0 z-50 flex h-full w-full flex-col overflow-y-auto bg-slate-50 text-slate-900 dark:bg-[#070b12] dark:text-slate-100"
                                transition={springTransition}
                            >
                                <div className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
                                    {renderFullProfile &&
                                        renderFullProfile({
                                            data: fullData,
                                            isLoading,
                                            error,
                                            onClose: collapseFromFullProfile,
                                            layoutId,
                                        })}
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
