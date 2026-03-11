'use client'

import { Bell, Search, Moon, Sun, Loader2, User, KeyRound, LogOut } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface HeaderProps {
    title?: string
    subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Live search states
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)

    // Profile dropdown & modal states
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [changingPassword, setChangingPassword] = useState(false)
    const [userInitial, setUserInitial] = useState('A')
    const [userEmail, setUserEmail] = useState('')

    const dropdownRef = useRef<HTMLDivElement>(null)
    const profileRef = useRef<HTMLDivElement>(null)
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    useEffect(() => {
        setMounted(true)
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserEmail(user.email || '')
                setUserInitial(user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U')
            }
        }
        fetchUser()
    }, [supabase])

    // Dropdowns outside click handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Debounced search
    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([])
                setIsSearching(false)
                return
            }

            setIsSearching(true)
            setShowDropdown(true)

            const spaId = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

            const { data, error } = await supabase
                .from('customers')
                .select('id, full_name, phone')
                .eq('spa_id', spaId)
                .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
                .limit(5)

            if (!error && data) {
                setSearchResults(data)
            }
            setIsSearching(false)
        }

        const debounceTimer = setTimeout(fetchSearchResults, 300)
        return () => clearTimeout(debounceTimer)
    }, [searchQuery, supabase])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
    }

    const handleCustomerClick = (customerId: string) => {
        setShowDropdown(false)
        setSearchQuery('')
        router.push(`/customers/${customerId}`)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword.length < 6) {
            toast.error('Şifre en az 6 karakter olmalıdır.')
            return
        }

        setChangingPassword(true)
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        })
        setChangingPassword(false)

        if (error) {
            toast.error('Şifre güncellenirken hata oluştu: ' + error.message)
        } else {
            toast.success('Şifreniz başarıyla güncellendi!')
            setShowPasswordModal(false)
            setNewPassword('')
        }
    }

    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--gold-border)] bg-[var(--bg-surface)] z-30">
            {/* Page Title */}
            <div>
                {title && <h1 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h1>}
                {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3 relative">
                {/* Search */}
                <div className="relative hidden md:block" ref={dropdownRef}>
                    <form onSubmit={handleSearchSubmit}>
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Müşteri ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => { if (searchQuery.trim()) setShowDropdown(true) }}
                            className="pl-8 pr-12 py-1.5 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] w-56 transition-all"
                        />
                        {isSearching && (
                            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gold-primary)] animate-spin" />
                        )}
                    </form>

                    {/* Autocomplete Dropdown */}
                    {showDropdown && searchQuery.trim().length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--bg-card)] border border-[var(--gold-border)] rounded-xl shadow-lg overflow-hidden py-1">
                            {isSearching ? (
                                <div className="p-4 text-center text-xs text-[var(--text-muted)]">Aranıyor...</div>
                            ) : searchResults.length > 0 ? (
                                <ul>
                                    {searchResults.map((customer) => (
                                        <li key={customer.id}>
                                            <button
                                                onClick={() => handleCustomerClick(customer.id)}
                                                className="w-full text-left px-4 py-2 hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-between group"
                                            >
                                                <div>
                                                    <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--gold-primary)] transition-colors">
                                                        {customer.full_name}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                                        {customer.phone}
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 text-center text-xs text-[var(--text-muted)]">Sonuç bulunamadı</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Dark/Light toggle */}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-colors"
                    aria-label="Toggle theme"
                >
                    {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-colors">
                    <Bell size={16} />
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--gold-primary)]"></span>
                </button>

                {/* User Profile Area */}
                <div className="relative ml-2" ref={profileRef}>
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-black hover:ring-2 hover:ring-[var(--gold-primary)] hover:ring-offset-2 hover:ring-offset-[var(--bg-surface)] transition-all"
                        style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)' }}
                    >
                        {userInitial}
                    </button>

                    {/* Profile Dropdown Menu */}
                    {showProfileMenu && (
                        <div className="absolute top-full right-0 mt-3 w-56 bg-[var(--bg-card)] border border-[var(--gold-border)] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden z-50 transform origin-top-right animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Header User Info */}
                            <div className="px-4 py-3 border-b border-[var(--gold-border)] bg-[var(--bg-dark)]/50">
                                <div className="text-sm font-semibold text-[var(--text-primary)]">Profilim</div>
                                <div className="text-xs text-[var(--text-muted)] truncate mt-0.5" title={userEmail}>
                                    {userEmail || 'Yükleniyor...'}
                                </div>
                            </div>

                            {/* Menu Actions */}
                            <div className="p-1">
                                <button
                                    onClick={() => {
                                        setShowProfileMenu(false);
                                        setShowPasswordModal(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                >
                                    <KeyRound size={16} />
                                    <span>Şifre Değiştir</span>
                                </button>

                                <div className="h-px bg-[var(--gold-border)] my-1 mx-2" />

                                <button
                                    onClick={() => {
                                        setShowProfileMenu(false);
                                        handleLogout();
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span>Sistemden Çıkış</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Şifre Değiştirme Modalı */}
                {showPasswordModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                        <div className="bg-[var(--bg-card)] border border-[var(--gold-border)] rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--gold-subtle)] border border-[var(--gold-border)] flex items-center justify-center mb-5">
                                <KeyRound className="text-[var(--gold-primary)]" size={24} />
                            </div>

                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Şifreni Yenile</h2>
                            <p className="text-sm text-[var(--text-muted)] mb-6">Hesap güvenliğiniz için güncel bir şifre belirleyin.</p>

                            <form onSubmit={handlePasswordChange} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Yeni Şifre</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Güçlü bir şifre girin (min 6)"
                                        minLength={6}
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] focus:ring-1 focus:ring-[var(--gold-primary)] text-sm transition-all"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(false)}
                                        disabled={changingPassword}
                                        className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-white/10 hover:bg-white/5 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={changingPassword}
                                        className="flex-1 btn-gold text-sm py-3 disabled:opacity-50 font-semibold"
                                    >
                                        {changingPassword ? 'Değişiyor...' : 'Şifreyi Güncelle'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}
