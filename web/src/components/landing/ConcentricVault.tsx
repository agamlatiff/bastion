import React, { useState } from 'react';
import { BastionLogo } from '../common/BastionLogo';

type LayerId = 1 | 2 | 3;

interface LayerInfo {
    id: LayerId;
    name: string;
    shortTag: string;
    numberTag: string;
    location: string;
    title: string;
    description: string;
    guarantee: string;
    rotationDeg: number;
    accentColor: {
        glow: string;
        border: string;
        text: string;
        bg: string;
        ringStroke: string;
        arrowGlow: string;
    };
}

const LAYERS: Record<LayerId, LayerInfo> = {
    1: {
        id: 1,
        name: 'Lapisan 1: Kasir & Pembayaran',
        shortTag: 'Lapisan 1',
        numberTag: '01',
        location: 'Di Mesin Kasir & Pembayaran',
        title: 'Uang Tidak Pernah Terpotong Dua Kali',
        description:
            'Jika tombol kasir tertekan berkali-kali saat antrean ramai atau internet lambat, sistem otomatis menyaring transaksi sehingga uang hanya keluar satu kali.',
        guarantee: '0 Potongan Ganda',
        rotationDeg: 0,
        accentColor: {
            glow: 'rgba(56, 189, 248, 0.35)',
            border: 'border-sky-500/30',
            text: 'text-sky-400',
            bg: 'bg-sky-500/10',
            ringStroke: '#38bdf8',
            arrowGlow: 'rgba(56, 189, 248, 0.9)',
        },
    },
    2: {
        id: 2,
        name: 'Lapisan 2: Rekening & Saldo Kas',
        shortTag: 'Lapisan 2',
        numberTag: '02',
        location: 'Saat Tarik & Bayar Tagihan',
        title: 'Saldo Kas Tidak Pernah Minus',
        description:
            'Sistem selalu mencocokkan sisa uang riil sebelum pengeluaran keluar. Transaksi otomatis dibatalkan jika saldo kas kurang, meski hanya selisih seribu rupiah.',
        guarantee: '100% Saldo Riil Pas',
        rotationDeg: 45,
        accentColor: {
            glow: 'rgba(16, 185, 129, 0.35)',
            border: 'border-emerald-500/30',
            text: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            ringStroke: '#10b981',
            arrowGlow: 'rgba(16, 185, 129, 0.9)',
        },
    },
    3: {
        id: 3,
        name: 'Lapisan 3: Riwayat & Buku Kas',
        shortTag: 'Lapisan 3',
        numberTag: '03',
        location: 'Di Laporan & Riwayat Pembukuan',
        title: 'Catatan Transaksi Terkunci Rapat',
        description:
            'Setiap mutasi uang masuk atau keluar disegel permanen. Tidak ada staf yang bisa mengedit angka nota, memajukan tanggal, atau menghapus riwayat transaksi kemarin.',
        guarantee: 'Terkunci & Tidak Bisa Diedit',
        rotationDeg: 90,
        accentColor: {
            glow: 'rgba(129, 140, 248, 0.35)',
            border: 'border-indigo-500/30',
            text: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            ringStroke: '#818cf8',
            arrowGlow: 'rgba(129, 140, 248, 0.9)',
        },
    },
};

export const ConcentricVault: React.FC = () => {
    const [activeLayer, setActiveLayer] = useState<LayerId>(2);
    const activeData = LAYERS[activeLayer];

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-8 lg:space-y-12 select-none">
            {/* ========================================================================= */}
            {/* FULL-WIDTH SCHEMATIC STAGE: CALLOUTS WITH ANGLED ARROWS TO VAULT          */}
            {/* ========================================================================= */}
            <div className="relative grid grid-cols-12 gap-2 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-12 items-center">
                {/* Dynamic Ambient Background Aura */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] md:w-[650px] lg:w-[800px] h-[320px] sm:h-[500px] md:h-[650px] lg:h-[800px] rounded-full blur-[160px] pointer-events-none transition-all duration-700 opacity-20"
                    style={{ backgroundColor: activeData.accentColor.ringStroke }}
                />

                {/* ===================================================================== */}
                {/* LEFT FLANK: SCHEMATIC CALLOUT (LAPISAN 1)                             */}
                {/* ===================================================================== */}
                <div className="col-span-3 flex flex-col justify-center items-end text-right z-10">
                    <div
                        onClick={() => setActiveLayer(1)}
                        onMouseEnter={() => setActiveLayer(1)}
                        className={`group cursor-pointer transition-all duration-300 space-y-1.5 xs:space-y-2 sm:space-y-3 lg:space-y-3.5 max-w-sm ${
                            activeLayer === 1
                                ? 'opacity-100 scale-[1.02]'
                                : 'opacity-55 hover:opacity-90'
                        }`}
                    >
                        {/* Number & Location Badge */}
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                            <span className="text-[7.5px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-mono text-zinc-500 uppercase tracking-wider line-clamp-1">
                                {LAYERS[1].location}
                            </span>
                            <span
                                className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] xs:text-[9px] sm:text-xs font-mono font-bold transition-all shrink-0 ${
                                    activeLayer === 1
                                        ? `${LAYERS[1].accentColor.bg} ${LAYERS[1].accentColor.text} border border-sky-500/40 shadow-sm`
                                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                                }`}
                            >
                                {LAYERS[1].numberTag}
                            </span>
                        </div>

                        {/* Heading Title */}
                        <h3
                            className={`text-[11px] xs:text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight transition-colors leading-tight sm:leading-snug ${
                                activeLayer === 1 ? 'text-white' : 'text-zinc-300'
                            }`}
                        >
                            {LAYERS[1].title}
                        </h3>

                        {/* Punchy Plain-Human Description */}
                        <p className="text-[8px] xs:text-[9px] sm:text-xs md:text-xs lg:text-sm text-zinc-400 leading-tight sm:leading-relaxed">
                            {LAYERS[1].description}
                        </p>

                        {/* Guarantee Metric Tag */}
                        <div className="pt-0.5 sm:pt-1 flex items-center justify-end gap-1 sm:gap-2 text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs">
                            <span className="text-zinc-500">Jaminan:</span>
                            <span className="font-mono font-bold text-sky-400">
                                {LAYERS[1].guarantee}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ===================================================================== */}
                {/* CENTERPIECE: THE GRAND VAULT DIAL WITH ANGLED ARROWS (COL-SPAN 6)     */}
                {/* ===================================================================== */}
                <div className="col-span-6 flex flex-col items-center justify-center z-10">
                    <div className="relative w-full aspect-square mx-auto flex items-center justify-center select-none">
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

                                {/* Precision Architectural Arrowhead Markers */}
                                <marker
                                    id="arrowhead-sky"
                                    viewBox="0 0 10 10"
                                    refX="7"
                                    refY="5"
                                    markerWidth="7"
                                    markerHeight="7"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#38bdf8" />
                                </marker>
                                <marker
                                    id="arrowhead-emerald"
                                    viewBox="0 0 10 10"
                                    refX="7"
                                    refY="5"
                                    markerWidth="7"
                                    markerHeight="7"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#10b981" />
                                </marker>
                                <marker
                                    id="arrowhead-indigo"
                                    viewBox="0 0 10 10"
                                    refX="7"
                                    refY="5"
                                    markerWidth="7"
                                    markerHeight="7"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#818cf8" />
                                </marker>
                                <marker
                                    id="arrowhead-muted"
                                    viewBox="0 0 10 10"
                                    refX="7"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#71717a" opacity="0.6" />
                                </marker>
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
                                <circle cx="300" cy="300" r="225" fill="transparent" stroke="transparent" strokeWidth="44" />
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
                                <circle cx="300" cy="300" r="165" fill="transparent" stroke="transparent" strokeWidth="38" />
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
                                <circle cx="300" cy="300" r="105" fill="transparent" stroke="transparent" strokeWidth="34" />
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

                            {/* ======================================================== */}
                            {/* DIAGONAL ANGLED SCHEMATIC ARROWS (MIRING KE SETIAP RING) */}
                            {/* ======================================================== */}
                            <g className="block">
                                {/* ARROW 1: Dari Kiri membelok miring ke Cincin Luar (R=225) */}
                                <g
                                    className="cursor-pointer"
                                    onClick={() => setActiveLayer(1)}
                                    onMouseEnter={() => setActiveLayer(1)}
                                >
                                    <path
                                        d="M -60 135 L 20 135 L 98 181"
                                        fill="none"
                                        stroke={activeLayer === 1 ? '#38bdf8' : 'rgba(255,255,255,0.18)'}
                                        strokeWidth={activeLayer === 1 ? '2.5' : '1.2'}
                                        strokeDasharray={activeLayer === 1 ? 'none' : '4 4'}
                                        markerEnd={activeLayer === 1 ? 'url(#arrowhead-sky)' : 'url(#arrowhead-muted)'}
                                        className="transition-all duration-300"
                                        filter={activeLayer === 1 ? 'url(#vault-glow-intense)' : undefined}
                                    />
                                    {/* Target Node di Perimeter Cincin 1 */}
                                    <circle
                                        cx="105"
                                        cy="187"
                                        r={activeLayer === 1 ? '5' : '3'}
                                        fill={activeLayer === 1 ? '#38bdf8' : '#71717a'}
                                        className="transition-all duration-300"
                                    />
                                    {activeLayer === 1 && (
                                        <circle
                                            cx="105"
                                            cy="187"
                                            r="10"
                                            fill="none"
                                            stroke="#38bdf8"
                                            strokeWidth="1.5"
                                            className="animate-ping"
                                            opacity="0.6"
                                        />
                                    )}
                                </g>

                                {/* ARROW 2: Dari Kanan Atas membelok miring ke Cincin Tengah (R=165) */}
                                <g
                                    className="cursor-pointer"
                                    onClick={() => setActiveLayer(2)}
                                    onMouseEnter={() => setActiveLayer(2)}
                                >
                                    <path
                                        d="M 660 145 L 560 145 L 450 212"
                                        fill="none"
                                        stroke={activeLayer === 2 ? '#10b981' : 'rgba(255,255,255,0.18)'}
                                        strokeWidth={activeLayer === 2 ? '2.5' : '1.2'}
                                        strokeDasharray={activeLayer === 2 ? 'none' : '4 4'}
                                        markerEnd={activeLayer === 2 ? 'url(#arrowhead-emerald)' : 'url(#arrowhead-muted)'}
                                        className="transition-all duration-300"
                                        filter={activeLayer === 2 ? 'url(#vault-glow-intense)' : undefined}
                                    />
                                    {/* Target Node di Perimeter Cincin 2 */}
                                    <circle
                                        cx="443"
                                        cy="217"
                                        r={activeLayer === 2 ? '5' : '3'}
                                        fill={activeLayer === 2 ? '#10b981' : '#71717a'}
                                        className="transition-all duration-300"
                                    />
                                    {activeLayer === 2 && (
                                        <circle
                                            cx="443"
                                            cy="217"
                                            r="10"
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="1.5"
                                            className="animate-ping"
                                            opacity="0.6"
                                        />
                                    )}
                                </g>

                                {/* ARROW 3: Dari Kanan Bawah membelok miring ke Cincin Inti (R=105) */}
                                <g
                                    className="cursor-pointer"
                                    onClick={() => setActiveLayer(3)}
                                    onMouseEnter={() => setActiveLayer(3)}
                                >
                                    <path
                                        d="M 660 475 L 540 475 L 394 366"
                                        fill="none"
                                        stroke={activeLayer === 3 ? '#818cf8' : 'rgba(255,255,255,0.18)'}
                                        strokeWidth={activeLayer === 3 ? '2.5' : '1.2'}
                                        strokeDasharray={activeLayer === 3 ? 'none' : '4 4'}
                                        markerEnd={activeLayer === 3 ? 'url(#arrowhead-indigo)' : 'url(#arrowhead-muted)'}
                                        className="transition-all duration-300"
                                        filter={activeLayer === 3 ? 'url(#vault-glow-intense)' : undefined}
                                    />
                                    {/* Target Node di Perimeter Cincin 3 */}
                                    <circle
                                        cx="386"
                                        cy="360"
                                        r={activeLayer === 3 ? '5' : '3'}
                                        fill={activeLayer === 3 ? '#818cf8' : '#71717a'}
                                        className="transition-all duration-300"
                                    />
                                    {activeLayer === 3 && (
                                        <circle
                                            cx="386"
                                            cy="360"
                                            r="10"
                                            fill="none"
                                            stroke="#818cf8"
                                            strokeWidth="1.5"
                                            className="animate-ping"
                                            opacity="0.6"
                                        />
                                    )}
                                </g>
                            </g>
                        </svg>

                        {/* Centered Pure Bastion Logo */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                            <BastionLogo className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-white drop-shadow-[0_0_40px_rgba(0,229,255,0.75)]" />
                        </div>
                    </div>
                </div>

                {/* ===================================================================== */}
                {/* RIGHT FLANK: SCHEMATIC CALLOUTS (LAPISAN 2 & 3)                       */}
                {/* ===================================================================== */}
                <div className="col-span-3 flex flex-col justify-center items-start text-left z-10 space-y-3 sm:space-y-6 lg:space-y-10">
                    {/* CALLOUT 2: ANTI-MINUS */}
                    <div
                        onClick={() => setActiveLayer(2)}
                        onMouseEnter={() => setActiveLayer(2)}
                        className={`group cursor-pointer transition-all duration-300 space-y-1.5 sm:space-y-2.5 lg:space-y-3 max-w-sm ${
                            activeLayer === 2
                                ? 'opacity-100 scale-[1.02]'
                                : 'opacity-55 hover:opacity-90'
                        }`}
                    >
                        {/* Number & Location Badge */}
                        <div className="flex items-center justify-start gap-1.5 sm:gap-2">
                            <span
                                className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] xs:text-[9px] sm:text-xs font-mono font-bold transition-all shrink-0 ${
                                    activeLayer === 2
                                        ? `${LAYERS[2].accentColor.bg} ${LAYERS[2].accentColor.text} border border-emerald-500/40 shadow-sm`
                                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                                }`}
                            >
                                {LAYERS[2].numberTag}
                            </span>
                            <span className="text-[7.5px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-mono text-zinc-500 uppercase tracking-wider line-clamp-1">
                                {LAYERS[2].location}
                            </span>
                        </div>

                        {/* Heading Title */}
                        <h3
                            className={`text-[11px] xs:text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight transition-colors leading-tight sm:leading-snug ${
                                activeLayer === 2 ? 'text-white' : 'text-zinc-300'
                            }`}
                        >
                            {LAYERS[2].title}
                        </h3>

                        {/* Punchy Plain-Human Description */}
                        <p className="text-[8px] xs:text-[9px] sm:text-xs md:text-xs lg:text-sm text-zinc-400 leading-tight sm:leading-relaxed">
                            {LAYERS[2].description}
                        </p>

                        {/* Guarantee Metric Tag */}
                        <div className="pt-0.5 sm:pt-1 flex items-center justify-start gap-1 sm:gap-2 text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs">
                            <span className="text-zinc-500">Jaminan:</span>
                            <span className="font-mono font-bold text-emerald-400">
                                {LAYERS[2].guarantee}
                            </span>
                        </div>
                    </div>

                    {/* CALLOUT 3: BUKU KAS */}
                    <div
                        onClick={() => setActiveLayer(3)}
                        onMouseEnter={() => setActiveLayer(3)}
                        className={`group cursor-pointer transition-all duration-300 space-y-1.5 sm:space-y-2.5 lg:space-y-3 max-w-sm pt-2.5 sm:pt-4 lg:pt-8 border-t border-zinc-800/40 ${
                            activeLayer === 3
                                ? 'opacity-100 scale-[1.02]'
                                : 'opacity-55 hover:opacity-90'
                        }`}
                    >
                        {/* Number & Location Badge */}
                        <div className="flex items-center justify-start gap-1.5 sm:gap-2">
                            <span
                                className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] xs:text-[9px] sm:text-xs font-mono font-bold transition-all shrink-0 ${
                                    activeLayer === 3
                                        ? `${LAYERS[3].accentColor.bg} ${LAYERS[3].accentColor.text} border border-indigo-500/40 shadow-sm`
                                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                                }`}
                            >
                                {LAYERS[3].numberTag}
                            </span>
                            <span className="text-[7.5px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-mono text-zinc-500 uppercase tracking-wider line-clamp-1">
                                {LAYERS[3].location}
                            </span>
                        </div>

                        {/* Heading Title */}
                        <h3
                            className={`text-[11px] xs:text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight transition-colors leading-tight sm:leading-snug ${
                                activeLayer === 3 ? 'text-white' : 'text-zinc-300'
                            }`}
                        >
                            {LAYERS[3].title}
                        </h3>

                        {/* Punchy Plain-Human Description */}
                        <p className="text-[8px] xs:text-[9px] sm:text-xs md:text-xs lg:text-sm text-zinc-400 leading-tight sm:leading-relaxed">
                            {LAYERS[3].description}
                        </p>

                        {/* Guarantee Metric Tag */}
                        <div className="pt-0.5 sm:pt-1 flex items-center justify-start gap-1 sm:gap-2 text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs">
                            <span className="text-zinc-500">Jaminan:</span>
                            <span className="font-mono font-bold text-indigo-400">
                                {LAYERS[3].guarantee}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
