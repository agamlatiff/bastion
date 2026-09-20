import React from 'react';
import { Check } from 'lucide-react';

export interface PasswordCriteria {
    label: string;
    met: boolean;
}

export interface PasswordStrengthResult {
    score: number;
    label: string;
    colorClass: string;
    barColor: string;
    criteria: PasswordCriteria[];
}

export const evaluatePasswordStrength = (password: string): PasswordStrengthResult => {
    const criteria: PasswordCriteria[] = [
        { label: 'Min. 8 karakter', met: password.length >= 8 },
        { label: 'Huruf besar & kecil', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
        { label: 'Mengandung angka (0-9)', met: /\d/.test(password) },
        { label: 'Simbol khusus (!@#$...)', met: /[^A-Za-z0-9]/.test(password) },
    ];

    const passedCount = criteria.filter((c) => c.met).length;

    let score = 0;
    let label = '';
    let colorClass = 'text-zinc-500';
    let barColor = 'bg-zinc-800';

    if (!password) {
        return { score: 0, label: '', colorClass, barColor, criteria };
    }

    if (password.length < 8) {
        score = 1;
        label = 'Sangat Lemah';
        colorClass = 'text-rose-400';
        barColor = 'bg-rose-500';
    } else if (passedCount === 1) {
        score = 1;
        label = 'Lemah';
        colorClass = 'text-rose-400';
        barColor = 'bg-rose-500';
    } else if (passedCount === 2) {
        score = 2;
        label = 'Cukup';
        colorClass = 'text-amber-400';
        barColor = 'bg-amber-500';
    } else if (passedCount === 3) {
        score = 3;
        label = 'Kuat';
        colorClass = 'text-emerald-400';
        barColor = 'bg-emerald-500';
    } else {
        score = 4;
        label = 'Sangat Kuat';
        colorClass = 'text-emerald-400 font-bold';
        barColor = 'bg-emerald-400';
    }

    return { score, label, colorClass, barColor, criteria };
};

interface PasswordStrengthMeterProps {
    password: string;
    className?: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
    password,
    className = '',
}) => {
    if (!password) return null;

    const { score, label, colorClass, barColor, criteria } = evaluatePasswordStrength(password);

    return (
        <div className={`space-y-2 pt-1 transition-all duration-300 animate-in fade-in slide-in-from-top-1 ${className}`}>
            {/* 4-Segment Progress Bar & Label */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1 grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                        <div
                            key={step}
                            className={`h-full rounded-full transition-all duration-300 ${
                                step <= score ? barColor : 'bg-zinc-800'
                            }`}
                        />
                    ))}
                </div>
                <span className={`text-[11px] font-semibold tracking-wide shrink-0 ${colorClass}`}>
                    {label}
                </span>
            </div>

            {/* Dynamic 2-Column Security Checklist */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5">
                {criteria.map((item, idx) => (
                    <div
                        key={idx}
                        className={`flex items-center gap-1.5 text-[11px] transition-colors duration-200 ${
                            item.met ? 'text-zinc-200 font-medium' : 'text-zinc-500'
                        }`}
                    >
                        <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                item.met
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                            }`}
                        >
                            {item.met ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                            ) : (
                                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                            )}
                        </div>
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
