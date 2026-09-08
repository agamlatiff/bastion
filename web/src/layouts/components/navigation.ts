import { LayoutDashboard, WalletCards, History, User } from 'lucide-react';

export const navigationItems = [
    { name: 'Ringkasan', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Dompet Saya', href: '/app/wallets', icon: WalletCards },
    { name: 'Riwayat Mutasi', href: '/app/activity', icon: History },
    { name: 'Profil Akun', href: '/app/profile', icon: User },
];
