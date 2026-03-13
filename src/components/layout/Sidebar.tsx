'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
    LayoutDashboard,
    Calendar,
    Users,
    Package,
    ShoppingCart,
    UserCheck,
    BarChart3,
    Phone,
    Settings,
    QrCode,
    LogOut,
    ChevronRight,
    Coffee,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useMobileMenu } from '@/components/providers/MobileMenuProvider'

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/appointments', icon: Calendar, label: 'Randevular' },
    { href: '/customers', icon: Users, label: 'Müşteriler' },
    { href: '/packages', icon: Package, label: 'Paketler' },
    { href: '/sales', icon: ShoppingCart, label: 'Satış & Kasa' },
    { href: '/staff', icon: UserCheck, label: 'Personel' },
    { href: '/reports', icon: BarChart3, label: 'Raporlar' },
    { href: '/treats', icon: Coffee, label: 'İkram Yönetimi' },
    { href: '/recall', icon: Phone, label: 'Geri Çağırma' },
    { href: '/settings', icon: Settings, label: 'Ayarlar' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const { isOpen, close } = useMobileMenu()
    const [logoUrl, setLogoUrl] = useState('')
    const [userRole, setUserRole] = useState<string | null>(null)

    useEffect(() => {
        const fetchUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserRole(user.user_metadata?.role || 'staff')
            }
        }
        fetchUserRole()

        const savedLogo = localStorage.getItem('spa_logo_url')
        if (savedLogo) {
            setLogoUrl(savedLogo)
        }

        // Listen for storage changes in case settings are updated in another tab
        const handleStorage = () => {
            const newLogo = localStorage.getItem('spa_logo_url')
            if (newLogo) setLogoUrl(newLogo)
        }
        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={close}
                />
            )}

            <aside className={`sidebar w-64 min-h-screen flex flex-col fixed left-0 top-0 z-50 bg-[var(--bg-card)] border-r border-[var(--gold-border)] transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
            <div className="p-6 border-b border-[var(--gold-border)]">
                <Link href="/dashboard" className="flex items-center gap-4">
                    {logoUrl ? (
                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain scale-[1.3] drop-shadow-md" />
                        </div>
                    ) : (
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)' }}>
                            <span className="text-black font-bold text-lg">S2</span>
                        </div>
                    )}
                    <div>
                        <div className="font-bold text-lg gradient-gold">SpaV2</div>
                        <div className="text-[10px] text-[var(--text-muted)] tracking-widest mt-0.5">PREMIUM WELLNESS</div>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.filter(item => {
                    if (userRole === 'staff') {
                        const allowedPaths = ['/appointments', '/customers', '/sales', '/recall', '/treats']
                        return allowedPaths.includes(item.href)
                    }
                    return true
                }).map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-[var(--gold-subtle)] text-[var(--gold-primary)] border border-[var(--gold-border)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <item.icon size={18} className={isActive ? 'text-[var(--gold-primary)]' : ''} />
                            <span className="text-sm font-medium">{item.label}</span>
                            {isActive && <ChevronRight size={14} className="ml-auto text-[var(--gold-primary)]" />}
                        </Link>
                    )
                })}

                {/* QR Sayfası linki */}
                <div className="pt-4 border-t border-[var(--gold-border)] mt-4">
                    <Link
                        href="/lotus-spa"
                        target="_blank"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--gold-primary)] hover:bg-[var(--gold-subtle)] transition-all"
                    >
                        <QrCode size={18} />
                        <span className="text-sm">QR Sayfası</span>
                    </Link>
                </div>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-[var(--gold-border)]">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-500/10 transition-all font-medium group"
                >
                    <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Çıkış Yap</span>
                </button>
            </div>
        </aside>
        </>
    )
}
