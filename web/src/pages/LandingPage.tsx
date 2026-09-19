import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ShieldCheck,
    ArrowRight,
    Wallet,
    CheckCircle2,
    Snowflake,
    Sun,
    Check,
    Zap,
    RefreshCw,
    TrendingUp,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Lock,
    Unlock,
    AlertCircle,
    CheckCircle,
    Sparkles,
} from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Navbar } from '../components/landing/Navbar';

interface DashboardTransaction {
    id: string;
    time: string;
    title: string;
    category: string;
    debitAccount: string;
    creditAccount: string;
    amountFormatted: string;
    isIncome: boolean;
}

export const LandingPage: React.FC = () => {
    const { isAuthenticated } = useAuth();

    // Timeframe filter state ('today' | '7d' | '30d')
    type TimeframeType = 'today' | '7d' | '30d';
    const [timeframe, setTimeframe] = useState<TimeframeType>('today');

    // Dynamic metrics state (responsive to simulations)
    const [metricModifiers, setMetricModifiers] = useState({
        addedBalance: 0,
        addedInflow: 0,
    });

    // Vault Freeze & Interactive States
    const [isVaultFrozen, setIsVaultFrozen] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [activeAlert, setActiveAlert] = useState<{
        type: 'success' | 'danger' | 'warning';
        title: string;
        message: string;
    } | null>(null);

    // Dynamic datasets per timeframe
    const timeframeData = {
        today: {
            label: 'Hari Ini',
            baseBalance: 148520000,
            growth: '+18.4% vs kemarin',
            baseInflow: 42150000,
            outflow: 14800000,
            txCount: '142 Transaksi',
            svgPoints: '0,120 90,105 180,125 270,80 360,95 450,40 540,58 600,42',
            svgArea: 'M0,180 L0,120 L90,105 L180,125 L270,80 L360,95 L450,40 L540,58 L600,42 L600,180 Z',
            peakText: 'Puncak Penjualan: +Rp 18.500.000 (14:30 WIB)',
            xLabels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
        },
        '7d': {
            label: '7 Hari Terakhir',
            baseBalance: 284190000,
            growth: '+24.2% minggu ini',
            baseInflow: 195400000,
            outflow: 68200000,
            txCount: '896 Transaksi',
            svgPoints: '0,135 90,115 180,100 270,85 360,65 450,50 540,32 600,24',
            svgArea: 'M0,180 L0,135 L90,115 L180,100 L270,85 L360,65 L450,50 L540,32 L600,24 L600,180 Z',
            peakText: 'Puncak Mingguan: +Rp 64.200.000 (Jumat)',
            xLabels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
        },
        '30d': {
            label: '30 Hari Terakhir',
            baseBalance: 512800000,
            growth: '+31.8% bulan ini',
            baseInflow: 420000000,
            outflow: 180500000,
            txCount: '3.840 Transaksi',
            svgPoints: '0,145 90,130 180,115 270,95 360,72 450,52 540,36 600,18',
            svgArea: 'M0,180 L0,145 L90,130 L180,115 L270,95 L360,72 L450,52 L540,36 L600,18 L600,180 Z',
            peakText: 'Puncak Rekonsiliasi: +Rp 112.000.000 (Tutup Buku)',
            xLabels: ['Mgg 1', 'Mgg 2', 'Mgg 3', 'Mgg 4'],
        },
    };

    const currentDataset = timeframeData[timeframe];
    const displayBalance = currentDataset.baseBalance + metricModifiers.addedBalance;
    const displayInflow = currentDataset.baseInflow + metricModifiers.addedInflow;

    // Real-Time Transactions Feed
    const [transactions, setTransactions] = useState<DashboardTransaction[]>([
        {
            id: 'TRX-948',
            time: 'Baru saja',
            title: 'Pelunasan Invoice B2B #1042',
            category: 'Penjualan Digital',
            debitAccount: 'Kas Utama Bank Central',
            creditAccount: 'Piutang Usaha',
            amountFormatted: '+Rp 12.500.000',
            isIncome: true,
        },
        {
            id: 'TRX-947',
            time: '8 menit lalu',
            title: 'Pembayaran Cloud Server AWS',
            category: 'Infrastruktur',
            debitAccount: 'Beban Operasional',
            creditAccount: 'Kas Bank USD ($150)',
            amountFormatted: '-Rp 2.450.000',
            isIncome: false,
        },
        {
            id: 'TRX-946',
            time: '24 menit lalu',
            title: 'Penerimaan QRIS Merchant',
            category: 'Kasir Retail',
            debitAccount: 'Kas Kliring QRIS',
            creditAccount: 'Pendapatan Harian',
            amountFormatted: '+Rp 3.850.000',
            isIncome: true,
        },
    ]);

    // Handle Simulation 1: Inject Live Invoice Payment
    const handleSimulateIncome = () => {
        if (isVaultFrozen) {
            setActiveAlert({
                type: 'warning',
                title: 'Transaksi Tertahan: Dompet Dibekukan',
                message: 'Kas bisnis saat ini dalam status Vault Freeze. Buka kunci dompet terlebih dahulu untuk memproses uang masuk.',
            });
            return;
        }

        setIsSimulating(true);
        setActiveAlert(null);

        setTimeout(() => {
            const addedVal = 4500000;
            const newTrx: DashboardTransaction = {
                id: `TRX-${Math.floor(950 + Math.random() * 49)}`,
                time: 'Baru saja',
                title: 'Pesanan Masuk Flash Sale #882',
                category: 'E-Commerce Live',
                debitAccount: 'Kas Operasional Bastion',
                creditAccount: 'Pendapatan Bersih Usaha',
                amountFormatted: '+Rp 4.500.000',
                isIncome: true,
            };

            setTransactions((prev) => [newTrx, ...prev.slice(0, 3)]);
            setMetricModifiers((prev) => ({
                addedBalance: prev.addedBalance + addedVal,
                addedInflow: prev.addedInflow + addedVal,
            }));
            setIsSimulating(false);
            setActiveAlert({
                type: 'success',
                title: 'Transaksi Berhasil Dicatat Otomatis',
                message: 'Dana +Rp 4.500.000 masuk dan dicatat berpasangan (Debit = Kredit). Selisih pembukuan: Rp 0 terverifikasi.',
            });
        }, 320);
    };

    // Handle Simulation 2: Toggle Vault Freeze
    const handleToggleVault = () => {
        const nextState = !isVaultFrozen;
        setIsVaultFrozen(nextState);
        if (nextState) {
            setActiveAlert({
                type: 'warning',
                title: 'Mode Darurat: Vault Kas Berhasil Dikunci',
                message: 'Semua mutasi kas keluar dibekukan seketika oleh protokol keamanan Bastion. Tidak ada dana yang bisa dipindahkan.',
            });
        } else {
            setActiveAlert({
                type: 'success',
                title: 'Kunci Vault Berhasil Dibuka',
                message: 'Dompet operasional kembali aktif. Transaksi normal dapat dilanjutkan.',
            });
        }
    };

    // Handle Simulation 3: Stress-Test Anti-Minus Protection
    const handleTestAntiMinus = () => {
        setIsSimulating(true);
        setActiveAlert(null);

        setTimeout(() => {
            setIsSimulating(false);
            setActiveAlert({
                type: 'danger',
                title: 'Ditolak Otomatis oleh Aturan Anti-Minus Bastion',
                message: 'Upaya penarikan Rp 999.000.000 diblokir seketika karena melebihi saldo kas. Sistem Bastion menjamin saldo bisnis Anda tidak akan pernah minus.',
            });
        }, 300);
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white relative overflow-x-hidden">
            {/* Background Grid Kotak-kotak Nyata & Memudar Lembut ke Bawah */}
            <div className="absolute top-0 inset-x-0 h-[1300px] bg-grid-hero pointer-events-none opacity-60 [mask-image:linear-gradient(to_bottom,white_35%,rgba(255,255,255,0.4)_70%,transparent_100%)]" />

            {/* Ambient Lighting Lembut di Balik Grid */}
            <div className="absolute top-28 left-1/3 -translate-x-1/2 w-[550px] h-[350px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />

            {/* Floating Navigation Bar */}
            <Navbar />

            {/* ========================================================================= */}
            {/* SECTION 1: HERO (Clean, Premium, Zero Alay, Layout Fanned Cards)          */}
            {/* ========================================================================= */}
            <section className="relative pt-32 pb-36 sm:pb-44 md:pt-40 md:pb-48 px-4 sm:px-6 max-w-6xl mx-auto text-center">
                {/* Hero Content (Lugas & To The Point) */}
                <div className="space-y-5 max-w-3xl mx-auto relative z-10">
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.12] text-balance font-heading">
                        Kelola Uang Bisnis <br className="hidden sm:inline" />
                        <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(56,189,248,0.2)]">
                            Tanpa Selisih.
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg text-zinc-300/90 max-w-xl mx-auto leading-relaxed">
                        Pencatatan otomatis dan saldo anti-minus dalam satu dasbor modern.
                    </p>

                    {/* Tombol CTA Pill */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                        <Link to={isAuthenticated ? '/app/dashboard' : '/register'}>
                            <button className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl shadow-white/10 transition-all flex items-center justify-center gap-2">
                                <span>{isAuthenticated ? 'Buka Dasbor Saya' : 'Buka Akun Gratis'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                        <a href="#demo">
                            <button className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-semibold border border-zinc-700/80 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 backdrop-blur-md transition-all">
                                Coba Simulasi
                            </button>
                        </a>
                    </div>
                </div>

                {/* ===================================================================== */}
                {/* 3 KARTU TESTIMONI PORTRAIT NUMPUK SEBAGIAN (Ala Mindly)               */}
                {/* ===================================================================== */}
                <div className="relative mt-20 sm:mt-24 max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-end justify-center md:-space-x-8 lg:-space-x-10 px-3">
                    {/* KARTU KIRI: Dimas (Portrait & Terselip Sebagian) */}
                    <div className="w-full max-w-[310px] md:w-[290px] lg:w-[320px] rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-[#16161c]/95 via-[#111115]/95 to-[#0c0c0e]/95 backdrop-blur-xl p-8 text-center shadow-2xl relative z-10 md:-rotate-6 md:translate-y-6 md:origin-bottom-right hover:z-30 hover:rotate-0 hover:translate-y-0 transition-all duration-300 flex flex-col justify-between min-h-[440px] md:min-h-[480px] group">
                        {/* Avatar Muka Orang (Center Div) */}
                        <div className="flex justify-center pt-1">
                            <div className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80"
                                    alt="Dimas K."
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-emerald-400/40 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-500/10"
                                />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center text-[10px] text-zinc-950 font-bold">
                                    ✓
                                </div>
                            </div>
                        </div>

                        {/* Kata-kata Testimoni Santai */}
                        <div className="my-auto py-6 px-1 space-y-3">
                            <p className="font-display text-2xl sm:text-[26px] text-zinc-100 font-normal leading-snug italic">
                                “Asli, gak ada lagi drama pusing nyari selisih duit pas akhir bulan.”
                            </p>
                        </div>

                        {/* Nama & Usaha */}
                        <div className="pt-4 border-t border-white/5 space-y-0.5">
                            <span className="font-semibold text-sm text-white block">Dimas K.</span>
                            <span className="text-xs text-zinc-400 block font-sans">Owner Toko Retail</span>
                        </div>
                    </div>

                    {/* KARTU TENGAH: Sarah (Portrait Paling Depan & Menonjol) */}
                    <div className="w-full max-w-[330px] md:w-[310px] lg:w-[340px] rounded-[2.8rem] border border-blue-500/30 bg-gradient-to-b from-[#1a1a24]/98 via-[#13131a]/98 to-[#0d0d12]/98 backdrop-blur-xl p-8 sm:p-9 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] shadow-blue-500/15 relative z-20 md:-translate-y-2 md:scale-105 hover:scale-108 transition-all duration-300 flex flex-col justify-between min-h-[470px] md:min-h-[510px] group my-4 md:my-0">
                        {/* Avatar Muka Orang (Center Div) */}
                        <div className="flex justify-center pt-1">
                            <div className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"
                                    alt="Sarah T."
                                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-blue-400/50 shadow-2xl shadow-blue-500/20 ring-4 ring-blue-500/15"
                                />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 border-2 border-zinc-950 flex items-center justify-center text-[10px] text-white font-bold">
                                    ★
                                </div>
                            </div>
                        </div>

                        {/* Kata-kata Testimoni Santai */}
                        <div className="my-auto py-6 px-1 space-y-3">
                            <p className="font-display text-2xl sm:text-[28px] text-white font-normal leading-snug italic">
                                “Pas promo rame parah sistemnya tetep aman. Gak ada yang ngomel saldo kepotong dobel.”
                            </p>
                        </div>

                        {/* Nama & Usaha */}
                        <div className="pt-4 border-t border-white/10 space-y-0.5">
                            <span className="font-bold text-sm text-white block">Sarah T.</span>
                            <span className="text-xs text-blue-300 block font-sans">Brand Owner & E-Commerce</span>
                        </div>
                    </div>

                    {/* KARTU KANAN: Kevin (Portrait & Terselip Sebagian) */}
                    <div className="w-full max-w-[310px] md:w-[290px] lg:w-[320px] rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-[#16161c]/95 via-[#111115]/95 to-[#0c0c0e]/95 backdrop-blur-xl p-8 text-center shadow-2xl relative z-10 md:rotate-6 md:translate-y-6 md:origin-bottom-left hover:z-30 hover:rotate-0 hover:translate-y-0 transition-all duration-300 flex flex-col justify-between min-h-[440px] md:min-h-[480px] group">
                        {/* Avatar Muka Orang (Center Div) */}
                        <div className="flex justify-center pt-1">
                            <div className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&auto=format&fit=crop&q=80"
                                    alt="Kevin M."
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-purple-400/40 shadow-xl shadow-purple-500/10 ring-4 ring-purple-500/10"
                                />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500 border-2 border-zinc-950 flex items-center justify-center text-[10px] text-white font-bold">
                                    ✓
                                </div>
                            </div>
                        </div>

                        {/* Kata-kata Testimoni Santai */}
                        <div className="my-auto py-6 px-1 space-y-3">
                            <p className="font-display text-2xl sm:text-[26px] text-zinc-100 font-normal leading-snug italic">
                                “Klien luar bayar Dolar langsung masuk utuh, gak pake ribet bikin rekening baru.”
                            </p>
                        </div>

                        {/* Nama & Usaha */}
                        <div className="pt-4 border-t border-white/5 space-y-0.5">
                            <span className="font-semibold text-sm text-white block">Kevin M.</span>
                            <span className="text-xs text-zinc-400 block font-sans">Agency Lead</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 2: INTERACTIVE PRODUCT DASHBOARD (#demo)                           */}
            {/* ========================================================================= */}
            <section id="demo" className="py-24 relative overflow-hidden">
                {/* Radiant Glowing Divider */}
                <div className="w-full max-w-5xl mx-auto mb-16 px-4">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                </div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                    {/* Section Heading */}
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-400 text-xs font-semibold uppercase tracking-wider font-mono">
                            <Activity className="w-3.5 h-3.5" />
                            <span>PRATINJAU DASBOR INTERAKTIF</span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight font-heading">
                            Dasbor Finansial Modern dalam Genggaman.
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl mx-auto">
                            Pantau arus kas, verifikasi pembukuan berpasangan, dan uji proteksi anti-minus langsung pada miniatur dasbor Bastion di bawah ini.
                        </p>
                    </div>

                    {/* Window Frame Container (Ala Linear / Mercury / Stripe) */}
                    <div className="w-full rounded-3xl border border-white/10 bg-zinc-950/90 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] ring-1 ring-white/5 overflow-hidden text-left">
                        {/* 1. Header Bar Jendela */}
                        <div className="px-5 sm:px-7 py-4 border-b border-white/10 bg-[#121217]/90 flex flex-wrap items-center justify-between gap-3">
                            {/* Window Dots & App Name */}
                            <div className="flex items-center gap-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/40" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
                                </div>
                                <div className="hidden sm:block h-4 w-px bg-white/10" />
                                <span className="text-xs font-semibold text-zinc-300 tracking-tight flex items-center gap-2">
                                    <span>Bastion Financial OS</span>
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-zinc-400 font-normal">Kas Operasional Terkonsolidasi</span>
                                </span>
                            </div>

                            {/* Live Heartbeat & Timeframe Pills */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="hidden sm:inline">Sinkronisasi Real-Time</span>
                                    <span className="font-mono text-[10px] opacity-80">(0.04s)</span>
                                </div>

                                {/* Filter Rentang Waktu Interaktif */}
                                <div className="p-1 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-1">
                                    {[
                                        { id: 'today', label: 'Hari Ini' },
                                        { id: '7d', label: '7 Hari' },
                                        { id: '30d', label: '30 Hari' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setTimeframe(tab.id as TimeframeType)}
                                            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                                                timeframe === tab.id
                                                    ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Dynamic Alert Banner */}
                        {activeAlert && (
                            <div
                                className={`px-6 py-3 border-b flex items-center justify-between text-xs transition-all animate-in fade-in ${
                                    activeAlert.type === 'success'
                                        ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                                        : activeAlert.type === 'danger'
                                        ? 'bg-red-950/40 border-red-800/40 text-red-300'
                                        : 'bg-amber-950/40 border-amber-800/40 text-amber-300'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    {activeAlert.type === 'success' ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                    ) : activeAlert.type === 'danger' ? (
                                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                    ) : (
                                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                                    )}
                                    <div>
                                        <span className="font-bold">{activeAlert.title}: </span>
                                        <span className="text-zinc-300">{activeAlert.message}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveAlert(null)}
                                    className="text-zinc-400 hover:text-white px-2 py-0.5 text-[11px] rounded transition-colors"
                                >
                                    ✕ Tutup
                                </button>
                            </div>
                        )}

                        {/* 2. Main Dashboard Content */}
                        <div className="p-6 sm:p-8 space-y-7">
                            {/* Baris Metrik Utama (4 KPI Cards) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Metrik 1: Total Saldo Kas */}
                                <div className="p-5 rounded-2xl bg-[#14141a]/80 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                                        <span>Total Kas Terkonsolidasi</span>
                                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                            {currentDataset.growth}
                                        </span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                                        Rp {displayBalance.toLocaleString('id-ID')},00
                                    </div>
                                    <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>100% Cocok dengan Mutasi Fisik</span>
                                    </div>
                                </div>

                                {/* Metrik 2: Uang Masuk (Kredit) */}
                                <div className="p-5 rounded-2xl bg-[#14141a]/80 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                                        <span>Total Uang Masuk (Kredit)</span>
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono tracking-tight">
                                        +Rp {displayInflow.toLocaleString('id-ID')}
                                    </div>
                                    <div className="text-[11px] text-zinc-500">
                                        {currentDataset.txCount} berhasil tervalidasi
                                    </div>
                                </div>

                                {/* Metrik 3: Pengeluaran (Debit) */}
                                <div className="p-5 rounded-2xl bg-[#14141a]/80 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                                        <span>Beban Operasional (Debit)</span>
                                        <div className="w-6 h-6 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                                            <ArrowDownRight className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold text-sky-300 font-mono tracking-tight">
                                        -Rp {currentDataset.outflow.toLocaleString('id-ID')}
                                    </div>
                                    <div className="text-[11px] text-zinc-500">
                                        Gaji, tagihan vendor, & cloud
                                    </div>
                                </div>

                                {/* Metrik 4: Integritas Pembukuan */}
                                <div className="p-5 rounded-2xl bg-[#14141a]/80 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                                        <span>Integritas Pembukuan</span>
                                        <Badge variant={isVaultFrozen ? 'warning' : 'success'}>
                                            {isVaultFrozen ? 'VAULT TERKUNCI' : 'SEIMBANG'}
                                        </Badge>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
                                        <ShieldCheck className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
                                        <span>Nol Selisih</span>
                                    </div>
                                    <div className="text-[11px] text-zinc-500">
                                        Double-entry ledger otomatis
                                    </div>
                                </div>
                            </div>

                            {/* Glowing SVG Area Chart (Visual Arus Kas) */}
                            <div className="p-6 rounded-2xl bg-[#111116]/90 border border-white/5 space-y-4 relative overflow-hidden">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                                            <span>Tren Arus Kas Terkonsolidasi</span>
                                            <span className="text-[11px] font-normal text-zinc-500 font-mono">
                                                ({currentDataset.label})
                                            </span>
                                        </h4>
                                        <p className="text-xs text-zinc-400">
                                            Garis kurva pergerakan kas masuk dan debit operasional secara real-time.
                                        </p>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                        <span>{currentDataset.peakText}</span>
                                    </div>
                                </div>

                                {/* Area Chart Canvas */}
                                <div className="relative w-full h-44 sm:h-52 pt-2">
                                    <svg
                                        viewBox="0 0 600 180"
                                        className="w-full h-full overflow-visible"
                                        preserveAspectRatio="none"
                                    >
                                        <defs>
                                            <linearGradient id="chartGradientGlow" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                                                <stop offset="60%" stopColor="#2563eb" stopOpacity="0.08" />
                                                <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Horizontal Reference Lines */}
                                        <line x1="0" y1="45" x2="600" y2="45" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                                        <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                                        <line x1="0" y1="135" x2="600" y2="135" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                                        {/* Filled Glowing Area */}
                                        <path
                                            d={currentDataset.svgArea}
                                            fill="url(#chartGradientGlow)"
                                            className="transition-all duration-500 ease-out"
                                        />

                                        {/* Crisp Glowing Stroke Path */}
                                        <polyline
                                            fill="none"
                                            stroke="#38bdf8"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            points={currentDataset.svgPoints}
                                            className="transition-all duration-500 ease-out drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                                        />

                                        {/* Peak Highlight Circle */}
                                        <circle
                                            cx="450"
                                            cy="40"
                                            r="5"
                                            className="fill-sky-400 stroke-zinc-950 stroke-[2] shadow-lg animate-pulse"
                                        />
                                    </svg>

                                    {/* X-Axis Labels */}
                                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 font-mono">
                                        {currentDataset.xLabels.map((label, idx) => (
                                            <span key={idx}>{label}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Dua Kolom Bawah: Mutasi Real-Time & Simulator Kontrol */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                {/* Kolom Kiri (7 Cols): Buku Kas Mutasi Berpasangan */}
                                <div className="lg:col-span-7 rounded-2xl bg-[#111116]/90 border border-white/5 p-5 sm:p-6 space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                            <h4 className="text-sm font-bold text-white tracking-tight">
                                                Mutasi Berpasangan Real-Time
                                            </h4>
                                        </div>
                                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono font-medium">
                                            DEBIT = KREDIT ✓
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {transactions.map((trx) => (
                                            <div
                                                key={trx.id}
                                                className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-white/10 transition-all space-y-2 group"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white group-hover:text-blue-300 transition-colors">
                                                            {trx.title}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 px-2 py-0.5 rounded bg-zinc-800/80">
                                                            {trx.category}
                                                        </span>
                                                    </div>
                                                    <span className="text-zinc-500 font-mono text-[10px]">
                                                        {trx.time}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-xs pt-1">
                                                    {/* Double Entry Pairing Indicator */}
                                                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                                        <span className="text-zinc-300 font-medium">Debit: {trx.debitAccount}</span>
                                                        <span className="text-zinc-600">⇄</span>
                                                        <span className="text-zinc-300 font-medium">Kredit: {trx.creditAccount}</span>
                                                    </div>
                                                    <span
                                                        className={`font-bold font-mono text-sm ${
                                                            trx.isIncome ? 'text-emerald-400' : 'text-sky-300'
                                                        }`}
                                                    >
                                                        {trx.amountFormatted}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                                        <span>Protokol Double-Entry Ledger</span>
                                        <span className="text-emerald-400 font-medium">Rekonsiliasi Otomatis Aktif</span>
                                    </div>
                                </div>

                                {/* Kolom Kanan (5 Cols): Pusat Simulasi Kontrol Interaktif */}
                                <div className="lg:col-span-5 rounded-2xl bg-gradient-to-b from-[#161620]/95 to-[#101015]/95 border border-white/10 p-5 sm:p-6 space-y-4 shadow-xl">
                                    <div className="border-b border-white/5 pb-3">
                                        <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-blue-400 fill-current" />
                                            <span>Pusat Simulasi Interaktif</span>
                                        </h4>
                                        <p className="text-xs text-zinc-400 pt-0.5">
                                            Klik tombol di bawah untuk melihat bagaimana sistem Bastion merespons.
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
                                        {/* Aksi 1: Simulasikan Transaksi Masuk */}
                                        <button
                                            onClick={handleSimulateIncome}
                                            disabled={isSimulating}
                                            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-blue-600/25 transition-all group"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {isSimulating ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                                ) : (
                                                    <Zap className="w-4 h-4 fill-current text-blue-200 group-hover:scale-110 transition-transform" />
                                                )}
                                                <span>Simulasikan Uang Masuk</span>
                                            </div>
                                            <span className="text-xs font-mono bg-blue-700/60 px-2 py-0.5 rounded-md text-blue-100">
                                                +Rp 4.5 Juta
                                            </span>
                                        </button>

                                        {/* Aksi 2: Toggle Vault Freeze */}
                                        <button
                                            onClick={handleToggleVault}
                                            className={`w-full py-3 px-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all ${
                                                isVaultFrozen
                                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900/60'
                                                    : 'bg-zinc-900/80 text-zinc-200 border-zinc-700/80 hover:bg-zinc-800'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {isVaultFrozen ? (
                                                    <Unlock className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <Lock className="w-4 h-4 text-amber-400" />
                                                )}
                                                <span>
                                                    {isVaultFrozen ? 'Buka Kunci Dompet' : 'Kunci Dompet (Vault Freeze)'}
                                                </span>
                                            </div>
                                            <span
                                                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                                                    isVaultFrozen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                                                }`}
                                            >
                                                {isVaultFrozen ? 'TERKUNCI' : 'STANDBY'}
                                            </span>
                                        </button>

                                        {/* Aksi 3: Uji Coba Anti-Minus */}
                                        <button
                                            onClick={handleTestAntiMinus}
                                            disabled={isSimulating}
                                            className="w-full py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/90 text-zinc-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center justify-between transition-all group"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <ShieldCheck className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                                                <span>Uji Tarik Melebihi Saldo</span>
                                            </div>
                                            <span className="text-[10px] font-mono bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                                                Anti-Minus
                                            </span>
                                        </button>
                                    </div>

                                    {/* Security Guarantee Note */}
                                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-[11px] text-zinc-400 space-y-1">
                                        <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Jaminan Sistem Bastion</span>
                                        </div>
                                        <p className="leading-relaxed">
                                            Setiap transaksi divalidasi secara atomik. Saldo kas bisnis tidak akan pernah bernilai negatif atau mengalami selisih siluman.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 3: KEUNGGULAN - BENTO GRID RAMAH & STRAIGHTFORWARD (#keunggulan)  */}
            {/* ========================================================================= */}
            <section id="keunggulan" className="py-24 relative">
                {/* Radiant Glowing Divider */}
                <div className="w-full max-w-5xl mx-auto mb-16 px-4">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                </div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
                    <div className="text-left max-w-xl space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                            KEUNGGULAN UTAMA
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                            Semua yang Bisnis Anda Butuhkan.
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                            Praktis seperti dompet digital, akurat seperti pembukuan perbankan.
                        </p>
                    </div>

                    {/* 4-Card Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                        {/* Bento 1: Multi-Mata Uang (Span 7 Col) */}
                        <div className="md:col-span-7 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3 relative z-10">
                                <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                                    <span className="text-zinc-400">01</span>
                                    <span>/</span>
                                    <span className="text-zinc-400">Multi-Mata Uang</span>
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Satu Akun untuk Berbagai Mata Uang
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg">
                                    Simpan Rupiah, Dolar AS, dan mata uang lainnya secara berdampingan tanpa repot membuka dan mengurus banyak rekening bank.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-2 relative z-10">
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-1">
                                    <span className="text-[10px] text-zinc-400 block font-medium">RUPIAH</span>
                                    <span className="text-sm font-bold text-white block font-mono">Rp 45,0 Juta</span>
                                    <span className="text-[10px] text-emerald-400">Kas Operasional</span>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-1">
                                    <span className="text-[10px] text-zinc-400 block font-medium">DOLAR</span>
                                    <span className="text-sm font-bold text-white block font-mono">$3,250</span>
                                    <span className="text-[10px] text-blue-400">Klien Global</span>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-1">
                                    <span className="text-[10px] text-zinc-400 block font-medium">DOLAR SG</span>
                                    <span className="text-sm font-bold text-white block font-mono">S$ 4,800</span>
                                    <span className="text-[10px] text-purple-400">Regional Asia</span>
                                </div>
                            </div>
                        </div>

                        {/* Bento 2: Anti Saldo Minus (Span 5 Col) */}
                        <div className="md:col-span-5 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                                    <span className="text-zinc-400">02</span>
                                    <span>/</span>
                                    <span className="text-zinc-400">Proteksi Saldo</span>
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Saldo Anti-Minus & Bebas Potong Dobel
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Sistem secara otomatis mengunci saldo saat transaksi berjalan agar uang bisnis Anda tidak pernah terpotong dua kali.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold font-mono">
                                    <span>PROTEKSI TRANSAKSI GANDA</span>
                                    <span>AKTIF</span>
                                </div>
                                <p className="text-[11px] text-zinc-400">
                                    Saldo tidak akan pernah minus, sekalipun transaksi masuk bersamaan.
                                </p>
                            </div>
                        </div>

                        {/* Bento 3: Laporan Rapi (Span 5 Col) */}
                        <div className="md:col-span-5 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                                    <span className="text-zinc-400">03</span>
                                    <span>/</span>
                                    <span className="text-zinc-400">Pembukuan Otomatis</span>
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Laporan Keuangan Rapi Tanpa Lembur
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Semua mutasi sudah terhubung rapi sejak awal. Rekonsiliasi dan laporan bulanan selesai dalam hitungan detik.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="font-bold text-white block">Pencatatan Berpasangan</span>
                                    <span className="text-[11px] text-zinc-400">Laporan siap kapan saja</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    100% SEIMBANG
                                </span>
                            </div>
                        </div>

                        {/* Bento 4: Kunci Dompet (Span 7 Col) */}
                        <div className="md:col-span-7 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                                    <span className="text-zinc-400">04</span>
                                    <span>/</span>
                                    <span className="text-zinc-400">Kendali Pengeluaran</span>
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Kunci Pengeluaran Kapan Saja
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg">
                                    Bekukan pengeluaran akun tertentu dengan satu klik saat dibutuhkan, tanpa mengganggu operasional akun lainnya.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-bold text-white block">Kendali Akun Instan</span>
                                    <span className="text-[11px] text-zinc-400">Uang masuk tetap aman diterima, pengeluaran terkunci sementara</span>
                                </div>
                                <span className="text-[11px] text-zinc-300 font-mono font-medium px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 whitespace-nowrap">
                                    KENDALI PENUH
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 4: KEAMANAN & PENDAFTARAN (#keamanan)                             */}
            {/* ========================================================================= */}
            <section id="keamanan" className="py-24 relative">
                {/* Radiant Glowing Divider */}
                <div className="w-full max-w-5xl mx-auto mb-16 px-4">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                </div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        {/* Kiri */}
                        <div className="lg:col-span-7 space-y-5 text-left">
                            <div className="inline-flex items-center gap-2 text-xs text-emerald-400 font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>KEAMANAN TINGGI • AMAN & TERPERCAYA</span>
                            </div>

                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                                Uang Bisnis Aman. <br />
                                <span className="text-zinc-500">Saldo Pasti Tepat.</span>
                            </h2>

                            <p className="text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
                                Dilindungi enkripsi mutakhir berstandar perbankan agar Anda bisa fokus membesarkan bisnis tanpa rasa was-was.
                            </p>

                            <div className="pt-6 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                                <div>
                                    <span className="text-white text-sm font-bold block">Enkripsi Kuat</span>
                                    <span className="text-[11px] text-zinc-400">Data Terlindungi</span>
                                </div>
                                <div>
                                    <span className="text-white text-sm font-bold block">Pasti Seimbang</span>
                                    <span className="text-[11px] text-zinc-400">Bebas Selisih</span>
                                </div>
                                <div>
                                    <span className="text-white text-sm font-bold block">Anti-Minus</span>
                                    <span className="text-[11px] text-zinc-400">Proteksi Saldo</span>
                                </div>
                                <div>
                                    <span className="text-white text-sm font-bold block">Multi-Mata Uang</span>
                                    <span className="text-[11px] text-zinc-400">IDR, USD & Lainnya</span>
                                </div>
                            </div>
                        </div>

                        {/* Kanan */}
                        <div className="lg:col-span-5 text-left">
                            <div className="rounded-3xl border border-zinc-800 bg-[#111114] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                                <div className="space-y-1.5">
                                    <span className="text-[11px] text-blue-400 uppercase tracking-wider font-semibold block font-mono">
                                        MULAI HARI INI
                                    </span>
                                    <h3 className="text-2xl font-bold text-white tracking-tight">
                                        Rapikan Keuangan Bisnis Anda
                                    </h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Mulai simpan dan pantau perputaran uang dalam satu dasbor rapi. Pendaftaran selesai hanya dalam 2 menit.
                                    </p>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Link to={isAuthenticated ? '/app/dashboard' : '/register'} className="block">
                                        <Button
                                            size="lg"
                                            className="w-full py-4 text-sm font-bold shadow-lg shadow-blue-600/25 bg-blue-600 hover:bg-blue-500 text-white border-0 rounded-full"
                                            rightIcon={<ArrowRight className="w-4 h-4" />}
                                        >
                                            {isAuthenticated ? 'Buka Dasbor Saya' : 'Buka Akun Gratis Sekarang'}
                                        </Button>
                                    </Link>
                                    <a href="#demo" className="block">
                                        <button className="w-full py-3.5 text-xs font-semibold rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors">
                                            Coba Simulasi di Atas ↑
                                        </button>
                                    </a>
                                </div>

                                <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                                    <span className="flex items-center gap-1.5">
                                        <Check className="w-4 h-4 text-emerald-400" /> Bebas biaya bulanan
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Check className="w-4 h-4 text-emerald-400" /> Buka akun 2 menit
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* FOOTER                                                                    */}
            {/* ========================================================================= */}
            <footer className="border-t border-zinc-800/80 bg-[#09090b] py-12 text-xs text-zinc-400 text-left">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">
                        {/* Kolom Brand */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm">
                                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                                </div>
                                <span className="font-bold text-base text-white tracking-tight">Bastion</span>
                            </div>
                            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                                Dompet digital bisnis dan pembukuan otomatis. Menjaga saldo keuangan Anda selalu seimbang, aman, dan mudah dipantau setiap hari.
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Sistem Siap Operasional • Standar Multi-Mata Uang</span>
                            </div>
                        </div>

                        {/* Kolom Navigasi */}
                        <div className="lg:col-span-3 space-y-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white block">
                                Navigasi Halaman
                            </span>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li><a href="#demo" className="hover:text-white transition-colors">Coba Simulasi Dompet</a></li>
                                <li><a href="#keunggulan" className="hover:text-white transition-colors">Keunggulan Bastion</a></li>
                                <li><a href="#keamanan" className="hover:text-white transition-colors">Jaminan Keamanan</a></li>
                                <li><Link to="/login" className="hover:text-white transition-colors">Masuk Akun</Link></li>
                            </ul>
                        </div>

                        {/* Kolom Keamanan */}
                        <div className="lg:col-span-4 space-y-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white block">
                                Jaminan & Keamanan
                            </span>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li><span className="text-zinc-300">Pencatatan Otomatis Seimbang</span></li>
                                <li><span className="text-zinc-300">Proteksi Anti Saldo Minus</span></li>
                                <li><span className="text-zinc-300">Perlindungan Transaksi Dobel</span></li>
                                <li><span className="text-zinc-300">Enkripsi Sandi & Akun Tingkat Tinggi</span></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
                        <p>&copy; {new Date().getFullYear()} Bastion Financial. Hak cipta dilindungi undang-undang.</p>
                        <p className="text-zinc-500">
                            Membantu bisnis mengelola dana dengan tenang dan teratur.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
