'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import {
    X, User, Phone, Mail, Calendar, Heart, Flower2,
    DoorOpen, AlertTriangle, MessageSquare, Star
} from 'lucide-react'
import { toast } from 'sonner'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

const MEMBERSHIP_LEVELS = [
    { value: 'standard', label: 'Standard', color: '#888' },
    { value: 'silver', label: 'Silver', color: '#C0C0C0' },
    { value: 'gold', label: 'Gold', color: '#C9A84C' },
    { value: 'vip', label: 'VIP', color: '#9C27B0' },
    { value: 'diamond', label: 'Diamond', color: '#4FC3F7' },
]

const AROMA_OPTIONS = ['Lavanta', 'Okaliptüs', 'Gül', 'Nane', 'Sandal Ağacı', 'Bergamot', 'Ylang-ylang']

interface Props {
    open: boolean
    onClose: () => void
    onSaved: (newCustomerId: string) => void
}

export default function NewCustomerModal({ open, onClose, onSaved }: Props) {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const [saving, setSaving] = useState(false)
    const [tab, setTab] = useState<'basic' | 'preferences'>('basic')

    // Temel bilgiler
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState('')
    const [membershipLevel, setMembershipLevel] = useState('standard')
    const [smsConsent, setSmsConsent] = useState(true)

    // Tercihler
    const [allergies, setAllergies] = useState('')
    const [preferredAroma, setPreferredAroma] = useState('')
    const [preferredRoom, setPreferredRoom] = useState('')
    const [vipNotes, setVipNotes] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fullName.trim() || !phone.trim()) {
            toast.error('Ad Soyad ve Telefon zorunludur.')
            return
        }

        // Telefon ikiye girmiş mi kontrol et
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('spa_id', DEMO_SPA_ID)
            .eq('phone', phone.trim())
            .maybeSingle()

        if (existing) {
            toast.error('Bu telefon numarasıyla kayıtlı müşteri zaten mevcut.')
            return
        }

        setSaving(true)
        const { data, error } = await supabase
            .from('customers')
            .insert({
                spa_id: DEMO_SPA_ID,
                full_name: fullName.trim(),
                phone: phone.trim(),
                email: email.trim() || null,
                birth_date: birthDate || null,
                gender: gender || null,
                membership_level: membershipLevel,
                sms_consent: smsConsent,
                allergies: allergies.trim() || null,
                preferred_aroma: preferredAroma || null,
                preferred_room: preferredRoom.trim() || null,
                vip_notes: vipNotes.trim() || null,
                segment: 'new',
                loyalty_points: 0,
                total_visits: 0,
                total_spent: 0,
            })
            .select('id')
            .single()

        setSaving(false)

        if (error) {
            toast.error('Müşteri kaydedilemedi: ' + error.message)
        } else {
            toast.success(`✅ ${fullName} başarıyla eklendi!`)
            onSaved(data.id)
            handleClose()
        }
    }

    const handleClose = () => {
        setFullName(''); setPhone(''); setEmail(''); setBirthDate('')
        setGender(''); setMembershipLevel('standard'); setSmsConsent(true)
        setAllergies(''); setPreferredAroma(''); setPreferredRoom(''); setVipNotes('')
        setTab('basic')
        onClose()
    }

    if (!open) return null

    const activeMembership = MEMBERSHIP_LEVELS.find(m => m.value === membershipLevel)!

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
            <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--gold-border)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Yeni Müşteri</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Müşteri profilini oluşturun</p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--gold-border)]">
                    {([['basic', 'Temel Bilgiler'], ['preferences', 'Tercihler']] as const).map(([key, label]) => (
                        <button key={key} type="button" onClick={() => setTab(key)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === key
                                ? 'text-[var(--gold-primary)] border-b-2 border-[var(--gold-primary)] -mb-px'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                }`}>
                            {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-4">

                        {tab === 'basic' ? (
                            <>
                                {/* Ad Soyad */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        <User size={12} className="text-[var(--gold-primary)]" /> Ad Soyad *
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="Ayşe Kaya"
                                        required
                                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                                    />
                                </div>

                                {/* Telefon + E-posta */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            <Phone size={12} className="text-[var(--gold-primary)]" /> Telefon *
                                        </label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="0532 xxx xx xx"
                                            required
                                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            <Mail size={12} className="text-[var(--gold-primary)]" /> E-posta
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="ornek@email.com"
                                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Doğum tarihi + Cinsiyet */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            <Calendar size={12} className="text-[var(--gold-primary)]" /> Doğum Tarihi
                                        </label>
                                        <input
                                            type="date"
                                            value={birthDate}
                                            onChange={e => setBirthDate(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            <Heart size={12} className="text-[var(--gold-primary)]" /> Cinsiyet
                                        </label>
                                        <div className="flex gap-2">
                                            {[['female', 'Kadın'], ['male', 'Erkek'], ['other', 'Diğer']].map(([val, lbl]) => (
                                                <button key={val} type="button"
                                                    onClick={() => setGender(gender === val ? '' : val)}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${gender === val
                                                        ? 'bg-[var(--gold-subtle)] border-[var(--gold-primary)] text-[var(--gold-primary)]'
                                                        : 'bg-[var(--bg-dark)] border-[var(--gold-border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                                        }`}>
                                                    {lbl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Üyelik Seviyesi */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        <Star size={12} className="text-[var(--gold-primary)]" /> Üyelik Seviyesi
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                        {MEMBERSHIP_LEVELS.map(m => (
                                            <button key={m.value} type="button"
                                                onClick={() => setMembershipLevel(m.value)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${membershipLevel === m.value
                                                    ? 'border-2'
                                                    : 'border bg-[var(--bg-dark)] border-[var(--gold-border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                                    }`}
                                                style={membershipLevel === m.value ? {
                                                    background: `${m.color}20`,
                                                    borderColor: m.color,
                                                    color: m.color,
                                                } : {}}>
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* SMS İzni */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)]">
                                    <button type="button" onClick={() => setSmsConsent(c => !c)}
                                        className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${smsConsent ? 'bg-[var(--gold-primary)]' : 'bg-[var(--bg-hover)]'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${smsConsent ? 'left-5' : 'left-0.5'}`} />
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
                                            <MessageSquare size={13} className="text-[var(--gold-primary)]" />
                                            SMS/WhatsApp İzni
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)]">Hatırlatma ve kampanya mesajları gönderilebilir</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* TERCIHLER TAB */
                            <>
                                {/* Alerji */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        <AlertTriangle size={12} className="text-[var(--gold-primary)]" /> Alerji / Hassasiyet
                                    </label>
                                    <textarea
                                        value={allergies}
                                        onChange={e => setAllergies(e.target.value)}
                                        rows={2}
                                        placeholder="Fındık, lavanta yağı, boya alerjisi..."
                                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] resize-none transition-colors"
                                    />
                                </div>

                                {/* Tercih edilen aroma */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        <Flower2 size={12} className="text-[var(--gold-primary)]" /> Tercihli Aroma
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {AROMA_OPTIONS.map(a => (
                                            <button key={a} type="button"
                                                onClick={() => setPreferredAroma(preferredAroma === a ? '' : a)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${preferredAroma === a
                                                    ? 'bg-[var(--gold-subtle)] border-[var(--gold-primary)] text-[var(--gold-primary)]'
                                                    : 'bg-[var(--bg-dark)] border-[var(--gold-border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                                    }`}>
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tercihli oda */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        <DoorOpen size={12} className="text-[var(--gold-primary)]" /> Tercihli Oda / Terapi Tipi
                                    </label>
                                    <input
                                        type="text"
                                        value={preferredRoom}
                                        onChange={e => setPreferredRoom(e.target.value)}
                                        placeholder="VIP oda, yatay taş masası..."
                                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                                    />
                                </div>

                                {/* VIP Notlar */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        <Star size={12} className="text-[var(--gold-primary)]" /> Özel / VIP Notlar
                                    </label>
                                    <textarea
                                        value={vipNotes}
                                        onChange={e => setVipNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Özel gereksinimler, kişisel tercihler, önemli notlar..."
                                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] resize-none transition-colors"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 pb-5 space-y-3">
                        {/* Özet şerit */}
                        {fullName && (
                            <div className="p-3 rounded-xl border flex items-center gap-3"
                                style={{ background: `${activeMembership.color}10`, borderColor: `${activeMembership.color}40` }}>
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                                    style={{ background: `${activeMembership.color}25`, color: activeMembership.color }}>
                                    {fullName[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{fullName}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{phone || 'Telefon girilmedi'}</div>
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: `${activeMembership.color}20`, color: activeMembership.color }}>
                                    {activeMembership.label}
                                </span>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button type="button" onClick={handleClose}
                                className="flex-1 py-2.5 rounded-xl border border-[var(--gold-border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                                Vazgeç
                            </button>
                            <button type="submit" disabled={saving}
                                className="flex-1 py-2.5 rounded-xl btn-gold text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Kaydediliyor...
                                    </>
                                ) : '✅ Müşteri Ekle'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
