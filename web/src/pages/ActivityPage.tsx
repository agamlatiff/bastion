import React, { useState } from 'react';
import { History, ShieldCheck, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';

export const ActivityPage: React.FC = () => {
    const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

    return (
        <div className="space-y-6">
            <PageHeader
                title="Riwayat Mutasi & Transaksi"
                description="Pantau seluruh aliran dana masuk, dana keluar, dan pemindahan saldo di seluruh dompet Anda."
                badge={<Badge variant="neutral">Pencatatan Otomatis</Badge>}
            />

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <button
                    onClick={() => setFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filter === 'ALL'
                            ? 'bg-zinc-800 text-white shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                >
                    Semua Transaksi
                </button>
                <button
                    onClick={() => setFilter('IN')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        filter === 'IN'
                            ? 'bg-zinc-800 text-emerald-300 shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Uang Masuk</span>
                </button>
                <button
                    onClick={() => setFilter('OUT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        filter === 'OUT'
                            ? 'bg-zinc-800 text-rose-300 shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>Uang Keluar</span>
                </button>
            </div>

            {/* Content Container */}
            <div className="rounded-xl border border-zinc-800 bg-[#111114] p-6 sm:p-8 space-y-6">
                <EmptyState
                    icon={<History className="w-8 h-8 text-zinc-500" />}
                    title="Belum Ada Riwayat Transaksi"
                    description="Seluruh aktivitas keuangan Anda—seperti transfer dana, pengisian saldo, dan pembayaran antar dompet—akan otomatis tercatat secara rapi dan transparan di sini."
                />

                {/* Friendly Information Box */}
                <div className="p-4 rounded-xl bg-[#0c0c0e] border border-zinc-800 text-xs space-y-2 text-left">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Jaminan Mutasi Selalu Klop</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed">
                        Di Bastion, setiap transaksi uang masuk dan keluar dicatat secara bersamaan detik itu juga.
                        Tidak ada transaksi yang menggantung, saldo tidak bisa minus, dan Anda selalu memiliki bukti transfer yang sah kapan pun dibutuhkan.
                    </p>
                </div>
            </div>

            {/* Feature Teaser Cards (Clean & Informative) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                        <span>Terima Uang Instan</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Uang dari pembayaran klien langsung masuk ke saldo aktif dan siap digunakan.
                    </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <ArrowUpRight className="w-4 h-4 text-blue-400" />
                        <span>Kirim Uang Bebas Was-was</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Sistem mengunci saldo sebelum mengirim dana, mencegah uang terpotong dobel.
                    </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <ArrowLeftRight className="w-4 h-4 text-purple-400" />
                        <span>Mutasi Antar Dompet</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Pindahkan saldo antar dompet Rupiah dan Dolar Anda dengan pencatatan otomatis.
                    </p>
                </div>
            </div>
        </div>
    );
};
