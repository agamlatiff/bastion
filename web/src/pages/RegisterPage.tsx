import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { registerApi } from '../features/auth/api';
import { useAuth } from '../features/auth/useAuth';
import { normalizeError } from '../lib/error';

export const RegisterPage: React.FC = () => {
    const [role, setRole] = useState<'owner' | 'finance'>('owner');
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
        <div className="flex flex-col justify-between h-full space-y-6">
            {/* Top Brand Logo */}
            <div>
                <Link to="/" className="inline-flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-[#183f30] text-emerald-400 flex items-center justify-center shadow-sm">
                        <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="font-heading font-extrabold text-lg text-zinc-900 tracking-tight">
                        Bastion
                    </span>
                </Link>
            </div>

            <div className="space-y-5 max-w-md mx-auto w-full">
                {/* Header */}
                <div className="text-center space-y-1.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-heading tracking-tight">
                        Sign Up
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500">
                        Mulai kelola dompet kas dan pembukuan bisnis Anda dalam hitungan menit
                    </p>
                </div>

                {/* Role Switcher (Matching Reference) */}
                <div className="flex items-center justify-center gap-6 text-xs font-semibold text-zinc-700 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="radio"
                            name="role"
                            checked={role === 'owner'}
                            onChange={() => setRole('owner')}
                            className="w-4 h-4 text-[#183f30] accent-[#183f30] focus:ring-0 cursor-pointer"
                        />
                        <span>Pemilik Bisnis</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="radio"
                            name="role"
                            checked={role === 'finance'}
                            onChange={() => setRole('finance')}
                            className="w-4 h-4 text-[#183f30] accent-[#183f30] focus:ring-0 cursor-pointer"
                        />
                        <span>Tim Keuangan</span>
                    </label>
                </div>

                {/* Social Auth Buttons */}
                <div className="space-y-2.5">
                    {/* Google Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setEmail(`demo.user${Math.floor(Math.random() * 899 + 100)}@bastion.id`);
                            setPassword('Password123!');
                            setConfirmPassword('Password123!');
                        }}
                        className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200/90 shadow-sm text-xs font-semibold text-zinc-700 flex items-center justify-center gap-2.5 transition-all"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Sign up with Google</span>
                    </button>

                    {/* Apple Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setEmail(`demo.finance${Math.floor(Math.random() * 899 + 100)}@bastion.id`);
                            setPassword('Password123!');
                            setConfirmPassword('Password123!');
                        }}
                        className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200/90 shadow-sm text-xs font-semibold text-zinc-700 flex items-center justify-center gap-2.5 transition-all"
                    >
                        <svg className="w-4 h-4 fill-current text-zinc-900" viewBox="0 0 24 24">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.47c.65-.79 1.1-1.88.98-2.97-.95.04-2.1.64-2.78 1.43-.59.69-1.12 1.8-0.98 2.88 1.07.08 2.13-.55 2.78-1.34z" />
                        </svg>
                        <span>Sign up with Apple</span>
                    </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-zinc-200" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        OR
                    </span>
                    <div className="flex-1 h-px bg-zinc-200" />
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
                    {apiError && (
                        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                            {apiError}
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-700">
                            Email <span className="text-emerald-700">*</span>
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="email"
                                placeholder="hello@delisas.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                }}
                                disabled={isSubmitting}
                                className="w-full py-3 pl-11 pr-4 rounded-full bg-white border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#183f30] focus:ring-2 focus:ring-[#183f30]/15 shadow-sm transition-all"
                                autoFocus
                            />
                        </div>
                        {fieldErrors.email && (
                            <p className="text-[11px] text-rose-600 pl-4">{fieldErrors.email}</p>
                        )}
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-700">
                            Password (Min. 8 karakter) <span className="text-emerald-700">*</span>
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                                }}
                                disabled={isSubmitting}
                                className="w-full py-3 pl-11 pr-11 rounded-full bg-white border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#183f30] focus:ring-2 focus:ring-[#183f30]/15 shadow-sm transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {fieldErrors.password && (
                            <p className="text-[11px] text-rose-600 pl-4">{fieldErrors.password}</p>
                        )}
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-700">
                            Confirm Password <span className="text-emerald-700">*</span>
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Ulangi kata sandi"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                }}
                                disabled={isSubmitting}
                                className="w-full py-3 pl-11 pr-11 rounded-full bg-white border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#183f30] focus:ring-2 focus:ring-[#183f30]/15 shadow-sm transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                            <p className="text-[11px] text-rose-600 pl-4">{fieldErrors.confirmPassword}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-2 py-3.5 px-6 rounded-full bg-[#183f30] hover:bg-[#122e23] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-[#183f30]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                    >
                        {isSubmitting ? (
                            <span>Mendaftarkan akun...</span>
                        ) : (
                            <span>Sign Up</span>
                        )}
                    </button>
                </form>

                {/* Switch Link */}
                <div className="text-center text-xs text-zinc-600 pt-1">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#183f30] font-bold hover:underline">
                        Sign In
                    </Link>
                </div>
            </div>

            {/* Bottom Safe Note */}
            <div className="pt-2 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Buka Akun Instan • Standar Keamanan Perbankan 256-Bit</span>
            </div>
        </div>
    );
};
