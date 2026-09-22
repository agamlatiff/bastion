import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Store,
    CheckCircle2,
    Sparkles,
    BarChart3,
    LineChart,
    Plus,
    RefreshCw,
    Wallet,
    ArrowRight,
    ArrowDownLeft,
    History,
} from 'lucide-react';
import { useCustomerProfile } from '../features/customer/hooks';
import { useWallets, useCreateWallet } from '../features/wallet/hooks';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Alert } from '../components/ui/Alert';
import { MoneyMovementModal } from '../components/dashboard/MoneyMovementModal';
import { formatCurrency } from '../lib/formatters';

type PeriodType = 'feb26' | 'jan26' | 'q1_26';
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
    coordY: number;
    outflowY: number;
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
        yAxisInflow: string[];
        yAxisOutflow: string[];
        grossInflow: string;
        operatingExpense: string;
        retentionRate: string;
        netReserve: string;
        cashierCount: string;
        disbursementCount: string;
        avgTicket: string;
    }
> = {
    feb26: {
        label: 'Februari 2026',
        dateRange: '01 Feb - 28 Feb 2026',
        targetNominal: 'Rp 864.250.000',
        growthBadge: '+12.4%',
        growthSub: 'Surplus vs bulan lalu',
        yAxisInflow: ['1 M', '750 Jt', '500 Jt', '250 Jt', '0 Jt'],
        yAxisOutflow: ['600 Jt', '450 Jt', '300 Jt', '150 Jt', '0 Jt'],
        grossInflow: '+Rp 1.420.000.000',
        operatingExpense: '-Rp 555.750.000',
        retentionRate: '97.2%',
        netReserve: 'Rp 864.250.000',
        cashierCount: '120 / 150',
        disbursementCount: '45 / 60',
        avgTicket: 'Rp 1,25 Jt',
    },
    jan26: {
        label: 'Januari 2026',
        dateRange: '01 Jan - 31 Jan 2026',
        targetNominal: 'Rp 768.800.000',
        growthBadge: '+9.8%',
        growthSub: 'Surplus vs Des 2025',
        yAxisInflow: ['900 Jt', '675 Jt', '450 Jt', '225 Jt', '0 Jt'],
        yAxisOutflow: ['500 Jt', '375 Jt', '250 Jt', '125 Jt', '0 Jt'],
        grossInflow: '+Rp 1.280.000.000',
        operatingExpense: '-Rp 511.200.000',
        retentionRate: '96.8%',
        netReserve: 'Rp 768.800.000',
        cashierCount: '114 / 150',
        disbursementCount: '42 / 60',
        avgTicket: 'Rp 1,18 Jt',
    },
    q1_26: {
        label: 'Kuartal 1 (Q1 2026)',
        dateRange: '01 Jan - 31 Mar 2026',
        targetNominal: 'Rp 2.450.000.000',
        growthBadge: '+28.6%',
        growthSub: 'Surplus vs Q4 2025',
        yAxisInflow: ['3.0 M', '2.25 M', '1.5 M', '750 Jt', '0 M'],
        yAxisOutflow: ['1.8 M', '1.35 M', '900 Jt', '450 Jt', '0 M'],
        grossInflow: '+Rp 4.150.000.000',
        operatingExpense: '-Rp 1.700.000.000',
        retentionRate: '98.1%',
        netReserve: 'Rp 2.450.000.000',
        cashierCount: '148 / 150',
        disbursementCount: '132 / 140',
        avgTicket: 'Rp 1,34 Jt',
    },
};

interface ChannelDetail {
    id: 'qris' | 'bank' | 'edc';
    name: string;
    nominal: string;
    txCount: string;
    share: number;
    dotColor: string;
}

const CHANNELS_DATA: Record<PeriodType, ChannelDetail[]> = {
    feb26: [
        { id: 'qris', name: 'QRIS Dinamis', nominal: 'Rp 475.300.000', txCount: '237 tx', share: 55, dotColor: 'bg-emerald-400 shadow-[0_0_8px_#10b981]' },
        { id: 'bank', name: 'Transfer Bank & VA', nominal: 'Rp 259.250.000', txCount: '129 tx', share: 30, dotColor: 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' },
        { id: 'edc', name: 'Mesin EDC Toko', nominal: 'Rp 129.700.000', txCount: '65 tx', share: 15, dotColor: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' },
    ],
    jan26: [
        { id: 'qris', name: 'QRIS Dinamis', nominal: 'Rp 399.700.000', txCount: '202 tx', share: 52, dotColor: 'bg-emerald-400 shadow-[0_0_8px_#10b981]' },
        { id: 'bank', name: 'Transfer Bank & VA', nominal: 'Rp 253.700.000', txCount: '131 tx', share: 33, dotColor: 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' },
        { id: 'edc', name: 'Mesin EDC Toko', nominal: 'Rp 115.400.000', txCount: '58 tx', share: 15, dotColor: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' },
    ],
    q1_26: [
        { id: 'qris', name: 'QRIS Dinamis', nominal: 'Rp 1.347.500.000', txCount: '685 tx', share: 55, dotColor: 'bg-emerald-400 shadow-[0_0_8px_#10b981]' },
        { id: 'bank', name: 'Transfer Bank & VA', nominal: 'Rp 735.000.000', txCount: '372 tx', share: 30, dotColor: 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' },
        { id: 'edc', name: 'Mesin EDC Toko', nominal: 'Rp 367.500.000', txCount: '185 tx', share: 15, dotColor: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' },
    ],
};

interface RecentActivityItem {
    id: string;
    title: string;
    walletType: string;
    amount: number;
    currency: string;
    type: 'IN' | 'OUT';
    time: string;
    status: string;
}

export const DashboardPage: React.FC = () => {
    // Real Customer Profile and Wallets Hooks
    const { data: profile, isLoading: isProfileLoading, error: profileError } = useCustomerProfile();
    const { data: wallets = [], isLoading: isWalletsLoading, refetch: refetchWallets, isRefetching } = useWallets();
    const { mutateAsync: createWallet, isPending: isCreatingWallet } = useCreateWallet();

    // Modals & Action State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [moneyModalState, setMoneyModalState] = useState<{
        isOpen: boolean;
        mode: 'transfer' | 'topup';
    }>({ isOpen: false, mode: 'topup' });
    const [selectedCurrency, setSelectedCurrency] = useState('IDR');
    const [createError, setCreateError] = useState<string | null>(null);
    const [simulatedOffset, setSimulatedOffset] = useState<number>(0);

    // Recent Mutations Activity Log
    const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([
        {
            id: 'act-1',
            title: 'Isi Saldo Kasir Otomatis',
            walletType: 'Dompet Rupiah',
            amount: 5000000,
            currency: 'IDR',
            type: 'IN',
            time: '12 menit lalu',
            status: 'Tercatat Sah',
        },
        {
            id: 'act-2',
            title: 'Biaya Pengadaan & Operasional',
            walletType: 'Dompet Rupiah',
            amount: 1450000,
            currency: 'IDR',
            type: 'OUT',
            time: '1 jam lalu',
            status: 'Tercatat Sah',
        },
        {
            id: 'act-3',
            title: 'Settlement Kliring QRIS Toko',
            walletType: 'Dompet Rupiah',
            amount: 2850000,
            currency: 'IDR',
            type: 'IN',
            time: '3 jam lalu',
            status: 'Tercatat Sah',
        },
    ]);

    // Financial Analytics Controls & State
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('feb26');
    const [chartMode, setChartViewMode] = useState<ChartViewMode>('curve');
    const [flowCategory, setFlowCategory] = useState<FlowCategory>('all');
    const [activeHoverPoint, setActiveHoverPoint] = useState<MonthDataPoint>(MONTH_DATA_POINTS[7]);
    const [selectedMilestone, setSelectedMilestone] = useState<number>(82);

    const displayName = profile?.fullName || profile?.full_name || 'PT Kopi Nusantara';

    // Total balance calculation for IDR wallets + simulated moves
    const totalIdrBalance =
        wallets
            .filter((w) => w.currency === 'IDR' && w.status !== 'CLOSED')
            .reduce((sum, w) => sum + (Number(w.balance) || 0), 0) + simulatedOffset;

    const nonIdrWallets = wallets.filter((w) => w.currency !== 'IDR' && w.status !== 'CLOSED');

    const currentPeriod = PERIOD_METRICS[selectedPeriod];
    const currentChannels = CHANNELS_DATA[selectedPeriod];

    const handleMoneySuccess = (amount: number, type: 'transfer' | 'topup') => {
        if (type === 'topup') {
            setSimulatedOffset((prev) => prev + amount);
            setRecentActivities((prev) => [
                {
                    id: `act-${Date.now()}`,
                    title: 'Top Up Saldo Mandiri',
                    walletType: 'Dompet Rupiah',
                    amount: amount,
                    currency: 'IDR',
                    type: 'IN',
                    time: 'Baru saja',
                    status: 'Tercatat Sah',
                },
                ...prev.slice(0, 4),
            ]);
        } else {
            setSimulatedOffset((prev) => Math.max(0, prev - amount));
            setRecentActivities((prev) => [
                {
                    id: `act-${Date.now()}`,
                    title: 'Transfer Dana Keluar',
                    walletType: 'Dompet Rupiah',
                    amount: amount,
                    currency: 'IDR',
                    type: 'OUT',
                    time: 'Baru saja',
                    status: 'Tercatat Sah',
                },
                ...prev.slice(0, 4),
            ]);
        }
        refetchWallets();
    };

    const handleCreateWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        try {
            await createWallet({ currency: selectedCurrency });
            setIsCreateModalOpen(false);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Gagal membuka dompet baru. Silakan coba lagi.';
            setCreateError(msg);
        }
    };

    // Full-Width Dynamic Polyline Paths for Spline Curve
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
        <div className="space-y-8 text-left">
            {profileError && (
                <Alert variant="warning" title="Sinkronisasi Profil">
                    Data profil Anda sedang diperbarui secara otomatis di latar belakang.
                </Alert>
            )}

            {/* SVG Global Pattern Definitions for Spline Curve & Beams */}
            <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
                <defs>
                    <linearGradient id="app-spline-emerald-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                        <stop offset="65%" stopColor="#10b981" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="app-spline-rose-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
                        <stop offset="65%" stopColor="#f43f5e" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="app-beam-emerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                        <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="app-beam-rose" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
                        <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                    </linearGradient>
                </defs>
            </svg>

            {/* ========================================================================= */}
            {/* 1. NATIVE APPLICATION HEADER & QUICK ACTION BAR (CLEAN & SPACIOUS)        */}
            {/* ========================================================================= */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-zinc-400 font-medium">Selamat datang kembali,</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Akun Terverifikasi
                        </span>
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Buku Kas Terkunci • Nol Selisih ✓
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
                        {isProfileLoading ? <Skeleton className="h-8 w-48 inline-block" /> : displayName}
                    </h1>
                </div>

                {/* Primary Action Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setMoneyModalState({ isOpen: true, mode: 'topup' })}
                        leftIcon={<ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />}
                        className="text-xs font-semibold"
                    >
                        Isi Saldo
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setMoneyModalState({ isOpen: true, mode: 'transfer' })}
                        leftIcon={<ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />}
                        className="text-xs font-semibold"
                    >
                        Kirim Uang
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        className="text-xs font-semibold"
                    >
                        Buka Dompet
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchWallets()}
                        leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
                        disabled={isRefetching}
                        className="text-zinc-400 hover:text-white"
                        title="Segarkan Saldo"
                    >
                        Segarkan
                    </Button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. MASTER FINANCIAL ANALYTICS SURFACE (FOCUSED TWO-COLUMN BENCH)          */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ====================================================== */}
                {/* KOLOM KIRI (7 Kolom): SALDO KAS & KURVA FLUKTUASI      */}
                {/* ====================================================== */}
                <div className="lg:col-span-7 space-y-6">
                    {/* WIDGET 1: TOTAL SALDO KAS & RASIO EMOSIONAL */}
                    <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-5 sm:p-7 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-zinc-800/80 relative z-10">
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                                    Target Pertumbuhan Arus Kas
                                </h3>
                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono">
                                    Surplus Berjalan
                                </span>
                            </div>

                            {/* Periode Switcher Pills */}
                            <div className="p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-0.5">
                                {(['feb26', 'jan26', 'q1_26'] as PeriodType[]).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setSelectedPeriod(p)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                                            selectedPeriod === p
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        {p === 'feb26' ? 'Feb' : p === 'jan26' ? 'Jan' : 'Q1'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-5 flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
                            {/* Giant Nominal & Real Wallet Integration */}
                            <div className="space-y-2 min-w-0 flex-1">
                                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Total Saldo Kas Tersedia</span>
                                </div>

                                {isWalletsLoading ? (
                                    <Skeleton className="h-10 w-56 my-1" />
                                ) : (
                                    <div className="text-2xl sm:text-3xl xl:text-4xl font-extrabold font-mono text-white tracking-tight">
                                        {formatCurrency(totalIdrBalance, 'IDR')}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                            {currentPeriod.growthBadge} {currentPeriod.growthSub}
                                        </span>
                                    </span>
                                </div>

                                <div className="pt-2 flex flex-wrap items-center gap-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-[11px] text-zinc-500 font-medium">Buku Kas:</span>
                                        <span className="font-mono text-zinc-200 font-medium text-[11px]">
                                            {currentPeriod.dateRange}
                                        </span>
                                    </div>

                                    {nonIdrWallets.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            {nonIdrWallets.map((w) => (
                                                <span
                                                    key={w.id}
                                                    className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300"
                                                >
                                                    {w.currency}: {formatCurrency(w.balance, w.currency)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sub-Visual Kanan: Komparasi Rasio Kas Nyata (Masuk vs Beban vs Bersih) */}
                            <div className="bg-[#14141c] rounded-xl border border-zinc-800/80 p-4 sm:w-60 shrink-0 relative">
                                <div className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center justify-between">
                                    <span>Rasio Kas Nyata</span>
                                    <span className="text-[10px] text-emerald-400 font-mono font-medium">Sehat ✓</span>
                                </div>

                                {/* Floating Tooltip Pill */}
                                <div className="absolute top-10 right-4 sm:right-6 z-20 pointer-events-none">
                                    <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-emerald-500/30 text-[10px] font-medium text-emerald-300 shadow-xl flex items-center gap-1.5 relative">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>Surplus: {currentPeriod.netReserve}</span>
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-emerald-500/30 rotate-45" />
                                    </div>
                                </div>

                                {/* 3 Mini Bars: Masuk (Hijau) vs Beban (Merah) vs Bersih (Hijau Mint) */}
                                <div className="h-28 flex items-end justify-center gap-3.5 pt-4 px-2">
                                    <div className="flex-1 flex flex-col items-center gap-1.5" title={`Kas Masuk: ${currentPeriod.grossInflow}`}>
                                        <div className="w-full h-22 rounded-t-md bg-gradient-to-t from-emerald-700/50 to-emerald-400/90 border-t-2 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                        <span className="text-[9px] font-mono text-emerald-400 font-bold">Masuk</span>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center gap-1.5" title={`Beban: ${currentPeriod.operatingExpense}`}>
                                        <div className="w-full h-12 rounded-t-md bg-gradient-to-t from-rose-900/60 to-rose-500/80 border-t border-rose-400/80" />
                                        <span className="text-[9px] font-mono text-rose-400 font-semibold">Beban</span>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center gap-1.5" title={`Saldo Bersih: ${currentPeriod.netReserve}`}>
                                        <div className="w-full h-18 rounded-t-md bg-gradient-to-t from-emerald-600/40 to-emerald-300/80 border-t-2 border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]" />
                                        <span className="text-[9px] font-mono text-emerald-300 font-bold">Bersih</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 2: AREA CURVE CHART (FOTO 2) & SAKLAR MODE EMOSIONAL */}
                    <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-5 sm:p-7 space-y-4 shadow-xl relative overflow-hidden transition-all">
                        {/* Header Widget 2: Tab Kategori + Saklar Mode */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800/80">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading flex items-center gap-2">
                                    <span>Arus Kas Bulanan & Fluktuasi Omzet</span>
                                </h3>
                                <p className="text-[11px] text-zinc-400 pt-0.5">
                                    Tren pasang surut uang masuk dan efisiensi pengeluaran usaha.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Category Filter Tabs */}
                                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
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
                                        <span>Keluar</span>
                                    </button>
                                </div>

                                {/* Saklar Tampilan: Kurva Garis vs Batang Emosional */}
                                <div className="p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-0.5">
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

                        {/* TAMPILAN 1: KURVA GARIS AREA KONTINYU */}
                        {chartMode === 'curve' ? (
                            <div className="relative pt-6 pb-2">
                                <div className="relative h-60 sm:h-72 flex flex-col justify-between pointer-events-none">
                                    {(isInflowView ? currentPeriod.yAxisInflow : currentPeriod.yAxisOutflow).map((val) => (
                                        <div key={val} className="w-full flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-zinc-500 w-11 text-right shrink-0">
                                                {val}
                                            </span>
                                            <div className="h-px w-full bg-white/[0.04]" />
                                        </div>
                                    ))}

                                    <div className="absolute inset-0 left-13 right-0 pointer-events-auto">
                                        {/* Floating Apex Tooltip Pill */}
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
                                                        isInflowView ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}
                                                >
                                                    {activeHoverPoint.label}: {isInflowView ? 'Surplus' : 'Beban'} ({activeHoverPoint.change})
                                                </span>
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#16161f] border-r border-b border-white/20 rotate-45" />
                                            </div>
                                        </div>

                                        <svg
                                            viewBox="0 0 600 220"
                                            className="w-full h-full overflow-visible"
                                            preserveAspectRatio="none"
                                        >
                                            {/* Vertical Spotlight Beam Column */}
                                            <rect
                                                x={activeHoverPoint.coordX - 10}
                                                y={activeCurrentY}
                                                width="20"
                                                height={220 - activeCurrentY}
                                                fill={isInflowView ? 'url(#app-beam-emerald)' : 'url(#app-beam-rose)'}
                                                rx="3"
                                                className="pointer-events-none"
                                            />

                                            {/* Vertical Indicator Center Line */}
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

                                            {/* Area Dynamic Gradient Fill */}
                                            <path
                                                d={activeAreaPath}
                                                fill={isInflowView ? 'url(#app-spline-emerald-glow)' : 'url(#app-spline-rose-glow)'}
                                                className="transition-all duration-300"
                                            />

                                            {/* Dynamic Financial Stroke Line */}
                                            <path
                                                d={activeStrokePath}
                                                fill="none"
                                                stroke={isInflowView ? '#10b981' : '#f43f5e'}
                                                strokeWidth="2.8"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="transition-all duration-300"
                                            />

                                            {/* Interactive Point Nodes across 12 Months */}
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
                                                        <rect
                                                            x={pt.coordX - 25}
                                                            y="0"
                                                            width="50"
                                                            height="220"
                                                            fill="transparent"
                                                        />
                                                        {isActive && (
                                                            <circle
                                                                cx={pt.coordX}
                                                                cy={pointY}
                                                                r="8"
                                                                fill={isInflowView ? '#10b981' : '#f43f5e'}
                                                                opacity="0.35"
                                                            />
                                                        )}
                                                        <circle
                                                            cx={pt.coordX}
                                                            cy={pointY}
                                                            r={isActive ? '5' : '3.5'}
                                                            fill={isActive ? '#ffffff' : '#18181b'}
                                                            stroke={
                                                                isActive
                                                                    ? isInflowView
                                                                        ? '#10b981'
                                                                        : '#f43f5e'
                                                                    : 'rgba(255,255,255,0.45)'
                                                            }
                                                            strokeWidth="2"
                                                        />
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>
                                </div>

                                {/* Sumbu X Label Bulan Interaktif */}
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
                            /* TAMPILAN 2: GRAFIK BATANG EMOSIONAL */
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
                                                        {bar.isSurplus ? (
                                                            <div className="w-full h-full rounded-t-md bg-gradient-to-t from-emerald-950/40 via-emerald-600/70 to-emerald-400 border-t-2 border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] relative" />
                                                        ) : (
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

                                <div className="flex items-center justify-center gap-5 pt-3 text-[11px]">
                                    <div className="flex items-center gap-1.5 text-emerald-400">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                                        <span>Bulan Surplus (Uang Masuk Bertambah)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-rose-400">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-rose-500/80 border border-rose-400" />
                                        <span>Bulan Beban (Biaya Operasional)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ====================================================== */}
                {/* KOLOM KANAN (5 Kolom): ALOKASI DANA & KANAL KASIR      */}
                {/* ====================================================== */}
                <div className="lg:col-span-5 space-y-6">
                    {/* WIDGET 3: ALOKASI KAS & TARGET REALISASI */}
                    <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-5 space-y-4 shadow-xl transition-all">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-white tracking-tight font-heading">
                                    Alokasi Saldo & Pagu Operasional
                                </h3>
                                <p className="text-[11px] text-zinc-400 pt-0.5">
                                    Porsi saldo cadangan dan pemenuhan pagu operasional kasir.
                                </p>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Real-Time</span>
                            </span>
                        </div>

                        {/* Multi-Segmented Meter Bar */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                <span>Porsi Dana Terpetakan</span>
                                <span className="font-mono text-zinc-300">100% Terkunci</span>
                            </div>
                            <div className="flex h-2.5 rounded-full overflow-hidden gap-1 bg-zinc-900 p-0.5 border border-zinc-800">
                                <div className="h-full rounded-l-full bg-amber-500 w-[50%]" title="50% Operasional Kasir (Amber)" />
                                <div className="h-full bg-zinc-600 w-[30%]" title="30% Cadangan Pajak (Abu-abu / Slate)" />
                                <div className="h-full rounded-r-full bg-emerald-400 w-[20%]" title="20% Laba Bersih Aman (Emerald)" />
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

                        {/* Interactive Target Milestone Track */}
                        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400 text-[11px]">Pencapaian Target Kas Bulanan</span>
                                <span className="font-mono text-emerald-400 font-bold text-xs flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                    <span>{selectedMilestone}% Tercapai</span>
                                </span>
                            </div>

                            <div className="h-2 w-full rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                                <div
                                    style={{ width: `${selectedMilestone}%` }}
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                                />
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
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

                            {/* 3 Mini KPI Cards */}
                            <div className="grid grid-cols-3 gap-2 pt-1">
                                <div className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-0.5 text-center">
                                    <div className="text-[10px] text-zinc-400 font-medium truncate flex items-center justify-center gap-1">
                                        <Store className="w-3 h-3 text-emerald-400" />
                                        <span>Kasir Siaga</span>
                                    </div>
                                    <div className="font-mono text-xs font-bold text-white">
                                        {currentPeriod.cashierCount}
                                    </div>
                                </div>

                                <div className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-0.5 text-center">
                                    <div className="text-[10px] text-zinc-400 font-medium truncate flex items-center justify-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>Pencairan Sah</span>
                                    </div>
                                    <div className="font-mono text-xs font-bold text-white">
                                        {currentPeriod.disbursementCount}
                                    </div>
                                </div>

                                <div className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-0.5 text-center">
                                    <div className="text-[10px] text-zinc-400 font-medium truncate">
                                        Rata-rata Nota
                                    </div>
                                    <div className="font-mono text-xs font-bold text-white truncate">
                                        {currentPeriod.avgTicket}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Health Summary Table */}
                        <div className="pt-2.5 border-t border-zinc-800/80 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-zinc-400">
                                <span>Arus Kas Masuk Kotor</span>
                                <span className="font-mono font-medium text-emerald-400">{currentPeriod.grossInflow}</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400">
                                <span>Beban Pokok & Operasional</span>
                                <span className="font-mono font-medium text-rose-400">{currentPeriod.operatingExpense}</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400">
                                <span>Tingkat Retensi Dana</span>
                                <span className="font-mono font-bold text-emerald-400">{currentPeriod.retentionRate}</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/80">
                                <span className="font-semibold text-zinc-200">Saldo Cadangan Bersih</span>
                                <span className="font-mono font-bold text-emerald-300">{currentPeriod.netReserve}</span>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 4: DISTRIBUSI PENERIMAAN KASIR (Donut Breakdown) */}
                    <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-6 space-y-5 shadow-xl transition-all">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                                    Penerimaan Kanal Kasir
                                </h3>
                                <p className="text-[11px] text-zinc-400 pt-0.5">
                                    Distribusi penerimaan omzet riil per saluran transaksi {currentPeriod.label}.
                                </p>
                            </div>
                            <span className="text-[10px] text-zinc-300 font-mono px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                                {currentPeriod.label}
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 py-3">
                            {/* Donut SVG Ring */}
                            <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="47"
                                        fill="transparent"
                                        stroke="rgba(255, 255, 255, 0.06)"
                                        strokeWidth="1"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#27272a"
                                        strokeWidth="9"
                                    />
                                    {/* QRIS 55% */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#10b981"
                                        strokeWidth="9.5"
                                        strokeDasharray="238.76"
                                        strokeDashoffset={238.76 * (1 - (currentChannels[0]?.share ?? 55) / 100)}
                                        strokeLinecap="round"
                                    />
                                    {/* Bank 30% */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#818cf8"
                                        strokeWidth="9.5"
                                        strokeDasharray="238.76"
                                        strokeDashoffset={238.76 * (1 - (currentChannels[1]?.share ?? 30) / 100)}
                                        transform={`rotate(${((currentChannels[0]?.share ?? 55) / 100) * 360} 50 50)`}
                                    />
                                    {/* EDC 15% */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#f59e0b"
                                        strokeWidth="9.5"
                                        strokeDasharray="238.76"
                                        strokeDashoffset={238.76 * (1 - (currentChannels[2]?.share ?? 15) / 100)}
                                        transform={`rotate(${(((currentChannels[0]?.share ?? 55) + (currentChannels[1]?.share ?? 30)) / 100) * 360} 50 50)`}
                                    />
                                </svg>

                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                    <span className="text-[11px] text-zinc-400 font-medium">
                                        Transaksi
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight py-0.5">
                                        {selectedPeriod === 'feb26' ? '431' : selectedPeriod === 'jan26' ? '391' : '1.242'}
                                    </span>
                                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                                        <span>↑ {currentPeriod.growthBadge}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Minimalist Channel Breakdown */}
                            <div className="space-y-3.5 text-left flex-1 min-w-0">
                                {currentChannels.map((ch) => (
                                    <div key={ch.id} className="flex items-start gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full ${ch.dotColor} mt-1 shrink-0`} />
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="text-xs sm:text-sm font-semibold text-white truncate">
                                                {ch.name}
                                            </div>
                                            <div className="text-[11px] text-zinc-400 font-mono">
                                                {ch.share}% • <span className="text-zinc-300 font-medium">{ch.nominal}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. MUTASI TRANSAKSI TERAKHIR (CLEAN ACTIVITY FEED INSTEAD OF FAKE TICKER) */}
            {/* ========================================================================= */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-5 sm:p-6 space-y-4 shadow-xl text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-sm font-bold text-white tracking-tight font-heading">
                                Aktivitas Mutasi Terakhir Akun Anda
                            </h3>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Setiap mutasi dana selalu seimbang, tercatat detik itu juga, dan tidak bisa berubah diam-diam.
                        </p>
                    </div>

                    <Link
                        to="/app/activity"
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors shrink-0"
                    >
                        <span>Buka Buku Besar Lengkap</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div className="divide-y divide-zinc-800/60">
                    {recentActivities.map((act) => (
                        <div
                            key={act.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-zinc-900/30 px-2 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                        act.type === 'IN'
                                            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
                                            : 'bg-rose-950/40 border-rose-800/50 text-rose-400'
                                    }`}
                                >
                                    {act.type === 'IN' ? (
                                        <ArrowDownLeft className="w-4 h-4" />
                                    ) : (
                                        <ArrowUpRight className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="font-semibold text-white">{act.title}</div>
                                    <div className="text-[11px] text-zinc-500 font-mono">
                                        {act.walletType} • {act.time}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                                <span
                                    className={`font-mono font-bold text-sm ${
                                        act.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                >
                                    {act.type === 'IN' ? '+' : '-'}
                                    {formatCurrency(act.amount, act.currency)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                                    {act.status} ✓
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Buka Dompet Baru */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
                    <div className="w-full max-w-sm bg-[#111114] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-5">
                        <div className="space-y-1 text-left">
                            <h3 className="text-base font-bold text-white">Buka Rekening Dompet Baru</h3>
                            <p className="text-xs text-zinc-400">
                                Pilih mata uang yang ingin Anda gunakan untuk dompet ini.
                            </p>
                        </div>

                        {createError && (
                            <Alert variant="error" title="Gagal">
                                {createError}
                            </Alert>
                        )}

                        <form onSubmit={handleCreateWallet} className="space-y-4">
                            <div className="space-y-2 text-left">
                                <label className="block text-xs font-semibold text-zinc-300">
                                    Pilih Mata Uang
                                </label>
                                <div className="space-y-2">
                                    {[
                                        { code: 'IDR', label: 'Rupiah Indonesia (IDR)', desc: 'Untuk transaksi harian & lokal' },
                                        { code: 'USD', label: 'Dolar Amerika (USD)', desc: 'Untuk transaksi internasional' },
                                        { code: 'SGD', label: 'Dolar Singapura (SGD)', desc: 'Untuk transaksi regional Asia Tenggara' },
                                    ].map((item) => (
                                        <label
                                            key={item.code}
                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                                selectedCurrency === item.code
                                                    ? 'bg-zinc-800/80 border-emerald-500/50 text-white'
                                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="space-y-0.5 text-left">
                                                <div className="text-xs font-bold">{item.label}</div>
                                                <div className="text-[11px] text-zinc-400">{item.desc}</div>
                                            </div>
                                            <input
                                                type="radio"
                                                name="currency"
                                                value={item.code}
                                                checked={selectedCurrency === item.code}
                                                onChange={() => setSelectedCurrency(item.code)}
                                                className="text-emerald-500 focus:ring-emerald-500"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isCreatingWallet}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    isLoading={isCreatingWallet}
                                >
                                    Buat Sekarang
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Kirim Uang & Top-Up */}
            <MoneyMovementModal
                isOpen={moneyModalState.isOpen}
                mode={moneyModalState.mode}
                wallets={wallets}
                onClose={() => setMoneyModalState({ isOpen: false, mode: 'topup' })}
                onSuccess={handleMoneySuccess}
            />
        </div>
    );
};
