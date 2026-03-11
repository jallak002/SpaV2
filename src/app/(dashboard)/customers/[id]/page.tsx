'use client'

import { useEffect, useRef, useState } from 'react'
import type { ElementType } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import {
    ArrowLeft, Phone, Mail, Calendar, Crown, Star, Users,
    TrendingUp, Package, FileText, AlertTriangle, Clock, Coffee
} from 'lucide-react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

// ---- Tipler ----
interface Customer {
    id: string
    full_name: string
    phone?: string
    email?: string
    membership_level: string
    segment: string
    loyalty_points?: number
    risk_score?: number
    total_visits?: number
    avg_visit_interval_days?: number
    total_spent?: number
    lifetime_value?: number
    last_visit_date?: string
    allergies?: string
    preferred_aroma?: string
    preferred_room?: string
    vip_notes?: string
}

interface Appointment {
    id: string
    scheduled_at: string
    duration_minutes?: number
    status: string
    price?: number
    staff?: { full_name: string }
    services?: { name: string; price?: number }
}

interface CustomerPackage {
    id: string
    purchase_date?: string
    expiry_date?: string
    total_sessions: number
    remaining_sessions: number
    used_sessions: number
    status: string
    packages?: { name: string }
}

interface CustomerLog {
    id: string
    created_at: string
    content: string
}

interface TreatServing {
    id: string
    quantity: number
    served_at: string
    notes?: string
    treats?: { name: string }
    appointments?: { scheduled_at: string, services?: { name: string } }
}

interface Sale {
    id: string
    sold_at: string
    item_name: string
    sale_type: string
    total_price: number
    discount_amount: number
    payment_status: string
    payment_method?: string
}

// ---- Sabitler ----
const membershipColors: Record<string, string> = {
    black: '#111', platinum: '#E8E8E8', gold: '#C9A84C', standard: '#666'
}
const membershipIcons: Record<string, ElementType> = {
    black: Crown, platinum: Star, gold: Star, standard: Users
}
const segmentConfig: Record<string, { label: string; cls: string }> = {
    new: { label: 'Yeni', cls: 'segment-new' },
    vip: { label: 'VIP', cls: 'segment-vip' },
    at_risk: { label: 'Riskli 🔴', cls: 'segment-at_risk' },
    lost: { label: 'Kayıp', cls: 'segment-lost' },
    active: { label: 'Aktif', cls: 'segment-active' },
    package_holder: { label: 'Paketli', cls: 'segment-package_holder' },
}

const STATUS_LABELS: Record<string, string> = {
    scheduled: 'Bekliyor',
    confirmed: 'Onaylı',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
    no_show: 'Gelmedi'
}

const TABS = [
    { id: 'visits', label: 'Ziyaret Geçmişi', icon: Calendar },
    { id: 'treats', label: 'İkramlar', icon: Coffee },
    { id: 'payments', label: 'Ödemeler', icon: TrendingUp },
    { id: 'packages', label: 'Paketler', icon: Package },
    { id: 'analysis', label: 'Davranış Analizi', icon: AlertTriangle },
    { id: 'notes', label: 'Notlar', icon: FileText },
]

export default function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>()
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    const [customer, setCustomer] = useState<Customer | null>(null)
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [packages, setPackages] = useState<CustomerPackage[]>([])
    const [logs, setLogs] = useState<CustomerLog[]>([])
    const [treatServings, setTreatServings] = useState<TreatServing[]>([])
    const [sales, setSales] = useState<Sale[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('visits')

    useEffect(() => {
        const fetchAll = async () => {
            const [{ data: cust }, { data: appts }, { data: pkgs }, { data: lg }, { data: trt }, { data: sls }] = await Promise.all([
                supabase.from('customers').select('*').eq('id', id).single(),
                supabase.from('appointments')
                    .select('*, staff(full_name), services(name, price)')
                    .eq('customer_id', id)
                    .order('scheduled_at', { ascending: false }),
                supabase.from('customer_packages')
                    .select('*, packages(name)')
                    .eq('customer_id', id)
                    .order('created_at', { ascending: false }),
                supabase.from('customer_logs')
                    .select('*')
                    .eq('customer_id', id)
                    .order('created_at', { ascending: false }),
                supabase.from('treat_servings')
                    .select('*, treats(name), appointments(scheduled_at, services(name))')
                    .eq('customer_id', id)
                    .order('served_at', { ascending: false }),
                supabase.from('sales')
                    .select('*')
                    .eq('customer_id', id)
                    .order('sold_at', { ascending: false }),
            ])
            setCustomer(cust as Customer | null)
            setAppointments((appts ?? []) as Appointment[])
            setPackages((pkgs ?? []) as CustomerPackage[])
            setLogs((lg ?? []) as CustomerLog[])
            setTreatServings((trt ?? []) as TreatServing[])
            setSales((sls ?? []) as Sale[])
            setLoading(false)
        }
        fetchAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    if (loading) {
        return <div className="space-y-4 fade-in-up">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
    }
    if (!customer) return <div className="text-center py-20 text-[var(--text-muted)]">Müşteri bulunamadı.</div>

    const Icon = membershipIcons[customer.membership_level] ?? Users
    const lastVisitFormatted = customer.last_visit_date
        ? format(new Date(customer.last_visit_date), 'dd MMM yyyy', { locale: tr })
        : '-'

    // Gerçek Verilerle Bar chart (Son 6 ay)
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (5 - i))
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

        const monthSales = sales.filter(s => {
            if (s.payment_status !== 'paid') return false
            const saleDate = new Date(s.sold_at)
            return saleDate >= monthStart && saleDate <= monthEnd
        })
        const totalSpent = monthSales.reduce((acc, curr) => acc + (curr.total_price - (curr.discount_amount || 0)), 0)

        return {
            ay: format(d, 'MMM', { locale: tr }),
            harcama: totalSpent
        }
    })

    // Dinamik ortalama geliş aralığı
    const completedAppts = appointments.filter(a => a.status === 'completed' || a.status === 'in_progress')
    let calculatedAvgInterval = customer.avg_visit_interval_days || 0
    if (completedAppts.length > 1) {
        const oldest = new Date(completedAppts[completedAppts.length - 1].scheduled_at)
        const newest = new Date(completedAppts[0].scheduled_at)
        const diffDays = differenceInDays(newest, oldest)
        calculatedAvgInterval = Math.max(1, Math.round(diffDays / (completedAppts.length - 1)))
    }

    // Dinamik LTV
    const calculatedLTV = sales
        .filter(s => s.payment_status === 'paid')
        .reduce((sum, s) => sum + (s.total_price - (s.discount_amount || 0)), 0)

    return (
        <div className="space-y-6 fade-in-up max-w-5xl">
            {/* Back */}
            <Link href="/customers" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors">
                <ArrowLeft size={16} /> Müşteri Listesi
            </Link>

            {/* Hero Card */}
            <div className="card-gold p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar + İsim */}
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                            style={{ background: 'var(--gold-subtle)', color: 'var(--gold-primary)', border: '2px solid var(--gold-border)' }}>
                            {customer.full_name[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">{customer.full_name}</h2>
                                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                                    style={{
                                        background: `${membershipColors[customer.membership_level] ?? '#666'}20`,
                                        color: membershipColors[customer.membership_level] ?? '#666',
                                        border: `1px solid ${membershipColors[customer.membership_level] ?? '#666'}40`
                                    }}>
                                    <Icon size={11} /> {customer.membership_level.toUpperCase()}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${segmentConfig[customer.segment]?.cls ?? ''}`}>
                                    {segmentConfig[customer.segment]?.label}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2">
                                {customer.phone && (
                                    <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                                        <Phone size={13} /> {customer.phone}
                                    </span>
                                )}
                                {customer.email && (
                                    <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                                        <Mail size={13} /> {customer.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* İstatistikler */}
                    <div className="md:ml-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Son Geliş', value: lastVisitFormatted },
                            { label: 'Toplam Ziyaret', value: completedAppts.length },
                            { label: 'Ortalama Gelme', value: calculatedAvgInterval ? `${calculatedAvgInterval} günde bir` : '-' },
                            { label: 'Toplam Harcama', value: `₺${Number(calculatedLTV).toLocaleString('tr-TR')}` },
                        ].map((s, i) => (
                            <div key={i} className="text-center p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--bg-hover)]">
                                <div className="text-xs text-[var(--text-muted)] mb-1">{s.label}</div>
                                <div className="text-sm font-semibold text-[var(--text-primary)]">{s.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sadakat puanı + Risk */}
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[var(--gold-border)]">
                    <span className="text-sm text-[var(--text-muted)]">
                        Sadakat Puanı: <span className="text-[var(--gold-primary)] font-semibold">{(customer.loyalty_points ?? 0).toLocaleString('tr-TR')} puan</span>
                    </span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="text-sm text-[var(--text-muted)]">
                        Risk Skoru: <span className={`font-semibold ${(customer.risk_score ?? 0) > 70 ? 'text-red-400' : (customer.risk_score ?? 0) > 40 ? 'text-orange-400' : 'text-green-400'}`}>
                            {customer.risk_score ?? 0}/100
                        </span>
                    </span>
                    {customer.vip_notes && (
                        <>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span className="text-sm text-[var(--text-secondary)]">📝 {customer.vip_notes}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Sekmeler */}
            <div className="flex gap-2 border-b border-[var(--gold-border)] overflow-x-auto">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'border-[var(--gold-primary)] text-[var(--gold-primary)]'
                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }`}>
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab içeriği */}
            <div className="card-gold p-5">
                {/* Ziyaret Geçmişi */}
                {activeTab === 'visits' && (
                    <div className="space-y-2">
                        {appointments.length === 0
                            ? <p className="text-center py-8 text-[var(--text-muted)] text-sm">Henüz ziyaret kaydı yok.</p>
                            : appointments.map(apt => (
                                <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-dark)] border border-[var(--bg-hover)]">
                                    <div className="text-center w-16 flex-shrink-0">
                                        <div className="text-xs font-medium text-[var(--gold-primary)]">
                                            {format(new Date(apt.scheduled_at), 'dd MMM', { locale: tr })}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)]">
                                            {format(new Date(apt.scheduled_at), 'HH:mm')}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-[var(--text-primary)]">{apt.services?.name}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{apt.staff?.full_name} • {apt.duration_minutes} dk</div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full status-${apt.status}`}>
                                        {STATUS_LABELS[apt.status] ?? apt.status}
                                    </span>
                                    {apt.price && <span className="text-sm font-medium text-[var(--gold-primary)]">₺{Number(apt.price).toLocaleString()}</span>}
                                </div>
                            ))
                        }
                    </div>
                )}

                {/* İkramlar */}
                {activeTab === 'treats' && (
                    <div className="space-y-3">
                        {treatServings.length === 0
                            ? <p className="text-center py-8 text-[var(--text-muted)] text-sm">Henüz ikram kaydı yok.</p>
                            : treatServings.map(serving => (
                                <div key={serving.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)]">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--gold-subtle)] text-[var(--gold-primary)] flex-shrink-0">
                                        <Coffee size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                                            {serving.quantity}x {serving.treats?.name}
                                        </div>
                                        {serving.notes && <div className="text-xs text-[var(--text-secondary)] mt-0.5">Not: {serving.notes}</div>}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-[var(--text-primary)] font-medium">
                                            {format(new Date(serving.served_at), 'dd MMM yyyy, HH:mm', { locale: tr })}
                                        </div>
                                        {serving.appointments && (
                                            <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                                Randevu: {format(new Date(serving.appointments.scheduled_at), 'dd MMM')}
                                                {serving.appointments.services?.name ? ` • ${serving.appointments.services.name}` : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                )}

                {/* Davranış Analizi */}
                {activeTab === 'analysis' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Ortalama Geliş Aralığı', value: `${calculatedAvgInterval || '-'} gün`, icon: Clock },
                                { label: 'Yaşam Boyu Değer', value: `₺${Number(calculatedLTV).toLocaleString('tr-TR')}`, icon: TrendingUp },
                                { label: 'Risk Skoru', value: `${customer.risk_score ?? 0}/100`, icon: AlertTriangle },
                            ].map((s, i) => (
                                <div key={i} className="p-4 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-center">
                                    <s.icon size={20} className="mx-auto mb-2 text-[var(--gold-primary)]" />
                                    <div className="text-xs text-[var(--text-muted)] mb-1">{s.label}</div>
                                    <div className="text-lg font-bold text-[var(--text-primary)]">{s.value}</div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Son 6 Ay Harcama (₺)</h3>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="ay" tick={{ fontSize: 11, fill: '#666' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#666' }} tickFormatter={v => `₺${(Number(v) / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, color: '#F5F5F0' }}
                                        formatter={(v: number | undefined) => [`₺${(v ?? 0).toLocaleString('tr-TR')}`, 'Harcama']} />
                                    <Bar dataKey="harcama" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Paketler */}
                {activeTab === 'packages' && (
                    <div className="space-y-6">
                        {/* Sık Tercih Edilenler */}
                        {packages.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                    <Star size={16} className="text-[var(--gold-primary)]" /> Sık Tercih Edilen Paketler
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(
                                        packages.reduce((acc, pkg) => {
                                            const name = pkg.packages?.name || 'İsimsiz Paket'
                                            acc[name] = (acc[name] || 0) + 1
                                            return acc
                                        }, {} as Record<string, number>)
                                    )
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 4)
                                        .map(([name, count], i) => (
                                            <div key={i} className="p-3 rounded-xl bg-[var(--gold-subtle)] border border-[var(--gold-border)] flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[var(--bg-dark)] flex flex-shrink-0 items-center justify-center text-[var(--gold-primary)] font-bold text-sm border border-[var(--gold-border)]">
                                                    {count}x
                                                </div>
                                                <div className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{name}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Tüm Paket Geçmişi */}
                        <div>
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Paket Satın Alma Geçmişi</h3>
                            <div className="space-y-3">
                                {packages.length === 0
                                    ? <p className="text-center py-8 text-[var(--text-muted)] text-sm">Müşteriye ait paket kaydı yok.</p>
                                    : packages.map(pkg => (
                                        <div key={pkg.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)]">
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-[var(--text-primary)]">{pkg.packages?.name}</div>
                                                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                                    {pkg.purchase_date && format(new Date(pkg.purchase_date), 'dd MMM yyyy', { locale: tr })}
                                                    {pkg.expiry_date && ` → ${format(new Date(pkg.expiry_date), 'dd MMM yyyy', { locale: tr })}`}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-[var(--gold-primary)]">{pkg.remaining_sessions}</div>
                                                <div className="text-xs text-[var(--text-muted)]">/ {pkg.total_sessions} seans</div>
                                            </div>
                                            <div className="w-24">
                                                <div className="h-2 rounded-full bg-[var(--bg-dark)] border border-[var(--gold-border)] overflow-hidden">
                                                    <div className="h-full bg-[var(--gold-primary)] rounded-full"
                                                        style={{ width: `${((pkg.total_sessions - pkg.remaining_sessions) / pkg.total_sessions) * 100}%` }} />
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)] text-center mt-1">{pkg.status}</div>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* Notlar */}
                {activeTab === 'notes' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: 'Alerji Bilgileri', value: customer.allergies, icon: '⚠️' },
                                { label: 'Tercih Edilen Aroma', value: customer.preferred_aroma, icon: '🌸' },
                                { label: 'Tercih Edilen Oda', value: customer.preferred_room, icon: '🚪' },
                                { label: 'VIP Notlar', value: customer.vip_notes, icon: '⭐' },
                            ].filter(n => Boolean(n.value)).map((n, i) => (
                                <div key={i} className="p-4 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)]">
                                    <div className="text-xs text-[var(--text-muted)] mb-1">{n.icon} {n.label}</div>
                                    <div className="text-sm text-[var(--text-primary)]">{n.value}</div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-[var(--gold-border)] pt-4">
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Sistem Logları</h3>
                            {logs.length === 0
                                ? <p className="text-sm text-[var(--text-muted)]">Henüz log kaydı yok.</p>
                                : logs.map(log => (
                                    <div key={log.id} className="flex gap-3 py-2 border-b border-[var(--bg-hover)] last:border-0">
                                        <div className="text-xs text-[var(--text-muted)] w-32 flex-shrink-0 mt-0.5">
                                            {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: tr })}
                                        </div>
                                        <div className="text-sm text-[var(--text-secondary)]">{log.content}</div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* Ödemeler */}
                {activeTab === 'payments' && (
                    <div className="space-y-3">
                        {sales.length === 0
                            ? <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                                <TrendingUp size={36} className="mx-auto mb-3 opacity-30" />
                                Henüz ödeme kaydı yok.
                            </div>
                            : sales.map(sale => {
                                const isPaid = sale.payment_status === 'paid'
                                return (
                                    <div key={sale.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)]">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border ${isPaid ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-orange-500/10 text-orange-500 border-orange-500/30'}`}>
                                            <TrendingUp size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                                {sale.item_name}
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                                {format(new Date(sale.sold_at), 'dd MMM yyyy, HH:mm', { locale: tr })}
                                                {' • '}
                                                {sale.sale_type === 'service' ? 'Hizmet' : sale.sale_type === 'product' ? 'Ürün' : 'Paket'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-[var(--gold-primary)]">
                                                ₺{(sale.total_price - (sale.discount_amount || 0)).toLocaleString('tr-TR')}
                                            </div>
                                            <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded inline-block ${isPaid ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                {isPaid ? (sale.payment_method === 'cash' ? 'Nakit' : sale.payment_method === 'card' ? 'Kart' : sale.payment_method === 'transfer' ? 'Havale' : 'Paket') : 'Bekliyor'}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                )}
            </div>
        </div>
    )
}
