import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    TrendingUp,
    Calendar,
    CheckCircle2,
    DollarSign,
    ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/formatters';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface MonthRow {
    month: string;
    inflow: number;
    outflow: number;
    net: number;
    volume: number;
    retention: string;
    isSurplus: boolean;
}

const ANALYTICS_12_MONTHS: MonthRow[] = [
    { month: 'Januari 2026', inflow: 395000000, outflow: 145000000, net: 250000000, volume: 6940, retention: '97.2%', isSurplus: true },
    { month: 'Februari 2026', inflow: 312000000, outflow: 168000000, net: 144000000, volume: 5420, retention: '96.5%', isSurplus: true },
    { month: 'Maret 2026', inflow: 420000000, outflow: 175000000, net: 245000000, volume: 7110, retention: '97.8%', isSurplus: true },
    { month: 'April 2026', inflow: 385000000, outflow: 190000000, net: 195000000, volume: 6520, retention: '96.9%', isSurplus: true },
    { month: 'Mei 2026', inflow: 580000000, outflow: 210000000, net: 370000000, volume: 9810, retention: '98.4%', isSurplus: true },
    { month: 'Juni 2026', inflow: 220000000, outflow: 245000000, net: -25000000, volume: 3950, retention: '95.1%', isSurplus: false },
    { month: 'Juli 2026', inflow: 490000000, outflow: 185000000, net: 305000000, volume: 8450, retention: '97.6%', isSurplus: true },
    { month: 'Agustus 2026 (Puncak)', inflow: 864000000, outflow: 240000000, net: 624000000, volume: 15140, retention: '98.8%', isSurplus: true },
    { month: 'September 2026', inflow: 360000000, outflow: 195000000, net: 165000000, volume: 6120, retention: '96.2%', isSurplus: true },
    { month: 'Oktober 2026', inflow: 470000000, outflow: 180000000, net: 290000000, volume: 8020, retention: '97.4%', isSurplus: true },
    { month: 'November 2026', inflow: 780000000, outflow: 225000000, net: 555000000, volume: 13900, retention: '98.5%', isSurplus: true },
    { month: 'Desember 2026', inflow: 540000000, outflow: 215000000, net: 325000000, volume: 9450, retention: '97.9%', isSurplus: true },
];

export const DashboardAnalyticsDetailPage: React.FC = () => {
    const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'H1' | 'H2'>('ALL');
    const [isExporting, setIsExporting] = useState(false);

    const filteredRows = ANALYTICS_12_MONTHS.filter((_, idx) => {
        if (filterPeriod === 'H1') return idx < 6;
        if (filterPeriod === 'H2') return idx >= 6;
        return true;
    });

    const totalInflow = filteredRows.reduce((sum, r) => sum + r.inflow, 0);
    const totalOutflow = filteredRows.reduce((sum, r) => sum + r.outflow, 0);
    const totalNet = totalInflow - totalOutflow;
    const totalVolume = filteredRows.reduce((sum, r) => sum + r.volume, 0);

    const handleExportCsv = () => {
        setIsExporting(true);
        setTimeout(() => {
            const csvContent =
                'data:text/csv;charset=utf-8,' +
                'Bulan,Kas Masuk,Beban Operasional,Saldo Bersih,Volume Transaksi,Retensi\n' +
                filteredRows
                    .map((r) => `${r.month},${r.inflow},${r.outflow},${r.net},${r.volume},${r.retention}`)
                    .join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `rekap-analitik-arus-kas-${filterPeriod.toLowerCase()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsExporting(false);
        }, 600);
    };

    return (
        <div className="space-y-6 text-left">
            {/* Top Navigation Back Link */}
            <div>
                <Link
                    to="/app/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-1 font-medium"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Dasbor Finansial</span>
                </Link>
            </div>

            <PageHeader
                title="Rincian Analitik Arus Kas & Pertumbuhan Omzet"
                description="Laporan komprehensif pergerakan uang masuk, efisiensi beban operasional, dan kepastian saldo bersih usaha Anda."
                action={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleExportCsv}
                            isLoading={isExporting}
                            leftIcon={<Download className="w-3.5 h-3.5" />}
                        >
                            Unduh Rekap CSV
                        </Button>
                    </div>
                }
            />

            {/* 4 Key Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-zinc-800 bg-[#111116] space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Total Kas Masuk</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                        {formatCurrency(totalInflow, 'IDR')}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-medium">
                        +24.8% vs periode lalu
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-zinc-800 bg-[#111116] space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Total Beban Operasional</span>
                        <DollarSign className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                        {formatCurrency(totalOutflow, 'IDR')}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-medium">
                        Terkendali dalam batas wajar
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-zinc-800 bg-[#111116] space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Surplus Saldo Bersih</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                        {formatCurrency(totalNet, 'IDR')}
                    </div>
                    <div className="text-[11px] text-emerald-300 font-medium">
                        Nol Selisih • Saldo Terkunci Aman
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-zinc-800 bg-[#111116] space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Volume Transaksi Kasir</span>
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                        {totalVolume.toLocaleString('id-ID')} tx
                    </div>
                    <div className="text-[11px] text-zinc-400 font-medium">
                        100% kliring otomatis
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Period Selector */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilterPeriod('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            filterPeriod === 'ALL'
                                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        Seluruh Tahun 2026
                    </button>
                    <button
                        onClick={() => setFilterPeriod('H1')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            filterPeriod === 'H1'
                                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        Semester 1 (Jan - Jun)
                    </button>
                    <button
                        onClick={() => setFilterPeriod('H2')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            filterPeriod === 'H2'
                                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        Semester 2 (Jul - Des)
                    </button>
                </div>

                <div className="text-xs text-zinc-500 font-mono hidden sm:block">
                    Menampilkan {filteredRows.length} bulan pembukuan
                </div>
            </div>

            {/* Visualisasi Grafik Kurva Arus Kas Lengkap (Chart.js) */}
            <div className="rounded-2xl border border-zinc-800 bg-[#111116] p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span>Grafik Fluktuasi Arus Kas & Saldo Bersih</span>
                        </h3>
                        <p className="text-xs text-zinc-400 pt-0.5">
                            Visualisasi komparasi uang masuk, beban operasional, dan saldo bersih riil.
                        </p>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 self-start sm:self-auto">
                        {filterPeriod === 'ALL' ? '12 Bulan Penuh' : filterPeriod === 'H1' ? 'Semester 1' : 'Semester 2'}
                    </span>
                </div>

                <div className="h-80 sm:h-96 w-full pt-2">
                    <Line
                        data={{
                            labels: filteredRows.map((r) => r.month.replace(' 2026', '')),
                            datasets: [
                                {
                                    label: 'Uang Masuk (Omzet)',
                                    data: filteredRows.map((r) => r.inflow),
                                    borderColor: '#10b981',
                                    backgroundColor: (context: ScriptableContext<'line'>) => {
                                        const ctx = context.chart.ctx;
                                        const gradient = ctx.createLinearGradient(0, 0, 0, 320);
                                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
                                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                                        return gradient;
                                    },
                                    fill: true,
                                    tension: 0.4,
                                    borderWidth: 2.8,
                                    pointRadius: 4,
                                    pointHoverRadius: 7,
                                    pointBackgroundColor: '#10b981',
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 1.5,
                                },
                                {
                                    label: 'Beban Operasional',
                                    data: filteredRows.map((r) => r.outflow),
                                    borderColor: '#f43f5e',
                                    backgroundColor: 'transparent',
                                    fill: false,
                                    tension: 0.4,
                                    borderWidth: 2,
                                    borderDash: [4, 4],
                                    pointRadius: 3,
                                    pointHoverRadius: 6,
                                    pointBackgroundColor: '#f43f5e',
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 1.5,
                                },
                                {
                                    label: 'Saldo Bersih (Surplus)',
                                    data: filteredRows.map((r) => r.net),
                                    borderColor: '#38bdf8',
                                    backgroundColor: 'transparent',
                                    fill: false,
                                    tension: 0.4,
                                    borderWidth: 2.2,
                                    pointRadius: 3.5,
                                    pointHoverRadius: 6,
                                    pointBackgroundColor: '#38bdf8',
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 1.5,
                                },
                            ],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                mode: 'index',
                                intersect: false,
                            },
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top',
                                    align: 'end',
                                    labels: {
                                        boxWidth: 10,
                                        boxHeight: 10,
                                        color: '#d4d4d8',
                                        font: {
                                            size: 11,
                                        },
                                        usePointStyle: true,
                                        pointStyle: 'circle',
                                    },
                                },
                                tooltip: {
                                    backgroundColor: '#18181b',
                                    titleColor: '#ffffff',
                                    bodyColor: '#e4e4e7',
                                    borderColor: '#27272a',
                                    borderWidth: 1,
                                    padding: 12,
                                    boxPadding: 6,
                                    usePointStyle: true,
                                    callbacks: {
                                        label: (ctx) => {
                                            const val = ctx.parsed.y ?? 0;
                                            const formatted = new Intl.NumberFormat('id-ID', {
                                                style: 'currency',
                                                currency: 'IDR',
                                                maximumFractionDigits: 0,
                                            }).format(val);
                                            return ` ${ctx.dataset.label}: ${formatted}`;
                                        },
                                    },
                                },
                            },
                            scales: {
                                x: {
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.04)',
                                    },
                                    ticks: {
                                        color: '#a1a1aa',
                                        font: {
                                            size: 11,
                                            family: 'monospace',
                                        },
                                    },
                                },
                                y: {
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.04)',
                                    },
                                    ticks: {
                                        color: '#a1a1aa',
                                        font: {
                                            size: 10,
                                            family: 'monospace',
                                        },
                                        callback: (val) => {
                                            const num = Number(val);
                                            if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} M`;
                                            if (num >= 1_000_000) return `${Math.round(num / 1_000_000)} Jt`;
                                            if (num <= -1_000_000) return `-${Math.round(Math.abs(num) / 1_000_000)} Jt`;
                                            return `${num}`;
                                        },
                                    },
                                },
                            },
                        }}
                    />
                </div>
            </div>

            {/* Comprehensive Analytics Table */}
            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-[#111116] shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#0c0c0e] border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="p-4">Periode Bulan</th>
                                <th className="p-4 text-right">Kas Masuk (Inflow)</th>
                                <th className="p-4 text-right">Beban Operasional</th>
                                <th className="p-4 text-right">Saldo Bersih</th>
                                <th className="p-4 text-right hidden md:table-cell">Volume Transaksi</th>
                                <th className="p-4 text-right hidden sm:table-cell">Retensi Dana</th>
                                <th className="p-4 text-center">Status Buku Kas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                            {filteredRows.map((row) => (
                                <tr key={row.month} className="hover:bg-zinc-900/40 transition-colors">
                                    <td className="p-4 font-semibold text-white">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                            <span>{row.month}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono font-medium text-emerald-400">
                                        +{formatCurrency(row.inflow, 'IDR')}
                                    </td>
                                    <td className="p-4 text-right font-mono font-medium text-rose-400">
                                        -{formatCurrency(row.outflow, 'IDR')}
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-white">
                                        {formatCurrency(row.net, 'IDR')}
                                    </td>
                                    <td className="p-4 text-right font-mono text-zinc-400 hidden md:table-cell">
                                        {row.volume.toLocaleString('id-ID')} tx
                                    </td>
                                    <td className="p-4 text-right font-mono font-medium text-emerald-300 hidden sm:table-cell">
                                        {row.retention}
                                    </td>
                                    <td className="p-4 text-center">
                                        <Badge variant={row.isSurplus ? 'success' : 'neutral'}>
                                            {row.isSurplus ? 'Surplus ✓' : 'Terkoreksi'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-[#0c0c0e] border-t-2 border-zinc-800 text-xs font-semibold text-white">
                            <tr>
                                <td className="p-4 font-bold uppercase tracking-wider text-zinc-400">
                                    Total Akumulasi
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-emerald-400">
                                    +{formatCurrency(totalInflow, 'IDR')}
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-rose-400">
                                    -{formatCurrency(totalOutflow, 'IDR')}
                                </td>
                                <td className="p-4 text-right font-mono font-extrabold text-emerald-300 text-sm">
                                    {formatCurrency(totalNet, 'IDR')}
                                </td>
                                <td className="p-4 text-right font-mono text-zinc-300 hidden md:table-cell">
                                    {totalVolume.toLocaleString('id-ID')} tx
                                </td>
                                <td className="p-4 text-right font-mono text-emerald-400 hidden sm:table-cell">
                                    97.6% (Rata-rata)
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-[11px] font-mono text-emerald-400">
                                        Nol Selisih ✓
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};
