import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, ShieldCheck, ArrowDownLeft, Sparkles } from 'lucide-react';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    type: 'success' | 'security' | 'info';
    read: boolean;
}

export const NotificationCenter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([
        {
            id: '1',
            title: 'Pembukuan Saldo Klop',
            message: 'Seluruh saldo dompet telah diverifikasi seimbang dengan buku besar.',
            timestamp: 'Baru saja',
            type: 'success',
            read: false,
        },
        {
            id: '2',
            title: 'Uang Masuk Terverifikasi',
            message: 'Simulasi top-up berhasil masuk ke dompet IDR sebesar Rp 1.500.000.',
            timestamp: '15 menit lalu',
            type: 'info',
            read: false,
        },
        {
            id: '3',
            title: 'Keamanan Sesi Aktif',
            message: 'Sesi masuk Anda dilindungi dengan token enkripsi ganda tingkat tinggi.',
            timestamp: '2 jam lalu',
            type: 'security',
            read: true,
        },
    ]);

    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleMarkAllRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800"
                title="Pusat Notifikasi"
                aria-label="Buka notifikasi"
            >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#09090b] animate-pulse" />
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#111114] border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">Notifikasi Aktivitas</span>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                                    {unreadCount} baru
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[11px] text-zinc-400 hover:text-white transition-colors"
                            >
                                Tandai Dibaca
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-xs text-zinc-500">
                                Belum ada notifikasi baru
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-3.5 space-y-1 transition-colors hover:bg-zinc-900/40 ${
                                        !n.read ? 'bg-zinc-900/20' : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            {n.type === 'success' ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : n.type === 'security' ? (
                                                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                            ) : (
                                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                                            )}
                                            <span className="text-xs font-bold text-white">
                                                {n.title}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-500">
                                            {n.timestamp}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 pl-5 leading-relaxed">
                                        {n.message}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 border-t border-zinc-800/80 bg-[#0c0c0e] text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>Sistem Keamanan Bastion Aktif 24/7</span>
                    </div>
                </div>
            )}
        </div>
    );
};
