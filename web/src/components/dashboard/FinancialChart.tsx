import React, { useState, useMemo, useRef } from 'react';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

interface DataPoint {
    date: string;
    label: string;
    amount: number;
}

interface FinancialChartProps {
    currentBalance: number;
    currency?: string;
}

type Timeframe = '7H' | '30H' | '90H' | '1T';

export const FinancialChart: React.FC<FinancialChartProps> = ({
    currentBalance,
    currency = 'IDR',
}) => {
    const [timeframe, setTimeframe] = useState<Timeframe>('30H');
    const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);

    // Mock realistic progression calibrated to actual current balance
    const chartData = useMemo(() => {
        const base = currentBalance > 0 ? currentBalance : 24500000;

        if (timeframe === '7H') {
            return [
                { date: '2 Mar', label: 'Senin, 2 Maret', amount: Math.round(base * 0.88) },
                { date: '3 Mar', label: 'Selasa, 3 Maret', amount: Math.round(base * 0.90) },
                { date: '4 Mar', label: 'Rabu, 4 Maret', amount: Math.round(base * 0.89) },
                { date: '5 Mar', label: 'Kamis, 5 Maret', amount: Math.round(base * 0.94) },
                { date: '6 Mar', label: 'Jumat, 6 Maret', amount: Math.round(base * 0.96) },
                { date: '7 Mar', label: 'Sabtu, 7 Maret', amount: Math.round(base * 0.98) },
                { date: 'Hari ini', label: 'Hari Ini (Terkini)', amount: base },
            ];
        }

        if (timeframe === '30H') {
            return [
                { date: '8 Feb', label: '8 Februari', amount: Math.round(base * 0.72) },
                { date: '12 Feb', label: '12 Februari', amount: Math.round(base * 0.75) },
                { date: '16 Feb', label: '16 Februari', amount: Math.round(base * 0.74) },
                { date: '20 Feb', label: '20 Februari', amount: Math.round(base * 0.82) },
                { date: '24 Feb', label: '24 Februari', amount: Math.round(base * 0.86) },
                { date: '28 Feb', label: '28 Februari', amount: Math.round(base * 0.91) },
                { date: '4 Mar', label: '4 Maret', amount: Math.round(base * 0.95) },
                { date: 'Hari ini', label: 'Hari Ini (Terkini)', amount: base },
            ];
        }

        if (timeframe === '90H') {
            return [
                { date: 'Des', label: '15 Desember', amount: Math.round(base * 0.55) },
                { date: 'Jan', label: '15 Januari', amount: Math.round(base * 0.68) },
                { date: 'Feb', label: '15 Februari', amount: Math.round(base * 0.84) },
                { date: 'Hari ini', label: 'Hari Ini', amount: base },
            ];
        }

        // 1T
        return [
            { date: 'Q1', label: 'Kuartal 1', amount: Math.round(base * 0.35) },
            { date: 'Q2', label: 'Kuartal 2', amount: Math.round(base * 0.52) },
            { date: 'Q3', label: 'Kuartal 3', amount: Math.round(base * 0.78) },
            { date: 'Q4', label: 'Kuartal 4', amount: base },
        ];
    }, [currentBalance, timeframe]);

    const activeAmount = hoveredPoint ? hoveredPoint.amount : (currentBalance > 0 ? currentBalance : 24500000);
    const firstAmount = chartData[0].amount;
    const diffAmount = activeAmount - firstAmount;
    const percentChange = firstAmount > 0 ? ((diffAmount / firstAmount) * 100).toFixed(1) : '0.0';
    const isPositive = diffAmount >= 0;

    // SVG coordinate space
    const width = 800;
    const height = 240;
    const paddingX = 20;
    const paddingTop = 25;
    const paddingBottom = 35;

    const amounts = chartData.map((d) => d.amount);
    const minVal = Math.min(...amounts) * 0.95;
    const maxVal = Math.max(...amounts) * 1.05;
    const valRange = maxVal - minVal || 1;

    const points = chartData.map((d, index) => {
        const x = paddingX + (index / (chartData.length - 1)) * (width - paddingX * 2);
        const y = height - paddingBottom - ((d.amount - minVal) / valRange) * (height - paddingTop - paddingBottom);
        return { x, y, data: d };
    });

    // Create silky smooth cubic bezier curve
    const pathD = useMemo(() => {
        if (points.length === 0) return '';
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cpX = (p0.x + p1.x) / 2;
            d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
        }
        return d;
    }, [points]);

    // Area path for gradient background
    const areaD = useMemo(() => {
        if (points.length === 0) return '';
        const lastX = points[points.length - 1].x;
        const firstX = points[0].x;
        const bottomY = height - paddingBottom + 5;
        return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }, [pathD, points, height, paddingBottom]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * width;

        // Find closest point
        let closest = points[0];
        let minDist = Math.abs(mouseX - closest.x);
        for (let i = 1; i < points.length; i++) {
            const dist = Math.abs(mouseX - points[i].x);
            if (dist < minDist) {
                minDist = dist;
                closest = points[i];
            }
        }
        setHoveredPoint(closest.data);
    };

    const handleMouseLeave = () => {
        setHoveredPoint(null);
    };

    const activePointCoord = useMemo(() => {
        if (!hoveredPoint) return null;
        return points.find((p) => p.data.label === hoveredPoint.label) || null;
    }, [hoveredPoint, points]);

    return (
        <div className="rounded-2xl border border-zinc-800 bg-[#111114] p-6 shadow-xl space-y-6 text-left">
            {/* Chart Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            {hoveredPoint ? hoveredPoint.label : 'Tren Saldo Keuangan'}
                        </span>
                        <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                                isPositive
                                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                    : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                            }`}
                        >
                            <TrendingUp className="w-3 h-3" />
                            <span>{isPositive ? `+${percentChange}%` : `${percentChange}%`}</span>
                        </div>
                    </div>

                    <div className="text-3xl font-bold font-mono tracking-tight text-white flex items-baseline gap-2">
                        <span>{formatCurrency(activeAmount, currency)}</span>
                        {hoveredPoint && (
                            <span className="text-xs font-sans text-zinc-500 font-normal">
                                (Posisi pada {hoveredPoint.date})
                            </span>
                        )}
                    </div>
                </div>

                {/* Timeframe Selector Pills */}
                <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-lg border border-zinc-800 self-start sm:self-auto">
                    {(['7H', '30H', '90H', '1T'] as Timeframe[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => {
                                setTimeframe(tf);
                                setHoveredPoint(null);
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                                timeframe === tf
                                    ? 'bg-zinc-800 text-white shadow-xs'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="relative w-full h-48 sm:h-56 select-none">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full cursor-crosshair overflow-visible"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <defs>
                        {/* Smooth Area Gradient */}
                        <linearGradient id="fintech-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                            <stop offset="85%" stopColor="#10b981" stopOpacity="0.02" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>

                        {/* Subtle Grid Pattern */}
                        <linearGradient id="stroke-gradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal Reference Gridlines */}
                    <line
                        x1={paddingX}
                        y1={paddingTop + 20}
                        x2={width - paddingX}
                        y2={paddingTop + 20}
                        stroke="#27272a"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                    />
                    <line
                        x1={paddingX}
                        y1={height / 2}
                        x2={width - paddingX}
                        y2={height / 2}
                        stroke="#27272a"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                    />
                    <line
                        x1={paddingX}
                        y1={height - paddingBottom}
                        x2={width - paddingX}
                        y2={height - paddingBottom}
                        stroke="#27272a"
                        strokeWidth="1"
                    />

                    {/* Gradient Area Fill */}
                    <path d={areaD} fill="url(#fintech-gradient)" />

                    {/* Smooth Bezier Vector Curve */}
                    <path
                        d={pathD}
                        fill="none"
                        stroke="url(#stroke-gradient)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Static Date Labels on X Axis */}
                    {points.map((p, idx) => (
                        <text
                            key={idx}
                            x={p.x}
                            y={height - 10}
                            textAnchor="middle"
                            className="text-[11px] font-mono fill-zinc-500"
                        >
                            {p.data.date}
                        </text>
                    ))}

                    {/* Interactive Active Scrub Line & Glowing Dot */}
                    {activePointCoord && (
                        <g>
                            {/* Vertical Tracking Line */}
                            <line
                                x1={activePointCoord.x}
                                y1={paddingTop}
                                x2={activePointCoord.x}
                                y2={height - paddingBottom}
                                stroke="#10b981"
                                strokeDasharray="3 3"
                                strokeWidth="1.5"
                                opacity="0.7"
                            />

                            {/* Outer Pulsing Aura */}
                            <circle
                                cx={activePointCoord.x}
                                cy={activePointCoord.y}
                                r="8"
                                fill="#10b981"
                                opacity="0.25"
                                className="animate-ping"
                            />

                            {/* Center Point */}
                            <circle
                                cx={activePointCoord.x}
                                cy={activePointCoord.y}
                                r="4.5"
                                fill="#ffffff"
                                stroke="#10b981"
                                strokeWidth="2.5"
                            />
                        </g>
                    )}
                </svg>
            </div>

            {/* Cash Flow Insights Bottom Strip */}
            <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-zinc-500 block text-[11px]">Total Pemasukan</span>
                        <strong className="text-white font-mono font-semibold text-xs">
                            +{formatCurrency(Math.round(activeAmount * 0.42), currency)}
                        </strong>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-zinc-500 block text-[11px]">Total Pengeluaran</span>
                        <strong className="text-white font-mono font-semibold text-xs">
                            -{formatCurrency(Math.round(activeAmount * 0.12), currency)}
                        </strong>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <span className="text-zinc-500 block text-[11px]">Status Likuiditas</span>
                        <strong className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                            Sangat Sehat & Seimbang
                        </strong>
                    </div>
                </div>
            </div>
        </div>
    );
};
