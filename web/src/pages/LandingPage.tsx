import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ShieldCheck,
    ArrowRight,
    Lock,
    Wallet,
    CheckCircle2,
    Snowflake,
    Sun,
    Check,
    Cpu,
    Zap,
    RefreshCw,
    Database,
    Layers,
    Plus,
    Heart,
} from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Navbar } from '../components/landing/Navbar';

interface LedgerEntry {
    id: string;
    timestamp: string;
    category: string;
    description: string;
    amountFormatted: string;
    status: 'TERCATAT' | 'AMAN';
}

export const LandingPage: React.FC = () => {
    const { isAuthenticated } = useAuth();

    // Multi-Currency Balances State
    const [selectedCurrency, setSelectedCurrency] = useState<'IDR' | 'USD' | 'SGD'>('IDR');
    const [balances, setBalances] = useState({
        IDR: 45000000,
        USD: 3250,
        SGD: 4800,
    });

    // Vault Freeze State
    const [isVaultFrozen, setIsVaultFrozen] = useState(false);

    // Live Simulator State
    const [simAmount, setSimAmount] = useState<number>(1500000);
    const [isProcessing, setIsProcessing] = useState(false);
    const [concurrencyFeedback, setConcurrencyFeedback] = useState<string | null>(null);
    const [ledgerHistory, setLedgerHistory] = useState<LedgerEntry[]>([
        {
            id: 'TRX-849',
            timestamp: '15:32:04',
            category: 'Pemasukan Invoice',
            description: 'Uang masuk ke Kas Operasional',
            amountFormatted: '+Rp 2.500.000',
            status: 'TERCATAT',
        },
        {
            id: 'TRX-848',
            timestamp: '15:28:11',
            category: 'Pembayaran Vendor',
            description: 'Keluar dari Kas Utama USD',
            amountFormatted: '-$150.00',
            status: 'TERCATAT',
        },
    ]);

    // Handle Transfer Simulation
    const handleExecuteTransfer = () => {
        if (isVaultFrozen || isProcessing) return;

        setIsProcessing(true);
        setConcurrencyFeedback(null);

        setTimeout(() => {
            const formattedAmount =
                selectedCurrency === 'IDR'
                    ? `Rp ${simAmount.toLocaleString('id-ID')}`
                    : selectedCurrency === 'USD'
                    ? `$${(simAmount / 15000).toFixed(2)}`
                    : `S$ ${(simAmount / 11500).toFixed(2)}`;

            const incrementValue =
                selectedCurrency === 'IDR'
                    ? simAmount
                    : selectedCurrency === 'USD'
                    ? Math.round(simAmount / 15000)
                    : Math.round(simAmount / 11500);

            setBalances((prev) => ({
                ...prev,
                [selectedCurrency]: prev[selectedCurrency] + incrementValue,
            }));

            const now = new Date();
            const timeString = now.toTimeString().split(' ')[0];

            const newEntry: LedgerEntry = {
                id: `TRX-${Math.floor(100 + Math.random() * 900)}`,
                timestamp: timeString,
                category: `Terima Pembayaran ${selectedCurrency}`,
                description: `Masuk ke Dompet ${selectedCurrency} Bisnis`,
                amountFormatted: `+${formattedAmount}`,
                status: 'TERCATAT',
            };

            setLedgerHistory((prev) => [newEntry, ...prev.slice(0, 3)]);
            setIsProcessing(false);
        }, 320);
    };

    // Handle Stress-Test Concurrency
    const handleStressTest = () => {
        if (isVaultFrozen || isProcessing) return;

        setIsProcessing(true);
        setTimeout(() => {
            setConcurrencyFeedback('🛡️ Sistem mendeteksi 5 klik sekaligus: Tenang, uang pelanggan Anda tidak terpotong dua kali, hanya 1 transaksi sah yang diproses!');
            handleExecuteTransfer();
        }, 380);
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white relative overflow-x-hidden">
            {/* Background Grid Pattern (Kotak-kotak halus khas architectural grid) */}
            <div className="absolute inset-0 bg-grid-subtle pointer-events-none opacity-50 [mask-image:radial-gradient(ellipse_at_center,white_30%,transparent_80%)]" />

            {/* Floating Navigation Bar (Untouched) */}
            <Navbar />

            {/* ========================================================================= */}
            {/* SECTION 1: HERO (Layout Inspirasi Foto 2 dengan Estetika FinTech Bastion) */}
            {/* ========================================================================= */}
            <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-4 sm:px-6 max-w-6xl mx-auto text-center">
                {/* Floating Circular Sticker Badges (Kiri & Kanan seperti di referensi) */}
                <div className="absolute left-6 lg:left-14 top-44 hidden md:flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/40 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-xl shadow-amber-500/10 animate-bounce duration-1000">
                        <Plus className="w-6 h-6 stroke-[2.5]" />
                    </div>
                </div>

                <div className="absolute right-6 lg:right-14 top-36 hidden md:flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 backdrop-blur-md flex items-center justify-center text-blue-300 shadow-xl shadow-blue-500/10 animate-pulse">
                        <Heart className="w-5 h-5 fill-current" />
                    </div>
                </div>

                {/* Main Hero Content */}
                <div className="space-y-6 max-w-4xl mx-auto relative z-10">
                    {/* Headline Utama */}
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.15] text-balance">
                        Uang Bisnis Tercatat Rapi, <br className="hidden sm:inline" />
                        <span className="bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                            Saldo Selalu Pas Tanpa Selisih.
                        </span>
                    </h1>

                    {/* Sub-headline tanpa em-dash */}
                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                        Tinggalkan cara manual yang bikin pusing di akhir bulan. Bastion mencatat pemasukan dan pengeluaran secara otomatis dengan sistem perbankan modern, bebas salah hitung, anti-minus, dan siap dipantau kapan saja.
                    </p>

                    {/* Tombol CTA dengan radius pill penuh (rounded-full) */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
                        <Link to={isAuthenticated ? '/app/dashboard' : '/register'}>
                            <button className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl shadow-white/10 transition-all flex items-center justify-center gap-2">
                                <span>{isAuthenticated ? 'Buka Dasbor Saya' : 'Buka Akun Gratis Sekarang'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                        <a href="#demo">
                            <button className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-semibold border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 backdrop-blur-md transition-all">
                                Coba Simulasi Langsung
                            </button>
                        </a>
                    </div>
                </div>

                {/* ===================================================================== */}
                {/* 3 CARDS PEAKING & FANNING OUT DI BAGIAN BAWAH HERO (Persis Foto 2)    */}
                {/* ===================================================================== */}
                <div className="relative mt-16 sm:mt-20 max-w-4xl mx-auto">
                    {/* Karakter Maskot / Glowing Orb Peeking di belakang kartu tengah */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full bg-blue-600/30 blur-2xl pointer-events-none" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-0 hidden sm:flex items-center justify-center">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-500/40 backdrop-blur-md flex items-center justify-center text-blue-300 shadow-lg animate-bounce duration-1000">
                            <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
                        </div>
                    </div>

                    {/* Fanned 3 Cards Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-4 items-end relative z-10">
                        {/* KARTU KIRI: Miring ke Kiri (-rotate-3) */}
                        <div className="rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-[#141418] via-[#101013] to-[#0c0c0e] p-6 text-left shadow-2xl md:-rotate-3 md:translate-y-4 hover:rotate-0 hover:translate-y-0 transition-all duration-300 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                                    IDR
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-white block">Kas Operasional</span>
                                    <span className="text-[10px] text-zinc-500">Rekening Dompet Utama</span>
                                </div>
                            </div>
                            <p className="text-xs text-zinc-300 font-medium leading-relaxed mb-4">
                                Berapa saldo kas bersih yang siap digunakan untuk operasional bulan ini?
                            </p>
                            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                                <span className="text-sm font-bold font-mono text-white">Rp 45.000.000</span>
                                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    100% Cocok
                                </span>
                            </div>
                        </div>

                        {/* KARTU TENGAH: Berdiri Tegak & Terangkat (Elevated Center Card) */}
                        <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-[#181820] via-[#121218] to-[#0d0d12] p-6 sm:p-7 text-left shadow-2xl shadow-blue-500/10 z-20 md:scale-105 hover:scale-108 transition-all duration-300 relative group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
                                    <Zap className="w-5 h-5 fill-current" />
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-white block">Jantung Pembukuan</span>
                                    <span className="text-[11px] text-blue-400">Pencatatan Otomatis</span>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-200 font-semibold leading-relaxed mb-4">
                                Setiap mutasi langsung diverifikasi berpasangan tanpa ada uang yang terselip.
                            </p>
                            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                                <span className="text-zinc-400 font-medium">16 Mutasi Hari Ini</span>
                                <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/30">
                                    Pasti Klop (0 Selisih)
                                </span>
                            </div>
                        </div>

                        {/* KARTU KANAN: Miring ke Kanan (rotate-3) */}
                        <div className="rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-[#141418] via-[#101013] to-[#0c0c0e] p-6 text-left shadow-2xl md:rotate-3 md:translate-y-4 hover:rotate-0 hover:translate-y-0 transition-all duration-300 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400">
                                    USD
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-white block">Dolar Klien Global</span>
                                    <span className="text-[10px] text-zinc-500">Brankas Valuta Asing</span>
                                </div>
                            </div>
                            <p className="text-xs text-zinc-300 font-medium leading-relaxed mb-4">
                                Apakah pembayaran dari klien luar negeri sudah masuk dan terkonversi aman?
                            </p>
                            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                                <span className="text-sm font-bold font-mono text-white">$3,250.00</span>
                                <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                    Terisolasi Aman
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 2: THE PROOF — DUAL-PANE INTERACTIVE SIMULATOR (#demo)            */}
            {/* ========================================================================= */}
            <section id="demo" className="py-24 border-t border-zinc-800/80 bg-[#0c0c0e]/80 relative overflow-hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                    {/* Header Section */}
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">
                            UJI COBA INTERAKTIF
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                            Coba Sendiri: Rasakan Kemudahan Pembukuan Otomatis.
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                            Coba klik simulasi transaksi di sebelah kiri, dan saksikan bagaimana sistem di sebelah kanan mencatat pembukuan secara otomatis tanpa ada uang yang terselip.
                        </p>
                    </div>

                    {/* Dual-Pane Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* PANE KIRI: Dompet Pengguna */}
                        <div className="lg:col-span-7 rounded-3xl border border-zinc-800 bg-gradient-to-b from-[#141418] to-[#0d0d10] p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                                            <Wallet className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base">Dompet Bisnis Anda</h3>
                                            <span className="text-[11px] text-zinc-400">Pilih mata uang dan nominal yang ingin diuji</span>
                                        </div>
                                    </div>
                                    <Badge variant={isVaultFrozen ? 'warning' : 'success'}>
                                        {isVaultFrozen ? 'DOMPET DIKUNCI SEMENTARA' : 'SIAP DIGUNAKAN'}
                                    </Badge>
                                </div>

                                {/* Currency Switcher */}
                                <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                                    {[
                                        { id: 'IDR', flag: '🇮🇩', name: 'Rupiah' },
                                        { id: 'USD', flag: '🇺🇸', name: 'Dolar AS' },
                                        { id: 'SGD', flag: '🇸🇬', name: 'Dolar SG' },
                                    ].map((curr) => (
                                        <button
                                            key={curr.id}
                                            onClick={() => setSelectedCurrency(curr.id as 'IDR' | 'USD' | 'SGD')}
                                            className={`py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                                selectedCurrency === curr.id
                                                    ? 'bg-zinc-800 text-white shadow-sm font-bold'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            <span>{curr.flag}</span>
                                            <span>{curr.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Tampilan Saldo */}
                                <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                                    <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-medium">
                                        Saldo Tersedia Saat Ini
                                    </span>
                                    <div className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
                                        {selectedCurrency === 'IDR'
                                            ? `Rp ${balances.IDR.toLocaleString('id-ID')},00`
                                            : selectedCurrency === 'USD'
                                            ? `$${balances.USD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                            : `S$ ${balances.SGD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                                    </div>
                                    <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Saldo aman dan selalu cocok dengan mutasi asli</span>
                                    </p>
                                </div>

                                {/* Pilihan Nominal */}
                                <div className="space-y-2">
                                    <span className="text-xs text-zinc-400 font-medium">Pilih Contoh Nominal Mutasi:</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: selectedCurrency === 'IDR' ? 'Rp 500 Ribu' : selectedCurrency === 'USD' ? '$50' : 'S$ 50', val: 500000 },
                                            { label: selectedCurrency === 'IDR' ? 'Rp 1,5 Juta' : selectedCurrency === 'USD' ? '$100' : 'S$ 100', val: 1500000 },
                                            { label: selectedCurrency === 'IDR' ? 'Rp 5 Juta' : selectedCurrency === 'USD' ? '$350' : 'S$ 350', val: 5000000 },
                                        ].map((preset) => (
                                            <button
                                                key={preset.label}
                                                onClick={() => setSimAmount(preset.val)}
                                                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                                                    simAmount === preset.val
                                                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 font-semibold'
                                                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tombol Aksi */}
                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleExecuteTransfer}
                                    disabled={isVaultFrozen || isProcessing}
                                    className="w-full py-3.5 px-4 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
                                >
                                    {isProcessing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Mencatat Transaksi Otomatis...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 fill-current" />
                                            <span>
                                                Coba Tambah Saldo (
                                                {selectedCurrency === 'IDR'
                                                    ? `+Rp ${simAmount.toLocaleString('id-ID')}`
                                                    : selectedCurrency === 'USD'
                                                    ? `+$${(simAmount / 15000).toFixed(2)}`
                                                    : `+S$ ${(simAmount / 11500).toFixed(2)}`}
                                                )
                                            </span>
                                        </>
                                    )}
                                </button>

                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        onClick={() => setIsVaultFrozen(!isVaultFrozen)}
                                        className={`flex-1 py-2.5 px-4 rounded-full border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                                            isVaultFrozen
                                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                                                : 'bg-zinc-900/70 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                        }`}
                                    >
                                        {isVaultFrozen ? (
                                            <>
                                                <Sun className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>Buka Kunci Dompet</span>
                                            </>
                                        ) : (
                                            <>
                                                <Snowflake className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Kunci Dompet Sementara</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleStressTest}
                                        disabled={isVaultFrozen || isProcessing}
                                        className="py-2.5 px-4 rounded-full border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                                        title="Uji coba sistem mencegah uang terpotong dobel"
                                    >
                                        ⚡ Uji Klik Cepat 5x
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* PANE KANAN: Buku Kas Otomatis */}
                        <div className="lg:col-span-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl flex flex-col justify-between space-y-5 text-left">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="text-xs font-bold text-white tracking-wider font-mono">BUKU KAS OTOMATIS</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-medium">
                                        PASTI KLOP (100% SEIMBANG)
                                    </span>
                                </div>

                                {/* Status Box Ramah */}
                                <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-xs space-y-1">
                                    <div className="flex items-center justify-between text-zinc-300 font-medium">
                                        <span>Hasil Rekonsiliasi:</span>
                                        <span className="text-emerald-400 font-bold">Nol Selisih</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400">
                                        Setiap uang yang masuk atau keluar langsung dicatat berpasangan saat itu juga.
                                    </p>
                                </div>

                                {/* Feedback Uji Dobel */}
                                {concurrencyFeedback && (
                                    <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/50 text-xs text-blue-300 animate-in fade-in space-y-1">
                                        <div className="font-bold flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-blue-400" />
                                            <span>Proteksi Dobel Transaksi Aktif</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-300 leading-relaxed">{concurrencyFeedback}</p>
                                    </div>
                                )}

                                {/* Log Mutasi Sederhana */}
                                <div className="space-y-2.5">
                                    <span className="text-xs text-zinc-400 font-medium block">Riwayat Pencatatan Terbaru:</span>
                                    {ledgerHistory.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/70 text-xs space-y-1 hover:border-zinc-700 transition-colors"
                                        >
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-bold text-white">{item.category}</span>
                                                <span className="text-zinc-500 text-[10px]">{item.timestamp}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-zinc-400">{item.description}</span>
                                                <span className="font-bold text-emerald-400 font-mono">{item.amountFormatted}</span>
                                            </div>
                                            <div className="pt-1 border-t border-zinc-800/50 flex items-center justify-between text-[10px] text-zinc-500">
                                                <span>No. Mutasi: {item.id}</span>
                                                <span className="text-emerald-400 font-medium">Tersimpan Permanen ✓</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-3 flex items-center justify-between">
                                <span>Pencatatan Berpasangan Otomatis</span>
                                <span className="text-zinc-300 font-medium">Bebas Salah Hitung</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 3: KEUNGGULAN — BENTO GRID RAMAH & BERBOBOT (#keunggulan)         */}
            {/* ========================================================================= */}
            <section id="keunggulan" className="py-24 border-t border-zinc-800/80 relative">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                    {/* Header */}
                    <div className="text-left max-w-xl space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                            KENAPA MEMILIH BASTION?
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                            Semua Kemudahan Finansial yang Bisnis Anda Butuhkan.
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                            Kami menggabungkan kenyamanan dompet digital modern dengan keakuratan pembukuan akuntansi otomatis.
                        </p>
                    </div>

                    {/* 4-Card Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                        {/* Bento 1: Multi-Valuta (Span 7 Col) */}
                        <div className="md:col-span-7 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Satu Akun untuk Berbagai Mata Uang
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg">
                                    Terima pembayaran dari pelanggan lokal maupun luar negeri tanpa perlu repot buka banyak rekening bank terpisah. Simpan Rupiah, Dolar AS, dan mata uang lainnya dalam brankas terorganisir.
                                </p>
                            </div>

                            {/* Kartu Valas Mini */}
                            <div className="grid grid-cols-3 gap-3 pt-2 relative z-10">
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-1">
                                    <span className="text-[10px] text-zinc-400 block font-medium">REKENING RUPIAH</span>
                                    <span className="text-sm font-bold text-white block">Rp 45,0 Juta</span>
                                    <span className="text-[10px] text-emerald-400">Kas Operasional</span>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-1">
                                    <span className="text-[10px] text-zinc-400 block font-medium">REKENING DOLAR</span>
                                    <span className="text-sm font-bold text-white block">$3,250</span>
                                    <span className="text-[10px] text-blue-400">Klien Global</span>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-1">
                                    <span className="text-[10px] text-zinc-400 block font-medium">DOLAR SINGAPURA</span>
                                    <span className="text-sm font-bold text-white block">S$ 4,800</span>
                                    <span className="text-[10px] text-purple-400">Regional Asia</span>
                                </div>
                            </div>
                        </div>

                        {/* Bento 2: Anti Saldo Minus & Dobel Potong (Span 5 Col) */}
                        <div className="md:col-span-5 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <Cpu className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Anti Saldo Minus & Uang Terpotong Dobel
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Pernah pusing karena sistem lambat membuat uang pelanggan terpotong dua kali? Bastion mengunci saldo seketika saat ada transaksi berjalan agar uang Anda selalu terlindungi.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold font-mono">
                                    <span>PROTEKSI TRANSAKSI GANDA</span>
                                    <span>AKTIF</span>
                                </div>
                                <p className="text-[11px] text-zinc-400">
                                    Saldo tidak akan pernah minus, sekalipun ribuan transaksi masuk bersamaan.
                                </p>
                            </div>
                        </div>

                        {/* Bento 3: Laporan Rapi Tanpa Lembur (Span 5 Col) */}
                        <div className="md:col-span-5 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                    <Database className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Laporan Keuangan Rapi Tanpa Lembur
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Tidak perlu lagi menghabiskan waktu berjam-jam mencocokkan mutasi manual di akhir bulan. Semua pemasukan dan pengeluaran sudah terhubung rapi sejak awal.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="font-bold text-white block">Pencatatan Otomatis</span>
                                    <span className="text-[11px] text-zinc-400">Laporan siap kapan saja</span>
                                </div>
                                <Badge variant="success">100% PASTI KLOP</Badge>
                            </div>
                        </div>

                        {/* Bento 4: Kunci Dompet Kapan Saja (Span 7 Col) */}
                        <div className="md:col-span-7 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Kunci Dompet Kapan Saja untuk Keamanan Ekstra
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg">
                                    Ingin menghentikan sementara pengeluaran atau mengamankan dana dari risiko penyalahgunaan? Bekukan dompet tertentu hanya dengan sekali klik tanpa mengganggu rekening lainnya.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                                        <Snowflake className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-white block">Sakelar Kunci Siaga</span>
                                        <span className="text-[11px] text-zinc-400">Uang masuk tetap diterima, pengeluaran terkunci</span>
                                    </div>
                                </div>
                                <span className="text-[11px] text-zinc-300 font-medium px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800">
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
            <section id="keamanan" className="py-24 border-t border-zinc-800/80 bg-[#09090b] relative">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        {/* Kiri: Pernyataan Kepercayaan */}
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 text-xs text-emerald-400 font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>STANDAR KEAMANAN TINGGI • AMAN & TERPERCAYA</span>
                            </div>

                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                                Uang Bisnis Aman. <br />
                                <span className="text-zinc-500">Saldo Selalu Sesuai.</span>
                            </h2>

                            <p className="text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
                                Data dan aset Anda dilindungi enkripsi mutakhir. Setiap perpindahan dana dicatat permanen agar Anda bisa fokus membesarkan bisnis tanpa rasa was-was.
                            </p>

                            {/* Ticker Keunggulan Ramah */}
                            <div className="pt-6 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                                <div>
                                    <span className="text-white text-sm font-bold block">Enkripsi Kuat</span>
                                    <span className="text-[11px] text-zinc-400">Data Akun Terlindungi</span>
                                </div>
                                <div>
                                    <span className="text-white text-sm font-bold block">Pasti Seimbang</span>
                                    <span className="text-[11px] text-zinc-400">Bebas Selisih Angka</span>
                                </div>
                                <div>
                                    <span className="text-white text-sm font-bold block">Anti-Minus</span>
                                    <span className="text-[11px] text-zinc-400">Proteksi Saldo Bocor</span>
                                </div>
                                <div>
                                    <span className="text-white text-sm font-bold block">Multi-Valas</span>
                                    <span className="text-[11px] text-zinc-400">IDR, USD & Lainnya</span>
                                </div>
                            </div>
                        </div>

                        {/* Kanan: Kotak Ajakan Bertindak */}
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
                                            {isAuthenticated ? 'Buka Dasbor Saya' : 'Daftar Akun Gratis Sekarang'}
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
                                <span>Sistem Siap Operasional • Standar Multi-Valuta</span>
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
