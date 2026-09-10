import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { normalizeError } from '../lib/error';

export const LoginPage: React.FC = () => {
    const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
            setFieldErrors({ totpCode: 'Kode autentikasi harus terdiri dari 6 digit angka' });
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
        <Card className="border-zinc-800 bg-[#111114] shadow-xl">
            {step === 'credentials' ? (
                <>
                    <CardHeader className="pb-3 text-left">
                        <CardTitle className="text-lg font-bold text-white">Masuk ke Akun</CardTitle>
                        <CardDescription>
                            Masukkan email dan kata sandi untuk mengakses dasbor keuangan Anda
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-left">
                            {apiError && (
                                <Alert variant="error" title="Gagal Masuk">
                                    {apiError}
                                </Alert>
                            )}

                            <Input
                                label="Alamat Email"
                                type="email"
                                placeholder="nama@email.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                }}
                                error={fieldErrors.email}
                                disabled={isSubmitting}
                                autoComplete="email"
                                autoFocus
                            />

                            <Input
                                label="Kata Sandi"
                                type="password"
                                placeholder="••••••••••••"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                                }}
                                error={fieldErrors.password}
                                disabled={isSubmitting}
                                autoComplete="current-password"
                            />

                            <Button
                                type="submit"
                                className="w-full mt-2"
                                isLoading={isSubmitting}
                                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                            >
                                Masuk Sekarang
                            </Button>
                        </form>

                        <div className="mt-5 pt-3 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
                            Belum memiliki akun?{' '}
                            <Link
                                to="/register"
                                className="text-white font-semibold hover:underline transition-colors"
                            >
                                Daftar akun gratis
                            </Link>
                        </div>
                    </CardContent>
                </>
            ) : (
                <>
                    <CardHeader className="pb-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-2">
                            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <CardTitle className="text-lg font-bold text-white">Verifikasi Keamanan (2FA)</CardTitle>
                        <CardDescription>
                            Akun Anda dilindungi autentikasi dua faktor. Masukkan 6 digit kode dari aplikasi Google Authenticator Anda.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handle2FASubmit} className="space-y-4 text-left">
                            {apiError && (
                                <Alert variant="error" title="Kode Tidak Valid">
                                    {apiError}
                                </Alert>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Kode Autentikasi 6-Digit
                                </label>
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
                                    className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold py-3 px-4 rounded-xl border border-zinc-800 bg-[#09090b] text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                                {fieldErrors.totpCode && (
                                    <p className="mt-1 text-xs text-rose-400">{fieldErrors.totpCode}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full mt-2"
                                isLoading={isSubmitting}
                                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                            >
                                Konfirmasi & Masuk
                            </Button>

                            <button
                                type="button"
                                onClick={() => {
                                    setStep('credentials');
                                    setTotpCode('');
                                    setApiError(null);
                                }}
                                className="w-full py-2 text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Kembali ke login email & kata sandi</span>
                            </button>
                        </form>
                    </CardContent>
                </>
            )}
        </Card>
    );
};
