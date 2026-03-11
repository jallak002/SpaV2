'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { X, Coffee } from 'lucide-react'
import { toast } from 'sonner'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface Props {
    open: boolean
    appointmentId: string
    customerId?: string
    onClose: () => void
    onSaved: () => void
}

interface Treat {
    id: string
    name: string
    current_stock: number
}

export default function ServeTreatModal({ open, appointmentId, customerId, onClose, onSaved }: Props) {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const [saving, setSaving] = useState(false)
    const [treats, setTreats] = useState<Treat[]>([])

    const [selectedTreatId, setSelectedTreatId] = useState('')
    const [quantity, setQuantity] = useState('1')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        if (open) {
            fetchTreats()
            setSelectedTreatId('')
            setQuantity('1')
            setNotes('')
        }
    }, [open])

    const fetchTreats = async () => {
        const { data } = await supabase
            .from('treats')
            .select('*')
            .eq('spa_id', DEMO_SPA_ID)
            .order('name')

        if (data) setTreats(data)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTreatId) {
            toast.error('Lütfen bir ikram seçin.')
            return
        }

        const qty = parseInt(quantity)
        if (isNaN(qty) || qty <= 0) {
            toast.error('Geçerli bir adet girin.')
            return
        }

        const selectedTreat = treats.find(t => t.id === selectedTreatId)
        if (selectedTreat && selectedTreat.current_stock < qty) {
            toast.error(`Yetersiz stok! Stokta ${selectedTreat.current_stock} adet var.`)
            return
        }

        setSaving(true)
        const { error } = await supabase
            .from('treat_servings')
            .insert({
                spa_id: DEMO_SPA_ID,
                treat_id: selectedTreatId,
                customer_id: customerId || null,
                appointment_id: appointmentId,
                quantity: qty,
                notes: notes.trim() || null
            })

        setSaving(false)

        if (error) {
            toast.error('İkram kaydedilemedi: ' + error.message)
        } else {
            toast.success('✅ Müşteriye ikram sunuldu ve stoktan düşüldü.')
            onSaved()
            onClose()
        }
    }

    if (!open) return null

    const content = (
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="glass-card w-full max-w-sm">
                <div className="flex items-center justify-between p-5 border-b border-[var(--gold-border)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">İkram Sun</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Müşteriye ikram verin</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            <Coffee size={12} className="text-[var(--gold-primary)]" /> İkram Seç *
                        </label>
                        <select
                            value={selectedTreatId}
                            onChange={e => setSelectedTreatId(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors appearance-none cursor-pointer"
                        >
                            <option value="">Seçin...</option>
                            {treats.map(t => (
                                <option key={t.id} value={t.id} disabled={t.current_stock <= 0}>
                                    {t.name} (Stok: {t.current_stock})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Adet *
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            min="1"
                            required
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Not (İsteğe bağlı)
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Şekersiz, Açık vs."
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] resize-none transition-colors"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[var(--gold-border)]">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-[var(--gold-border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                            Vazgeç
                        </button>
                        <button type="submit" disabled={saving || treats.length === 0}
                            className="flex-1 py-2.5 rounded-xl btn-gold text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : '✅ İkramı Sun'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
