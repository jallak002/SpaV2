'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { X, Hash, PackagePlus, PackageMinus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
    open: boolean
    treat: { id: string, name: string, current_stock: number } | null
    onClose: () => void
    onSaved: () => void
}

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

export default function AdjustStockModal({ open, treat, onClose, onSaved }: Props) {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const [saving, setSaving] = useState(false)

    const [operation, setOperation] = useState<'add' | 'subtract' | 'set'>('add')
    const [amount, setAmount] = useState('0')

    useEffect(() => {
        if (open && treat) {
            setOperation('add')
            setAmount('0')
        }
    }, [open, treat])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!treat) return

        const val = parseInt(amount)
        if (isNaN(val) || val < 0) {
            toast.error('Geçerli bir miktar girin.')
            return
        }

        let newStock = treat.current_stock
        if (operation === 'add') newStock += val
        if (operation === 'subtract') newStock = Math.max(0, newStock - val)
        if (operation === 'set') newStock = val

        setSaving(true)
        const { error } = await supabase
            .from('treats')
            .update({ current_stock: newStock })
            .eq('id', treat.id)

        if (!error) {
            const mappedType = operation === 'add' ? 'in' : operation === 'subtract' ? 'out' : 'set'
            await supabase.from('treat_stock_movements').insert({
                spa_id: DEMO_SPA_ID,
                treat_id: treat.id,
                movement_type: mappedType,
                quantity: val,
                notes: 'Manuel Stok Güncellemesi'
            })
        }

        setSaving(false)

        if (error) {
            toast.error('Stok güncellenemedi: ' + error.message)
        } else {
            toast.success(`✅ Stok güncellendi. Yeni Stok: ${newStock}`)
            onSaved()
            handleClose()
        }
    }

    const handleClose = () => {
        setAmount('0')
        onClose()
    }

    if (!open || !treat) return null

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
            <div className="glass-card w-full max-w-sm">
                <div className="flex items-center justify-between p-5 border-b border-[var(--gold-border)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Stok Güncelle</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{treat.name} (Mevcut: {treat.current_stock})</p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setOperation('add')}
                            className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-colors ${operation === 'add' ? 'bg-[var(--gold-subtle)] border-[var(--gold-primary)] text-[var(--gold-primary)]' : 'bg-[var(--bg-dark)] border-[var(--gold-border)] text-[var(--text-muted)]'}`}>
                            <PackagePlus size={16} /> Ekle
                        </button>
                        <button type="button" onClick={() => setOperation('subtract')}
                            className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-colors ${operation === 'subtract' ? 'bg-[var(--gold-subtle)] border-orange-500 text-orange-500' : 'bg-[var(--bg-dark)] border-[var(--gold-border)] text-[var(--text-muted)]'}`}>
                            <PackageMinus size={16} /> Düş
                        </button>
                        <button type="button" onClick={() => setOperation('set')}
                            className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-colors ${operation === 'set' ? 'bg-[var(--gold-subtle)] border-blue-500 text-blue-500' : 'bg-[var(--bg-dark)] border-[var(--gold-border)] text-[var(--text-muted)]'}`}>
                            <Hash size={16} /> Sabitle
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Miktar
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
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
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${operation === 'subtract' ? 'bg-orange-600 text-white hover:bg-orange-700' : operation === 'set' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'btn-gold'}`}>
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : 'Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
