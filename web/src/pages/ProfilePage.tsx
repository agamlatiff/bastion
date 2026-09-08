import React, { useState } from 'react';
import { User, CheckCircle2, ShieldCheck, Mail, Calendar } from 'lucide-react';
import { useCustomerProfile, useUpdateCustomerProfile } from '../features/customer/hooks';
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
            </div>
        </div>
    );
};
