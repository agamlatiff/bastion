import React, { useState } from 'react';
import {
    User,
    CheckCircle2,
    ShieldCheck,
    Mail,
    Calendar,
    KeyRound,
    Copy,
    Check,
    Lock,
    ShieldAlert,
    X,
} from 'lucide-react';
import { useCustomerProfile, useUpdateCustomerProfile } from '../features/customer/hooks';
import { useAuth } from '../features/auth/useAuth';
import { setup2FAApi, enable2FAApi, disable2FAApi } from '../features/auth/api';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Alert } from '../components/ui/Alert';
import { formatDate } from '../lib/formatters';
import type { CustomerProfile } from '../types/customer';

interface ProfileEditFormProps {
    profile: CustomerProfile;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ profile }) => {
    const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdateCustomerProfile();

    const [fullName, setFullName] = useState(
        () => profile.fullName || profile.full_name || ''
    );
    const [phoneNumber, setPhoneNumber] = useState(
        () => profile.phoneNumber || profile.phone_number || ''
    );
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage(null);
        setUpdateError(null);

        try {
            await updateProfile({
                fullName: fullName.trim(),
                phoneNumber: phoneNumber.trim(),
            });
            setSuccessMessage('Informasi profil berhasil disimpan.');
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Gagal memperbarui profil. Silakan coba lagi.';
            setUpdateError(msg);
        }
    };

    return (
        <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Ubah Informasi Pribadi
                </CardTitle>
            </CardHeader>
            <CardContent>
                {successMessage && (
                    <Alert variant="success" title="Berhasil" className="mb-4">
                        {successMessage}
                    </Alert>
                )}

                {updateError && (
                    <Alert variant="error" title="Kendala Pembaruan" className="mb-4">
                        {updateError}
                    </Alert>
                )}

                <form onSubmit={handleUpdate} className="space-y-4 text-left">
                    <Input
                        label="ID Pengguna"
                        value={profile.id}
                        disabled
                        className="font-mono text-xs text-zinc-400 bg-[#0c0c0e]"
                        helperText="ID unik akun Anda yang tersimpan di sistem."
                    />

                    <Input
                        label="Alamat Email"
                        value={profile.email}
                        disabled
                        className="text-xs text-zinc-400 bg-[#0c0c0e]"
                        helperText="Email utama yang Anda gunakan untuk masuk ke akun Bastion."
                    />

                    <Input
                        label="Nama Lengkap"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        disabled={isUpdating}
                    />

                    <Input
                        label="Nomor Telepon / WhatsApp"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        disabled={isUpdating}
                        helperText="Digunakan untuk notifikasi keamanan dan transaksi penting."
                    />

                    <div className="pt-2 flex justify-end">
                        <Button
                            type="submit"
                            size="sm"
                            isLoading={isUpdating}
                            rightIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

// 2FA Management Card & Modal
const SecurityTwoFactorCard: React.FC = () => {
    const { user, setUser } = useAuth();
    const is2FAEnabled = !!user?.two_factor_enabled;

    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);

    // Setup state
    const [setupData, setSetupData] = useState<{ secret: string; qr_code_uri: string } | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleOpenSetup = async () => {
        setErrorMsg(null);
        setVerifyCode('');
        setIsLoading(true);
        try {
            const data = await setup2FAApi();
            setSetupData(data);
            setIsSetupModalOpen(true);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Gagal memulai inisialisasi 2FA.';
            alert(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopySecret = () => {
        if (!setupData?.secret) return;
        navigator.clipboard.writeText(setupData.secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConfirmEnable = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (verifyCode.trim().length !== 6) {
            setErrorMsg('Kode verifikasi harus 6 digit angka.');
            return;
        }

        setIsLoading(true);
        try {
            await enable2FAApi(verifyCode.trim());
            if (user) {
                const updated = { ...user, two_factor_enabled: true };
                setUser(updated);
                localStorage.setItem('user', JSON.stringify(updated));
            }
            setIsSetupModalOpen(false);
            alert('Two-Factor Authentication berhasil diaktifkan!');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Kode verifikasi salah atau kadaluwarsa.';
            setErrorMsg(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (disableCode.trim().length !== 6) {
            setErrorMsg('Kode harus 6 digit angka.');
            return;
        }

        setIsLoading(true);
        try {
            await disable2FAApi(disableCode.trim());
            if (user) {
                const updated = { ...user, two_factor_enabled: false };
                setUser(updated);
                localStorage.setItem('user', JSON.stringify(updated));
            }
            setIsDisableModalOpen(false);
            alert('Two-Factor Authentication berhasil dinonaktifkan.');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Gagal menonaktifkan 2FA. Kode salah.';
            setErrorMsg(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Card className="lg:col-span-3">
                <CardHeader className="pb-3 text-left">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                                <KeyRound className="w-4 h-4" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-white">
                                    Autentikasi Dua Faktor (2FA TOTP)
                                </CardTitle>
                                <p className="text-xs text-zinc-400">
                                    Lindungi akun perbankan Anda dengan verifikasi 6-digit dari Google Authenticator
                                </p>
                            </div>
                        </div>
                        <Badge variant={is2FAEnabled ? 'success' : 'default'}>
                            {is2FAEnabled ? 'AKTIF & AMAN' : 'NONAKTIF'}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="text-left space-y-4">
                    <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                            <span className="font-semibold text-zinc-200 block">
                                {is2FAEnabled
                                    ? 'Perlindungan Maksimal Aktif'
                                    : 'Tingkatkan Keamanan Akun Anda'}
                            </span>
                            <p className="text-zinc-400 leading-relaxed max-w-xl">
                                {is2FAEnabled
                                    ? 'Setiap kali login, Bastion akan meminta kode autentikasi 6 digit dari aplikasi authenticator di ponsel Anda.'
                                    : 'Dengan mengaktifkan 2FA, akun dan saldo Anda tetap aman bahkan jika ada pihak lain yang mengetahui kata sandi Anda.'}
                            </p>
                        </div>

                        {is2FAEnabled ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setDisableCode('');
                                    setErrorMsg(null);
                                    setIsDisableModalOpen(true);
                                }}
                                className="text-rose-400 hover:text-rose-300 hover:border-rose-800 shrink-0"
                            >
                                Nonaktifkan 2FA
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                isLoading={isLoading}
                                onClick={handleOpenSetup}
                                rightIcon={<Lock className="w-3.5 h-3.5" />}
                                className="shrink-0"
                            >
                                Aktifkan 2FA Sekarang
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Setup 2FA Modal */}
            {isSetupModalOpen && setupData && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-bold text-white">Setup Google Authenticator</h3>
                            </div>
                            <button
                                onClick={() => setIsSetupModalOpen(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {errorMsg && (
                            <Alert variant="error" title="Gagal Aktivasi">
                                {errorMsg}
                            </Alert>
                        )}

                        <div className="space-y-3 text-xs text-zinc-300">
                            <p>
                                <strong>Langkah 1:</strong> Buka aplikasi <strong>Google Authenticator</strong> atau <strong>Authy</strong> di HP Anda, pilih <em>"Enter a setup key"</em> lalu masukkan kunci rahasia berikut:
                            </p>

                            {/* Secret Key Display with Copy Button */}
                            <div className="p-3 rounded-xl border border-zinc-800 bg-[#09090b] flex items-center justify-between gap-2 font-mono text-sm font-bold text-emerald-400">
                                <span className="tracking-wider break-all">{setupData.secret}</span>
                                <button
                                    type="button"
                                    onClick={handleCopySecret}
                                    className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0"
                                    title="Salin Secret"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>

                            <p className="text-[11px] text-zinc-500">
                                Atau tautan URI: <code className="break-all font-mono text-zinc-400">{setupData.qr_code_uri}</code>
                            </p>
                        </div>

                        {/* Verification Form */}
                        <form onSubmit={handleConfirmEnable} className="space-y-4 pt-2 border-t border-zinc-800/80">
                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1">
                                    <strong>Langkah 2:</strong> Masukkan 6 Digit Kode Konfirmasi
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center tracking-[0.3em] font-mono text-xl font-bold py-2.5 px-4 rounded-xl border border-zinc-800 bg-[#09090b] text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsSetupModalOpen(false)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    isLoading={isLoading}
                                    rightIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                >
                                    Verifikasi & Aktifkan
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Disable 2FA Modal */}
            {isDisableModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
                                    <ShieldAlert className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-bold text-white">Nonaktifkan 2FA</h3>
                            </div>
                            <button
                                onClick={() => setIsDisableModalOpen(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {errorMsg && (
                            <Alert variant="error" title="Gagal">
                                {errorMsg}
                            </Alert>
                        )}

                        <p className="text-xs text-zinc-400 leading-relaxed">
                            Untuk keamanan, masukkan 6-digit kode autentikasi saat ini untuk mengonfirmasi penonaktifan perlindungan dua faktor akun Anda.
                        </p>

                        <form onSubmit={handleConfirmDisable} className="space-y-4">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="000000"
                                value={disableCode}
                                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full text-center tracking-[0.3em] font-mono text-xl font-bold py-2.5 px-4 rounded-xl border border-zinc-800 bg-[#09090b] text-white focus:outline-none focus:border-rose-500 transition-colors"
                                autoFocus
                            />

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsDisableModalOpen(false)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="outline"
                                    className="border-rose-800 text-rose-400 hover:bg-rose-950"
                                    isLoading={isLoading}
                                >
                                    Konfirmasi Nonaktifkan
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export const ProfilePage: React.FC = () => {
    const { data: profile, isLoading, error, refetch } = useCustomerProfile();

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-44 rounded-xl" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="space-y-4">
                <PageHeader title="Profil Akun" description="Informasi akun pengguna" />
                <Alert variant="warning" title="Sedang Menyelaraskan Data">
                    Informasi profil Anda sedang disinkronkan secara otomatis. Silakan coba segarkan data jika belum muncul.
                </Alert>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Muat Ulang
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Profil Akun & Data Pribadi"
                description="Kelola informasi identitas, nomor kontak, dan status akun terdaftar Anda."
                badge={
                    <Badge variant={profile.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {profile.status === 'ACTIVE' ? 'Akun Aktif' : profile.status}
                    </Badge>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Profile Overview Card */}
                <div className="lg:col-span-1 rounded-xl border border-zinc-800 bg-[#111114] p-5 space-y-5 text-left">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
                            <User className="w-6 h-6 text-zinc-300" />
                        </div>
                        <div className="overflow-hidden">
                            <h3 className="text-sm font-bold text-white truncate">
                                {profile.fullName || profile.full_name || 'Nasabah'}
                            </h3>
                            <p className="text-xs text-zinc-400 truncate">{profile.email}</p>
                        </div>
                    </div>

                    <div className="border-t border-zinc-800/80 pt-4 space-y-3 text-xs">
                        <div className="flex items-center justify-between text-zinc-400">
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Status Akun
                            </span>
                            <span className="text-white font-medium">
                                {profile.status === 'ACTIVE' ? 'Terverifikasi' : profile.status}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-zinc-400">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Terdaftar Sejak
                            </span>
                            <span className="text-zinc-200">
                                {formatDate(profile.createdAt || profile.created_at)}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-zinc-400">
                            <span className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-zinc-500" /> Kontak
                            </span>
                            <span className="text-zinc-200">
                                {profile.phoneNumber || profile.phone_number || 'Belum diisi'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Edit Form Card */}
                <ProfileEditForm profile={profile} />

                {/* 2FA Security Management Card */}
                <SecurityTwoFactorCard />
            </div>
        </div>
    );
};
