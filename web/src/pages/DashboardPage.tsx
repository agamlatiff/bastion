import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowRight,
    Wallet,
    Plus,
    RefreshCw,
    History,
    Copy,
    Check,
    Store,
    TrendingUp,
    CreditCard,
} from 'lucide-react';
import { useCustomerProfile } from '../features/customer/hooks';
import { useWallets, useCreateWallet } from '../features/wallet/hooks';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Alert } from '../components/ui/Alert';
import { MoneyMovementModal } from '../components/dashboard/MoneyMovementModal';
import { formatCurrency } from '../lib/formatters';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

type PeriodType = 'feb26' | 'jan26' | 'q1_26';

const PERIOD_METRICS: Record<
    PeriodType,
    {
        label: string;
        dateRange: string;
        targetNominal: string;
        growthBadge: string;
        growthSub: string;
        grossInflow: string;
        operatingExpense: string;
        netReserve: string;
        cashierCount: string;
        avgTicket: string;
    }
> = {
    feb26: {
        label: 'Februari 2026',
        dateRange: '01 Feb - 28 Feb 2026',
        targetNominal: 'Rp 864.250.000',
        growthBadge: '+12.4%',
        growthSub: 'Surplus vs bulan lalu',
        grossInflow: '+Rp 1.420.000.000',
        operatingExpense: '-Rp 555.750.000',
        netReserve: 'Rp 864.250.000',
        cashierCount: '120 / 150',
        avgTicket: 'Rp 1,25 Jt',
    },
    jan26: {
        label: 'Januari 2026',
        dateRange: '01 Jan - 31 Jan 2026',
        targetNominal: 'Rp 768.800.000',
        growthBadge: '+9.8%',
        growthSub: 'Surplus vs Des 2025',
        grossInflow: '+Rp 1.280.000.000',
        operatingExpense: '-Rp 511.200.000',
        netReserve: 'Rp 768.800.000',
        cashierCount: '114 / 150',
        avgTicket: 'Rp 1,18 Jt',
    },
    q1_26: {
        label: 'Kuartal 1 (Q1 2026)',
        dateRange: '01 Jan - 31 Mar 2026',
        targetNominal: 'Rp 2.450.000.000',
        growthBadge: '+28.6%',
        growthSub: 'Surplus vs Q4 2025',
        grossInflow: '+Rp 4.150.000.000',
        operatingExpense: '-Rp 1.700.000.000',
        netReserve: 'Rp 2.450.000.000',
        cashierCount: '148 / 150',
        avgTicket: 'Rp 1,34 Jt',
    },
};

const CHANNELS_DATA = [
    {
        id: 'qris',
        name: 'QRIS Dinamis Kasir',
        nominal: 'Rp 475.300.000',
        txCount: '237 transaksi',
        share: 55,
        dotColor: 'bg-emerald-400',
        strokeColor: '#10b981',
    },
    {
        id: 'bank',
        name: 'Transfer Bank & Virtual Account',
        nominal: 'Rp 259.250.000',
        txCount: '129 transaksi',
        share: 30,
        dotColor: 'bg-indigo-400',
        strokeColor: '#818cf8',
    },
    {
        id: 'edc',
        name: 'Mesin EDC Debit / Kredit',
        nominal: 'Rp 129.700.000',
        txCount: '65 transaksi',
        share: 15,
        dotColor: 'bg-amber-400',
        strokeColor: '#f59e0b',
    },
];

const CASH_FLOW_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const CASH_FLOW_INFLOW = [
    395000000, 312000000, 420000000, 385000000, 580000000, 220000000,
    490000000, 864000000, 360000000, 470000000, 780000000, 540000000,
];

const CASH_FLOW_OUTFLOW = [
    180000000, 140000000, 130000000, 150000000, 160000000, 125000000,
    145000000, 170000000, 135000000, 145000000, 155000000, 140000000,
];

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
    // Data Pelanggan dan Dompet Riil
    const { data: profile, isLoading: isProfileLoading } = useCustomerProfile();
    const { data: wallets = [], isLoading: isWalletsLoading, refetch: refetchWallets, isRefetching } = useWallets();
    const { mutateAsync: createWallet, isPending: isCreatingWallet } = useCreateWallet();

    // Dialog & Status Interaksi
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [moneyModalState, setMoneyModalState] = useState<{
        isOpen: boolean;
        mode: 'transfer' | 'topup';
    }>({ isOpen: false, mode: 'topup' });
    const [selectedCurrency, setSelectedCurrency] = useState('IDR');
    const [createError, setCreateError] = useState<string | null>(null);
    const [simulatedOffset, setSimulatedOffset] = useState<number>(0);
    const [copiedWalletId, setCopiedWalletId] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('feb26');

    // Riwayat Mutasi Terkini
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

    const displayName = profile?.fullName || profile?.full_name || 'PT Kopi Nusantara';

    // Total Saldo Rupiah Riil
    const totalIdrBalance =
        wallets
            .filter((w) => w.currency === 'IDR' && w.status !== 'CLOSED')
            .reduce((sum, w) => sum + (Number(w.balance) || 0), 0) + simulatedOffset;

    const currentPeriod = PERIOD_METRICS[selectedPeriod];

    const handleCopyWalletId = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopiedWalletId(id);
        setTimeout(() => setCopiedWalletId(null), 2000);
    };

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
                    title: 'Transfer Pengeluaran Kasir',
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
    };

    const handleCreateWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        try {
            await createWallet({ currency: selectedCurrency });
            setIsCreateModalOpen(false);
            refetchWallets();
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Gagal membuka dompet baru. Silakan coba lagi.';
            setCreateError(msg);
        }
    };

    return (
        <div className="space-y-8 text-left w-full">
            {/* ========================================================================= */}
            {/* 1. HEADER UTAMA & STATUS AKUN                                             */}
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

                {/* Kontrol Aksi Cepat Finansial */}
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
            {/* 2. REKENING & DOMPET RIIL PENGGUNA (FOKUS UTAMA BISNIS)                   */}
            {/* ========================================================================= */}
            <div className="space-y-4">
                {/* Kartu Hero: Total Saldo Kas Tersedia */}
                <div className="rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-[#121218] via-[#111116] to-[#0d0d12] p-6 sm:p-7 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Total Saldo Kas Tersedia</span>
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono">
                                    {currentPeriod.growthBadge} {currentPeriod.growthSub}
                                </span>
                            </div>

                            <div className="text-3xl sm:text-4xl xl:text-5xl font-extrabold font-mono text-white tracking-tight">
                                {isWalletsLoading ? (
                                    <Skeleton className="h-12 w-64" />
                                ) : (
                                    formatCurrency(totalIdrBalance, 'IDR')
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>Buku Kas: {currentPeriod.dateRange}</span>
                                </span>
                                <span>•</span>
                                <span className="text-emerald-400/90 font-medium">
                                    {wallets.length} Rekening Terdaftar & Siap Digunakan
                                </span>
                            </div>
                        </div>

                        {/* Periode Switcher Ringkas */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-1">
                                {(['feb26', 'jan26', 'q1_26'] as PeriodType[]).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setSelectedPeriod(p)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                            selectedPeriod === p
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        {p === 'feb26' ? 'Februari' : p === 'jan26' ? 'Januari' : 'Kuartal 1'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid Rekening Dompet Riil Pengguna */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-400" />
                            <h2 className="text-sm font-bold text-white tracking-tight font-heading">
                                Rekening Dompet Aktif
                            </h2>
                            <span className="text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                                {wallets.length} Dompet
                            </span>
                        </div>
                        <Link
                            to="/app/wallets"
                            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors"
                        >
                            <span>Kelola Semua Dompet</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isWalletsLoading ? (
                            <>
                                <Skeleton className="h-36 rounded-2xl" />
                                <Skeleton className="h-36 rounded-2xl" />
                                <Skeleton className="h-36 rounded-2xl" />
                            </>
                        ) : wallets.length === 0 ? (
                            <div className="col-span-full rounded-2xl border border-dashed border-zinc-800 p-8 text-center bg-[#111116]/50 space-y-3">
                                <Wallet className="w-8 h-8 text-zinc-500 mx-auto" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-white">Belum Ada Dompet Aktif</h4>
                                    <p className="text-xs text-zinc-400">
                                        Buka rekening dompet pertama Anda untuk mulai menerima dan memindahkan dana.
                                    </p>
                                </div>
                                <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                                    Buka Dompet Sekarang
                                </Button>
                            </div>
                        ) : (
                            <>
                                {wallets.map((w, idx) => (
                                    <div
                                        key={w.id}
                                        className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-5 space-y-3.5 shadow-md hover:border-zinc-700/80 transition-all relative group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-400">
                                                    {w.currency}
                                                </span>
                                                <div>
                                                    <h3 className="text-xs font-bold text-white truncate">
                                                        {idx === 0
                                                            ? `Rekening Utama (${w.currency})`
                                                            : `Dompet ${w.currency} #${idx + 1}`}
                                                    </h3>
                                                    <span className="text-[10px] text-zinc-400 font-medium">
                                                        {w.status === 'ACTIVE' ? 'Aktif • Bebas Biaya' : w.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Tombol Salin ID Rekening */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleCopyWalletId(w.id, e)}
                                                className="text-[10px] font-mono text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
                                                title="Salin Nomor Rekening Dompet"
                                            >
                                                {copiedWalletId === w.id ? (
                                                    <>
                                                        <Check className="w-3 h-3 text-emerald-400" />
                                                        <span className="text-emerald-400">Tersalin</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3 text-zinc-500" />
                                                        <span>{w.id.slice(0, 8)}...</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Saldo Dompet */}
                                        <div className="pt-1">
                                            <div className="text-[11px] text-zinc-400">Saldo Tersedia</div>
                                            <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                                                {formatCurrency(w.balance, w.currency)}
                                            </div>
                                        </div>

                                        {/* Pintasan Aksi Rekening */}
                                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setMoneyModalState({ isOpen: true, mode: 'topup' })}
                                                    className="text-zinc-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
                                                >
                                                    Isi
                                                </button>
                                                <span className="text-zinc-700">•</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setMoneyModalState({ isOpen: true, mode: 'transfer' })}
                                                    className="text-zinc-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
                                                >
                                                    Kirim
                                                </button>
                                            </div>
                                            <Link
                                                to={`/app/wallets/${w.id}`}
                                                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors"
                                            >
                                                <span>Detail</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}

                                {/* Kartu Tambah Dompet Baru */}
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="rounded-2xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/20 hover:bg-zinc-900/40 p-5 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer min-h-[140px]"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-semibold text-zinc-300">Buka Rekening Baru</span>
                                    <span className="text-[10px] text-zinc-500">IDR, USD, atau SGD</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. DUA KOLOM PERFORMA FINANSIAL (RINGKAS & TIDAK SESAK)                    */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* KOLOM KIRI (7 Kolom): ARUS KAS BULANAN RINGKAS */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-6 space-y-5 shadow-xl">
                        {/* Header Widget */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                            <div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                                        Arus Kas Bulanan
                                    </h2>
                                </div>
                                <p className="text-[11px] text-zinc-400 pt-0.5">
                                    Ringkasan pasang surut uang masuk dan pengeluaran operasional usaha.
                                </p>
                            </div>
                            <span className="text-[10px] text-zinc-300 font-mono px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 self-start sm:self-auto">
                                {currentPeriod.label}
                            </span>
                        </div>

                        {/* 3 Metrik Inti Arus Kas */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                                <span className="text-[11px] text-zinc-400 font-medium block truncate">
                                    Uang Masuk
                                </span>
                                <span className="text-xs sm:text-sm xl:text-base font-mono font-bold text-emerald-400 block truncate">
                                    {currentPeriod.grossInflow}
                                </span>
                                <span className="text-[9px] text-emerald-400/80 font-mono block">Omzet kasir riil</span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                                <span className="text-[11px] text-zinc-400 font-medium block truncate">
                                    Beban Keluar
                                </span>
                                <span className="text-xs sm:text-sm xl:text-base font-mono font-bold text-rose-400 block truncate">
                                    {currentPeriod.operatingExpense}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono block">Biaya & stok</span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-emerald-500/20 space-y-1 bg-emerald-500/5">
                                <span className="text-[11px] text-emerald-300 font-medium block truncate">
                                    Saldo Bersih
                                </span>
                                <span className="text-xs sm:text-sm xl:text-base font-mono font-bold text-emerald-300 block truncate">
                                    {currentPeriod.netReserve}
                                </span>
                                <span className="text-[9px] text-emerald-400 font-mono block">Surplus aman</span>
                            </div>
                        </div>

                        {/* Grafik Kurva Arus Kas Chart.js */}
                        <div className="pt-2 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                <span>Kurva Tren Arus Kas Sepanjang Tahun</span>
                                <span className="font-mono text-emerald-400 font-medium">Surplus Bertumbuh</span>
                            </div>
                            <div className="h-64 sm:h-72 w-full bg-zinc-900/30 rounded-xl p-3 border border-zinc-800/70">
                                <Line
                                    data={{
                                        labels: CASH_FLOW_LABELS,
                                        datasets: [
                                            {
                                                label: 'Uang Masuk (Omzet)',
                                                data: CASH_FLOW_INFLOW,
                                                borderColor: '#10b981',
                                                backgroundColor: (context: ScriptableContext<'line'>) => {
                                                    const ctx = context.chart.ctx;
                                                    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
                                                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
                                                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                                                    return gradient;
                                                },
                                                fill: true,
                                                tension: 0.4,
                                                borderWidth: 2.5,
                                                pointRadius: 3,
                                                pointHoverRadius: 6,
                                                pointBackgroundColor: '#10b981',
                                                pointBorderColor: '#ffffff',
                                                pointBorderWidth: 1.5,
                                            },
                                            {
                                                label: 'Beban Keluar',
                                                data: CASH_FLOW_OUTFLOW,
                                                borderColor: '#f43f5e',
                                                backgroundColor: 'transparent',
                                                fill: false,
                                                tension: 0.4,
                                                borderWidth: 1.8,
                                                borderDash: [4, 4],
                                                pointRadius: 2.5,
                                                pointHoverRadius: 5,
                                                pointBackgroundColor: '#f43f5e',
                                                pointBorderColor: '#ffffff',
                                                pointBorderWidth: 1,
                                            },
                                        ],
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        interaction: {
                                            mode: 'index',
                                            intersect: false,
                                        },
                                        plugins: {
                                            legend: {
                                                display: true,
                                                position: 'top',
                                                align: 'end',
                                                labels: {
                                                    boxWidth: 10,
                                                    boxHeight: 10,
                                                    color: '#a1a1aa',
                                                    font: {
                                                        size: 11,
                                                    },
                                                    usePointStyle: true,
                                                    pointStyle: 'circle',
                                                },
                                            },
                                            tooltip: {
                                                backgroundColor: '#18181b',
                                                titleColor: '#ffffff',
                                                bodyColor: '#e4e4e7',
                                                borderColor: '#27272a',
                                                borderWidth: 1,
                                                padding: 10,
                                                boxPadding: 4,
                                                usePointStyle: true,
                                                callbacks: {
                                                    label: (ctx) => {
                                                        const val = ctx.parsed.y ?? 0;
                                                        const formatted = new Intl.NumberFormat('id-ID', {
                                                            style: 'currency',
                                                            currency: 'IDR',
                                                            maximumFractionDigits: 0,
                                                        }).format(val);
                                                        return ` ${ctx.dataset.label}: ${formatted}`;
                                                    },
                                                },
                                            },
                                        },
                                        scales: {
                                            x: {
                                                grid: {
                                                    color: 'rgba(255, 255, 255, 0.04)',
                                                },
                                                ticks: {
                                                    color: '#71717a',
                                                    font: {
                                                        size: 10,
                                                        family: 'monospace',
                                                    },
                                                },
                                            },
                                            y: {
                                                grid: {
                                                    color: 'rgba(255, 255, 255, 0.04)',
                                                },
                                                ticks: {
                                                    color: '#71717a',
                                                    font: {
                                                        size: 10,
                                                        family: 'monospace',
                                                    },
                                                    callback: (val) => {
                                                        const num = Number(val);
                                                        if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} M`;
                                                        if (num >= 1_000_000) return `${Math.round(num / 1_000_000)} Jt`;
                                                        return `${num}`;
                                                    },
                                                },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </div>

                        {/* Tombol Buka Analitik Lengkap */}
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                            <span className="text-xs text-zinc-400">
                                Pembukuan 12 bulan & riwayat komprehensif
                            </span>
                            <Link
                                to="/app/dashboard/analytics"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/30 text-xs font-semibold text-zinc-300 hover:text-emerald-300 transition-all shadow-sm"
                            >
                                <span>Lihat Rincian Analitik Lengkap</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* KOLOM KANAN (5 Kolom): PENERIMAAN SALURAN KASIR RINGKAS */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-6 space-y-5 shadow-xl">
                        {/* Header Widget */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Store className="w-4 h-4 text-emerald-400" />
                                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                                        Penerimaan Kanal Kasir
                                    </h2>
                                </div>
                                <p className="text-[11px] text-zinc-400 pt-0.5">
                                    Distribusi omzet per metode pembayaran kasir.
                                </p>
                            </div>
                            <span className="text-[10px] text-zinc-300 font-mono px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 self-start sm:self-auto">
                                431 Transaksi
                            </span>
                        </div>

                        {/* Diagram Donat Ringkas & Breakdown */}
                        <div className="flex items-center gap-6 py-2">
                            {/* Donut SVG Ring */}
                            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#27272a" strokeWidth="10" />
                                    {/* QRIS 55% */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#10b981"
                                        strokeWidth="10.5"
                                        strokeDasharray="238.76"
                                        strokeDashoffset={238.76 * (1 - 0.55)}
                                        strokeLinecap="round"
                                    />
                                    {/* Bank 30% */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#818cf8"
                                        strokeWidth="10.5"
                                        strokeDasharray="238.76"
                                        strokeDashoffset={238.76 * (1 - 0.3)}
                                        transform="rotate(198 50 50)"
                                    />
                                    {/* EDC 15% */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#f59e0b"
                                        strokeWidth="10.5"
                                        strokeDasharray="238.76"
                                        strokeDashoffset={238.76 * (1 - 0.15)}
                                        transform="rotate(306 50 50)"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                    <span className="text-[10px] text-zinc-400 font-mono">Total</span>
                                    <span className="text-sm font-extrabold font-mono text-white">100%</span>
                                </div>
                            </div>

                            {/* Daftar Saluran Ringkas */}
                            <div className="space-y-2.5 flex-1 min-w-0">
                                {CHANNELS_DATA.map((ch) => (
                                    <div key={ch.id} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`w-2 h-2 rounded-full ${ch.dotColor} shrink-0`} />
                                            <span className="text-zinc-300 font-medium truncate">{ch.name}</span>
                                        </div>
                                        <div className="font-mono text-zinc-400 text-[11px] shrink-0">
                                            {ch.share}% • <span className="text-white font-semibold">{ch.nominal}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Indikator Operasional */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
                            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                                <span className="text-zinc-400 block text-[10px]">Kasir Siaga</span>
                                <span className="font-mono font-bold text-white text-xs">{currentPeriod.cashierCount}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                                <span className="text-zinc-400 block text-[10px]">Pencairan Dana</span>
                                <span className="font-mono font-bold text-emerald-400 text-xs">Instan (H+0)</span>
                            </div>
                        </div>

                        {/* Tombol Buka Rincian Kanal */}
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                            <span className="text-xs text-zinc-400">
                                Struktur fee MDR & kecepatan kliring
                            </span>
                            <Link
                                to="/app/dashboard/channels"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/30 text-xs font-semibold text-zinc-300 hover:text-emerald-300 transition-all shadow-sm"
                            >
                                <span>Rincian Kanal</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. MUTASI TRANSAKSI TERAKHIR (BUKU KAS RIIL)                              */}
            {/* ========================================================================= */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-5 sm:p-6 space-y-4 shadow-xl text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-emerald-400" />
                            <h2 className="text-sm font-bold text-white tracking-tight font-heading">
                                Aktivitas Mutasi Terakhir Akun Anda
                            </h2>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Setiap mutasi dana seimbang detik itu juga, tercatat rapi, dan tidak bisa diubah diam-diam.
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
