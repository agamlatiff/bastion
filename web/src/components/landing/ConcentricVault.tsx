import React, { useState } from 'react';
import {
    ShieldCheck,
    Lock,
    Fingerprint,
    CheckCircle2,
    Zap,
    Users,
    FileCheck,
    ChevronRight,
} from 'lucide-react';
import { BastionLogo } from '../common/BastionLogo';

type LayerId = 1 | 2 | 3;

interface LayerInfo {
    id: LayerId;
    name: string;
    shortTag: string;
    level: string;
    title: string;
    description: string;
    scenario: string;
    metricLabel: string;
    metricValue: string;
    status: string;
    rotationDeg: number;
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
        name: 'Lapisan 1: Kasir & Pembayaran',
        shortTag: 'Lapisan 1',
        level: 'Di Mesin Kasir & Pembayaran',
        title: 'Uang Tidak Pernah Terpotong Dua Kali',
        description:
            'Saat internet pelanggan lambat atau tombol bayar tertekan berkali-kali, sistem otomatis menyaring transaksi sehingga saldo hanya terpotong satu kali.',
        scenario: 'Kasir menekan tombol bayar 2x saat antrean ramai? Transaksi kedua otomatis ditahan.',
        metricLabel: 'Potongan Ganda',
        metricValue: '0x (Pasti Aman)',
        status: 'Siaga Otomatis',
        rotationDeg: 0,
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
        name: 'Lapisan 2: Rekening & Saldo Kas',
        shortTag: 'Lapisan 2',
        level: 'Saat Tarik & Transfer Uang',
        title: 'Saldo Kas Tidak Akan Pernah Minus',
        description:
            'Sebelum uang keluar, sistem selalu mencocokkan sisa saldo riil. Pengeluaran langsung dibatalkan jika dana tidak mencukupi, meski hanya kurang seribu rupiah.',
        scenario: 'Staf ingin bayar nota Rp 2.000.000 padahal kas cuma ada Rp 1.500.000? Pengeluaran langsung ditolak.',
        metricLabel: 'Akurasi Saldo',
        metricValue: '100% Sesuai Kas Riil',
        status: 'Siaga Otomatis',
        rotationDeg: 45,
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
        name: 'Lapisan 3: Riwayat & Buku Kas',
        shortTag: 'Lapisan 3',
        level: 'Di Laporan & Riwayat Pembukuan',
        title: 'Catatan Kas Tidak Bisa Diubah Diam-Diam',
        description:
            'Setiap mutasi uang masuk atau keluar langsung dikunci secara permanen. Tidak ada staf yang bisa mengubah angka, mengganti tanggal nota, atau menghapus riwayat transaksi.',
        scenario: 'Ada upaya menghapus riwayat pengeluaran kemarin sore? Catatan terkunci rapat dan sistem menolak perubahan.',
        metricLabel: 'Keaslian Data',
        metricValue: '100% Permanen & Asli',
        status: 'Terkunci Permanen',
        rotationDeg: 90,
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
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {/* Main Workbench Container */}
            <div className="relative rounded-[2.5rem] border border-white/10 bg-[#09090e] p-5 sm:p-8 lg:p-12 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.9)]">
                {/* Dynamic Ambient Background Glow */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[580px] lg:w-[680px] h-[380px] sm:h-[580px] lg:h-[680px] rounded-full blur-[120px] sm:blur-[150px] pointer-events-none transition-all duration-700 opacity-20"
                    style={{ backgroundColor: activeData.accentColor.ringStroke }}
                />

                {/* Header Context Pill */}
                <div className="relative z-10 flex flex-col items-center text-center mb-8 lg:mb-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-300 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Brankas Kas Usaha Bastion</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-emerald-400 font-semibold tracking-wide">
                            3 Proteksi Otomatis Siaga Penuh
                        </span>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* GRAND VAULT ARENA: VAULT AS THE HERO CENTERPIECE WITH HUD PODS            */}
                {/* ========================================================================= */}
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                    {/* LEFT FLANK: HUD POD 1 (LAPISAN 1) */}
                    <div className="hidden lg:flex lg:col-span-3 flex-col justify-center space-y-4">
                        <div
                            onClick={() => setActiveLayer(1)}
                            onMouseEnter={() => setActiveLayer(1)}
                            className={`p-5 rounded-2xl border transition-all duration-300 text-left cursor-pointer group relative select-none ${
                                activeLayer === 1
                                    ? `bg-zinc-900/95 ${LAYERS[1].accentColor.activeBorder} shadow-[0_10px_35px_rgba(56,189,248,0.15)] scale-[1.02]`
                                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                            }`}
                        >
                            {activeLayer === 1 && (
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                                    style={{ backgroundColor: LAYERS[1].accentColor.ringStroke }}
                                />
                            )}

                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                                        activeLayer === 1
                                            ? `${LAYERS[1].accentColor.bg} ${LAYERS[1].accentColor.text}`
                                            : 'bg-zinc-900 text-zinc-400'
                                    }`}
                                >
                                    <Zap className="w-4 h-4" />
                                </div>
                                <span
                                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                                        activeLayer === 1
                                            ? `${LAYERS[1].accentColor.bg} ${LAYERS[1].accentColor.text}`
                                            : 'bg-zinc-900 text-zinc-500'
                                    }`}
                                >
                                    {LAYERS[1].status}
                                </span>
                            </div>

                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                                {LAYERS[1].level}
                            </span>
                            <h4
                                className={`text-sm font-bold tracking-tight mb-2 transition-colors ${
                                    activeLayer === 1 ? 'text-white' : 'text-zinc-200'
                                }`}
                            >
                                {LAYERS[1].title}
                            </h4>
                            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                                {LAYERS[1].description}
                            </p>

                            <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-[11px] text-zinc-400 leading-tight space-y-0.5">
                                <span className="font-semibold text-zinc-300 block">Kasus Nyata:</span>
                                <span>{LAYERS[1].scenario}</span>
                            </div>

                            <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                                <span className="text-zinc-500">Hasil:</span>
                                <span className="font-mono font-bold text-sky-400">{LAYERS[1].metricValue}</span>
                            </div>
                        </div>

                        {/* Interactive Hint */}
                        <div className="text-[11px] text-zinc-500 text-center font-mono flex items-center justify-center gap-1">
                            <span>Arahkan kursor atau klik cincin</span>
                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                        </div>
                    </div>

                    {/* CENTERPIECE: THE GRAND VAULT DIAL (COL-SPAN 6) */}
                    <div className="lg:col-span-6 flex flex-col items-center justify-center">
                        <div className="relative w-full max-w-[320px] sm:max-w-[420px] lg:max-w-[500px] aspect-square mx-auto flex items-center justify-center select-none">
                            <svg viewBox="0 0 600 600" className="w-full h-full overflow-visible">
                                <defs>
                                    <filter id="vault-glow-intense" x="-30%" y="-30%" width="160%" height="160%">
                                        <feGaussianBlur stdDeviation="8" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                    <radialGradient id="vault-core-ambient" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.5" />
                                        <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.15" />
                                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                                    </radialGradient>
                                </defs>

                                {/* Ambient Core Light */}
                                <circle cx="300" cy="300" r="160" fill="url(#vault-core-ambient)" />

                                {/* Radar Grid Crosshairs */}
                                <line x1="300" y1="20" x2="300" y2="580" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 6" />
                                <line x1="20" y1="300" x2="580" y2="300" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 6" />

                                {/* ======================================================== */}
                                {/* ROTATING OUTER MECHANICAL VAULT DIAL (TICK MARKS & NOTCHES) */}
                                {/* ======================================================== */}
                                <g
                                    style={{
                                        transform: `rotate(${activeData.rotationDeg}deg)`,
                                        transformOrigin: '300px 300px',
                                        transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                                    }}
                                >
                                    {/* Outer Dial Caliper Ring */}
                                    <circle
                                        cx="300"
                                        cy="300"
                                        r="270"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.07)"
                                        strokeWidth="1.5"
                                    />
                                    <circle
                                        cx="300"
                                        cy="300"
                                        r="255"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.04)"
                                        strokeWidth="1"
                                        strokeDasharray="2 6"
                                    />

                                    {/* 72 Precision Vault Gauge Ticks */}
                                    {Array.from({ length: 72 }).map((_, i) => {
                                        const isMajor = i % 6 === 0;
                                        return (
                                            <line
                                                key={i}
                                                x1="300"
                                                y1={isMajor ? '28' : '36'}
                                                x2="300"
                                                y2="45"
                                                stroke={isMajor ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}
                                                strokeWidth={isMajor ? '2' : '1'}
                                                transform={`rotate(${i * 5} 300 300)`}
                                            />
                                        );
                                    })}

                                    {/* Rotating Dial Anchor Indicators */}
                                    <circle cx="300" cy="40" r="4" fill="#38bdf8" />
                                    <circle cx="560" cy="300" r="4" fill="#10b981" />
                                    <circle cx="300" cy="560" r="4" fill="#818cf8" />
                                    <circle cx="40" cy="300" r="4" fill="#ffffff" opacity="0.3" />
                                </g>

                                {/* ======================================================== */}
                                {/* LAYER 1: OUTER RING TRACK (Radius 225) - ANTI-DOBEL      */}
                                {/* ======================================================== */}
                                <g
                                    className="cursor-pointer"
                                    onClick={() => setActiveLayer(1)}
                                    onMouseEnter={() => setActiveLayer(1)}
                                >
                                    <circle cx="300" cy="300" r="225" fill="transparent" stroke="transparent" strokeWidth="40" />
                                    <circle
                                        cx="300"
                                        cy="300"
                                        r="225"
                                        fill="none"
                                        stroke={activeLayer === 1 ? LAYERS[1].accentColor.ringStroke : 'rgba(255,255,255,0.08)'}
                                        strokeWidth={activeLayer === 1 ? '4' : '1.5'}
                                        strokeDasharray={activeLayer === 1 ? 'none' : '4 6'}
                                        className="transition-all duration-500"
                                        filter={activeLayer === 1 ? 'url(#vault-glow-intense)' : undefined}
                                    />
                                    {activeLayer === 1 && (
                                        <g className="animate-pulse">
                                            <circle cx="300" cy="75" r="8" fill="#38bdf8" filter="url(#vault-glow-intense)" />
                                            <circle cx="300" cy="75" r="3.5" fill="#ffffff" />
                                        </g>
                                    )}
                                    <text
                                        x="300"
                                        y="62"
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
                                {/* LAYER 2: MIDDLE RING TRACK (Radius 165) - ANTI-MINUS     */}
                                {/* ======================================================== */}
                                <g
                                    className="cursor-pointer"
                                    onClick={() => setActiveLayer(2)}
                                    onMouseEnter={() => setActiveLayer(2)}
                                >
                                    <circle cx="300" cy="300" r="165" fill="transparent" stroke="transparent" strokeWidth="36" />
                                    <circle
                                        cx="300"
                                        cy="300"
                                        r="165"
                                        fill="none"
                                        stroke={activeLayer === 2 ? LAYERS[2].accentColor.ringStroke : 'rgba(255,255,255,0.1)'}
                                        strokeWidth={activeLayer === 2 ? '4.5' : '1.5'}
                                        strokeDasharray={activeLayer === 2 ? 'none' : '3 5'}
                                        className="transition-all duration-500"
                                        filter={activeLayer === 2 ? 'url(#vault-glow-intense)' : undefined}
                                    />
                                    {activeLayer === 2 && (
                                        <g className="animate-pulse">
                                            <circle cx="135" cy="300" r="8" fill="#10b981" filter="url(#vault-glow-intense)" />
                                            <circle cx="135" cy="300" r="3.5" fill="#ffffff" />
                                        </g>
                                    )}
                                    <text
                                        x="300"
                                        y="130"
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
                                {/* LAYER 3: INNER RING TRACK (Radius 105) - BUKU KAS        */}
                                {/* ======================================================== */}
                                <g
                                    className="cursor-pointer"
                                    onClick={() => setActiveLayer(3)}
                                    onMouseEnter={() => setActiveLayer(3)}
                                >
                                    <circle cx="300" cy="300" r="105" fill="transparent" stroke="transparent" strokeWidth="30" />
                                    <circle
                                        cx="300"
                                        cy="300"
                                        r="105"
                                        fill="none"
                                        stroke={activeLayer === 3 ? LAYERS[3].accentColor.ringStroke : 'rgba(255,255,255,0.12)'}
                                        strokeWidth={activeLayer === 3 ? '4.5' : '1.5'}
                                        className="transition-all duration-500"
                                        filter={activeLayer === 3 ? 'url(#vault-glow-intense)' : undefined}
                                    />
                                    {activeLayer === 3 && (
                                        <g className="animate-pulse">
                                            <circle cx="300" cy="195" r="7.5" fill="#818cf8" filter="url(#vault-glow-intense)" />
                                            <circle cx="300" cy="195" r="3.5" fill="#ffffff" />
                                        </g>
                                    )}
                                    <text
                                        x="300"
                                        y="185"
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
                                {/* CENTER NUCLEUS: HEAVY TITANIUM HUB & BASTION EMBLEM      */}
                                {/* ======================================================== */}
                                <g>
                                    <circle
                                        cx="300"
                                        cy="300"
                                        r="56"
                                        fill="#0e0e14"
                                        stroke="rgba(255,255,255,0.18)"
                                        strokeWidth="2.5"
                                    />
                                    <circle
                                        cx="300"
                                        cy="300"
                                        r="50"
                                        fill="#07070b"
                                        stroke="#2563eb"
                                        strokeWidth="1.5"
                                        strokeOpacity="0.5"
                                    />
                                </g>
                            </svg>

                            {/* Centered Pure Bastion Logo */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                <BastionLogo className="w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-[0_0_40px_rgba(0,229,255,0.75)]" />
                            </div>
                        </div>

                        {/* Dial Status Pill */}
                        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-950/90 border border-zinc-800 text-xs text-zinc-300 shadow-md">
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: activeData.accentColor.ringStroke }}
                            />
                            <span className="font-semibold text-white">{activeData.name}</span>
                            <span className="text-zinc-600">•</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeData.accentColor.bg} ${activeData.accentColor.text}`}>
                                {activeData.status}
                            </span>
                        </div>
                    </div>

                    {/* RIGHT FLANK: HUD PODS 2 & 3 (DESKTOP ONLY) */}
                    <div className="hidden lg:flex lg:col-span-3 flex-col justify-center space-y-4">
                        {/* POD 2: ANTI-SALDO MINUS */}
                        <div
                            onClick={() => setActiveLayer(2)}
                            onMouseEnter={() => setActiveLayer(2)}
                            className={`p-4 rounded-2xl border transition-all duration-300 text-left cursor-pointer group relative select-none ${
                                activeLayer === 2
                                    ? `bg-zinc-900/95 ${LAYERS[2].accentColor.activeBorder} shadow-[0_10px_35px_rgba(16,185,129,0.15)] scale-[1.02]`
                                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                            }`}
                        >
                            {activeLayer === 2 && (
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                                    style={{ backgroundColor: LAYERS[2].accentColor.ringStroke }}
                                />
                            )}

                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                        activeLayer === 2
                                            ? `${LAYERS[2].accentColor.bg} ${LAYERS[2].accentColor.text}`
                                            : 'bg-zinc-900 text-zinc-400'
                                    }`}
                                >
                                    <Lock className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-emerald-400">
                                    {LAYERS[2].shortTag}
                                </span>
                            </div>
                            <h4
                                className={`text-xs font-bold tracking-tight mb-1 transition-colors ${
                                    activeLayer === 2 ? 'text-white' : 'text-zinc-200'
                                }`}
                            >
                                {LAYERS[2].title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 leading-tight mb-2">
                                {LAYERS[2].description}
                            </p>
                            <div className="text-[10px] text-zinc-500 flex items-center justify-between border-t border-zinc-800/60 pt-2">
                                <span>Jaminan:</span>
                                <span className="font-mono font-bold text-emerald-400">{LAYERS[2].metricValue}</span>
                            </div>
                        </div>

                        {/* POD 3: BUKU KAS TERKUNCI */}
                        <div
                            onClick={() => setActiveLayer(3)}
                            onMouseEnter={() => setActiveLayer(3)}
                            className={`p-4 rounded-2xl border transition-all duration-300 text-left cursor-pointer group relative select-none ${
                                activeLayer === 3
                                    ? `bg-zinc-900/95 ${LAYERS[3].accentColor.activeBorder} shadow-[0_10px_35px_rgba(129,140,248,0.15)] scale-[1.02]`
                                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                            }`}
                        >
                            {activeLayer === 3 && (
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                                    style={{ backgroundColor: LAYERS[3].accentColor.ringStroke }}
                                />
                            )}

                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                        activeLayer === 3
                                            ? `${LAYERS[3].accentColor.bg} ${LAYERS[3].accentColor.text}`
                                            : 'bg-zinc-900 text-zinc-400'
                                    }`}
                                >
                                    <Fingerprint className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-indigo-400">
                                    {LAYERS[3].shortTag}
                                </span>
                            </div>
                            <h4
                                className={`text-xs font-bold tracking-tight mb-1 transition-colors ${
                                    activeLayer === 3 ? 'text-white' : 'text-zinc-200'
                                }`}
                            >
                                {LAYERS[3].title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 leading-tight mb-2">
                                {LAYERS[3].description}
                            </p>
                            <div className="text-[10px] text-zinc-500 flex items-center justify-between border-t border-zinc-800/60 pt-2">
                                <span>Jaminan:</span>
                                <span className="font-mono font-bold text-indigo-400">{LAYERS[3].metricValue}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* MOBILE / TABLET POD VIEW (SHOWN ONLY ON SCREENS < LG)                     */}
                {/* ========================================================================= */}
                <div className="lg:hidden mt-8 space-y-4">
                    {/* Layer Selector Buttons */}
                    <div className="flex gap-2">
                        {([1, 2, 3] as LayerId[]).map((id) => {
                            const item = LAYERS[id];
                            const isSelected = activeLayer === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveLayer(id)}
                                    className={`flex-1 py-2.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                        isSelected
                                            ? `bg-zinc-900 text-white ${item.accentColor.activeBorder} shadow-lg`
                                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                                    }`}
                                >
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: item.accentColor.ringStroke }}
                                    />
                                    <span>{item.shortTag}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Layer Details Card */}
                    <div className="p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-left space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{activeData.level}</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeData.accentColor.bg} ${activeData.accentColor.text}`}>
                                {activeData.status}
                            </span>
                        </div>
                        <h4 className="text-base font-bold text-white">{activeData.title}</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">{activeData.description}</p>
                        <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                            <span className="font-semibold text-white block mb-0.5">Kasus Lapangan:</span>
                            <span>{activeData.scenario}</span>
                        </div>
                        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">{activeData.metricLabel}:</span>
                            <span className={`font-mono font-bold ${activeData.accentColor.text}`}>
                                {activeData.metricValue}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* BOTTOM COMPLIANCE & STANDARD BAR                                          */}
                {/* ========================================================================= */}
                <div className="relative z-10 pt-8 sm:pt-10 mt-8 border-t border-zinc-800/60">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 text-xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="truncate">Enkripsi Standar Perbankan</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 text-xs">
                            <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="truncate">Pembukuan Bebas Selisih</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="truncate">Izin Akses Staf & 2FA</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 text-xs">
                            <FileCheck className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="truncate">Riwayat Transaksi Permanen</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
