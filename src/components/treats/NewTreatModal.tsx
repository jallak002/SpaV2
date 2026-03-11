'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { X, Coffee, Hash } from 'lucide-react'
import { toast } from 'sonner'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface Props {
    open: boolean
    onClose: () => void
    onSaved: () => void
}

export default function NewTreatModal({ open, onClose, onSaved }: Props) {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const [saving, setSaving] = useState(false)

    const [name, setName] = useState('')
    const [currentStock, setCurrentStock] = useState('0')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error('İkram adı zorunludur.')
            return
        }

        setSaving(true)
        const { data: newTreat, error } = await supabase
            .from('treats')
            .insert({
                spa_id: DEMO_SPA_ID,
                name: name.trim(),
                current_stock: parseInt(currentStock) || 0
            })
            .select()
            .single()

        if (!error && newTreat && newTreat.current_stock > 0) {
            await supabase.from('treat_stock_movements').insert({
                spa_id: DEMO_SPA_ID,
                treat_id: newTreat.id,
                movement_type: 'in',
                quantity: newTreat.current_stock,
                notes: 'Başlangıç Stoğu'
            })
        }

        setSaving(false)

        if (error) {
            toast.error('İkram kaydedilemedi: ' + error.message)
        } else {
            toast.success(`✅ ${name} başarıyla eklendi!`)
            onSaved()
            handleClose()
        }
    }

    const handleClose = () => {
        setName('')
        setCurrentStock('0')
        onClose()
    }

    if (!open) return null

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
            <div className="glass-card w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-[var(--gold-border)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Yeni İkram Ekle</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Müşterilere sunulan ikramı tanımlayın</p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            <Coffee size={12} className="text-[var(--gold-primary)]" /> İkram Adı *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Örn: Türk Kahvesi, Karışık Bitki Çayı"
                            required
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            <Hash size={12} className="text-[var(--gold-primary)]" /> Başlangıç Stoğu
                        </label>
                        <input
                            type="number"
                            value={currentStock}
                            onChange={e => setCurrentStock(e.target.value)}
                            placeholder="0"
                            min="0"
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[var(--gold-border)]">
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
                            ) : '✅ İkram Ekle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
