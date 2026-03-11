'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, TrendingUp, Users, UserCheck, Calendar } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { format, subMonths, startOfMonth, subDays, startOfDay, subWeeks, startOfWeek, subYears, startOfYear, endOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval } from 'date-fns'
import { tr } from 'date-fns/locale'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

const SEGMENT_COLORS: Record<string, string> = {
    active: '#4CAF50',
    vip: '#C9A84C',
    new: '#2196F3',
    at_risk: '#FF9800',
    lost: '#F44336',
}

const SEGMENT_LABELS: Record<string, string> = {
    active: 'Aktif',
    vip: 'VIP',
    new: 'Yeni',
    at_risk: 'Riskli',
    lost: 'Kayıp',
}

type DateRangeType = 'daily' | 'weekly' | 'monthly' | 'yearly'

export default function ReportsPage() {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<DateRangeType>('monthly')
    const [chartData, setChartData] = useState<any[]>([])
    const [segmentData, setSegmentData] = useState<any[]>([])
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalCustomers: 0,
        totalStaff: 0,
        avgCartValue: 0,
        mostPreferredPackage: '-',
        leastPreferredPackage: '-'
    })

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true)
            const now = new Date()
            let startDate: Date;
            let dateIntervals: Date[] = [];
            let dateFormatStr = 'yyyy-MM';
            let labelFormatStr = 'MMM';

            if (dateRange === 'daily') {
                startDate = startOfDay(subDays(now, 6)) // Son 7 Gün
                dateIntervals = eachDayOfInterval({ start: startDate, end: endOfDay(now) })
                dateFormatStr = 'yyyy-MM-dd'
                labelFormatStr = 'dd MMM'
            } else if (dateRange === 'weekly') {
                startDate = startOfWeek(subWeeks(now, 3), { weekStartsOn: 1 }) // Son 4 Hafta
                dateIntervals = eachWeekOfInterval({ start: startDate, end: now }, { weekStartsOn: 1 })
                dateFormatStr = 'I-R'
                labelFormatStr = 'do MMM'
            } else if (dateRange === 'monthly') {
                startDate = startOfMonth(subMonths(now, 5)) // Son 6 Ay
                dateIntervals = eachMonthOfInterval({ start: startDate, end: now })
                dateFormatStr = 'yyyy-MM'
                labelFormatStr = 'MMM yyyy'
            } else {
                startDate = startOfYear(subYears(now, 2)) // Son 3 Yıl
                dateIntervals = eachYearOfInterval({ start: startDate, end: now })
                dateFormatStr = 'yyyy'
                labelFormatStr = 'yyyy'
            }

            const [
                { data: sales },
                { data: customers },
                { count: staffCount }
            ] = await Promise.all([
                supabase.from('sales').select('*')
                    .eq('spa_id', DEMO_SPA_ID)
                    .eq('payment_status', 'paid')
                    .gte('sold_at', startDate.toISOString()),
                supabase.from('customers').select('segment')
                    .eq('spa_id', DEMO_SPA_ID),
                supabase.from('staff').select('id', { count: 'exact', head: true })
                    .eq('spa_id', DEMO_SPA_ID).eq('is_active', true)
            ])

            // Process Sales for Chart
            const dateMap = new Map<string, { label: string, hizmet: number, paket: number, ürün: number }>()

            dateIntervals.forEach(d => {
                const dateKey = format(d, dateFormatStr, { locale: tr })
                dateMap.set(dateKey, {
                    label: dateRange === 'weekly' ? 'Hafta ' + format(d, 'I', { locale: tr }) : format(d, labelFormatStr, { locale: tr }),
                    hizmet: 0,
                    paket: 0,
                    ürün: 0
                })
            })

            let totalRev = 0
            const packageSales: Record<string, number> = {}

                ; (sales || []).forEach(s => {
                    const d = new Date(s.sold_at)
                    const dateKey = format(d, dateFormatStr, { locale: tr })

                    if (dateMap.has(dateKey)) {
                        const dateObj = dateMap.get(dateKey)!
                        const val = Number(s.total_price)
                        // Grouping logic for weekly is tricky since week mapping might mismatch slightly, but dateKey usually aligns with startOfWeek/eachWeekInterval.
                        // Let's rely on format matching. If we used week-based `I-R`, we must use it consistently.
                        if (s.sale_type === 'service') dateObj.hizmet += val
                        else if (s.sale_type === 'package') {
                            dateObj.paket += val
                            const qty = Number(s.quantity) || 1
                            packageSales[s.item_name] = (packageSales[s.item_name] || 0) + qty
                        }
                        else if (s.sale_type === 'product') dateObj.ürün += val
                        totalRev += val
                    }
                })

            setChartData(Array.from(dateMap.values()))

            let mostPkg = '-'
            let leastPkg = '-'
            const pkgList = Object.entries(packageSales).sort((a, b) => b[1] - a[1])
            if (pkgList.length > 0) {
                mostPkg = `${pkgList[0][0]} (${pkgList[0][1]} adet)`
                leastPkg = pkgList.length > 1 ? `${pkgList[pkgList.length - 1][0]} (${pkgList[pkgList.length - 1][1]} adet)` : mostPkg
            }

            // Process Customers for segments
            const segmentCounts: Record<string, number> = {}
                ; (customers || []).forEach(c => {
                    const seg = c.segment || 'new'
                    segmentCounts[seg] = (segmentCounts[seg] || 0) + 1
                })

            const segChartData = Object.entries(segmentCounts).map(([seg, count]) => ({
                name: SEGMENT_LABELS[seg] || seg,
                value: count,
                color: SEGMENT_COLORS[seg] || '#999'
            })).sort((a, b) => b.value - a.value)
            setSegmentData(segChartData)

            const avgCart = (sales?.length || 0) > 0 ? (totalRev / sales!.length) : 0

            setStats({
                totalRevenue: totalRev,
                totalCustomers: customers?.length || 0,
                totalStaff: staffCount || 0,
                avgCartValue: avgCart,
                mostPreferredPackage: mostPkg,
                leastPreferredPackage: leastPkg
            })
            setLoading(false)
        }
        fetchReports()
    }, [dateRange, supabase])

    const formatRevenueCurrency = (val: number) => {
        if (val >= 1000000) return `₺${(val / 1000000).toFixed(1)}M`
        if (val >= 1000) return `₺${(val / 1000).toFixed(1)}K`
        return `₺${val}`
    }

    return (
        <div className="space-y-6 fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Raporlar & Analitik</h1>
                    <p className="text-sm text-[var(--text-muted)]">Gelir ve performans verilerini görüntüleyin</p>
                </div>

                <div className="flex bg-[var(--bg-card)] border border-[var(--gold-border)] rounded-lg p-1">
                    {[
                        { id: 'daily', label: 'Günlük' },
                        { id: 'weekly', label: 'Haftalık' },
                        { id: 'monthly', label: 'Aylık' },
                        { id: 'yearly', label: 'Yıllık' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setDateRange(tab.id as DateRangeType)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${dateRange === tab.id
                                ? 'bg-[var(--gold-subtle)] text-[var(--gold-primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: 'Toplam Gelir', value: loading ? '...' : formatRevenueCurrency(stats.totalRevenue), icon: TrendingUp, color: '#C9A84C' },
                    { label: 'Toplam Müşteri', value: loading ? '...' : stats.totalCustomers, icon: Users, color: '#4CAF50' },
                    { label: 'Personel Sayısı', value: loading ? '...' : stats.totalStaff, icon: UserCheck, color: '#2196F3' },
                    { label: 'Paket Dönüşüm', value: '%68', icon: BarChart3, color: '#9C27B0' },
                ].map((k, i) => (
                    <div key={i} className="card-gold p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: `${k.color}20` }}>
                                <k.icon size={16} style={{ color: k.color }} />
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">{k.label}</span>
                        </div>
                        <div className="text-xl font-bold text-[var(--text-primary)]">{k.value}</div>
                    </div>
                ))}
            </div>

            {/* Gelir Grafiği */}
            <div className="card-gold p-5">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Gelir Dağılımı (Hizmet / Paket / Ürün)</h2>
                </div>
                {loading ? (
                    <div className="h-60 w-full flex items-center justify-center text-[var(--text-muted)] text-sm">Yükleniyor...</div>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#666' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#666' }} tickFormatter={v => formatRevenueCurrency(v)} />
                            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, color: '#F5F5F0' }}
                                formatter={(v: number | undefined) => `₺${(v ?? 0).toLocaleString('tr-TR')}`} />
                            <Legend wrapperStyle={{ color: '#A0A0A0', fontSize: 12 }} />
                            <Bar dataKey="hizmet" name="Hizmet" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="paket" name="Paket" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="ürün" name="Ürün" fill="#2196F3" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Segment Dağılımı */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-gold p-5">
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Müşteri Segment Dağılımı</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={segmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                {segmentData.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, color: '#F5F5F0' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                        {segmentData.map(s => (
                            <span key={s.name} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} /> {s.name} %{s.value}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="card-gold p-5">
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Özet İstatistikler</h2>
                    <div className="space-y-3">
                        {[
                            { label: 'Ortalama Sepet Tutarı', value: loading ? '...' : `₺${Math.round(stats.avgCartValue).toLocaleString('tr-TR')}` },
                            { label: 'Gelir Başına Ortalama Sepet', value: loading ? '...' : (stats.totalRevenue && stats.avgCartValue ? `₺${Math.round(stats.avgCartValue).toLocaleString('tr-TR')}` : '₺0') },
                            { label: 'En Çok Tercih Edilen Paket', value: loading ? '...' : stats.mostPreferredPackage },
                            { label: 'En Az Tercih Edilen Paket', value: loading ? '...' : stats.leastPreferredPackage },
                            { label: 'Paket Dönüşüm Oranı', value: '%68' },
                            { label: 'Yeni Müşteri Edinme (Ay)', value: '5' },
                            { label: 'Ortalama Ziyaret Aralığı', value: '21 gün' },
                            { label: 'Churn Rate', value: '%8' },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--bg-hover)] last:border-0">
                                <span className="text-sm text-[var(--text-secondary)]">{s.label}</span>
                                <span className="text-sm font-semibold text-[var(--gold-primary)]">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
