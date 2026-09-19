import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { BastionLogo } from '../components/common/BastionLogo';
import { registerApi } from '../features/auth/api';
import { useAuth } from '../features/auth/useAuth';
import { normalizeError } from '../lib/error';

export const RegisterPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const validate = () => {
        const errors: { email?: string; password?: string; confirmPassword?: string } = {};

        if (!email.trim()) {
            errors.email = 'Alamat email wajib diisi';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Format alamat email tidak valid';
        }

        if (!password) {
            errors.password = 'Kata sandi wajib diisi';
        } else if (password.length < 8) {
            errors.password = 'Kata sandi minimal 8 karakter';
        }

        if (password !== confirmPassword) {
            errors.confirmPassword = 'Kata sandi konfirmasi tidak cocok';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError(null);

        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await registerApi({
                email: email.trim(),
                password,
            });

            // Automatically authenticate after successful registration
            await login({
                email: email.trim(),
                password,
            });

            navigate('/app/dashboard', { replace: true });
        } catch (err) {
            const normalized = normalizeError(err);
            setApiError(normalized.message || 'Gagal mendaftarkan akun. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 text-left">
            {/* Top Brand Logo */}
            <div>
                <Link to="/" className="inline-flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-sm group-hover:border-blue-400 transition-colors">
                        <BastionLogo className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="font-heading font-bold text-lg text-white tracking-tight">
                        Bastion
                    </span>
                </Link>
            </div>

            <div className="space-y-6 w-full">
                {/* Header */}
                <div className="space-y-1 text-left">
                    <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
                        Buka Akun Bastion
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400">
                        Mulai dalam 2 menit. Pantau uang usaha tanpa pusing selisih.
                    </p>
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    {apiError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                            {apiError}
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-zinc-300">
                            Alamat Email
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="email"
                                placeholder="nama@bisnisanda.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                }}
                                disabled={isSubmitting}
                                className="w-full py-3 pl-11 pr-4 rounded-xl bg-[#09090b] border border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all"
                                autoFocus
                            />
                        </div>
                        {fieldErrors.email && (
                            <p className="text-[11px] text-rose-400 pl-1">{fieldErrors.email}</p>
                        )}
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-zinc-300">
                            Kata Sandi (Minimal 8 karakter)
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Buat kata sandi akun Anda"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                                }}
                                disabled={isSubmitting}
                                className="w-full py-3 pl-11 pr-11 rounded-xl bg-[#09090b] border border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {fieldErrors.password && (
                            <p className="text-[11px] text-rose-400 pl-1">{fieldErrors.password}</p>
                        )}
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-zinc-300">
                            Ulangi Kata Sandi
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Ketik ulang kata sandi Anda"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                }}
                                disabled={isSubmitting}
                                className="w-full py-3 pl-11 pr-11 rounded-xl bg-[#09090b] border border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                            <p className="text-[11px] text-rose-400 pl-1">{fieldErrors.confirmPassword}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <span>Mendaftarkan akun...</span>
                        ) : (
                            <span>Daftar Sekarang</span>
                        )}
                    </button>
                </form>

                {/* Switch Link */}
                <div className="text-center text-xs text-zinc-400 pt-1">
                    Sudah memiliki akun?{' '}
                    <Link to="/login" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                        Masuk di sini
                    </Link>
                </div>
            </div>

            {/* Bottom Note */}
            <div className="pt-2 text-center text-[11px] text-zinc-500">
                &copy; {new Date().getFullYear()} Bastion. Seluruh hak cipta dilindungi.
            </div>
        </div>
    );
};
