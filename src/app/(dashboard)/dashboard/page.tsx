'use client'

import { useEffect, useRef, useState } from 'react'
import type { ElementType } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    TrendingUp, Calendar, Package, AlertTriangle,
    Users, Clock, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { format, subDays } from 'date-fns'
import { tr } from 'date-fns/locale'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface DashboardAppointment {
    id: string
    scheduled_at: string
    duration_minutes?: number
    status: string
    customers?: { full_name: string; membership_level?: string }
    staff?: { full_name: string; color_code?: string }
    services?: { name: string }
}

interface KpiCard {
    title: string
    value: string | number
    subtext: string
    icon: ElementType
    trend?: { value: string; up: boolean }
    color: string
}

export default function DashboardPage() {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const [customers, setCustomers] = useState<number>(0)
    const [todayAppointments, setTodayAppointments] = useState<DashboardAppointment[]>([])
    const [activePackages, setActivePackages] = useState<number>(0)
    const [riskCustomers, setRiskCustomers] = useState<number>(0)
    const [loading, setLoading] = useState(true)

    const [todayRevenue, setTodayRevenue] = useState(0)
    const [revenueData, setRevenueData] = useState<any[]>([])
    const [monthAppointmentsCount, setMonthAppointmentsCount] = useState(0)
    const [averageSession, setAverageSession] = useState(0)

    useEffect(() => {
        const fetchData = async () => {
            const now = new Date()

            const todayStart = new Date(now)
            todayStart.setHours(0, 0, 0, 0)

            const monthStartStr = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')

            const past30 = subDays(now, 30)
            const thirtyDaysAgo = new Date(past30)
            thirtyDaysAgo.setHours(0, 0, 0, 0)

            const [
                { count: custCount },
                { data: appts },
                { count: pkgCount },
                { count: riskCount },
                { data: todaySales },
                { data: monthAppts },
                { data: last30Sales }
            ] = await Promise.all([
                supabase.from('customers').select('*', { count: 'exact', head: true }).eq('spa_id', DEMO_SPA_ID),
                supabase.from('appointments')
                    .select(`*, customers(full_name, membership_level), staff(full_name, color_code), services(name)`)
                    .eq('spa_id', DEMO_SPA_ID)
                    .gte('scheduled_at', todayStart.toISOString())
                    .lte('scheduled_at', new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString())
                    .order('scheduled_at'),
                supabase.from('packages').select('*', { count: 'exact', head: true })
                    .eq('spa_id', DEMO_SPA_ID).eq('is_active', true),
                supabase.from('customers').select('*', { count: 'exact', head: true })
                    .eq('spa_id', DEMO_SPA_ID).in('segment', ['at_risk', 'lost']),
                supabase.from('sales').select('total_price')
                    .eq('spa_id', DEMO_SPA_ID)
                    .eq('payment_status', 'paid')
                    .gte('sold_at', todayStart.toISOString()),
                supabase.from('appointments').select('duration_minutes')
                    .eq('spa_id', DEMO_SPA_ID)
                    .gte('scheduled_at', `${monthStartStr}T00:00:00`),
                supabase.from('sales').select('total_price, sold_at')
                    .eq('spa_id', DEMO_SPA_ID)
                    .eq('payment_status', 'paid')
                    .gte('sold_at', thirtyDaysAgo.toISOString())
            ])

            setCustomers(custCount || 0)
            setTodayAppointments((appts || []) as DashboardAppointment[])
            setActivePackages(pkgCount || 0)
            setRiskCustomers(riskCount || 0)

            const trVal = (todaySales || []).reduce((sum, s) => sum + Number(s.total_price), 0)
            setTodayRevenue(trVal)

            setMonthAppointmentsCount(monthAppts?.length || 0)
            const durations = (monthAppts || []).map(a => a.duration_minutes || 0).filter(d => d > 0)
            setAverageSession(durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0)

            // Group last 30 days revenue
            const revMap = new Map<string, number>()
            for (let i = 29; i >= 0; i--) {
                const d = format(subDays(now, i), 'dd MMM', { locale: tr })
                revMap.set(d, 0)
            }
            (last30Sales || []).forEach(s => {
                const dateKey = format(new Date(s.sold_at), 'dd MMM', { locale: tr })
                if (revMap.has(dateKey)) {
                    revMap.set(dateKey, revMap.get(dateKey)! + Number(s.total_price))
                }
            })
            const revData = Array.from(revMap.entries()).map(([date, gelir]) => ({ date, gelir }))
            setRevenueData(revData)

            setLoading(false)
        }
        fetchData()
    }, [])

    const kpiCards: KpiCard[] = [
        {
            title: 'Bugünkü Gelir',
            value: loading ? '...' : `₺${todayRevenue.toLocaleString('tr-TR')}`,
            subtext: `Bugün ${todayAppointments.length} randevu`,
            icon: TrendingUp,
            color: '#C9A84C',
        },
        {
            title: 'Bugünkü Randevular',
            value: todayAppointments.length,
            subtext: `${todayAppointments.filter(a => a.status === 'completed').length} tamamlandı`,
            icon: Calendar,
            color: '#4CAF50',
        },
        {
            title: 'Aktif Paketler',
            value: loading ? '...' : activePackages,
            subtext: 'Katalogda satıştaki paketler',
            icon: Package,
            color: '#2196F3',
        },
        {
            title: 'Riskli Müşteriler',
            value: loading ? '...' : riskCustomers,
            subtext: 'Geri çağırma gerekli',
            icon: AlertTriangle,
            color: '#FF9800',
        },
    ]

    const getStatusClass = (status: string) => `status-${status}`
    const getStatusLabel = (status: string) => ({
        scheduled: 'Bekliyor',
        confirmed: 'Onaylı',
        in_progress: 'Devam Ediyor',
        completed: 'Tamamlandı',
        cancelled: 'İptal',
        no_show: 'Gelmedi',
    }[status] || status)

    return (
        <div className="space-y-6 fade-in-up">
            {/* Sayfa başlığı */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
                <p className="text-sm text-[var(--text-muted)]">
                    {format(new Date(), 'dd MMMM yyyy, EEEE', { locale: tr })} — Lotus Wellness & Spa
                </p>
            </div>

            {/* KPI Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpiCards.map((card, i) => (
                    <div key={i} className="card-gold p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[var(--text-secondary)]">{card.title}</span>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                style={{ background: `${card.color}20`, border: `1px solid ${card.color}40` }}>
                                <card.icon size={18} style={{ color: card.color }} />
                            </div>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-2xl font-bold text-[var(--text-primary)]">{card.value}</span>
                            {card.trend && (
                                <span className={`text-xs font-medium flex items-center gap-0.5 mb-0.5 ${card.trend.up ? 'text-green-400' : 'text-red-400'}`}>
                                    {card.trend.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                    {card.trend.value}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{card.subtext}</p>
                    </div>
                ))}
            </div>

            {/* Gelir Grafiği + Bugünkü Randevular */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Gelir Grafiği */}
                <div className="card-gold p-5 xl:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">Son 30 Gün Geliri</h2>
                        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-dark)] px-2 py-1 rounded">₺ Türk Lirası</span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#666' }} interval={4} />
                            <YAxis tick={{ fontSize: 10, fill: '#666' }} tickFormatter={v => `₺${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, color: '#F5F5F0' }}
                                formatter={(v: number | undefined) => [`₺${(v ?? 0).toLocaleString('tr-TR')}`, 'Gelir']}
                            />
                            <Area type="monotone" dataKey="gelir" stroke="#C9A84C" strokeWidth={2} fill="url(#goldGradient)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Hızlı İstatistikler */}
                <div className="card-gold p-5">
                    <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Bu Ay Özeti</h2>
                    <div className="space-y-4">
                        {[
                            { label: 'Toplam Müşteri', value: loading ? '...' : customers, icon: Users, color: '#C9A84C' },
                            { label: 'Aylık Randevu', value: loading ? '...' : monthAppointmentsCount, icon: Calendar, color: '#4CAF50' },
                            { label: 'Aktif Satılan Paket', value: loading ? '...' : activePackages, icon: Package, color: '#2196F3' },
                            { label: 'Ortalama Seans', value: loading ? '...' : `${averageSession} dk`, icon: Clock, color: '#9C27B0' },
                        ].map((stat, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${stat.color}15` }}>
                                    <stat.icon size={16} style={{ color: stat.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
                                    <div className="text-sm font-semibold text-[var(--text-primary)]">{stat.value}</div>
                                </div>
                                <div className="w-20 h-1.5 rounded-full bg-[var(--bg-dark)] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ background: stat.color, width: `${[75, 45, 90, 60][i]}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bugünkü Randevular */}
            <div className="card-gold p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">Bugünkü Randevular</h2>
                    <a href="/appointments" className="text-xs text-[var(--gold-primary)] hover:text-[var(--gold-light)]">Tümünü gör →</a>
                </div>
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}
                    </div>
                ) : todayAppointments.length === 0 ? (
                    <div className="text-center py-10 text-[var(--text-muted)]">
                        <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Bugün randevu bulunmuyor</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {todayAppointments.map((apt) => (
                            <div key={apt.id} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-[var(--bg-dark)] border border-[var(--bg-hover)] hover:border-[var(--gold-border)] transition-colors">
                                <div className="w-16 text-center flex-shrink-0">
                                    <div className="text-sm font-semibold text-[var(--gold-primary)]">
                                        {format(new Date(apt.scheduled_at), 'HH:mm')}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">{apt.duration_minutes} dk</div>
                                </div>
                                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: apt.staff?.color_code || '#C9A84C' }} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                                        {apt.customers?.full_name || 'Bilinmiyor'}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">
                                        {apt.services?.name} • {apt.staff?.full_name}
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${getStatusClass(apt.status)}`}>
                                    {getStatusLabel(apt.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
