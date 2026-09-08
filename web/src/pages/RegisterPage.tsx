import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { registerApi } from '../features/auth/api';
import { useAuth } from '../features/auth/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { normalizeError } from '../lib/error';

export const RegisterPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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
        <Card className="border-zinc-800 bg-[#111114] shadow-xl">
            <CardHeader className="pb-3 text-left">
                <CardTitle className="text-lg font-bold text-white">Daftar Akun Baru</CardTitle>
                <CardDescription>
                    Buat akun gratis untuk mulai mengelola dompet digital dan simpanan Anda
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    {apiError && (
                        <Alert variant="error" title="Pendaftaran Gagal">
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
                        placeholder="Minimal 8 karakter"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        error={fieldErrors.password}
                        disabled={isSubmitting}
                        autoComplete="new-password"
                    />

                    <Input
                        label="Ulangi Kata Sandi"
                        type="password"
                        placeholder="Ketik ulang kata sandi Anda"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }}
                        error={fieldErrors.confirmPassword}
                        disabled={isSubmitting}
                        autoComplete="new-password"
                    />

                    <Button
                        type="submit"
                        className="w-full mt-2"
                        isLoading={isSubmitting}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                        Daftar Akun
                    </Button>
                </form>

                <div className="mt-5 pt-3 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
                    Sudah punya akun?{' '}
                    <Link
                        to="/login"
                        className="text-white font-semibold hover:underline transition-colors"
                    >
                        Masuk di sini
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
};
