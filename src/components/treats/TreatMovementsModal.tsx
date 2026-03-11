'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { X, Search, ArrowDownRight, ArrowUpRight, Hash } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface Movement {
    id: string
    movement_type: 'in' | 'out' | 'set'
    quantity: number
    notes: string
    created_at: string
    treats: { name: string }
}

interface Props {
    open: boolean
    onClose: () => void
    treatId?: string | null // if provided, filter by treat
}

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

export default function TreatMovementsModal({ open, onClose, treatId }: Props) {
    const supabase = createClient()
    const [movements, setMovements] = useState<Movement[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    const fetchMovements = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from('treat_stock_movements')
            .select('*, treats(name)')
            .eq('spa_id', DEMO_SPA_ID)
            .order('created_at', { ascending: false })
            .limit(50)

        if (treatId) {
            query = query.eq('treat_id', treatId)
        }

        const { data } = await query
        setMovements(data || [])
        setLoading(false)
    }, [treatId, supabase])

    useEffect(() => {
        if (open) {
            fetchMovements()
        }
    }, [open, fetchMovements])

    if (!open) return null

    const filtered = movements.filter(m => {
        const search = searchQuery.toLocaleLowerCase('tr-TR')
        const name = (m.treats?.name || '').toLocaleLowerCase('tr-TR')
        const note = (m.notes || '').toLocaleLowerCase('tr-TR')
        return name.includes(search) || note.includes(search)
    })

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="glass-card w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-[var(--gold-border)] bg-[var(--bg-dark)]/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Stok Hareketleri</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">İkramların giriş, çıkış ve manuel güncelleme geçmişi</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 border-b border-[var(--gold-border)]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="İkram adı veya notlarda ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] rounded-lg py-2 pl-9 pr-4 focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center py-10 text-[var(--text-muted)] text-sm">Yükleniyor...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10 text-[var(--text-muted)] text-sm">Kayıt bulunamadı.</div>
                    ) : (
                        filtered.map(m => (
                            <div key={m.id} className="flex items-center gap-4 p-3 rounded-xl border border-[var(--gold-border)] bg-[var(--bg-dark)]">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border 
                                    ${m.movement_type === 'in' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                                        m.movement_type === 'out' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' :
                                            'bg-blue-500/10 text-blue-500 border-blue-500/30'}`}>
                                    {m.movement_type === 'in' ? <ArrowDownRight size={18} /> :
                                        m.movement_type === 'out' ? <ArrowUpRight size={18} /> :
                                            <Hash size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-[var(--text-primary)]">{m.treats?.name}</div>
                                    <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                                        {m.movement_type === 'in' ? 'Eklendi' : m.movement_type === 'out' ? 'Düşüldü' : 'Sabitlendi'}
                                        {m.notes ? ` • ${m.notes}` : ''}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-[var(--text-primary)]">
                                        {m.movement_type === 'in' ? '+' : m.movement_type === 'out' ? '-' : ''}{m.quantity}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                        {format(new Date(m.created_at), 'dd MMM yyyy, HH:mm', { locale: tr })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
