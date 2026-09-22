import React, { useState, useEffect } from 'react';
import {
    Calendar,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight,
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
    BarChart3,
    LineChart,
} from 'lucide-react';
import { BastionLogo } from '../common/BastionLogo';

type PeriodType = 'feb26' | 'jan26' | 'q1_26';
type ChannelType = 'all' | 'qris' | 'bank' | 'edc';
type ChartViewMode = 'curve' | 'bars';
type FlowCategory = 'all' | 'inflow' | 'outflow';

interface MonthDataPoint {
    month: string;
    label: string;
    percentage: number;
    nominal: string;
    volume: string;
    isSurplus: boolean;
    change: string;
    coordX: number;
    coordY: number; // for inflow / all
    outflowY: number; // for outflow
}

const MONTH_DATA_POINTS: MonthDataPoint[] = [
    { month: 'Jan', label: 'Januari', percentage: 38, nominal: 'Rp 395 Jt', volume: '6.940 tx', isSurplus: true, change: '+14%', coordX: 25, coordY: 165, outflowY: 180 },
    { month: 'Feb', label: 'Februari', percentage: 28, nominal: 'Rp 312 Jt', volume: '5.420 tx', isSurplus: false, change: '-8%', coordX: 75, coordY: 165, outflowY: 140 },
    { month: 'Mar', label: 'Maret', percentage: 48, nominal: 'Rp 420 Jt', volume: '7.110 tx', isSurplus: true, change: '+18%', coordX: 125, coordY: 120, outflowY: 130 },
    { month: 'Apr', label: 'April', percentage: 44, nominal: 'Rp 385 Jt', volume: '6.520 tx', isSurplus: false, change: '-4%', coordX: 175, coordY: 128, outflowY: 150 },
    { month: 'Mei', label: 'Mei', percentage: 68, nominal: 'Rp 580 Jt', volume: '9.810 tx', isSurplus: true, change: '+28%', coordX: 225, coordY: 80, outflowY: 160 },
    { month: 'Jun', label: 'Juni', percentage: 20, nominal: 'Rp 220 Jt', volume: '3.950 tx', isSurplus: false, change: '-24%', coordX: 275, coordY: 185, outflowY: 125 },
    { month: 'Jul', label: 'Juli', percentage: 56, nominal: 'Rp 490 Jt', volume: '8.450 tx', isSurplus: true, change: '+32%', coordX: 325, coordY: 130, outflowY: 145 },
    { month: 'Agu', label: 'Agustus (Puncak)', percentage: 88, nominal: 'Rp 864 Jt', volume: '15.140 tx', isSurplus: true, change: '+42%', coordX: 375, coordY: 72, outflowY: 170 },
    { month: 'Sep', label: 'September', percentage: 40, nominal: 'Rp 360 Jt', volume: '6.120 tx', isSurplus: false, change: '-12%', coordX: 425, coordY: 140, outflowY: 135 },
    { month: 'Okt', label: 'Oktober', percentage: 52, nominal: 'Rp 470 Jt', volume: '8.020 tx', isSurplus: true, change: '+16%', coordX: 475, coordY: 115, outflowY: 145 },
    { month: 'Nov', label: 'November', percentage: 82, nominal: 'Rp 780 Jt', volume: '13.900 tx', isSurplus: true, change: '+36%', coordX: 525, coordY: 65, outflowY: 155 },
    { month: 'Des', label: 'Desember', percentage: 60, nominal: 'Rp 540 Jt', volume: '9.450 tx', isSurplus: true, change: '+10%', coordX: 575, coordY: 105, outflowY: 140 },
];

const PERIOD_METRICS: Record<
    PeriodType,
    {
        label: string;
        dateRange: string;
        targetNominal: string;
        growthBadge: string;
        growthSub: string;
        totalVolume: string;
        volumeGrowth: string;
        peakMonth: string;
        peakNominal: string;
        yAxisInflow: string[];
        yAxisOutflow: string[];
    }
> = {
    feb26: {
        label: 'Feb 2026',
        dateRange: '01 Feb - 28 Feb 2026',
        targetNominal: 'Rp 864.250.000',
        growthBadge: '+12.4%',
        growthSub: 'Surplus vs bulan lalu',
        totalVolume: '15.140',
        volumeGrowth: '+32% volume kasir',
        peakMonth: 'Agu',
        peakNominal: 'Rp 864 Jt',
        yAxisInflow: ['1 M', '750 Jt', '500 Jt', '250 Jt', '0 Jt'],
        yAxisOutflow: ['600 Jt', '450 Jt', '300 Jt', '150 Jt', '0 Jt'],
    },
    jan26: {
        label: 'Jan 2026',
        dateRange: '01 Jan - 31 Jan 2026',
        targetNominal: 'Rp 768.800.000',
        growthBadge: '+9.8%',
        growthSub: 'Surplus vs Des 2025',
        totalVolume: '13.480',
        volumeGrowth: '+18% volume kasir',
        peakMonth: 'Jul',
        peakNominal: 'Rp 768 Jt',
        yAxisInflow: ['900 Jt', '675 Jt', '450 Jt', '225 Jt', '0 Jt'],
        yAxisOutflow: ['500 Jt', '375 Jt', '250 Jt', '125 Jt', '0 Jt'],
    },
    q1_26: {
        label: 'Kuartal 1 (Q1)',
        dateRange: '01 Jan - 31 Mar 2026',
        targetNominal: 'Rp 2.450.000.000',
        growthBadge: '+28.6%',
        growthSub: 'Surplus vs Q4 2025',
        totalVolume: '42.600',
        volumeGrowth: '+41% volume kasir',
        peakMonth: 'Agu',
        peakNominal: 'Rp 2.45 M',
        yAxisInflow: ['3.0 M', '2.25 M', '1.5 M', '750 Jt', '0 M'],
        yAxisOutflow: ['1.8 M', '1.35 M', '900 Jt', '450 Jt', '0 M'],
    },
};

interface ChannelDetail {
    id: 'qris' | 'bank' | 'edc';
    name: string;
    nominal: string;
    txCount: string;
    share: number;
    dotColor: string;
    barColor: string;
    borderColor: string;
    glowColor: string;
}

const CHANNELS_DATA: Record<PeriodType, ChannelDetail[]> = {
    feb26: [
        {
            id: 'qris',
            name: 'QRIS Dinamis',
            nominal: 'Rp 475.300.000',
            txCount: '237 tx',
            share: 55,
            dotColor: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
            barColor: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
            borderColor: 'border-emerald-500/40',
            glowColor: 'shadow-[0_0_18px_rgba(16,185,129,0.15)]',
        },
        {
            id: 'bank',
            name: 'Transfer Bank',
            nominal: 'Rp 259.250.000',
            txCount: '129 tx',
            share: 30,
            dotColor: 'bg-indigo-400 shadow-[0_0_8px_#818cf8]',
            barColor: 'bg-gradient-to-r from-indigo-600 to-indigo-400',
            borderColor: 'border-indigo-500/40',
            glowColor: 'shadow-[0_0_18px_rgba(129,140,248,0.15)]',
        },
        {
            id: 'edc',
            name: 'Mesin EDC',
            nominal: 'Rp 129.700.000',
            txCount: '65 tx',
            share: 15,
            dotColor: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
            barColor: 'bg-gradient-to-r from-amber-600 to-amber-400',
            borderColor: 'border-amber-500/40',
            glowColor: 'shadow-[0_0_18px_rgba(245,158,11,0.15)]',
        },
    ],
    jan26: [
        {
            id: 'qris',
            name: 'QRIS Dinamis',
            nominal: 'Rp 399.700.000',
            txCount: '202 tx',
            share: 52,
            dotColor: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
            barColor: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
            borderColor: 'border-emerald-500/40',
            glowColor: 'shadow-[0_0_18px_rgba(16,185,129,0.15)]',
        },
        {
            id: 'bank',
            name: 'Transfer Bank',
            nominal: 'Rp 253.700.000',
            txCount: '131 tx',
            share: 33,
            dotColor: 'bg-indigo-400 shadow-[0_0_8px_#818cf8]',
            barColor: 'bg-gradient-to-r from-indigo-600 to-indigo-400',
            borderColor: 'border-indigo-500/40',
            glowColor: 'shadow-[0_0_18px_rgba(129,140,248,0.15)]',
        },
        {
            id: 'edc',
            name: 'Mesin EDC',
            nominal: 'Rp 115.400.000',
            txCount: '58 tx',
            share: 15,
            dotColor: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
            barColor: 'bg-gradient-to-r from-amber-600 to-amber-400',
            borderColor: 'border-amber-500/40',
            glowColor: 'shadow-[0_0_18px_rgba(245,158,11,0.15)]',
        },
    ],
    q1_26: [
        {
            id: 'qris',
            name: 'QRIS Dinamis',
            nominal: 'Rp 1.347.500.000',
            txCount: '685 tx',
            share: 55,
            dotColor: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
            barColor: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
            borderColor: 'border-emerald-500/40',
            glowColor: 'shadow-[0_0_18px_rgba(16,185,129,0.15)]',
        },
        {
            id: 'bank',
            name: 'Transfer Bank',
            nominal: 'Rp 735.000.000',
            txCount: '372 tx',
            share: 30,
            dotColor: 'bg-indigo-400 shadow-[0_0_8px_#818cf8]',
            barColor: 'bg-gradient-to-r from-indigo-600 to-indigo-400',
            borderColor: 'border-indigo-500/40',
            glowColor: 'shadow-[0_0_18px_rgba(129,140,248,0.15)]',
        },
        {
            id: 'edc',
            name: 'Mesin EDC',
            nominal: 'Rp 367.500.000',
            txCount: '185 tx',
            share: 15,
            dotColor: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
            barColor: 'bg-gradient-to-r from-amber-600 to-amber-400',
            borderColor: 'border-amber-500/40',
            glowColor: 'shadow-[0_0_18px_rgba(245,158,11,0.14)]',
        },
    ],
};

const LIVE_EVENTS = [
    { text: 'Baru saja: QRIS Kasir Toko +Rp 450.000 tervalidasi otomatis', isSurplus: true },
    { text: '3 detik lalu: Transfer Antar Bank +Rp 12.500.000 tercatat dalam buku besar', isSurplus: true },
    { text: '6 detik lalu: Beban Operasional Logistik -Rp 1.250.000 dipotong seimbang', isSurplus: false },
    { text: '10 detik lalu: Mesin EDC Kasir #2 menyelesaikan kliring Rp 850.000', isSurplus: true },
    { text: '14 detik lalu: Rekonsiliasi cabang Jakarta seimbang (Nol Selisih)', isSurplus: true },
];

export const DashboardStatisticsPreview: React.FC = () => {
    // Dynamic interactive states
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('feb26');
    const [chartMode, setChartViewMode] = useState<ChartViewMode>('curve');
    const [flowCategory, setFlowCategory] = useState<FlowCategory>('all');
    const [activeRailTab, setActiveRailTab] = useState<'overview' | 'analytics' | 'wallets' | 'security' | 'settings'>('overview');
    const [activeHoverPoint, setActiveHoverPoint] = useState<MonthDataPoint>(MONTH_DATA_POINTS[7]);
    const [selectedMilestone, setSelectedMilestone] = useState<number>(82);
    const [activeChannel, setActiveChannel] = useState<ChannelType>('all');
    const [liveEventIndex, setLiveEventIndex] = useState<number>(0);

    const currentPeriod = PERIOD_METRICS[selectedPeriod];
    const currentChannels = CHANNELS_DATA[selectedPeriod];
    const currentSelectedChannel = currentChannels.find((c) => c.id === activeChannel);

    // Cycle simulated real-time ledger ticker events smoothly
    useEffect(() => {
        const interval = setInterval(() => {
            setLiveEventIndex((prev) => (prev + 1) % LIVE_EVENTS.length);
        }, 3800);
        return () => clearInterval(interval);
    }, []);

    // Full-Width Dynamic Polyline Paths (Photo 2 Financial Volatility: High Peaks, Deep Valleys & Apex Needle)
    const isInflowView = flowCategory !== 'outflow';

    const splineAreaPathInflow =
        'M 0,165 L 25,165 L 50,145 L 75,165 L 125,120 L 175,128 L 225,80 L 275,185 L 325,130 L 355,40 L 375,72 L 395,155 L 425,140 L 475,115 L 500,135 L 525,65 L 575,105 L 600,110 L 600,220 L 0,220 Z';

    const splineStrokePathInflow =
        'M 0,165 L 25,165 L 50,145 L 75,165 L 125,120 L 175,128 L 225,80 L 275,185 L 325,130 L 355,40 L 375,72 L 395,155 L 425,140 L 475,115 L 500,135 L 525,65 L 575,105 L 600,110';

    const splineAreaPathOutflow =
        'M 0,185 L 25,180 L 50,175 L 75,140 L 125,130 L 175,150 L 225,160 L 275,125 L 325,145 L 355,165 L 375,170 L 395,160 L 425,135 L 475,145 L 500,130 L 525,155 L 575,140 L 600,140 L 600,220 L 0,220 Z';

    const splineStrokePathOutflow =
        'M 0,185 L 25,180 L 50,175 L 75,140 L 125,130 L 175,150 L 225,160 L 275,125 L 325,145 L 355,165 L 375,170 L 395,160 L 425,135 L 475,145 L 500,130 L 525,155 L 575,140 L 600,140';

    const activeAreaPath = isInflowView ? splineAreaPathInflow : splineAreaPathOutflow;
    const activeStrokePath = isInflowView ? splineStrokePathInflow : splineStrokePathOutflow;
    const activeCurrentY = isInflowView ? activeHoverPoint.coordY : activeHoverPoint.outflowY;

    return (
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0c0c10]/95 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] ring-1 ring-white/5 overflow-hidden text-left flex flex-col">
            {/* SVG Global Pattern Definitions for Emotional Colors & Texture (Pure Green & Red) */}
            <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
                <defs>
                    {/* Diagonal Hatched Stripe - Rose/Crimson (Beban Kas / Koreksi) */}
                    <pattern
                        id="hatch-rose"
                        width="8"
                        height="8"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                    >
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#f43f5e" strokeWidth="2.5" opacity="0.85" />
                    </pattern>

                    {/* Gradient Area Spline - Emerald Green (Surplus Kas) */}
                    <linearGradient id="spline-emerald-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                        <stop offset="65%" stopColor="#10b981" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Gradient Area Spline - Rose Crimson (Beban Kas) */}
                    <linearGradient id="spline-rose-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
                        <stop offset="65%" stopColor="#f43f5e" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Vertical Spotlight Beam Gradient - Emerald Green (Foto 2 Pillar Highlight) */}
                    <linearGradient id="beam-emerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                        <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Vertical Spotlight Beam Gradient - Rose Crimson */}
                    <linearGradient id="beam-rose" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
                        <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                    </linearGradient>
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

                        {/* Logo Resmi Bastion */}
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

                {/* Top Right: Period Selector Pills (Feb 2026, Jan 2026, Q1) */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-[11px] text-zinc-500 font-mono hidden xs:inline">Periode:</span>
                    <div className="p-0.5 rounded-lg bg-zinc-900/90 border border-white/10 flex items-center gap-0.5">
                        {(['feb26', 'jan26', 'q1_26'] as PeriodType[]).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setSelectedPeriod(p)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-all cursor-pointer ${
                                    selectedPeriod === p
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {PERIOD_METRICS[p].label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. Main Workbench Shell (Left Rail Navigation + Broad Center/Right Analytics) */}
            <div className="flex flex-1 min-h-0">
                {/* ============================================================== */}
                {/* LEFT MINI-RAIL NAVIGATION (Sesuai Referensi Ikon Vertikal)      */}
                {/* ============================================================== */}
                <div className="hidden md:flex flex-col items-center justify-between w-14 lg:w-16 py-5 border-r border-white/5 bg-[#09090d]/80 shrink-0">
                    <div className="flex flex-col items-center gap-4 w-full px-2">
                        {/* Top Active App Icon */}
                        <button
                            type="button"
                            onClick={() => setActiveRailTab('overview')}
                            className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.35)] cursor-pointer hover:scale-105 transition-transform"
                            title="Ringkasan Eksekutif"
                        >
                            <LayoutGrid className="w-4 h-4 text-white" />
                        </button>

                        <div className="h-px w-6 bg-white/10 my-1" />

                        <button
                            type="button"
                            onClick={() => setActiveRailTab('analytics')}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                activeRailTab === 'analytics'
                                    ? 'bg-zinc-800 text-emerald-300 border border-emerald-500/30 shadow-sm'
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

                    <div className="flex flex-col items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sistem Aktif" />
                    </div>
                </div>

                {/* ============================================================== */}
                {/* CENTER & RIGHT CONTENT: DUAL COLUMN EXPANSIVE WORKBENCH        */}
                {/* ============================================================== */}
                <div className="flex-1 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* ========================================================== */}
                    {/* KOLOM KIRI (7 Kolom): STATISTIK TARGET & KURVA GARIS FOTO 2 */}
                    {/* ========================================================== */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* WIDGET 1: TARGET PERTUMBUHAN ARUS KAS (Komparasi Murni Hijau & Merah) */}
                        <div className="rounded-2xl border border-white/10 bg-[#111116] p-5 sm:p-7 relative overflow-hidden shadow-xl">
                            {/* Ambient Glow Psikologis: Hijau Emerald untuk Surplus Kas */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/5 relative z-10">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                                        Target Pertumbuhan Arus Kas
                                    </h3>
                                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono">
                                        Surplus Berjalan
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
                                {/* Giant Nominal & Growth Rate (Responsif & Padat 1 Baris Utuh) */}
                                <div className="space-y-2.5 min-w-0 flex-1">
                                    <div className="text-2xl sm:text-3xl xl:text-4xl font-extrabold font-mono text-white tracking-tight whitespace-nowrap">
                                        {currentPeriod.targetNominal}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                                            <span>
                                                {currentPeriod.growthBadge} {currentPeriod.growthSub}
                                            </span>
                                        </span>
                                    </div>

                                    <div className="pt-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-white/5 text-xs text-zinc-400">
                                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                            <span className="text-[11px] text-zinc-500 font-medium">Periode:</span>
                                            <span className="font-mono text-zinc-200 font-medium text-[11px]">
                                                {currentPeriod.dateRange}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sub-Visual Kanan: Komparasi Murni Kas Masuk (Hijau) vs Beban (Merah) vs Bersih */}
                                <div className="bg-[#14141c] rounded-xl border border-white/5 p-4 sm:w-60 shrink-0 relative">
                                    <div className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center justify-between">
                                        <span>Rasio Kas Nyata</span>
                                        <span className="text-[10px] text-emerald-400 font-mono font-medium">Sehat ✓</span>
                                    </div>

                                    {/* Floating Tooltip Pill */}
                                    <div className="absolute top-10 right-4 sm:right-6 z-20 pointer-events-none">
                                        <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-emerald-500/30 text-[10px] font-medium text-emerald-300 shadow-xl flex items-center gap-1.5 relative">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span>Surplus Bersih: Rp 864 Jt</span>
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-emerald-500/30 rotate-45" />
                                        </div>
                                    </div>

                                    {/* 3 Mini Bars: Hijau (Kas Masuk) vs Merah (Beban) vs Bersih (Hijau Mint) */}
                                    <div className="h-28 flex items-end justify-center gap-3.5 pt-4 px-2">
                                        {/* Bar 1: Hijau Emerald (Uang Masuk) */}
                                        <div className="flex-1 flex flex-col items-center gap-1.5" title="Kas Masuk Kotor: Rp 1.42 M">
                                            <div className="w-full h-22 rounded-t-md bg-gradient-to-t from-emerald-700/50 to-emerald-400/90 border-t-2 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                            <span className="text-[9px] font-mono text-emerald-400 font-bold">Masuk</span>
                                        </div>

                                        {/* Bar 2: Merah Rose (Beban Kas Keluar) */}
                                        <div className="flex-1 flex flex-col items-center gap-1.5" title="Beban Keluar: -Rp 555 Jt">
                                            <div className="w-full h-12 rounded-t-md bg-gradient-to-t from-rose-900/60 to-rose-500/80 border-t border-rose-400/80" />
                                            <span className="text-[9px] font-mono text-rose-400 font-semibold">Beban</span>
                                        </div>

                                        {/* Bar 3: Bersih (Hijau Terang) */}
                                        <div className="flex-1 flex flex-col items-center gap-1.5" title="Saldo Bersih: Rp 864 Jt">
                                            <div className="w-full h-18 rounded-t-md bg-gradient-to-t from-emerald-600/40 to-emerald-300/80 border-t-2 border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]" />
                                            <span className="text-[9px] font-mono text-emerald-300 font-bold">Bersih</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ====================================================== */}
                        {/* WIDGET 2: AREA CURVE CHART (FOTO KEDUA) & EMOTIONAL TOGGLE */}
                        {/* ====================================================== */}
                        <div className="rounded-2xl border border-white/10 bg-[#111116] p-5 sm:p-7 space-y-4 shadow-xl relative overflow-hidden">
                            {/* Header Widget 2: Tab Kategori Sesuai Foto 2 + Saklar Mode */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading flex items-center gap-2">
                                        <span>Arus Kas Bulanan & Dinamika Fluktuasi</span>
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 pt-0.5">
                                        Pergerakan pasang surut uang masuk dan efisiensi pengeluaran usaha.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Category Filter Tabs (Sesuai Foto 2) */}
                                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900 border border-white/5 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setFlowCategory('all')}
                                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                                                flowCategory === 'all'
                                                    ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                                                    : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            Semua Arus
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFlowCategory('inflow')}
                                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1 ${
                                                flowCategory === 'inflow'
                                                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                                                    : 'text-zinc-400 hover:text-emerald-300'
                                            }`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span>Masuk</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFlowCategory('outflow')}
                                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1 ${
                                                flowCategory === 'outflow'
                                                    ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                                                    : 'text-zinc-400 hover:text-rose-300'
                                            }`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                            <span>Beban</span>
                                        </button>
                                    </div>

                                    {/* Saklar Tampilan Cepat: Kurva Garis (Foto 2) vs Batang Emosional */}
                                    <div className="p-0.5 rounded-lg bg-zinc-900 border border-white/10 flex items-center gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setChartViewMode('curve')}
                                            className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                                chartMode === 'curve'
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                                                    : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                            title="Tampilan Kurva Garis (Foto 2)"
                                        >
                                            <LineChart className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChartViewMode('bars')}
                                            className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                                chartMode === 'bars'
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                                                    : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                            title="Tampilan Batang Emosional (Hijau vs Merah)"
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Metrik Nilai Utama di Atas Grafik */}
                            <div className="flex flex-wrap items-baseline gap-3 pt-1">
                                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                                    {activeHoverPoint.nominal}
                                </span>
                                <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                        activeHoverPoint.isSurplus
                                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                            : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                    }`}
                                >
                                    {activeHoverPoint.isSurplus ? (
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    ) : (
                                        <ArrowDownRight className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                        {activeHoverPoint.change} ({activeHoverPoint.isSurplus ? 'Surplus' : 'Beban Terkendali'})
                                    </span>
                                </span>
                                <span className="text-xs text-zinc-500 font-mono">
                                    • {activeHoverPoint.label} ({activeHoverPoint.volume})
                                </span>
                            </div>

                            {/* ============================================================== */}
                            {/* TAMPILAN 1: KURVA GARIS AREA KONTINYU (PERSIS FOTO KEDUA)       */}
                            {/* ============================================================== */}
                            {chartMode === 'curve' ? (
                                <div className="relative pt-6 pb-2">
                                    {/* Sumbu Y Dinamis Sesuai Periode & Kategori Arus Kas (Menyesuaikan Otomatis) */}
                                    <div className="relative h-60 sm:h-72 flex flex-col justify-between pointer-events-none">
                                        {(isInflowView ? currentPeriod.yAxisInflow : currentPeriod.yAxisOutflow).map((val) => (
                                            <div key={val} className="w-full flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-zinc-500 w-11 text-right shrink-0">
                                                    {val}
                                                </span>
                                                <div className="h-px w-full bg-white/[0.04]" />
                                            </div>
                                        ))}

                                        {/* SVG Curve Canvas dengan Full-Width Dynamic Polyline & Spotlight Beam (Foto 2) */}
                                        <div className="absolute inset-0 left-13 right-0 pointer-events-auto">
                                            {/* Floating Apex Tooltip Pill (Persis Desain Tooltip Foto 2) */}
                                            <div
                                                style={{
                                                    left: `${(activeHoverPoint.coordX / 600) * 100}%`,
                                                    top: `${(activeCurrentY / 220) * 100}%`,
                                                }}
                                                className="absolute -translate-x-1/2 -translate-y-[135%] z-20 pointer-events-none"
                                            >
                                                <div className="px-3.5 py-1.5 rounded-lg bg-[#16161f] border border-white/20 text-xs text-white shadow-[0_12px_32px_rgba(0,0,0,0.95)] flex flex-col items-center relative backdrop-blur-md">
                                                    <span className="font-mono font-extrabold text-sm text-white tracking-tight">
                                                        {activeHoverPoint.nominal}
                                                    </span>
                                                    <span
                                                        className={`text-[9px] font-semibold font-mono ${
                                                            isInflowView
                                                                ? 'text-emerald-400'
                                                                : 'text-rose-400'
                                                        }`}
                                                    >
                                                        {activeHoverPoint.label}: {isInflowView ? 'Surplus' : 'Beban'} ({activeHoverPoint.change})
                                                    </span>

                                                    {/* Triangle pointer downward pointing straight to apex node */}
                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#16161f] border-r border-b border-white/20 rotate-45" />
                                                </div>
                                            </div>

                                            <svg
                                                viewBox="0 0 600 220"
                                                className="w-full h-full overflow-visible"
                                                preserveAspectRatio="none"
                                            >
                                                {/* Vertical Spotlight Beam Column (Persis Balok Sorot Cahaya di Foto 2) */}
                                                <rect
                                                    x={activeHoverPoint.coordX - 10}
                                                    y={activeCurrentY}
                                                    width="20"
                                                    height={220 - activeCurrentY}
                                                    fill={isInflowView ? 'url(#beam-emerald)' : 'url(#beam-rose)'}
                                                    rx="3"
                                                    className="pointer-events-none"
                                                />

                                                {/* Vertical Indicator Center Line (Garis putus-putus presisi di tengah pilar) */}
                                                <line
                                                    x1={activeHoverPoint.coordX}
                                                    y1={activeCurrentY}
                                                    x2={activeHoverPoint.coordX}
                                                    y2="220"
                                                    stroke={isInflowView ? '#10b981' : '#f43f5e'}
                                                    strokeDasharray="3 3"
                                                    strokeWidth="1.5"
                                                    opacity="0.65"
                                                />

                                                {/* Area Dynamic Gradient Fill (Edge to edge x=0 to x=600) */}
                                                <path
                                                    d={activeAreaPath}
                                                    fill={isInflowView ? 'url(#spline-emerald-glow)' : 'url(#spline-rose-glow)'}
                                                    className="transition-all duration-300"
                                                />

                                                {/* Dynamic Financial Stroke Line (Murni Hijau Emerald atau Merah Rose) */}
                                                <path
                                                    d={activeStrokePath}
                                                    fill="none"
                                                    stroke={isInflowView ? '#10b981' : '#f43f5e'}
                                                    strokeWidth="2.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="transition-all duration-300"
                                                />

                                                {/* Interactive Point Nodes across 12 Months (No jitter, seamless tracking) */}
                                                {MONTH_DATA_POINTS.map((pt) => {
                                                    const isActive = activeHoverPoint.month === pt.month;
                                                    const pointY = isInflowView ? pt.coordY : pt.outflowY;

                                                    return (
                                                        <g
                                                            key={pt.month}
                                                            onClick={() => setActiveHoverPoint(pt)}
                                                            onMouseEnter={() => setActiveHoverPoint(pt)}
                                                            className="cursor-pointer"
                                                        >
                                                            {/* Broad vertical hover hit target for seamless gapless mouseover */}
                                                            <rect
                                                                x={pt.coordX - 25}
                                                                y="0"
                                                                width="50"
                                                                height="220"
                                                                fill="transparent"
                                                            />

                                                            {/* Active subtle static halo ring */}
                                                            {isActive && (
                                                                <circle
                                                                    cx={pt.coordX}
                                                                    cy={pointY}
                                                                    r="8"
                                                                    fill={isInflowView ? '#10b981' : '#f43f5e'}
                                                                    opacity="0.35"
                                                                />
                                                            )}

                                                            {/* Point Dot: Crisp, stable white node with active ring */}
                                                            <circle
                                                                cx={pt.coordX}
                                                                cy={pointY}
                                                                r={isActive ? '5' : '3.5'}
                                                                fill={isActive ? '#ffffff' : '#18181b'}
                                                                stroke={isActive ? (isInflowView ? '#10b981' : '#f43f5e') : 'rgba(255,255,255,0.45)'}
                                                                strokeWidth="2"
                                                            />
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Sumbu X Label Bulan Interaktif (Jan, Feb, Mar, Apr...) */}
                                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-3 pl-13 pr-2">
                                        {MONTH_DATA_POINTS.map((pt) => {
                                            const isActive = activeHoverPoint.month === pt.month;
                                            return (
                                                <button
                                                    key={pt.month}
                                                    type="button"
                                                    onClick={() => setActiveHoverPoint(pt)}
                                                    onMouseEnter={() => setActiveHoverPoint(pt)}
                                                    className={`transition-colors cursor-pointer py-1 px-1.5 rounded ${
                                                        isActive
                                                            ? 'text-white font-bold bg-white/10'
                                                            : 'hover:text-zinc-300'
                                                    }`}
                                                >
                                                    {pt.month}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* ============================================================== */
                                /* TAMPILAN 2: GRAFIK BATANG EMOSIONAL (HIJAU SURPLUS VS MERAH BEBAN) */
                                /* ============================================================== */
                                <div className="relative pt-6 pb-2">
                                    <div className="relative h-60 sm:h-72 flex flex-col justify-between pointer-events-none">
                                        {[100, 80, 60, 40, 20, 0].map((val) => (
                                            <div key={val} className="w-full flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-zinc-500 w-8 text-right shrink-0">
                                                    {val}%
                                                </span>
                                                <div className="h-px w-full bg-white/[0.04]" />
                                            </div>
                                        ))}

                                        {/* Overlay Bars Container (Warna Emosional Murni) */}
                                        <div className="absolute inset-0 left-10 flex items-end justify-between gap-1.5 sm:gap-3 pointer-events-auto px-1 sm:px-3">
                                            {MONTH_DATA_POINTS.map((bar) => {
                                                const isHovered = activeHoverPoint.month === bar.month;

                                                return (
                                                    <div
                                                        key={bar.month}
                                                        onMouseEnter={() => setActiveHoverPoint(bar)}
                                                        onClick={() => setActiveHoverPoint(bar)}
                                                        className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                                                    >
                                                        <div
                                                            style={{ height: `${bar.percentage}%` }}
                                                            className={`w-full max-w-[54px] rounded-t-md transition-all duration-300 relative ${
                                                                isHovered ? 'brightness-125' : ''
                                                            }`}
                                                        >
                                                            {/* Batang Hijau Emerald: Bulan Surplus Omzet */}
                                                            {bar.isSurplus ? (
                                                                <div className="w-full h-full rounded-t-md bg-gradient-to-t from-emerald-950/40 via-emerald-600/70 to-emerald-400 border-t-2 border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] relative" />
                                                            ) : (
                                                                /* Batang Merah Rose/Crimson: Bulan Beban / Koreksi Kas */
                                                                <div className="w-full h-full rounded-t-md border border-rose-500/50 relative overflow-hidden bg-rose-950/25">
                                                                    <div
                                                                        className="w-full h-full"
                                                                        style={{
                                                                            backgroundImage:
                                                                                'repeating-linear-gradient(45deg, #f43f5e 0, #f43f5e 2px, transparent 0, transparent 6px)',
                                                                        }}
                                                                    />
                                                                    <div className="absolute top-0 inset-x-0 h-1 bg-rose-400" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Label Bulan & Badge Emosional */}
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

                                    {/* Legend Emosional */}
                                    <div className="flex items-center justify-center gap-5 pt-3 text-[11px]">
                                        <div className="flex items-center gap-1.5 text-emerald-400">
                                            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                                            <span>Bulan Surplus (Uang Masuk Bertambah)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-rose-400">
                                            <div className="w-2.5 h-2.5 rounded-sm bg-rose-500/80 border border-rose-400" />
                                            <span>Bulan Beban (Koreksi / Biaya Operasional)</span>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                    Klik titik uji
                                </span>
                            </div>

                            {/* Interactive Stepped Progress Goal Slider (0% - 25% - 75% - 82% - 100%) */}
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

                                {/* Stepped Track Line with Interactive Markers (Emerald Surplus Progress) */}
                                <div className="relative pt-1 pb-3">
                                    <div className="h-2.5 w-full rounded-full bg-zinc-900 border border-white/5 overflow-hidden">
                                        <div
                                            style={{ width: `${selectedMilestone}%` }}
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
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
                                                        ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/30'
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
                                            <Store className="w-3 h-3 text-emerald-400" />
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

                        {/* WIDGET 4: KESEHATAN RETENSI & LIKUIDITAS KAS */}
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

                            {/* Multi-Segmented Meter Bar (Psikologi: Amber Operasional, Violet Cadangan, Emerald Surplus) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                    <span>Alokasi Dana Usaha</span>
                                    <span className="font-mono text-zinc-300">100% Terpetakan</span>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex h-2.5 rounded-full overflow-hidden gap-1 bg-zinc-900 p-0.5 border border-white/5">
                                        <div
                                            className="h-full rounded-l-full bg-amber-500 w-[50%]"
                                            title="50% Operasional Kasir (Amber)"
                                        />
                                        <div
                                            className="h-full bg-zinc-600 w-[30%]"
                                            title="30% Cadangan Pajak (Abu-abu / Slate)"
                                        />
                                        <div
                                            className="h-full rounded-r-full bg-emerald-400 w-[20%]"
                                            title="20% Laba Bersih Aman (Emerald)"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
                                        <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            <span>50% Operasional</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                            <span>30% Cadangan</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span>20% Surplus</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Health Summary Table */}
                            <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span>Arus Kas Masuk Kotor</span>
                                    <span className="font-mono font-medium text-emerald-400">+Rp 1.420.000.000</span>
                                </div>
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span>Beban Pokok & Operasional</span>
                                    <span className="font-mono font-medium text-rose-400">-Rp 555.750.000</span>
                                </div>
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span>Tingkat Retensi Dana</span>
                                    <span className="font-mono font-bold text-emerald-400">97.2%</span>
                                </div>
                                <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-white/5">
                                    <span className="font-semibold text-zinc-200">Saldo Cadangan Bersih</span>
                                    <span className="font-mono font-bold text-emerald-300">Rp 864.250.000</span>
                                </div>
                            </div>
                        </div>

                        {/* WIDGET 5: DISTRIBUSI SALURAN TRANSAKSI (Interactive Donut Breakdown - Chart Burger) */}
                        <div className="rounded-2xl border border-white/10 bg-[#111116] p-6 space-y-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                                        3 Saluran Kasir Terbesar
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 pt-0.5">
                                        Porsi penerimaan dana riil per kanal kasir periode {currentPeriod.label}.
                                    </p>
                                </div>
                                <span className="text-[10px] text-zinc-300 font-mono px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10">
                                    {currentPeriod.label}
                                </span>
                            </div>

                            <div className="flex flex-col lg:flex-row items-center justify-around gap-8 pt-2">
                                {/* Interactive Radial Donut Chart SVG (Diperbesar & Tegas) */}
                                <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center shrink-0">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="transparent"
                                            stroke="#18181b"
                                            strokeWidth="11"
                                        />
                                        {/* Segment 1: QRIS (55%) - Hijau Emerald */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="transparent"
                                            stroke="#10b981"
                                            strokeWidth={activeChannel === 'qris' ? '14' : '11'}
                                            strokeDasharray="238.7"
                                            strokeDashoffset={238.7 * (1 - (currentChannels[0]?.share || 55) / 100)}
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
                                            strokeWidth={activeChannel === 'bank' ? '14' : '11'}
                                            strokeDasharray="238.7"
                                            strokeDashoffset={238.7 * (1 - (currentChannels[1]?.share || 30) / 100)}
                                            transform="rotate(198 50 50)"
                                            strokeLinecap="round"
                                            className="transition-all duration-300 cursor-pointer"
                                            onClick={() => setActiveChannel(activeChannel === 'bank' ? 'all' : 'bank')}
                                        />
                                        {/* Segment 3: EDC Kasir (15%) - Amber */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="transparent"
                                            stroke="#f59e0b"
                                            strokeWidth={activeChannel === 'edc' ? '14' : '11'}
                                            strokeDasharray="238.7"
                                            strokeDashoffset={238.7 * (1 - (currentChannels[2]?.share || 15) / 100)}
                                            transform="rotate(306 50 50)"
                                            strokeLinecap="round"
                                            className="transition-all duration-300 cursor-pointer"
                                            onClick={() => setActiveChannel(activeChannel === 'edc' ? 'all' : 'edc')}
                                        />
                                    </svg>

                                    {/* Dynamic Center Donut Metrics */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                                        <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">
                                            {activeChannel === 'all'
                                                ? 'Total Kasir'
                                                : currentSelectedChannel?.name || 'Kanal'}
                                        </span>
                                        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white leading-none tracking-tight py-1 whitespace-nowrap">
                                            {activeChannel === 'all'
                                                ? `${currentChannels.reduce((acc, c) => acc + parseInt(c.txCount), 0)} tx`
                                                : currentSelectedChannel?.txCount || ''}
                                        </span>
                                        <span className="text-[10px] font-mono text-emerald-400 font-semibold truncate max-w-full">
                                            {activeChannel === 'all'
                                                ? currentPeriod.peakNominal
                                                : currentSelectedChannel?.nominal}
                                        </span>
                                    </div>
                                </div>

                                {/* Modern Financial Channel Breakdown List (UI/UX Friendly, Anti-Wrap, Real Nominals) */}
                                <div className="space-y-3 w-full sm:flex-1 max-w-sm">
                                    {currentChannels.map((ch) => {
                                        const isSelected = activeChannel === ch.id;
                                        return (
                                            <div
                                                key={ch.id}
                                                onClick={() => setActiveChannel(activeChannel === ch.id ? 'all' : ch.id)}
                                                className={`p-3 sm:p-3.5 rounded-xl transition-all cursor-pointer border ${
                                                    isSelected
                                                        ? `bg-white/[0.06] ${ch.borderColor} ${ch.glowColor}`
                                                        : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/70'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3 pb-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ch.dotColor}`} />
                                                        <span className="font-semibold text-xs sm:text-sm text-zinc-200 whitespace-nowrap">
                                                            {ch.name}
                                                        </span>
                                                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 shrink-0">
                                                            {ch.share}%
                                                        </span>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="font-mono font-bold text-xs sm:text-sm text-white">
                                                            {ch.nominal}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Slim Proportional Progress Bar */}
                                                <div className="w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                                                    <div
                                                        style={{ width: `${ch.share}%` }}
                                                        className={`h-full rounded-full transition-all duration-500 ${ch.barColor}`}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1.5 font-mono">
                                                    <span>{ch.txCount} tervalidasi</span>
                                                    <span className="text-zinc-500">Rekonsiliasi Otomatis ✓</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Reset / All Channels Indicator */}
                                    {activeChannel !== 'all' && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveChannel('all')}
                                            className="w-full text-center text-[11px] font-mono text-zinc-400 hover:text-white transition-colors pt-1 cursor-pointer"
                                        >
                                            ← Tampilkan Semua Kanal Kasir
                                        </button>
                                    )}
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
                    <span
                        className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                            LIVE_EVENTS[liveEventIndex].isSurplus ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                    />
                    <span className="text-zinc-500 text-[11px] font-mono shrink-0">[LIVE SYNC]</span>
                    <span className="text-zinc-300 text-xs truncate transition-all duration-300">
                        {LIVE_EVENTS[liveEventIndex].text}
                    </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500 shrink-0">
                    <span className="text-zinc-400 font-medium">Latensi: 0.04s</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">Integritas 100%</span>
                </div>
            </div>
        </div>
    );
};
