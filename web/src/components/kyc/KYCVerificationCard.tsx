import React, { useState } from 'react';
import {
    ShieldCheck,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Upload,
    FileText,
    Camera,
    RefreshCw,
    Lock,
    ExternalLink,
} from 'lucide-react';
import { useMyKYC, useSubmitKYC } from '../../features/kyc/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { Skeleton } from '../ui/Skeleton';
import { formatDate } from '../../lib/formatters';

export const KYCVerificationCard: React.FC = () => {
    const { data: kyc, isLoading, refetch, isRefetching } = useMyKYC();
    const { mutateAsync: submitKYC, isPending: isSubmitting } = useSubmitKYC();

    const [isReapplying, setIsReapplying] = useState(false);
    const [nik, setNik] = useState('');
    const [idCardUrl, setIdCardUrl] = useState('');
    const [selfieUrl, setSelfieUrl] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSuccess(null);

        const cleanNik = nik.trim();
        if (cleanNik.length !== 16 || !/^\d+$/.test(cleanNik)) {
            setFormError('Nomor Induk Kependudukan (NIK) harus terdiri dari 16 digit angka.');
            return;
        }

        const cleanIdCardUrl = idCardUrl.trim();
        const cleanSelfieUrl = selfieUrl.trim();

        if (!cleanIdCardUrl) {
            setFormError('Tautan atau berkas foto KTP wajib disertakan.');
            return;
        }

        if (!cleanSelfieUrl) {
            setFormError('Tautan atau berkas foto swafoto (selfie) wajib disertakan.');
            return;
        }

        try {
            await submitKYC({
                id_card_number: cleanNik,
                id_card_image_url: cleanIdCardUrl,
                selfie_image_url: cleanSelfieUrl,
            });

            setFormSuccess('Dokumen verifikasi identitas Anda berhasil dikirim.');
            setIsReapplying(false);
        } catch (err: unknown) {
            const responseData = (err as { response?: { data?: { error?: string } } })?.response?.data;
            const message = responseData?.error || 'Gagal mengirim berkas verifikasi. Silakan coba kembali.';
            setFormError(message);
        }
    };

    if (isLoading) {
        return (
            <Card className="lg:col-span-3">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 rounded-xl" />
                </CardContent>
            </Card>
        );
    }

    const isSubmitted = !!kyc && !isReapplying;

    return (
        <Card className="lg:col-span-3 text-left">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Verifikasi Identitas Nasabah (KYC)</span>
                    </CardTitle>
                    <p className="text-xs text-zinc-400 pt-1">
                        Sesuai standar kepatuhan regulasi finansial untuk melindungi akun dan membuka limit transaksi penuh.
                    </p>
                </div>
                {kyc && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                        className="text-xs text-zinc-400 hover:text-white"
                        leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
                    >
                        Cek Status
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {/* 1. Status: APPROVED */}
                {isSubmitted && kyc.status === 'APPROVED' && (
                    <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-white">Identitas Terverifikasi Penuh</h4>
                                        <Badge variant="success">Resmi Terverifikasi</Badge>
                                    </div>
                                    <p className="text-xs text-emerald-300/80 pt-0.5">
                                        Akun Anda telah memenuhi verifikasi identitas resmi. Seluruh batasan transfer telah ditingkatkan.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-900/50 text-xs">
                            <div className="bg-[#09090b]/80 p-3 rounded-lg border border-zinc-800/80">
                                <span className="text-zinc-500 block">Nomor KTP Terdaftar</span>
                                <span className="font-mono text-zinc-200 font-semibold">{kyc.id_card_number}</span>
                            </div>
                            <div className="bg-[#09090b]/80 p-3 rounded-lg border border-zinc-800/80">
                                <span className="text-zinc-500 block">Waktu Pengajuan</span>
                                <span className="text-zinc-300 font-mono text-[11px]">{formatDate(kyc.submitted_at)}</span>
                            </div>
                            <div className="bg-[#09090b]/80 p-3 rounded-lg border border-zinc-800/80">
                                <span className="text-zinc-500 block">Tanggal Diverifikasi</span>
                                <span className="text-emerald-400 font-mono text-[11px]">
                                    {kyc.verified_at ? formatDate(kyc.verified_at) : 'Terverifikasi'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Status: PENDING */}
                {isSubmitted && kyc.status === 'PENDING' && (
                    <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400 shrink-0">
                                <Clock className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-white">Dokumen Sedang Ditinjau Tim Kepatuhan</h4>
                                    <Badge variant="warning">Menunggu Tinjauan</Badge>
                                </div>
                                <p className="text-xs text-amber-300/80 pt-0.5 leading-relaxed">
                                    Pengajuan identitas Anda telah kami terima dan sedang diverifikasi secara cermat. Proses biasanya memakan waktu maksimal 1x24 jam kerja.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-900/50 text-xs">
                            <div className="bg-[#09090b]/80 p-3 rounded-lg border border-zinc-800/80">
                                <span className="text-zinc-500 block">Nomor KTP Pengajuan</span>
                                <span className="font-mono text-zinc-200 font-semibold">{kyc.id_card_number}</span>
                            </div>
                            <div className="bg-[#09090b]/80 p-3 rounded-lg border border-zinc-800/80">
                                <span className="text-zinc-500 block">Waktu Kirim Berkas</span>
                                <span className="text-zinc-300 font-mono text-[11px]">{formatDate(kyc.submitted_at)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Status: REJECTED */}
                {isSubmitted && kyc.status === 'REJECTED' && (
                    <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-5 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-white">Pengajuan Membutuhkan Perbaikan</h4>
                                        <Badge variant="danger">Perlu Perbaikan</Badge>
                                    </div>
                                    <p className="text-xs text-rose-300/90 pt-1 leading-relaxed">
                                        Alasan penolakan:{' '}
                                        <span className="font-semibold text-white">
                                            {kyc.rejection_reason || 'Foto KTP atau swafoto kurang jelas/tidak cocok.'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsReapplying(true)}
                                className="border-rose-700 text-rose-300 hover:bg-rose-950 shrink-0"
                            >
                                Ajukan Ulang
                            </Button>
                        </div>
                    </div>
                )}

                {/* 4. Form Submission (NOT SUBMITTED OR REAPPLYING) */}
                {(!kyc || isReapplying) && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <Alert variant="error" title="Kendala Pengajuan">
                                {formError}
                            </Alert>
                        )}

                        {formSuccess && (
                            <Alert variant="success" title="Pengajuan Terkirim">
                                {formSuccess}
                            </Alert>
                        )}

                        <div className="p-3.5 rounded-xl bg-[#09090b] border border-zinc-800/80 text-xs text-zinc-400 flex items-start gap-2.5">
                            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                                Seluruh data identitas dan foto Anda disimpan dengan enkripsi standar industri dan hanya digunakan untuk verifikasi kepatuhan anti-pencucian uang.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-1">
                                <Input
                                    label="Nomor KTP (16 Digit NIK)"
                                    placeholder="Contoh: 3201234567890001"
                                    value={nik}
                                    onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                                    disabled={isSubmitting}
                                    className="font-mono text-xs"
                                    helperText="Sesuai kartu identitas resmi KTP Anda."
                                />
                            </div>

                            <div className="sm:col-span-1">
                                <Input
                                    label="Tautan Foto KTP Asli"
                                    placeholder="https://.../ktp.jpg"
                                    value={idCardUrl}
                                    onChange={(e) => setIdCardUrl(e.target.value)}
                                    disabled={isSubmitting}
                                    className="text-xs"
                                    helperText="Pastikan seluruh teks di KTP terbaca jelas."
                                />
                            </div>

                            <div className="sm:col-span-1">
                                <Input
                                    label="Tautan Foto Swafoto (Selfie)"
                                    placeholder="https://.../selfie.jpg"
                                    value={selfieUrl}
                                    onChange={(e) => setSelfieUrl(e.target.value)}
                                    disabled={isSubmitting}
                                    className="text-xs"
                                    helperText="Swafoto wajah menghadap lurus ke kamera."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                            {isReapplying && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsReapplying(false)}
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </Button>
                            )}
                            <Button
                                type="submit"
                                size="sm"
                                isLoading={isSubmitting}
                                rightIcon={<Upload className="w-3.5 h-3.5" />}
                            >
                                Kirim Berkas Verifikasi
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
};
