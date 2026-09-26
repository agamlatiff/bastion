import React, { useState, useEffect } from 'react';
import { Send, X, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useWallets } from '../../features/wallet/hooks';
import { useCreateTransfer } from '../../features/transaction/hooks';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { formatCurrency } from '../../lib/formatters';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultSenderWalletId?: string;
    onSuccess?: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
    isOpen,
    onClose,
    defaultSenderWalletId,
    onSuccess,
}) => {
    const { data: wallets = [] } = useWallets();
    const { mutateAsync: createTransfer, isPending } = useCreateTransfer();

    const activeWallets = wallets.filter((w) => w.status === 'ACTIVE');

    const [senderWalletId, setSenderWalletId] = useState<string>('');
    const [receiverWalletId, setReceiverWalletId] = useState<string>('');
    const [amountStr, setAmountStr] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [idempotencyKey, setIdempotencyKey] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Initialize or reset form state when modal opens
    useEffect(() => {
        if (isOpen) {
            setErrorMsg(null);
            setSuccessMsg(null);
            setReceiverWalletId('');
            setAmountStr('');
            setDescription('');
            setIdempotencyKey(crypto.randomUUID());

            if (defaultSenderWalletId && activeWallets.some((w) => w.id === defaultSenderWalletId)) {
                setSenderWalletId(defaultSenderWalletId);
            } else if (activeWallets.length > 0) {
                setSenderWalletId(activeWallets[0].id);
            }
        }
    }, [isOpen, defaultSenderWalletId, activeWallets.length]);

    if (!isOpen) return null;

    const selectedWallet = activeWallets.find((w) => w.id === senderWalletId) || activeWallets[0];
    const rawAmount = parseInt(amountStr.replace(/\D/g, '') || '0', 10);
    const availableBalance = selectedWallet ? Number(selectedWallet.balance) || 0 : 0;
    const isExceedingBalance = rawAmount > availableBalance;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!senderWalletId) {
            setErrorMsg('Silakan pilih rekening sumber pengirim.');
            return;
        }

        const trimmedReceiver = receiverWalletId.trim();
        if (!trimmedReceiver) {
            setErrorMsg('Nomor rekening tujuan penerima wajib diisi.');
            return;
        }

        if (senderWalletId === trimmedReceiver) {
            setErrorMsg('Rekening pengirim dan penerima tidak boleh sama.');
            return;
        }

        if (rawAmount <= 0) {
            setErrorMsg('Nominal transfer harus lebih besar dari 0.');
            return;
        }

        if (isExceedingBalance) {
            setErrorMsg('Saldo rekening Anda tidak mencukupi untuk nominal transfer ini.');
            return;
        }

        try {
            await createTransfer({
                idempotency_key: idempotencyKey,
                sender_wallet_id: senderWalletId,
                receiver_wallet_id: trimmedReceiver,
                amount: rawAmount,
                currency: selectedWallet.currency,
                description: description.trim() || undefined,
            });

            setSuccessMsg(`Transfer sebesar ${formatCurrency(rawAmount, selectedWallet.currency)} berhasil dikirim.`);
            setTimeout(() => {
                onClose();
                if (onSuccess) onSuccess();
            }, 1200);
        } catch (err: unknown) {
            const responseData = (err as { response?: { data?: { error?: { message?: string; code?: string } | string } } })?.response?.data;
            let message = 'Gagal memproses transfer dana. Silakan coba kembali.';

            if (responseData && typeof responseData === 'object') {
                if (typeof responseData.error === 'object' && responseData.error?.message) {
                    message = responseData.error.message;
                } else if (typeof responseData.error === 'string') {
                    message = responseData.error;
                }
            }

            if (message.includes('IDEMPOTENCY_KEY_REUSED')) {
                message = 'Permintaan transfer ini telah tercatat sebelumnya.';
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
                        <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                            <Send className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Kirim Uang / Transfer</h3>
                            <p className="text-[11px] text-zinc-400">Pindahkan saldo antar-rekening secara instan & aman</p>
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
                    <Alert variant="error" title="Kendala Transfer">
                        {errorMsg}
                    </Alert>
                )}

                {successMsg && (
                    <Alert variant="success" title="Transfer Sukses">
                        {successMsg}
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Pilih Rekening Sumber */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-zinc-300">
                            Dari Rekening Dompet
                        </label>
                        <select
                            value={senderWalletId}
                            onChange={(e) => setSenderWalletId(e.target.value)}
                            disabled={isPending || !!successMsg}
                            className="w-full bg-[#0c0c0e] border border-zinc-800 text-white rounded-xl p-2.5 text-xs font-mono focus:border-zinc-500 outline-none"
                        >
                            {activeWallets.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.currency} — Saldo: {formatCurrency(Number(w.balance) || 0, w.currency)} ({w.id.slice(0, 8)}...)
                                </option>
                            ))}
                        </select>
                        {selectedWallet && (
                            <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-0.5">
                                <span>Saldo tersedia:</span>
                                <span className="font-mono font-medium text-emerald-400">
                                    {formatCurrency(availableBalance, selectedWallet.currency)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Rekening Tujuan */}
                    <div className="space-y-1.5">
                        <Input
                            label="Nomor Rekening Penerima"
                            placeholder="Contoh: a1b2c3d4-e5f6-7890-..."
                            value={receiverWalletId}
                            onChange={(e) => setReceiverWalletId(e.target.value)}
                            disabled={isPending || !!successMsg}
                            className="font-mono text-xs"
                            helperText="Masukkan ID dompet Bastion tujuan transfer."
                        />
                    </div>

                    {/* Nominal Transfer */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-zinc-300">
                            Nominal Transfer ({selectedWallet?.currency || 'IDR'})
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-zinc-400">
                                {selectedWallet?.currency === 'USD' ? '$' : 'Rp'}
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
                                className={`w-full bg-[#0c0c0e] border ${
                                    isExceedingBalance ? 'border-rose-500' : 'border-zinc-800 focus:border-emerald-500'
                                } text-white font-mono font-bold text-sm rounded-xl py-2.5 pl-10 pr-3 outline-none transition-colors`}
                            />
                        </div>
                        {isExceedingBalance && (
                            <p className="text-[11px] text-rose-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Nominal melebihi saldo aktif tersedia
                            </p>
                        )}
                    </div>

                    {/* Catatan / Berita */}
                    <div className="space-y-1.5">
                        <Input
                            label="Catatan / Berita Transfer (Opsional)"
                            placeholder="Contoh: Pembayaran pesanan bahan baku"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isPending || !!successMsg}
                            className="text-xs"
                        />
                    </div>

                    {/* Ringkasan Biaya */}
                    <div className="p-3 rounded-xl bg-[#09090b] border border-zinc-800/80 text-xs space-y-1.5">
                        <div className="flex justify-between text-zinc-400">
                            <span>Biaya Transfer</span>
                            <span className="text-emerald-400 font-medium">Bebas Biaya (Rp 0)</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Kunci Idempotensi</span>
                            <span className="font-mono text-[10px] text-zinc-500 truncate max-w-[180px]">
                                {idempotencyKey.slice(0, 16)}...
                            </span>
                        </div>
                        <div className="border-t border-zinc-800 pt-1.5 flex justify-between font-semibold text-white">
                            <span>Total Terpotong</span>
                            <span className="font-mono text-emerald-400">
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
                            disabled={rawAmount <= 0 || isExceedingBalance || !receiverWalletId.trim() || !!successMsg}
                            rightIcon={successMsg ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        >
                            {successMsg ? 'Terkirim' : 'Kirim Sekarang'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
