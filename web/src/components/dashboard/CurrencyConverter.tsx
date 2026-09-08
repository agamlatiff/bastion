import React, { useState } from 'react';
import { ArrowLeftRight, TrendingUp, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

export const CurrencyConverter: React.FC = () => {
    const [fromCurrency, setFromCurrency] = useState<'USD' | 'IDR' | 'SGD'>('USD');
    const [toCurrency, setToCurrency] = useState<'USD' | 'IDR' | 'SGD'>('IDR');
    const [amount, setAmount] = useState<string>('100');

    // Exchange rates against IDR base
    const ratesInIdr: Record<'USD' | 'IDR' | 'SGD', number> = {
        IDR: 1,
        USD: 15850,
        SGD: 11920,
    };

    const handleSwap = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const numAmount = parseFloat(amount) || 0;
    const amountInIdr = numAmount * ratesInIdr[fromCurrency];
    const convertedAmount = amountInIdr / ratesInIdr[toCurrency];

    const currentRate = ratesInIdr[fromCurrency] / ratesInIdr[toCurrency];

    return (
        <div className="rounded-2xl border border-zinc-800 bg-[#111114] p-5 shadow-xl space-y-4 text-left">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Kalkulator Kurs & Valas
                    </h3>
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <TrendingUp className="w-3 h-3" /> Kurs Real-Time
                </span>
            </div>

            {/* Converter Input Strip */}
            <div className="space-y-3">
                {/* From Input */}
                <div className="p-3 rounded-xl bg-[#0c0c0e] border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                            Dari
                        </span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-transparent text-white font-mono text-base font-bold outline-none"
                            placeholder="0"
                        />
                    </div>

                    <select
                        value={fromCurrency}
                        onChange={(e) => setFromCurrency(e.target.value as 'USD' | 'IDR' | 'SGD')}
                        className="bg-zinc-900 border border-zinc-800 text-white font-mono text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                    >
                        <option value="USD">🇺🇸 USD</option>
                        <option value="IDR">🇮🇩 IDR</option>
                        <option value="SGD">🇸🇬 SGD</option>
                    </select>
                </div>

                {/* Swap Button Divider */}
                <div className="flex items-center justify-center -my-2 relative z-10">
                    <button
                        onClick={handleSwap}
                        className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center shadow-lg transition-transform duration-200 hover:rotate-180"
                        title="Tukar Arah Mata Uang"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* To Output */}
                <div className="p-3 rounded-xl bg-[#0c0c0e] border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                            Hasil Konversi (Estimasi)
                        </span>
                        <div className="text-white font-mono text-base font-bold truncate">
                            {formatCurrency(Math.round(convertedAmount * 100) / 100, toCurrency)}
                        </div>
                    </div>

                    <select
                        value={toCurrency}
                        onChange={(e) => setToCurrency(e.target.value as 'USD' | 'IDR' | 'SGD')}
                        className="bg-zinc-900 border border-zinc-800 text-white font-mono text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                    >
                        <option value="IDR">🇮🇩 IDR</option>
                        <option value="USD">🇺🇸 USD</option>
                        <option value="SGD">🇸🇬 SGD</option>
                    </select>
                </div>
            </div>

            {/* Rate Indicator Footnote */}
            <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>Nilai Tukar:</span>
                <span className="text-zinc-300 font-semibold">
                    1 {fromCurrency} = {currentRate < 1 ? currentRate.toFixed(4) : currentRate.toLocaleString('id-ID')} {toCurrency}
                </span>
            </div>
        </div>
    );
};
