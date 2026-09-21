import React, { useState } from 'react';
import {
    ShieldCheck,
    Lock,
    Fingerprint,
    CheckCircle2,
    Zap,
    Cpu,
    Activity,
    Shield,
} from 'lucide-react';
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
        activeBorder: string;
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
        level: 'Di Kasir & Gateway Pembayaran',
        title: 'Uang Tidak Pernah Terpotong Dua Kali',
        description:
            'Saat sinyal internet pembeli lemot atau kasir gugup menekan tombol bayar berulang kali, Bastion langsung menyaring transaksi tersebut dan membatalkan pemotongan kedua seketika.',
        scenario: 'Tombol bayar terpencet 2x saat kasir ramai? Transaksi kedua otomatis ditahan.',
        realBenefit: 'Bebas drama komplain dari pelanggan dan tidak perlu repot transfer uang balik.',
        metricLabel: 'Risiko Terpotong 2x',
        metricValue: '0% (Nol Potongan Ganda)',
        status: 'Anti-Dobel Aktif',
        accentColor: {
            glow: 'rgba(56, 189, 248, 0.35)',
            border: 'border-sky-500/30',
            activeBorder: 'border-sky-400',
            text: 'text-sky-400',
            bg: 'bg-sky-500/10',
            ringStroke: '#38bdf8',
            ringGlow: 'rgba(56, 189, 248, 0.8)',
        },
    },
    2: {
        id: 2,
        name: 'Lapisan 2: Anti-Saldo Minus',
        level: 'Di Pengeluaran Kas & Dompet',
        title: 'Saldo Kas Tidak Akan Pernah Minus',
        description:
            'Sebelum uang keluar, sistem selalu mengecek sisa kas riil Anda. Jika dana kurang walaupun hanya seribu rupiah, pengeluaran langsung ditolak sebelum uang sempat berpindah tangan.',
        scenario: 'Staf ingin bayar nota Rp 2.000.000 padahal kas cuma sisa Rp 1.500.000? Pengeluaran langsung ditolak.',
        realBenefit: 'Kas operasional usaha Anda tidak akan pernah jebol atau berutang tanpa disadari.',
        metricLabel: 'Jaminan Saldo',
        metricValue: 'Selalu Pas & Akurat',
        status: 'Anti-Minus Aktif',
        accentColor: {
            glow: 'rgba(16, 185, 129, 0.35)',
            border: 'border-emerald-500/30',
            activeBorder: 'border-emerald-400',
            text: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            ringStroke: '#10b981',
            ringGlow: 'rgba(16, 185, 129, 0.8)',
        },
    },
    3: {
        id: 3,
        name: 'Lapisan 3: Catatan Terkunci',
        level: 'Di Buku Kas & Database Inti',
        title: 'Catatan Kas Tidak Bisa Diubah Diam-Diam',
        description:
            'Setiap rupiah yang masuk atau keluar langsung disegel permanen. Siapa pun, termasuk staf atau kasir, tidak akan bisa menghapus nota atau memanipulasi angka di masa lalu.',
        scenario: 'Ada yang berniat menghapus riwayat pengeluaran kemarin sore? Catatan terkunci rapat dan sistem menolak perubahan.',
        realBenefit: 'Pembukuan Anda selalu jujur, rapi, dan siap dicek kapan saja tanpa takut data diakali.',
        metricLabel: 'Keaslian Catatan',
        metricValue: '100% Tersegel Permanen',
        status: 'Catatan Terkunci',
        accentColor: {
            glow: 'rgba(129, 140, 248, 0.35)',
            border: 'border-indigo-500/30',
            activeBorder: 'border-indigo-400',
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
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Main Workbench Container */}
            <div className="relative rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 bg-[#0d0d12] p-5 sm:p-8 lg:p-12 overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
                {/* Dynamic Ambient Background Halo */}
                <div
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[540px] h-[340px] sm:h-[540px] rounded-full blur-[110px] sm:blur-[130px] pointer-events-none transition-all duration-700 opacity-20"
                    style={{ backgroundColor: activeData.accentColor.ringStroke }}
                />

                {/* ========================================================================= */}
                {/* 1. HEROIC TOP STAGE: THE CONCENTRIC FORTRESS VAULT                       */}
                {/* ========================================================================= */}
                <div className="relative z-10 flex flex-col items-center text-center space-y-6 sm:space-y-8">
                    {/* Header Telemetry Pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-[11px] font-mono text-zinc-300 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Arsitektur Pertahanan Berlapis (Defense-in-Depth)</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400 font-semibold uppercase tracking-wider">
                            Real-Time Active
                        </span>
                    </div>

                    {/* Central Concentric SVG Visualizer with Flanking Telemetry Badges */}
                    <div className="relative w-full max-w-4xl flex items-center justify-center py-2 sm:py-4">
                        {/* Left Telemetry Badges (Desktop Only) */}
                        <div className="hidden lg:flex flex-col gap-3 absolute left-4 xl:left-8 top-1/2 -translate-y-1/2 text-left z-20">
                            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md space-y-1 max-w-[210px] shadow-lg">
                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span>Zero-Trust Guard</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-tight">
                                    Pemeriksaan hak akses peran & validitas token di tiap request.
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md space-y-1 max-w-[210px] shadow-lg">
                                <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
                                    <Cpu className="w-3.5 h-3.5 shrink-0" />
                                    <span>Kunci Idempoten</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-tight">
                                    Redis atomic mutex mencegah mutasi ganda dalam hitungan mikrodetik.
                                </p>
                            </div>
                        </div>

                        {/* Concentric SVG Core Visualizer */}
                        <div className="relative w-full max-w-[290px] sm:max-w-[380px] lg:max-w-[430px] aspect-square mx-auto flex items-center justify-center select-none">
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
                                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.45" />
                                        <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.12" />
                                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                                    </radialGradient>
                                </defs>

                                {/* Ambient Central Light Circle */}
                                <circle cx="260" cy="260" r="135" fill="url(#center-hub-glow)" />

                                {/* Radar Grid Crosshairs */}
                                <line x1="260" y1="20" x2="260" y2="500" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />
                                <line x1="20" y1="260" x2="500" y2="260" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />

                                {/* ======================================================== */}
                                {/* LAYER 1: CINCIN LUAR (Radius 225px)                      */}
                                {/* ======================================================== */}
                                <g
                                    className="cursor-pointer transition-transform duration-300"
                                    onClick={() => setActiveLayer(1)}
                                    onMouseEnter={() => setActiveLayer(1)}
                                >
                                    {/* Ghost Hover Zone */}
                                    <circle cx="260" cy="260" r="225" fill="transparent" stroke="transparent" strokeWidth="36" />
                                    {/* Main Ring Track */}
                                    <circle
                                        cx="260"
                                        cy="260"
                                        r="225"
                                        fill="none"
                                        stroke={activeLayer === 1 ? LAYERS[1].accentColor.ringStroke : 'rgba(255,255,255,0.09)'}
                                        strokeWidth={activeLayer === 1 ? '3.5' : '1.5'}
                                        strokeDasharray={activeLayer === 1 ? 'none' : '4 6'}
                                        className="transition-all duration-500"
                                        filter={activeLayer === 1 ? 'url(#vault-glow)' : undefined}
                                    />
                                    {/* Orbiting Satellite Node */}
                                    {activeLayer === 1 && (
                                        <g className="animate-pulse">
                                            <circle cx="260" cy="35" r="7.5" fill="#38bdf8" filter="url(#vault-glow)" />
                                            <circle cx="260" cy="35" r="3.5" fill="#ffffff" />
                                        </g>
                                    )}
                                    {/* Layer Label on SVG Arc */}
                                    <text
                                        x="260"
                                        y="22"
                                        textAnchor="middle"
                                        fill={activeLayer === 1 ? '#38bdf8' : '#71717a'}
                                        fontSize="10"
                                        fontFamily="monospace"
                                        letterSpacing="1.5"
                                        fontWeight={activeLayer === 1 ? 'bold' : 'normal'}
                                    >
                                        LAPISAN 1: ANTI-DOBEL BAYAR
                                    </text>
                                </g>

                                {/* ======================================================== */}
                                {/* LAYER 2: CINCIN TENGAH (Radius 160px)                    */}
                                {/* ======================================================== */}
                                <g
                                    className="cursor-pointer transition-transform duration-300"
                                    onClick={() => setActiveLayer(2)}
                                    onMouseEnter={() => setActiveLayer(2)}
                                >
                                    {/* Ghost Hover Zone */}
                                    <circle cx="260" cy="260" r="160" fill="transparent" stroke="transparent" strokeWidth="32" />
                                    {/* Main Ring Track */}
                                    <circle
                                        cx="260"
                                        cy="260"
                                        r="160"
                                        fill="none"
                                        stroke={activeLayer === 2 ? LAYERS[2].accentColor.ringStroke : 'rgba(255,255,255,0.11)'}
                                        strokeWidth={activeLayer === 2 ? '4' : '1.5'}
                                        strokeDasharray={activeLayer === 2 ? 'none' : '3 5'}
                                        className="transition-all duration-500"
                                        filter={activeLayer === 2 ? 'url(#vault-glow)' : undefined}
                                    />
                                    {/* Orbiting Satellite Node */}
                                    {activeLayer === 2 && (
                                        <g className="animate-pulse">
                                            <circle cx="100" cy="260" r="7.5" fill="#10b981" filter="url(#vault-glow)" />
                                            <circle cx="100" cy="260" r="3.5" fill="#ffffff" />
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
                                        LAPISAN 2: ANTI-SALDO MINUS
                                    </text>
                                </g>

                                {/* ======================================================== */}
                                {/* LAYER 3: CINCIN INTI (Radius 95px)                       */}
                                {/* ======================================================== */}
                                <g
                                    className="cursor-pointer transition-transform duration-300"
                                    onClick={() => setActiveLayer(3)}
                                    onMouseEnter={() => setActiveLayer(3)}
                                >
                                    {/* Ghost Hover Zone */}
                                    <circle cx="260" cy="260" r="95" fill="transparent" stroke="transparent" strokeWidth="28" />
                                    {/* Main Ring Track */}
                                    <circle
                                        cx="260"
                                        cy="260"
                                        r="95"
                                        fill="none"
                                        stroke={activeLayer === 3 ? LAYERS[3].accentColor.ringStroke : 'rgba(255,255,255,0.14)'}
                                        strokeWidth={activeLayer === 3 ? '4' : '1.5'}
                                        className="transition-all duration-500"
                                        filter={activeLayer === 3 ? 'url(#vault-glow)' : undefined}
                                    />
                                    {/* Orbiting Satellite Node */}
                                    {activeLayer === 3 && (
                                        <g className="animate-pulse">
                                            <circle cx="260" cy="165" r="7" fill="#818cf8" filter="url(#vault-glow)" />
                                            <circle cx="260" cy="165" r="3.5" fill="#ffffff" />
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
                                        LAPISAN 3: CATATAN TERKUNCI
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
                                        stroke="rgba(255,255,255,0.18)"
                                        strokeWidth="2"
                                    />
                                    <circle
                                        cx="260"
                                        cy="260"
                                        r="42"
                                        fill="#0a0a0f"
                                        stroke="#2563eb"
                                        strokeWidth="1.5"
                                        strokeOpacity="0.5"
                                    />
                                </g>
                            </svg>

                            {/* Centered Pure Bastion Logo */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                <BastionLogo className="w-11 h-11 sm:w-14 sm:h-14 text-white drop-shadow-[0_0_35px_rgba(0,229,255,0.7)]" />
                            </div>
                        </div>

                        {/* Right Telemetry Badges (Desktop Only) */}
                        <div className="hidden lg:flex flex-col gap-3 absolute right-4 xl:right-8 top-1/2 -translate-y-1/2 text-left z-20">
                            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md space-y-1 max-w-[210px] shadow-lg">
                                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                                    <Activity className="w-3.5 h-3.5 shrink-0" />
                                    <span>Buku Kas Tersegel</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-tight">
                                    Setiap pergerakan dana dicatat pada double-entry ledger immutable.
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md space-y-1 max-w-[210px] shadow-lg">
                                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                                    <Shield className="w-3.5 h-3.5 shrink-0" />
                                    <span>Bank-Grade Isolation</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-tight">
                                    Tingkat isolasi SERIALIZABLE menjamin kebal race condition.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Active Layer Focus Banner (Real-Time Dynamic Summary) */}
                    <div className="inline-flex items-center gap-2 sm:gap-3 px-4 py-2 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-xs text-zinc-300 max-w-xl shadow-lg transition-all duration-300">
                        <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: activeData.accentColor.ringStroke }}
                        />
                        <span className="font-semibold text-white truncate">{activeData.name}:</span>
                        <span className="text-zinc-400 truncate hidden sm:inline">{activeData.title}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${activeData.accentColor.bg} ${activeData.accentColor.text}`}>
                            {activeData.status}
                        </span>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 2. UNIFIED 3-COLUMN INTERACTIVE PROTECTION DECK (BOTTOM)                  */}
                {/* ========================================================================= */}
                <div className="relative z-10 pt-8 sm:pt-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                        {([1, 2, 3] as LayerId[]).map((id) => {
                            const item = LAYERS[id];
                            const isSelected = activeLayer === id;

                            return (
                                <div
                                    key={id}
                                    onClick={() => setActiveLayer(id)}
                                    onMouseEnter={() => setActiveLayer(id)}
                                    className={`relative p-5 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between text-left cursor-pointer group select-none ${
                                        isSelected
                                            ? `bg-zinc-900/95 ${item.accentColor.activeBorder} shadow-[0_10px_30px_rgba(0,0,0,0.5)] scale-[1.02]`
                                            : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                                    }`}
                                >
                                    {/* Top Active Color Accent Line */}
                                    {isSelected && (
                                        <div
                                            className="absolute top-0 inset-x-0 h-1 rounded-t-2xl transition-all"
                                            style={{ backgroundColor: item.accentColor.ringStroke }}
                                        />
                                    )}

                                    <div className="space-y-4">
                                        {/* Card Top: Icon & Level Tag */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                                    isSelected
                                                        ? `${item.accentColor.bg} ${item.accentColor.text}`
                                                        : 'bg-zinc-900 text-zinc-400 group-hover:text-zinc-200'
                                                }`}
                                            >
                                                {id === 1 && <Zap className="w-5 h-5" />}
                                                {id === 2 && <Lock className="w-5 h-5" />}
                                                {id === 3 && <Fingerprint className="w-5 h-5" />}
                                            </div>

                                            <span
                                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                                                    isSelected
                                                        ? `${item.accentColor.bg} ${item.accentColor.text}`
                                                        : 'bg-zinc-900 text-zinc-500'
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                        </div>

                                        {/* Titles & Level */}
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                                                {item.level}
                                            </span>
                                            <h4
                                                className={`text-base sm:text-lg font-bold tracking-tight transition-colors ${
                                                    isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                                                }`}
                                            >
                                                {item.title}
                                            </h4>
                                        </div>

                                        {/* Business Description */}
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            {item.description}
                                        </p>

                                        {/* Real-World Case Scenario */}
                                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: item.accentColor.ringStroke }}
                                                />
                                                <span>Kasus Nyata di Lapangan:</span>
                                            </div>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                                {item.scenario}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Card Footer Metric */}
                                    <div className="pt-4 mt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                                        <span className="text-zinc-500 text-[11px]">{item.metricLabel}:</span>
                                        <span
                                            className={`font-mono font-bold text-[11px] ${item.accentColor.text}`}
                                        >
                                            {item.metricValue}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 3. BOTTOM TRUST & COMPLIANCE STRIP                                        */}
                {/* ========================================================================= */}
                <div className="relative z-10 pt-8 sm:pt-10 mt-8 border-t border-zinc-800/60">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 text-xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="truncate">Enkripsi AES-256 GCM</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 text-xs">
                            <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="truncate">Tingkat Isolasi SERIALIZABLE</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="truncate">Multi-Role RBAC & 2FA TOTP</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 text-xs">
                            <Fingerprint className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="truncate">Audit Log Immutable</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
