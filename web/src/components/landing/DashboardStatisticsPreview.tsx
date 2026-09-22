import React, { useState } from 'react';
import {
    Calendar,
    ChevronDown,
    ArrowUpRight,
    TrendingUp,
    Store,
    CheckCircle2,
    ArrowRight,
    Activity,
    Layers,
    SlidersHorizontal,
    Maximize2,
    Filter,
} from 'lucide-react';

interface MonthlyBarData {
    month: string;
    percentage: number;
    volume: string;
    nominal: string;
    type: 'gradient-violet' | 'hatched-cyan' | 'hatched-zinc' | 'solid-sky' | 'hatched-blue' | 'peak-sky';
}

const MONTHLY_DATA: MonthlyBarData[] = [
    { month: 'Jan', percentage: 46, volume: '6.940 tx', nominal: 'Rp 395 Jt', type: 'gradient-violet' },
    { month: 'Feb', percentage: 36, volume: '5.420 tx', nominal: 'Rp 312 Jt', type: 'hatched-cyan' },
    { month: 'Mar', percentage: 26, volume: '4.110 tx', nominal: 'Rp 240 Jt', type: 'hatched-zinc' },
    { month: 'Apr', percentage: 50, volume: '7.820 tx', nominal: 'Rp 458 Jt', type: 'solid-sky' },
    { month: 'Mei', percentage: 54, volume: '8.210 tx', nominal: 'Rp 490 Jt', type: 'solid-sky' },
    { month: 'Jun', percentage: 42, volume: '6.450 tx', nominal: 'Rp 380 Jt', type: 'hatched-blue' },
    { month: 'Jul', percentage: 68, volume: '10.510 tx', nominal: 'Rp 620 Jt', type: 'solid-sky' },
    { month: 'Agu', percentage: 88, volume: '15.140 tx', nominal: 'Rp 864 Jt', type: 'peak-sky' },
];

export const DashboardStatisticsPreview: React.FC = () => {
    const [hoveredBar, setHoveredBar] = useState<MonthlyBarData | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'channels'>('overview');
    const [activeGoalTab, setActiveGoalTab] = useState<'minggu' | 'bulan'>('minggu');

    return (
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0c0c10]/95 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] ring-1 ring-white/5 overflow-hidden text-left">
            {/* SVG Global Pattern Definitions for Diagonal Hatches */}
            <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
                <defs>
                    {/* Diagonal Hatched Stripe - Cyan / Blue */}
                    <pattern
                        id="hatch-cyan"
                        width="8"
                        height="8"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                    >
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeWidth="2.5" opacity="0.85" />
                    </pattern>

                    {/* Diagonal Hatched Stripe - Bastion Blue */}
                    <pattern
                        id="hatch-blue"
                        width="8"
                        height="8"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                    >
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#60a5fa" strokeWidth="2.5" opacity="0.85" />
                    </pattern>

                    {/* Diagonal Hatched Stripe - Subtle Zinc */}
                    <pattern
                        id="hatch-zinc"
                        width="8"
                        height="8"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                    >
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#71717a" strokeWidth="2" opacity="0.6" />
                    </pattern>

                    {/* Violet Gradient */}
                    <linearGradient id="bar-violet-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
                    </linearGradient>

                    {/* Sky Gradient */}
                    <linearGradient id="bar-sky-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.25" />
                    </linearGradient>

                    {/* Peak Sky Gradient */}
                    <linearGradient id="bar-peak-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.35" />
                    </linearGradient>
                </defs>
            </svg>

            {/* 1. Header Bar Jendela Aplikasi Bastion */}
            <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-[#121217] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Window Dots & Organization Info */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 border border-red-400/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-400/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-md bg-blue-600/30 border border-blue-500/40 flex items-center justify-center">
                                <Activity className="w-2.5 h-2.5 text-blue-400" />
                            </div>
                            <span className="font-bold text-xs text-white tracking-tight">Bastion Financial OS</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-600 hidden sm:inline">•</span>
                        <span className="text-zinc-400 font-medium text-[11px] sm:text-xs">PT Kopi Nusantara</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Buku Kas Terkunci</span>
                        </span>
                    </div>
                </div>

                {/* Top Center / Right Sub-navigation Tabs */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="p-0.5 rounded-lg bg-zinc-900 border border-white/5 flex items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('overview')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                activeTab === 'overview'
                                    ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Ringkasan
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('revenue')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                activeTab === 'revenue'
                                    ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Arus Kas
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('channels')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                activeTab === 'channels'
                                    ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Saluran Kasir
                        </button>
                    </div>

                    <div className="hidden md:flex items-center gap-1.5 text-zinc-400">
                        <div className="p-1.5 rounded-lg bg-zinc-900/80 border border-white/5 hover:text-white transition-colors cursor-pointer" title="Layar Penuh">
                            <Maximize2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="p-1.5 rounded-lg bg-zinc-900/80 border border-white/5 hover:text-white transition-colors cursor-pointer" title="Filter Tambahan">
                            <Filter className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Main Analytics Dashboard Layout */}
            <div className="p-4 sm:p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                {/* ============================================================== */}
                {/* KOLOM KIRI (7 Kolom): STATISTIK TARGET & GRAFIK BERPOLA BULANAN */}
                {/* ============================================================== */}
                <div className="lg:col-span-7 space-y-5">
                    {/* WIDGET 1: MRR / TARGET PERTUMBUHAN ARUS KAS (Sesuai Referensi Atas Kanan) */}
                    <div className="rounded-2xl border border-white/10 bg-[#111116] p-4 sm:p-6 relative overflow-hidden shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white tracking-tight">
                                    Target Pertumbuhan Arus Kas
                                </h3>
                                <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                    Tahunan
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/5 text-[11px] font-medium text-zinc-300">
                                    <span>Semua Divisi</span>
                                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                                </span>
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                            {/* Giant Nominal & Growth Rate */}
                            <div className="space-y-2">
                                <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-white tracking-tight">
                                    Rp 864.250.000
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        <span>+12.4% vs bulan lalu</span>
                                    </span>
                                </div>

                                <div className="pt-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-white/5 text-xs text-zinc-400">
                                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-[11px] text-zinc-500 font-medium">Periode:</span>
                                        <span className="font-mono text-zinc-200 font-medium text-[11px]">01 Jan - 28 Feb 2026</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sub-Visual Kanan: Mini Comparison Bars with Floating Tooltip (Seperti "Statistic Brand" di gambar) */}
                            <div className="bg-[#14141c] rounded-xl border border-white/5 p-3.5 sm:w-56 shrink-0 relative">
                                <div className="text-[11px] font-semibold text-zinc-400 mb-3 flex items-center justify-between">
                                    <span>Komparasi Saluran</span>
                                    <span className="text-[10px] text-zinc-500">3 Teratas</span>
                                </div>

                                {/* Floating Tooltip Pill (Mirip "Google Play" di referensi) */}
                                <div className="absolute top-10 right-4 sm:right-6 z-20 pointer-events-none">
                                    <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-white/15 text-[10px] font-medium text-white shadow-xl flex items-center gap-1.5 relative">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        <span>Transfer Bank: Rp 420 Jt</span>
                                        {/* Little downward arrow */}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-white/15 rotate-45" />
                                    </div>
                                </div>

                                {/* 3 Mini Bars Comparison */}
                                <div className="h-24 flex items-end justify-center gap-3 pt-4 px-2">
                                    {/* Bar 1: Violet */}
                                    <div className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full h-14 rounded-t-md bg-gradient-to-t from-purple-600/50 to-purple-400/90 border-t border-purple-300" />
                                        <span className="text-[9px] font-mono text-zinc-500">QRIS</span>
                                    </div>

                                    {/* Bar 2: Blue (Active/Highlighted with line connector) */}
                                    <div className="flex-1 flex flex-col items-center gap-1 relative">
                                        <div className="w-full h-20 rounded-t-md bg-gradient-to-t from-blue-600/50 to-cyan-400/90 border-t-2 border-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.25)]" />
                                        <span className="text-[9px] font-mono text-cyan-400 font-semibold">Bank</span>
                                    </div>

                                    {/* Bar 3: Sky Blue */}
                                    <div className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full h-16 rounded-t-md bg-gradient-to-t from-sky-600/40 to-sky-400/70 border-t border-sky-300" />
                                        <span className="text-[9px] font-mono text-zinc-500">EDC</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 2: GRAFIK BATANG POLA & TEKSTUR BULANAN (Sesuai Referensi Bawah) */}
                    <div className="rounded-2xl border border-white/10 bg-[#111116] p-4 sm:p-6 space-y-4 shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-white tracking-tight">
                                    Volume Transaksi & Tren Kohort Bulanan
                                </h3>
                                <div className="flex items-baseline gap-2 pt-1">
                                    <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                                        15.140
                                    </span>
                                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        +32% vs bulan lalu
                                    </span>
                                </div>
                            </div>

                            {/* Legend Tekstur Batang Sesuai Desain */}
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-sm bg-purple-500/70 border border-purple-400/50" />
                                    <span>Kohort Baru</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div
                                        className="w-3 h-3 rounded-sm border border-cyan-400/50"
                                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #38bdf8 0, #38bdf8 2px, transparent 0, transparent 6px)' }}
                                    />
                                    <span>Garis Arsir Kas</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-sm bg-sky-500 border border-sky-400" />
                                    <span>Puncak Arus</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Bar Chart Canvas dengan Sumbu Y 0% - 100% */}
                        <div className="relative pt-6 pb-2">
                            {/* Hover Tooltip floating */}
                            {hoveredBar && (
                                <div className="absolute top-0 right-4 z-20 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/15 text-xs text-white shadow-xl flex items-center gap-2">
                                    <span className="font-semibold text-white">{hoveredBar.month}:</span>
                                    <span className="font-mono text-cyan-300 font-bold">{hoveredBar.nominal}</span>
                                    <span className="text-zinc-400 text-[11px]">({hoveredBar.volume})</span>
                                </div>
                            )}

                            {/* Y-Axis Grid Lines & Percentage Labels */}
                            <div className="relative h-56 sm:h-64 flex flex-col justify-between pointer-events-none">
                                {[100, 80, 60, 40, 20, 0].map((val) => (
                                    <div key={val} className="w-full flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-zinc-500 w-8 text-right shrink-0">
                                            {val}%
                                        </span>
                                        <div className="h-px w-full bg-white/[0.04]" />
                                    </div>
                                ))}

                                {/* Overlay Bars Container */}
                                <div className="absolute inset-0 left-10 flex items-end justify-between gap-1.5 sm:gap-3 pointer-events-auto px-1 sm:px-2">
                                    {MONTHLY_DATA.map((bar) => {
                                        const isHovered = hoveredBar?.month === bar.month;

                                        return (
                                            <div
                                                key={bar.month}
                                                onMouseEnter={() => setHoveredBar(bar)}
                                                onMouseLeave={() => setHoveredBar(null)}
                                                className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                                            >
                                                {/* Bar Render berdasarkan Tipe Tekstur Referensi */}
                                                <div
                                                    style={{ height: `${bar.percentage}%` }}
                                                    className={`w-full max-w-[48px] rounded-t-sm transition-all duration-200 relative ${
                                                        isHovered ? 'brightness-125 scale-y-[1.02]' : ''
                                                    }`}
                                                >
                                                    {/* 1. Gradient Violet */}
                                                    {bar.type === 'gradient-violet' && (
                                                        <div className="w-full h-full rounded-t-sm bg-gradient-to-t from-purple-900/60 to-purple-500/80 border-t-2 border-purple-400" />
                                                    )}

                                                    {/* 2. Hatched / Striped Cyan */}
                                                    {bar.type === 'hatched-cyan' && (
                                                        <div className="w-full h-full rounded-t-sm border border-cyan-400/40 relative overflow-hidden bg-cyan-950/20">
                                                            <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #38bdf8 0, #38bdf8 2px, transparent 0, transparent 6px)' }} />
                                                            <div className="absolute top-0 inset-x-0 h-1 bg-cyan-400" />
                                                        </div>
                                                    )}

                                                    {/* 3. Hatched Zinc */}
                                                    {bar.type === 'hatched-zinc' && (
                                                        <div className="w-full h-full rounded-t-sm border border-zinc-500/30 relative overflow-hidden bg-zinc-900/40">
                                                            <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #71717a 0, #71717a 1.5px, transparent 0, transparent 6px)' }} />
                                                        </div>
                                                    )}

                                                    {/* 4. Solid Sky Blue */}
                                                    {bar.type === 'solid-sky' && (
                                                        <div className="w-full h-full rounded-t-sm bg-gradient-to-t from-blue-900/40 to-sky-500/70 border-t-2 border-sky-400" />
                                                    )}

                                                    {/* 5. Hatched Blue */}
                                                    {bar.type === 'hatched-blue' && (
                                                        <div className="w-full h-full rounded-t-sm border border-blue-400/40 relative overflow-hidden bg-blue-950/20">
                                                            <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #60a5fa 0, #60a5fa 2.5px, transparent 0, transparent 6px)' }} />
                                                            <div className="absolute top-0 inset-x-0 h-1 bg-blue-400" />
                                                        </div>
                                                    )}

                                                    {/* 6. Peak Sky (Active Glow Cap) */}
                                                    {bar.type === 'peak-sky' && (
                                                        <div className="w-full h-full rounded-t-sm bg-gradient-to-t from-blue-700/60 to-sky-400/90 border-t-2 border-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.35)] relative">
                                                            <div className="absolute -top-1 inset-x-0 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8]" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Label Bulan */}
                                                <span className={`text-[10px] sm:text-xs font-mono pt-2 transition-colors ${
                                                    isHovered ? 'text-white font-bold' : 'text-zinc-500'
                                                }`}>
                                                    {bar.month}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* KOLOM KANAN (5 Kolom): SLIDER TARGET, RETENSI, & DONUT SALURAN */}
                {/* ============================================================== */}
                <div className="lg:col-span-5 space-y-5">
                    {/* WIDGET 3: TARGET REALISASI OPERASIONAL (Sesuai Referensi "Trial Conversions") */}
                    <div className="rounded-2xl border border-white/10 bg-[#111116] p-4 sm:p-5 space-y-4 shadow-lg">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h3 className="text-sm font-bold text-white tracking-tight">
                                Realisasi Target Operasional
                            </h3>

                            <div className="p-0.5 rounded-lg bg-zinc-900 border border-white/5 flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setActiveGoalTab('minggu')}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                                        activeGoalTab === 'minggu'
                                            ? 'bg-zinc-800 text-white font-semibold'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    Minggu Ini
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveGoalTab('bulan')}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                                        activeGoalTab === 'bulan'
                                            ? 'bg-zinc-800 text-white font-semibold'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    Bulan Ini
                                </button>
                            </div>
                        </div>

                        {/* Stepped Progress Goal Slider (0% - 25% - 75% - 100%) */}
                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400 font-medium text-[11px]">Pencapaian Target Arus Kas</span>
                                <span className="font-mono text-emerald-400 font-bold text-xs">82% Tercapai</span>
                            </div>

                            {/* Stepped Track Line with Markers */}
                            <div className="relative pt-1 pb-3">
                                <div className="h-2 w-full rounded-full bg-zinc-900 border border-white/5 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 w-[82%]" />
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1.5">
                                    <span>0%</span>
                                    <span>25%</span>
                                    <span>75%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            {/* 3 Mini KPI Cards (Kasir Siaga, Pencairan Sah, Rata-rata Nota) */}
                            <div className="grid grid-cols-3 gap-2 pt-1">
                                <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1 text-center">
                                    <div className="text-[10px] text-zinc-400 font-medium truncate flex items-center justify-center gap-1">
                                        <Store className="w-3 h-3 text-blue-400" />
                                        <span>Kasir Siaga</span>
                                    </div>
                                    <div className="font-mono text-xs sm:text-sm font-bold text-white">
                                        120 / 150
                                    </div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1 text-center">
                                    <div className="text-[10px] text-zinc-400 font-medium truncate flex items-center justify-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>Pencairan Sah</span>
                                    </div>
                                    <div className="font-mono text-xs sm:text-sm font-bold text-white">
                                        45 / 60
                                    </div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1 text-center">
                                    <div className="text-[10px] text-zinc-400 font-medium truncate">
                                        Rata-rata Nota
                                    </div>
                                    <div className="font-mono text-xs sm:text-sm font-bold text-white truncate">
                                        Rp 1,25 Jt
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 4: KESEHATAN RETENSI & LIKUIDITAS KAS (Sesuai Referensi "Retention & Churn Analysis") */}
                    <div className="rounded-2xl border border-white/10 bg-[#111116] p-4 sm:p-5 space-y-4 shadow-lg">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                            <h3 className="text-sm font-bold text-white tracking-tight">
                                Kesehatan Saldo & Alokasi Kas
                            </h3>
                            <span className="text-[10px] text-zinc-500 font-mono">Real-Time</span>
                        </div>

                        {/* Multi-Segmented Meter Bar (50%, 30%, 17%) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                <span>Alokasi Dana Usaha</span>
                                <span className="font-mono text-zinc-300">100% Terpetakan</span>
                            </div>

                            {/* Segmented Bar with Tags */}
                            <div className="space-y-1.5">
                                <div className="flex h-2.5 rounded-full overflow-hidden gap-1 bg-zinc-900 p-0.5 border border-white/5">
                                    <div className="h-full rounded-l-full bg-emerald-500 w-[50%]" title="50% Operasional Kasir" />
                                    <div className="h-full bg-indigo-500 w-[30%]" title="30% Cadangan Pajak" />
                                    <div className="h-full rounded-r-full bg-cyan-400 w-[20%]" title="20% Saldo Mengendap" />
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span>50% Operasional</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                        <span>30% Cadangan</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        <span>20% Laba</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Financial Health Summary Table */}
                        <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-zinc-400">
                                <span>Arus Kas Masuk Kotor</span>
                                <span className="font-mono font-medium text-white">Rp 1.420.000.000</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400">
                                <span>Beban Pokok & Operasional</span>
                                <span className="font-mono font-medium text-zinc-300">-Rp 555.750.000</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400">
                                <span>Tingkat Retensi Dana</span>
                                <span className="font-mono font-bold text-emerald-400">97.2%</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-white/5">
                                <span className="font-semibold text-zinc-200">Saldo Cadangan Tersedia</span>
                                <span className="font-mono font-bold text-cyan-300">Rp 864.250.000</span>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 5: DISTRIBUSI SALURAN TRANSAKSI (Sesuai Referensi "Top 3 Acquisition Channels" Donut) */}
                    <div className="rounded-2xl border border-white/10 bg-[#111116] p-4 sm:p-5 space-y-4 shadow-lg">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                            <h3 className="text-sm font-bold text-white tracking-tight">
                                3 Saluran Kasir Terbesar
                            </h3>
                            <span className="text-[10px] text-zinc-500">Hari Ini</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-1">
                            {/* Radial Donut Chart SVG */}
                            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    {/* Background track circle */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#18181b"
                                        strokeWidth="10"
                                    />
                                    {/* Segment 1: QRIS (55%) - Cyan */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#38bdf8"
                                        strokeWidth="10"
                                        strokeDasharray="238.7"
                                        strokeDashoffset={238.7 * (1 - 0.55)}
                                        strokeLinecap="round"
                                        className="transition-all duration-700"
                                    />
                                    {/* Segment 2: Transfer Bank (30%) - Indigo */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#818cf8"
                                        strokeWidth="10"
                                        strokeDasharray="238.7"
                                        strokeDashoffset={238.7 * (1 - 0.30)}
                                        transform="rotate(198 50 50)"
                                        strokeLinecap="round"
                                        className="transition-all duration-700"
                                    />
                                    {/* Segment 3: EDC Kasir (15%) - Emerald */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#34d399"
                                        strokeWidth="10"
                                        strokeDasharray="238.7"
                                        strokeDashoffset={238.7 * (1 - 0.15)}
                                        transform="rotate(306 50 50)"
                                        strokeLinecap="round"
                                        className="transition-all duration-700"
                                    />
                                </svg>

                                {/* Center Donut Metrics */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] text-zinc-400 font-medium">Total</span>
                                    <span className="text-xl font-extrabold font-mono text-white leading-none">
                                        431
                                    </span>
                                    <span className="text-[9px] text-zinc-500 pt-0.5">Transaksi</span>
                                </div>
                            </div>

                            {/* Donut Legend */}
                            <div className="space-y-2 text-xs w-full sm:w-auto">
                                <div className="flex items-center justify-between sm:justify-start gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                        <span className="text-zinc-300">QRIS Dinamis</span>
                                    </div>
                                    <span className="font-mono font-semibold text-white">237 tx</span>
                                </div>

                                <div className="flex items-center justify-between sm:justify-start gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                        <span className="text-zinc-300">Transfer Bank</span>
                                    </div>
                                    <span className="font-mono font-semibold text-white">129 tx</span>
                                </div>

                                <div className="flex items-center justify-between sm:justify-start gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="text-zinc-300">Mesin EDC</span>
                                    </div>
                                    <span className="font-mono font-semibold text-white">65 tx</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Footer Bar Terintegrasi Dasbor */}
            <div className="px-4 sm:px-6 py-3 border-t border-white/5 bg-[#0a0a0d] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Seluruh mutasi tercatat otomatis dalam buku besar kriptografi terisolasi.</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
                    <span>Latensi: 0.04s</span>
                    <span>•</span>
                    <span className="text-zinc-400">Integritas 100%</span>
                </div>
            </div>
        </div>
    );
};
