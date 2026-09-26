import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, X, ArrowRight, CheckCircle2, WalletCards } from 'lucide-react';
import { useWallets } from '../../features/wallet/hooks';
import { useCreateTopup } from '../../features/transaction/hooks';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { formatCurrency } from '../../lib/formatters';

interface TopupModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultReceiverWalletId?: string;
    onSuccess?: () => void;
}

const PRESET_AMOUNTS_IDR = [50000, 100000, 250000, 500000, 1000000, 2500000];
const PRESET_AMOUNTS_USD = [10, 25, 50, 100, 250, 500];

export const TopupModal: React.FC<TopupModalProps> = ({
    isOpen,
    onClose,
    defaultReceiverWalletId,
    onSuccess,
}) => {
    const { data: wallets = [] } = useWallets();
    const { mutateAsync: createTopup, isPending } = useCreateTopup();

    const activeWallets = wallets.filter((w) => w.status === 'ACTIVE');

    const [receiverWalletId, setReceiverWalletId] = useState<string>('');
    const [amountStr, setAmountStr] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [idempotencyKey, setIdempotencyKey] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setErrorMsg(null);
            setSuccessMsg(null);
            setAmountStr('');
            setDescription('');
            setIdempotencyKey(crypto.randomUUID());

            if (defaultReceiverWalletId && activeWallets.some((w) => w.id === defaultReceiverWalletId)) {
                setReceiverWalletId(defaultReceiverWalletId);
            } else if (activeWallets.length > 0) {
                setReceiverWalletId(activeWallets[0].id);
            }
        }
    }, [isOpen, defaultReceiverWalletId, activeWallets.length]);

    if (!isOpen) return null;

    const selectedWallet = activeWallets.find((w) => w.id === receiverWalletId) || activeWallets[0];
    const isUSD = selectedWallet?.currency === 'USD';
    const presets = isUSD ? PRESET_AMOUNTS_USD : PRESET_AMOUNTS_IDR;
    const rawAmount = parseInt(amountStr.replace(/\D/g, '') || '0', 10);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!receiverWalletId) {
            setErrorMsg('Silakan pilih rekening dompet tujuan pengisian.');
            return;
        }

        if (rawAmount <= 0) {
            setErrorMsg('Nominal pengisian saldo harus lebih dari 0.');
            return;
        }

        try {
            await createTopup({
                idempotency_key: idempotencyKey,
                receiver_wallet_id: receiverWalletId,
                amount: rawAmount,
                currency: selectedWallet?.currency || 'IDR',
                description: description.trim() || 'Pengisian saldo dompet',
            });

            setSuccessMsg(`Saldo sebesar ${formatCurrency(rawAmount, selectedWallet?.currency || 'IDR')} berhasil ditambahkan.`);
            setTimeout(() => {
                onClose();
                if (onSuccess) onSuccess();
            }, 1200);
        } catch (err: unknown) {
            const responseData = (err as { response?: { data?: { error?: { message?: string } | string } } })?.response?.data;
            let message = 'Gagal menambahkan saldo. Silakan coba kembali.';

            if (responseData && typeof responseData === 'object') {
                if (typeof responseData.error === 'object' && responseData.error?.message) {
                    message = responseData.error.message;
                } else if (typeof responseData.error === 'string') {
                    message = responseData.error;
                }
            }

            setErrorMsg(message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
                            <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Isi Saldo / Top-up</h3>
                            <p className="text-[11px] text-zinc-400">Tambahkan dana ke rekening dompet secara instan</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {errorMsg && (
                    <Alert variant="error" title="Kendala Pengisian Saldo">
                        {errorMsg}
                    </Alert>
                )}

                {successMsg && (
                    <Alert variant="success" title="Saldo Masuk">
                        {successMsg}
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Rekening Tujuan */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-zinc-300">
                            Rekening Dompet Tujuan
                        </label>
                        <select
                            value={receiverWalletId}
                            onChange={(e) => setReceiverWalletId(e.target.value)}
                            disabled={isPending || !!successMsg}
                            className="w-full bg-[#0c0c0e] border border-zinc-800 text-white rounded-xl p-2.5 text-xs font-mono focus:border-zinc-500 outline-none"
                        >
                            {activeWallets.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.currency} — Saldo: {formatCurrency(Number(w.balance) || 0, w.currency)} ({w.id.slice(0, 8)}...)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Preset Buttons */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-zinc-300">
                            Pilihan Cepat Nominal
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {presets.map((val) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setAmountStr(val.toString())}
                                    disabled={isPending || !!successMsg}
                                    className={`py-2 px-2.5 rounded-lg border text-xs font-mono transition-colors text-center ${
                                        rawAmount === val
                                            ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-bold'
                                            : 'border-zinc-800 bg-[#0c0c0e] text-zinc-300 hover:border-zinc-700'
                                    }`}
                                >
                                    {formatCurrency(val, selectedWallet?.currency || 'IDR')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input Nominal Kustom */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-zinc-300">
                            Atau Masukkan Nominal Sendiri
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-zinc-400">
                                {isUSD ? '$' : 'Rp'}
                            </span>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={amountStr ? parseInt(amountStr, 10).toLocaleString('id-ID') : ''}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '');
                                    setAmountStr(digits);
                                }}
                                disabled={isPending || !!successMsg}
                                className="w-full bg-[#0c0c0e] border border-zinc-800 focus:border-blue-500 text-white font-mono font-bold text-sm rounded-xl py-2.5 pl-10 pr-3 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Catatan Top-up */}
                    <div className="space-y-1.5">
                        <Input
                            label="Keterangan Pengisian (Opsional)"
                            placeholder="Contoh: Setoran modal awal operasional"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isPending || !!successMsg}
                            className="text-xs"
                        />
                    </div>

                    {/* Ringkasan Biaya */}
                    <div className="p-3 rounded-xl bg-[#09090b] border border-zinc-800/80 text-xs space-y-1.5">
                        <div className="flex justify-between text-zinc-400">
                            <span>Biaya Top-up</span>
                            <span className="text-emerald-400 font-medium">Gratis (Rp 0)</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Kunci Idempotensi</span>
                            <span className="font-mono text-[10px] text-zinc-500 truncate max-w-[180px]">
                                {idempotencyKey.slice(0, 16)}...
                            </span>
                        </div>
                        <div className="border-t border-zinc-800 pt-1.5 flex justify-between font-semibold text-white">
                            <span>Total Saldo Masuk</span>
                            <span className="font-mono text-blue-400">
                                {formatCurrency(rawAmount, selectedWallet?.currency || 'IDR')}
                            </span>
                        </div>
                    </div>

                    {/* Tombol Aksi */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            disabled={isPending || !!successMsg}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            isLoading={isPending}
                            disabled={rawAmount <= 0 || !!successMsg}
                            rightIcon={successMsg ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        >
                            {successMsg ? 'Berhasil' : 'Tambahkan Saldo'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
