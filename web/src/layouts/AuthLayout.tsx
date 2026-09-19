import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
    const location = useLocation();
    const isRegister = location.pathname.includes('register');

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-hidden bg-grid-subtle select-none">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[350px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Split-Screen Card (Bastion Dark Theme) */}
            <div className="w-full max-w-5xl rounded-3xl bg-[#111114] border border-zinc-800/90 shadow-2xl shadow-black/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] relative z-10">
                {/* Left Column: Form Panel (7 cols on LG) */}
                <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
                    <Outlet />
                </div>

                {/* Right Column: Grounded Testimonial & Dark Architectural Art (5 cols on LG) */}
                <div className="hidden lg:flex lg:col-span-5 bg-[#0d0d10] border-l border-zinc-800/80 p-8 lg:p-11 flex-col justify-between relative overflow-hidden text-left">
                    {/* Testimonial Quote */}
                    <div className="space-y-4 pt-2 relative z-10">
                        <span className="text-amber-400 font-serif text-5xl leading-none block select-none">
                            “
                        </span>

                        <p className="text-zinc-300 text-sm sm:text-[15px] font-medium leading-relaxed">
                            {isRegister
                                ? 'Buka akunnya cuma butuh waktu sebentar. Sekarang pantau uang usaha harian rasanya jauh lebih tenang karena semua catatan kas langsung rapi dari awal.'
                                : 'Dulu tiap akhir bulan selalu tegang nyari selisih uang di catatan kas. Sejak pakai Bastion, uang masuk dan keluar selalu pas sampai ke rupiah terakhir, tidak perlu pusing lembur hitung ulang.'}
                        </p>

                        <span className="text-amber-400 font-serif text-4xl leading-none block select-none text-right pr-3">
                            ”
                        </span>

                        {/* Author Info */}
                        <div className="flex items-center gap-3 pt-1">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 text-blue-400 font-bold flex items-center justify-center text-xs shadow-sm">
                                {isRegister ? 'SM' : 'DW'}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">
                                    {isRegister ? 'Sarah Mahendra' : 'Dimas Wicaksono'}
                                </h4>
                                <p className="text-[11px] text-zinc-400 font-medium">
                                    {isRegister ? 'Pengelola Usaha Retail, Bandung' : 'Pemilik Kedai Kopi, Jakarta'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Dark Mode Architectural Skyline Illustration */}
                    <div className="w-full -mb-8 -mx-4 pt-6 select-none pointer-events-none relative z-0 opacity-85">
                        <svg
                            viewBox="0 0 450 320"
                            className="w-[115%] h-auto overflow-visible"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {/* Building 1 (Far Left Angled Tower) */}
                            <path
                                d="M 10 320 L 70 140 L 145 125 L 140 320 Z"
                                fill="#15151c"
                                stroke="#3f3f46"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                            />
                            <line x1="20" y1="280" x2="60" y2="245" stroke="#27272a" strokeWidth="2" />
                            <line x1="26" y1="250" x2="66" y2="215" stroke="#27272a" strokeWidth="2" />
                            <line x1="32" y1="220" x2="72" y2="185" stroke="#27272a" strokeWidth="2" />
                            <line x1="38" y1="190" x2="78" y2="155" stroke="#27272a" strokeWidth="2" />

                            {/* Building 2 (Mid-Left Tapered Glass Skyscraper) */}
                            <path
                                d="M 85 320 L 145 125 L 175 145 L 165 320 Z"
                                fill="#181822"
                                stroke="#52525b"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M 145 125 L 210 170 L 195 320 L 165 320 Z"
                                fill="#121218"
                                stroke="#3f3f46"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                            />
                            <line x1="105" y1="320" x2="155" y2="155" stroke="#38bdf8" strokeWidth="1.5" opacity="0.4" />

                            {/* Building 3 (Mid Accent Pavilion) */}
                            <path
                                d="M 195 320 L 195 240 L 265 210 L 265 320 Z"
                                fill="#1c1917"
                                stroke="#52525b"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M 265 210 L 285 220 L 285 320 L 265 320 Z"
                                fill="#171513"
                                stroke="#3f3f46"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                            />
                            <line x1="215" y1="320" x2="215" y2="245" stroke="#3f3f46" strokeWidth="1.5" />
                            <line x1="235" y1="320" x2="235" y2="235" stroke="#3f3f46" strokeWidth="1.5" />
                            <line x1="250" y1="320" x2="250" y2="225" stroke="#3f3f46" strokeWidth="1.5" />

                            {/* Building 4 (Center Tall Financial Headquarters) */}
                            <path
                                d="M 270 320 L 270 110 L 315 90 L 315 320 Z"
                                fill="#1a1a24"
                                stroke="#60a5fa"
                                strokeWidth="2"
                                strokeLinejoin="round"
                                opacity="0.9"
                            />
                            <path
                                d="M 315 90 L 360 110 L 360 320 L 315 320 Z"
                                fill="#14141c"
                                stroke="#3f3f46"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                            />
                            {/* Window Columns */}
                            <line x1="285" y1="125" x2="285" y2="145" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                            <line x1="300" y1="120" x2="300" y2="140" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                            <line x1="285" y1="160" x2="285" y2="180" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                            <line x1="300" y1="155" x2="300" y2="175" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                            <line x1="285" y1="195" x2="285" y2="215" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                            <line x1="300" y1="190" x2="300" y2="210" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

                            {/* Building 5 (Far Right Tower) */}
                            <path
                                d="M 360 320 L 360 170 L 440 220 L 440 320 Z"
                                fill="#16161e"
                                stroke="#3f3f46"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                            />
                            <line x1="385" y1="320" x2="385" y2="195" stroke="#27272a" strokeWidth="2" />
                            <line x1="410" y1="320" x2="410" y2="210" stroke="#27272a" strokeWidth="2" />

                            {/* Foreground Architectural Trees */}
                            <circle cx="105" cy="275" r="22" fill="#18181b" stroke="#52525b" strokeWidth="2.5" />
                            <path d="M 105 275 L 105 320" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" />

                            <circle cx="365" cy="265" r="24" fill="#18181b" stroke="#52525b" strokeWidth="2.5" />
                            <circle cx="395" cy="278" r="18" fill="#18181b" stroke="#52525b" strokeWidth="2.5" />
                            <path d="M 365 265 L 365 320" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M 395 278 L 395 320" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};
