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
    X,
    Coins,
} from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const LandingPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [demoCurrency, setDemoCurrency] = useState<'IDR' | 'USD'>('IDR');
    const [isDemoFrozen, setIsDemoFrozen] = useState(false);
    const [demoBalance, setDemoBalance] = useState({
        IDR: 24500000,
        USD: 1650,
    });
    const [lastTransaction, setLastTransaction] = useState<string | null>(null);

    const handleSimulateTransfer = () => {
        if (isDemoFrozen) return;
        if (demoCurrency === 'IDR') {
            setDemoBalance((prev) => ({ ...prev, IDR: prev.IDR + 1500000 }));
            setLastTransaction('+Rp 1.500.000');
        } else {
            setDemoBalance((prev) => ({ ...prev, USD: prev.USD + 100 }));
            setLastTransaction('+$100.00');
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white">
            {/* Subtle architectural background */}
            <div className="absolute inset-0 bg-grid-subtle pointer-events-none opacity-50" />

            {/* Navigation Bar */}
            <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-zinc-950 font-bold shadow-sm">
                            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold tracking-tight text-white">Bastion</span>
                            <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline-block">
                                Dompet Digital & Pembukuan Bisnis
                            </span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
                        <a href="#solusi" className="hover:text-white transition-colors">Mengapa Bastion?</a>
                        <a href="#demo" className="hover:text-white transition-colors">Coba Simulasi</a>
                        <a href="#keunggulan" className="hover:text-white transition-colors">Kemudahan</a>
                        <a href="#keamanan" className="hover:text-white transition-colors">Keamanan</a>
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <Link to="/app/dashboard">
                                <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                                    Buka Dasbor Saya
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button variant="ghost" size="sm">
                                        Masuk
                                    </Button>
                                </Link>
                                <Link to="/register">
                                    <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                                        Daftar Gratis
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section: Centered Minimalist FinTech Hero (Single-Column) */}
            <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 max-w-5xl mx-auto text-center">
                {/* Centered Value Proposition */}
                <div className="space-y-6 max-w-4xl mx-auto">
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] text-balance">
                        Simpan, kelola, dan pantau uang Anda tanpa takut salah hitung.
                    </h1>

                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                        Pernah pusing karena catatan pembukuan tidak cocok dengan saldo aslinya?
                        Bastion memastikan setiap rupiah dan dolar tercatat otomatis dengan presisi tinggi.
                        Saldo tidak akan pernah minus, dan uang Anda selalu aman terlindungi.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Link to={isAuthenticated ? '/app/dashboard' : '/register'}>
                            <Button
                                size="lg"
                                className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold shadow-lg shadow-white/5"
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                            >
                                {isAuthenticated ? 'Masuk ke Dasbor' : 'Buka Akun Sekarang — Gratis'}
                            </Button>
                        </Link>
                        <a href="#demo">
                            <Button
                                variant="secondary"
                                size="lg"
                                className="w-full sm:w-auto px-6 py-3.5 text-sm font-medium"
                            >
                                Coba Simulasi Dompet
                            </Button>
                        </a>
                    </div>

                    {/* Centered Key Facts */}
                    <div className="pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Saldo selalu klop sepeser pun</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Bisa simpan Rupiah & Dolar</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Kunci dompet kapan saja</span>
                        </div>
                    </div>
                </div>

                {/* Centered Interactive Showcase Below */}
                <div className="mt-14 max-w-md mx-auto" id="demo">
                    {/* Interactive Card */}
                    <div className="rounded-2xl border border-zinc-700/80 bg-gradient-to-br from-[#16161a] via-[#111114] to-[#0a0a0d] p-6 shadow-2xl space-y-6 text-left relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-xs shadow-xs">
                                    {demoCurrency}
                                </div>
                                <div>
                                    <span className="font-bold text-xs uppercase tracking-wider text-zinc-200 block">
                                        Dompet Utama
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                        {demoCurrency === 'IDR' ? 'Rupiah Indonesia' : 'US Dollar'}
                                    </span>
                                </div>
                            </div>
                            <Badge variant={isDemoFrozen ? 'warning' : 'success'}>
                                {isDemoFrozen ? 'DIBEKUKAN' : 'AKTIF & AMAN'}
                            </Badge>
                        </div>

                        {/* Balance Display */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                                Saldo Tersedia Saat Ini
                            </span>
                            <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
                                {demoCurrency === 'IDR'
                                    ? `Rp ${demoBalance.IDR.toLocaleString('id-ID')},00`
                                    : `$${demoBalance.USD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                            </div>
                            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                {isDemoFrozen
                                    ? 'Pengeluaran dinonaktifkan sementara demi keamanan'
                                    : 'Semua mutasi tercatat otomatis dan siap digunakan'}
                            </p>
                        </div>

                        {/* Interactive Controls */}
                        <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-lg border border-zinc-800">
                                    <button
                                        onClick={() => setDemoCurrency('IDR')}
                                        className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                                            demoCurrency === 'IDR'
                                                ? 'bg-zinc-800 text-white shadow-xs'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        IDR
                                    </button>
                                    <button
                                        onClick={() => setDemoCurrency('USD')}
                                        className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                                            demoCurrency === 'USD'
                                                ? 'bg-zinc-800 text-white shadow-xs'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        USD
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsDemoFrozen(!isDemoFrozen)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                                        isDemoFrozen
                                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                                            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-rose-300 hover:border-rose-800/60'
                                    }`}
                                >
                                    {isDemoFrozen ? (
                                        <>
                                            <Sun className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Aktifkan Kembali</span>
                                        </>
                                    ) : (
                                        <>
                                            <Snowflake className="w-3.5 h-3.5 text-zinc-400" />
                                            <span>Bekukan Dompet</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Action button simulation */}
                            <button
                                onClick={handleSimulateTransfer}
                                disabled={isDemoFrozen}
                                className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-800 text-xs font-medium text-zinc-200 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Simulasikan Terima Uang (+{demoCurrency === 'IDR' ? 'Rp 1.500.000' : '$100'})</span>
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Feedback Notification */}
                    {lastTransaction && (
                        <div className="mt-3 p-3 rounded-xl border border-emerald-800/40 bg-emerald-950/20 text-left flex items-center justify-between text-xs animate-in fade-in">
                            <div className="flex items-center gap-2 text-emerald-300">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Uang Masuk Berhasil Dicatat!</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-400">
                                {lastTransaction}
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {/* PROBLEM VS SOLUTION SECTION (Bukan 3 Kartu Generik AI Slop!) */}
            <section id="solusi" className="py-20 border-t border-zinc-800/80 bg-[#0c0c0e]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                            Mengapa Bastion Berbeda?
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                            Tinggalkan cara lama yang bikin pusing dan rawan selisih.
                        </h2>
                        <p className="text-sm text-zinc-400">
                            Bandingkan bagaimana pembukuan konvensional sering menimbulkan masalah finansial, dan bagaimana Bastion menyelesaikannya secara otomatis.
                        </p>
                    </div>

                    {/* Comparison Surface: 2 Contrasting Halves */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        {/* The Painful Old Way */}
                        <div className="rounded-2xl border border-rose-950/60 bg-gradient-to-br from-rose-950/10 via-[#120f11] to-[#0d0a0b] p-6 sm:p-8 space-y-5 text-left">
                            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                                <X className="w-4 h-4" />
                                <span>Cara Konvensional (Bikin Was-was)</span>
                            </div>

                            <ul className="space-y-4 text-xs sm:text-sm text-zinc-300">
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-rose-950/80 border border-rose-800/50 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                                        &times;
                                    </div>
                                    <div>
                                        <strong className="text-white block font-medium">Catatan Sering Selisih</strong>
                                        <p className="text-zinc-400 text-xs mt-0.5">
                                            Di akhir bulan harus lembur mencocokkan mutasi manual karena ada uang yang tidak tahu lari ke mana.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-rose-950/80 border border-rose-800/50 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                                        &times;
                                    </div>
                                    <div>
                                        <strong className="text-white block font-medium">Rawan Saldo Minus & Dobel Potong</strong>
                                        <p className="text-zinc-400 text-xs mt-0.5">
                                            Saat sistem sibuk, uang pelanggan bisa terpotong dua kali atau saldo menjadi minus yang merugikan Anda.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-rose-950/80 border border-rose-800/50 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                                        &times;
                                    </div>
                                    <div>
                                        <strong className="text-white block font-medium">Ribet Kelola Valas Terpisah</strong>
                                        <p className="text-zinc-400 text-xs mt-0.5">
                                            Harus buka akun terpisah di mana-mana cuma untuk menerima pembayaran Dolar dan Rupiah.
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* The Bastion Solution */}
                        <div className="rounded-2xl border border-emerald-900/60 bg-gradient-to-br from-emerald-950/15 via-[#0f1411] to-[#090d0b] p-6 sm:p-8 space-y-5 text-left">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Dengan Bastion (Tenang & Terkendali)</span>
                            </div>

                            <ul className="space-y-4 text-xs sm:text-sm text-zinc-300">
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                                        ✓
                                    </div>
                                    <div>
                                        <strong className="text-white block font-medium">Saldo Selalu Klop Otomatis</strong>
                                        <p className="text-zinc-400 text-xs mt-0.5">
                                            Setiap perpindahan uang dicatat berpasangan saat itu juga. Total dana dijamin seimbang sepeser pun.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                                        ✓
                                    </div>
                                    <div>
                                        <strong className="text-white block font-medium">Anti Saldo Minus Sejak Desain Awal</strong>
                                        <p className="text-zinc-400 text-xs mt-0.5">
                                            Saldo langsung diamankan saat transaksi berjalan. Uang tidak akan bisa dibelanjakan dua kali secara bersamaan.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                                        ✓
                                    </div>
                                    <div>
                                        <strong className="text-white block font-medium">Banyak Dompet Dalam Satu Dasbor</strong>
                                        <p className="text-zinc-400 text-xs mt-0.5">
                                            Buka dompet Rupiah, Dolar, atau mata uang lain kapan saja hanya dengan sekali klik dari satu layar.
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* TACTILE FINTECH PLAYGROUND (Bukan Kotak AI Generik!) */}
            <section id="keunggulan" className="py-20 border-t border-zinc-800/80">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                    <div className="text-left max-w-xl space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                            Pengalaman Langsung
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                            Kontrol penuh atas uang Anda dalam genggaman.
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400">
                            Coba langsung interaksi di bawah ini untuk melihat bagaimana Bastion memudahkan pengelolaan keuangan bisnis Anda.
                        </p>
                    </div>

                    {/* Interactive 2-Column Showcase Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Showcase 1: Multi-Currency Digital Vault (7 Columns) */}
                        <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden">
                            {/* Subtle emerald glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                                        Multi-Mata Uang Aktif
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Satu Akun untuk Berbagai Dompet Valas
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md">
                                    Pisahkan simpanan kas operasional, tagihan pelanggan, dan pendapatan luar negeri. Setiap dompet memiliki identitas rekening dan saldo mandiri.
                                </p>
                            </div>

                            {/* Interactive Currency Selector & Live Card Preview */}
                            <div className="space-y-4 relative z-10 pt-2">
                                {/* Tab Selector */}
                                <div className="flex items-center gap-2 p-1 rounded-xl bg-[#09090b] border border-zinc-800">
                                    {[
                                        { id: 'IDR', flag: '🇮🇩', label: 'Rupiah Operasional' },
                                        { id: 'USD', flag: '🇺🇸', label: 'Dolar Klien Global' },
                                        { id: 'SGD', flag: '🇸🇬', label: 'Regional SGD' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setDemoCurrency(tab.id as 'IDR' | 'USD')}
                                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                                demoCurrency === tab.id
                                                    ? 'bg-zinc-800 text-white shadow-xs font-semibold'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            <span>{tab.flag}</span>
                                            <span className="truncate hidden sm:inline">{tab.label}</span>
                                            <span className="sm:hidden">{tab.id}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Dynamic Visual Card Preview */}
                                <div className="p-5 rounded-xl border border-zinc-800/80 bg-[#0c0c0e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">
                                                Nomor Rekening Internal
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                                                •••• 8492
                                            </span>
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                                            {demoCurrency === 'IDR'
                                                ? 'Rp 85.000.000,00'
                                                : demoCurrency === 'USD'
                                                ? '$5,250.00'
                                                : 'S$ 12,400.00'}
                                        </div>
                                        <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                            Saldo terisolasi & terlindungi dari pembulatan
                                        </p>
                                    </div>

                                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                                        <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono font-semibold text-zinc-300 text-center">
                                            Valas: {demoCurrency}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Showcase 2: Instant Freeze Kill-Switch (5 Columns) */}
                        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 text-left relative overflow-hidden">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <Badge variant={isDemoFrozen ? 'warning' : 'success'}>
                                        {isDemoFrozen ? 'REKENING DIBEKUKAN' : 'OPERASIONAL NORMAL'}
                                    </Badge>
                                </div>

                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Kunci Dompet Kapan Saja
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Curiga ada aktivitas yang tidak wajar? Tekan sakelar di bawah ini untuk membekukan pengeluaran seketika demi keamanan.
                                </p>
                            </div>

                            {/* Interactive Kill-Switch Box */}
                            <div className="space-y-4 pt-2">
                                <div
                                    onClick={() => setIsDemoFrozen(!isDemoFrozen)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between gap-4 ${
                                        isDemoFrozen
                                            ? 'bg-amber-950/20 border-amber-800/60 shadow-lg shadow-amber-950/20'
                                            : 'bg-[#0c0c0e] border-zinc-800 hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                isDemoFrozen
                                                    ? 'bg-amber-900/60 text-amber-400'
                                                    : 'bg-emerald-950 text-emerald-400'
                                            }`}
                                        >
                                            {isDemoFrozen ? (
                                                <Snowflake className="w-4 h-4" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-white block">
                                                {isDemoFrozen ? 'Pengeluaran Dikunci' : 'Dompet Siap Transaksi'}
                                            </span>
                                            <span className="text-[11px] text-zinc-400 block">
                                                {isDemoFrozen
                                                    ? 'Klik untuk mengaktifkan kembali'
                                                    : 'Klik untuk uji pembekuan seketika'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Toggle Pill UI */}
                                    <div
                                        className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                                            isDemoFrozen ? 'bg-amber-500 justify-end' : 'bg-zinc-800 justify-start'
                                        }`}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-white shadow-md transition-transform" />
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg bg-[#0c0c0e] border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                                    <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Proteksi Saldo Tetap Utuh</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500">
                                        Saat dibekukan, uang masuk tetap bisa diterima, namun penarikan keluar ditahan sampai diverifikasi.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* EDITORIAL SECURITY & ACTION FINALE (Bukan 4 Kartu Kembar AI Generik!) */}
            <section id="keamanan" className="py-24 border-t border-zinc-800/80 relative bg-[#09090b]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        {/* Left Column: Bold Typographic Statement & Reassurance */}
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>STANDAR KEAMANAN PERBANKAN &bull; 100% TERVERIFIKASI</span>
                            </div>

                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                                Keamanan mutlak. <br />
                                <span className="text-zinc-500">Saldo selalu seimbang.</span>
                            </h2>

                            <p className="text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
                                Data akun Anda dilindungi enkripsi kriptografis tingkat tinggi, setiap pergerakan uang dicatat permanen berpasangan, dan sistem otomatis mengunci saldo saat transaksi berjalan agar tidak pernah bisa minus.
                            </p>

                            {/* Minimalist Specs Ticker (Bukan Kartu Box!) */}
                            <div className="pt-6 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                                <div>
                                    <span className="font-mono text-white text-sm font-bold block">AES-256</span>
                                    <span className="text-[11px] text-zinc-500">Enkripsi Data</span>
                                </div>
                                <div>
                                    <span className="font-mono text-white text-sm font-bold block">Double-Entry</span>
                                    <span className="text-[11px] text-zinc-500">Buku Kas Permanen</span>
                                </div>
                                <div>
                                    <span className="font-mono text-white text-sm font-bold block">Anti-Minus</span>
                                    <span className="text-[11px] text-zinc-500">Proteksi Saldo</span>
                                </div>
                                <div>
                                    <span className="font-mono text-white text-sm font-bold block">Multi-Valas</span>
                                    <span className="text-[11px] text-zinc-500">Partisi Mandiri</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: High-Conversion Focused Action Console */}
                        <div className="lg:col-span-5 text-left">
                            <div className="rounded-2xl border border-zinc-800 bg-[#111114] p-6 sm:p-8 space-y-5 shadow-2xl relative overflow-hidden">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold block">
                                        Mulai Sekarang
                                    </span>
                                    <h3 className="text-xl font-bold text-white tracking-tight">
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
                                            className="w-full py-3.5 text-sm font-bold shadow-lg shadow-white/5"
                                            rightIcon={<ArrowRight className="w-4 h-4" />}
                                        >
                                            {isAuthenticated ? 'Masuk ke Dasbor Saya' : 'Daftar Gratis Sekarang'}
                                        </Button>
                                    </Link>
                                    <a href="#demo" className="block">
                                        <Button
                                            variant="secondary"
                                            size="md"
                                            className="w-full py-2.5 text-xs font-medium"
                                        >
                                            Lihat Contoh Dompet & Simulasi
                                        </Button>
                                    </a>
                                </div>

                                <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                                    <span className="flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Tanpa biaya bulanan
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5 text-emerald-400" /> IDR & USD
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* STRUCTURED MODERN FOOTER */}
            <footer className="border-t border-zinc-800/80 bg-[#09090b] py-12 text-xs text-zinc-400 text-left">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">
                        {/* Brand Column */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm">
                                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                                </div>
                                <span className="font-bold text-base text-white tracking-tight">Bastion</span>
                            </div>
                            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                                Platform infrastruktur dompet digital dan pencatatan perbankan modern. Menjamin saldo bisnis Anda selalu seimbang, akurat, dan terlindungi setiap detik.
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Koneksi API Gateway Aktif &bull; ISO-4217 Standard</span>
                            </div>
                        </div>

                        {/* Nav Column 1 */}
                        <div className="lg:col-span-3 space-y-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white block">
                                Fitur & Produk
                            </span>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li><a href="#demo" className="hover:text-white transition-colors">Simulasi Kartu Virtual</a></li>
                                <li><a href="#solusi" className="hover:text-white transition-colors">Perbandingan Pembukuan</a></li>
                                <li><a href="#keunggulan" className="hover:text-white transition-colors">Brankas Multi-Valas</a></li>
                                <li><a href="#keamanan" className="hover:text-white transition-colors">Pilar Keamanan</a></li>
                            </ul>
                        </div>

                        {/* Nav Column 2 */}
                        <div className="lg:col-span-4 space-y-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white block">
                                Keamanan & Kepatuhan
                            </span>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li><span className="text-zinc-300">Enkripsi Ganda Kata Sandi</span></li>
                                <li><span className="text-zinc-300">Audit Trail Pembukuan Berpasangan</span></li>
                                <li><span className="text-zinc-300">Rotasi Token Sesi Otomatis</span></li>
                                <li><span className="text-zinc-300">Proteksi Anti Saldo Minus</span></li>
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
