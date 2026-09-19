import React, { useState } from 'react';
import { ShieldCheck, Lock, Fingerprint, CheckCircle2, Zap } from 'lucide-react';
import { BastionLogo } from '../common/BastionLogo';

type LayerId = 1 | 2 | 3;

interface LayerInfo {
    id: LayerId;
    name: string;
    level: string;
    title: string;
    description: string;
    scenario: string;
    realBenefit: string;
    metricLabel: string;
    metricValue: string;
    status: string;
    accentColor: {
        glow: string;
        border: string;
        text: string;
        bg: string;
        ringStroke: string;
        ringGlow: string;
    };
}

const LAYERS: Record<LayerId, LayerInfo> = {
    1: {
        id: 1,
        name: 'Lapisan 1: Anti-Dobel Bayar',
        level: 'Di Kasir & Pembayaran',
        title: 'Uang Tidak Pernah Terpotong Dua Kali',
        description: 'Saat sinyal internet pembeli lemot atau kasir gugup menekan tombol bayar berulang kali, Bastion langsung menyaring transaksi tersebut dan membatalkan pemotongan kedua seketika.',
        scenario: 'Tombol bayar terpencet 2x saat kasir ramai? Transaksi kedua otomatis ditahan.',
        realBenefit: 'Bebas drama komplain dari pelanggan dan tidak perlu repot transfer uang balik.',
        metricLabel: 'Risiko Terpotong 2x',
        metricValue: 'Nol (0% Terpotong)',
        status: 'Anti-Dobel Aktif',
        accentColor: {
            glow: 'rgba(56, 189, 248, 0.35)',
            border: 'border-sky-500/40',
            text: 'text-sky-400',
            bg: 'bg-sky-500/10',
            ringStroke: '#38bdf8',
            ringGlow: 'rgba(56, 189, 248, 0.8)',
        },
    },
    2: {
        id: 2,
        name: 'Lapisan 2: Anti-Saldo Minus',
        level: 'Di Pengeluaran Kas',
        title: 'Saldo Kas Tidak Akan Pernah Minus',
        description: 'Sebelum uang keluar, sistem selalu mengecek sisa kas riil Anda. Jika dana kurang walaupun hanya seribu rupiah, pengeluaran langsung ditolak sebelum uang sempat berpindah tangan.',
        scenario: 'Staf ingin bayar nota Rp 2.000.000 padahal kas cuma sisa Rp 1.500.000? Pengeluaran langsung ditolak.',
        realBenefit: 'Kas operasional usaha Anda tidak akan pernah jebol atau berutang tanpa disadari.',
        metricLabel: 'Jaminan Saldo',
        metricValue: 'Selalu Pas & Aman',
        status: 'Anti-Minus Aktif',
        accentColor: {
            glow: 'rgba(16, 185, 129, 0.35)',
            border: 'border-emerald-500/40',
            text: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            ringStroke: '#10b981',
            ringGlow: 'rgba(16, 185, 129, 0.8)',
        },
    },
    3: {
        id: 3,
        name: 'Lapisan 3: Catatan Terkunci',
        level: 'Di Buku Kas Utama',
        title: 'Catatan Kas Tidak Bisa Diubah Diam-Diam',
        description: 'Setiap rupiah yang masuk atau keluar langsung disegel permanen. Siapa pun, termasuk staf atau kasir, tidak akan bisa menghapus nota atau memanipulasi angka di masa lalu.',
        scenario: 'Ada yang berniat menghapus riwayat pengeluaran kemarin sore? Catatan terkunci rapat dan sistem menolak perubahan.',
        realBenefit: 'Pembukuan Anda selalu jujur, rapi, dan siap dicek kapan saja tanpa takut data diakali.',
        metricLabel: 'Keaslian Catatan',
        metricValue: '100% Tersegel Rapi',
        status: 'Catatan Terkunci',
        accentColor: {
            glow: 'rgba(129, 140, 248, 0.35)',
            border: 'border-indigo-500/40',
            text: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            ringStroke: '#818cf8',
            ringGlow: 'rgba(129, 140, 248, 0.8)',
        },
    },
};

export const ConcentricVault: React.FC = () => {
    const [activeLayer, setActiveLayer] = useState<LayerId>(2);
    const activeData = LAYERS[activeLayer];

    return (
        <div className="w-full max-w-6xl mx-auto">
            {/* Main Workbench Container */}
            <div className="relative rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 bg-[#0d0d12] p-4 sm:p-8 lg:p-12 overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.8)]">
                {/* Dynamic Ambient Background Glow */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full blur-[100px] sm:blur-[120px] pointer-events-none transition-all duration-700 opacity-20"
                    style={{ backgroundColor: activeData.accentColor.ringStroke }}
                />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
                    {/* Left Column: Interactive Layer Switcher */}
                    <div className="lg:col-span-5 space-y-3.5 sm:space-y-4">
                        <div className="space-y-1.5 sm:space-y-2 pb-1 sm:pb-2 text-left">
                            <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight font-heading">
                                Tiga Lapisan Penjaga Kas Usaha
                            </h3>
                            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                Klik tiap cincin atau tombol di bawah untuk melihat bagaimana Bastion menjaga uang bisnis Anda dari berbagai risiko di lapangan.
                            </p>
                        </div>

                        {/* 3 Interactive Layer Selector Cards */}
                        <div className="space-y-2.5 sm:space-y-3 pt-1">
                            {([1, 2, 3] as LayerId[]).map((id) => {
                                const item = LAYERS[id];
                                const isSelected = activeLayer === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setActiveLayer(id)}
                                        className={`w-full text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 flex items-start gap-3 sm:gap-3.5 group relative overflow-hidden cursor-pointer ${
                                            isSelected
                                                ? `bg-zinc-900/95 ${item.accentColor.border} shadow-lg shadow-black/40`
                                                : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                                        }`}
                                    >
                                        {/* Active Left Indicator Strip */}
                                        {isSelected && (
                                            <div
                                                className="absolute left-0 top-0 bottom-0 w-1 transition-all"
                                                style={{ backgroundColor: item.accentColor.ringStroke }}
                                            />
                                        )}

                                        <div
                                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                isSelected
                                                    ? `${item.accentColor.bg} ${item.accentColor.text}`
                                                    : 'bg-zinc-900 text-zinc-400 group-hover:text-zinc-200'
                                            }`}
                                        >
                                            {id === 1 && <Zap className="w-4 h-4" />}
                                            {id === 2 && <Lock className="w-4 h-4" />}
                                            {id === 3 && <Fingerprint className="w-4 h-4" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                                                    {item.level}
                                                </span>
                                                {isSelected && (
                                                    <span className={`text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.accentColor.bg} ${item.accentColor.text}`}>
                                                        Aktif
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-xs sm:text-sm font-semibold mt-0.5 transition-colors ${isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                                                {item.title}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quick Real-Time Guarantee Note */}
                        <div className="pt-1 sm:pt-2">
                            <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/70 flex items-center gap-2.5 sm:gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                <span className="text-[11px] sm:text-xs text-zinc-400 text-left">
                                    Semua perlindungan ini bekerja otomatis di latar belakang setiap kali ada uang masuk atau keluar.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Concentric SVG Vault Visualizer + Live Inspection Card */}
                    <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-5 sm:space-y-6">
                        {/* Concentric Architectural SVG */}
                        <div className="relative w-full max-w-[300px] sm:max-w-[380px] lg:max-w-[440px] aspect-square mx-auto flex items-center justify-center select-none">
                            <svg
                                viewBox="0 0 520 520"
                                className="w-full h-full overflow-visible"
                            >
                                <defs>
                                    {/* Radial Glow Filter */}
                                    <filter id="vault-glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="6" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                    <radialGradient id="center-hub-glow" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                                        <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.1" />
                                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                                    </radialGradient>
                                </defs>

                                {/* Ambient Central Light Circle */}
                                <circle cx="260" cy="260" r="130" fill="url(#center-hub-glow)" />

                                {/* Radar Grid Crosshairs */}
                                <line x1="260" y1="20" x2="260" y2="500" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 4" />
                                <line x1="20" y1="260" x2="500" y2="260" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 4" />

                                {/* ======================================================== */}
                                {/* LAYER 1: CINCIN LUAR (Radius 225px)                      */}
                                {/* ======================================================== */}
                                <g
                                    className="cursor-pointer transition-transform duration-300"
                                    onClick={() => setActiveLayer(1)}
                                >
                                    {/* Ghost Hover Zone */}
                                    <circle cx="260" cy="260" r="225" fill="transparent" stroke="transparent" strokeWidth="32" />
                                    {/* Main Ring Track */}
                                    <circle
                                        cx="260"
                                        cy="260"
                                        r="225"
                                        fill="none"
                                        stroke={activeLayer === 1 ? LAYERS[1].accentColor.ringStroke : 'rgba(255,255,255,0.08)'}
                                        strokeWidth={activeLayer === 1 ? '3' : '1.5'}
                                        strokeDasharray={activeLayer === 1 ? 'none' : '4 6'}
                                        className="transition-all duration-500"
                                        filter={activeLayer === 1 ? 'url(#vault-glow)' : undefined}
                                    />
                                    {/* Orbiting Satellite Node */}
                                    {activeLayer === 1 && (
                                        <g className="animate-pulse">
                                            <circle cx="260" cy="35" r="7" fill="#38bdf8" filter="url(#vault-glow)" />
                                            <circle cx="260" cy="35" r="3" fill="#ffffff" />
                                        </g>
                                    )}
                                    {/* Layer Label on SVG Arc */}
                                    <text
                                        x="260"
                                        y="24"
                                        textAnchor="middle"
                                        fill={activeLayer === 1 ? '#38bdf8' : '#71717a'}
                                        fontSize="10"
                                        fontFamily="monospace"
                                        letterSpacing="1.5"
                                        fontWeight={activeLayer === 1 ? 'bold' : 'normal'}
                                    >
                                        LAPISAN 1: ANTI-DOBEL
                                    </text>
                                </g>

                                {/* ======================================================== */}
                                {/* LAYER 2: CINCIN TENGAH (Radius 160px)                    */}
                                {/* ======================================================== */}
                                <g
                                    className="cursor-pointer transition-transform duration-300"
                                    onClick={() => setActiveLayer(2)}
                                >
                                    {/* Ghost Hover Zone */}
                                    <circle cx="260" cy="260" r="160" fill="transparent" stroke="transparent" strokeWidth="28" />
                                    {/* Main Ring Track */}
                                    <circle
                                        cx="260"
                                        cy="260"
                                        r="160"
                                        fill="none"
                                        stroke={activeLayer === 2 ? LAYERS[2].accentColor.ringStroke : 'rgba(255,255,255,0.1)'}
                                        strokeWidth={activeLayer === 2 ? '3.5' : '1.5'}
                                        strokeDasharray={activeLayer === 2 ? 'none' : '3 5'}
                                        className="transition-all duration-500"
                                        filter={activeLayer === 2 ? 'url(#vault-glow)' : undefined}
                                    />
                                    {/* Orbiting Satellite Node */}
                                    {activeLayer === 2 && (
                                        <g className="animate-pulse">
                                            <circle cx="100" cy="260" r="7" fill="#10b981" filter="url(#vault-glow)" />
                                            <circle cx="100" cy="260" r="3" fill="#ffffff" />
                                        </g>
                                    )}
                                    {/* Layer Label */}
                                    <text
                                        x="260"
                                        y="92"
                                        textAnchor="middle"
                                        fill={activeLayer === 2 ? '#10b981' : '#71717a'}
                                        fontSize="10"
                                        fontFamily="monospace"
                                        letterSpacing="1.5"
                                        fontWeight={activeLayer === 2 ? 'bold' : 'normal'}
                                    >
                                        LAPISAN 2: ANTI-MINUS
                                    </text>
                                </g>

                                {/* ======================================================== */}
                                {/* LAYER 3: CINCIN INTI (Radius 95px)                       */}
                                {/* ======================================================== */}
                                <g
                                    className="cursor-pointer transition-transform duration-300"
                                    onClick={() => setActiveLayer(3)}
                                >
                                    {/* Ghost Hover Zone */}
                                    <circle cx="260" cy="260" r="95" fill="transparent" stroke="transparent" strokeWidth="24" />
                                    {/* Main Ring Track */}
                                    <circle
                                        cx="260"
                                        cy="260"
                                        r="95"
                                        fill="none"
                                        stroke={activeLayer === 3 ? LAYERS[3].accentColor.ringStroke : 'rgba(255,255,255,0.12)'}
                                        strokeWidth={activeLayer === 3 ? '3.5' : '1.5'}
                                        className="transition-all duration-500"
                                        filter={activeLayer === 3 ? 'url(#vault-glow)' : undefined}
                                    />
                                    {/* Orbiting Satellite Node */}
                                    {activeLayer === 3 && (
                                        <g className="animate-pulse">
                                            <circle cx="260" cy="165" r="6" fill="#818cf8" filter="url(#vault-glow)" />
                                            <circle cx="260" cy="165" r="3" fill="#ffffff" />
                                        </g>
                                    )}
                                    {/* Layer Label */}
                                    <text
                                        x="260"
                                        y="152"
                                        textAnchor="middle"
                                        fill={activeLayer === 3 ? '#818cf8' : '#71717a'}
                                        fontSize="9"
                                        fontFamily="monospace"
                                        letterSpacing="1.5"
                                        fontWeight={activeLayer === 3 ? 'bold' : 'normal'}
                                    >
                                        LAPISAN 3: BUKU KAS
                                    </text>
                                </g>

                                {/* ======================================================== */}
                                {/* CENTER NUCLEUS: BASTION FORTRESS CORE                    */}
                                {/* ======================================================== */}
                                <g>
                                    {/* Center Glowing Hub Circle */}
                                    <circle
                                        cx="260"
                                        cy="260"
                                        r="46"
                                        fill="#111118"
                                        stroke="rgba(255,255,255,0.15)"
                                        strokeWidth="2"
                                        className="shadow-inner"
                                    />
                                    <circle
                                        cx="260"
                                        cy="260"
                                        r="42"
                                        fill="#0a0a0f"
                                        stroke="#2563eb"
                                        strokeWidth="1.5"
                                        strokeOpacity="0.4"
                                    />
                                </g>
                            </svg>

                            {/* Centered Pure Bastion Logo */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                <BastionLogo className="w-10 h-10 sm:w-13 sm:h-13 text-white drop-shadow-[0_0_25px_rgba(0,229,255,0.6)]" />
                            </div>
                        </div>

                        {/* Live Layer Inspection Panel (Grounded Business Explanation) */}
                        <div className="w-full p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-950/90 border border-zinc-800/80 shadow-xl space-y-3.5 sm:space-y-4 text-left transition-all duration-300">
                            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-white/5 pb-3">
                                <div>
                                    <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 block uppercase">
                                        Inspeksi Terpilih:
                                    </span>
                                    <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                        {activeData.title}
                                    </h4>
                                </div>
                                <div className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold font-mono ${activeData.accentColor.bg} ${activeData.accentColor.text}`}>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{activeData.status}</span>
                                </div>
                            </div>

                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                                {activeData.description}
                            </p>

                            {/* Real-World Scenario Box */}
                            <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-2.5 sm:gap-3">
                                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: activeData.accentColor.ringStroke }} />
                                <div className="space-y-0.5 sm:space-y-1 text-xs">
                                    <span className="text-white font-medium block">Contoh Kasus Nyata:</span>
                                    <span className="text-zinc-400 block text-[11px] sm:text-xs">{activeData.scenario}</span>
                                </div>
                            </div>

                            {/* Guarantee Metric Footer */}
                            <div className="pt-0.5 sm:pt-1 flex items-center justify-between text-xs text-zinc-400">
                                <span className="font-medium text-zinc-400">{activeData.metricLabel}:</span>
                                <span className={`font-mono font-bold ${activeData.accentColor.text}`}>
                                    {activeData.metricValue}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
