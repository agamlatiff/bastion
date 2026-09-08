import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { normalizeError } from '../lib/error';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app/dashboard';

    const validate = () => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError(null);

        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await login({ email: email.trim(), password });
            navigate(fromLocation, { replace: true });
        } catch (err) {
            const normalized = normalizeError(err);
            setApiError(normalized.message || 'Email atau kata sandi salah');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-zinc-800 bg-[#111114] shadow-xl">
            <CardHeader className="pb-3 text-left">
                <CardTitle className="text-lg font-bold text-white">Masuk ke Akun</CardTitle>
                <CardDescription>
                    Masukkan email dan kata sandi untuk mengakses dasbor keuangan Anda
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
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
        </Card>
    );
};
