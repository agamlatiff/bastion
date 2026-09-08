import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Snowflake, Sun, RefreshCw, Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
    useWalletDetail,
    useWalletBalance,
    useFreezeWallet,
    useUnfreezeWallet,
} from '../features/wallet/hooks';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Alert } from '../components/ui/Alert';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { VirtualDebitCard } from '../components/wallet/VirtualDebitCard';
import { formatCurrency, formatDate } from '../lib/formatters';

export const WalletDetailPage: React.FC = () => {
    const { walletId = '' } = useParams<{ walletId: string }>();

    const {
        data: wallet,
        isLoading: isWalletLoading,
        error: walletError,
        refetch: refetchWallet,
        isRefetching: isRefetchingWallet,
    } = useWalletDetail(walletId);

    const {
        data: balanceData,
        isLoading: isBalanceLoading,
        refetch: refetchBalance,
        isRefetching: isRefetchingBalance,
    } = useWalletBalance(walletId);

    const { mutateAsync: freezeWallet, isPending: isFreezing } = useFreezeWallet();
    const { mutateAsync: unfreezeWallet, isPending: isUnfreezing } = useUnfreezeWallet();

    const [isConfirmFreezeOpen, setIsConfirmFreezeOpen] = useState(false);
    const [isConfirmUnfreezeOpen, setIsConfirmUnfreezeOpen] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyId = () => {
        if (!wallet) return;
        navigator.clipboard.writeText(wallet.id);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleFreeze = async () => {
        setActionError(null);
        try {
            await freezeWallet(walletId);
            setIsConfirmFreezeOpen(false);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Gagal membekukan rekening';
            setActionError(msg);
        }
    };

    const handleUnfreeze = async () => {
        setActionError(null);
        try {
            await unfreezeWallet(walletId);
            setIsConfirmUnfreezeOpen(false);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Gagal mengaktifkan kembali rekening';
            setActionError(msg);
        }
    };

    if (isWalletLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-44 rounded-xl" />
            </div>
        );
    }

    if (walletError || !wallet) {
        return (
            <div className="space-y-4">
                <Link
                    to="/app/wallets"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Dompet
                </Link>
                <Alert variant="error" title="Dompet Tidak Ditemukan">
                    Rekening dompet dengan ID {walletId} tidak ditemukan atau Anda tidak memiliki akses ke rekening ini.
                </Alert>
            </div>
        );
    }

    const currentBalance = balanceData?.balance ?? wallet.balance;
    const isSyncing = isRefetchingWallet || isRefetchingBalance;

    return (
        <div className="space-y-6">
            <div>
                <Link
                    to="/app/wallets"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-3 transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Dompet
                </Link>

                <PageHeader
                    title={`Dompet ${wallet.currency === 'IDR' ? 'Rupiah (IDR)' : wallet.currency === 'USD' ? 'Dolar AS (USD)' : wallet.currency}`}
                    description="Kelola saldo, periksa informasi akun, dan atur keamanan rekening dompet ini."
                    badge={
                        <Badge
                            variant={
                                wallet.status === 'ACTIVE'
                                    ? 'success'
                                    : wallet.status === 'FROZEN'
                                    ? 'warning'
                                    : 'neutral'
                            }
                        >
                            {wallet.status === 'ACTIVE' ? 'Aktif' : wallet.status === 'FROZEN' ? 'Dibekukan' : wallet.status}
                        </Badge>
                    }
                    action={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    refetchWallet();
                                    refetchBalance();
                                }}
                                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
                                disabled={isSyncing}
                            >
                                Perbarui Saldo
                            </Button>

                            {wallet.status === 'ACTIVE' && (
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setIsConfirmFreezeOpen(true)}
                                    leftIcon={<Snowflake className="w-3.5 h-3.5" />}
                                >
                                    Bekukan Rekening
                                </Button>
                            )}

                            {wallet.status === 'FROZEN' && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setIsConfirmUnfreezeOpen(true)}
                                    leftIcon={<Sun className="w-3.5 h-3.5" />}
                                >
                                    Aktifkan Rekening
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>

            {actionError && (
                <Alert variant="error" title="Gagal Mengubah Status Rekening">
                    {actionError}
                </Alert>
            )}

            {wallet.status === 'FROZEN' && (
                <div className="p-4 rounded-xl border border-amber-800/50 bg-amber-950/20 text-amber-200 text-xs flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block text-white font-semibold">Rekening Sedang Dibekukan</strong>
                        <p className="text-zinc-400 mt-0.5">
                            Demi keamanan Anda, transaksi keluar dan penarikan dana dinonaktifkan sementara.
                            Anda dapat mengaktifkannya kembali kapan saja dengan menekan tombol "Aktifkan Rekening" di atas.
                        </p>
                    </div>
                </div>
            )}

            {/* Grid: Luxury Virtual Card + Saldo Utama Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5">
                    <VirtualDebitCard
                        currency={wallet.currency}
                        balance={currentBalance}
                        walletId={wallet.id}
                        status={wallet.status}
                    />
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#141418] via-[#101014] to-[#0a0a0d] p-6 sm:p-8 shadow-xl space-y-4 text-left">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Saldo Aktif Tersedia
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <ShieldCheck className="w-4 h-4" /> Terverifikasi & Bebas Selisih
                        </span>
                    </div>

                    {isBalanceLoading ? (
                        <Skeleton className="h-12 w-64" />
                    ) : (
                        <div className="text-3xl sm:text-5xl font-bold font-mono tracking-tight text-white">
                            {formatCurrency(currentBalance, wallet.currency)}
                        </div>
                    )}

                    <div className="pt-2 text-xs text-zinc-400 flex items-center gap-2">
                        <span>Nomor Rekening:</span>
                        <button
                            onClick={handleCopyId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0c0c0e] border border-zinc-800 font-mono text-zinc-200 hover:border-zinc-700 transition-colors"
                            title="Klik untuk menyalin"
                        >
                            <span>{wallet.id}</span>
                            {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                            )}
                        </button>
                        {isCopied && <span className="text-emerald-400 text-[11px]">Tersalin!</span>}
                    </div>
                </div>
            </div>

            {/* Informasi Rekening Grid (Human-Friendly) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Rincian Akun Dompet
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs pt-1">
                        <div className="flex justify-between py-2 border-b border-zinc-800/80">
                            <span className="text-zinc-400">Mata Uang</span>
                            <span className="text-white font-bold">{wallet.currency}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-zinc-800/80">
                            <span className="text-zinc-400">Status Operasional</span>
                            <span className="text-white font-medium">
                                {wallet.status === 'ACTIVE' ? 'Aktif Normal' : 'Dibekukan Sementara'}
                            </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-zinc-800/80">
                            <span className="text-zinc-400">Tipe Rekening</span>
                            <span className="text-zinc-200">Dompet Nasabah (Utama)</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-zinc-400">Batas Maksimal Saldo</span>
                            <span className="text-zinc-300">
                                {wallet.max_balance_limit === 0
                                    ? 'Tanpa Batas'
                                    : formatCurrency(wallet.max_balance_limit, wallet.currency)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Keamanan & Catatan Sistem
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs pt-1">
                        <div className="flex justify-between py-2 border-b border-zinc-800/80">
                            <span className="text-zinc-400">Tanggal Dibuat</span>
                            <span className="text-zinc-200">{formatDate(wallet.created_at)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-zinc-800/80">
                            <span className="text-zinc-400">Terakhir Diperbarui</span>
                            <span className="text-zinc-200">{formatDate(wallet.updated_at)}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-zinc-400">Proteksi Transaksi</span>
                            <span className="text-emerald-400 font-medium">Anti Saldo Minus Aktif</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Konfirmasi Pembekuan */}
            <ConfirmDialog
                isOpen={isConfirmFreezeOpen}
                title="Bekukan Rekening Dompet Ini?"
                description="Saat rekening dibekukan, penarikan dana dan transfer uang keluar akan dinonaktifkan sementara demi keamanan. Anda dapat mengaktifkannya kembali kapan saja."
                confirmText="Ya, Bekukan Sekarang"
                confirmVariant="danger"
                isLoading={isFreezing}
                onConfirm={handleFreeze}
                onCancel={() => setIsConfirmFreezeOpen(false)}
            />

            {/* Dialog Konfirmasi Pengaktifan Kembali */}
            <ConfirmDialog
                isOpen={isConfirmUnfreezeOpen}
                title="Aktifkan Kembali Rekening Ini?"
                description="Rekening akan kembali aktif sepenuhnya, dan seluruh fitur pengeluaran atau transfer dana dapat digunakan seperti biasa."
                confirmText="Ya, Aktifkan Rekening"
                confirmVariant="primary"
                isLoading={isUnfreezing}
                onConfirm={handleUnfreeze}
                onCancel={() => setIsConfirmUnfreezeOpen(false)}
            />
        </div>
    );
};
