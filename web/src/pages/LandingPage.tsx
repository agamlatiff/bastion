import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ShieldCheck,
    ArrowRight,
    Wallet,
    CheckCircle2,
    Check,
    ArrowUpRight,
    ArrowDownRight,
    ArrowDownLeft,
    Plus,
    Copy,
    CreditCard,
} from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Navbar } from '../components/landing/Navbar';
import { BastionLogo } from '../components/common/BastionLogo';
import { ConcentricVault } from '../components/landing/ConcentricVault';

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

    // Mobile dashboard section view switcher ('wallets' | 'activity')
    type MobileDashboardTab = 'wallets' | 'activity';
    const [mobileTab, setMobileTab] = useState<MobileDashboardTab>('wallets');

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyId = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Dynamic datasets per timeframe (with smooth cubic bezier curves & apex coordinates)
    const timeframeData = {
        today: {
            label: 'Hari Ini',
            baseBalance: 148520000,
            growth: '+18.4% vs kemarin',
            baseInflow: 42150000,
            outflow: 14800000,
            txCount: '142 Transaksi',
            splinePath: 'M 0,125 C 45,125 45,105 90,105 C 135,105 135,125 180,125 C 225,125 225,80 270,80 C 315,80 315,95 360,95 C 405,95 405,38 450,38 C 495,38 495,58 540,58 C 570,58 570,42 600,42',
            splineArea: 'M 0,125 C 45,125 45,105 90,105 C 135,105 135,125 180,125 C 225,125 225,80 270,80 C 315,80 315,95 360,95 C 405,95 405,38 450,38 C 495,38 495,58 540,58 C 570,58 570,42 600,42 L 600,180 L 0,180 Z',
            outflowSpline: 'M 0,155 C 50,150 70,145 130,145 C 190,145 220,160 280,150 C 340,140 380,135 440,130 C 500,125 540,140 600,135',
            peakCoord: { x: 450, y: 38 },
            peakValue: '+Rp 18.500.000',
            peakTime: '14:30 WIB (Puncak Penjualan)',
            xLabels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
        },
        '7d': {
            label: '7 Hari Terakhir',
            baseBalance: 284190000,
            growth: '+24.2% minggu ini',
            baseInflow: 195400000,
            outflow: 68200000,
            txCount: '896 Transaksi',
            splinePath: 'M 0,140 C 60,130 90,115 150,110 C 210,105 240,90 300,85 C 360,80 400,55 460,45 C 510,35 550,28 600,22',
            splineArea: 'M 0,140 C 60,130 90,115 150,110 C 210,105 240,90 300,85 C 360,80 400,55 460,45 C 510,35 550,28 600,22 L 600,180 L 0,180 Z',
            outflowSpline: 'M 0,160 C 60,155 120,150 180,145 C 240,140 300,135 360,125 C 420,115 480,110 540,105 L 600,100',
            peakCoord: { x: 460, y: 45 },
            peakValue: '+Rp 64.200.000',
            peakTime: 'Jumat (Puncak Mingguan)',
            xLabels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
        },
        '30d': {
            label: '30 Hari Terakhir',
            baseBalance: 512800000,
            growth: '+31.8% bulan ini',
            baseInflow: 420000000,
            outflow: 180500000,
            txCount: '3.840 Transaksi',
            splinePath: 'M 0,150 C 60,140 100,125 160,115 C 220,105 260,90 320,75 C 380,60 420,40 480,30 C 530,22 570,18 600,15',
            splineArea: 'M 0,150 C 60,140 100,125 160,115 C 220,105 260,90 320,75 C 380,60 420,40 480,30 C 530,22 570,18 600,15 L 600,180 L 0,180 Z',
            outflowSpline: 'M 0,165 C 80,160 160,150 240,140 C 320,130 400,115 480,105 L 600,95',
            peakCoord: { x: 480, y: 30 },
            peakValue: '+Rp 112.000.000',
            peakTime: 'Tutup Buku Bulanan',
            xLabels: ['Mgg 1', 'Mgg 2', 'Mgg 3', 'Mgg 4'],
        },
    };

    const currentDataset = timeframeData[timeframe];

    // Data representasi akun dompet nyata di dasbor (mirip DashboardPage)
    const previewWallets = [
        {
            id: 'w-idr-8492019',
            currency: 'IDR',
            name: 'Dompet Operasional Utama',
            balance: 'Rp 148.520.000,00',
            shortCode: 'IDR',
            status: 'Aktif',
            badgeVariant: 'success' as const,
        },
        {
            id: 'w-usd-5920311',
            currency: 'USD',
            name: 'Dompet Klien Internasional',
            balance: '$3,250.00',
            shortCode: 'USD',
            status: 'Aktif',
            badgeVariant: 'success' as const,
        },
        {
            id: 'w-sgd-1049283',
            currency: 'SGD',
            name: 'Dompet Ekspansi Regional',
            balance: 'S$ 4,800.00',
            shortCode: 'SGD',
            status: 'Aktif',
            badgeVariant: 'success' as const,
        },
    ];

    // Real-Time Transactions Feed
    const transactions: DashboardTransaction[] = [
        {
            id: 'TRX-948',
            time: 'Baru saja',
            title: 'Pembayaran Invoice Klien #1042',
            category: 'Penjualan',
            debitAccount: 'Kas Utama IDR',
            creditAccount: 'Pendapatan Jasa',
            amountFormatted: '+Rp 12.500.000',
            isIncome: true,
        },
        {
            id: 'TRX-947',
            time: '8 menit lalu',
            title: 'Biaya Server Cloud & Langganan',
            category: 'Operasional',
            debitAccount: 'Beban Operasional',
            creditAccount: 'Kas Utama IDR',
            amountFormatted: '-Rp 2.450.000',
            isIncome: false,
        },
        {
            id: 'TRX-946',
            time: '24 menit lalu',
            title: 'Penerimaan Transaksi QRIS Toko',
            category: 'Retail',
            debitAccount: 'Kas Toko',
            creditAccount: 'Pendapatan Penjualan',
            amountFormatted: '+Rp 3.850.000',
            isIncome: true,
        },
    ];

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
            <section className="relative pt-32 pb-32 sm:pb-40 md:pt-40 md:pb-48 px-4 sm:px-6 max-w-6xl mx-auto text-center">
                {/* Hero Content (Lugas & To The Point) */}
                <div className="space-y-4 sm:space-y-5 max-w-3xl mx-auto relative z-10">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.12] text-balance font-heading">
                        Kelola Keuangan Bisnis Lebih Tenang<br className="hidden sm:inline" />
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-zinc-300 max-w-xl mx-auto leading-relaxed">
                        Semua uang masuk dan keluar tercatat otomatis secara akurat. Bebas salah hitung, tanpa repot rekap manual setiap hari.
                    </p>

                    {/* Tombol CTA Pill */}
                    <div className="flex flex-row items-center justify-center gap-3 pt-2 sm:pt-3">
                        <Link to={isAuthenticated ? '/app/dashboard' : '/register'}>
                            <button className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl shadow-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                                <span>{isAuthenticated ? 'Buka Dasbor Saya' : 'Buka Akun Gratis'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                        <a href="#demo">
                            <button className="px-5 sm:px-7 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-semibold border border-zinc-700/80 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 backdrop-blur-md transition-all cursor-pointer whitespace-nowrap">
                                Coba Simulasi
                            </button>
                        </a>
                    </div>
                </div>

                {/* ===================================================================== */}
                {/* 3 KARTU TESTIMONI PORTRAIT NUMPUK SEBAGIAN (Ala Mindly)               */}
                {/* ===================================================================== */}
                <div className="relative mt-16 sm:mt-24 max-w-5xl mx-auto flex flex-row items-end justify-center -space-x-6 sm:-space-x-8 lg:-space-x-10 px-2 sm:px-3 overflow-visible">
                    {/* KARTU KIRI: Dimas (Portrait & Terselip Sebagian) */}
                    <div className="w-[155px] xs:w-[180px] sm:w-[240px] md:w-[270px] lg:w-[300px] rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-[#16161c]/95 via-[#111115]/95 to-[#0c0c0e]/95 backdrop-blur-xl p-3 sm:p-5 md:p-8 text-center shadow-2xl relative z-10 -rotate-6 translate-y-5 sm:translate-y-6 origin-bottom-right hover:z-30 hover:rotate-0 hover:translate-y-0 transition-all duration-300 flex flex-col justify-between min-h-[200px] sm:min-h-[290px] md:min-h-[400px] lg:min-h-[460px] group">
                        {/* Avatar Muka Orang */}
                        <div className="flex justify-center pt-1">
                            <div className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80"
                                    alt="Dimas K."
                                    className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-emerald-400/40 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-500/10"
                                />
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center text-[8px] md:text-[10px] text-zinc-950 font-bold">
                                    ✓
                                </div>
                            </div>
                        </div>

                        {/* Kata-kata Testimoni Santai */}
                        <div className="my-auto py-2 sm:py-4 md:py-6 px-1 space-y-1 sm:space-y-3">
                            <p className="font-display text-[11px] sm:text-base md:text-xl lg:text-[22px] text-zinc-100 font-normal leading-snug italic">
                                "Asli, gak ada lagi drama pusing nyari selisih duit pas akhir bulan."
                            </p>
                        </div>

                        {/* Nama & Usaha */}
                        <div className="pt-2 sm:pt-3 md:pt-4 border-t border-white/5 space-y-0.5">
                            <span className="font-semibold text-[10px] sm:text-xs md:text-sm text-white block">Dimas K.</span>
                            <span className="text-[9px] sm:text-[11px] md:text-xs text-zinc-400 block font-sans">Owner Toko Retail</span>
                        </div>
                    </div>

                    {/* KARTU TENGAH: Sarah (Portrait Paling Depan & Menonjol) */}
                    <div className="w-[175px] xs:w-[200px] sm:w-[265px] md:w-[300px] lg:w-[330px] rounded-[1.8rem] sm:rounded-[2.2rem] md:rounded-[2.8rem] border border-blue-500/30 bg-gradient-to-b from-[#1a1a24]/98 via-[#13131a]/98 to-[#0d0d12]/98 backdrop-blur-xl p-4 sm:p-7 md:p-9 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] shadow-blue-500/15 relative z-20 scale-105 hover:scale-108 transition-all duration-300 flex flex-col justify-between min-h-[220px] sm:min-h-[320px] md:min-h-[450px] lg:min-h-[490px] group my-0">
                        {/* Avatar Muka Orang */}
                        <div className="flex justify-center pt-1">
                            <div className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"
                                    alt="Sarah T."
                                    className="w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 rounded-full object-cover border-2 border-blue-400/50 shadow-2xl shadow-blue-500/20 ring-4 ring-blue-500/15"
                                />
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-blue-500 border-2 border-zinc-950 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold">
                                    ★
                                </div>
                            </div>
                        </div>

                        {/* Kata-kata Testimoni Santai */}
                        <div className="my-auto py-2 sm:py-4 md:py-6 px-1 space-y-1 sm:space-y-3">
                            <p className="font-display text-[12px] sm:text-lg md:text-2xl lg:text-[26px] text-white font-normal leading-snug italic">
                                "Pas promo rame parah sistemnya tetep aman. Gak ada yang ngomel saldo kepotong dobel."
                            </p>
                        </div>

                        {/* Nama & Usaha */}
                        <div className="pt-2 sm:pt-3 md:pt-4 border-t border-white/10 space-y-0.5">
                            <span className="font-bold text-[10px] sm:text-xs md:text-sm text-white block">Sarah T.</span>
                            <span className="text-[9px] sm:text-[11px] md:text-xs text-blue-300 block font-sans">Brand Owner & E-Commerce</span>
                        </div>
                    </div>

                    {/* KARTU KANAN: Kevin (Portrait & Terselip Sebagian) */}
                    <div className="w-[155px] xs:w-[180px] sm:w-[240px] md:w-[270px] lg:w-[300px] rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-[#16161c]/95 via-[#111115]/95 to-[#0c0c0e]/95 backdrop-blur-xl p-3 sm:p-5 md:p-8 text-center shadow-2xl relative z-10 rotate-6 translate-y-5 sm:translate-y-6 origin-bottom-left hover:z-30 hover:rotate-0 hover:translate-y-0 transition-all duration-300 flex flex-col justify-between min-h-[200px] sm:min-h-[290px] md:min-h-[400px] lg:min-h-[460px] group">
                        {/* Avatar Muka Orang */}
                        <div className="flex justify-center pt-1">
                            <div className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&auto=format&fit=crop&q=80"
                                    alt="Kevin M."
                                    className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-purple-400/40 shadow-xl shadow-purple-500/10 ring-4 ring-purple-500/10"
                                />
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-purple-500 border-2 border-zinc-950 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold">
                                    ✓
                                </div>
                            </div>
                        </div>

                        {/* Kata-kata Testimoni Santai */}
                        <div className="my-auto py-2 sm:py-4 md:py-6 px-1 space-y-1 sm:space-y-3">
                            <p className="font-display text-[11px] sm:text-base md:text-xl lg:text-[22px] text-zinc-100 font-normal leading-snug italic">
                                "Klien luar bayar Dolar langsung masuk utuh, gak pake ribet bikin rekening baru."
                            </p>
                        </div>

                        {/* Nama & Usaha */}
                        <div className="pt-2 sm:pt-3 md:pt-4 border-t border-white/5 space-y-0.5">
                            <span className="font-semibold text-[10px] sm:text-xs md:text-sm text-white block">Kevin M.</span>
                            <span className="text-[9px] sm:text-[11px] md:text-xs text-zinc-400 block font-sans">Agency Lead</span>
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
                    <div className="text-center max-w-3xl mx-auto space-y-3.5 sm:space-y-4">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight font-heading leading-tight">
                            Dasbor Finansial Modern dalam Genggaman.
                        </h2>
                        <p className="text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                            Gambaran nyata dasbor operasional Bastion: pantau saldo multi-mata uang, kontrol arus kas masuk-keluar, dan kelola dompet usaha Anda dalam satu tampilan terpadu.
                        </p>
                    </div>

                    {/* Window Frame Container (Representasi Visual Dasbor Asli Bastion) */}
                    <div className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0c0c10]/95 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] ring-1 ring-white/5 overflow-hidden text-left">
                        {/* 1. Header Bar Jendela Aplikasi */}
                        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/10 bg-[#121217] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
                            {/* Window Dots & Organization Info */}
                            <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80 border border-red-400/40" />
                                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500/80 border border-amber-400/40" />
                                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
                                    </div>
                                    <div className="h-4 w-px bg-white/10" />
                                    <span className="font-bold text-xs text-white tracking-tight">Bastion Financial OS</span>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                                    <span className="text-zinc-600 hidden sm:inline">•</span>
                                    <span className="text-zinc-400 font-medium text-[11px] sm:text-xs">PT Kopi Nusantara</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="hidden xs:inline">Terverifikasi</span>
                                    </span>
                                </div>
                            </div>

                            {/* Top Right Quick Action Buttons */}
                            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] sm:text-[11px] font-medium text-emerald-400 mr-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Real-Time</span>
                                    <span className="font-mono text-[10px] opacity-80">(0.04s)</span>
                                </div>
                                <span className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors">
                                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>Isi Saldo</span>
                                </span>
                                <span className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors">
                                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <span>Kirim Uang</span>
                                </span>
                                <span className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-[11px] font-semibold text-blue-300 hover:bg-blue-600/30 transition-colors">
                                    <Plus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <span>Buka Dompet</span>
                                </span>
                            </div>
                        </div>

                        {/* 2. Main Dashboard Content Surface */}
                        <div className="p-3.5 sm:p-7 md:p-8 space-y-5 sm:space-y-7">
                            {/* UNIFIED FINANCIAL HERO SURFACE (Total Balance & Multi-Currency Chips) */}
                            <div className="rounded-xl sm:rounded-2xl border border-white/5 bg-gradient-to-br from-[#15151c] via-[#101015] to-[#0a0a0d] p-4 sm:p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-5">
                                    <div className="space-y-2">
                                        <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                                            <Wallet className="w-4 h-4 text-emerald-400" />
                                            <span>Total Saldo Kas Tersedia</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        </div>

                                        <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                                            <div className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono tracking-tight text-white">
                                                Rp {currentDataset.baseBalance.toLocaleString('id-ID')},00
                                            </div>
                                            <span className="text-xs font-mono text-zinc-400 font-medium">
                                                (Rupiah)
                                            </span>
                                        </div>

                                        {/* Multi-Currency Chips (Horizontally scrollable on mobile) */}
                                        <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1 no-scrollbar">
                                            <span className="text-[11px] text-zinc-400 font-medium shrink-0">Saldo Valas:</span>
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-white/10 text-xs font-mono text-zinc-300 shrink-0">
                                                <span className="text-[10px] text-blue-400 font-bold">USD</span>
                                                <span className="font-semibold text-white">$3,250.00</span>
                                                <span className="text-[10px] text-zinc-500 hidden sm:inline">• Klien Global</span>
                                            </div>
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-white/10 text-xs font-mono text-zinc-300 shrink-0">
                                                <span className="text-[10px] text-purple-400 font-bold">SGD</span>
                                                <span className="font-semibold text-white">S$ 4,800.00</span>
                                                <span className="text-[10px] text-zinc-500 hidden sm:inline">• Regional Asia</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trust & Status Highlights */}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs text-zinc-400 pt-1 lg:pt-0">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-white/5">
                                            <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
                                            <span>
                                                <strong className="text-white font-mono">3</strong> Dompet Aktif
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Proteksi Saldo 100%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4 KPI METRICS CARDS */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                                {/* Total Kas */}
                                <div className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-[#14141a]/80 border border-white/5 space-y-1 sm:space-y-2 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between text-[10px] xs:text-[11px] sm:text-xs text-zinc-400 font-medium">
                                        <span className="truncate">Total Kas</span>
                                        <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                            {currentDataset.growth.split(' ')[0]}
                                        </span>
                                    </div>
                                    <div className="text-xs xs:text-sm sm:text-lg lg:text-2xl font-bold text-white font-mono tracking-tight truncate">
                                        Rp {currentDataset.baseBalance.toLocaleString('id-ID')}
                                    </div>
                                    <div className="text-[9px] sm:text-[11px] text-zinc-500 flex items-center gap-1 truncate">
                                        <CheckCircle2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-400 shrink-0" />
                                        <span>Selalu Akurat</span>
                                    </div>
                                </div>

                                {/* Uang Masuk */}
                                <div className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-[#14141a]/80 border border-white/5 space-y-1 sm:space-y-2 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between text-[10px] xs:text-[11px] sm:text-xs text-zinc-400 font-medium">
                                        <span className="truncate">Uang Masuk</span>
                                        <div className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                                            <ArrowUpRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                        </div>
                                    </div>
                                    <div className="text-xs xs:text-sm sm:text-lg lg:text-2xl font-bold text-emerald-400 font-mono tracking-tight truncate">
                                        +Rp {currentDataset.baseInflow.toLocaleString('id-ID')}
                                    </div>
                                    <div className="text-[9px] sm:text-[11px] text-zinc-500 truncate">
                                        {currentDataset.txCount}
                                    </div>
                                </div>

                                {/* Beban Kas */}
                                <div className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-[#14141a]/80 border border-white/5 space-y-1 sm:space-y-2 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between text-[10px] xs:text-[11px] sm:text-xs text-zinc-400 font-medium">
                                        <span className="truncate">Beban Kas</span>
                                        <div className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
                                            <ArrowDownRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                        </div>
                                    </div>
                                    <div className="text-xs xs:text-sm sm:text-lg lg:text-2xl font-bold text-sky-300 font-mono tracking-tight truncate">
                                        -Rp {currentDataset.outflow.toLocaleString('id-ID')}
                                    </div>
                                    <div className="text-[9px] sm:text-[11px] text-zinc-500 truncate">
                                        Gaji & beban
                                    </div>
                                </div>

                                {/* Integritas */}
                                <div className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-[#14141a]/80 border border-white/5 space-y-1 sm:space-y-2 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between text-[10px] xs:text-[11px] sm:text-xs text-zinc-400 font-medium">
                                        <span className="truncate">Integritas</span>
                                        <Badge variant="success" className="text-[8px] sm:text-xs px-1.5 py-0.2">
                                            SEIMBANG
                                        </Badge>
                                    </div>
                                    <div className="text-xs xs:text-sm sm:text-lg lg:text-2xl font-bold text-white font-mono tracking-tight flex items-center gap-1.5 sm:gap-2 truncate">
                                        <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400 stroke-[2.5] shrink-0" />
                                        <span>Nol Selisih</span>
                                    </div>
                                    <div className="text-[9px] sm:text-[11px] text-zinc-500 truncate">
                                        Tercatat otomatis
                                    </div>
                                </div>
                            </div>

                            {/* FINTECH SPLINE CHART (Grafik Tren Finansial dengan Filter Waktu) */}
                            <div className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-[#121217] border border-white/5 space-y-3.5 sm:space-y-4 relative overflow-hidden shadow-xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5 relative z-10">
                                    <div>
                                        <div className="text-[11px] sm:text-xs text-zinc-400 font-medium">Tren Arus Kas Operasional</div>
                                        <div className="text-base sm:text-2xl font-bold font-mono text-white tracking-tight flex items-center gap-2.5 pt-0.5">
                                            <span>Rp {currentDataset.baseBalance.toLocaleString('id-ID')},00</span>
                                            <span className="text-[10px] sm:text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                {currentDataset.growth}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Legend & Interactive Timeframe Pills (Responsive Segmented Control) */}
                                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between sm:justify-end gap-2 sm:gap-2.5">
                                        <div className="hidden xs:flex items-center gap-1.5 text-zinc-300 font-medium px-2 sm:px-2.5 py-1 rounded-full bg-zinc-900/60 border border-white/5 text-[11px] sm:text-xs self-start xs:self-auto">
                                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                                            <span>Arus Kas Masuk</span>
                                        </div>

                                        <div className="p-0.5 sm:p-1 rounded-xl bg-zinc-900 border border-zinc-800 grid grid-cols-3 sm:flex items-center gap-0.5 sm:gap-1 w-full sm:w-auto">
                                            {[
                                                { id: 'today', label: 'Hari Ini' },
                                                { id: '7d', label: '7 Hari' },
                                                { id: '30d', label: '30 Hari' },
                                            ].map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setTimeframe(tab.id as TimeframeType)}
                                                    className={`px-2.5 sm:px-3 py-1.5 sm:py-1 text-center text-[11px] sm:text-xs rounded-lg font-medium transition-all cursor-pointer ${
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

                                {/* SVG Chart Canvas */}
                                <div className="relative w-full h-40 sm:h-52 md:h-56 pt-2">
                                    <div
                                        style={{ left: `${(currentDataset.peakCoord.x / 600) * 100}%` }}
                                        className="absolute top-1 -translate-x-1/2 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-medium text-white shadow-lg z-20"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                        <span className="font-mono text-sky-300 font-bold">{currentDataset.peakValue}</span>
                                        <span className="text-zinc-400 text-[11px]">• {currentDataset.peakTime}</span>
                                    </div>

                                    <svg
                                        viewBox="0 0 600 180"
                                        className="w-full h-full overflow-visible"
                                        preserveAspectRatio="none"
                                    >
                                        <defs>
                                            <linearGradient id="cleanAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.14" />
                                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                                            </linearGradient>
                                            <linearGradient id="cleanStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#60a5fa" />
                                                <stop offset="60%" stopColor="#38bdf8" />
                                                <stop offset="100%" stopColor="#34d399" />
                                            </linearGradient>
                                        </defs>

                                        <line x1="0" y1="45" x2="600" y2="45" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />
                                        <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />
                                        <line x1="0" y1="135" x2="600" y2="135" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />

                                        <path
                                            d={currentDataset.splineArea}
                                            fill="url(#cleanAreaGradient)"
                                            className="transition-all duration-500 ease-out"
                                        />

                                        <path
                                            d={currentDataset.splinePath}
                                            fill="none"
                                            stroke="url(#cleanStrokeGradient)"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="transition-all duration-500 ease-out"
                                        />

                                        <circle
                                            cx={currentDataset.peakCoord.x}
                                            cy={currentDataset.peakCoord.y}
                                            r="5"
                                            fill="#09090b"
                                            stroke="#38bdf8"
                                            strokeWidth="2"
                                        />
                                        <circle
                                            cx={currentDataset.peakCoord.x}
                                            cy={currentDataset.peakCoord.y}
                                            r="2"
                                            fill="#ffffff"
                                        />
                                    </svg>

                                    <div className="flex items-center justify-between text-[9px] sm:text-[11px] text-zinc-500 pt-3 font-mono">
                                        {currentDataset.xLabels.map((label, idx) => (
                                            <span key={idx}>{label}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile View Switcher Tab (Hanya tampil di mobile/tablet < lg) */}
                            <div className="lg:hidden p-1 rounded-xl bg-zinc-900/90 border border-white/10 grid grid-cols-2 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setMobileTab('wallets')}
                                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        mobileTab === 'wallets'
                                            ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Rekening Dompet (3)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMobileTab('activity')}
                                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        mobileTab === 'activity'
                                            ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Mutasi Terkini (3)</span>
                                </button>
                            </div>

                            {/* DUA KOLOM DASBOR UTAMA: REKENING DOMPET & RIWAYAT MUTASI */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
                                {/* Kolom Kiri (7 Cols): Rekening Dompet Bisnis */}
                                <div className={`lg:col-span-7 rounded-xl sm:rounded-2xl bg-[#111116]/90 border border-white/5 p-4 sm:p-6 space-y-3.5 sm:space-y-4 text-left ${
                                    mobileTab === 'wallets' ? 'block' : 'hidden lg:block'
                                }`}>
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <div>
                                            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
                                                <Wallet className="w-4 h-4 text-emerald-400" />
                                                <span>Rekening Dompet Bisnis</span>
                                            </h4>
                                            <p className="text-[10px] sm:text-xs text-zinc-400 pt-0.5">
                                                Semua rekening aktif beroperasi di bawah satu buku besar.
                                            </p>
                                        </div>
                                        <span className="text-[10px] sm:text-xs text-zinc-400 font-mono font-medium">
                                            3 Dompet
                                        </span>
                                    </div>

                                    <div className="space-y-2.5 sm:space-y-3">
                                        {previewWallets.map((wallet) => (
                                            <div
                                                key={wallet.id}
                                                className="p-3 sm:p-4 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-3 group"
                                            >
                                                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-zinc-800/90 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                                                        {wallet.shortCode}
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                                            <span className="text-xs font-bold text-white truncate">
                                                                {wallet.name}
                                                            </span>
                                                            <Badge variant={wallet.badgeVariant} className="text-[9px] px-1.5 py-0.2 shrink-0 hidden xs:inline-flex">
                                                                {wallet.status}
                                                            </Badge>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleCopyId(wallet.id, e)}
                                                            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                                                            title="Salin Nomor Rekening"
                                                        >
                                                            <span>Rek: •••• {wallet.id.slice(-4)}</span>
                                                            {copiedId === wallet.id ? (
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold font-sans">
                                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                                    <span>Tersalin!</span>
                                                                </span>
                                                            ) : (
                                                                <Copy className="w-3 h-3 text-zinc-500 group-hover:text-zinc-400" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <span className="text-xs xs:text-sm sm:text-base font-bold font-mono text-white block">
                                                        {wallet.balance}
                                                    </span>
                                                    <Badge variant={wallet.badgeVariant} className="text-[9px] px-1.5 py-0.2 shrink-0 xs:hidden inline-flex mt-0.5">
                                                        {wallet.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500">
                                        <span>Proteksi Saldo Berlapis</span>
                                        <span className="text-emerald-400 font-medium">Buku Kas Terisolasi ✓</span>
                                    </div>
                                </div>

                                {/* Kolom Kanan (5 Cols): Riwayat Mutasi Terkini */}
                                <div className={`lg:col-span-5 rounded-xl sm:rounded-2xl bg-[#111116]/90 border border-white/5 p-4 sm:p-6 space-y-3.5 sm:space-y-4 text-left ${
                                    mobileTab === 'activity' ? 'block' : 'hidden lg:block'
                                }`}>
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <div>
                                            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                                <span>Mutasi Transaksi Terkini</span>
                                            </h4>
                                            <p className="text-[10px] sm:text-xs text-zinc-400 pt-0.5">
                                                Tervalidasi & seimbang otomatis.
                                            </p>
                                        </div>
                                        <span className="text-[9px] sm:text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
                                            SEIMBANG ✓
                                        </span>
                                    </div>

                                    <div className="space-y-2.5 sm:space-y-3">
                                        {transactions.map((trx) => (
                                            <div
                                                key={trx.id}
                                                className="p-3 sm:p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-white/10 transition-all space-y-1.5 group"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="font-bold text-white group-hover:text-blue-300 transition-colors text-xs truncate">
                                                            {trx.title}
                                                        </span>
                                                        <span className="text-[9px] sm:text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800/80 shrink-0">
                                                            {trx.category}
                                                        </span>
                                                    </div>
                                                    <span className="text-zinc-500 font-mono text-[9px] sm:text-[10px] shrink-0">
                                                        {trx.time}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-1 text-xs pt-0.5">
                                                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400 min-w-0 truncate">
                                                        <span className="truncate">{trx.debitAccount}</span>
                                                        <span className="text-zinc-600 shrink-0">→</span>
                                                        <span className="truncate">{trx.creditAccount}</span>
                                                    </div>
                                                    <span
                                                        className={`font-bold font-mono text-xs sm:text-sm shrink-0 ${
                                                            trx.isIncome ? 'text-emerald-400' : 'text-sky-300'
                                                        }`}
                                                    >
                                                        {trx.amountFormatted}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500">
                                        <span>Pencatatan Otomatis</span>
                                        <span className="text-emerald-400 font-medium">Nol Selisih Siluman ✓</span>
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
                    <div className="text-left max-w-2xl space-y-3.5 sm:space-y-4">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight font-heading leading-tight">
                            Semua yang Bisnis Anda Butuhkan.
                        </h2>
                        <p className="text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed max-w-xl">
                            Praktis seperti dompet digital, akurat seperti pembukuan perbankan.
                        </p>
                    </div>

                    {/* 4-Card Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-stretch">
                        {/* Bento 1: Multi-Mata Uang (Span 7 Col) */}
                        <div className="md:col-span-7 rounded-2xl sm:rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-5 sm:p-8 shadow-xl flex flex-col justify-between space-y-5 sm:space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-2 sm:space-y-3 relative z-10">
                                <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                                    <span className="text-zinc-400">01</span>
                                    <span>/</span>
                                    <span className="text-zinc-400">Multi-Mata Uang</span>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                    Satu Akun untuk Berbagai Mata Uang
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg">
                                    Simpan Rupiah, Dolar AS, dan mata uang lainnya secara berdampingan tanpa repot membuka dan mengurus banyak rekening bank.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 relative z-10">
                                <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-0.5 sm:space-y-1">
                                    <span className="text-[9px] sm:text-[10px] text-zinc-400 block font-medium">RUPIAH</span>
                                    <span className="text-xs sm:text-sm font-bold text-white block font-mono truncate">Rp 45,0 Juta</span>
                                    <span className="text-[9px] sm:text-[10px] text-emerald-400 block truncate">Kas Utama</span>
                                </div>
                                <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-0.5 sm:space-y-1">
                                    <span className="text-[9px] sm:text-[10px] text-zinc-400 block font-medium">DOLAR</span>
                                    <span className="text-xs sm:text-sm font-bold text-white block font-mono truncate">$3,250</span>
                                    <span className="text-[9px] sm:text-[10px] text-blue-400 block truncate">Klien Global</span>
                                </div>
                                <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-0.5 sm:space-y-1">
                                    <span className="text-[9px] sm:text-[10px] text-zinc-400 block font-medium">DOLAR SG</span>
                                    <span className="text-xs sm:text-sm font-bold text-white block font-mono truncate">S$ 4,800</span>
                                    <span className="text-[9px] sm:text-[10px] text-purple-400 block truncate">Regional Asia</span>
                                </div>
                            </div>
                        </div>

                        {/* Bento 2: Anti Saldo Minus (Span 5 Col) */}
                        <div className="md:col-span-5 rounded-2xl sm:rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-5 sm:p-8 shadow-xl flex flex-col justify-between space-y-5 sm:space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-2 sm:space-y-3">
                                <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                                    <span className="text-zinc-400">02</span>
                                    <span>/</span>
                                    <span className="text-zinc-400">Proteksi Saldo</span>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                    Saldo Anti-Minus & Bebas Potong Dobel
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Sistem secara otomatis mengunci saldo saat transaksi berjalan agar uang bisnis Anda tidak pernah terpotong dua kali.
                                </p>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 space-y-1 sm:space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-400 font-semibold font-mono">
                                    <span>PROTEKSI TRANSAKSI GANDA</span>
                                    <span>AKTIF</span>
                                </div>
                                <p className="text-[10px] sm:text-[11px] text-zinc-400">
                                    Saldo tidak akan pernah minus, sekalipun transaksi masuk bersamaan.
                                </p>
                            </div>
                        </div>

                        {/* Bento 3: Laporan Rapi (Span 5 Col) */}
                        <div className="md:col-span-5 rounded-2xl sm:rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-5 sm:p-8 shadow-xl flex flex-col justify-between space-y-5 sm:space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-2 sm:space-y-3">
                                <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                                    <span className="text-zinc-400">03</span>
                                    <span>/</span>
                                    <span className="text-zinc-400">Pembukuan Otomatis</span>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                    Laporan Keuangan Rapi Tanpa Lembur
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Semua transaksi sudah tercatat rapi sejak awal. Laporan bulanan selesai dalam hitungan detik, tanpa perlu rekap manual.
                                </p>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="font-bold text-white block text-xs">Catatan Lengkap & Rapi</span>
                                    <span className="text-[10px] sm:text-[11px] text-zinc-400">Laporan siap kapan saja</span>
                                </div>
                                <span className="text-[10px] sm:text-xs font-mono font-bold text-emerald-400 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                                    SELALU AKURAT
                                </span>
                            </div>
                        </div>

                        {/* Bento 4: Kunci Dompet (Span 7 Col) */}
                        <div className="md:col-span-7 rounded-2xl sm:rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#121216] via-[#0e0e11] to-[#09090b] p-5 sm:p-8 shadow-xl flex flex-col justify-between space-y-5 sm:space-y-6 text-left relative overflow-hidden group hover:border-zinc-700 transition-all">
                            <div className="space-y-2 sm:space-y-3">
                                <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                                    <span className="text-zinc-400">04</span>
                                    <span>/</span>
                                    <span className="text-zinc-400">Kendali Pengeluaran</span>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                    Kunci Pengeluaran Kapan Saja
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg">
                                    Bekukan pengeluaran akun tertentu dengan satu klik saat dibutuhkan, tanpa mengganggu operasional akun lainnya.
                                </p>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                                <div>
                                    <span className="text-xs font-bold text-white block">Kendali Akun Instan</span>
                                    <span className="text-[10px] sm:text-[11px] text-zinc-400">Uang masuk tetap diterima, pengeluaran terkunci sementara</span>
                                </div>
                                <span className="text-[10px] sm:text-[11px] text-zinc-300 font-mono font-medium px-2.5 sm:px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 whitespace-nowrap self-start sm:self-auto shrink-0">
                                    KENDALI PENUH
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 4: BUKTI KEAMANAN & FINAL RADIANT CTA (#keamanan)                  */}
            {/* ========================================================================= */}
            <section id="keamanan" className="py-24 relative overflow-hidden">
                {/* Radiant Glowing Divider */}
                <div className="w-full max-w-5xl mx-auto mb-16 px-4">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                </div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                    {/* Section Heading */}
                    <div className="text-center max-w-3xl mx-auto space-y-3.5 sm:space-y-4">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight font-heading leading-tight">
                            Kas Bisnis Anda Dijaga Otomatis.
                        </h2>
                        <p className="text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                            Dari kasir yang tak sengaja klik dobel sampai internet yang tiba-tiba ngadat, Bastion memastikan uang kas Anda selalu pas dan aman.
                        </p>
                    </div>

                    {/* Concentric Security Vault Architecture */}
                    <div className="pt-2">
                        <ConcentricVault />
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* MINIMALIST & SIMPLE FOOTER                                                */}
            {/* ========================================================================= */}
            <footer className="relative border-t border-white/5 bg-[#09090b] py-12 sm:py-14 text-xs text-zinc-400 text-left overflow-hidden">
                {/* Subtle Horizon Glow Line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none" />

                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
                    {/* Top Row: Brand & Horizontal Nav */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
                            <div className="flex items-center gap-2.5">
                                <BastionLogo className="w-6 h-6 sm:w-7 sm:h-7 text-white shrink-0" />
                                <span className="font-bold text-base text-white tracking-tight font-heading">Bastion</span>
                            </div>
                            <span className="hidden sm:inline text-zinc-700">•</span>
                            <p className="text-xs text-zinc-400">
                                Dompet kas dan pembukuan usaha tanpa selisih.
                            </p>
                        </div>

                        {/* Essential Nav Links */}
                        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-zinc-400">
                            <a href="#demo" className="hover:text-white transition-colors">Dasbor</a>
                            <a href="#keunggulan" className="hover:text-white transition-colors">Keunggulan</a>
                            <a href="#keamanan" className="hover:text-white transition-colors">Keamanan</a>
                            <Link to="/login" className="hover:text-white transition-colors">Masuk</Link>
                            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Buka Akun →</Link>
                        </nav>
                    </div>

                    {/* Bottom Row: Copyright & Minimal Status */}
                    <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
                        <p>&copy; {new Date().getFullYear()} Bastion. Seluruh hak cipta dilindungi.</p>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Semua Sistem Normal</span>
                            </div>
                            <span className="text-zinc-700">•</span>
                            <button
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                Ke Atas ↑
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
