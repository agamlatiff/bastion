import React, { useState } from 'react';
import {
    History,
    ShieldCheck,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Send,
    Plus,
    RefreshCw,
    Search,
    ChevronRight,
    ExternalLink,
} from 'lucide-react';
import { useTransactions } from '../features/transaction/hooks';
import { useWallets } from '../features/wallet/hooks';
import type { Transaction } from '../types/transaction';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Alert } from '../components/ui/Alert';
import { TransferModal } from '../components/transaction/TransferModal';
import { TopupModal } from '../components/transaction/TopupModal';
import { TransactionDetailModal } from '../components/transaction/TransactionDetailModal';
import { formatCurrency, formatDate } from '../lib/formatters';

export const ActivityPage: React.FC = () => {
    const { data: wallets = [] } = useWallets();
    const [filterTab, setFilterTab] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [selectedWalletId, setSelectedWalletId] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Modals
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isTopupOpen, setIsTopupOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

    // Fetch transactions
    const {
        data: txData,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useTransactions(
        selectedWalletId !== 'ALL' ? { wallet_id: selectedWalletId } : undefined
    );

    const transactions = txData?.items || [];

    // Filter by Tab and Search
    const userWalletIds = new Set(wallets.map((w) => w.id));

    const filteredTransactions = transactions.filter((tx) => {
        // Tab filter
        const isIncoming = tx.type === 'TOPUP' || (tx.receiver_wallet_id && userWalletIds.has(tx.receiver_wallet_id) && tx.sender_wallet_id !== tx.receiver_wallet_id);
        const isOutgoing = tx.type === 'TRANSFER' && tx.sender_wallet_id && userWalletIds.has(tx.sender_wallet_id);

        if (filterTab === 'IN' && !isIncoming) return false;
        if (filterTab === 'OUT' && !isOutgoing) return false;

        // Search query filter (by description, id, or amount)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const desc = (tx.description || '').toLowerCase();
            const id = tx.id.toLowerCase();
            const key = tx.idempotency_key.toLowerCase();
            const amountStr = tx.amount.toString();
            return desc.includes(q) || id.includes(q) || key.includes(q) || amountStr.includes(q);
        }

        return true;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge variant="success">Berhasil</Badge>;
            case 'PROCESSING':
                return <Badge variant="warning">Diproses</Badge>;
            case 'FAILED':
                return <Badge variant="danger">Gagal</Badge>;
            case 'REVERSED':
                return <Badge variant="neutral">Dibatalkan</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 text-left">
            <PageHeader
                title="Riwayat Mutasi & Transaksi"
                description="Pantau seluruh aliran dana masuk, dana keluar, dan pemindahan saldo di seluruh dompet Anda."
                badge={<Badge variant="neutral">Pencatatan Otomatis</Badge>}
                action={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isRefetching}
                            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
                        >
                            Segarkan
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsTopupOpen(true)}
                            leftIcon={<Plus className="w-3.5 h-3.5 text-blue-400" />}
                        >
                            Isi Saldo
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsTransferOpen(true)}
                            leftIcon={<Send className="w-3.5 h-3.5" />}
                        >
                            Kirim Uang
                        </Button>
                    </div>
                }
            />

            {error && (
                <Alert variant="error" title="Kendala Memuat Transaksi">
                    Tidak dapat menghubungi server transaksi. Silakan coba klik tombol segarkan di atas.
                </Alert>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                {/* Tabs */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilterTab('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            filterTab === 'ALL'
                                ? 'bg-zinc-800 text-white shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        Semua Transaksi
                    </button>
                    <button
                        onClick={() => setFilterTab('IN')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            filterTab === 'IN'
                                ? 'bg-zinc-800 text-emerald-300 shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Uang Masuk</span>
                    </button>
                    <button
                        onClick={() => setFilterTab('OUT')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            filterTab === 'OUT'
                                ? 'bg-zinc-800 text-rose-300 shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                        <span>Uang Keluar</span>
                    </button>
                </div>

                {/* Right controls: Wallet Select & Search Input */}
                <div className="flex items-center gap-2">
                    {wallets.length > 1 && (
                        <select
                            value={selectedWalletId}
                            onChange={(e) => setSelectedWalletId(e.target.value)}
                            className="bg-[#0c0c0e] border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                        >
                            <option value="ALL">Semua Rekening</option>
                            {wallets.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.currency} ({w.id.slice(0, 8)}...)
                                </option>
                            ))}
                        </select>
                    )}

                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                        <input
                            type="text"
                            placeholder="Cari transaksi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-[#0c0c0e] border border-zinc-800 text-white rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-zinc-600 transition-colors w-40 sm:w-48"
                        />
                    </div>
                </div>
            </div>

            {/* Transaction List Section */}
            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-[#111114] p-6 sm:p-8 space-y-6">
                    <EmptyState
                        icon={<History className="w-8 h-8 text-zinc-500" />}
                        title={transactions.length === 0 ? 'Belum Ada Riwayat Transaksi' : 'Tidak Ada Transaksi yang Sesuai'}
                        description={
                            transactions.length === 0
                                ? 'Seluruh aktivitas keuangan Anda—seperti transfer dana, pengisian saldo, dan pembayaran antar dompet—akan otomatis tercatat rapi detik itu juga di sini.'
                                : 'Coba sesuaikan filter tab atau kata kunci pencarian Anda untuk melihat transaksi lainnya.'
                        }
                        action={
                            transactions.length === 0 ? (
                                <div className="flex items-center gap-2 pt-2">
                                    <Button size="sm" onClick={() => setIsTopupOpen(true)}>
                                        Isi Saldo Pertama
                                    </Button>
                                </div>
                            ) : undefined
                        }
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
            ) : (
                <div className="rounded-xl border border-zinc-800 bg-[#111114] divide-y divide-zinc-800/80 overflow-hidden shadow-xl">
                    {filteredTransactions.map((tx) => {
                        const isTopup = tx.type === 'TOPUP';
                        const isReceiver = tx.receiver_wallet_id && userWalletIds.has(tx.receiver_wallet_id);
                        const isPositive = isTopup || isReceiver;

                        return (
                            <div
                                key={tx.id}
                                onClick={() => setSelectedTx(tx)}
                                className="p-4 sm:px-5 hover:bg-zinc-800/30 transition-colors cursor-pointer flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                                            isPositive
                                                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                        }`}
                                    >
                                        {isTopup ? (
                                            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                                        ) : isPositive ? (
                                            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                                        ) : (
                                            <ArrowUpRight className="w-5 h-5 text-zinc-300" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-white truncate">
                                                {tx.description || (isTopup ? 'Pengisian Saldo Dompet' : 'Transfer Antar Dompet')}
                                            </span>
                                            {getStatusBadge(tx.status)}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-0.5">
                                            <span className="font-mono text-zinc-500">{formatDate(tx.created_at)}</span>
                                            <span>•</span>
                                            <span className="font-mono text-[10px] text-zinc-500 truncate max-w-[120px]">
                                                ID: {tx.id.slice(0, 8)}...
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-right shrink-0">
                                    <div>
                                        <div
                                            className={`text-xs sm:text-sm font-mono font-bold ${
                                                isPositive ? 'text-emerald-400' : 'text-white'
                                            }`}
                                        >
                                            {isPositive ? '+' : '-'} {formatCurrency(tx.amount, tx.currency)}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 uppercase font-mono">
                                            {tx.type}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Feature Teasers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-2">
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
                        Pindahkan kas operasional antar-rekening rupiah maupun valas kapan pun dibutuhkan.
                    </p>
                </div>
            </div>

            {/* Modals */}
            <TransferModal
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
                onSuccess={() => refetch()}
            />

            <TopupModal
                isOpen={isTopupOpen}
                onClose={() => setIsTopupOpen(false)}
                onSuccess={() => refetch()}
            />

            <TransactionDetailModal
                transaction={selectedTx}
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
            />
        </div>
    );
};
