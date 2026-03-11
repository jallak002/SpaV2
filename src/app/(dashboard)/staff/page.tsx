'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, UserCheck, Star, Edit, Trash2 } from 'lucide-react'
import NewStaffModal from '@/components/staff/NewStaffModal'
import { toast } from 'sonner'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

export default function StaffPage() {
    const supabase = createClient()
    const [staff, setStaff] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editStaff, setEditStaff] = useState<any | null>(null)

    const fetchStaff = async () => {
        setLoading(true)
        const { data } = await supabase.from('staff').select('*').eq('spa_id', DEMO_SPA_ID).order('full_name')
        setStaff(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchStaff()
    }, [])

    const handleEdit = (s: any) => {
        setEditStaff(s)
        setModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu personeli silmek istediğinize emin misiniz?')) return
        const { error } = await supabase.from('staff').delete().eq('id', id)
        if (error) {
            toast.error('Personel silinemedi')
        } else {
            toast.success('Personel silindi')
            fetchStaff()
        }
    }

    return (
        <div className="space-y-6 fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Personel</h1>
                    <p className="text-sm text-[var(--text-muted)]">{staff.length} personel</p>
                </div>
                <button onClick={() => { setEditStaff(null); setModalOpen(true); }} className="btn-gold flex items-center gap-2 text-sm"><Plus size={16} /> Personel Ekle</button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {staff.map(s => (
                        <div key={s.id} className="card-gold p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                                    style={{ background: `${s.color_code}30`, color: s.color_code, border: `2px solid ${s.color_code}50` }}>
                                    {s.full_name[0]}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-[var(--text-primary)]">{s.full_name}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{s.role}</div>
                                </div>
                                <div className="ml-auto">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'segment-active' : 'status-cancelled'}`}>
                                        {s.is_active ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                            </div>
                            {s.specializations?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {s.specializations.map((sp: string, i: number) => (
                                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-dark)] text-[var(--text-muted)] border border-[var(--gold-border)]">
                                            {sp}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center justify-between pt-3 border-t border-[var(--gold-border)]">
                                <div className="text-xs text-[var(--text-muted)]">
                                    📞 {s.phone || '-'}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-xs font-semibold text-[var(--gold-primary)] pr-2 border-r border-[var(--gold-border)]">
                                        <Star size={11} className="fill-current" /> %{s.commission_rate}
                                    </div>
                                    <button onClick={() => handleEdit(s)} className="text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors" title="Düzenle">
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(s.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors" title="Sil">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <NewStaffModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchStaff}
                editStaff={editStaff}
            />
        </div>
    )
}
