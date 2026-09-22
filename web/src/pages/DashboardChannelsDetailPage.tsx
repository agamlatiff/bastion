import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    QrCode,
    Building2,
    CreditCard,
    CheckCircle2,
    ShieldCheck,
    Clock,
    Percent,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/formatters';

interface ChannelSummary {
    id: string;
    name: string;
    icon: React.ReactNode;
    nominal: number;
    volume: number;
    share: number;
    avgTicket: number;
    settlementSpeed: string;
    fee: string;
    status: string;
    dotColor: string;
}

const CHANNELS_DETAIL: ChannelSummary[] = [
    {
        id: 'qris',
        name: 'QRIS Dinamis',
        icon: <QrCode className="w-6 h-6 text-emerald-400" />,
        nominal: 1347500000,
        volume: 685,
        share: 55,
        avgTicket: 1967153,
        settlementSpeed: 'Instan (Detik Itu Juga)',
        fee: '0% (Bebas Biaya)',
        status: 'Terhubung Aktif',
        dotColor: 'bg-emerald-400',
    },
    {
        id: 'bank',
        name: 'Transfer Bank & Virtual Account',
        icon: <Building2 className="w-6 h-6 text-indigo-400" />,
        nominal: 735000000,
        volume: 372,
        share: 30,
        avgTicket: 1975806,
        settlementSpeed: 'Real-Time 24/7',
        fee: 'Bebas Biaya Transfer',
        status: 'Terhubung Aktif',
        dotColor: 'bg-indigo-400',
    },
    {
        id: 'edc',
        name: 'Mesin EDC Toko',
        icon: <CreditCard className="w-6 h-6 text-amber-400" />,
        nominal: 367500000,
        volume: 185,
        share: 15,
        avgTicket: 1986486,
        settlementSpeed: 'Kliring H+0 Otomatis',
        fee: 'Tarif Resmi Standar',
        status: 'Terhubung Aktif',
        dotColor: 'bg-amber-400',
    },
];

export const DashboardChannelsDetailPage: React.FC = () => {
    const totalOmzet = CHANNELS_DETAIL.reduce((sum, ch) => sum + ch.nominal, 0);
    const totalTransactions = CHANNELS_DETAIL.reduce((sum, ch) => sum + ch.volume, 0);

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
                title="Rincian Saluran Penerimaan Kasir"
                description="Pantau omzet masuk dari setiap saluran pembayaran, transparansi biaya, dan kepastian dana masuk langsung ke rekening usaha."
                badge={<Badge variant="success">Semua Kanal Siaga ✓</Badge>}
            />

            {/* 3 Channel Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {CHANNELS_DETAIL.map((ch) => (
                    <div
                        key={ch.id}
                        className="p-6 rounded-2xl border border-zinc-800 bg-[#111116] space-y-4 shadow-sm relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                {ch.icon}
                            </div>
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-200">
                                Porsi {ch.share}%
                            </span>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-white tracking-tight">{ch.name}</h3>
                            <div className="text-2xl font-extrabold font-mono text-white pt-1">
                                {formatCurrency(ch.nominal, 'IDR')}
                            </div>
                            <p className="text-xs text-zinc-400">
                                {ch.volume} transaksi tercatat bulan ini
                            </p>
                        </div>

                        <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>Pencairan Dana:</span>
                                </span>
                                <span className="font-semibold text-emerald-400">{ch.settlementSpeed}</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <Percent className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>Biaya Transaksi:</span>
                                </span>
                                <span className="font-mono text-zinc-300">{ch.fee}</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400">
                                <span>Rata-rata Nota:</span>
                                <span className="font-mono font-medium text-white">
                                    {formatCurrency(ch.avgTicket, 'IDR')}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Reconciliation Guarantees Banner */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0c0c0e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-white">
                            Jaminan Uang Masuk Pasti Sesuai & Nol Selisih
                        </h4>
                        <p className="text-xs text-zinc-400">
                            Seluruh pembayaran kasir langsung dikunci ke saldo aktif tanpa potongan tersembunyi.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs text-zinc-400 shrink-0">
                    <span>Total Omzet: <strong className="text-white">{formatCurrency(totalOmzet, 'IDR')}</strong></span>
                    <span>•</span>
                    <span><strong className="text-emerald-400">{totalTransactions} Transaksi</strong></span>
                </div>
            </div>

            {/* Channel Performance Table */}
            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-[#111116] shadow-sm">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Tabel Rekapitulasi Kanal Pembayaran
                        </h4>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400">
                        Sinkronisasi Terkini ✓
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#0c0c0e] border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="p-4">Kanal Pembayaran</th>
                                <th className="p-4 text-right">Porsi Omzet</th>
                                <th className="p-4 text-right">Total Transaksi Masuk</th>
                                <th className="p-4 text-right">Jumlah Nota</th>
                                <th className="p-4 text-right">Rata-rata per Nota</th>
                                <th className="p-4 text-center">Status Kanal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                            {CHANNELS_DETAIL.map((ch) => (
                                <tr key={ch.id} className="hover:bg-zinc-900/40 transition-colors">
                                    <td className="p-4 font-semibold text-white">
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-2.5 h-2.5 rounded-full ${ch.dotColor} shrink-0`} />
                                            <span>{ch.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-white">
                                        {ch.share}%
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                                        +{formatCurrency(ch.nominal, 'IDR')}
                                    </td>
                                    <td className="p-4 text-right font-mono text-zinc-300">
                                        {ch.volume} tx
                                    </td>
                                    <td className="p-4 text-right font-mono text-zinc-300">
                                        {formatCurrency(ch.avgTicket, 'IDR')}
                                    </td>
                                    <td className="p-4 text-center">
                                        <Badge variant="success">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                <span>{ch.status}</span>
                                            </span>
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
