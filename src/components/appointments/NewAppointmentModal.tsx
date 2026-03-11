'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { X, Calendar, User, Stethoscope, DoorOpen, Clock, StickyNote, ChevronDown } from 'lucide-react'
import { format, addMinutes, subHours } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'sonner'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface Customer { id: string; full_name: string; phone?: string; membership_level?: string }
interface Staff { id: string; full_name: string; color_code?: string }
interface Service { id: string; name: string; duration_minutes: number; price: number }
interface Room { id: string; name: string }

interface Props {
    open: boolean
    initialDate?: Date
    onClose: () => void
    onSaved: () => void
}

const DURATION_OPTIONS = [30, 45, 60, 90, 120]

const HOUR_OPTIONS = Array.from({ length: 32 }, (_, i) => {
    const totalMins = 480 + i * 30  // 08:00 → 23:30, 30'ar dk ara
    const h = Math.floor(totalMins / 60).toString().padStart(2, '0')
    const m = (totalMins % 60).toString().padStart(2, '0')
    return `${h}:${m}`
})

export default function NewAppointmentModal({ open, initialDate, onClose, onSaved }: Props) {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    const [customers, setCustomers] = useState<Customer[]>([])
    const [staff, setStaff] = useState<Staff[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [rooms, setRooms] = useState<Room[]>([])
    const [saving, setSaving] = useState(false)

    // Form alanları
    const [customerId, setCustomerId] = useState('')
    const [staffId, setStaffId] = useState('')
    const [serviceId, setServiceId] = useState('')
    const [roomId, setRoomId] = useState('')
    const [date, setDate] = useState(() => format(initialDate ?? new Date(), 'yyyy-MM-dd'))
    const [time, setTime] = useState('10:00')
    const [duration, setDuration] = useState(60)
    const [price, setPrice] = useState('')
    const [notes, setNotes] = useState('')

    // Müşteri arama
    const [customerSearch, setCustomerSearch] = useState('')
    const [customerDropdown, setCustomerDropdown] = useState(false)

    const fetchLookups = useCallback(async () => {
        const [{ data: c }, { data: s }, { data: sv }, { data: r }] = await Promise.all([
            supabase.from('customers').select('id, full_name, phone, membership_level').eq('spa_id', DEMO_SPA_ID).order('full_name'),
            supabase.from('staff').select('id, full_name, color_code').eq('spa_id', DEMO_SPA_ID).eq('is_active', true),
            supabase.from('services').select('id, name, duration_minutes, price').eq('spa_id', DEMO_SPA_ID).eq('is_active', true),
            supabase.from('rooms').select('id, name').eq('spa_id', DEMO_SPA_ID),
        ])
        setCustomers((c ?? []) as Customer[])
        setStaff((s ?? []) as Staff[])
        setServices((sv ?? []) as Service[])
        setRooms((r ?? []) as Room[])
    }, [supabase])

    useEffect(() => {
        if (open) {
            fetchLookups()
            setDate(format(initialDate ?? new Date(), 'yyyy-MM-dd'))
        }
    }, [open, initialDate, fetchLookups])

    // Servis seçilince süre ve fiyatı otomatik doldur
    useEffect(() => {
        const svc = services.find(s => s.id === serviceId)
        if (svc) {
            setDuration(svc.duration_minutes)
            setPrice(String(svc.price))
        }
    }, [serviceId, services])

    const filteredCustomers = customers.filter(c =>
        c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone ?? '').includes(customerSearch)
    )

    const selectedCustomer = customers.find(c => c.id === customerId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customerId || !staffId || !serviceId) {
            toast.error('Müşteri, personel ve hizmet zorunludur.')
            return
        }

        setSaving(true)
        const scheduledAt = new Date(`${date}T${time}:00`)
        const endsAt = addMinutes(scheduledAt, duration)

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const selectedDate = new Date(date)
        selectedDate.setHours(0, 0, 0, 0)

        if (selectedDate.getTime() < today.getTime()) {
            toast.error('Geçmiş günlere randevu oluşturulamaz.')
            setSaving(false)
            return
        }

        // Çakışma kontrolü (Overlapping appointments check)
        const { data: existingAppts } = await supabase
            .from('appointments')
            .select('scheduled_at, ends_at')
            .eq('spa_id', DEMO_SPA_ID)
            .eq('staff_id', staffId)
            .neq('status', 'cancelled') // İptal edilenler çakışma sayılmaz
            .gte('scheduled_at', `${date}T00:00:00`)
            .lte('scheduled_at', `${date}T23:59:59`)

        const hasConflict = existingAppts?.some(appt => {
            const aStart = new Date(appt.scheduled_at).getTime()
            const aEnd = new Date(appt.ends_at).getTime()
            const bStart = scheduledAt.getTime()
            const bEnd = endsAt.getTime()

            // Overlap condition: (StartA < EndB) and (EndA > StartB)
            return aStart < bEnd && aEnd > bStart
        })

        if (hasConflict) {
            toast.error('Seçilen personelin bu saat aralığında başka bir randevusu var. Lütfen farklı bir saat veya personel seçin.')
            setSaving(false)
            return
        }

        const { data: apptData, error } = await supabase.from('appointments').insert({
            spa_id: DEMO_SPA_ID,
            customer_id: customerId,
            staff_id: staffId,
            service_id: serviceId,
            room_id: roomId || null,
            scheduled_at: scheduledAt.toISOString(),
            ends_at: endsAt.toISOString(),
            duration_minutes: duration,
            price: price ? Number(price) : null,
            notes: notes || null,
            status: 'scheduled',
            source: 'receptionist',
        }).select().single()

        setSaving(false)

        if (error) {
            toast.error('Randevu kaydedilemedi: ' + error.message)
        } else {
            toast.success('✅ Randevu oluşturuldu!')

            // --- WhatsApp / SMS Kuyruğu ---
            try {
                const customer = customers.find(c => c.id === customerId)
                const service = services.find(s => s.id === serviceId)
                const phone = customer?.phone?.replace(/\D/g, '') || ''

                if (phone && apptData) {
                    // Spa ayarlarını çek (şablon ve kaç saat önce)
                    const { data: spaSettings } = await supabase
                        .from('spas')
                        .select('wa_template_confirm, wa_template_reminder, wa_reminder_hours, whatsapp_provider')
                        .eq('id', DEMO_SPA_ID)
                        .single()

                    const reminderHours = spaSettings?.wa_reminder_hours ?? 2
                    const apptTimeStr = format(scheduledAt, 'dd.MM.yyyy HH:mm')

                    // Şablonlardaki değişkenleri doldur
                    const confirmMsg = (spaSettings?.wa_template_confirm || 'Merhaba {name}, {time} saatindeki {service} randevunuz onaylanmıştır.')
                        .replace('{name}', customer?.full_name || '')
                        .replace('{time}', apptTimeStr)
                        .replace('{service}', service?.name || '')

                    const reminderMsg = (spaSettings?.wa_template_reminder || 'Merhaba {name}, {time} saatindeki randevunuzu hatırlatırız.')
                        .replace('{name}', customer?.full_name || '')
                        .replace('{time}', apptTimeStr)
                        .replace('{service}', service?.name || '')

                    const reminderScheduledAt = subHours(scheduledAt, reminderHours)
                    const now = new Date()

                    const queueItems: any[] = [
                        // 1. Hemen gönder: Onay mesajı
                        {
                            spa_id: DEMO_SPA_ID,
                            appointment_id: apptData.id,
                            customer_id: customerId,
                            phone,
                            message: confirmMsg,
                            scheduled_at: now.toISOString(),
                            type: 'confirmation',
                            status: 'pending',
                        }
                    ]

                    // 2. Randevudan X saat önce hatırlatma (zamanı geçmemişse ekle)
                    if (reminderScheduledAt > now) {
                        queueItems.push({
                            spa_id: DEMO_SPA_ID,
                            appointment_id: apptData.id,
                            customer_id: customerId,
                            phone,
                            message: reminderMsg,
                            scheduled_at: reminderScheduledAt.toISOString(),
                            type: 'reminder',
                            status: 'pending',
                        })
                    }

                    await supabase.from('wa_message_queue').insert(queueItems)

                    if (spaSettings?.whatsapp_provider === 'none') {
                        toast.info('💬 Mesaj kuyruğa eklendi (Simülasyon — Ayarlar\'dan bir SMS sağlayıcı seçin)')
                    } else {
                        toast.success(`📱 ${queueItems.length} mesaj kuyruğa eklendi`)
                    }
                }
            } catch (waErr) {
                console.warn('WA kuyruğu hatası (randevu yine de kaydedildi):', waErr)
            }
            // --- WhatsApp Kuyruğu Sonu ---

            onSaved()
            handleClose()
        }
    }

    const handleClose = () => {
        setCustomerId(''); setStaffId(''); setServiceId(''); setRoomId('')
        setCustomerSearch(''); setDate(format(new Date(), 'yyyy-MM-dd'))
        setTime('10:00'); setDuration(60); setPrice(''); setNotes('')
        setCustomerDropdown(false)
        onClose()
    }

    if (!open) return null

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
            <div className="glass-card w-full max-w-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--gold-border)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Yeni Randevu</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {format(new Date(date + 'T12:00:00'), 'dd MMMM yyyy EEEE', { locale: tr })}
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">

                    {/* 1. Müşteri */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            <User size={12} className="text-[var(--gold-primary)]" /> Müşteri *
                        </label>
                        <div className="relative">
                            <div
                                className={`w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border cursor-pointer flex items-center justify-between transition-colors ${customerDropdown ? 'border-[var(--gold-primary)]' : 'border-[var(--gold-border)] hover:border-[var(--gold-primary)]'
                                    }`}
                                onClick={() => setCustomerDropdown(d => !d)}
                            >
                                {selectedCustomer ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                            style={{ background: 'var(--gold-subtle)', color: 'var(--gold-primary)' }}>
                                            {selectedCustomer.full_name[0]}
                                        </div>
                                        <span className="text-sm text-[var(--text-primary)]">{selectedCustomer.full_name}</span>
                                        {selectedCustomer.phone && <span className="text-xs text-[var(--text-muted)]">• {selectedCustomer.phone}</span>}
                                    </div>
                                ) : (
                                    <span className="text-sm text-[var(--text-muted)]">Müşteri seçin...</span>
                                )}
                                <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${customerDropdown ? 'rotate-180' : ''}`} />
                            </div>

                            {customerDropdown && (
                                <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl bg-[var(--bg-card)] border border-[var(--gold-border)] shadow-2xl">
                                    <div className="p-2 border-b border-[var(--bg-hover)]">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="İsim veya telefon ile ara..."
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--gold-primary)]"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {filteredCustomers.length === 0 ? (
                                            <div className="text-center py-4 text-sm text-[var(--text-muted)]">Bulunamadı</div>
                                        ) : filteredCustomers.map(c => (
                                            <button key={c.id} type="button"
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors text-left ${customerId === c.id ? 'bg-[var(--gold-subtle)]' : ''}`}
                                                onClick={() => { setCustomerId(c.id); setCustomerDropdown(false); setCustomerSearch('') }}>
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                    style={{ background: 'var(--gold-subtle)', color: 'var(--gold-primary)' }}>
                                                    {c.full_name[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm text-[var(--text-primary)]">{c.full_name}</div>
                                                    {c.phone && <div className="text-xs text-[var(--text-muted)]">{c.phone}</div>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Hizmet + Personel — yan yana */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <Stethoscope size={12} className="text-[var(--gold-primary)]" /> Hizmet *
                            </label>
                            <select
                                value={serviceId}
                                onChange={e => setServiceId(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors appearance-none cursor-pointer">
                                <option value="">Seçin...</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} dk)</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <User size={12} className="text-[var(--gold-primary)]" /> Personel *
                            </label>
                            <select
                                value={staffId}
                                onChange={e => setStaffId(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors appearance-none cursor-pointer">
                                <option value="">Seçin...</option>
                                {staff.map(s => (
                                    <option key={s.id} value={s.id}>{s.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 3. Tarih + Saat */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <Calendar size={12} className="text-[var(--gold-primary)]" /> Tarih *
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                min={format(new Date(), 'yyyy-MM-dd')}
                                required
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors cursor-pointer"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <Clock size={12} className="text-[var(--gold-primary)]" /> Saat *
                            </label>
                            <select
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors appearance-none cursor-pointer">
                                {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 4. Süre + Oda + Fiyat */}
                    <div className="grid grid-cols-3 gap-3 items-end">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <Clock size={12} className="text-[var(--gold-primary)]" /> Süre (dk)
                            </label>
                            <select
                                value={duration}
                                onChange={e => setDuration(Number(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors appearance-none cursor-pointer">
                                {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} dk</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <DoorOpen size={12} className="text-[var(--gold-primary)]" /> Oda
                            </label>
                            <select
                                value={roomId}
                                onChange={e => setRoomId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors appearance-none cursor-pointer">
                                <option value="">Seçilmedi</option>
                                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <span className="w-3 h-3 inline-block" />₺ Ücret
                            </label>
                            <input
                                type="number"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                placeholder="0"
                                min={0}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                            />
                        </div>
                    </div>

                    {/* 5. Notlar */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            <StickyNote size={12} className="text-[var(--gold-primary)]" /> Not (isteğe bağlı)
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Müşterinin özel istekleri, alerji bilgisi..."
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] resize-none transition-colors"
                        />
                    </div>

                    {/* Özet & Buton */}
                    {customerId && serviceId && (
                        <div className="p-3 rounded-xl bg-[var(--gold-subtle)] border border-[var(--gold-border)] text-sm">
                            <div className="flex items-center justify-between text-[var(--text-secondary)]">
                                <span>{date} saat {time}</span>
                                <span>⏱ {duration} dk</span>
                                {price && <span className="font-semibold text-[var(--gold-primary)]">₺{Number(price).toLocaleString('tr-TR')}</span>}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2 border-t border-[var(--gold-border)]">
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
                            ) : '✅ Randevu Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
