import React, { useState } from 'react';
import {
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    X,
    Wallet as WalletIcon,
    Building,
    CreditCard,
    Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import type { Wallet } from '../../types/wallet';

export interface MoneyMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'transfer' | 'topup';
    wallets: Wallet[];
    onSuccess?: (amount: number, type: 'transfer' | 'topup', walletId: string) => void;
}

export const MoneyMovementModal: React.FC<MoneyMovementModalProps> = ({
    isOpen,
    onClose,
    mode,
    wallets,
    onSuccess,
}) => {
    const [selectedWalletId, setSelectedWalletId] = useState(() => wallets[0]?.id || '');
    const [amount, setAmount] = useState<string>('500000');
    const [targetAccount, setTargetAccount] = useState<string>('');
    const [sourceChannel, setSourceChannel] = useState<string>('BCA Virtual Account');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const selectedWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];
    const currency = selectedWallet?.currency || 'IDR';

    const numAmount = parseInt(amount, 10) || 0;

    const quickPills =
        currency === 'USD'
            ? [25, 50, 100, 250, 500]
            : [50000, 100000, 250000, 500000, 1000000];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (numAmount <= 0) return;

        setIsProcessing(true);
        // Simulate real-time banking network latency
        setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
            if (onSuccess) {
                onSuccess(numAmount, mode, selectedWallet?.id || '');
            }
        }, 850);
    };

    const handleReset = () => {
        setIsSuccess(false);
        setAmount('500000');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
            <div className="w-full max-w-md bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left relative animate-in zoom-in-95 duration-150">
                {/* Close Button */}
                <button
                    onClick={handleReset}
                    className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {isSuccess ? (
                    /* SUCCESS SCREEN */
                    <div className="py-6 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 mx-auto flex items-center justify-center shadow-lg animate-in zoom-in-50">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white">
                                {mode === 'topup' ? 'Isi Saldo Berhasil!' : 'Uang Berhasil Terkirim!'}
                            </h3>
                            <p className="text-xs text-zinc-400">
                                Transaksi telah diproses dan dicatat dalam buku kas secara real-time.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0c0c0e] border border-zinc-800 font-mono space-y-2 text-xs">
                            <div className="flex justify-between text-zinc-400">
                                <span>Nominal Transaksi:</span>
                                <strong className="text-white text-sm font-bold">
                                    {formatCurrency(numAmount, currency)}
                                </strong>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                                <span>Rekening Dompet:</span>
                                <span className="text-zinc-300 truncate max-w-[160px]">
                                    {selectedWallet?.id}
                                </span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                                <span>Biaya Layanan:</span>
                                <span className="text-emerald-400 font-semibold">Rp 0 (Gratis)</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                                <span>Status Mutasi:</span>
                                <span className="text-emerald-400 font-semibold">SUKSES (KLOP)</span>
                            </div>
                        </div>

                        <Button size="md" className="w-full mt-4" onClick={handleReset}>
                            Selesai & Tutup
                        </Button>
                    </div>
                ) : (
                    /* FORM INPUT SCREEN */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
                            <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    mode === 'topup'
                                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                                        : 'bg-blue-950/80 text-blue-400 border border-blue-800/40'
                                }`}
                            >
                                {mode === 'topup' ? (
                                    <ArrowDownLeft className="w-4 h-4" />
                                ) : (
                                    <ArrowUpRight className="w-4 h-4" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">
                                    {mode === 'topup' ? 'Isi Saldo Dompet' : 'Kirim Uang / Transfer'}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    {mode === 'topup'
                                        ? 'Tambah saldo langsung ke rekening dompet digital Anda'
                                        : 'Kirim dana ke nomor rekening lain secara instan'}
                                </p>
                            </div>
                        </div>

                        {/* Pilihan Dompet */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-300">
                                {mode === 'topup' ? 'Dompet Tujuan' : 'Dompet Sumber'}
                            </label>
                            <select
                                value={selectedWalletId}
                                onChange={(e) => setSelectedWalletId(e.target.value)}
                                className="w-full bg-[#0c0c0e] border border-zinc-800 text-white rounded-lg p-2.5 text-xs font-mono focus:border-zinc-600 outline-none"
                            >
                                {wallets.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.currency} &mdash; Saldo: {formatCurrency(w.balance, w.currency)} (Rek: •••• {w.id.slice(-4)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Input Nominal */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-zinc-300">
                                Nominal ({currency})
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-sm font-mono text-zinc-500 font-bold">
                                    {currency === 'IDR' ? 'Rp' : '$'}
                                </span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-[#0c0c0e] border border-zinc-800 text-white font-mono text-lg font-bold rounded-lg pl-10 pr-4 py-2 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            {/* Quick Nominal Pills */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {quickPills.map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setAmount(val.toString())}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors border ${
                                            amount === val.toString()
                                                ? 'bg-zinc-800 border-zinc-600 text-white font-bold'
                                                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        +{currency === 'IDR' ? `${(val / 1000).toLocaleString('id-ID')}k` : `$${val}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mode Specific Inputs */}
                        {mode === 'transfer' ? (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-zinc-300">
                                    Rekening / ID Penerima
                                </label>
                                <div className="relative">
                                    <WalletIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                                    <input
                                        type="text"
                                        value={targetAccount}
                                        onChange={(e) => setTargetAccount(e.target.value)}
                                        placeholder="Contoh: 8492-4910-4491"
                                        className="w-full bg-[#0c0c0e] border border-zinc-800 text-white font-mono text-xs rounded-lg pl-9 pr-3 py-2.5 focus:border-zinc-600 outline-none"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-zinc-300">
                                    Metode Pembayaran
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { name: 'BCA Virtual Account', icon: Building },
                                        { name: 'QRIS Instan', icon: Sparkles },
                                        { name: 'Mandiri / BNI', icon: CreditCard },
                                        { name: 'Transfer Antar Bank', icon: Building },
                                    ].map((channel) => {
                                        const Icon = channel.icon;
                                        return (
                                            <button
                                                key={channel.name}
                                                type="button"
                                                onClick={() => setSourceChannel(channel.name)}
                                                className={`p-2.5 rounded-lg border text-left text-xs flex items-center gap-2 transition-colors ${
                                                    sourceChannel === channel.name
                                                        ? 'bg-zinc-800 border-emerald-500/50 text-white font-medium'
                                                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <span className="truncate">{channel.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Rincian Transaksi */}
                        <div className="p-3 rounded-xl bg-[#0c0c0e] border border-zinc-800/80 text-xs space-y-1.5">
                            <div className="flex justify-between text-zinc-400">
                                <span>Biaya Layanan:</span>
                                <span className="text-emerald-400 font-semibold">Rp 0 (Gratis)</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                                <span>Waktu Proses:</span>
                                <span className="text-zinc-200">Instan (Real-time)</span>
                            </div>
                        </div>

                        {/* Submit Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                disabled={isProcessing}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                isLoading={isProcessing}
                                disabled={numAmount <= 0}
                            >
                                {mode === 'topup' ? 'Isi Saldo Sekarang' : 'Kirim Uang Sekarang'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
