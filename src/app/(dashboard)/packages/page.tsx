'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Package, Star, X, ChevronDown, Tag, ToggleLeft, ToggleRight, Edit2, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'sonner'
import { ClipboardList } from 'lucide-react'
import NewServiceModal from '@/components/services/NewServiceModal'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface PackageForm {
    name: string
    description: string
    service_id: string
    sessions_count: string
    duration_months: string
    price: string
    original_price: string
    campaign_label: string
    custom_campaign: string
    is_featured: boolean
    is_active: boolean
    items: string[]
}

const CAMPAIGN_OPTIONS = ['', 'En Çok Satan', 'Fırsat', 'Yeni', 'Özel']

const EMPTY_FORM: PackageForm = {
    name: '',
    description: '',
    service_id: '',
    sessions_count: '',
    duration_months: '',
    price: '',
    original_price: '',
    campaign_label: '',
    custom_campaign: '',
    is_featured: false,
    is_active: true,
    items: [],
}

// ─────────────── MODAL ───────────────
function PackageFormModal({
    open,
    onClose,
    editPkg,
    services,
    onSaved,
}: {
    open: boolean
    onClose: () => void
    editPkg: any | null
    services: any[]
    onSaved: () => void
}) {
    const supabase = createClient()
    const [form, setForm] = useState<PackageForm>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [serviceModalOpen, setServiceModalOpen] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof PackageForm, string>>>({})
    const overlayRef = useRef<HTMLDivElement>(null)

    // Düzenleme modunda formu doldur
    useEffect(() => {
        if (!open) return
        if (editPkg) {
            const cl = editPkg.campaign_label || ''
            const isPredefined = CAMPAIGN_OPTIONS.includes(cl)
            setForm({
                name: editPkg.name || '',
                description: editPkg.description || '',
                service_id: editPkg.service_id || '',
                sessions_count: String(editPkg.sessions_count || ''),
                duration_months: String(editPkg.duration_months || ''),
                price: String(editPkg.price || ''),
                original_price: String(editPkg.original_price || ''),
                campaign_label: isPredefined ? cl : 'Özel',
                custom_campaign: isPredefined ? '' : cl,
                is_featured: editPkg.is_featured ?? false,
                is_active: editPkg.is_active ?? true,
                items: editPkg.items || [],
            })
        } else {
            setForm(EMPTY_FORM)
        }
        setErrors({})
    }, [open, editPkg])

    const set = (field: keyof PackageForm, value: string | boolean | string[]) =>
        setForm(prev => ({ ...prev, [field]: value }))

    const [itemInput, setItemInput] = useState('')
    const addItem = () => {
        const v = itemInput.trim()
        if (!v || form.items.includes(v)) return
        set('items', [...form.items, v])
        setItemInput('')
    }
    const removeItem = (i: number) => set('items', form.items.filter((_, idx) => idx !== i))

    const validate = () => {
        const e: Partial<Record<keyof PackageForm, string>> = {}
        if (!form.name.trim()) e.name = 'Paket adı zorunludur'
        if (!form.sessions_count || Number(form.sessions_count) < 1) e.sessions_count = 'En az 1 seans giriniz'
        if (!form.price || Number(form.price) < 0) e.price = 'Geçerli bir fiyat giriniz'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return
        setSaving(true)

        const campaignLabel =
            form.campaign_label === 'Özel'
                ? form.custom_campaign.trim()
                : form.campaign_label

        const payload = {
            spa_id: DEMO_SPA_ID,
            name: form.name.trim(),
            description: form.description.trim() || null,
            service_id: form.service_id || null,
            sessions_count: Number(form.sessions_count),
            duration_months: form.duration_months ? Number(form.duration_months) : null,
            price: Number(form.price),
            original_price: form.original_price ? Number(form.original_price) : null,
            campaign_label: campaignLabel || null,
            is_featured: form.is_featured,
            is_active: form.is_active,
            items: form.items,
        }

        try {
            if (editPkg) {
                const { error } = await supabase.from('packages').update(payload).eq('id', editPkg.id)
                if (error) throw error
                toast.success('Paket güncellendi')
            } else {
                const { error } = await supabase.from('packages').insert(payload)
                if (error) throw error
                toast.success('Paket oluşturuldu')
            }
            onSaved()
            onClose()
        } catch (err: any) {
            toast.error(err.message || 'Bir hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    if (!open) return null

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === overlayRef.current) onClose() }}
        >
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--gold-border)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--gold-border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#8B6914)' }}>
                            <Package size={18} className="text-black" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)]">
                                {editPkg ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}
                            </h2>
                            <p className="text-xs text-[var(--text-muted)]">Tüm alanları doldurun</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    {/* Paket Adı */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                            Paket Adı <span className="text-red-400">*</span>
                        </label>
                        <input
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            placeholder="örn: Premium Aromaterapi Paketi"
                            className={`w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border transition-colors placeholder:text-[var(--text-muted)] focus:outline-none ${errors.name ? 'border-red-500/60 focus:border-red-500' : 'border-[var(--gold-border)] focus:border-[var(--gold-primary)]'}`}
                        />
                        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                    </div>

                    {/* Açıklama */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Açıklama</label>
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder="Paket hakkında kısa bir açıklama..."
                            rows={3}
                            className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border border-[var(--gold-border)] focus:border-[var(--gold-primary)] focus:outline-none resize-none placeholder:text-[var(--text-muted)] transition-colors"
                        />
                    </div>

                    {/* Bağlı Hizmet */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-medium text-[var(--text-secondary)]">Bağlı Hizmet</label>
                            <button
                                type="button"
                                onClick={() => setServiceModalOpen(true)}
                                className="text-[10px] font-medium text-[var(--gold-primary)] hover:underline flex items-center gap-1 transition-colors"
                            >
                                <Plus size={10} /> Yeni Ekle
                            </button>
                        </div>
                        <div className="relative">
                            <select
                                value={form.service_id}
                                onChange={e => set('service_id', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border border-[var(--gold-border)] focus:border-[var(--gold-primary)] focus:outline-none appearance-none transition-colors"
                            >
                                <option value="">— Hizmet Seçin —</option>
                                {services.filter(s => s.is_active).map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}dk - ₺{s.price})</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                        </div>
                    </div>

                    {/* Seans Sayısı + Geçerlilik */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                Seans Sayısı <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={form.sessions_count}
                                onChange={e => set('sessions_count', e.target.value)}
                                placeholder="10"
                                className={`w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border transition-colors placeholder:text-[var(--text-muted)] focus:outline-none ${errors.sessions_count ? 'border-red-500/60 focus:border-red-500' : 'border-[var(--gold-border)] focus:border-[var(--gold-primary)]'}`}
                            />
                            {errors.sessions_count && <p className="text-xs text-red-400 mt-1">{errors.sessions_count}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Geçerlilik (ay)</label>
                            <input
                                type="number"
                                min={1}
                                value={form.duration_months}
                                onChange={e => set('duration_months', e.target.value)}
                                placeholder="3"
                                className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border border-[var(--gold-border)] focus:border-[var(--gold-primary)] focus:outline-none placeholder:text-[var(--text-muted)] transition-colors"
                            />
                        </div>
                    </div>

                    {/* Fiyat + Orijinal Fiyat */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                Fiyat (₺) <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={form.price}
                                onChange={e => set('price', e.target.value)}
                                placeholder="4500"
                                className={`w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border transition-colors placeholder:text-[var(--text-muted)] focus:outline-none ${errors.price ? 'border-red-500/60 focus:border-red-500' : 'border-[var(--gold-border)] focus:border-[var(--gold-primary)]'}`}
                            />
                            {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                Orijinal Fiyat (₺)
                                <span className="text-[var(--text-muted)] font-normal ml-1">— üzeri çizili</span>
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={form.original_price}
                                onChange={e => set('original_price', e.target.value)}
                                placeholder="6000"
                                className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border border-[var(--gold-border)] focus:border-[var(--gold-primary)] focus:outline-none placeholder:text-[var(--text-muted)] transition-colors"
                            />
                        </div>
                    </div>

                    {/* Kampanya Etiketi */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                            <Tag size={12} className="inline mr-1" />
                            Kampanya Etiketi
                        </label>
                        <div className="relative">
                            <select
                                value={form.campaign_label}
                                onChange={e => set('campaign_label', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border border-[var(--gold-border)] focus:border-[var(--gold-primary)] focus:outline-none appearance-none transition-colors"
                            >
                                <option value="">— Etiket Yok —</option>
                                {CAMPAIGN_OPTIONS.filter(c => c !== '').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                        </div>
                        {form.campaign_label === 'Özel' && (
                            <input
                                value={form.custom_campaign}
                                onChange={e => set('custom_campaign', e.target.value)}
                                placeholder="Özel etiket metni..."
                                className="w-full mt-2 px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border border-[var(--gold-border)] focus:border-[var(--gold-primary)] focus:outline-none placeholder:text-[var(--text-muted)] transition-colors"
                            />
                        )}
                    </div>

                    {/* Paket İçerikleri */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                            <CheckCircle2 size={12} className="inline mr-1" />
                            Paket İçerikleri
                            <span className="text-[var(--text-muted)] font-normal ml-1">— müşteriye ne sunulacak</span>
                        </label>

                        {/* Ekleme input */}
                        <div className="flex gap-2 mb-2">
                            <input
                                value={itemInput}
                                onChange={e => setItemInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                                placeholder="örn: Sauna, Klasik Masaj, Kese & Köpük..."
                                className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--bg-dark)] text-[var(--text-primary)] border border-[var(--gold-border)] focus:border-[var(--gold-primary)] focus:outline-none placeholder:text-[var(--text-muted)] transition-colors"
                            />
                            <button
                                type="button"
                                onClick={addItem}
                                disabled={!itemInput.trim()}
                                className="px-3 py-2 rounded-lg text-xs font-medium bg-[var(--gold-subtle)] text-[var(--gold-primary)] border border-[var(--gold-border)] hover:bg-[var(--gold-border)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                            >
                                <Plus size={13} /> Ekle
                            </button>
                        </div>

                        {/* Eklenen itemlar */}
                        {form.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {form.items.map((item, i) => (
                                    <span key={i}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                                        style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
                                        <CheckCircle2 size={11} />
                                        {item}
                                        <button
                                            type="button"
                                            onClick={() => removeItem(i)}
                                            className="ml-0.5 hover:text-red-400 transition-colors"
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--text-muted)] italic">Henüz içerik eklenmedi. Yukarıdan ekleyebilirsiniz.</p>
                        )}
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Vitrin */}
                        <button
                            type="button"
                            onClick={() => set('is_featured', !form.is_featured)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${form.is_featured ? 'border-[var(--gold-primary)] bg-[var(--gold-subtle)]' : 'border-[var(--gold-border)] bg-[var(--bg-dark)]'}`}
                        >
                            {form.is_featured
                                ? <ToggleRight size={20} className="text-[var(--gold-primary)]" />
                                : <ToggleLeft size={20} className="text-[var(--text-muted)]" />}
                            <div className="text-left">
                                <div className={`text-xs font-semibold ${form.is_featured ? 'text-[var(--gold-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                    Vitrin'de Göster
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)]">QR sayfasında öne çıkar</div>
                            </div>
                        </button>
                        {/* Aktif */}
                        <button
                            type="button"
                            onClick={() => set('is_active', !form.is_active)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${form.is_active ? 'border-green-500/40 bg-green-500/10' : 'border-[var(--gold-border)] bg-[var(--bg-dark)]'}`}
                        >
                            {form.is_active
                                ? <ToggleRight size={20} className="text-green-400" />
                                : <ToggleLeft size={20} className="text-[var(--text-muted)]" />}
                            <div className="text-left">
                                <div className={`text-xs font-semibold ${form.is_active ? 'text-green-400' : 'text-[var(--text-secondary)]'}`}>
                                    {form.is_active ? 'Aktif' : 'Pasif'}
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)]">Paketi satışa aç/kapat</div>
                            </div>
                        </button>
                    </div>

                    {/* Önizleme indirim */}
                    {form.price && form.original_price && Number(form.original_price) > Number(form.price) && (
                        <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)' }}>
                            <p className="text-xs text-green-400">
                                ✨ %{Math.round((1 - Number(form.price) / Number(form.original_price)) * 100)} indirim görünecek (₺{(Number(form.original_price) - Number(form.price)).toLocaleString('tr-TR')} tasarruf)
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--gold-border)]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-gold flex items-center gap-2 text-sm disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
                        {saving ? 'Kaydediliyor...' : editPkg ? 'Güncelle' : 'Paketi Oluştur'}
                    </button>
                </div>
            </div>

            {/* Yeni Hizmet Modalı */}
            <NewServiceModal
                open={serviceModalOpen}
                onClose={() => setServiceModalOpen(false)}
                onSaved={(newId) => {
                    set('service_id', newId)
                    onSaved() // Refresh services list in parent
                }}
            />
        </div>
    )
}

// ─────────────── ANA SAYFA ───────────────
export default function PackagesPage() {
    const supabase = createClient()
    const [packages, setPackages] = useState<any[]>([])
    const [customerPkgs, setCustomerPkgs] = useState<any[]>([])
    const [services, setServices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'packages' | 'active' | 'services'>('packages')
    const [modalOpen, setModalOpen] = useState(false)
    const [editPkg, setEditPkg] = useState<any | null>(null)
    const [serviceModalOpen, setServiceModalOpen] = useState(false)
    const [editService, setEditService] = useState<any | null>(null)

    const fetchAll = async () => {
        setLoading(true)
        const [{ data: pkgs }, { data: cpkgs }, { data: svcs }] = await Promise.all([
            supabase.from('packages').select('*, services(name)').eq('spa_id', DEMO_SPA_ID).order('created_at', { ascending: false }),
            supabase.from('customer_packages')
                .select('*, customers(full_name), packages(name)')
                .eq('spa_id', DEMO_SPA_ID)
                .gt('remaining_sessions', 0)
                .order('expiry_date'),
            supabase.from('services').select('*').eq('spa_id', DEMO_SPA_ID).order('name'),
        ])
        setPackages(pkgs || [])
        setCustomerPkgs(cpkgs || [])
        setServices(svcs || [])
        setLoading(false)
    }

    useEffect(() => { fetchAll() }, [])

    const openNew = () => { setEditPkg(null); setModalOpen(true) }
    const openEdit = (pkg: any) => { setEditPkg(pkg); setModalOpen(true) }
    const openNewService = () => { setEditService(null); setServiceModalOpen(true) }
    const openEditService = (svc: any) => { setEditService(svc); setServiceModalOpen(true) }

    const toggleActive = async (pkg: any) => {
        const { error } = await supabase
            .from('packages')
            .update({ is_active: !pkg.is_active })
            .eq('id', pkg.id)
        if (error) { toast.error('Güncelleme başarısız'); return }
        toast.success(pkg.is_active ? 'Paket pasif yapıldı' : 'Paket aktif edildi')
        setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p))
    }

    const toggleServiceActive = async (svc: any) => {
        const { error } = await supabase
            .from('services')
            .update({ is_active: !svc.is_active })
            .eq('id', svc.id)
        if (error) { toast.error('Hizmet güncellenemedi'); return }
        toast.success(svc.is_active ? 'Hizmet pasif yapıldı' : 'Hizmet aktif edildi')
        setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_active: !s.is_active } : s))
    }

    return (
        <>
            <PackageFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editPkg={editPkg}
                services={services}
                onSaved={fetchAll}
            />

            <div className="space-y-6 fade-in-up">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Paket Yönetimi</h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            {packages.length} paket tanımlı
                        </p>
                    </div>
                    <button onClick={openNew} className="btn-gold flex items-center gap-2 text-sm">
                        <Plus size={16} /> Yeni Paket
                    </button>
                </div>

                {/* Sekmeler */}
                <div className="flex gap-2 border-b border-[var(--gold-border)] overflow-x-auto">
                    {[
                        { id: 'packages', label: '📦 Paket Kataloğu' },
                        { id: 'services', label: '📋 Hizmetler' }
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as any)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-[var(--gold-primary)] text-[var(--gold-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 rounded-xl" />)}
                    </div>
                ) : tab === 'packages' ? (
                    /* ── Paket Kataloğu ── */
                    packages.length === 0 ? (
                        <div className="card-gold py-20 flex flex-col items-center gap-4 text-center">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}>
                                <Package size={28} className="text-[var(--gold-primary)]" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-[var(--text-primary)]">Henüz paket yok</p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">İlk paketi oluşturmak için butona tıklayın</p>
                            </div>
                            <button onClick={openNew} className="btn-gold flex items-center gap-2 text-sm mt-2">
                                <Plus size={15} /> Paket Oluştur
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {packages.map(pkg => (
                                <div key={pkg.id}
                                    className={`card-gold p-5 relative overflow-hidden flex flex-col transition-opacity ${!pkg.is_active ? 'opacity-50' : ''}`}>
                                    {/* Rozetler */}
                                    {pkg.campaign_label && (
                                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold z-10"
                                            style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#000' }}>
                                            {pkg.campaign_label}
                                        </div>
                                    )}
                                    {pkg.is_featured && (
                                        <div className="absolute top-3 left-3">
                                            <Star size={16} className="text-[var(--gold-primary)]" fill="currentColor" />
                                        </div>
                                    )}

                                    <div className="mt-4 flex-1">
                                        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 pr-12">{pkg.name}</h3>
                                        {pkg.description && (
                                            <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">{pkg.description}</p>
                                        )}
                                        <div className="text-xs text-[var(--text-muted)] space-y-1">
                                            {pkg.services?.name && <div>🎯 {pkg.services.name}</div>}
                                            <div>
                                                🔁 {pkg.sessions_count} seans
                                                {pkg.duration_months ? ` • ${pkg.duration_months} ay` : ''}
                                            </div>
                                        </div>

                                        {/* Paket İçerikleri */}
                                        {pkg.items && pkg.items.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-[var(--gold-border)]/50">
                                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2 font-medium">Paket İçeriği</p>
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                    {pkg.items.slice(0, 6).map((item: string, i: number) => (
                                                        <div key={i} className="flex items-center gap-1.5 min-w-0">
                                                            <CheckCircle2 size={11} className="text-[var(--gold-primary)] flex-shrink-0" />
                                                            <span className="text-xs text-[var(--text-secondary)] truncate">{item}</span>
                                                        </div>
                                                    ))}
                                                    {pkg.items.length > 6 && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs text-[var(--text-muted)]">+{pkg.items.length - 6} daha</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-end gap-2 mt-3">
                                            <span className="text-xl font-bold text-[var(--gold-primary)]">
                                                ₺{Number(pkg.price).toLocaleString('tr-TR')}
                                            </span>
                                            {pkg.original_price && (
                                                <>
                                                    <span className="text-sm text-[var(--text-muted)] line-through">
                                                        ₺{Number(pkg.original_price).toLocaleString('tr-TR')}
                                                    </span>
                                                    <span className="text-xs text-green-400 ml-auto">
                                                        %{Math.round((1 - pkg.price / pkg.original_price) * 100)} tasarruf
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Durum badge */}
                                    <div className="mt-3 mb-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pkg.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[var(--bg-dark)] text-[var(--text-muted)] border border-[var(--gold-border)]'}`}>
                                            {pkg.is_active ? '● Aktif' : '○ Pasif'}
                                        </span>
                                        {pkg.is_featured && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--gold-subtle)] text-[var(--gold-primary)] border border-[var(--gold-border)] ml-1.5">
                                                ★ Vitrin
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-3 border-t border-[var(--gold-border)]">
                                        <button
                                            onClick={() => openEdit(pkg)}
                                            className="flex-1 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 bg-[var(--gold-subtle)] text-[var(--gold-primary)] border border-[var(--gold-border)] hover:bg-[var(--gold-border)] transition-colors"
                                        >
                                            <Edit2 size={12} /> Düzenle
                                        </button>
                                        <button
                                            onClick={() => toggleActive(pkg)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${pkg.is_active
                                                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                                : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                                                }`}
                                        >
                                            {pkg.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    /* ── Hizmetler ── */
                    <div className="card-gold overflow-hidden">
                        <div className="p-4 border-b border-[var(--gold-border)] flex items-center justify-between">
                            <h2 className="text-sm font-bold text-[var(--text-primary)]">Sistemdeki Tüm Hizmetler</h2>
                            <button onClick={openNewService} className="btn-gold flex items-center gap-2 text-xs py-1.5 px-3">
                                <Plus size={14} /> Yeni Hizmet
                            </button>
                        </div>
                        {services.length === 0 ? (
                            <div className="py-16 text-center text-[var(--text-muted)]">
                                <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Tanımlı hizmet bulunmuyor</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--gold-border)]">
                                        <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Hizmet Adı</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Kategori</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Süre</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Fiyat</th>
                                        <th className="text-center px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Durum</th>
                                        <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)]">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map(svc => (
                                        <tr key={svc.id} className={`border-b border-[var(--bg-hover)] table-row-hover transition-opacity ${!svc.is_active ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-[var(--text-primary)]">{svc.name}</div>
                                                {svc.description && <div className="text-xs text-[var(--text-muted)] mt-0.5 max-w-xs truncate">{svc.description}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{svc.category || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{svc.duration_minutes} dk</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-[var(--gold-primary)]">₺{Number(svc.price).toLocaleString('tr-TR')}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${svc.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[var(--bg-dark)] text-[var(--text-muted)] border border-[var(--gold-border)]'}`}>
                                                    {svc.is_active ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditService(svc)}
                                                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors"
                                                        title="Düzenle"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleServiceActive(svc)}
                                                        className={`p-1.5 rounded-lg transition-colors ${svc.is_active ? 'text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10' : 'text-[var(--text-muted)] hover:text-green-400 hover:bg-green-400/10'}`}
                                                        title={svc.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                                                    >
                                                        {svc.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Yeni / Düzenle Hizmet Modalı */}
            <NewServiceModal
                open={serviceModalOpen}
                editService={editService}
                onClose={() => setServiceModalOpen(false)}
                onSaved={() => {
                    setServiceModalOpen(false)
                    fetchAll() // Refresh the list
                }}
            />
        </>
    )
}
