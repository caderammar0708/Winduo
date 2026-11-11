import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Calendar, Check, CheckCircle2, Edit2, Eye, EyeOff, LoaderCircle, Package, Plus, Tag, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';

interface SchoolData {
    id: number;
    name: string;
}

interface PackageItem {
    id: number;
    school_id: number;
    name: string;
    type: 'course' | 'rental' | 'camp' | 'private';
    duration_label: string;
    price: number | string;
    description?: string | null;
    features?: string[] | null;
    is_active: boolean;
    created_at?: string;
}

interface PackagesProps {
    school: SchoolData;
    packages: PackageItem[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'School Dashboard', href: '/school/dashboard' },
    { title: 'Manage Packages', href: '/school/packages' },
];

export default function Packages({ school, packages }: PackagesProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
    const [featureInput, setFeatureInput] = useState('');

    // Create / Edit form
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        type: 'course' as 'course' | 'rental' | 'camp' | 'private',
        duration_label: '3 Days',
        price: '',
        description: '',
        features: [] as string[],
        is_active: true as boolean,
    });

    const openCreateModal = () => {
        setEditingPackage(null);
        reset();
        clearErrors();
        setData({
            name: '',
            type: 'course',
            duration_label: '3 Days',
            price: '',
            description: '',
            features: ['Equipment included', 'Certified coaching', 'Safety boat support'],
            is_active: true,
        });
        setIsCreateOpen(true);
    };

    const openEditModal = (pkg: PackageItem) => {
        setEditingPackage(pkg);
        clearErrors();
        setData({
            name: pkg.name,
            type: pkg.type,
            duration_label: pkg.duration_label,
            price: String(pkg.price),
            description: pkg.description || '',
            features: Array.isArray(pkg.features) ? [...pkg.features] : [],
            is_active: pkg.is_active,
        });
        setIsCreateOpen(true);
    };

    const addFeature = () => {
        if (!featureInput.trim()) return;
        setData('features', [...data.features, featureInput.trim()]);
        setFeatureInput('');
    };

    const removeFeature = (index: number) => {
        setData(
            'features',
            data.features.filter((_, i) => i !== index),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPackage) {
            post(`/school/packages/${editingPackage.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setEditingPackage(null);
                    reset();
                },
            });
        } else {
            post('/school/packages', {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreateOpen(false);
                    reset();
                },
            });
        }
    };

    const handleToggle = (pkg: PackageItem) => {
        post(`/school/packages/${pkg.id}/toggle`, {
            preserveScroll: true,
        });
    };

    const handleDelete = (pkg: PackageItem) => {
        if (confirm(`Are you sure you want to delete package "${pkg.name}"?`)) {
            router.delete(`/school/packages/${pkg.id}`, {
                preserveScroll: true,
            });
        }
    };

    const typeBadges: Record<string, { label: string; class: string }> = {
        course: {
            label: 'Course',
            class: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-[#8acbff] dark:border-[#5bb4ff]/30',
        },
        rental: {
            label: 'Rental',
            class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
        },
        camp: {
            label: 'Camp',
            class: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
        },
        private: {
            label: 'Private Lesson',
            class: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
        },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Packages & Offers - Winduo School" />

            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                {/* Header Card */}
                <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-[#5bb4ff]/30 dark:bg-[#5bb4ff]/15 dark:text-[#5bb4ff]">
                                <Package className="h-5 w-5" />
                            </span>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Packages &amp; Offers</h1>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Configure structured lesson courses, equipment rental bundles, and camps offered at {school.name}.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4ba9ff] to-[#1f6eff] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-105 hover:from-[#5bb4ff] hover:to-[#2e7bff]"
                    >
                        <Plus className="h-4 w-4" />
                        Create New Package
                    </button>
                </div>

                {/* Packages Grid */}
                {packages.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs dark:border-white/15 dark:bg-white/[0.02]">
                        <Package className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">No Packages Created Yet</h3>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                            Create your first course, rental bundle, or camp offering so visitors can book packages directly from your school profile.
                        </p>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            Add Your First Package
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {packages.map((pkg) => {
                            const badge = typeBadges[pkg.type] || typeBadges.course;
                            const features = Array.isArray(pkg.features) ? pkg.features : [];

                            return (
                                <div
                                    key={pkg.id}
                                    className={`relative flex flex-col justify-between rounded-3xl border p-6 shadow-sm transition-all duration-300 ${
                                        pkg.is_active
                                            ? 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]'
                                            : 'border-slate-200 bg-slate-50/70 opacity-70 dark:border-white/5 dark:bg-white/[0.02]'
                                    }`}
                                >
                                    <div>
                                        {/* Top row / badges */}
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase ${badge.class}`}
                                            >
                                                <Tag className="h-3 w-3" />
                                                {badge.label}
                                            </span>

                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-[#5bb4ff]" />
                                                {pkg.duration_label}
                                            </span>
                                        </div>

                                        {/* Package Title & Price */}
                                        <div className="mt-4">
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">{pkg.name}</h3>
                                            <div className="mt-2 flex items-baseline gap-1">
                                                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                                    ${Number(pkg.price).toFixed(0)}
                                                </span>
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/ package</span>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {pkg.description && (
                                            <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                                {pkg.description}
                                            </p>
                                        )}

                                        {/* Included Features */}
                                        {features.length > 0 && (
                                            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-white/10">
                                                <span className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                                    What's Included
                                                </span>
                                                <ul className="space-y-1.5">
                                                    {features.map((feat, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                                            <span>{feat}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(pkg)}
                                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                                                pkg.is_active
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                    : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-white/15 dark:bg-white/10 dark:text-slate-300'
                                            }`}
                                        >
                                            {pkg.is_active ? (
                                                <>
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Active
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                    Inactive
                                                </>
                                            )}
                                        </button>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(pkg)}
                                                className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:border-blue-400 hover:bg-white hover:text-blue-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-white"
                                                title="Edit Package"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDelete(pkg)}
                                                className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400"
                                                title="Delete Package"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Create / Edit Modal */}
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                        <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-white/15 dark:bg-[#070b12]">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    {editingPackage ? 'Edit Package' : 'Create New Package'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="cursor-pointer rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase dark:text-slate-300">Package Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g. Beginner 3-Day Course"
                                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase dark:text-slate-300">
                                            Offering Type *
                                        </label>
                                        <select
                                            value={data.type}
                                            onChange={(e) => setData('type', e.target.value as 'course' | 'rental' | 'camp' | 'private')}
                                            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
                                        >
                                            <option value="course">Course (Structured Lesson)</option>
                                            <option value="rental">Rental (Gear Bundle)</option>
                                            <option value="camp">Camp (Weekly / Safari)</option>
                                            <option value="private">Private Lesson</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase dark:text-slate-300">
                                            Duration Label *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={data.duration_label}
                                            onChange={(e) => setData('duration_label', e.target.value)}
                                            placeholder="e.g. 3 Days, 1 Week, Full Day"
                                            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
                                        />
                                        {errors.duration_label && <p className="mt-1 text-xs text-rose-500">{errors.duration_label}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase dark:text-slate-300">
                                        Package Price ($ USD) *
                                    </label>
                                    <div className="relative mt-1.5">
                                        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-slate-400">
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={data.price}
                                            onChange={(e) => setData('price', e.target.value)}
                                            placeholder="280.00"
                                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-8 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
                                        />
                                    </div>
                                    {errors.price && <p className="mt-1 text-xs text-rose-500">{errors.price}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase dark:text-slate-300">Description</label>
                                    <textarea
                                        rows={3}
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Describe the course curriculum, target skill level, or rental gear specs..."
                                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
                                    />
                                    {errors.description && <p className="mt-1 text-xs text-rose-500">{errors.description}</p>}
                                </div>

                                {/* Features List */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase dark:text-slate-300">
                                        Included Features &amp; Perks
                                    </label>

                                    <div className="mt-1.5 flex gap-2">
                                        <input
                                            type="text"
                                            value={featureInput}
                                            onChange={(e) => setFeatureInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addFeature();
                                                }
                                            }}
                                            placeholder="e.g. Equipment included, IKO certification..."
                                            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={addFeature}
                                            className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {data.features.length > 0 && (
                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                            {data.features.map((feat, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 dark:border-[#5bb4ff]/30 dark:bg-[#5bb4ff]/15 dark:text-[#8acbff]"
                                                >
                                                    <Check className="h-3 w-3 text-blue-600 dark:text-[#5bb4ff]" />
                                                    {feat}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFeature(idx)}
                                                        className="cursor-pointer text-slate-400 hover:text-rose-500"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="pkg_active"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="pkg_active" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Make this package visible and bookable publicly
                                    </label>
                                </div>

                                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#4ba9ff] to-[#1f6eff] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:from-[#5bb4ff] hover:to-[#2e7bff] disabled:opacity-50"
                                    >
                                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                        {editingPackage ? 'Save Changes' : 'Create Package'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
