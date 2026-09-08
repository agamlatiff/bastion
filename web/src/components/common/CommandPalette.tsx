import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    LayoutDashboard,
    WalletCards,
    History,
    User,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    X,
    Sparkles,
} from 'lucide-react';

export interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onTriggerAction?: (actionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    onTriggerAction,
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();

    const commands = [
        {
            id: 'nav-dashboard',
            category: 'Navigasi Menu',
            title: 'Ke Halaman Ringkasan (Dashboard)',
            description: 'Lihat total saldo dan ringkasan keuangan',
            icon: LayoutDashboard,
            action: () => navigate('/app/dashboard'),
        },
        {
            id: 'nav-wallets',
            category: 'Navigasi Menu',
            title: 'Ke Dompet Saya',
            description: 'Kelola seluruh rekening multi-mata uang',
            icon: WalletCards,
            action: () => navigate('/app/wallets'),
        },
        {
            id: 'nav-activity',
            category: 'Navigasi Menu',
            title: 'Ke Riwayat Mutasi',
            description: 'Cek transaksi masuk dan keluar',
            icon: History,
            action: () => navigate('/app/activity'),
        },
        {
            id: 'nav-profile',
            category: 'Navigasi Menu',
            title: 'Ke Profil & Keamanan Akun',
            description: 'Perbarui nama, kontak, dan status',
            icon: User,
            action: () => navigate('/app/profile'),
        },
        {
            id: 'act-transfer',
            category: 'Aksi Cepat',
            title: 'Kirim Uang / Transfer Dana',
            description: 'Kirim saldo ke rekening tujuan',
            icon: ArrowUpRight,
            action: () => {
                if (onTriggerAction) onTriggerAction('transfer');
            },
        },
        {
            id: 'act-topup',
            category: 'Aksi Cepat',
            title: 'Isi Saldo (Top Up)',
            description: 'Tambah saldo via Virtual Account atau QRIS',
            icon: ArrowDownLeft,
            action: () => {
                if (onTriggerAction) onTriggerAction('topup');
            },
        },
        {
            id: 'act-new-wallet',
            category: 'Aksi Cepat',
            title: 'Buka Rekening Dompet Baru',
            description: 'Tambah dompet Rupiah, Dolar, atau SGD',
            icon: Plus,
            action: () => {
                if (onTriggerAction) onTriggerAction('new-wallet');
            },
        },
    ];

    const filtered = commands.filter(
        (c) =>
            c.title.toLowerCase().includes(query.toLowerCase()) ||
            c.description.toLowerCase().includes(query.toLowerCase()) ||
            c.category.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filtered[selectedIndex]) {
                    filtered[selectedIndex].action();
                    onClose();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filtered, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-xs select-none animate-in fade-in duration-100">
            <div className="w-full max-w-lg bg-[#111114] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Search Header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
                    <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                    <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ketik perintah atau cari menu... (contoh: kirim, dompet, profil)"
                        className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                    />
                    <button
                        onClick={onClose}
                        className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Results List */}
                <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-500">
                            Tidak ada perintah yang sesuai dengan "{query}"
                        </div>
                    ) : (
                        filtered.map((item, index) => {
                            const Icon = item.icon;
                            const isSelected = index === selectedIndex;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        item.action();
                                        onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                                        isSelected
                                            ? 'bg-zinc-800/90 text-white'
                                            : 'text-zinc-400 hover:bg-zinc-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                isSelected
                                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-white block">
                                                {item.title}
                                            </span>
                                            <span className="text-[11px] text-zinc-500 block">
                                                {item.description}
                                            </span>
                                        </div>
                                    </div>

                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                                        {item.category}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer Hotkeys Guide */}
                <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-[#0c0c0e] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <div className="flex items-center gap-3">
                        <span>
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                &uarr;&darr;
                            </kbd>{' '}
                            Pilih
                        </span>
                        <span>
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                Enter
                            </kbd>{' '}
                            Buka
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400">
                        <Sparkles className="w-3 h-3" />
                        <span>Bastion Command</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
