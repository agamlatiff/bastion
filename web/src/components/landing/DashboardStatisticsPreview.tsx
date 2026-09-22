import React, { useState, useEffect } from 'react';
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
    LayoutGrid,
    ShieldCheck,
    Settings,
    Clock,
    Sparkles,
    Check,
} from 'lucide-react';
import { BastionLogo } from '../common/BastionLogo';

type PeriodType = 'feb26' | 'jan26' | 'q1_26';
type ChannelType = 'all' | 'qris' | 'bank' | 'edc';

interface MonthlyBarData {
    month: string;
    percentage: number;
    volume: string;
    nominal: string;
    type: 'gradient-violet' | 'hatched-cyan' | 'hatched-zinc' | 'solid-sky' | 'hatched-blue' | 'peak-sky';
}

const PERIOD_DATA: Record<
    PeriodType,
    {
        label: string;
        dateRange: string;
        targetNominal: string;
        growthBadge: string;
        growthSub: string;
        totalVolume: string;
        volumeGrowth: string;
        bankComparisonTooltip: string;
        bars: MonthlyBarData[];
    }
> = {
    feb26: {
        label: 'Feb 2026',
        dateRange: '01 Feb - 28 Feb 2026',
        targetNominal: 'Rp 864.250.000',
        growthBadge: '+12.4%',
        growthSub: 'vs bulan lalu',
        totalVolume: '15.140',
        volumeGrowth: '+32% vs bulan lalu',
        bankComparisonTooltip: 'Transfer Bank: Rp 420 Jt',
        bars: [
            { month: 'Jan', percentage: 46, volume: '6.940 tx', nominal: 'Rp 395 Jt', type: 'gradient-violet' },
            { month: 'Feb', percentage: 36, volume: '5.420 tx', nominal: 'Rp 312 Jt', type: 'hatched-cyan' },
            { month: 'Mar', percentage: 26, volume: '4.110 tx', nominal: 'Rp 240 Jt', type: 'hatched-zinc' },
            { month: 'Apr', percentage: 50, volume: '7.820 tx', nominal: 'Rp 458 Jt', type: 'solid-sky' },
            { month: 'Mei', percentage: 54, volume: '8.210 tx', nominal: 'Rp 490 Jt', type: 'solid-sky' },
            { month: 'Jun', percentage: 42, volume: '6.450 tx', nominal: 'Rp 380 Jt', type: 'hatched-blue' },
            { month: 'Jul', percentage: 68, volume: '10.510 tx', nominal: 'Rp 620 Jt', type: 'solid-sky' },
            { month: 'Agu', percentage: 88, volume: '15.140 tx', nominal: 'Rp 864 Jt', type: 'peak-sky' },
        ],
    },
    jan26: {
        label: 'Jan 2026',
        dateRange: '01 Jan - 31 Jan 2026',
        targetNominal: 'Rp 768.800.000',
        growthBadge: '+9.8%',
        growthSub: 'vs Des 2025',
        totalVolume: '13.480',
        volumeGrowth: '+18% vs bulan lalu',
        bankComparisonTooltip: 'Transfer Bank: Rp 380 Jt',
        bars: [
            { month: 'Jan', percentage: 40, volume: '6.120 tx', nominal: 'Rp 340 Jt', type: 'gradient-violet' },
            { month: 'Feb', percentage: 32, volume: '4.890 tx', nominal: 'Rp 275 Jt', type: 'hatched-cyan' },
            { month: 'Mar', percentage: 22, volume: '3.420 tx', nominal: 'Rp 195 Jt', type: 'hatched-zinc' },
            { month: 'Apr', percentage: 44, volume: '6.900 tx', nominal: 'Rp 410 Jt', type: 'solid-sky' },
            { month: 'Mei', percentage: 48, volume: '7.340 tx', nominal: 'Rp 435 Jt', type: 'solid-sky' },
            { month: 'Jun', percentage: 38, volume: '5.800 tx', nominal: 'Rp 330 Jt', type: 'hatched-blue' },
            { month: 'Jul', percentage: 58, volume: '9.100 tx', nominal: 'Rp 540 Jt', type: 'solid-sky' },
            { month: 'Agu', percentage: 76, volume: '13.480 tx', nominal: 'Rp 768 Jt', type: 'peak-sky' },
        ],
    },
    q1_26: {
        label: 'Kuartal 1 (Q1)',
        dateRange: '01 Jan - 31 Mar 2026',
        targetNominal: 'Rp 2.450.000.000',
        growthBadge: '+28.6%',
        growthSub: 'vs Q4 2025',
        totalVolume: '42.600',
        volumeGrowth: '+41% vs semester lalu',
        bankComparisonTooltip: 'Transfer Bank: Rp 1.15 M',
        bars: [
            { month: 'Jan', percentage: 55, volume: '13.200 tx', nominal: 'Rp 760 Jt', type: 'gradient-violet' },
            { month: 'Feb', percentage: 45, volume: '11.400 tx', nominal: 'Rp 650 Jt', type: 'hatched-cyan' },
            { month: 'Mar', percentage: 38, volume: '9.800 tx', nominal: 'Rp 540 Jt', type: 'hatched-zinc' },
            { month: 'Apr', percentage: 62, volume: '16.100 tx', nominal: 'Rp 920 Jt', type: 'solid-sky' },
            { month: 'Mei', percentage: 70, volume: '18.400 tx', nominal: 'Rp 1.05 M', type: 'solid-sky' },
            { month: 'Jun', percentage: 54, volume: '14.200 tx', nominal: 'Rp 810 Jt', type: 'hatched-blue' },
            { month: 'Jul', percentage: 80, volume: '22.100 tx', nominal: 'Rp 1.28 M', type: 'solid-sky' },
            { month: 'Agu', percentage: 96, volume: '42.600 tx', nominal: 'Rp 2.45 M', type: 'peak-sky' },
        ],
    },
};

const LIVE_EVENTS = [
    { text: 'Baru saja: QRIS Kasir Toko +Rp 450.000 tervalidasi otomatis', color: 'emerald' },
    { text: '3 detik lalu: Transfer Antar Bank +Rp 12.500.000 tercatat dalam buku besar', color: 'cyan' },
    { text: '7 detik lalu: Mesin EDC Kasir #2 menyelesaikan kliring Rp 850.000', color: 'emerald' },
    { text: '12 detik lalu: Rekonsiliasi cabang Jakarta seimbang (Nol Selisih)', color: 'blue' },
];

export const DashboardStatisticsPreview: React.FC = () => {
    // Dynamic interactive states
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('feb26');
    const [activeRailTab, setActiveRailTab] = useState<'overview' | 'analytics' | 'wallets' | 'security' | 'settings'>('overview');
    const [activeTopTab, setActiveTopTab] = useState<'all' | 'inflow' | 'retail'>('all');
    const [selectedMilestone, setSelectedMilestone] = useState<number>(82);
    const [activeChannel, setActiveChannel] = useState<ChannelType>('all');
    const [hoveredBar, setHoveredBar] = useState<MonthlyBarData | null>(null);
    const [liveEventIndex, setLiveEventIndex] = useState<number>(0);

    const currentPeriodData = PERIOD_DATA[selectedPeriod];

    // Cycle simulated real-time ledger ticker events smoothly
    useEffect(() => {
        const interval = setInterval(() => {
            setLiveEventIndex((prev) => (prev + 1) % LIVE_EVENTS.length);
        }, 3800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0c0c10]/95 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] ring-1 ring-white/5 overflow-hidden text-left flex flex-col">
            {/* SVG Global Pattern Definitions for Diagonal Hatches */}
            <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
                <defs>
                    {/* Diagonal Hatched Stripe - Electric Cyan (High Velocity QRIS / Cash In) */}
                    <pattern
                        id="hatch-cyan"
                        width="8"
                        height="8"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                    >
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#00E5FF" strokeWidth="2.5" opacity="0.9" />
                    </pattern>

                    {/* Diagonal Hatched Stripe - Bastion Blue (Primary Bank Transfer) */}
                    <pattern
                        id="hatch-blue"
                        width="8"
                        height="8"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                    >
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeWidth="2.5" opacity="0.85" />
                    </pattern>

                    {/* Diagonal Hatched Stripe - Subtle Zinc */}
                    <pattern
                        id="hatch-zinc"
                        width="8"
                        height="8"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                    >
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#71717a" strokeWidth="2" opacity="0.65" />
                    </pattern>
                </defs>
            </svg>

            {/* 1. Header Bar Jendela Aplikasi Bastion (Brand Authentic + BastionLogo Resmi) */}
            <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-[#121217] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Window Dots & Bastion Logo Branding */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 border border-red-400/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-400/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
                        </div>
                        <div className="h-4 w-px bg-white/10" />

                        {/* Logo Resmi Bastion dengan Kubah Cyan Bersinar */}
                        <div className="flex items-center gap-2">
                            <BastionLogo className="w-5 h-5 text-white shrink-0" />
                            <span className="font-bold text-xs text-white tracking-tight font-heading">
                                Bastion Financial OS
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-600 hidden sm:inline">•</span>
                        <span className="text-zinc-400 font-medium text-[11px] sm:text-xs">PT Kopi Nusantara</span>
                        {/* Status Psikologis Keberhasilan & Keamanan: Emerald */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Buku Kas Terkunci</span>
                        </span>
                    </div>
                </div>

                {/* Top Center / Right Sub-navigation Tabs & Period Pills */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Interactive Top View Filter Tabs */}
                    <div className="p-0.5 rounded-lg bg-zinc-900 border border-white/5 flex items-center gap-0.5">
                        {[
                            { id: 'all', label: 'Semua Saluran' },
                            { id: 'inflow', label: 'Arus Kas Masuk' },
                            { id: 'retail', label: 'Kasir Retail' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTopTab(tab.id as any)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                                    activeTopTab === tab.id
                                        ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Interactive Period Switcher (Feb 2026, Jan 2026, Q1) */}
                    <div className="p-0.5 rounded-lg bg-zinc-900/90 border border-white/10 flex items-center gap-0.5">
                        {(['feb26', 'jan26', 'q1_26'] as PeriodType[]).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setSelectedPeriod(p)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer ${
                                    selectedPeriod === p
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {PERIOD_DATA[p].label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. Main Workbench Shell (Left Rail Navigation + Broad Center/Right Analytics) */}
            <div className="flex flex-1 min-h-0">
                {/* ============================================================== */}
                {/* LEFT MINI-RAIL NAVIGATION (Sesuai Referensi Kotak Biru + Ikon Vertikal) */}
                {/* ============================================================== */}
                <div className="hidden md:flex flex-col items-center justify-between w-14 lg:w-16 py-5 border-r border-white/5 bg-[#09090d]/80 shrink-0">
                    <div className="flex flex-col items-center gap-4 w-full px-2">
                        {/* Top Active App Icon (Kotak Cyan/Blue Bastion dengan Pendar Logo) */}
                        <button
                            type="button"
                            onClick={() => setActiveRailTab('overview')}
                            className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,229,255,0.35)] cursor-pointer hover:scale-105 transition-transform"
                            title="Ringkasan Eksekutif"
                        >
                            <LayoutGrid className="w-4 h-4 text-white" />
                        </button>

                        {/* Navigation Rail Action Icons */}
                        <div className="h-px w-6 bg-white/10 my-1" />

                        <button
                            type="button"
                            onClick={() => setActiveRailTab('analytics')}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                activeRailTab === 'analytics'
                                    ? 'bg-zinc-800 text-cyan-300 border border-cyan-500/30 shadow-sm'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                            }`}
                            title="Grafik & Tren"
                        >
                            <TrendingUp className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveRailTab('wallets')}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                activeRailTab === 'wallets'
                                    ? 'bg-zinc-800 text-emerald-300 border border-emerald-500/30 shadow-sm'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                            }`}
                            title="Rekening Kasir"
                        >
                            <Store className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveRailTab('security')}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                activeRailTab === 'security'
                                    ? 'bg-zinc-800 text-purple-300 border border-purple-500/30 shadow-sm'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                            }`}
                            title="Audit Kriptografi"
                        >
                            <ShieldCheck className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveRailTab('settings')}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                activeRailTab === 'settings'
                                    ? 'bg-zinc-800 text-white border border-white/20 shadow-sm'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                            }`}
                            title="Aturan Buku Kas"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Bottom Status / Collapse Icon */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sistem Aktif" />
                    </div>
                </div>

                {/* ============================================================== */}
                {/* CENTER & RIGHT CONTENT: DUAL COLUMN EXPANSIVE WORKBENCH        */}
                {/* ============================================================== */}
                <div className="flex-1 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* ========================================================== */}
                    {/* KOLOM KIRI (7 Kolom): STATISTIK TARGET & GRAFIK BERPOLA     */}
                    {/* ========================================================== */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* WIDGET 1: TARGET PERTUMBUHAN ARUS KAS (Sesuai Referensi Atas Kanan) */}
                        <div className="rounded-2xl border border-white/10 bg-[#111116] p-5 sm:p-7 relative overflow-hidden shadow-xl">
                            {/* Ambient Glow Psikologis: Emerald untuk Pertumbuhan */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/5 relative z-10">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                                        Target Pertumbuhan Arus Kas
                                    </h3>
                                    {/* Psikologi Biru/Cyan: Presisi Operasional */}
                                    <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-mono">
                                        {currentPeriodData.label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/5 text-[11px] font-medium text-zinc-300">
                                        <span>Semua Divisi</span>
                                        <ChevronDown className="w-3 h-3 text-zinc-500" />
                                    </span>
                                </div>
                            </div>

                            <div className="pt-5 flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
                                {/* Giant Nominal & Growth Rate */}
                                <div className="space-y-2.5">
                                    <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-white tracking-tight">
                                        {currentPeriodData.targetNominal}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Psikologi Emerald: Pertumbuhan Nyata */}
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                            <span>
                                                {currentPeriodData.growthBadge} {currentPeriodData.growthSub}
                                            </span>
                                        </span>
                                    </div>

                                    <div className="pt-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-white/5 text-xs text-zinc-400">
                                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                            <span className="text-[11px] text-zinc-500 font-medium">Periode:</span>
                                            <span className="font-mono text-zinc-200 font-medium text-[11px]">
                                                {currentPeriodData.dateRange}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sub-Visual Kanan: Mini Comparison Bars with Floating Tooltip (Seperti "Statistic Brand" di gambar) */}
                                <div className="bg-[#14141c] rounded-xl border border-white/5 p-4 sm:w-60 shrink-0 relative">
                                    <div className="text-[11px] font-semibold text-zinc-400 mb-3 flex items-center justify-between">
                                        <span>Komparasi Saluran</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">3 Teratas</span>
                                    </div>

                                    {/* Floating Tooltip Pill (Mirip "Google Play" di referensi) */}
                                    <div className="absolute top-11 right-4 sm:right-6 z-20 pointer-events-none">
                                        <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-white/15 text-[10px] font-medium text-white shadow-xl flex items-center gap-1.5 relative">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                            <span>{currentPeriodData.bankComparisonTooltip}</span>
                                            {/* Little downward arrow */}
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-white/15 rotate-45" />
                                        </div>
                                    </div>

                                    {/* 3 Mini Bars Comparison */}
                                    <div className="h-28 flex items-end justify-center gap-3.5 pt-4 px-2">
                                        {/* Bar 1: Violet (Cadangan Modal) */}
                                        <div className="flex-1 flex flex-col items-center gap-1.5">
                                            <div className="w-full h-16 rounded-t-md bg-gradient-to-t from-purple-600/50 to-purple-400/90 border-t border-purple-300" />
                                            <span className="text-[9px] font-mono text-zinc-400">QRIS</span>
                                        </div>

                                        {/* Bar 2: Cyan (Likuiditas Aktif Terbesar) */}
                                        <div className="flex-1 flex flex-col items-center gap-1.5 relative">
                                            <div className="w-full h-24 rounded-t-md bg-gradient-to-t from-blue-600/50 to-cyan-400/90 border-t-2 border-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]" />
                                            <span className="text-[9px] font-mono text-cyan-400 font-semibold">Bank</span>
                                        </div>

                                        {/* Bar 3: Emerald (EDC Kasir Sah) */}
                                        <div className="flex-1 flex flex-col items-center gap-1.5">
                                            <div className="w-full h-20 rounded-t-md bg-gradient-to-t from-emerald-600/50 to-emerald-400/80 border-t border-emerald-300" />
                                            <span className="text-[9px] font-mono text-zinc-400">EDC</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* WIDGET 2: GRAFIK BATANG POLA & TEKSTUR BULANAN (Sesuai Referensi Bawah) */}
                        <div className="rounded-2xl border border-white/10 bg-[#111116] p-5 sm:p-7 space-y-4 shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                                        Volume Transaksi & Tren Kohort Bulanan
                                    </h3>
                                    <div className="flex items-baseline gap-2.5 pt-1">
                                        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                                            {currentPeriodData.totalVolume}
                                        </span>
                                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                            {currentPeriodData.volumeGrowth}
                                        </span>
                                    </div>
                                </div>

                                {/* Legend Tekstur Batang Sesuai Desain & Psikologi Warna */}
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-sm bg-purple-500/70 border border-purple-400/50" />
                                        <span>Kohort Baru (Violet)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div
                                            className="w-3 h-3 rounded-sm border border-cyan-400/60"
                                            style={{
                                                backgroundImage:
                                                    'repeating-linear-gradient(45deg, #00E5FF 0, #00E5FF 2px, transparent 0, transparent 6px)',
                                            }}
                                        />
                                        <span>Arsir Kas (Cyan)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-sm bg-sky-500 border border-sky-400" />
                                        <span>Puncak Arus (Sky)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Interactive Bar Chart Canvas dengan Sumbu Y 0% - 100% */}
                            <div className="relative pt-7 pb-2">
                                {/* Hover Tooltip floating */}
                                {hoveredBar && (
                                    <div className="absolute top-0 right-4 z-20 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/15 text-xs text-white shadow-2xl flex items-center gap-2">
                                        <span className="font-semibold text-white">{hoveredBar.month}:</span>
                                        <span className="font-mono text-cyan-300 font-bold">{hoveredBar.nominal}</span>
                                        <span className="text-zinc-400 text-[11px]">({hoveredBar.volume})</span>
                                    </div>
                                )}

                                {/* Y-Axis Grid Lines & Percentage Labels */}
                                <div className="relative h-60 sm:h-72 flex flex-col justify-between pointer-events-none">
                                    {[100, 80, 60, 40, 20, 0].map((val) => (
                                        <div key={val} className="w-full flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-zinc-500 w-8 text-right shrink-0">
                                                {val}%
                                            </span>
                                            <div className="h-px w-full bg-white/[0.04]" />
                                        </div>
                                    ))}

                                    {/* Overlay Bars Container */}
                                    <div className="absolute inset-0 left-10 flex items-end justify-between gap-1.5 sm:gap-3 pointer-events-auto px-1 sm:px-3">
                                        {currentPeriodData.bars.map((bar) => {
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
                                                        className={`w-full max-w-[54px] rounded-t-sm transition-all duration-300 relative ${
                                                            isHovered ? 'brightness-125 scale-y-[1.03]' : ''
                                                        }`}
                                                    >
                                                        {/* 1. Gradient Violet */}
                                                        {bar.type === 'gradient-violet' && (
                                                            <div className="w-full h-full rounded-t-sm bg-gradient-to-t from-purple-900/60 to-purple-500/80 border-t-2 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]" />
                                                        )}

                                                        {/* 2. Hatched / Striped Cyan */}
                                                        {bar.type === 'hatched-cyan' && (
                                                            <div className="w-full h-full rounded-t-sm border border-cyan-400/40 relative overflow-hidden bg-cyan-950/20">
                                                                <div
                                                                    className="w-full h-full"
                                                                    style={{
                                                                        backgroundImage:
                                                                            'repeating-linear-gradient(45deg, #00E5FF 0, #00E5FF 2px, transparent 0, transparent 6px)',
                                                                    }}
                                                                />
                                                                <div className="absolute top-0 inset-x-0 h-1 bg-cyan-400 shadow-[0_0_6px_#00E5FF]" />
                                                            </div>
                                                        )}

                                                        {/* 3. Hatched Zinc */}
                                                        {bar.type === 'hatched-zinc' && (
                                                            <div className="w-full h-full rounded-t-sm border border-zinc-500/30 relative overflow-hidden bg-zinc-900/40">
                                                                <div
                                                                    className="w-full h-full"
                                                                    style={{
                                                                        backgroundImage:
                                                                            'repeating-linear-gradient(45deg, #71717a 0, #71717a 1.5px, transparent 0, transparent 6px)',
                                                                    }}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* 4. Solid Sky Blue */}
                                                        {bar.type === 'solid-sky' && (
                                                            <div className="w-full h-full rounded-t-sm bg-gradient-to-t from-blue-900/40 to-sky-500/70 border-t-2 border-sky-400" />
                                                        )}

                                                        {/* 5. Hatched Blue */}
                                                        {bar.type === 'hatched-blue' && (
                                                            <div className="w-full h-full rounded-t-sm border border-blue-400/40 relative overflow-hidden bg-blue-950/20">
                                                                <div
                                                                    className="w-full h-full"
                                                                    style={{
                                                                        backgroundImage:
                                                                            'repeating-linear-gradient(45deg, #60a5fa 0, #60a5fa 2.5px, transparent 0, transparent 6px)',
                                                                    }}
                                                                />
                                                                <div className="absolute top-0 inset-x-0 h-1 bg-blue-400" />
                                                            </div>
                                                        )}

                                                        {/* 6. Peak Sky (Active Glow Cap - Electric Cyan) */}
                                                        {bar.type === 'peak-sky' && (
                                                            <div className="w-full h-full rounded-t-sm bg-gradient-to-t from-blue-700/60 to-sky-400/90 border-t-2 border-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.4)] relative">
                                                                <div className="absolute -top-1 inset-x-0 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#00E5FF]" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Label Bulan */}
                                                    <span
                                                        className={`text-[10px] sm:text-xs font-mono pt-2.5 transition-colors ${
                                                            isHovered ? 'text-white font-bold' : 'text-zinc-500'
                                                        }`}
                                                    >
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

                    {/* ========================================================== */}
                    {/* KOLOM KANAN (5 Kolom): SLIDER TARGET, RETENSI, & DONUT     */}
                    {/* ========================================================== */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* WIDGET 3: TARGET REALISASI OPERASIONAL (Interactive Stepped Progress) */}
                        <div className="rounded-2xl border border-white/10 bg-[#111116] p-5 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <h3 className="text-sm font-bold text-white tracking-tight font-heading">
                                    Realisasi Target Operasional
                                </h3>

                                <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded-md font-mono">
                                    Klik titik untuk uji
                                </span>
                            </div>

                            {/* Interactive Stepped Progress Goal Slider (0% - 25% - 75% - 100%) */}
                            <div className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-400 font-medium text-[11px]">
                                        Pencapaian Target Arus Kas
                                    </span>
                                    <span className="font-mono text-emerald-400 font-bold text-xs flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-emerald-400" />
                                        <span>{selectedMilestone}% Tercapai</span>
                                    </span>
                                </div>

                                {/* Stepped Track Line with Interactive Markers */}
                                <div className="relative pt-1 pb-3">
                                    <div className="h-2.5 w-full rounded-full bg-zinc-900 border border-white/5 overflow-hidden">
                                        <div
                                            style={{ width: `${selectedMilestone}%` }}
                                            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                                        />
                                    </div>

                                    {/* Clickable Milestones */}
                                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2">
                                        {[0, 25, 75, 82, 100].map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setSelectedMilestone(m)}
                                                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                                    selectedMilestone === m
                                                        ? 'text-cyan-300 font-bold bg-cyan-500/10 border border-cyan-500/20'
                                                        : 'hover:text-white'
                                                }`}
                                            >
                                                {m}%
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3 Mini KPI Cards (Kasir Siaga, Pencairan Sah, Rata-rata Nota) */}
                                <div className="grid grid-cols-3 gap-2 pt-1">
                                    <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1 text-center hover:border-white/10 transition-colors">
                                        <div className="text-[10px] text-zinc-400 font-medium truncate flex items-center justify-center gap-1">
                                            <Store className="w-3 h-3 text-cyan-400" />
                                            <span>Kasir Siaga</span>
                                        </div>
                                        <div className="font-mono text-xs sm:text-sm font-bold text-white">
                                            120 / 150
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1 text-center hover:border-white/10 transition-colors">
                                        <div className="text-[10px] text-zinc-400 font-medium truncate flex items-center justify-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            <span>Pencairan Sah</span>
                                        </div>
                                        <div className="font-mono text-xs sm:text-sm font-bold text-white">
                                            45 / 60
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1 text-center hover:border-white/10 transition-colors">
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
                        <div className="rounded-2xl border border-white/10 bg-[#111116] p-5 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                <h3 className="text-sm font-bold text-white tracking-tight font-heading">
                                    Kesehatan Saldo & Alokasi Kas
                                </h3>
                                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Real-Time</span>
                                </span>
                            </div>

                            {/* Multi-Segmented Meter Bar (Psikologi: Amber Operasional, Violet Cadangan, Cyan Likuid) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                    <span>Alokasi Dana Usaha</span>
                                    <span className="font-mono text-zinc-300">100% Terpetakan</span>
                                </div>

                                {/* Segmented Bar with Color Identity */}
                                <div className="space-y-1.5">
                                    <div className="flex h-2.5 rounded-full overflow-hidden gap-1 bg-zinc-900 p-0.5 border border-white/5">
                                        <div
                                            className="h-full rounded-l-full bg-amber-500 w-[50%]"
                                            title="50% Operasional Kasir (Amber)"
                                        />
                                        <div
                                            className="h-full bg-indigo-500 w-[30%]"
                                            title="30% Cadangan Pajak (Violet)"
                                        />
                                        <div
                                            className="h-full rounded-r-full bg-cyan-400 w-[20%]"
                                            title="20% Saldo Mengendap Aman (Cyan)"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
                                        <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
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

                        {/* WIDGET 5: DISTRIBUSI SALURAN TRANSAKSI (Interactive Donut Breakdown) */}
                        <div className="rounded-2xl border border-white/10 bg-[#111116] p-5 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                <h3 className="text-sm font-bold text-white tracking-tight font-heading">
                                    3 Saluran Kasir Terbesar
                                </h3>
                                <span className="text-[10px] text-zinc-500 font-mono">Hari Ini</span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-1">
                                {/* Interactive Radial Donut Chart SVG */}
                                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
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
                                            stroke="#00E5FF"
                                            strokeWidth={activeChannel === 'qris' ? '13' : '10'}
                                            strokeDasharray="238.7"
                                            strokeDashoffset={238.7 * (1 - 0.55)}
                                            strokeLinecap="round"
                                            className="transition-all duration-300 cursor-pointer"
                                            onClick={() => setActiveChannel(activeChannel === 'qris' ? 'all' : 'qris')}
                                        />
                                        {/* Segment 2: Transfer Bank (30%) - Indigo */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="transparent"
                                            stroke="#818cf8"
                                            strokeWidth={activeChannel === 'bank' ? '13' : '10'}
                                            strokeDasharray="238.7"
                                            strokeDashoffset={238.7 * (1 - 0.3)}
                                            transform="rotate(198 50 50)"
                                            strokeLinecap="round"
                                            className="transition-all duration-300 cursor-pointer"
                                            onClick={() => setActiveChannel(activeChannel === 'bank' ? 'all' : 'bank')}
                                        />
                                        {/* Segment 3: EDC Kasir (15%) - Emerald */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="transparent"
                                            stroke="#34d399"
                                            strokeWidth={activeChannel === 'edc' ? '13' : '10'}
                                            strokeDasharray="238.7"
                                            strokeDashoffset={238.7 * (1 - 0.15)}
                                            transform="rotate(306 50 50)"
                                            strokeLinecap="round"
                                            className="transition-all duration-300 cursor-pointer"
                                            onClick={() => setActiveChannel(activeChannel === 'edc' ? 'all' : 'edc')}
                                        />
                                    </svg>

                                    {/* Dynamic Center Donut Metrics */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                        <span className="text-[10px] text-zinc-400 font-medium">
                                            {activeChannel === 'all'
                                                ? 'Total'
                                                : activeChannel === 'qris'
                                                ? 'QRIS'
                                                : activeChannel === 'bank'
                                                ? 'Bank'
                                                : 'EDC'}
                                        </span>
                                        <span className="text-xl font-extrabold font-mono text-white leading-none">
                                            {activeChannel === 'all'
                                                ? '431'
                                                : activeChannel === 'qris'
                                                ? '237'
                                                : activeChannel === 'bank'
                                                ? '129'
                                                : '65'}
                                        </span>
                                        <span className="text-[9px] text-zinc-500 pt-0.5">Transaksi</span>
                                    </div>
                                </div>

                                {/* Donut Legend with Interactive Channel Selectors */}
                                <div className="space-y-2 text-xs w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setActiveChannel(activeChannel === 'qris' ? 'all' : 'qris')}
                                        className={`w-full flex items-center justify-between sm:justify-start gap-3 p-1.5 rounded-lg transition-all cursor-pointer ${
                                            activeChannel === 'qris'
                                                ? 'bg-cyan-500/10 border border-cyan-500/30'
                                                : 'hover:bg-zinc-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00E5FF]" />
                                            <span className="text-zinc-300">QRIS Dinamis</span>
                                        </div>
                                        <span className="font-mono font-semibold text-white">237 tx</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveChannel(activeChannel === 'bank' ? 'all' : 'bank')}
                                        className={`w-full flex items-center justify-between sm:justify-start gap-3 p-1.5 rounded-lg transition-all cursor-pointer ${
                                            activeChannel === 'bank'
                                                ? 'bg-indigo-500/10 border border-indigo-500/30'
                                                : 'hover:bg-zinc-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
                                            <span className="text-zinc-300">Transfer Bank</span>
                                        </div>
                                        <span className="font-mono font-semibold text-white">129 tx</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveChannel(activeChannel === 'edc' ? 'all' : 'edc')}
                                        className={`w-full flex items-center justify-between sm:justify-start gap-3 p-1.5 rounded-lg transition-all cursor-pointer ${
                                            activeChannel === 'edc'
                                                ? 'bg-emerald-500/10 border border-emerald-500/30'
                                                : 'hover:bg-zinc-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                                            <span className="text-zinc-300">Mesin EDC</span>
                                        </div>
                                        <span className="font-mono font-semibold text-white">65 tx</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Footer Bar: Live Stream Ticker & Real-Time Sync Status */}
            <div className="px-4 sm:px-6 py-3 border-t border-white/5 bg-[#0a0a0d] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
                {/* Live Real-Time Transaction Ledger Ticker */}
                <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-zinc-500 text-[11px] font-mono shrink-0">[LIVE SYNC]</span>
                    <span className="text-zinc-300 text-xs truncate transition-all duration-300">
                        {LIVE_EVENTS[liveEventIndex].text}
                    </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500 shrink-0">
                    <span className="text-cyan-400 font-medium">Latensi: 0.04s</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">Integritas 100%</span>
                </div>
            </div>
        </div>
    );
};
