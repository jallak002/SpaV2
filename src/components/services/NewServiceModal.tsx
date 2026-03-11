'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { X, ClipboardList, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface Props {
    open: boolean
    onClose: () => void
    onSaved: (newServiceId: string) => void
    editService?: any | null
}

export default function NewServiceModal({ open, onClose, onSaved, editService = null }: Props) {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    const [saving, setSaving] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [durationMinutes, setDurationMinutes] = useState('')
    const [price, setPrice] = useState('')
    const [category, setCategory] = useState('')

    // Formu doldur
    useEffect(() => {
        if (!open) return
        if (editService) {
            setName(editService.name || '')
            setDescription(editService.description || '')
            setDurationMinutes(String(editService.duration_minutes || ''))
            setPrice(String(editService.price || ''))
            setCategory(editService.category || '')
        } else {
            setName('')
            setDescription('')
            setDurationMinutes('')
            setPrice('')
            setCategory('')
        }
    }, [open, editService])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedName = name.trim()
        if (!trimmedName) {
            toast.error('Lütfen hizmet adı giriniz.')
            return
        }

        const duration = Number(durationMinutes)
        const pr = Number(price)

        if (duration <= 0 || pr < 0) {
            toast.error('Lütfen geçerli bir süre ve fiyat giriniz.')
            return
        }

        setSaving(true)

        try {
            const payload = {
                spa_id: DEMO_SPA_ID,
                name: trimmedName,
                description: description.trim() || null,
                duration_minutes: duration,
                price: pr,
                category: category.trim() || null,
            }

            let returnedId = ''

            if (editService) {
                const { error } = await supabase
                    .from('services')
                    .update(payload)
                    .eq('id', editService.id)

                if (error) throw error
                returnedId = editService.id
                toast.success('Hizmet başarıyla güncellendi.')
            } else {
                const { data, error } = await supabase
                    .from('services')
                    .insert({ ...payload, is_active: true })
                    .select('id')
                    .single()

                if (error) throw error
                returnedId = data.id
                toast.success('Hizmet başarıyla oluşturuldu.')
            }

            onSaved(returnedId)
            handleClose()
        } catch (err: any) {
            console.error('Service save error:', err)
            toast.error('Hizmet oluşturulurken bir hata oluştu.')
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        setName('')
        setDescription('')
        setDurationMinutes('')
        setPrice('')
        setCategory('')
        onClose()
    }

    if (!open) return null

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="card-gold w-full max-w-md relative z-10 flex flex-col p-0 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--gold-border)] bg-[var(--bg-dark)]/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#8B6914)' }}>
                            <ClipboardList size={16} className="text-black" />
                        </div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">
                            {editService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSave} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Hizmet Adı <span className="text-red-400">*</span></label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Örn: İsveç Masajı"
                            className="w-full bg-[var(--bg-dark)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--gold-border)] focus:border-[#C9A84C] rounded-lg px-3 py-2 outline-none transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Kategori</label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Örn: Masaj"
                                className="w-full bg-[var(--bg-dark)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--gold-border)] focus:border-[#C9A84C] rounded-lg px-3 py-2 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Süre (Dk) <span className="text-red-400">*</span></label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                placeholder="60"
                                className="w-full bg-[var(--bg-dark)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--gold-border)] focus:border-[#C9A84C] rounded-lg px-3 py-2 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Fiyat (₺) <span className="text-red-400">*</span></label>
                        <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="1500"
                            className="w-full bg-[var(--bg-dark)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--gold-border)] focus:border-[#C9A84C] rounded-lg px-3 py-2 outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Açıklama</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Hizmet detayları (opsiyonel)"
                            rows={2}
                            className="w-full bg-[var(--bg-dark)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--gold-border)] focus:border-[#C9A84C] rounded-lg px-3 py-2 outline-none transition-colors resize-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#C9A84C] text-black hover:bg-[#b09341] transition-colors flex items-center gap-2 disabled:opacity-70"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    if (typeof document === 'undefined') return null
    return createPortal(modalContent, document.body)
}
