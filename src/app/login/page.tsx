'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const savedEmail = localStorage.getItem('spa_remembered_email')
        if (savedEmail) {
            setEmail(savedEmail)
            setRememberMe(true)
        }
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        if (rememberMe) {
            localStorage.setItem('spa_remembered_email', email)
        } else {
            localStorage.removeItem('spa_remembered_email')
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            toast.error('Giriş başarısız: ' + error.message)
        } else {
            toast.success('Hoş geldiniz! Yönlendiriliyorsunuz...')
            router.push('/dashboard')
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: 'radial-gradient(circle at center, #1a1a1a 0%, #050505 100%)' }}>
            {/* Dekoratif Arka Plan Işıkları */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full mix-blend-screen mix-blend-lighten blur-[120px] opacity-20 pointer-events-none"
                style={{ background: '#C9A84C' }} />
            <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] rounded-full mix-blend-screen blur-[150px] opacity-10 pointer-events-none"
                style={{ background: '#D4AF37' }} />

            {/* Arka Plan Desenleri */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#C9A84C 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            <div className="w-full max-w-[420px] px-8 py-12 relative z-10 glass-card border border-white/5 shadow-2xl rounded-3xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="w-40 h-32 mx-auto -mb-6 flex items-center justify-center relative group">
                        <div className="absolute inset-0 bg-[var(--gold-primary)]/20 rounded-full blur-2xl group-hover:bg-[var(--gold-primary)]/30 transition-all duration-500 scale-75 group-hover:scale-110"></div>
                        <img src="/spav2-app-logo.png" alt="SpaV2 Logo" className="w-full h-full object-contain drop-shadow-2xl relative z-10" />
                    </div>
                    <h1 className="text-3xl font-extrabold gradient-gold mb-2 tracking-tight">SpaV2</h1>
                    <p className="text-[var(--gold-primary)]/80 text-xs tracking-[0.2em] font-medium uppercase">Premium Wellness</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider ml-1">E-posta Adresi</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="ornek@spav2.com"
                            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-[var(--text-primary)] placeholder:text-white/20 focus:outline-none focus:border-[var(--gold-primary)] focus:bg-white/10 focus:ring-4 focus:ring-[var(--gold-primary)]/10 transition-all duration-300 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider ml-1">Şifre</label>
                        <div className="relative group">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-[var(--text-primary)] placeholder:text-white/20 focus:outline-none focus:border-[var(--gold-primary)] focus:bg-white/10 focus:ring-4 focus:ring-[var(--gold-primary)]/10 transition-all duration-300 text-sm pr-12"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[var(--gold-primary)] transition-colors p-1">
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Beni Hatırla & Şifremi Unuttum */}
                    <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center justify-center w-5 h-5">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="peer appearance-none w-5 h-5 border-2 border-white/20 rounded md bg-transparent checked:bg-[var(--gold-primary)] checked:border-[var(--gold-primary)] transition-all cursor-pointer"
                                />
                                <svg className="absolute w-3 h-3 text-black pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity duration-200" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="text-sm text-[var(--text-secondary)] group-hover:text-white transition-colors">Beni Hatırla</span>
                        </label>

                        {/* Opsiyonel: Gelecek için şifremi unuttum butonu (Şu an inaktif) */}
                        <span className="text-[13px] text-[var(--gold-primary)]/70 hover:text-[var(--gold-primary)] font-medium cursor-not-allowed transition-colors" title="Şifre sıfırlama işlemi için yöneticinizle iletişime geçin.">
                            Şifremi Unuttum?
                        </span>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-4 mt-2 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#8B6914] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/20 transform -skew-x-[30deg] -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                        {loading ? <><Loader2 size={18} className="animate-spin" /> Kimlik Doğrulanıyor...</> : <><LogIn size={18} /> Sisteme Giriş Yap</>}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-center text-xs text-white/30 font-medium tracking-wide">
                        BU SİSTEM YALNIZCA YETKİLİ PERSONEL İÇİNDİR
                    </p>
                </div>
            </div>
        </div>
    )
}
