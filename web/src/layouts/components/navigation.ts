import { LayoutDashboard, WalletCards, History, User, ShieldCheck } from 'lucide-react';

export const navigationItems = [
    { name: 'Ringkasan', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Dompet Saya', href: '/app/wallets', icon: WalletCards },
    { name: 'Riwayat Mutasi', href: '/app/activity', icon: History },
    { name: 'Profil Akun', href: '/app/profile', icon: User },
];

export const adminNavigationItems = [
    { name: 'Akses & Pengguna', href: '/app/admin/users', icon: ShieldCheck },
];

