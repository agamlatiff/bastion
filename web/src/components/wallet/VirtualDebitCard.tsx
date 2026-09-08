import React, { useState } from 'react';
import { CreditCard, Eye, EyeOff, RotateCw, Wifi, ShieldCheck, Check } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

interface VirtualDebitCardProps {
    currency: string;
    balance: number;
    walletId: string;
    holderName?: string;
    status?: string;
}

export const VirtualDebitCard: React.FC<VirtualDebitCardProps> = ({
    currency,
    balance,
    walletId,
    holderName = 'NASABAH UTAMA',
    status = 'ACTIVE',
}) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showFullNumber, setShowFullNumber] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Format a pseudo card number based on wallet ID
    const cleanId = walletId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const part1 = '4281';
    const part2 = (cleanId.slice(0, 4) || '8839').padEnd(4, '0');
    const part3 = (cleanId.slice(4, 8) || '5920').padEnd(4, '0');
    const part4 = (cleanId.slice(-4) || '1049').padEnd(4, '0');
    const fullCardNumber = `${part1} ${part2} ${part3} ${part4}`;
    const maskedCardNumber = `${part1} •••• •••• ${part4}`;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(fullCardNumber.replace(/\s/g, ''));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Color gradient theme based on currency
    const theme =
        currency === 'USD'
            ? {
                  bg: 'from-[#0d1527] via-[#101c33] to-[#070b14]',
                  border: 'border-blue-500/30',
                  accent: 'text-blue-400',
                  glow: 'rgba(59, 130, 246, 0.15)',
                  flag: '🇺🇸 USD',
                  label: 'Platinum International',
              }
            : currency === 'SGD'
            ? {
                  bg: 'from-[#1e1029] via-[#180b22] to-[#0d0514]',
                  border: 'border-purple-500/30',
                  accent: 'text-purple-400',
                  glow: 'rgba(168, 85, 247, 0.15)',
                  flag: '🇸🇬 SGD',
                  label: 'Regional Elite',
              }
            : {
                  bg: 'from-[#0b1c14] via-[#0f241a] to-[#060e0a]',
                  border: 'border-emerald-500/30',
                  accent: 'text-emerald-400',
                  glow: 'rgba(16, 185, 129, 0.15)',
                  flag: '🇮🇩 IDR',
                  label: 'Titanium Debit',
              };

    return (
        <div className="w-full max-w-sm mx-auto perspective-1000 select-none">
            <div
                className={`relative w-full aspect-[1.586/1] rounded-2xl transition-transform duration-700 transform-style-3d cursor-pointer ${
                    isFlipped ? 'rotate-y-180' : ''
                }`}
                onClick={() => setIsFlipped(!isFlipped)}
                title="Klik untuk membalik kartu"
            >
                {/* SISI DEPAN (FRONT SIDE) */}
                <div
                    className={`absolute inset-0 rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.bg} p-5 sm:p-6 flex flex-col justify-between shadow-2xl backface-hidden overflow-hidden`}
                    style={{
                        boxShadow: `0 20px 40px -15px ${theme.glow}`,
                    }}
                >
                    {/* Subtle Holographic Sheen Layer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />

                    {/* Top Row: Brand, Contactless, Currency Flag */}
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-white text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm">
                                B
                            </div>
                            <span className="text-xs font-bold tracking-widest text-white uppercase">
                                Bastion
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                                &middot; {theme.label}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <Wifi className="w-4 h-4 text-zinc-400 rotate-90" />
                            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-white">
                                {theme.flag}
                            </span>
                        </div>
                    </div>

                    {/* Center: Gold EMV Chip Graphic & Balance Display */}
                    <div className="relative z-10 flex items-center justify-between pt-1">
                        {/* Realistic Gold EMV Chip */}
                        <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/80 shadow-md relative overflow-hidden flex items-center justify-center">
                            <div className="w-full h-px bg-amber-800/40 absolute" />
                            <div className="h-full w-px bg-amber-800/40 absolute" />
                            <div className="w-5 h-4 rounded-xs border border-amber-800/40 absolute" />
                        </div>

                        {/* Fast Balance Pill */}
                        <div className="text-right">
                            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">
                                Saldo Kartu
                            </span>
                            <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-white">
                                {formatCurrency(balance, currency)}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Row: Card Number, Holder Name, Expiry */}
                    <div className="relative z-10 space-y-2">
                        {/* Masked Card Number with Copy Action */}
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-base sm:text-lg tracking-widest text-zinc-100 font-semibold">
                                {showFullNumber ? fullCardNumber : maskedCardNumber}
                            </span>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFullNumber(!showFullNumber);
                                    }}
                                    className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                                    title={showFullNumber ? 'Sembunyikan Nomor' : 'Tampilkan Nomor'}
                                >
                                    {showFullNumber ? (
                                        <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                        <Eye className="w-3.5 h-3.5" />
                                    )}
                                </button>

                                <button
                                    onClick={handleCopy}
                                    className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                                    title="Salin Nomor Kartu"
                                >
                                    {isCopied ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                        <CreditCard className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] uppercase font-mono text-zinc-400 pt-0.5">
                            <div>
                                <span className="text-zinc-500 block text-[9px]">Pemegang Kartu</span>
                                <span className="font-semibold text-zinc-200 tracking-wider">
                                    {holderName}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-right">
                                <div>
                                    <span className="text-zinc-500 block text-[9px]">Berlaku S/D</span>
                                    <span className="font-semibold text-zinc-200">12/29</span>
                                </div>
                                <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                                    <RotateCw className="w-3 h-3 text-zinc-500 animate-spin-slow" />
                                    <span>Putar</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SISI BELAKANG (BACK SIDE - 3D FLIPPED) */}
                <div
                    className={`absolute inset-0 rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.bg} py-5 flex flex-col justify-between shadow-2xl backface-hidden rotate-y-180 overflow-hidden`}
                >
                    {/* Magnetic Stripe */}
                    <div className="w-full h-10 bg-[#09090b] border-y border-white/10" />

                    {/* Signature Panel & CVV */}
                    <div className="px-6 space-y-3">
                        <div className="flex items-center justify-end gap-2">
                            <div className="h-8 flex-1 bg-zinc-200/90 rounded-xs flex items-center px-3 text-zinc-900 font-mono text-xs italic tracking-wider">
                                Bastion Verified Account
                            </div>
                            <div className="h-8 w-14 bg-zinc-950 border border-zinc-700 rounded-xs flex items-center justify-center font-mono text-xs font-bold text-white tracking-widest">
                                842
                            </div>
                        </div>
                        <p className="text-[9px] text-zinc-500 leading-relaxed text-left">
                            Kartu virtual digital ini diterbitkan secara sah oleh sistem Bastion Core. Pembekuan akun dapat dilakukan kapan saja melalui dasbor.
                        </p>
                    </div>

                    {/* Footer Info */}
                    <div className="px-6 flex items-center justify-between text-[10px] text-zinc-400">
                        <div className="flex items-center gap-1.5 text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Status: {status === 'ACTIVE' ? 'Aktif' : 'Dibekukan'}</span>
                        </div>
                        <span className="font-mono text-zinc-500">ID: {walletId.slice(0, 8)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
