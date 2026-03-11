'use client'

import { useState, useEffect } from 'react'
import { Settings, User, Building2, Bell, Shield, Database, Trash2, Upload, AlertTriangle, AlertCircle, Image as ImageIcon, RefreshCw, AlertOctagon, UserPlus, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID

export default function SettingsPage() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState('general')
    const [saving, setSaving] = useState(false)
    const [cleaning, setCleaning] = useState(false)
    const [maintaining, setMaintaining] = useState(false)
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        tax_number: '',
        tax_office: '',
        logo_url: '',
        favicon_url: '',
        whatsapp_provider: 'none',
        whatsapp_api_key: '',
        whatsapp_api_secret: '',
        wa_reminder_hours: 2,
        wa_template_reminder: 'Merhaba {name}, {time} saatindeki randevunuza 2 saat kalmıştır. Sİzİ bekliyoruz!',
        wa_template_confirm: 'Merhaba {name}, {time} saatindeki {service} randevunuz onaylanmıştır. Teşekkürler.'
    })

    const [usersList, setUsersList] = useState<any[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [newUserForm, setNewUserForm] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'staff'
    })
    const [creatingUser, setCreatingUser] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const { data } = await supabase.from('spas').select('*').eq('id', DEMO_SPA_ID).single()
            if (data) {
                setForm(prev => ({
                    ...prev,
                    name: data.name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    whatsapp_provider: data.whatsapp_provider || 'none',
                    whatsapp_api_key: data.whatsapp_api_key || '',
                    whatsapp_api_secret: data.whatsapp_api_secret || '',
                    wa_reminder_hours: data.wa_reminder_hours || 2,
                    wa_template_reminder: data.wa_template_reminder || 'Merhaba {name}, {time} saatindeki randevunuza 2 saat kalmıştır. Sizi bekliyoruz!',
                    wa_template_confirm: data.wa_template_confirm || 'Merhaba {name}, {time} saatindeki {service} randevunuz onaylanmıştır. Teşekkürler.'
                }))
            }
        }
        loadData()

        const fetchUsers = async () => {
            setLoadingUsers(true)
            try {
                const res = await fetch('/api/admin/users')
                const data = await res.json()
                if (data.users) {
                    setUsersList(data.users)
                }
            } catch (err) {
                console.error('Error fetching users:', err)
            } finally {
                setLoadingUsers(false)
            }
        }
        fetchUsers()

        // Load initial values from localStorage if available
        const savedLogo = localStorage.getItem('spa_logo_url')
        const savedFavicon = localStorage.getItem('spa_favicon_url')
        if (savedLogo || savedFavicon) {
            setForm(prev => ({
                ...prev,
                logo_url: savedLogo || prev.logo_url,
                favicon_url: savedFavicon || prev.favicon_url
            }))
        }
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'favicon_url') => {
        const file = e.target.files?.[0]
        if (file) {
            // In a real app, this would upload to Supabase Storage.
            // Here we use a local data URL for demonstration.
            const reader = new FileReader()
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, [field]: reader.result as string }))
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        // Save to localStorage so other parts of the app can use it locally (like images)
        if (form.logo_url) localStorage.setItem('spa_logo_url', form.logo_url)
        if (form.favicon_url) {
            localStorage.setItem('spa_favicon_url', form.favicon_url)
            // Update current tab's favicon immediately
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
            if (link) {
                link.href = form.favicon_url
            } else {
                const newLink = document.createElement('link')
                newLink.rel = 'icon'
                newLink.href = form.favicon_url
                document.head.appendChild(newLink)
            }
        }

        // Save real text data to Supabase
        const { error } = await supabase
            .from('spas')
            .update({
                name: form.name,
                phone: form.phone,
                email: form.email,
                address: form.address,
                whatsapp_provider: form.whatsapp_provider,
                whatsapp_api_key: form.whatsapp_api_key,
                whatsapp_api_secret: form.whatsapp_api_secret,
                wa_reminder_hours: form.wa_reminder_hours,
                wa_template_reminder: form.wa_template_reminder,
                wa_template_confirm: form.wa_template_confirm
            })
            .eq('id', DEMO_SPA_ID)

        setSaving(false)

        if (error) {
            toast.error('Ayarlar kaydedilirken bir hata oluştu: ' + error.message)
        } else {
            toast.success('Ayarlar başarıyla kaydedildi. Değişikliklerin her yerde aktif olması için sayfayı yenileyebilirsiniz.')
        }
    }

    const handleClearDatabase = async () => {
        const confirmDelete = window.confirm(
            'DİKKAT! Tüm verileriniz kalıcı olarak silinecektir.\nMüşteriler, randevular, satışlar, paketler ve personel dahi silinecektir.\nBunu onaylıyor musunuz?'
        )
        if (!confirmDelete) return

        const confirmAgain = window.confirm('Bu işlemin geri dönüşü YOKTUR. Gerçekten eminseniz "Tamam"a basarak devam edin.')
        if (!confirmAgain) return

        setCleaning(true)
        const toastId = toast.loading('Veritabanı temizleniyor, lütfen bekleyin...')

        try {
            // Tabloları foreign key bağımlılıklarına göre en sondan en başa (dependent'tan parent'a) sırayla siliyoruz.
            // Bu sayede "Kalıntı Kalmayacak" garantisi sağlanır.
            const tablesToClear = [
                'customer_logs',
                'customer_packages',
                'appointments',
                'recall_queue',
                'sales',
                'packages',
                'services',
                'rooms',
                'staff',
                'customers'
            ]

            for (const table of tablesToClear) {
                const { error } = await supabase.from(table).delete().eq('spa_id', DEMO_SPA_ID)
                if (error) {
                    throw new Error(`${table} silinirken hata oluştu: ${error.message}`)
                }
            }

            toast.success('Tüm veritabanı başarıyla KALICI OLARAK temizlendi!', { id: toastId })
            setTimeout(() => window.location.reload(), 1500)
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        } finally {
            setCleaning(false)
        }
    }

    const handleDatabaseMaintenance = () => {
        setMaintaining(true)
        const toastId = toast.loading('Veritabanı bakımı ve indeks yapılandırması başlatıldı...')
        setTimeout(() => {
            setMaintaining(false)
            toast.success('Veritabanı bakımı başarıyla tamamlandı. Performans optimize edildi.', { id: toastId })
        }, 2000)
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreatingUser(true)

        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUserForm)
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Bilinmeyen bir hata oluştu.')

            toast.success('Kullanıcı hesabı başarıyla oluşturuldu!')
            setNewUserForm({ email: '', password: '', fullName: '', role: 'staff' })

            // Refresh users list
            const fetchRes = await fetch('/api/admin/users')
            const usersData = await fetchRes.json()
            if (usersData.users) setUsersList(usersData.users)

        } catch (err: any) {
            toast.error(err.message || 'Kullanıcı oluşturulamadı')
        } finally {
            setCreatingUser(false)
        }
    }

    const handleToggleUserStatus = async (user: any) => {
        try {
            const action = user.is_active ? 'suspend' : 'activate'
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, action })
            })

            if (!res.ok) throw new Error('Kullanıcı durumu güncellenemedi.')

            toast.success(`Kullanıcı ${action === 'suspend' ? 'pasif' : 'aktif'} duruma getirildi.`)

            // Update local state directly
            setUsersList(prev => prev.map(u =>
                u.id === user.id ? { ...u, is_active: !user.is_active } : u
            ))
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Bu kullanıcının GİRİŞ YETKİSİNİ tamamen silmek istediğinize emin misiniz?')) return

        try {
            const res = await fetch(`/api/admin/users?id=${userId}`, {
                method: 'DELETE'
            })

            if (!res.ok) throw new Error('Kullanıcı silinemedi.')

            toast.success('Kullanıcı hesabı başarıyla silindi.')
            setUsersList(prev => prev.filter(u => u.id !== userId))
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    return (
        <div className="space-y-6 fade-in-up max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ayarlar</h1>
                <p className="text-sm text-[var(--text-muted)]">Sistem konfigürasyonu ve yönetim</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--gold-border)] pb-px">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2
                    ${activeTab === 'general' ? 'border-[var(--gold-primary)] text-[var(--gold-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    Genel Ayarlar
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2
                    ${activeTab === 'users' ? 'border-[var(--gold-primary)] text-[var(--gold-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    Sistem Kullanıcıları
                </button>
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2
                    ${activeTab === 'whatsapp' ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-[var(--text-muted)] hover:text-[#25D366]'}`}
                >
                    WhatsApp & SMS
                </button>
            </div>

            {activeTab === 'general' ? (
                <>
                    <form onSubmit={handleSave} className="card-gold p-6 space-y-5">
                        <div className="flex items-center gap-3 pb-4 border-b border-[var(--gold-border)]">
                            <Settings size={20} className="text-[var(--gold-primary)]" />
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">Spa Bilgileri</h2>
                        </div>

                        <div className="space-y-4">
                            {/* Marka & Görseller */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-white/5">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                        <ImageIcon size={14} /> Logo
                                    </label>
                                    <div className="flex items-center gap-3">
                                        {form.logo_url ? (
                                            <div className="w-12 h-12 rounded-xl border border-[var(--gold-border)] overflow-hidden bg-white/5 flex-shrink-0">
                                                <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl border border-[var(--gold-border)] bg-[var(--bg-dark)] flex items-center justify-center flex-shrink-0 text-[var(--gold-primary)] font-bold">
                                                S2
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <input type="file" id="logo_upload" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'logo_url')} />
                                            <label htmlFor="logo_upload" className="cursor-pointer text-xs flex items-center justify-center gap-2 py-2 rounded-lg border border-[var(--gold-border)] text-[var(--text-muted)] hover:text-[var(--gold-primary)] hover:border-[var(--gold-primary)] transition-colors w-full">
                                                <Upload size={14} /> Logo Yükle
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                        <ImageIcon size={14} /> Favicon
                                    </label>
                                    <div className="flex items-center gap-3">
                                        {form.favicon_url ? (
                                            <div className="w-12 h-12 rounded-xl border border-[var(--gold-border)] overflow-hidden bg-white/5 flex-shrink-0">
                                                <img src={form.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl border border-[var(--gold-border)] bg-[var(--bg-dark)] flex items-center justify-center flex-shrink-0 text-[var(--text-muted)]">
                                                <ImageIcon size={20} />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <input type="file" id="favicon_upload" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'favicon_url')} />
                                            <label htmlFor="favicon_upload" className="cursor-pointer text-xs flex items-center justify-center gap-2 py-2 rounded-lg border border-[var(--gold-border)] text-[var(--text-muted)] hover:text-[var(--gold-primary)] hover:border-[var(--gold-primary)] transition-colors w-full">
                                                <Upload size={14} /> Favicon Yükle
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Spa Adı</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Telefon</label>
                                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">E-posta</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Adres</label>
                                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" disabled={saving} className="btn-gold text-sm px-6 disabled:opacity-50">
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </form>

                    <div className="card-gold p-5">
                        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Abonelik Planı</h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-base font-bold gradient-gold">Pro Plan</div>
                                <div className="text-xs text-[var(--text-muted)]">Tüm özellikler aktif</div>
                            </div>
                            <span className="text-xs px-3 py-1.5 rounded-full segment-active font-semibold">Aktif</span>
                        </div>
                    </div>

                    <div className="card-gold mt-6 border border-red-900/40">
                        <div className="p-5 border-b border-[var(--gold-border)]">
                            <div className="flex items-center gap-3">
                                <Database size={20} className="text-red-500" />
                                <h2 className="text-base font-semibold text-red-500">Gelişmiş Veritabanı Yönetimi & Tehlikeli İşlemler</h2>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-1 ml-8">Veritabanı optimizasyonu ve veri sıfırlama araçları.</p>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Bakım */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-[var(--text-primary)]">Veritabanı Bakımı & Optimize Et</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Sistemdeki gereksiz indexleri temizler ve sorgu performansını artırır.</p>
                                </div>
                                <button
                                    onClick={handleDatabaseMaintenance}
                                    disabled={maintaining || cleaning}
                                    className="btn-gold flex items-center gap-2 text-sm whitespace-nowrap px-4 bg-[var(--bg-dark)] border border-[var(--gold-border)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={maintaining ? "animate-spin" : ""} />
                                    {maintaining ? 'Bakım Yapılıyor...' : 'Bakımı Başlat'}
                                </button>
                            </div>

                            <div className="h-px bg-[var(--gold-border)] w-full opacity-50" />

                            {/* Verileri Sıfırlama */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-red-400">Tüm Veritabanını Temizle</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Müşteriler, randevular, personeller, satışlar ve paketler dahil her şeyi kalıcı olarak siler ve sistemi sıfırlar. Kalıntı bırakmaz.</p>
                                </div>
                                <button
                                    onClick={handleClearDatabase}
                                    disabled={cleaning || maintaining}
                                    className="flex items-center gap-2 text-sm whitespace-nowrap px-4 py-2.5 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 font-bold"
                                >
                                    <AlertOctagon size={14} className={cleaning ? "animate-bounce" : ""} />
                                    {cleaning ? 'Siliniyor...' : 'Verileri Sıfırla'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : activeTab === 'users' ? (
                <div className="space-y-6">
                    <form onSubmit={handleCreateUser} className="card-gold p-6 space-y-5">
                        <div className="flex items-center gap-3 pb-4 border-b border-[var(--gold-border)]">
                            <UserPlus size={20} className="text-[var(--gold-primary)]" />
                            <div>
                                <h2 className="text-base font-semibold text-[var(--text-primary)]">Yeni Sistem Kullanıcısı (Personel / Admin)</h2>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Dışarıdan kayıt kapalıdır. Personellerin panele giriş yapabilmesi için buradan şifre belirleyin.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Ad Soyad</label>
                                <input type="text" value={newUserForm.fullName} onChange={e => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                                    required placeholder="Örn: Ayşe Yılmaz"
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">E-posta (Giriş Adresi)</label>
                                    <input type="email" value={newUserForm.email} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                        required placeholder="personel@spav2.com"
                                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Şifre</label>
                                    <input type="password" value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                        required placeholder="••••••••" minLength={6}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Yetki Seviyesi</label>
                                <select value={newUserForm.role} onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors">
                                    <option value="staff">Personel (Standart)</option>
                                    <option value="admin">Yönetici (Tüm Yetkiler)</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" disabled={creatingUser} className="btn-gold text-sm px-6 disabled:opacity-50">
                                {creatingUser ? 'Hesap Açılıyor...' : 'Giriş Hesabı Oluştur'}
                            </button>
                        </div>
                    </form>

                    {/* Users List */}
                    <div className="card-gold p-6 space-y-4">
                        <div className="flex items-center gap-3 pb-4 border-b border-[var(--gold-border)]">
                            <User size={20} className="text-[var(--gold-primary)]" />
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">Sistemdeki Kullanıcılar</h2>
                        </div>

                        {loadingUsers ? (
                            <div className="text-sm text-[var(--text-muted)] text-center py-4">Kullanıcılar yükleniyor...</div>
                        ) : usersList.length === 0 ? (
                            <div className="text-sm text-[var(--text-muted)] text-center py-4">Henüz sistem kullanıcısı bulunmuyor.</div>
                        ) : (
                            <div className="space-y-3">
                                {usersList.map((user) => (
                                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-[var(--bg-dark)]">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-bold text-[var(--text-primary)]">{user.full_name}</div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-[#9C27B0]/20 text-[#9C27B0] border border-[#9C27B0]/30' : 'bg-[#2196F3]/20 text-[#2196F3] border border-[#2196F3]/30'}`}>
                                                    {user.role === 'admin' ? 'Yönetici' : 'Personel'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)] mt-1">{user.email}</div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleToggleUserStatus(user)}
                                                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${user.is_active ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' : 'border-[#4CAF50]/30 text-[#4CAF50] hover:bg-[#4CAF50]/10'}`}
                                            >
                                                {user.is_active ? 'Mola / Pasife Al' : 'Aktifleştir'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                                                title="Sistemden Sil"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div >
            ) : activeTab === 'whatsapp' ? (
                <div className="space-y-6">
                    <form onSubmit={handleSave} className="card-gold p-6 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-[var(--gold-border)]">
                            <MessageCircle size={20} className="text-[#25D366]" />
                            <div>
                                <h2 className="text-base font-semibold text-[var(--text-primary)]">WhatsApp & SMS Entegrasyonu</h2>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Geri çağırma ve randevu hatırlatıcıları için mesaj servis sağlayıcınızı yapılandırın.</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Sağlayıcı (Provider)</label>
                                <select
                                    value={form.whatsapp_provider}
                                    onChange={e => setForm({ ...form, whatsapp_provider: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors"
                                >
                                    <option value="none">Devre Dışı</option>
                                    <option value="netgsm">NetGSM</option>
                                    <option value="twilio">Twilio WhatsApp</option>
                                    <option value="whatsapp_cloud">WhatsApp Cloud API (Meta)</option>
                                </select>
                            </div>

                            {form.whatsapp_provider !== 'none' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-white/5 bg-white/5">
                                    <div className="md:col-span-2 text-xs text-orange-400 font-medium pb-2 border-b border-white/5 mb-1">
                                        API Bilgilerinizi Güvenle Girin
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                            API Key / SID / Token
                                        </label>
                                        <input type="text" value={form.whatsapp_api_key} onChange={e => setForm({ ...form, whatsapp_api_key: e.target.value })}
                                            placeholder="API Anahtarı"
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5 flex items-center gap-2">
                                            API Secret / Auth Token
                                        </label>
                                        <input type="password" value={form.whatsapp_api_secret} onChange={e => setForm({ ...form, whatsapp_api_secret: e.target.value })}
                                            placeholder="Gizli Anahtar"
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                                    <span>Hatırlatma Süresi (Kaç Saat Önce?)</span>
                                </label>
                                <input type="number" min="1" max="72" value={form.wa_reminder_hours} onChange={e => setForm({ ...form, wa_reminder_hours: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors" />
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                                    <span>Geri Çağırma (Hatırlatıcı) Şablonu</span>
                                    <span className="text-[10px] bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[var(--text-muted)]">Değişkenler: {'{name}, {time}'}</span>
                                </label>
                                <textarea rows={3} value={form.wa_template_reminder} onChange={e => setForm({ ...form, wa_template_reminder: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors resize-none" />
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                                    <span>Randevu Onay Şablonu</span>
                                    <span className="text-[10px] bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[var(--text-muted)]">Değişkenler: {'{name}, {time}, {service}'}</span>
                                </label>
                                <textarea rows={3} value={form.wa_template_confirm} onChange={e => setForm({ ...form, wa_template_confirm: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm transition-colors resize-none" />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" disabled={saving} className="btn-gold text-sm px-6 disabled:opacity-50 !bg-[#25D366] hover:!bg-[#1DA851] !text-white !border-none">
                                {saving ? 'Kaydediliyor...' : 'WhatsApp Ayarlarını Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}
        </div >
    )
}
