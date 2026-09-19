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
    Terminal,
    Zap,
    RefreshCw,
    Database,
    Layers,
} from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Navbar } from '../components/landing/Navbar';

interface LedgerEntry {
    id: string;
    timestamp: string;
    debitAccount: string;
    creditAccount: string;
    amountFormatted: string;
    hash: string;
    status: 'COMMITTED' | 'LOCKED';
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

    // Vault Kill-Switch State
    const [isVaultFrozen, setIsVaultFrozen] = useState(false);

    // Live Simulator State
    const [simAmount, setSimAmount] = useState<number>(1500000);
    const [isProcessing, setIsProcessing] = useState(false);
    const [concurrencyFeedback, setConcurrencyFeedback] = useState<string | null>(null);
    const [ledgerHistory, setLedgerHistory] = useState<LedgerEntry[]>([
        {
            id: 'TX-9842',
            timestamp: '15:32:04',
            debitAccount: 'Kas Operasional IDR',
            creditAccount: 'Pendapatan Invoice #882',
            amountFormatted: 'Rp 2.500.000',
            hash: '0x8F3A...19E2',
            status: 'COMMITTED',
        },
        {
            id: 'TX-9841',
            timestamp: '15:28:11',
            debitAccount: 'Escrow Vendor USD',
            creditAccount: 'Kas Utama USD',
            amountFormatted: '$150.00',
            hash: '0x4E7B...9C01',
            status: 'COMMITTED',
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
            const randomHash = '0x' + Math.random().toString(16).substring(2, 6).toUpperCase() + '...' + Math.random().toString(16).substring(2, 6).toUpperCase();

            const newEntry: LedgerEntry = {
                id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
                timestamp: timeString,
                debitAccount: `Brankas ${selectedCurrency} Bisnis`,
                creditAccount: 'Rekening Sumber Terverifikasi',
                amountFormatted: `+${formattedAmount}`,
                hash: randomHash,
                status: 'COMMITTED',
            };

            setLedgerHistory((prev) => [newEntry, ...prev.slice(0, 3)]);
            setIsProcessing(false);
        }, 320);
    };

    // Handle Stress-Test Concurrency (Demonstrating Idempotency & Concurrency Lock)
    const handleStressTest = () => {
        if (isVaultFrozen || isProcessing) return;

        setIsProcessing(true);
        setTimeout(() => {
            setConcurrencyFeedback('⚡ 5 Permintaan Konkuren Terdeteksi: 4 Ditolak (Idempotency Guard), 1 Transaksi Sah Diproses.');
            handleExecuteTransfer();
        }, 400);
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white relative">
            {/* Subtle architectural background */}
            <div className="absolute inset-0 bg-grid-subtle pointer-events-none opacity-40" />

            {/* Floating Navigation Bar */}
            <Navbar />

            {/* ========================================================================= */}
            {/* SECTION 1: HERO SECTION (Modern FinTech Precision & High-Impact Copy)   */}
            {/* ========================================================================= */}
            <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-4 sm:px-6 max-w-5xl mx-auto text-center">
                <div className="space-y-6 max-w-4xl mx-auto">
                    {/* Floating Status Pill */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-300 shadow-sm backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>DOUBLE-ENTRY ENGINE • ZERO MISMATCH GUARANTEE</span>
                    </div>

                    {/* Punchy & Authoritative Headline */}
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] text-balance">
                        Nol Selisih. Nol Kompromi. <br className="hidden sm:inline" />
                        <span className="bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                            Presisi Finansial Tanpa Celah.
                        </span>
                    </h1>

                    {/* Authoritative Subheadline */}
                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                        Setiap rupiah dan dolar dicatat berpasangan saat itu juga. Bastion mengunci integritas saldo bisnis Anda dengan standar perbankan — bebas salah hitung, anti-minus, dan siap audit kapan saja.
                    </p>

                    {/* High-Conversion CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
                        <Link to={isAuthenticated ? '/app/dashboard' : '/register'}>
                            <Button
                                size="lg"
                                className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-500 text-white border-0"
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                            >
                                {isAuthenticated ? 'Buka Dasbor Saya' : 'Coba Bastion Sekarang — Gratis'}
                            </Button>
                        </Link>
                        <a href="#demo">
                            <Button
                                variant="secondary"
                                size="lg"
                                className="w-full sm:w-auto px-7 py-3.5 text-sm font-medium border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200"
                            >
                                Uji Coba Simulator ↓
                            </Button>
                        </a>
                    </div>

                    {/* Trust Indicators */}
                    <div className="pt-8 border-t border-zinc-800/60 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-zinc-400">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>100% Keseimbangan Neraca (ACID)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Multi-Valas IDR, USD & SGD</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Proteksi Saldo Anti-Minus</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 2: THE PROOF — DUAL-PANE INTERACTIVE LEDGER SIMULATOR (#demo)     */}
            {/* ========================================================================= */}
            <section id="demo" className="py-24 border-t border-zinc-800/80 bg-[#0c0c0e]/80 relative overflow-hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                    {/* Header */}
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">
                            LIVE INTERACTIVE PLAYGROUND
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                            Buktikan Sendiri Ketepatan Mesin Ledger Kami.
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                            Lakukan simulasi mutasi dana di sisi kiri, dan saksikan bagaimana sistem mencatat pembukuan berpasangan secara otomatis di sisi kanan tanpa selisih sepeser pun.
                        </p>
                    </div>

                    {/* Dual-Pane Console Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* PANE KIRI: Business Wallet Console (7 Columns) */}
                        <div className="lg:col-span-7 rounded-3xl border border-zinc-800 bg-gradient-to-b from-[#141418] to-[#0d0d10] p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                                            <Wallet className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base">Konsol Dompet Pengguna</h3>
                                            <span className="text-[11px] text-zinc-400">Pilih mata uang & jumlah mutasi</span>
                                        </div>
                                    </div>
                                    <Badge variant={isVaultFrozen ? 'warning' : 'success'}>
                                        {isVaultFrozen ? 'BRANKAS DIKUNCI' : 'OPERASIONAL AKTIF'}
                                    </Badge>
                                </div>

                                {/* Currency Switcher */}
                                <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                                    {(['IDR', 'USD', 'SGD'] as const).map((curr) => (
                                        <button
                                            key={curr}
                                            onClick={() => setSelectedCurrency(curr)}
                                            className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                                selectedCurrency === curr
                                                    ? 'bg-zinc-800 text-white shadow-sm'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            <span>{curr === 'IDR' ? '🇮🇩' : curr === 'USD' ? '🇺🇸' : '🇸🇬'}</span>
                                            <span>{curr}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Live Balance Display */}
                                <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                                        Saldo Riil Terverifikasi
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
                                        <span>Dana terproteksi dari risiko saldo minus & pembulatan sepihak</span>
                                    </p>
                                </div>

                                {/* Quick Amount Presets */}
                                <div className="space-y-2">
                                    <span className="text-xs text-zinc-400 font-medium">Pilih Nominal Mutasi:</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: selectedCurrency === 'IDR' ? 'Rp 500k' : selectedCurrency === 'USD' ? '$50' : 'S$ 50', val: 500000 },
                                            { label: selectedCurrency === 'IDR' ? 'Rp 1.5jt' : selectedCurrency === 'USD' ? '$100' : 'S$ 100', val: 1500000 },
                                            { label: selectedCurrency === 'IDR' ? 'Rp 5jt' : selectedCurrency === 'USD' ? '$350' : 'S$ 350', val: 5000000 },
                                        ].map((preset) => (
                                            <button
                                                key={preset.label}
                                                onClick={() => setSimAmount(preset.val)}
                                                className={`py-2 px-3 rounded-xl text-xs font-mono font-medium border transition-colors ${
                                                    simAmount === preset.val
                                                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleExecuteTransfer}
                                    disabled={isVaultFrozen || isProcessing}
                                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
                                >
                                    {isProcessing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Memproses Transaksi ACID...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 fill-current" />
                                            <span>
                                                Injeksi Transaksi Kilat (
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
                                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                                            isVaultFrozen
                                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                                                : 'bg-zinc-900/70 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                        }`}
                                    >
                                        {isVaultFrozen ? (
                                            <>
                                                <Sun className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>Aktifkan Brankas Kembali</span>
                                            </>
                                        ) : (
                                            <>
                                                <Snowflake className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Kunci Dompet Seketika (Freeze)</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleStressTest}
                                        disabled={isVaultFrozen || isProcessing}
                                        className="py-2.5 px-3 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
                                        title="Uji coba sistem penanganan transaksi serentak"
                                    >
                                        ⚡ Uji Konkurensi 5x
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* PANE KANAN: Under-The-Hood Ledger Engine (5 Columns) */}
                        <div className="lg:col-span-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl flex flex-col justify-between space-y-5 text-left font-mono">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="w-4 h-4 text-emerald-400" />
                                        <span className="text-xs font-bold text-white tracking-wider">LEDGER AUDIT STREAM</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        ACID VERIFIED
                                    </span>
                                </div>

                                {/* Engine Status Pill */}
                                <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-[11px] space-y-1">
                                    <div className="flex items-center justify-between text-zinc-400">
                                        <span>INVARIANT CHECK:</span>
                                        <span className="text-emerald-400 font-bold">Σ DEBIT == Σ KREDIT</span>
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                                        <span>ROUNDING LOSS: 0.00</span>
                                        <span>LATENCY: 14ms</span>
                                    </div>
                                </div>

                                {/* Concurrency Alert Feedback */}
                                {concurrencyFeedback && (
                                    <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/50 text-[11px] text-blue-300 animate-in fade-in space-y-1">
                                        <div className="font-bold flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                            <span>IDEMPOTENCY GUARD AKTIF</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-400">{concurrencyFeedback}</p>
                                    </div>
                                )}

                                {/* Real-time Ledger Log Feed */}
                                <div className="space-y-2.5">
                                    <span className="text-[10px] text-zinc-500 tracking-wider block">LOG MUTASI TERBARU:</span>
                                    {ledgerHistory.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/70 text-[11px] space-y-1.5 hover:border-zinc-700 transition-colors"
                                        >
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-blue-400 font-bold">{item.id}</span>
                                                <span className="text-zinc-500">{item.timestamp}</span>
                                            </div>
                                            <div className="space-y-0.5 text-zinc-300 text-[11px]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-zinc-400">↳ Dr. {item.debitAccount}</span>
                                                    <span className="text-emerald-400 font-semibold">{item.amountFormatted}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-zinc-500">↳ Cr. {item.creditAccount}</span>
                                                    <span className="text-zinc-500">{item.amountFormatted}</span>
                                                </div>
                                            </div>
                                            <div className="pt-1 border-t border-zinc-800/50 flex items-center justify-between text-[9px] text-zinc-500">
                                                <span>HASH: {item.hash}</span>
                                                <span className="text-emerald-400">LOCKED</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-3 flex items-center justify-between">
                                <span>Double-Entry Bookkeeping v2.4</span>
                                <span className="text-zinc-400">Zero Race-Condition</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 3: KEUNGGULAN — ASYMMETRIC FINTECH BENTO GRID (#keunggulan)       */}
            {/* ========================================================================= */}
            <section id="keunggulan" className="py-24 border-t border-zinc-800/80 relative">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                    {/* Header */}
                    <div className="text-left max-w-xl space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                            ARSITEKTUR FINANSIAL MODERN
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                            Dirancang untuk Keandalan Transaksi Skala Korporat.
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                            Hilangkan kompromi dan kesalahan manusia. Bastion memastikan setiap aset digital Anda terorganisasi rapi, aman, dan siap menghadapi jutaan transaksi.
                        </p>
                    </div>

                    {/* 4-Card Bento Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                        {/* Bento Card 1: Multi-Currency Digital Vault (Span 7 Col) */}
                        <div className="md:col-span-7 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Satu Akun, Multi-Valuta Tanpa Batas
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg">
                                    Buka brankas terisolasi untuk Rupiah operasional, Dolar klien luar negeri, dan valuta regional lainnya dalam satu dasbor. Setiap dompet memiliki rekening mandiri tanpa risiko tercampur.
                                </p>
                            </div>

                            {/* Mini Holographic Multi-Currency Cards Stack */}
                            <div className="grid grid-cols-3 gap-3 pt-2 relative z-10 font-mono">
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-1">
                                    <span className="text-[10px] text-zinc-500 block">IDR REKENING</span>
                                    <span className="text-sm font-bold text-white block">Rp 45.0M</span>
                                    <span className="text-[9px] text-emerald-400">KAS LOKAL</span>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-1">
                                    <span className="text-[10px] text-zinc-500 block">USD REKENING</span>
                                    <span className="text-sm font-bold text-white block">$3,250</span>
                                    <span className="text-[9px] text-blue-400">GLOBAL INVOICE</span>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-1">
                                    <span className="text-[10px] text-zinc-500 block">SGD REKENING</span>
                                    <span className="text-sm font-bold text-white block">S$ 4,800</span>
                                    <span className="text-[9px] text-purple-400">REGIONAL ASIA</span>
                                </div>
                            </div>
                        </div>

                        {/* Bento Card 2: Benteng Anti-Double Spend (Span 5 Col) */}
                        <div className="md:col-span-5 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <Cpu className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Benteng Anti-Double Spend
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Teknologi penguncian baris (*row-level locking*) mencegah saldo dibelanjakan dua kali secara bersamaan, bahkan dalam lonjakan ribuan transaksi per detik.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 font-mono text-xs text-zinc-300 space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-emerald-400">
                                    <span>RACE-CONDITION SHIELD</span>
                                    <span>ACTIVE</span>
                                </div>
                                <div className="text-[10px] text-zinc-500 space-y-0.5">
                                    <div>MUTEX LOCK: ACQUIRED (0.8ms)</div>
                                    <div>DB TRANSACTION: SERIALIZABLE ACID</div>
                                </div>
                            </div>
                        </div>

                        {/* Bento Card 3: Audit-Ready Bookkeeping (Span 5 Col) */}
                        <div className="md:col-span-5 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                    <Database className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Audit-Ready Tanpa Lembur
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Setiap mutasi memiliki stempel kriptografis permanen yang tidak dapat diubah (*immutable*). Rekonsiliasi bulanan selesai dalam hitungan detik.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="font-bold text-white block">Audit Trail Otomatis</span>
                                    <span className="text-[10px] text-zinc-400">Kepatuhan Standar Akuntansi</span>
                                </div>
                                <Badge variant="success">100% KLOP</Badge>
                            </div>
                        </div>

                        {/* Bento Card 4: Instant Vault Freeze Kill-Switch (Span 7 Col) */}
                        <div className="md:col-span-7 rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Kendali Darurat: Kunci Brankas Seketika
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg">
                                    Curiga ada ancaman keamanan? Bekukan pengeluaran rekening tertentu secara instan lewat sakelar kill-switch tanpa mengganggu operasional dompet bisnis lainnya.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                                        <Snowflake className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-white block">Sakelar Darurat Siap Pakai</span>
                                        <span className="text-[10px] text-zinc-400">Dana masuk tetap aman, penarikan ditahan</span>
                                    </div>
                                </div>
                                <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-800">
                                    ZERO DOWNTIME
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 4: KEAMANAN & ACTION FINALE (#keamanan)                           */}
            {/* ========================================================================= */}
            <section id="keamanan" className="py-24 border-t border-zinc-800/80 bg-[#09090b] relative">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        {/* Left Column: Bold Typographic Trust Statement */}
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>STANDAR KEAMANAN PERBANKAN • 100% TERVERIFIKASI</span>
                            </div>

                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                                Keamanan Mutlak. <br />
                                <span className="text-zinc-500">Saldo Selalu Seimbang.</span>
                            </h2>

                            <p className="text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
                                Seluruh data dilindungi enkripsi kelas perbankan, mutasi dicatat permanen berpasangan, dan mesin konkurensi kami menjamin kepastian integritas saldo bisnis Anda di setiap transaksi.
                            </p>

                            {/* Minimalist Specs Ticker */}
                            <div className="pt-6 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                                <div>
                                    <span className="font-mono text-white text-sm font-bold block">AES-256</span>
                                    <span className="text-[11px] text-zinc-500">Enkripsi Data</span>
                                </div>
                                <div>
                                    <span className="font-mono text-white text-sm font-bold block">Double-Entry</span>
                                    <span className="text-[11px] text-zinc-500">Neraca Seimbang</span>
                                </div>
                                <div>
                                    <span className="font-mono text-white text-sm font-bold block">Zero Overdraft</span>
                                    <span className="text-[11px] text-zinc-500">Anti Saldo Minus</span>
                                </div>
                                <div>
                                    <span className="font-mono text-white text-sm font-bold block">Multi-Valas</span>
                                    <span className="text-[11px] text-zinc-500">Brankas Mandiri</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: High-Conversion Focused Action Console */}
                        <div className="lg:col-span-5 text-left">
                            <div className="rounded-3xl border border-zinc-800 bg-[#111114] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-semibold block">
                                        MULAI SEKARANG
                                    </span>
                                    <h3 className="text-2xl font-bold text-white tracking-tight">
                                        Buka Akun Bisnis Anda
                                    </h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Mulai simpan dan kelola Rupiah maupun Dolar dalam satu dasbor rapi. Pendaftaran selesai dalam 2 menit.
                                    </p>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Link to={isAuthenticated ? '/app/dashboard' : '/register'} className="block">
                                        <Button
                                            size="lg"
                                            className="w-full py-4 text-sm font-bold shadow-lg shadow-blue-600/25 bg-blue-600 hover:bg-blue-500 text-white border-0"
                                            rightIcon={<ArrowRight className="w-4 h-4" />}
                                        >
                                            {isAuthenticated ? 'Buka Dasbor Saya' : 'Daftar Akun Bisnis Gratis'}
                                        </Button>
                                    </Link>
                                    <a href="#demo" className="block">
                                        <Button
                                            variant="secondary"
                                            size="md"
                                            className="w-full py-3 text-xs font-medium border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                                        >
                                            Uji Coba Simulator di Atas ↑
                                        </Button>
                                    </a>
                                </div>

                                <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                                    <span className="flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Bebas biaya bulanan
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5 text-emerald-400" /> IDR, USD & SGD
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
                        {/* Brand Column */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm">
                                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                                </div>
                                <span className="font-bold text-base text-white tracking-tight">Bastion</span>
                            </div>
                            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                                Platform infrastruktur dompet digital dan pencatatan perbankan modern. Menjamin saldo bisnis Anda selalu seimbang, akurat, dan terlindungi setiap detik.
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>ISO-4217 Multi-Currency Standard • ACID Compliant</span>
                            </div>
                        </div>

                        {/* Nav Column 1 */}
                        <div className="lg:col-span-3 space-y-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white block">
                                Navigasi
                            </span>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li><a href="#demo" className="hover:text-white transition-colors">Simulator Ledger</a></li>
                                <li><a href="#keunggulan" className="hover:text-white transition-colors">Arsitektur Keunggulan</a></li>
                                <li><a href="#keamanan" className="hover:text-white transition-colors">Pilar Keamanan</a></li>
                                <li><Link to="/login" className="hover:text-white transition-colors">Masuk Akun</Link></li>
                            </ul>
                        </div>

                        {/* Nav Column 2 */}
                        <div className="lg:col-span-4 space-y-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white block">
                                Keamanan & Standar
                            </span>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li><span className="text-zinc-300">Enkripsi Ganda Kata Sandi</span></li>
                                <li><span className="text-zinc-300">Audit Trail Pembukuan Berpasangan</span></li>
                                <li><span className="text-zinc-300">Proteksi Anti Saldo Minus (Zero Overdraft)</span></li>
                                <li><span className="text-zinc-300">Penanganan Idempotensi Konkuren</span></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
                        <p>&copy; {new Date().getFullYear()} Bastion Financial. Hak cipta dilindungi undang-undang.</p>
                        <p className="font-mono text-zinc-500">
                            Dirancang untuk keandalan finansial dan transparansi mutasi.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
