import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { normalizeError } from '../lib/error';

export const LoginPage: React.FC = () => {
    const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
    const [role, setRole] = useState<'owner' | 'finance'>('owner');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [totpCode, setTotpCode] = useState('');

    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; totpCode?: string }>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, verify2FA } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app/dashboard';

    const validateCredentials = () => {
        const errors: { email?: string; password?: string } = {};
        if (!email.trim()) {
            errors.email = 'Alamat email wajib diisi';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Format alamat email tidak valid';
        }

        if (!password) {
            errors.password = 'Kata sandi wajib diisi';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError(null);

        if (!validateCredentials()) return;

        setIsSubmitting(true);
        try {
            const res = await login({ email: email.trim(), password });
            if (res.two_factor_required && res.temp_token) {
                setTempToken(res.temp_token);
                setStep('2fa');
                return;
            }
            navigate(fromLocation, { replace: true });
        } catch (err) {
            const normalized = normalizeError(err);
            setApiError(normalized.message || 'Email atau kata sandi salah');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handle2FASubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError(null);

        if (totpCode.trim().length !== 6) {
            setFieldErrors({ totpCode: 'Kode autentikasi harus 6 digit angka' });
            return;
        }

        setIsSubmitting(true);
        try {
            await verify2FA(tempToken, totpCode.trim());
            navigate(fromLocation, { replace: true });
        } catch (err) {
            const normalized = normalizeError(err);
            setApiError(normalized.message || 'Kode 2FA salah atau telah kadaluwarsa');
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

            {step === 'credentials' ? (
                <div className="space-y-6 max-w-md mx-auto w-full">
                    {/* Header */}
                    <div className="text-center space-y-1.5">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-heading tracking-tight">
                            Sign In
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-500">
                            Selamat datang kembali! Silakan masukkan detail akun Anda
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
                                setEmail('demo.owner@bastion.id');
                                setPassword('Password123!');
                            }}
                            className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200/90 shadow-sm text-xs font-semibold text-zinc-700 flex items-center justify-center gap-2.5 transition-all"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>Sign in with Google</span>
                        </button>

                        {/* Apple Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setEmail('demo.finance@bastion.id');
                                setPassword('Password123!');
                            }}
                            className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200/90 shadow-sm text-xs font-semibold text-zinc-700 flex items-center justify-center gap-2.5 transition-all"
                        >
                            <svg className="w-4 h-4 fill-current text-zinc-900" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.47c.65-.79 1.1-1.88.98-2.97-.95.04-2.1.64-2.78 1.43-.59.69-1.12 1.8-0.98 2.88 1.07.08 2.13-.55 2.78-1.34z" />
                            </svg>
                            <span>Sign in with Apple</span>
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
                    <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-left">
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
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-zinc-700">
                                    Password <span className="text-emerald-700">*</span>
                                </label>
                                <span className="text-xs font-semibold text-[#183f30] hover:underline cursor-pointer">
                                    Forgot password?
                                </span>
                            </div>
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-2 py-3.5 px-6 rounded-full bg-[#183f30] hover:bg-[#122e23] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-[#183f30]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <span>Memproses...</span>
                            ) : (
                                <span>Sign In</span>
                            )}
                        </button>
                    </form>

                    {/* Switch Link */}
                    <div className="text-center text-xs text-zinc-600 pt-1">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-[#183f30] font-bold hover:underline">
                            Sign Up
                        </Link>
                    </div>
                </div>
            ) : (
                /* 2FA Mode */
                <div className="space-y-6 max-w-md mx-auto w-full text-center">
                    <div className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#183f30] flex items-center justify-center mx-auto shadow-sm">
                            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-900 font-heading">
                            Verifikasi 2-Langkah (2FA)
                        </h2>
                        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                            Masukkan 6 digit kode dari aplikasi authenticator Anda untuk melanjutkan.
                        </p>
                    </div>

                    <form onSubmit={handle2FASubmit} className="space-y-5">
                        {apiError && (
                            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                                {apiError}
                            </div>
                        )}

                        <div>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                placeholder="000000"
                                value={totpCode}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setTotpCode(val);
                                    if (fieldErrors.totpCode) setFieldErrors((prev) => ({ ...prev, totpCode: undefined }));
                                }}
                                disabled={isSubmitting}
                                autoFocus
                                className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold py-3 px-4 rounded-full border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-[#183f30] focus:ring-2 focus:ring-[#183f30]/15 transition-all shadow-sm"
                            />
                            {fieldErrors.totpCode && (
                                <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.totpCode}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 px-6 rounded-full bg-[#183f30] hover:bg-[#122e23] text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            <span>Konfirmasi & Masuk</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setStep('credentials');
                                setTotpCode('');
                                setApiError(null);
                            }}
                            className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Kembali ke form masuk</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Bottom Safe Note */}
            <div className="pt-2 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enkripsi Bank-Grade 256-Bit • Bastion Financial Core</span>
            </div>
        </div>
    );
};
