import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, WalletCards, RefreshCw, Copy, Check, ArrowRight } from 'lucide-react';
import { useWallets, useCreateWallet } from '../features/wallet/hooks';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';
import { formatCurrency, formatDate } from '../lib/formatters';

export const WalletsPage: React.FC = () => {
    const { data: wallets = [], isLoading, error, refetch, isRefetching } = useWallets();
    const { mutateAsync: createWallet, isPending: isCreating } = useCreateWallet();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [currency, setCurrency] = useState('IDR');
    const [createError, setCreateError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyId = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        try {
            await createWallet({ currency });
            setIsCreateOpen(false);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Gagal membuka dompet baru. Silakan coba lagi.';
            setCreateError(msg);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dompet & Rekening Saya"
                description="Kelola seluruh dompet multi-mata uang Anda, pantau saldo aktif, dan atur keamanan rekening."
                action={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
                            disabled={isRefetching}
                        >
                            Perbarui Saldo
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsCreateOpen(true)}
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                        >
                            Buka Dompet Baru
                        </Button>
                    </div>
                }
            />

            {error && (
                <Alert variant="error" title="Gagal Memuat Data Dompet">
                    Koneksi ke sistem dompet sedang mengalami kendala. Silakan klik tombol perbarui di atas.
                </Alert>
            )}

            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                </div>
            ) : wallets.length === 0 ? (
                <EmptyState
                    icon={<WalletCards className="w-6 h-6 text-zinc-400" />}
                    title="Belum Ada Rekening Dompet"
                    description="Anda belum memiliki dompet aktif. Buka dompet Rupiah atau Dolar pertama Anda untuk mulai mengelola keuangan."
                    action={
                        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                            Buka Dompet Pertama Sekarang
                        </Button>
                    }
                />
            ) : (
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-[#111114] shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#0c0c0e] border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 font-semibold">Mata Uang</th>
                                    <th className="p-4 font-semibold">Nomor Rekening</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold hidden md:table-cell">Tanggal Dibuat</th>
                                    <th className="p-4 font-semibold text-right">Saldo Tersedia</th>
                                    <th className="p-4 font-semibold text-right">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                                {wallets.map((wallet) => (
                                    <tr key={wallet.id} className="hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4 font-bold text-white">
                                            <div className="flex items-center gap-2.5">
                                                <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-300 font-mono font-bold">
                                                    {wallet.currency}
                                                </span>
                                                <div>
                                                    <span className="block">{wallet.currency === 'IDR' ? 'Rupiah Indonesia' : wallet.currency === 'USD' ? 'US Dollar' : wallet.currency}</span>
                                                    <span className="text-[10px] text-zinc-500 font-mono font-normal">{wallet.currency}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={(e) => handleCopyId(wallet.id, e)}
                                                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 hover:text-white transition-colors"
                                                title="Klik untuk menyalin nomor rekening"
                                            >
                                                <span>{wallet.id}</span>
                                                {copiedId === wallet.id ? (
                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                ) : (
                                                    <Copy className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-4">
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
                                        </td>
                                        <td className="p-4 text-zinc-400 text-xs hidden md:table-cell">
                                            {formatDate(wallet.created_at)}
                                        </td>
                                        <td className="p-4 font-bold text-right text-white font-mono text-sm tabular-nums">
                                            {formatCurrency(wallet.balance, wallet.currency)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                to={`/app/wallets/${wallet.id}`}
                                                className="text-zinc-300 hover:text-white font-semibold text-xs inline-flex items-center gap-1 transition-colors bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded-md"
                                            >
                                                <span>Rincian</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Buka Dompet Baru */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-sm bg-[#111114] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4">
                        <div className="space-y-1 text-left">
                            <h3 className="text-base font-bold text-white">Buka Dompet Baru</h3>
                            <p className="text-xs text-zinc-400">
                                Pilih mata uang yang ingin digunakan untuk rekening dompet Anda.
                            </p>
                        </div>

                        {createError && (
                            <Alert variant="error" title="Gagal">
                                {createError}
                            </Alert>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2 text-left">
                                <label className="block text-xs font-semibold text-zinc-300">
                                    Pilih Mata Uang
                                </label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full bg-[#0c0c0e] border border-zinc-800 text-white rounded-lg p-2.5 text-xs font-mono focus:border-zinc-500 outline-none"
                                >
                                    <option value="IDR">IDR — Rupiah Indonesia</option>
                                    <option value="USD">USD — Dolar Amerika Serikat</option>
                                    <option value="SGD">SGD — Dolar Singapura</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsCreateOpen(false)}
                                    disabled={isCreating}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    isLoading={isCreating}
                                >
                                    Buka Dompet
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
