import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export default function Welcome() {
    const navigate = useNavigate()

    return (
        <div className="relative h-screen w-full overflow-hidden font-sans">

            {/* Background: Subtle Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#EEF3FF] to-white z-0" />

            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col items-center w-full px-6 pt-safe pb-safe max-w-md mx-auto h-full">

                {/* Centered Content Wrapper */}
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                    {/* Logo Container */}
                    <div className="w-[120px] h-[120px] bg-white rounded-[26px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] flex items-center justify-center mb-8">
                        <img
                            src="/logo.png"
                            alt="Sunomsi Logo"
                            className="w-[70px] h-[70px] object-contain"
                        />
                    </div>

                    {/* Verified Secure Badge */}
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-10 border border-gray-50/50">
                        <ShieldCheck className="w-4 h-4 text-[#22C55E]" strokeWidth={2.5} />
                        <span className="text-[#6B7280] text-xs font-semibold tracking-wide">VERIFIED SECURE</span>
                    </div>

                    {/* Typography Section */}
                    <div className="text-center space-y-3">
                        <h1 className="text-[32px] font-extrabold text-[#111827] tracking-tight uppercase leading-none">
                            SUNOMSI
                        </h1>
                        <p className="text-[#6B7280] text-[15px] font-medium leading-relaxed max-w-[280px] mx-auto">
                            Access top-rated professionals for any task, instantly.
                            <br />
                            Verified, secure, and fast.
                        </p>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="w-full pb-8">
                    {/* Primary CTA Button */}
                    <button
                        onClick={() => navigate('/auth')}
                        className="w-full h-14 bg-[#0F172A] rounded-2xl flex items-center justify-between pl-6 pr-2 shadow-lg shadow-blue-900/5 active:scale-[0.98] transition-all duration-200 group"
                    >
                        <span className="text-white font-semibold text-[17px]">Get Started</span>
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                    </button>

                    {/* Footer Text */}
                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-[#2c3035] font-medium tracking-[0.2em] uppercase">
                            POWERED BY SUNO.V2
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}