'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { X, User, Phone, Briefcase, Pipette, Percent } from 'lucide-react'
import { toast } from 'sonner'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface Props {
    open: boolean
    onClose: () => void
    onSaved: () => void
    editStaff?: any | null
}

const COLORS = ['#C9A84C', '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#FF9800', '#00BCD4', '#E91E63']

export default function NewStaffModal({ open, onClose, onSaved, editStaff = null }: Props) {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const [saving, setSaving] = useState(false)

    const [form, setForm] = useState({
        full_name: '',
        role: '',
        phone: '',
        color_code: COLORS[0],
        commission_rate: 0,
        specializations: '',
        is_active: true
    })

    useEffect(() => {
        if (!open) return
        if (editStaff) {
            setForm({
                full_name: editStaff.full_name || '',
                role: editStaff.role || '',
                phone: editStaff.phone || '',
                color_code: editStaff.color_code || COLORS[0],
                commission_rate: editStaff.commission_rate || 0,
                specializations: editStaff.specializations?.join(', ') || '',
                is_active: editStaff.is_active ?? true
            })
        } else {
            setForm({ full_name: '', role: '', phone: '', color_code: COLORS[0], commission_rate: 0, specializations: '', is_active: true })
        }
    }, [open, editStaff])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const specs = form.specializations.split(',').map(s => s.trim()).filter(Boolean)

        const payload = {
            spa_id: DEMO_SPA_ID,
            full_name: form.full_name.trim(),
            role: form.role.trim() || null,
            phone: form.phone.trim() || null,
            color_code: form.color_code,
            commission_rate: Number(form.commission_rate),
            specializations: specs,
            is_active: form.is_active
        }

        try {
            if (editStaff) {
                const { error } = await supabase.from('staff').update(payload).eq('id', editStaff.id)
                if (error) throw error
                toast.success('Personel güncellendi')
            } else {
                const { error } = await supabase.from('staff').insert(payload)
                if (error) throw error
                toast.success('Personel oluşturuldu')
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

    const content = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="glass-card w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-[var(--gold-border)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">{editStaff ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Personel bilgilerini girin</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"><User size={12} className="text-[var(--gold-primary)]" /> Ad Soyad</label>
                        <input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm focus:border-[var(--gold-primary)] outline-none" placeholder="Örn: Ayşe Yılmaz" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"><Briefcase size={12} className="text-[var(--gold-primary)]" /> Görev / Rol</label>
                            <input required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm focus:border-[var(--gold-primary)] outline-none" placeholder="Örn: Masör" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"><Phone size={12} className="text-[var(--gold-primary)]" /> Telefon</label>
                            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm focus:border-[var(--gold-primary)] outline-none" placeholder="05XX XXX XX XX" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"><Pipette size={12} className="text-[var(--gold-primary)]" /> Renk Kodu (Takvim için)</label>
                        <div className="flex gap-2 flex-wrap">
                            {COLORS.map(c => (
                                <button type="button" key={c} onClick={() => setForm({ ...form, color_code: c })}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.color_code === c ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"><Percent size={12} className="text-[var(--gold-primary)]" /> Prim Oranı (%)</label>
                        <input type="number" min="0" max="100" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: Number(e.target.value) })}
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm focus:border-[var(--gold-primary)] outline-none" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">Uzmanlık Alanları</label>
                        <input value={form.specializations} onChange={e => setForm({ ...form, specializations: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm focus:border-[var(--gold-primary)] outline-none" placeholder="Virgülle ayırın (Örn: Lazer, Cilt Bakımı)" />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer mt-2 w-max">
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                            className="w-4 h-4 accent-[var(--gold-primary)] rounded bg-[var(--bg-dark)] border-[var(--gold-border)] border" />
                        <span className="text-sm text-[var(--text-primary)]">Aktif Çalışan</span>
                    </label>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--gold-border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">İptal</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl btn-gold text-sm font-semibold disabled:opacity-50 flex justify-center items-center">
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
