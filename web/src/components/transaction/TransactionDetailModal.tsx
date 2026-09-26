import React, { useState } from 'react';
import {
    X,
    Copy,
    Check,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Clock,
    ShieldCheck,
    AlertTriangle,
} from 'lucide-react';
import type { Transaction } from '../../types/transaction';
import { useTransactionHistory } from '../../features/transaction/hooks';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../lib/formatters';

interface TransactionDetailModalProps {
    transaction: Transaction | null;
    currentWalletId?: string;
    isOpen: boolean;
    onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
    transaction,
    currentWalletId,
    isOpen,
    onClose,
}) => {
    const { data: history = [] } = useTransactionHistory(transaction?.id || '');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!isOpen || !transaction) return null;

    const isIncoming = transaction.type === 'TOPUP' || (transaction.receiver_wallet_id === currentWalletId && transaction.sender_wallet_id !== currentWalletId);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const getStatusBadge = () => {
        switch (transaction.status) {
            case 'COMPLETED':
                return <Badge variant="success">Transaksi Berhasil</Badge>;
            case 'PROCESSING':
                return <Badge variant="warning">Sedang Diproses</Badge>;
            case 'FAILED':
                return <Badge variant="danger">Gagal</Badge>;
            case 'REVERSED':
                return <Badge variant="neutral">Dibatalkan / Dikembalikan</Badge>;
            default:
                return <Badge variant="neutral">{transaction.status}</Badge>;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                                isIncoming
                                    ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                                    : 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                            }`}
                        >
                            {transaction.type === 'TOPUP' ? (
                                <ArrowDownLeft className="w-4 h-4" />
                            ) : transaction.type === 'TRANSFER' ? (
                                <ArrowLeftRight className="w-4 h-4" />
                            ) : (
                                <ArrowUpRight className="w-4 h-4" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Bukti Rincian Transaksi</h3>
                            <p className="text-[11px] text-zinc-400">Catatan pencatatan mutasi resmi sistem</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Amount Spotlight Banner */}
                <div className="p-4 rounded-xl bg-[#09090b] border border-zinc-800 text-center space-y-1">
                    <div className="flex items-center justify-center gap-2">
                        {getStatusBadge()}
                        <span className="text-[11px] text-zinc-400">Tipe: {transaction.type}</span>
                    </div>
                    <div
                        className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${
                            isIncoming ? 'text-emerald-400' : 'text-white'
                        }`}
                    >
                        {isIncoming ? '+' : '-'} {formatCurrency(transaction.amount, transaction.currency)}
                    </div>
                    {transaction.fee_amount > 0 && (
                        <p className="text-[11px] text-zinc-500 font-mono">
                            Biaya transaksi: {formatCurrency(transaction.fee_amount, transaction.currency)}
                        </p>
                    )}
                </div>

                {/* Failure Alert if FAILED */}
                {transaction.status === 'FAILED' && (
                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs space-y-1 text-rose-200">
                        <div className="flex items-center gap-1.5 font-bold text-rose-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Penyebab Kegagalan</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-rose-300">
                            {transaction.failure_reason || transaction.failure_code || 'Transaksi ditolak oleh sistem pengamanan.'}
                        </p>
                    </div>
                )}

                {/* Detail Table */}
                <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                        <span className="text-zinc-400">ID Transaksi</span>
                        <button
                            onClick={() => handleCopy(transaction.id, 'id')}
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-300 hover:text-white transition-colors"
                        >
                            <span>{transaction.id}</span>
                            {copiedField === 'id' ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                                <Copy className="w-3 h-3 text-zinc-500" />
                            )}
                        </button>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                        <span className="text-zinc-400">Kunci Idempotensi</span>
                        <span className="font-mono text-[11px] text-zinc-500 truncate max-w-[220px]">
                            {transaction.idempotency_key}
                        </span>
                    </div>

                    {transaction.sender_wallet_id && (
                        <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                            <span className="text-zinc-400">Rekening Pengirim</span>
                            <button
                                onClick={() => handleCopy(transaction.sender_wallet_id!, 'sender')}
                                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-300 hover:text-white transition-colors"
                            >
                                <span>{transaction.sender_wallet_id}</span>
                                {copiedField === 'sender' ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                    <Copy className="w-3 h-3 text-zinc-500" />
                                )}
                            </button>
                        </div>
                    )}

                    {transaction.receiver_wallet_id && (
                        <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                            <span className="text-zinc-400">Rekening Penerima</span>
                            <button
                                onClick={() => handleCopy(transaction.receiver_wallet_id!, 'receiver')}
                                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-300 hover:text-white transition-colors"
                            >
                                <span>{transaction.receiver_wallet_id}</span>
                                {copiedField === 'receiver' ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                    <Copy className="w-3 h-3 text-zinc-500" />
                                )}
                            </button>
                        </div>
                    )}

                    {transaction.description && (
                        <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                            <span className="text-zinc-400">Berita / Catatan</span>
                            <span className="text-zinc-200 text-right">{transaction.description}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                        <span className="text-zinc-400">Waktu Permintaan</span>
                        <span className="text-zinc-300 font-mono text-[11px]">{formatDate(transaction.created_at)}</span>
                    </div>

                    {transaction.completed_at && (
                        <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                            <span className="text-zinc-400">Waktu Selesai</span>
                            <span className="text-zinc-300 font-mono text-[11px]">{formatDate(transaction.completed_at)}</span>
                        </div>
                    )}
                </div>

                {/* Audit Trail State Transitions */}
                {history.length > 0 && (
                    <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Riwayat Perubahan Status</span>
                        </span>
                        <div className="space-y-1.5 pl-2 border-l border-zinc-800">
                            {history.map((h) => (
                                <div key={h.id} className="text-[11px] flex justify-between items-center py-1 text-zinc-400">
                                    <span className="font-mono text-zinc-300">
                                        {h.from_status ? `${h.from_status} → ` : ''}
                                        <strong className="text-white">{h.to_status}</strong>
                                        {h.reason ? ` (${h.reason})` : ''}
                                    </span>
                                    <span className="font-mono text-[10px] text-zinc-500">
                                        {formatDate(h.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Assurance */}
                <div className="pt-2 text-[11px] text-zinc-500 flex items-center justify-between border-t border-zinc-800">
                    <span className="flex items-center gap-1 text-emerald-400/80">
                        <ShieldCheck className="w-3.5 h-3.5" /> Mutasi tercatat rapi & sah
                    </span>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 text-xs font-medium transition-colors"
                    >
                        Tutup Rincian
                    </button>
                </div>
            </div>
        </div>
    );
};
