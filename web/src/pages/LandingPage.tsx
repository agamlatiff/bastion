import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/landing/Navbar';
import { BastionLogo } from '../components/common/BastionLogo';
import { ConcentricVault } from '../components/landing/ConcentricVault';
import { DashboardStatisticsPreview } from '../components/landing/DashboardStatisticsPreview';

export const LandingPage: React.FC = () => {
    const { isAuthenticated } = useAuth();

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
                            Statistik Finansial Nyata dalam Genggaman.
                        </h2>
                        <p className="text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                            Pantau target pertumbuhan kas, dinamika volume mutasi bulanan, dan kesehatan alokasi dana usaha Anda dalam satu tampilan analitik terpadu.
                        </p>
                    </div>

                    {/* Visualisasi Statistik Dasbor Finansial Bastion (Sesuai Referensi & Design System Bastion) */}
                    <DashboardStatisticsPreview />
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

                <div className="w-full space-y-14">
                    {/* Section Heading */}
                    <div className="text-center max-w-3xl mx-auto px-4 sm:px-6 space-y-3.5 sm:space-y-4">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight font-heading leading-tight">
                            Kas Bisnis Anda Dijaga Otomatis.
                        </h2>
                        <p className="text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                            Dari kasir yang tak sengaja klik dobel sampai internet yang tiba-tiba ngadat, Bastion memastikan uang kas Anda selalu pas dan aman.
                        </p>
                    </div>

                    {/* Concentric Security Vault Architecture - Full-width schematic stage */}
                    <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
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
