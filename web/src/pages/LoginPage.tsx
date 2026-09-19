import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import { BastionLogo } from '../components/common/BastionLogo';
import { useAuth } from '../features/auth/useAuth';
import { normalizeError } from '../lib/error';

export const LoginPage: React.FC = () => {
    const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
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

            {step === 'credentials' ? (
                <div className="space-y-6 w-full">
                    {/* Header */}
                    <div className="space-y-1 text-left">
                        <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
                            Masuk ke Akun
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-400">
                            Lanjutkan kelola kas usaha Anda dengan tenang.
                        </p>
                    </div>

                    {/* Form Inputs */}
                    <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-left">
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
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-semibold text-zinc-300">
                                    Kata Sandi
                                </label>
                                <span className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
                                    Lupa kata sandi?
                                </span>
                            </div>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Masukkan kata sandi Anda"
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <span>Memverifikasi...</span>
                            ) : (
                                <span>Masuk ke Akun</span>
                            )}
                        </button>
                    </form>

                    {/* Switch Link */}
                    <div className="text-center text-xs text-zinc-400 pt-1">
                        Belum memiliki akun?{' '}
                        <Link to="/register" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                            Buka akun gratis
                        </Link>
                    </div>
                </div>
            ) : (
                /* 2FA Mode */
                <div className="space-y-6 max-w-md mx-auto w-full text-center">
                    <div className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                            <BastionLogo className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <h2 className="text-xl font-bold text-white font-heading">
                            Verifikasi Keamanan (2FA)
                        </h2>
                        <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                            Masukkan 6 digit kode dari aplikasi Google Authenticator Anda.
                        </p>
                    </div>

                    <form onSubmit={handle2FASubmit} className="space-y-5">
                        {apiError && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
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
                                className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold py-3 px-4 rounded-xl border border-zinc-800 bg-[#09090b] text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all"
                            />
                            {fieldErrors.totpCode && (
                                <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.totpCode}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
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
                            className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Kembali ke login email & sandi</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Bottom Note */}
            <div className="pt-2 text-center text-[11px] text-zinc-500">
                &copy; {new Date().getFullYear()} Bastion. Seluruh hak cipta dilindungi.
            </div>
        </div>
    );
};
