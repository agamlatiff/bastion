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
            setConcurrencyFeedback('Proteksi transaksi aktif: Dari 5 klik serentak, hanya 1 transaksi sah yang diproses. Saldo bisnis Anda aman.');
            handleExecuteTransfer();
        }, 380);
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
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.12] text-balance font-sans">
                        Kelola Uang Bisnis <br className="hidden sm:inline" />
                        <span className="bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                            Tanpa Selisih.
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
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
            {/* SECTION 2: THE PROOF — DUAL-PANE INTERACTIVE SIMULATOR (#demo)            */}
            {/* ========================================================================= */}
            <section id="demo" className="py-24 relative overflow-hidden">
                {/* Radiant Glowing Divider (Memudar ke Kiri & Kanan) */}
                <div className="w-full max-w-5xl mx-auto mb-16 px-4">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                </div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">
                            SIMULASI LANGSUNG
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                            Coba Langsung Pembukuan Otomatis.
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                            Lakukan simulasi di sebelah kiri, lihat pencatatan otomatis di sebelah kanan.
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
                                            <h3 className="font-bold text-white text-base">Dompet Bisnis</h3>
                                            <span className="text-[11px] text-zinc-400">Pilih mata uang dan nominal</span>
                                        </div>
                                    </div>
                                    <Badge variant={isVaultFrozen ? 'warning' : 'success'}>
                                        {isVaultFrozen ? 'DIKUNCI' : 'AKTIF'}
                                    </Badge>
                                </div>

                                {/* Currency Switcher */}
                                <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                                    {[
                                        { id: 'IDR', name: 'Rupiah' },
                                        { id: 'USD', name: 'Dolar AS' },
                                        { id: 'SGD', name: 'Dolar SG' },
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
                                            <span>{curr.id}</span>
                                            <span className="text-zinc-500">•</span>
                                            <span>{curr.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Tampilan Saldo */}
                                <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                                    <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-medium">
                                        Saldo Tersedia
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
                                        <span>Selalu cocok dengan mutasi asli</span>
                                    </p>
                                </div>

                                {/* Pilihan Nominal */}
                                <div className="space-y-2">
                                    <span className="text-xs text-zinc-400 font-medium">Pilih Contoh Nominal:</span>
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
                                            <span>Mencatat Transaksi...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 fill-current" />
                                            <span>
                                                Tambah Saldo (
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
                                                <span>Buka Kunci</span>
                                            </>
                                        ) : (
                                            <>
                                                <Snowflake className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Kunci Dompet</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleStressTest}
                                        disabled={isVaultFrozen || isProcessing}
                                        className="py-2.5 px-4 rounded-full border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                                        title="Uji coba sistem mencegah uang terpotong dobel"
                                    >
                                        Uji Klik Dobel 5x
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
                                        100% SEIMBANG
                                    </span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-xs space-y-1">
                                    <div className="flex items-center justify-between text-zinc-300 font-medium">
                                        <span>Hasil Rekonsiliasi:</span>
                                        <span className="text-emerald-400 font-bold">Nol Selisih</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400">
                                        Uang masuk dan keluar langsung dicatat berpasangan saat itu juga.
                                    </p>
                                </div>

                                {concurrencyFeedback && (
                                    <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/50 text-xs text-blue-300 animate-in fade-in space-y-1">
                                        <div className="font-bold flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-blue-400" />
                                            <span>Proteksi Dobel Transaksi Aktif</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-300 leading-relaxed">{concurrencyFeedback}</p>
                                    </div>
                                )}

                                <div className="space-y-2.5">
                                    <span className="text-xs text-zinc-400 font-medium block">Riwayat Mutasi:</span>
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
                                                <span>No: {item.id}</span>
                                                <span className="text-emerald-400 font-medium">Tersimpan Permanen ✓</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-3 flex items-center justify-between">
                                <span>Pencatatan Berpasangan</span>
                                <span className="text-zinc-300 font-medium">Bebas Salah Hitung</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 3: KEUNGGULAN — BENTO GRID RAMAH & STRAIGHTFORWARD (#keunggulan)  */}
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
