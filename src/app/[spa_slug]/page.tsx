'use client'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QrCode, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function SpaPublicPage({ params }: { params: { spa_slug: string } }) {
    const supabase = createClient()
    const slug = params.spa_slug
    const [spa, setSpa] = useState<any>(null)
    const [packages, setPackages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [logoUrl, setLogoUrl] = useState('')
    const [isNotFound, setIsNotFound] = useState(false)

    useEffect(() => {
        if (!slug) return
        const savedLogo = localStorage.getItem('spa_logo_url')
        if (savedLogo) setLogoUrl(savedLogo)

        const savedFavicon = localStorage.getItem('spa_favicon_url')
        if (savedFavicon) {
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
            if (link) {
                link.href = savedFavicon
            } else {
                const newLink = document.createElement('link')
                newLink.rel = 'icon'
                newLink.href = savedFavicon
                document.head.appendChild(newLink)
            }
        }

        async function loadData() {
            const { data: spaData } = await supabase
                .from('spas')
                .select('*')
                .eq('slug', slug)
                .eq('subscription_status', 'active')
                .single()

            if (!spaData) {
                setIsNotFound(true)
                setLoading(false)
                return
            }
            setSpa(spaData)

            const { data: pkgData } = await supabase
                .from('packages')
                .select('*, services(name)')
                .eq('spa_id', spaData.id)
                .eq('is_active', true)
                .order('is_featured', { ascending: false })

            setPackages(pkgData || [])
            setLoading(false)
        }

        loadData()
    }, [slug])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="w-12 h-12 border-4 border-[var(--gold-border)] border-t-[var(--gold-primary)] rounded-full animate-spin"></div>
            </div>
        )
    }

    if (isNotFound) {
        notFound()
    }

    if (!spa) return null

    return (
        <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #111111 0%, #0A0A0A 100%)' }}>
            {/* Decorative */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-64 opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, #C9A84C 0%, transparent 70%)' }} />

            {/* Header */}
            <div className="text-center pt-12 pb-8 px-4">
                {logoUrl ? (
                    <div className="h-32 w-auto max-w-sm mx-auto mb-6 flex items-center justify-center relative z-10">
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain scale-[1.3] drop-shadow-[0_4px_15px_rgba(201,168,76,0.2)]" />
                    </div>
                ) : (
                    <div className="w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', boxShadow: '0 20px 60px rgba(201,168,76,0.3)' }}>
                        <span className="text-4xl font-bold text-black">S2</span>
                    </div>
                )}
                <h1 className="text-3xl font-bold gradient-gold mb-2">{spa.name}</h1>
                <p className="text-sm text-[var(--text-muted)] tracking-widest mb-1">PREMIUM WELLNESS INTELLIGENCE</p>
                {spa.phone && (
                    <a href={`tel:${spa.phone}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-colors mt-2">
                        <Phone size={14} /> {spa.phone}
                    </a>
                )}
            </div>

            {/* Paket Başlığı */}
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-3">Özel Wellness Paketleri</h2>
                <div className="w-16 h-1 bg-[var(--gold-primary)] mx-auto rounded-full mb-3"></div>
                <p className="text-sm text-[var(--text-muted)] mt-1">Sizin için özenle hazırlanan kişisel bakım serüvenleri</p>
            </div>

            {/* Paket Grid */}
            <div className="max-w-6xl mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(packages || []).map(pkg => (
                    <div key={pkg.id}
                        className={`relative rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.15)] flex flex-col ${pkg.is_featured ? 'bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-[var(--gold-primary)]/50' : 'bg-white/5 border border-white/10'}`}>

                        {/* Highlights */}
                        {pkg.is_featured && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--gold-primary)] to-[var(--gold-subtle)]" />}
                        {pkg.campaign_label && (
                            <div className="absolute top-4 right-0 px-4 py-1 text-xs font-bold rounded-l-full shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#000' }}>
                                {pkg.campaign_label}
                            </div>
                        )}

                        <div className="p-8 flex-1 flex flex-col">
                            <h3 className="text-2xl font-bold text-white pr-16 mb-2">{pkg.name}</h3>
                            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed flex-1">{pkg.description}</p>

                            <div className="flex flex-wrap gap-2 mb-6">
                                {pkg.services?.name && (
                                    <span className="text-xs px-3 py-1.5 rounded-full bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] border border-[var(--gold-primary)]/20 font-medium">
                                        ✨ {pkg.services.name}
                                    </span>
                                )}
                                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-[var(--text-secondary)] border border-white/10 font-medium">
                                    🔁 {pkg.sessions_count} Seans
                                </span>
                                {pkg.duration_months && (
                                    <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-[var(--text-secondary)] border border-white/10 font-medium">
                                        ⏱ {pkg.duration_months} Ay
                                    </span>
                                )}
                            </div>

                            {/* İçerik Listesi */}
                            {pkg.items && pkg.items.length > 0 && (
                                <ul className="space-y-2 mb-8 border-t border-white/5 pt-6">
                                    {pkg.items.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                            <span className="text-[var(--gold-primary)] mt-0.5">✓</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Fiyat & Buton */}
                            <div className="mt-auto">
                                <div className="flex items-end gap-3 mb-6">
                                    <span className="text-3xl font-bold text-[var(--gold-primary)]">₺{Number(pkg.price).toLocaleString('tr-TR')}</span>
                                    {pkg.original_price && pkg.original_price > pkg.price && (
                                        <div className="flex flex-col">
                                            <span className="text-sm text-[var(--text-muted)] line-through decoration-[var(--danger)] decoration-2">₺{Number(pkg.original_price).toLocaleString('tr-TR')}</span>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-400 mt-1">%{Math.round((1 - pkg.price / pkg.original_price) * 100)} İndirim</span>
                                        </div>
                                    )}
                                </div>
                                <a href={`tel:${spa.phone}`}
                                    className={`block w-full text-center py-3.5 rounded-xl text-sm font-bold transition-all ${pkg.is_featured ? 'bg-[var(--gold-primary)] text-black hover:opacity-90 shadow-[0_0_20px_rgba(201,168,76,0.4)]' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                                    Rezervasyon Yap
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="text-center pb-8 text-xs text-[var(--text-muted)]">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <QrCode size={14} />
                    Powered by SpaV2 — Premium Wellness Intelligence
                </div>
                {spa.address && <p>{spa.address}</p>}
            </div>
        </div>
    )
}
