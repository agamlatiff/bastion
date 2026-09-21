import React, { useState, useMemo } from 'react';
import {
    ShieldCheck,
    Users,
    UserCheck,
    Lock,
    Search,
    RefreshCw,
    UserPlus,
    X,
    Check,
    Copy,
    ShieldAlert,
    AlertCircle,
} from 'lucide-react';
import { useAdminUsers, useAdminRoles, useAssignRole, useRevokeRole } from '../features/admin/hooks';
import type { AdminUser } from '../features/admin/types';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDate } from '../lib/formatters';

export const AdminUsersPage: React.FC = () => {
    const { data, isLoading, error, refetch, isRefetching } = useAdminUsers({ limit: 100, offset: 0 });
    const { data: systemRoles = [] } = useAdminRoles();
    const { mutateAsync: assignRole, isPending: isAssigning } = useAssignRole();
    const { mutateAsync: revokeRole, isPending: isRevoking } = useRevokeRole();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Modal state for assigning a role
    const [assignModalUser, setAssignModalUser] = useState<AdminUser | null>(null);
    const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string>('');
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    // Revoke confirmation dialog state
    const [revokeDialog, setRevokeDialog] = useState<{
        isOpen: boolean;
        user: AdminUser | null;
        role: string;
    }>({
        isOpen: false,
        user: null,
        role: '',
    });

    const users = data?.users || [];

    // Filter users by search and role
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesQuery =
                u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.id.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesRole =
                selectedRoleFilter === 'ALL' ||
                (u.roles && u.roles.includes(selectedRoleFilter));

            return matchesQuery && matchesRole;
        });
    }, [users, searchQuery, selectedRoleFilter]);

    // Summary statistics
    const stats = useMemo(() => {
        const total = users.length;
        const admins = users.filter((u) => u.roles?.includes('ADMIN')).length;
        const customers = users.filter((u) => u.roles?.includes('CUSTOMER')).length;
        return { total, admins, customers };
    }, [users]);

    const handleCopyId = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleOpenAssignModal = (user: AdminUser) => {
        setAssignModalUser(user);
        setActionError(null);
        // Default to first role that the user doesn't already have
        const availableRoles = systemRoles.filter((r) => !user.roles?.includes(r));
        setSelectedRoleToAssign(availableRoles[0] || (systemRoles[0] ?? 'CUSTOMER'));
    };

    const handleAssignRoleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignModalUser || !selectedRoleToAssign) return;
        setActionError(null);
        setActionSuccess(null);

        try {
            await assignRole({ userId: assignModalUser.id, role: selectedRoleToAssign });
            setActionSuccess(`Peran '${selectedRoleToAssign}' berhasil ditambahkan ke ${assignModalUser.email}.`);
            setAssignModalUser(null);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Gagal menambahkan peran. Silakan coba lagi.';
            setActionError(msg);
        }
    };

    const handleConfirmRevoke = async () => {
        if (!revokeDialog.user || !revokeDialog.role) return;
        setActionError(null);
        setActionSuccess(null);

        try {
            await revokeRole({ userId: revokeDialog.user.id, role: revokeDialog.role });
            setActionSuccess(`Peran '${revokeDialog.role}' berhasil dicabut dari ${revokeDialog.user.email}.`);
            setRevokeDialog({ isOpen: false, user: null, role: '' });
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Gagal mencabut peran. Silakan coba lagi.';
            setActionError(msg);
            setRevokeDialog({ isOpen: false, user: null, role: '' });
        }
    };

    const getRoleBadgeVariant = (role: string): 'warning' | 'cyan' | 'default' | 'success' => {
        switch (role) {
            case 'ADMIN':
                return 'warning';
            case 'CUSTOMER':
                return 'cyan';
            case 'AUDITOR':
                return 'success';
            default:
                return 'default';
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tata Kelola Hak Akses & Pengguna"
                description="Panel administrasi multi-role berbasis RBAC untuk inspeksi identitas, penetapan privilege peran, dan pemantauan keamanan akun."
                badge={
                    <Badge variant="warning" showDot={true}>
                        Akses Administrator
                    </Badge>
                }
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
                        disabled={isRefetching}
                    >
                        Segarkan Data
                    </Button>
                }
            />

            {/* Notification Alerts */}
            {actionSuccess && (
                <Alert
                    variant="success"
                    title="Otorisasi Berhasil Diperbarui"
                    message={actionSuccess}
                    className="animate-in fade-in duration-200"
                />
            )}
            {actionError && (
                <Alert
                    variant="danger"
                    title="Gagal Memperbarui Akses"
                    message={actionError}
                    className="animate-in fade-in duration-200"
                />
            )}
            {error && (
                <Alert
                    variant="danger"
                    title="Gagal Memuat Pengguna"
                    message={error.message || 'Terjadi kesalahan saat memuat daftar pengguna dari server.'}
                />
            )}

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-zinc-900/60 border-zinc-800">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">Total Akun Pengguna</span>
                        <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-white font-mono">
                            {isLoading ? '...' : stats.total}
                        </span>
                        <span className="text-[11px] text-zinc-500">terdaftar</span>
                    </div>
                </Card>

                <Card className="p-4 bg-zinc-900/60 border-zinc-800">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">Administrator Aktif</span>
                        <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-amber-300 font-mono">
                            {isLoading ? '...' : stats.admins}
                        </span>
                        <span className="text-[11px] text-zinc-500">dengan hak istimewa</span>
                    </div>
                </Card>

                <Card className="p-4 bg-zinc-900/60 border-zinc-800">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">Pelanggan Retail</span>
                        <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-800/40 text-sky-400">
                            <UserCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-sky-300 font-mono">
                            {isLoading ? '...' : stats.customers}
                        </span>
                        <span className="text-[11px] text-zinc-500">akun standar</span>
                    </div>
                </Card>

                <Card className="p-4 bg-zinc-900/60 border-zinc-800">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">Status RBAC Guard</span>
                        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                            <Lock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-emerald-400 font-mono">
                            100% Enforced
                        </span>
                        <span className="text-[11px] text-zinc-500">403 Forbidden active</span>
                    </div>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Cari email atau User ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-zinc-600 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 shrink-0">Filter Peran:</span>
                    <select
                        value={selectedRoleFilter}
                        onChange={(e) => setSelectedRoleFilter(e.target.value)}
                        className="text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-hidden focus:border-zinc-600 transition-colors"
                    >
                        <option value="ALL">Semua Peran ({users.length})</option>
                        {systemRoles.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* User List Table */}
            <Card className="overflow-hidden border-zinc-800 bg-zinc-900/40">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
                                <th className="py-3 px-4">Pengguna</th>
                                <th className="py-3 px-4">Status Akun</th>
                                <th className="py-3 px-4">Peran (Roles)</th>
                                <th className="py-3 px-4">Terdaftar Sejak</th>
                                <th className="py-3 px-4 text-right">Kelola Hak Akses</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3.5 px-4">
                                            <Skeleton className="h-4 w-44 mb-1" />
                                            <Skeleton className="h-3 w-28" />
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Skeleton className="h-5 w-16" />
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Skeleton className="h-5 w-24" />
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Skeleton className="h-4 w-28" />
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <Skeleton className="h-7 w-20 ml-auto" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12">
                                        <EmptyState
                                            icon={<Users className="w-8 h-8 text-zinc-600" />}
                                            title="Tidak Ada Pengguna"
                                            description="Tidak ada pengguna yang cocok dengan kriteria pencarian Anda."
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => {
                                    const userRoles = u.roles || ['CUSTOMER'];
                                    return (
                                        <tr
                                            key={u.id}
                                            className="hover:bg-zinc-800/30 transition-colors group"
                                        >
                                            {/* User Email & ID */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-zinc-200">
                                                    {u.email}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-mono text-[10px] text-zinc-500 truncate max-w-[180px]">
                                                        {u.id}
                                                    </span>
                                                    <button
                                                        onClick={(e) => handleCopyId(u.id, e)}
                                                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded"
                                                        title="Salin User ID"
                                                    >
                                                        {copiedId === u.id ? (
                                                            <Check className="w-3 h-3 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3.5 px-4">
                                                <Badge
                                                    variant={u.status === 'ACTIVE' ? 'success' : 'danger'}
                                                    showDot={true}
                                                >
                                                    {u.status}
                                                </Badge>
                                            </td>

                                            {/* Role Chips */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {userRoles.map((role) => (
                                                        <span
                                                            key={role}
                                                            className="inline-flex items-center gap-1 group/chip"
                                                        >
                                                            <Badge
                                                                variant={getRoleBadgeVariant(role)}
                                                                showDot={false}
                                                                className="py-0.5 px-2"
                                                            >
                                                                {role === 'ADMIN' && (
                                                                    <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                                                                )}
                                                                <span>{role}</span>
                                                                {/* Revoke button (allowed if user has more than 1 role or if confirmed) */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setRevokeDialog({
                                                                            isOpen: true,
                                                                            user: u,
                                                                            role,
                                                                        })
                                                                    }
                                                                    className="ml-1 text-zinc-400 hover:text-rose-300 transition-colors"
                                                                    title={`Cabut peran ${role}`}
                                                                >
                                                                    <X className="w-2.5 h-2.5" />
                                                                </button>
                                                            </Badge>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                                                {formatDate(u.created_at)}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="xs"
                                                    onClick={() => handleOpenAssignModal(u)}
                                                    leftIcon={<UserPlus className="w-3 h-3" />}
                                                    className="border-zinc-700 hover:border-zinc-500"
                                                >
                                                    Tambah Peran
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal: Assign New Role */}
            {assignModalUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
                    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-amber-400" />
                                <h3 className="text-sm font-bold text-white">
                                    Tetapkan Peran Pengguna
                                </h3>
                            </div>
                            <button
                                onClick={() => setAssignModalUser(null)}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="text-xs text-zinc-300 space-y-2 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                            <div>
                                <span className="text-zinc-500">Pengguna Target: </span>
                                <span className="font-semibold text-zinc-200">{assignModalUser.email}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Peran Saat Ini: </span>
                                <span className="font-mono text-amber-300">
                                    {(assignModalUser.roles || ['CUSTOMER']).join(', ')}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleAssignRoleSubmit} className="space-y-4 pt-1">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-300">
                                    Pilih Peran untuk Diberikan:
                                </label>
                                <select
                                    value={selectedRoleToAssign}
                                    onChange={(e) => setSelectedRoleToAssign(e.target.value)}
                                    className="w-full text-xs bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-amber-500 transition-colors"
                                >
                                    {systemRoles.map((role) => {
                                        const alreadyAssigned = assignModalUser.roles?.includes(role);
                                        return (
                                            <option key={role} value={role} disabled={alreadyAssigned}>
                                                {role} {alreadyAssigned ? '(Sudah Terpasang)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                <p className="text-[11px] text-zinc-500 flex items-center gap-1 pt-1">
                                    <AlertCircle className="w-3 h-3 text-zinc-400" />
                                    Peran baru akan langsung aktif pada sesi autentikasi berikutnya.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAssignModalUser(null)}
                                    disabled={isAssigning}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    isLoading={isAssigning}
                                    leftIcon={<Check className="w-3.5 h-3.5" />}
                                >
                                    Konfirmasi Penetapan
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Revoke Role Confirmation Dialog */}
            <ConfirmDialog
                isOpen={revokeDialog.isOpen}
                title="Konfirmasi Pencabutan Hak Akses"
                description={`Apakah Anda yakin ingin mencabut peran '${revokeDialog.role}' dari pengguna ${revokeDialog.user?.email}? Tindakan ini akan dicatat ke audit log keamanan perbankan.`}
                confirmText="Cabut Hak Akses"
                cancelText="Batal"
                confirmVariant="danger"
                isLoading={isRevoking}
                onConfirm={handleConfirmRevoke}
                onCancel={() => setRevokeDialog({ isOpen: false, user: null, role: '' })}
            />
        </div>
    );
};
