'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import {
    X, User, Stethoscope, Clock, DoorOpen, StickyNote,
    CheckCircle, XCircle, PlayCircle, AlertCircle, Ban, Check, Coffee
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'sonner'
import ServeTreatModal from '@/components/appointments/ServeTreatModal'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    scheduled: { label: 'Bekliyor', color: '#C9A84C', icon: <Clock size={14} /> },
    confirmed: { label: 'Onaylı', color: '#4CAF50', icon: <CheckCircle size={14} /> },
    in_progress: { label: 'Devam Ediyor', color: '#2196F3', icon: <PlayCircle size={14} /> },
    completed: { label: 'Tamamlandı', color: '#888', icon: <Check size={14} /> },
    cancelled: { label: 'İptal', color: '#F44336', icon: <Ban size={14} /> },
    no_show: { label: 'Gelmedi', color: '#FF9800', icon: <AlertCircle size={14} /> },
}

interface Appointment {
    id: string
    scheduled_at: string
    ends_at?: string
    duration_minutes?: number
    status: string
    price?: number
    notes?: string
    customer_id?: string
    staff_id?: string
    service_id?: string
    customers?: { full_name: string; phone?: string; membership_level?: string }
    staff?: { full_name: string; color_code?: string }
    services?: { name: string; price?: number }
    rooms?: { name: string }
}

interface Props {
    appointment: Appointment | null
    onClose: () => void
    onUpdated: () => void
}

const NEXT_STATUSES: Record<string, string[]> = {
    scheduled: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
    confirmed: ['in_progress', 'cancelled', 'no_show'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: ['scheduled'],
    no_show: ['scheduled'],
}

export default function AppointmentQuickView({ appointment: apt, onClose, onUpdated }: Props) {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const panelRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)
    const [serveTreatModalOpen, setServeTreatModalOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose])

    if (!apt) return null

    const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.scheduled
    const scheduledDate = new Date(apt.scheduled_at)
    const nextStatuses = NEXT_STATUSES[apt.status] ?? []

    const changeStatus = async (newStatus: string) => {
        const { error } = await supabase
            .from('appointments')
            .update({ status: newStatus })
            .eq('id', apt.id)

        if (error) {
            toast.error('Durum güncellenemedi')
            return
        }

        // If changing to completed, check if we need to create a pending sale
        if (newStatus === 'completed' && apt.status !== 'completed') {
            const { error: saleError } = await supabase.from('sales').insert({
                spa_id: DEMO_SPA_ID,
                customer_id: apt.customer_id || null,
                staff_id: apt.staff_id || null,
                sale_type: 'service',
                item_name: apt.services?.name || 'Hizmet',
                item_id: apt.service_id || null,
                quantity: 1,
                unit_price: apt.price || 0,
                discount_amount: 0,
                total_price: apt.price || 0,
                payment_status: 'pending',
                notes: `Randevu No: ${apt.id.slice(0, 8)} - Otomatik oluşturulan ödeme kaydı`,
                payment_method: null // Not selected yet
            })

            if (saleError) {
                toast.error('Satış kaydı oluşturulamadı: ' + saleError.message)
            } else {
                toast.success('Randevu tamamlandı. Ödeme Kasaya düştü.')
            }
        } else {
            toast.success(`Durum: ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`)
        }

        onUpdated()
        onClose()
    }

    const statusActions: Record<string, { label: string; variant: 'gold' | 'green' | 'blue' | 'red' | 'orange' }> = {
        confirmed: { label: '✓ Onayla', variant: 'green' },
        in_progress: { label: '▶ Başlat', variant: 'blue' },
        completed: { label: '✅ Tamamla', variant: 'gold' },
        cancelled: { label: '✕ İptal Et', variant: 'red' },
        no_show: { label: '⚠ Gelmedi İşaretle', variant: 'orange' },
        scheduled: { label: '↺ Bekliyor', variant: 'gold' },
    }

    const variantClasses: Record<string, string> = {
        gold: 'bg-[var(--gold-subtle)] text-[var(--gold-primary)] border border-[var(--gold-border)] hover:bg-[var(--gold-border)]',
        green: 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20',
        red: 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
        orange: 'bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20',
    }

    const modalContent = (
        <div className="fixed inset-0 z-[99999] pointer-events-auto">
            {/* Backdrop */}
            <div
                className="absolute inset-0 -z-10 bg-black/40 backdrop-blur-[2px]"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className="absolute right-0 top-0 bottom-0 z-10 w-full max-w-sm bg-[var(--bg-card)] border-l border-[var(--gold-border)] shadow-2xl flex flex-col"
                style={{ animation: 'slideInRight 0.2s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-[var(--gold-border)]">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                                style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                            >
                                {cfg.icon} {cfg.label}
                            </span>
                        </div>
                        <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                            {apt.customers?.full_name}
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {format(scheduledDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-2"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Saat + Süre */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)]/50">
                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Saat</div>
                            <div className="text-lg font-bold text-[var(--gold-primary)]">
                                {format(scheduledDate, 'HH:mm')}
                            </div>
                            {apt.ends_at && (
                                <div className="text-xs text-[var(--text-muted)]">
                                    — {format(new Date(apt.ends_at), 'HH:mm')}
                                </div>
                            )}
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)]/50">
                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Süre</div>
                            <div className="text-lg font-bold text-[var(--text-primary)]">
                                {apt.duration_minutes ?? '—'} <span className="text-sm font-normal text-[var(--text-muted)]">dk</span>
                            </div>
                        </div>
                    </div>

                    {/* Detay listesi */}
                    <div className="space-y-3">
                        <InfoRow icon={<Stethoscope size={15} />} label="Hizmet" value={apt.services?.name} />
                        <InfoRow
                            icon={<User size={15} />}
                            label="Personel"
                            value={apt.staff?.full_name}
                            dot={apt.staff?.color_code}
                        />
                        {apt.rooms?.name && (
                            <InfoRow icon={<DoorOpen size={15} />} label="Oda" value={apt.rooms.name} />
                        )}
                        {apt.customers?.phone && (
                            <InfoRow icon={<User size={15} />} label="Telefon" value={apt.customers.phone} />
                        )}
                        {apt.price != null && (
                            <InfoRow
                                icon={<span className="text-xs font-bold">₺</span>}
                                label="Ücret"
                                value={`₺${Number(apt.price).toLocaleString('tr-TR')}`}
                                valueClass="text-[var(--gold-primary)] font-semibold"
                            />
                        )}
                    </div>

                    {/* Notlar */}
                    {apt.notes && (
                        <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)]/50">
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                <StickyNote size={12} /> Not
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{apt.notes}</p>
                        </div>
                    )}

                    {/* Durum Aksiyonları */}
                    {nextStatuses.length > 0 && (
                        <div>
                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Durum Değiştir</div>
                            <div className="flex flex-wrap gap-2">
                                {nextStatuses.map(s => {
                                    const action = statusActions[s]
                                    if (!action) return null
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => changeStatus(s)}
                                            className={`flex-1 min-w-[calc(50%-4px)] px-3 py-2 rounded-lg text-xs font-medium transition-all ${variantClasses[action.variant]}`}
                                        >
                                            {action.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    {/* İkram Sun Butonu */}
                    {(apt.status === 'in_progress' || apt.status === 'confirmed') && (
                        <div className="pt-2 border-t border-[var(--gold-border)]">
                            <button
                                onClick={() => setServeTreatModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--gold-subtle)] border border-[var(--gold-primary)] text-[var(--gold-primary)] font-semibold hover:bg-[var(--gold-primary)] hover:text-black transition-colors"
                            >
                                <Coffee size={18} /> Müşteriye İkram Sun
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ServeTreatModal
                open={serveTreatModalOpen}
                appointmentId={apt.id}
                customerId={apt.customer_id}
                onClose={() => setServeTreatModalOpen(false)}
                onSaved={onUpdated}
            />
        </div>
    )

    if (!mounted || typeof document === 'undefined') return null
    return createPortal(modalContent, document.body)
}

function InfoRow({
    icon, label, value, dot, valueClass
}: {
    icon: React.ReactNode
    label: string
    value?: string | null
    dot?: string
    valueClass?: string
}) {
    if (!value) return null
    return (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[var(--gold-primary)]"
                style={{ background: 'var(--gold-subtle)' }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs text-[var(--text-muted)]">{label}</div>
                <div className={`text-sm text-[var(--text-primary)] flex items-center gap-1.5 ${valueClass ?? ''}`}>
                    {dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />}
                    {value}
                </div>
            </div>
        </div>
    )
}
