import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    RefreshCw,
    ArrowRight,
    Wallet,
    ShieldCheck,
    CreditCard,
    CheckCircle2,
    Copy,
    Check,
    ArrowUpRight,
    ArrowDownLeft,
} from 'lucide-react';
import { useCustomerProfile } from '../features/customer/hooks';
import { useWallets, useCreateWallet } from '../features/wallet/hooks';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';
import { FinancialChart } from '../components/dashboard/FinancialChart';
import { VirtualDebitCard } from '../components/wallet/VirtualDebitCard';
import { MoneyMovementModal } from '../components/dashboard/MoneyMovementModal';
import { CurrencyConverter } from '../components/dashboard/CurrencyConverter';
import { formatCurrency } from '../lib/formatters';

export const DashboardPage: React.FC = () => {
    const { data: profile, isLoading: isProfileLoading, error: profileError } = useCustomerProfile();
    const { data: wallets = [], isLoading: isWalletsLoading, refetch: refetchWallets, isRefetching } = useWallets();
    const { mutateAsync: createWallet, isPending: isCreatingWallet } = useCreateWallet();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [moneyModalState, setMoneyModalState] = useState<{
        isOpen: boolean;
        mode: 'transfer' | 'topup';
    }>({ isOpen: false, mode: 'topup' });

    const [selectedCurrency, setSelectedCurrency] = useState('IDR');
    const [createError, setCreateError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [simulatedOffset, setSimulatedOffset] = useState<number>(0);

    const displayName = profile?.fullName || profile?.full_name || 'Nasabah';

    // Calculate total balance for IDR wallets + simulated moves
    const totalIdrBalance =
        wallets
            .filter((w) => w.currency === 'IDR' && w.status !== 'CLOSED')
            .reduce((sum, w) => sum + (Number(w.balance) || 0), 0) + simulatedOffset;

    // Calculate other currencies
    const nonIdrWallets = wallets.filter((w) => w.currency !== 'IDR' && w.status !== 'CLOSED');

    const primaryWallet = wallets[0] || {
        id: 'w-default-8492019',
        currency: 'IDR',
        balance: totalIdrBalance,
        status: 'ACTIVE',
    };

    const handleCopyId = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleMoneySuccess = (amount: number, type: 'transfer' | 'topup') => {
        if (type === 'topup') {
            setSimulatedOffset((prev) => prev + amount);
        } else {
            setSimulatedOffset((prev) => Math.max(0, prev - amount));
        }
        refetchWallets();
    };

    const handleCreateWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        try {
            await createWallet({ currency: selectedCurrency });
            setIsCreateModalOpen(false);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Gagal membuka dompet baru. Silakan coba lagi.';
            setCreateError(msg);
        }
    };

    return (
        <div className="space-y-8">
            {profileError && (
                <Alert variant="warning" title="Sinkronisasi Profil">
                    Data profil Anda sedang diperbarui secara otomatis di latar belakang.
                </Alert>
            )}

            {/* UNIFIED FINANCIAL HERO SURFACE (Bukan Card 3 Tumpuk Generik!) */}
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#141418] via-[#101014] to-[#09090b] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left">
                {/* Subtle background glow accent */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-zinc-800/80">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400 font-medium">Selamat datang kembali,</span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Terverifikasi
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            {isProfileLoading ? <Skeleton className="h-8 w-48 inline-block" /> : displayName}
                        </h1>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setMoneyModalState({ isOpen: true, mode: 'topup' })}
                            leftIcon={<ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />}
                        >
                            Isi Saldo
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setMoneyModalState({ isOpen: true, mode: 'transfer' })}
                            leftIcon={<ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />}
                        >
                            Kirim Uang
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsCreateModalOpen(true)}
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                        >
                            Buka Dompet
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetchWallets()}
                            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
                            disabled={isRefetching}
                            className="text-zinc-400 hover:text-white"
                        >
                            Segarkan
                        </Button>
                    </div>
                </div>

                {/* Primary Balance Section */}
                <div className="relative z-10 pt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-emerald-400" />
                            <span>Total Saldo Tersedia</span>
                        </div>

                        {isWalletsLoading ? (
                            <Skeleton className="h-12 w-64 my-1" />
                        ) : (
                            <div className="flex flex-wrap items-baseline gap-3">
                                <div className="text-3xl sm:text-5xl font-bold font-mono tracking-tight text-white">
                                    {formatCurrency(totalIdrBalance, 'IDR')}
                                </div>
                                <span className="text-xs font-mono text-zinc-500 font-medium">
                                    (Rupiah)
                                </span>
                            </div>
                        )}

                        {/* Secondary currency chips if user holds USD or SGD */}
                        {nonIdrWallets.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-xs text-zinc-500 font-medium">Saldo Valas Lainnya:</span>
                                {nonIdrWallets.map((w) => (
                                    <Link
                                        key={w.id}
                                        to={`/app/wallets/${w.id}`}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:border-zinc-700 transition-colors"
                                    >
                                        <span className="text-[10px] text-zinc-500 font-bold">{w.currency}</span>
                                        <span className="font-semibold">{formatCurrency(w.balance, w.currency)}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Integrated Trust & Status Highlights */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-2 lg:pt-0">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                            <CreditCard className="w-4 h-4 text-zinc-300" />
                            <span>
                                <strong className="text-white font-mono">{wallets.filter((w) => w.status === 'ACTIVE').length}</strong> Dompet Aktif
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>Perlindungan Saldo 100%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* GRAFIK TREN KEUANGAN & ARUS KAS (Interactive Fintech Chart) */}
            <FinancialChart currentBalance={totalIdrBalance} currency="IDR" />

            {/* HIGH IMPACT TWO-COLUMN FINTECH SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (7 cols): DOMPET DIGITAL ANDA (Visual Digital Cards Deck) */}
                <div className="lg:col-span-7 space-y-4 text-left">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight">
                                Rekening Dompet Saya
                            </h2>
                            <p className="text-xs text-zinc-400">
                                Pilih dompet untuk melihat rincian saldo dan transaksi.
                            </p>
                        </div>

                        {wallets.length > 0 && (
                            <Link
                                to="/app/wallets"
                                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
                            >
                                Kelola Semua ({wallets.length}) <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>

                    {isWalletsLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-28 rounded-xl" />
                            <Skeleton className="h-28 rounded-xl" />
                        </div>
                    ) : wallets.length === 0 ? (
                        <EmptyState
                            icon={<Wallet className="w-6 h-6 text-zinc-400" />}
                            title="Belum Memiliki Rekening Dompet"
                            description="Buka dompet IDR atau USD pertama Anda untuk mulai menyimpan dan memindahkan dana dengan aman."
                            action={
                                <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                                    Buat Dompet Pertama Saya
                                </Button>
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            {wallets.map((wallet) => (
                                <div
                                    key={wallet.id}
                                    className="group relative rounded-xl border border-zinc-800 hover:border-zinc-700 bg-gradient-to-br from-[#121215] via-[#0f0f12] to-[#09090b] p-4 sm:p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-800/90 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                                            {wallet.currency}
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xs font-bold text-white">
                                                    Dompet {wallet.currency === 'IDR' ? 'Rupiah' : wallet.currency === 'USD' ? 'US Dollar' : wallet.currency}
                                                </h3>
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
                                            </div>

                                            <button
                                                onClick={(e) => handleCopyId(wallet.id, e)}
                                                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
                                                title="Salin Nomor Rekening"
                                            >
                                                <span>Rek: •••• {wallet.id.slice(-4)}</span>
                                                {copiedId === wallet.id ? (
                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                ) : (
                                                    <Copy className="w-3 h-3 text-zinc-500 group-hover:text-zinc-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Balance & Action */}
                                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                                        <div className="sm:text-right">
                                            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block">
                                                Saldo
                                            </span>
                                            <span className="text-base font-bold font-mono text-white">
                                                {formatCurrency(wallet.balance, wallet.currency)}
                                            </span>
                                        </div>

                                        <Link
                                            to={`/app/wallets/${wallet.id}`}
                                            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-white hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
                                        >
                                            Rincian <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>
                            ))}

                            {/* Quick Add Wallet Button */}
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="w-full rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/20 hover:bg-zinc-900/40 p-3.5 flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Tambah Dompet Valas Lainnya (IDR / USD / SGD)</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Column (5 cols): LUXURY 3D CARD & FX CALCULATOR */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Visual 3D Virtual Debit Card */}
                    <div className="space-y-2 text-left">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                                Kartu Virtual Anda
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                                Klik kartu untuk membalik
                            </span>
                        </div>

                        <VirtualDebitCard
                            currency={primaryWallet.currency}
                            balance={Number(primaryWallet.balance) || 0}
                            walletId={primaryWallet.id}
                            holderName={displayName.toUpperCase()}
                            status={primaryWallet.status}
                        />
                    </div>

                    {/* FX Currency Converter Widget */}
                    <CurrencyConverter />
                </div>
            </div>

            {/* QUICK OVERVIEW / ACTIVITY HELPER */}
            <div className="rounded-xl border border-zinc-800 bg-[#111114] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white">Semua Transaksi Tercatat Otomatis</h4>
                        <p className="text-xs text-zinc-400">
                            Setiap mutasi dana selalu seimbang dan tidak bisa hilang. Lihat riwayat lengkap di menu mutasi.
                        </p>
                    </div>
                </div>

                <Link to="/app/activity" className="shrink-0">
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Buka Riwayat Mutasi
                    </Button>
                </Link>
            </div>

            {/* Modal Buka Dompet Baru */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
                    <div className="w-full max-w-sm bg-[#111114] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-5">
                        <div className="space-y-1 text-left">
                            <h3 className="text-base font-bold text-white">Buka Rekening Dompet Baru</h3>
                            <p className="text-xs text-zinc-400">
                                Pilih mata uang yang ingin Anda gunakan untuk dompet ini.
                            </p>
                        </div>

                        {createError && (
                            <Alert variant="error" title="Gagal">
                                {createError}
                            </Alert>
                        )}

                        <form onSubmit={handleCreateWallet} className="space-y-4">
                            <div className="space-y-2 text-left">
                                <label className="block text-xs font-semibold text-zinc-300">
                                    Pilih Mata Uang
                                </label>
                                <div className="space-y-2">
                                    {[
                                        { code: 'IDR', label: 'Rupiah Indonesia (IDR)', desc: 'Untuk transaksi harian & lokal' },
                                        { code: 'USD', label: 'Dolar Amerika (USD)', desc: 'Untuk transaksi internasional' },
                                        { code: 'SGD', label: 'Dolar Singapura (SGD)', desc: 'Untuk transaksi regional Asia Tenggara' },
                                    ].map((item) => (
                                        <label
                                            key={item.code}
                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                                selectedCurrency === item.code
                                                    ? 'bg-zinc-800/80 border-emerald-500/50 text-white'
                                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="space-y-0.5 text-left">
                                                <div className="text-xs font-bold">{item.label}</div>
                                                <div className="text-[11px] text-zinc-400">{item.desc}</div>
                                            </div>
                                            <input
                                                type="radio"
                                                name="currency"
                                                value={item.code}
                                                checked={selectedCurrency === item.code}
                                                onChange={() => setSelectedCurrency(item.code)}
                                                className="text-emerald-500 focus:ring-emerald-500"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isCreatingWallet}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    isLoading={isCreatingWallet}
                                >
                                    Buat Sekarang
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Kirim Uang & Top-Up Simulasi */}
            <MoneyMovementModal
                isOpen={moneyModalState.isOpen}
                mode={moneyModalState.mode}
                wallets={wallets}
                onClose={() => setMoneyModalState({ isOpen: false, mode: 'topup' })}
                onSuccess={handleMoneySuccess}
            />
        </div>
    );
};
