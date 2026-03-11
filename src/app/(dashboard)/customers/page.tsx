'use client'

import { useEffect, useRef, useState } from 'react'
import type { ElementType } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Users, Crown, Star, MoreVertical, UserX, UserCheck, Trash2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'sonner'
import NewCustomerModal from '@/components/customers/NewCustomerModal'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface Customer {
    id: string
    full_name: string
    phone: string
    email?: string
    membership_level: string
    segment: string
    total_visits?: number
    total_spent?: number
    risk_score?: number
    last_visit_date?: string
    is_active: boolean
}

const segmentConfig: Record<string, { label: string; cls: string }> = {
    new: { label: 'Yeni', cls: 'segment-new' },
    vip: { label: 'VIP', cls: 'segment-vip' },
    at_risk: { label: 'Riskli', cls: 'segment-at_risk' },
    lost: { label: 'Kayıp', cls: 'segment-lost' },
    active: { label: 'Aktif', cls: 'segment-active' },
    package_holder: { label: 'Paketli', cls: 'segment-package_holder' },
}

const membershipIcon: Record<string, ElementType> = {
    black: Crown,
    platinum: Star,
    gold: Star,
    standard: Users,
}

const membershipColor: Record<string, string> = {
    black: '#000',
    platinum: '#E8E8E8',
    gold: '#C9A84C',
    standard: '#666',
}

// ─── Onay Dialogu ─────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
    title: string
    message: string
    confirmLabel: string
    confirmClass?: string
    onConfirm: () => void
    onCancel: () => void
}
function ConfirmDialog({ title, message, confirmLabel, confirmClass, onConfirm, onCancel }: ConfirmDialogProps) {
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="glass-card w-full max-w-sm p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.3)' }}>
                        <AlertTriangle size={18} className="text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-[var(--gold-border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                        Vazgeç
                    </button>
                    <button onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmClass ?? 'bg-red-500 hover:bg-red-600 text-white'}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── Kebab Menü ────────────────────────────────────────────────────────────────
interface ActionMenuProps {
    customer: Customer
    onToggleActive: () => void
    onDelete: () => void
}
function ActionMenu({ customer, onToggleActive, onDelete }: ActionMenuProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="İşlemler"
            >
                <MoreVertical size={16} />
            </button>

            {open && (
                <div className="absolute right-0 top-8 z-50 w-48 rounded-xl bg-[var(--bg-card)] border border-[var(--gold-border)] shadow-2xl overflow-hidden">
                    <button
                        onClick={() => { setOpen(false); onToggleActive() }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--bg-hover)] transition-colors text-left"
                    >
                        {customer.is_active
                            ? <><UserX size={14} className="text-amber-400" /> Pasif Yap</>
                            : <><UserCheck size={14} className="text-green-400" /> Aktif Yap</>
                        }
                    </button>
                    <div className="h-px bg-[var(--gold-border)]" />
                    <button
                        onClick={() => { setOpen(false); onDelete() }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-500/10 text-red-400 transition-colors text-left"
                    >
                        <Trash2 size={14} /> Müşteriyi Sil
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
    const searchParams = useSearchParams()
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState(searchParams.get('search') ?? '')
    const [segment, setSegment] = useState('all')
    const [showPassive, setShowPassive] = useState(false)
    const [showModal, setShowModal] = useState(false)

    // Onay dialogu state
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean
        type: 'delete' | 'deactivate' | 'activate'
        customer: Customer | null
    }>({ open: false, type: 'delete', customer: null })

    useEffect(() => {
        const querySearch = searchParams.get('search')
        if (querySearch) {
            setSearch(querySearch)
        }
    }, [searchParams])

    useEffect(() => {
        fetchCustomers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [segment, showPassive])


    const fetchCustomers = async () => {
        setLoading(true)
        let query = supabase
            .from('customers')
            .select('*')
            .eq('spa_id', DEMO_SPA_ID)
            .order('created_at', { ascending: false })

        if (segment !== 'all') query = query.eq('segment', segment)
        if (!showPassive) query = query.eq('is_active', true)

        const { data } = await query
        setCustomers((data ?? []) as Customer[])
        setLoading(false)
    }

    const filtered = customers.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase())
    )

    // Pasif/Aktif toggle
    const handleToggleActive = async (customer: Customer) => {
        const newVal = !customer.is_active
        const { error } = await supabase
            .from('customers')
            .update({ is_active: newVal })
            .eq('id', customer.id)

        if (error) {
            toast.error('Güncelleme başarısız: ' + error.message)
        } else {
            toast.success(newVal ? `✅ ${customer.full_name} aktif yapıldı` : `⏸ ${customer.full_name} pasif yapıldı`)
            fetchCustomers()
        }
        setConfirmDialog({ open: false, type: 'deactivate', customer: null })
    }

    // Silme
    const handleDelete = async (customer: Customer) => {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customer.id)

        if (error) {
            toast.error('Silme başarısız: ' + error.message)
        } else {
            toast.success(`🗑 ${customer.full_name} silindi`)
            fetchCustomers()
        }
        setConfirmDialog({ open: false, type: 'delete', customer: null })
    }

    return (
        <div className="space-y-6 fade-in-up">
            {/* Başlık */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Müşteriler</h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        {filtered.length} müşteri gösteriliyor
                        {showPassive && <span className="ml-2 text-amber-400">(pasifler dahil)</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowPassive(p => !p)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${showPassive
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-[var(--bg-card)] border-[var(--gold-border)] text-[var(--text-secondary)] hover:border-[var(--gold-primary)]'
                            }`}
                    >
                        <UserX size={13} />
                        {showPassive ? 'Pasifleri Gizle' : 'Pasifleri Göster'}
                    </button>
                    <button onClick={() => setShowModal(true)} className="btn-gold flex items-center gap-2 text-sm">
                        <Plus size={16} /> Yeni Müşteri
                    </button>
                </div>
            </div>

            {/* Filtreler */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Müşteri adı, telefon veya e-posta..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] text-sm"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['all', 'active', 'vip', 'new', 'at_risk', 'lost', 'package_holder'].map(s => (
                        <button key={s} onClick={() => setSegment(s)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${segment === s
                                ? 'bg-[var(--gold-primary)] text-black'
                                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--gold-border)] hover:border-[var(--gold-primary)]'
                                }`}>
                            {s === 'all' ? 'Tümü' : segmentConfig[s]?.label ?? s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tablo */}
            <div className="card-gold overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--gold-border)]">
                                {['Müşteri', 'Telefon', 'Üyelik', 'Segment', 'Son Ziyaret', 'Toplam Harcama', 'Risk', ''].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="skeleton h-8 rounded" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                                    <Users size={36} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Müşteri bulunamadı</p>
                                </td></tr>
                            ) : (
                                filtered.map(c => {
                                    const Icon = membershipIcon[c.membership_level] ?? Users
                                    return (
                                        <tr key={c.id} className={`border-b border-[var(--bg-hover)] table-row-hover transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                        style={{ background: 'var(--gold-subtle)', color: 'var(--gold-primary)', border: '1px solid var(--gold-border)' }}>
                                                        {c.full_name[0]}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Link href={`/customers/${c.id}`} className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--gold-primary)] transition-colors">
                                                                {c.full_name}
                                                            </Link>
                                                            {!c.is_active && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Pasif</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-[var(--text-muted)]">{c.total_visits} ziyaret</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{c.phone}</td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1 text-xs font-medium"
                                                    style={{ color: membershipColor[c.membership_level] }}>
                                                    <Icon size={12} />
                                                    {c.membership_level.charAt(0).toUpperCase() + c.membership_level.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full ${segmentConfig[c.segment]?.cls ?? ''}`}>
                                                    {segmentConfig[c.segment]?.label ?? c.segment}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                                {c.last_visit_date
                                                    ? format(new Date(c.last_visit_date), 'dd MMM yyyy', { locale: tr })
                                                    : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                                                ₺{Number(c.total_spent ?? 0).toLocaleString('tr-TR')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-12 h-1.5 rounded-full bg-[var(--bg-dark)] overflow-hidden">
                                                        <div className="h-full rounded-full transition-all"
                                                            style={{
                                                                width: `${c.risk_score ?? 0}%`,
                                                                background: (c.risk_score ?? 0) > 70 ? '#F44336' : (c.risk_score ?? 0) > 40 ? '#FF9800' : '#4CAF50'
                                                            }} />
                                                    </div>
                                                    <span className="text-xs text-[var(--text-muted)]">{c.risk_score ?? 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <Link href={`/customers/${c.id}`}
                                                        className="text-xs text-[var(--gold-primary)] hover:text-[var(--gold-light)] transition-colors mr-1">
                                                        Detay →
                                                    </Link>
                                                    <ActionMenu
                                                        customer={c}
                                                        onToggleActive={() => setConfirmDialog({
                                                            open: true,
                                                            type: c.is_active ? 'deactivate' : 'activate',
                                                            customer: c
                                                        })}
                                                        onDelete={() => setConfirmDialog({
                                                            open: true,
                                                            type: 'delete',
                                                            customer: c
                                                        })}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Onay Dialogu */}
            {confirmDialog.open && confirmDialog.customer && (
                confirmDialog.type === 'delete' ? (
                    <ConfirmDialog
                        title="Müşteriyi Sil"
                        message={`"${confirmDialog.customer.full_name}" adlı müşteri kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
                        confirmLabel="Evet, Sil"
                        confirmClass="bg-red-500 hover:bg-red-600 text-white"
                        onConfirm={() => handleDelete(confirmDialog.customer!)}
                        onCancel={() => setConfirmDialog({ open: false, type: 'delete', customer: null })}
                    />
                ) : (
                    <ConfirmDialog
                        title={confirmDialog.type === 'deactivate' ? 'Pasif Yap' : 'Aktif Yap'}
                        message={confirmDialog.type === 'deactivate'
                            ? `"${confirmDialog.customer.full_name}" pasif yapılacak. Randevu alamaz hale gelir.`
                            : `"${confirmDialog.customer.full_name}" tekrar aktif yapılacak.`}
                        confirmLabel={confirmDialog.type === 'deactivate' ? 'Pasif Yap' : 'Aktif Yap'}
                        confirmClass={confirmDialog.type === 'deactivate'
                            ? 'bg-amber-500 hover:bg-amber-600 text-black font-semibold'
                            : 'bg-green-500 hover:bg-green-600 text-white font-semibold'}
                        onConfirm={() => handleToggleActive(confirmDialog.customer!)}
                        onCancel={() => setConfirmDialog({ open: false, type: 'delete', customer: null })}
                    />
                )
            )}

            <NewCustomerModal
                open={showModal}
                onClose={() => setShowModal(false)}
                onSaved={() => { setShowModal(false); fetchCustomers() }}
            />
        </div>
    )
}
