import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
    const location = useLocation();
    const isRegister = location.pathname.includes('register');

    return (
        <div className="min-h-screen bg-[#0b1b14] flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-hidden font-sans select-none">
            {/* Ambient Background Glows & Contour Lines */}
            <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-800/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Decorative Vector Topographic Contours in Background */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.035]"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1200 800"
                preserveAspectRatio="none"
            >
                <path d="M0,200 C300,100 600,300 1200,150 L1200,800 L0,800 Z" fill="none" stroke="#ffffff" strokeWidth="2" />
                <path d="M0,350 C400,250 800,450 1200,300" fill="none" stroke="#ffffff" strokeWidth="2" />
                <path d="M0,500 C250,420 650,600 1200,450" fill="none" stroke="#ffffff" strokeWidth="2" />
                <path d="M0,650 C500,550 900,750 1200,600" fill="none" stroke="#ffffff" strokeWidth="2" />
            </svg>

            {/* Main Rounded Split-Screen Card */}
            <div className="w-full max-w-5xl rounded-[2rem] sm:rounded-[2.5rem] bg-white shadow-2xl shadow-black/60 border border-emerald-900/30 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px] relative z-10">
                {/* Left Column: Form Panel (7 cols on LG) */}
                <div className="lg:col-span-7 bg-[#f6f7f2] p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
                    <Outlet />
                </div>

                {/* Right Column: Testimonial & Architectural Vector Art (5 cols on LG) */}
                <div className="hidden lg:flex lg:col-span-5 bg-white p-8 lg:p-11 flex-col justify-between relative overflow-hidden border-l border-zinc-200/70 text-left">
                    {/* Top Testimonial Section */}
                    <div className="space-y-4 pt-3 relative z-10">
                        {/* Giant Quotation Mark */}
                        <span className="text-amber-500 font-serif text-5xl leading-none block select-none">
                            “
                        </span>

                        {/* Testimonial Quote Body */}
                        <p className="text-zinc-800 text-sm sm:text-[15px] font-semibold leading-relaxed">
                            {isRegister
                                ? 'Pencatatan berpasangan otomatis Bastion benar-benar menghilangkan drama selisih kas. Mutasi tersinkronisasi rapi dan saldo anti-minus terbukti diuji secara nyata.'
                                : 'Pengalaman manajemen kas bisnis paling tenang. Rekonsiliasi selesai dalam hitungan detik tanpa perlu lembur menyocokkan mutasi rekening manual.'}
                        </p>

                        <span className="text-amber-500 font-serif text-4xl leading-none block select-none text-right pr-4">
                            ”
                        </span>

                        {/* Author Info */}
                        <div className="flex items-center gap-3 pt-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-800 to-teal-600 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-emerald-600/20">
                                {isRegister ? 'HW' : 'BP'}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-zinc-900">
                                    {isRegister ? 'Hendrik Wijaya' : 'Budi Pratama'}
                                </h4>
                                <p className="text-[11px] text-zinc-500 font-medium">
                                    {isRegister ? 'Co-Founder & CFO, Jakarta' : 'Head of Finance, Bandung'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Architectural Skyline Illustration (Matching User's Reference Image) */}
                    <div className="w-full -mb-8 -mx-4 pt-6 select-none pointer-events-none relative z-0">
                        <svg
                            viewBox="0 0 450 320"
                            className="w-[115%] h-auto overflow-visible"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {/* Building 1 (Far Left Angled Tower) */}
                            <path
                                d="M 10 320 L 70 140 L 145 125 L 140 320 Z"
                                fill="#eef7f2"
                                stroke="#223830"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            {/* Slanted Louvers on Far Left Tower */}
                            <line x1="20" y1="280" x2="60" y2="245" stroke="#223830" strokeWidth="2.5" />
                            <line x1="26" y1="250" x2="66" y2="215" stroke="#223830" strokeWidth="2.5" />
                            <line x1="32" y1="220" x2="72" y2="185" stroke="#223830" strokeWidth="2.5" />
                            <line x1="38" y1="190" x2="78" y2="155" stroke="#223830" strokeWidth="2.5" />

                            {/* Building 2 (Mid-Left Tapered Glass Skyscraper) */}
                            <path
                                d="M 85 320 L 145 125 L 175 145 L 165 320 Z"
                                fill="#ffffff"
                                stroke="#223830"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            {/* Side Facet */}
                            <path
                                d="M 145 125 L 210 170 L 195 320 L 165 320 Z"
                                fill="#f8fafc"
                                stroke="#223830"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            <line x1="105" y1="320" x2="155" y2="155" stroke="#223830" strokeWidth="2.5" />

                            {/* Building 3 (Mid Accent Peach Pavilion) */}
                            <path
                                d="M 195 320 L 195 240 L 265 210 L 265 320 Z"
                                fill="#fed7aa"
                                stroke="#223830"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            {/* Side facet of Peach Pavilion */}
                            <path
                                d="M 265 210 L 285 220 L 285 320 L 265 320 Z"
                                fill="#fdba74"
                                stroke="#223830"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            {/* Vertical stripes on peach building */}
                            <line x1="215" y1="320" x2="215" y2="245" stroke="#223830" strokeWidth="2" />
                            <line x1="235" y1="320" x2="235" y2="235" stroke="#223830" strokeWidth="2" />
                            <line x1="250" y1="320" x2="250" y2="225" stroke="#223830" strokeWidth="2" />

                            {/* Building 4 (Center Tall Financial Headquarters) */}
                            <path
                                d="M 270 320 L 270 110 L 315 90 L 315 320 Z"
                                fill="#ffffff"
                                stroke="#223830"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M 315 90 L 360 110 L 360 320 L 315 320 Z"
                                fill="#f1f5f9"
                                stroke="#223830"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            {/* Columns of Windows on Tall Center Tower */}
                            <line x1="285" y1="125" x2="285" y2="145" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <line x1="300" y1="120" x2="300" y2="140" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <line x1="285" y1="160" x2="285" y2="180" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <line x1="300" y1="155" x2="300" y2="175" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <line x1="285" y1="195" x2="285" y2="215" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <line x1="300" y1="190" x2="300" y2="210" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <line x1="285" y1="230" x2="285" y2="250" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <line x1="300" y1="225" x2="300" y2="245" stroke="#223830" strokeWidth="3" strokeLinecap="round" />

                            {/* Building 5 (Far Right Modern Angular Tower) */}
                            <path
                                d="M 360 320 L 360 170 L 440 220 L 440 320 Z"
                                fill="#ffffff"
                                stroke="#223830"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            <line x1="385" y1="320" x2="385" y2="195" stroke="#223830" strokeWidth="2.5" />
                            <line x1="410" y1="320" x2="410" y2="210" stroke="#223830" strokeWidth="2.5" />

                            {/* Foreground Architectural Trees (Puffy Modern Stylized) */}
                            {/* Tree 1: Left */}
                            <circle cx="105" cy="275" r="22" fill="#ffffff" stroke="#223830" strokeWidth="3" />
                            <path d="M 105 275 L 105 320" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 105 295 L 97 285" stroke="#223830" strokeWidth="2" strokeLinecap="round" />
                            <path d="M 105 290 L 113 280" stroke="#223830" strokeWidth="2" strokeLinecap="round" />

                            {/* Tree 2: Right Double Puffy */}
                            <circle cx="365" cy="265" r="24" fill="#ffffff" stroke="#223830" strokeWidth="3" />
                            <circle cx="395" cy="278" r="18" fill="#ffffff" stroke="#223830" strokeWidth="3" />
                            <path d="M 365 265 L 365 320" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 395 278 L 395 320" stroke="#223830" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 365 290 L 357 280" stroke="#223830" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};
