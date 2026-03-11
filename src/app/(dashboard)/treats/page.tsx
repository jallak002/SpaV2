'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Coffee, Plus, Search, Edit2, Trash2, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import NewTreatModal from '@/components/treats/NewTreatModal'
import AdjustStockModal from '@/components/treats/AdjustStockModal'
import TreatMovementsModal from '@/components/treats/TreatMovementsModal'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface Treat {
    id: string
    name: string
    current_stock: number
    created_at: string
}

export default function TreatsPage() {
    const supabase = createClient()
    const [treats, setTreats] = useState<Treat[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    const [isNewModalOpen, setIsNewModalOpen] = useState(false)
    const [movementsTreat, setMovementsTreat] = useState<Treat | null>(null)
    const [adjustStockTreat, setAdjustStockTreat] = useState<Treat | null>(null)

    const fetchTreats = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('treats')
            .select('*')
            .eq('spa_id', DEMO_SPA_ID)
            .order('name')

        if (error) {
            toast.error('İkramlar yüklenemedi: ' + error.message)
        } else {
            setTreats(data || [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchTreats()
    }, [fetchTreats])

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`"${name}" ikramını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return

        const { error } = await supabase
            .from('treats')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Silinirken hata oluştu: ' + error.message)
        } else {
            toast.success(`"${name}" başarıyla silindi.`)
            fetchTreats()
        }
    }

    const filteredTreats = treats.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Coffee className="text-[var(--gold-primary)]" />
                        İkram Yönetimi
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Müşterilere sunulan ikramların stoklarını ve kayıtlarını yönetin</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsNewModalOpen(true)}
                        className="btn-gold flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Yeni İkram Ekle
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 rounded-2xl border border-[var(--gold-border)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Coffee size={48} className="text-[var(--gold-primary)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">Toplam Çeşit</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{treats.length}</p>
                </div>
                <div className="glass-card p-5 rounded-2xl border border-[var(--gold-border)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowUpDown size={48} className="text-[var(--gold-primary)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">Toplam Stok (Birim)</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                        {treats.reduce((sum, t) => sum + t.current_stock, 0)}
                    </p>
                </div>
            </div>

            {/* Filters & List */}
            <div className="glass-card border border-[var(--gold-border)] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[var(--gold-border)] flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input
                            type="text"
                            placeholder="İkramlarda ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-dark)] border border-[var(--gold-border)] text-[var(--text-primary)] rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-[var(--gold-primary)] transition-colors text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-dark)]/50 border-b border-[var(--gold-border)]">
                                <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">İkram Adı</th>
                                <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Mevcut Stok</th>
                                <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--bg-hover)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-[var(--gold-subtle)] border-t-[var(--gold-primary)] rounded-full animate-spin" />
                                            <p className="text-sm">İkramlar yükleniyor...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTreats.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-[var(--text-muted)] text-sm">
                                        Hiç ikram bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                filteredTreats.map((treat) => (
                                    <tr key={treat.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-[var(--text-primary)] text-sm">{treat.name}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--gold-subtle)] text-[var(--gold-primary)] border border-[var(--gold-border)]">
                                                {treat.current_stock}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setMovementsTreat(treat)}
                                                    className="p-2 bg-[var(--bg-dark)] border border-[var(--gold-border)] rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                                                    title="Geçmişi Gör"
                                                >
                                                    <ArrowUpDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setAdjustStockTreat(treat)}
                                                    className="p-2 bg-[var(--bg-dark)] border border-[var(--gold-border)] rounded-lg text-[var(--gold-primary)] hover:bg-[var(--gold-subtle)] transition-colors"
                                                    title="Stok Güncelle"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(treat.id, treat.name)}
                                                    className="p-2 bg-[var(--bg-dark)] border border-[var(--gold-border)] rounded-lg text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <NewTreatModal
                open={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                onSaved={fetchTreats}
            />

            <AdjustStockModal
                open={!!adjustStockTreat}
                treat={adjustStockTreat}
                onClose={() => setAdjustStockTreat(null)}
                onSaved={fetchTreats}
            />

            <TreatMovementsModal
                open={!!movementsTreat}
                treatId={movementsTreat?.id}
                onClose={() => setMovementsTreat(null)}
            />
        </div>
    )
}
