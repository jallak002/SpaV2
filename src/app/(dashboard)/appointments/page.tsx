'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Calendar, ChevronLeft, ChevronRight, LayoutList, CalendarDays } from 'lucide-react'
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns'
import { tr } from 'date-fns/locale'

import NewAppointmentModal from '@/components/appointments/NewAppointmentModal'
import AppointmentQuickView from '@/components/appointments/AppointmentQuickView'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

const STATUS_COLORS: Record<string, string> = {
    scheduled: '#C9A84C',
    confirmed: '#4CAF50',
    in_progress: '#2196F3',
    completed: '#666',
    cancelled: '#F44336',
    no_show: '#FF9800',
}
const STATUS_LABELS: Record<string, string> = {
    scheduled: 'Bekliyor',
    confirmed: 'Onaylı',
    in_progress: 'Devam',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
    no_show: 'Gelmedi',
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 08:00–23:00

// ---- Types ----
interface Appointment {
    id: string
    scheduled_at: string
    ends_at?: string
    duration_minutes?: number
    status: string
    price?: number
    notes?: string
    staff_id?: string
    customers?: { full_name: string; phone?: string; membership_level?: string }
    staff?: { full_name: string; color_code?: string }
    services?: { name: string; price?: number }
    rooms?: { name: string }
}

interface Staff {
    id: string
    full_name: string
    color_code?: string
    is_active?: boolean
}

type ViewMode = 'day' | 'week' | 'list'

export default function AppointmentsPage() {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [staff, setStaff] = useState<Staff[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>('day')
    const [showModal, setShowModal] = useState(false)
    const [quickView, setQuickView] = useState<Appointment | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        let from: string, to: string

        if (viewMode === 'week') {
            from = format(weekStart, 'yyyy-MM-dd')
            to = format(addDays(weekStart, 6), 'yyyy-MM-dd')
        } else {
            const day = format(selectedDate, 'yyyy-MM-dd')
            from = day; to = day
        }

        const [{ data: appts }, { data: stf }] = await Promise.all([
            supabase.from('appointments')
                .select('*, customers(full_name, phone, membership_level), staff(full_name, color_code), services(name, price), rooms(name)')
                .eq('spa_id', DEMO_SPA_ID)
                .gte('scheduled_at', `${from}T00:00:00`)
                .lte('scheduled_at', `${to}T23:59:59`)
                .order('scheduled_at'),
            supabase.from('staff').select('*').eq('spa_id', DEMO_SPA_ID).eq('is_active', true),
        ])
        setAppointments((appts ?? []) as Appointment[])
        setStaff((stf ?? []) as Staff[])
        setLoading(false)
    }, [supabase, selectedDate, weekStart, viewMode])

    useEffect(() => { fetchData() }, [fetchData])

    // Günlük takvim için saat + personel bazında randevular
    const getAptAtHour = (hour: number, staffId?: string) =>
        appointments.filter(apt => {
            const aptHour = new Date(apt.scheduled_at).getHours()
            return aptHour === hour && (!staffId || apt.staff_id === staffId)
        })

    // Haftalık görünüm için gün bazında randevular
    const getAptsForDay = (day: Date) =>
        appointments.filter(apt => isSameDay(new Date(apt.scheduled_at), day))

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    // Özet istatistikler

    const activeCount = appointments.filter(a => ['scheduled', 'confirmed', 'in_progress'].includes(a.status)).length

    return (
        <div className="space-y-5 fade-in-up">
            {/* Başlık */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Randevular</h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        {appointments.length} randevu • {activeCount} aktif
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Görünüm seçici */}
                    <div className="flex rounded-lg overflow-hidden border border-[var(--gold-border)]">
                        {([
                            { id: 'day' as ViewMode, label: 'Günlük', icon: <Calendar size={14} /> },
                            { id: 'week' as ViewMode, label: 'Haftalık', icon: <CalendarDays size={14} /> },
                            { id: 'list' as ViewMode, label: 'Liste', icon: <LayoutList size={14} /> },
                        ]).map(m => (
                            <button key={m.id} onClick={() => setViewMode(m.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-all ${viewMode === m.id
                                    ? 'bg-[var(--gold-primary)] text-black font-medium'
                                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}>
                                {m.icon} {m.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn-gold flex items-center gap-2 text-sm">
                        <Plus size={16} /> Yeni Randevu
                    </button>
                </div>
            </div>

            {/* Tarih navigasyonu */}
            {viewMode !== 'week' ? (
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedDate(d => subDays(d, 1))}
                        className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-colors">
                        <ChevronLeft size={16} />
                    </button>
                    <div className="card-gold px-4 py-2 min-w-52 text-center">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {format(selectedDate, 'dd MMMM yyyy', { locale: tr })}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                            {format(selectedDate, 'EEEE', { locale: tr })}
                            {isToday(selectedDate) && <span className="ml-2 text-[var(--gold-primary)] font-medium">• Bugün</span>}
                        </div>
                    </div>
                    <button onClick={() => setSelectedDate(d => addDays(d, 1))}
                        className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-colors">
                        <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setSelectedDate(new Date())}
                        className="px-3 py-2 rounded-lg text-xs bg-[var(--gold-subtle)] border border-[var(--gold-border)] text-[var(--gold-primary)] hover:bg-[var(--gold-border)] transition-colors">
                        Bugün
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
                        className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-colors">
                        <ChevronLeft size={16} />
                    </button>
                    <div className="card-gold px-4 py-2 min-w-52 text-center">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {format(weekStart, 'dd MMM', { locale: tr })} – {format(addDays(weekStart, 6), 'dd MMM yyyy', { locale: tr })}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">Haftalık görünüm</div>
                    </div>
                    <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
                        className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--gold-border)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-colors">
                        <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                        className="px-3 py-2 rounded-lg text-xs bg-[var(--gold-subtle)] border border-[var(--gold-border)] text-[var(--gold-primary)] hover:bg-[var(--gold-border)] transition-colors">
                        Bu Hafta
                    </button>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
            ) : viewMode === 'list' ? (
                /* ─── Liste Görünümü ─── */
                <div className="card-gold overflow-hidden">
                    {appointments.length === 0 ? (
                        <div className="text-center py-16 text-[var(--text-muted)]">
                            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Bu gün için randevu yok</p>
                            <button onClick={() => setShowModal(true)} className="btn-gold mt-4 text-sm flex items-center gap-2 mx-auto">
                                <Plus size={14} /> Yeni Randevu
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--bg-hover)]">
                            {appointments.map(apt => (
                                <div key={apt.id}
                                    className="flex items-center gap-4 p-4 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                                    onClick={() => setQuickView(apt)}>
                                    <div className="text-center w-16 flex-shrink-0">
                                        <div className="text-sm font-bold text-[var(--gold-primary)]">
                                            {format(new Date(apt.scheduled_at), 'HH:mm')}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)]">{apt.duration_minutes} dk</div>
                                    </div>
                                    <div className="w-1 h-12 rounded-full flex-shrink-0"
                                        style={{ background: apt.staff?.color_code ?? '#C9A84C' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-[var(--text-primary)]">{apt.customers?.full_name}</div>
                                        <div className="text-xs text-[var(--text-muted)]">
                                            {apt.services?.name} • {apt.staff?.full_name}
                                            {apt.rooms?.name && ` • ${apt.rooms.name}`}
                                        </div>
                                    </div>
                                    <span className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                                        style={{
                                            background: `${STATUS_COLORS[apt.status] ?? '#C9A84C'}20`,
                                            color: STATUS_COLORS[apt.status] ?? '#C9A84C',
                                            border: `1px solid ${STATUS_COLORS[apt.status] ?? '#C9A84C'}40`
                                        }}>
                                        {STATUS_LABELS[apt.status] ?? apt.status}
                                    </span>
                                    {apt.price && (
                                        <span className="text-sm font-medium text-[var(--gold-primary)] flex-shrink-0">
                                            ₺{Number(apt.price).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : viewMode === 'week' ? (
                /* ─── Haftalık Görünüm ─── */
                <div className="card-gold overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                            {/* Gün başlıkları */}
                            <div className="grid grid-cols-7 border-b border-[var(--gold-border)]">
                                {weekDays.map(day => (
                                    <div key={day.toISOString()}
                                        className={`p-3 text-center border-l border-[var(--gold-border)] first:border-l-0 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors ${isToday(day) ? 'bg-[var(--gold-subtle)]' : ''
                                            }`}
                                        onClick={() => { setSelectedDate(day); setViewMode('day') }}>
                                        <div className="text-xs text-[var(--text-muted)] capitalize">
                                            {format(day, 'EEE', { locale: tr })}
                                        </div>
                                        <div className={`text-base font-bold mt-0.5 ${isToday(day) ? 'text-[var(--gold-primary)]' : 'text-[var(--text-primary)]'}`}>
                                            {format(day, 'd')}
                                        </div>
                                        {/* Randevu sayısı */}
                                        {getAptsForDay(day).length > 0 && (
                                            <div className="mt-1">
                                                <span className="inline-block w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                                                    style={{ background: 'var(--gold-primary)', color: '#000' }}>
                                                    {getAptsForDay(day).length}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {/* Saat dilimleri */}
                            {HOURS.map(hour => (
                                <div key={hour} className="grid border-b border-[var(--bg-hover)]"
                                    style={{ gridTemplateColumns: `repeat(7, 1fr)`, minHeight: '52px' }}>
                                    {weekDays.map((day, di) => {
                                        const aptsHere = appointments.filter(apt => {
                                            const d = new Date(apt.scheduled_at)
                                            return isSameDay(d, day) && d.getHours() === hour
                                        })
                                        return (
                                            <div key={di}
                                                className={`border-l border-[var(--bg-hover)] first:border-l-0 p-1 space-y-0.5 relative ${isToday(day) ? 'bg-[var(--gold-subtle)]/30' : ''}`}>
                                                {di === 0 && (
                                                    <span className="absolute top-1 right-1 text-[10px] text-[var(--text-muted)] opacity-60">
                                                        {hour.toString().padStart(2, '0')}:00
                                                    </span>
                                                )}
                                                {aptsHere.map(apt => (
                                                    <div key={apt.id}
                                                        className="rounded px-1.5 py-1 text-[11px] font-medium cursor-pointer hover:brightness-110 transition-all"
                                                        style={{
                                                            background: `${STATUS_COLORS[apt.status] ?? '#C9A84C'}25`,
                                                            color: STATUS_COLORS[apt.status] ?? '#C9A84C',
                                                            border: `1px solid ${STATUS_COLORS[apt.status] ?? '#C9A84C'}40`
                                                        }}
                                                        onClick={() => setQuickView(apt)}>
                                                        <div className="font-semibold truncate">{apt.customers?.full_name?.split(' ')[0]}</div>
                                                        <div className="opacity-75 truncate">{format(new Date(apt.scheduled_at), 'HH:mm')}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* ─── Günlük Takvim Görünümü ─── */
                <div className="card-gold overflow-hidden">
                    {appointments.length === 0 ? (
                        <div className="text-center py-16 text-[var(--text-muted)]">
                            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm mb-4">Bu gün için randevu yok</p>
                            <button onClick={() => setShowModal(true)} className="btn-gold text-sm flex items-center gap-2 mx-auto">
                                <Plus size={14} /> Yeni Randevu
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="min-w-[600px]">
                                {/* Header: Personel */}
                                <div className="grid border-b border-[var(--gold-border)]"
                                    style={{ gridTemplateColumns: `72px repeat(${Math.max(staff.length, 1)}, 1fr)` }}>
                                    <div className="p-2 text-xs text-[var(--text-muted)] flex items-end pb-2 pl-3">Saat</div>
                                    {staff.length > 0 ? staff.map(s => (
                                        <div key={s.id} className="p-3 text-center border-l border-[var(--gold-border)]">
                                            <div className="w-7 h-7 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold text-black"
                                                style={{ background: s.color_code ?? 'var(--gold-primary)' }}>
                                                {s.full_name[0]}
                                            </div>
                                            <div className="text-xs font-medium text-[var(--text-primary)] truncate">{s.full_name.split(' ')[0]}</div>
                                        </div>
                                    )) : (
                                        <div className="p-3 text-center text-xs text-[var(--text-muted)]">Personel yok</div>
                                    )}
                                </div>

                                {/* Saat dilimleri */}
                                {HOURS.map(hour => (
                                    <div key={hour} className="grid border-b border-[var(--bg-hover)]"
                                        style={{ gridTemplateColumns: `72px repeat(${Math.max(staff.length, 1)}, 1fr)`, minHeight: '64px' }}>
                                        <div className="flex items-start pt-2 px-3">
                                            <span className="text-xs text-[var(--text-muted)] font-medium">
                                                {hour.toString().padStart(2, '0')}:00
                                            </span>
                                        </div>
                                        {(staff.length > 0 ? staff : [{ id: 'none', full_name: '' }]).map(s => {
                                            const aptsHere = getAptAtHour(hour, s.id === 'none' ? undefined : s.id)
                                            return (
                                                <div key={s.id} className="border-l border-[var(--bg-hover)] p-1 space-y-1">
                                                    {aptsHere.map(apt => (
                                                        <div key={apt.id}
                                                            className="rounded-lg px-2 py-1.5 text-xs font-medium cursor-pointer hover:brightness-110 transition-all group relative"
                                                            style={{
                                                                background: `${STATUS_COLORS[apt.status] ?? '#C9A84C'}20`,
                                                                color: STATUS_COLORS[apt.status] ?? '#C9A84C',
                                                                border: `1px solid ${STATUS_COLORS[apt.status] ?? '#C9A84C'}50`
                                                            }}
                                                            onClick={() => setQuickView(apt)}>
                                                            <div className="font-semibold truncate">
                                                                {apt.customers?.full_name?.split(' ')[0]}
                                                            </div>
                                                            <div className="opacity-75 truncate text-[10px]">
                                                                {format(new Date(apt.scheduled_at), 'HH:mm')}
                                                                {apt.duration_minutes ? ` • ${apt.duration_minutes}dk` : ''}
                                                            </div>
                                                            <div className="opacity-75 truncate text-[10px]">
                                                                {apt.services?.name?.split(' ').slice(0, 2).join(' ')}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Yeni Randevu Modal */}
            <NewAppointmentModal
                open={showModal}
                initialDate={selectedDate}
                onClose={() => setShowModal(false)}
                onSaved={() => { setShowModal(false); fetchData() }}
            />

            {/* Quick View Paneli */}
            <AppointmentQuickView
                appointment={quickView}
                onClose={() => setQuickView(null)}
                onUpdated={fetchData}
            />
        </div>
    )
}
