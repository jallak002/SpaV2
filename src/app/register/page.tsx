'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password.length < 6) { toast.error('Şifre en az 6 karakter olmalıdır'); return }
        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        })
        if (error) {
            toast.error('Kayıt başarısız: ' + error.message)
        } else {
            toast.success('Kayıt başarılı! E-posta doğrulaması yapın.')
            router.push('/login')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #111111 0%, #0A0A0A 100%)' }}>
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5"
                style={{ background: 'radial-gradient(circle, #C9A84C 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

            <div className="w-full max-w-md px-8 py-10 glass-card fade-in-up">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)' }}>
                        <span className="text-black font-bold text-2xl">S2</span>
                    </div>
                    <h1 className="text-2xl font-bold gradient-gold mb-1">SpaV2</h1>
                    <p className="text-[var(--text-muted)] text-sm">Yeni hesap oluşturun</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Ad Soyad</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                            placeholder="Ad Soyad"
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">E-posta</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                            placeholder="ornek@spav2.com"
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Şifre</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                            placeholder="Min. 6 karakter"
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors text-sm" />
                    </div>
                    <button type="submit" disabled={loading}
                        className="w-full py-3 rounded-xl font-semibold text-sm btn-gold disabled:opacity-60 flex items-center justify-center gap-2">
                        {loading ? <><Loader2 size={16} className="animate-spin" /> Kayıt yapılıyor...</> : 'Hesap Oluştur'}
                    </button>
                </form>

                <p className="text-center mt-6 text-sm text-[var(--text-muted)]">
                    Zaten hesabınız var mı?{' '}
                    <Link href="/login" className="text-[var(--gold-primary)] hover:text-[var(--gold-light)] transition-colors">Giriş yapın</Link>
                </p>
            </div>
        </div>
    )
}
