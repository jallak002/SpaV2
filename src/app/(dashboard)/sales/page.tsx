'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, ShoppingCart, TrendingUp, CreditCard, Banknote, X, Calendar } from 'lucide-react'
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'sonner'
import NewSaleModal from '@/components/sales/NewSaleModal'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

type DateRangeType = 'daily' | 'weekly' | 'monthly' | 'yearly'

export default function SalesPage() {
    const supabase = createClient()
    const [dateRange, setDateRange] = useState<DateRangeType>('daily')
    const [sales, setSales] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [periodTotal, setPeriodTotal] = useState(0)
    const [periodBreakdown, setPeriodBreakdown] = useState({ service: 0, product: 0, package: 0 })
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [collectingSale, setCollectingSale] = useState<any>(null)
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [collecting, setCollecting] = useState(false)

    const fetchSales = async () => {
        setLoading(true)
        const now = new Date()
        let startDate: Date;

        if (dateRange === 'daily') {
            startDate = startOfDay(now)
        } else if (dateRange === 'weekly') {
            startDate = startOfWeek(now, { weekStartsOn: 1 })
        } else if (dateRange === 'monthly') {
            startDate = startOfMonth(now)
        } else {
            startDate = startOfYear(now)
        }

        const [{ data: periodSales }, { data: periodPaidSales }] = await Promise.all([
            supabase.from('sales').select('*, customers(full_name), staff(full_name)')
                .eq('spa_id', DEMO_SPA_ID).gte('sold_at', startDate.toISOString()).order('sold_at', { ascending: false }),
            supabase.from('sales').select('total_price, sale_type').eq('spa_id', DEMO_SPA_ID)
                .gte('sold_at', startDate.toISOString()).eq('payment_status', 'paid'),
        ])

        const ps = periodPaidSales || []
        setSales(periodSales || [])
        setPeriodTotal(ps.reduce((s, r) => s + Number(r.total_price), 0))

        const breakdown = { service: 0, product: 0, package: 0 }
        ps.forEach(s => {
            if (s.sale_type === 'service') breakdown.service += Number(s.total_price)
            if (s.sale_type === 'product') breakdown.product += Number(s.total_price)
            if (s.sale_type === 'package') breakdown.package += Number(s.total_price)
        })
        setPeriodBreakdown(breakdown)

        setLoading(false)
    }

    useEffect(() => {
        fetchSales()
    }, [dateRange])

    const paymentIcon = (m: string) => m === 'card' ? <CreditCard size={13} /> : <Banknote size={13} />
    const saleTypeBadge = (t: string) => ({
        service: { label: 'Hizmet', cls: 'segment-active' },
        product: { label: 'Ürün', cls: 'segment-new' },
        package: { label: 'Paket', cls: 'segment-vip' },
    }[t] || { label: t, cls: '' })

    const handleCollectPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!collectingSale) return

        setCollecting(true)
        const { error } = await supabase
            .from('sales')
            .update({
                payment_status: 'paid',
                payment_method: paymentMethod
            })
            .eq('id', collectingSale.id)

        setCollecting(false)
        if (error) {
            toast.error('Ödeme alınamadı: ' + error.message)
        } else {
            toast.success('Ödeme başarıyla alındı!')
            setCollectingSale(null)
            fetchSales()
        }
    }

    return (
        <div className="space-y-6 fade-in-up">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Satış & Kasa</h1>
                    <p className="text-sm text-[var(--text-muted)]">Satış geçmişi ve ödemeler</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Date Filter */}
                    <div className="flex bg-[var(--bg-dark)] p-1 rounded-xl w-fit border border-[var(--gold-border)]">
                        {[
                            { id: 'daily', label: 'Bugün' },
                            { id: 'weekly', label: 'Bu Hafta' },
                            { id: 'monthly', label: 'Bu Ay' },
                            { id: 'yearly', label: 'Bu Yıl' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setDateRange(tab.id as DateRangeType)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dateRange === tab.id
                                    ? 'bg-[var(--gold-subtle)] text-[var(--gold-primary)] shadow-sm'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-gold flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} /> Yeni Satış
                    </button>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Dönem Geliri', value: `₺${periodTotal.toLocaleString('tr-TR')}`, icon: TrendingUp, color: '#C9A84C' },
                    { label: 'İşlem Sayısı', value: sales.length, icon: ShoppingCart, color: '#4CAF50' },
                    { label: 'Tahsil Bekleyen', value: sales.filter(s => s.payment_status === 'pending').length, icon: CreditCard, color: '#F44336' },
                ].map((k, i) => (
                    <div key={i} className="card-gold p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${k.color}20`, border: `1px solid ${k.color}40` }}>
                            <k.icon size={18} style={{ color: k.color }} />
                        </div>
                        <div>
                            <div className="text-xs text-[var(--text-muted)]">{k.label}</div>
                            <div className="text-xl font-bold text-[var(--text-primary)]">{k.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Dönem Raporu */}
            <div className="card-gold p-5">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    <Calendar size={16} className="text-[var(--gold-primary)]" />
                    ÖZET RAPOR
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Hizmet Geliri', value: `₺${periodBreakdown.service.toLocaleString('tr-TR')}` },
                        { label: 'Ürün Geliri', value: `₺${periodBreakdown.product.toLocaleString('tr-TR')}` },
                        { label: 'Paket Satışı', value: `₺${periodBreakdown.package.toLocaleString('tr-TR')}` },
                        { label: 'TOPLAM KAZANÇ', value: `₺${periodTotal.toLocaleString('tr-TR')}`, highlight: true },
                    ].map((r, i) => (
                        <div key={i} className={`p-3 rounded-xl text-center ${r.highlight ? 'border border-[var(--gold-border)] bg-[var(--gold-subtle)] shadow-sm' : 'bg-[var(--bg-dark)]'}`}>
                            <div className="text-xs font-medium text-[var(--text-muted)] mb-1">{r.label}</div>
                            <div className={`text-lg font-bold ${r.highlight ? 'text-[var(--gold-primary)]' : 'text-[var(--text-primary)]'}`}>{r.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Satış Geçmişi */}
            <div className="card-gold overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--gold-border)]">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">Son İşlemler</h2>
                </div>
                {loading ? (
                    <div className="p-4 space-y-3">{[1, 2, 3].map(i => <div className="skeleton h-12 rounded" key={i} />)}</div>
                ) : sales.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Henüz satış yok</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--bg-hover)]">
                                    {['Tarih', 'Müşteri', 'Hizmet/Ürün', 'Tür', 'Personel', 'Ödeme', 'Tutar'].map(h => (
                                        <th key={h} className="text-left px-4 py-2.5 text-xs text-[var(--text-muted)]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(sale => {
                                    const badge = saleTypeBadge(sale.sale_type)
                                    return (
                                        <tr key={sale.id} className="border-b border-[var(--bg-hover)] table-row-hover">
                                            <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                                                {format(new Date(sale.sold_at), 'dd MMM HH:mm', { locale: tr })}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">{sale.customers?.full_name || '-'}</td>
                                            <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)] max-w-32 truncate">{sale.item_name}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{sale.staff?.full_name || '-'}</td>
                                            <td className="px-4 py-2.5">
                                                {sale.payment_status === 'pending' ? (
                                                    <button
                                                        onClick={() => setCollectingSale(sale)}
                                                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 transition-colors">
                                                        Tahsil Et
                                                    </button>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                                        {paymentIcon(sale.payment_method)} {sale.payment_method === 'card' ? 'Kart' : sale.payment_method === 'cash' ? 'Nakit' : sale.payment_method === 'package' ? 'Paket' : 'Havale'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm font-semibold text-[var(--gold-primary)]">
                                                ₺{Number(sale.total_price).toLocaleString('tr-TR')}
                                                {sale.discount_amount > 0 && <span className="text-xs text-red-400 ml-1">(-₺{sale.discount_amount})</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <NewSaleModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={() => fetchSales()}
            />

            {/* Tahsilat Modalı */}
            {collectingSale && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setCollectingSale(null) }}
                >
                    <div className="glass-card w-full max-w-sm">
                        <div className="flex items-center justify-between p-5 border-b border-[var(--gold-border)]">
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Ödeme Al</h2>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">{collectingSale.customers?.full_name}</p>
                            </div>
                            <button onClick={() => setCollectingSale(null)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCollectPayment} className="p-5 space-y-4">
                            <div className="text-center mb-4">
                                <div className="text-sm text-[var(--text-secondary)]">{collectingSale.item_name}</div>
                                <div className="text-2xl font-bold text-[var(--gold-primary)] mt-1">₺{Number(collectingSale.total_price).toLocaleString('tr-TR')}</div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Ödeme Yöntemi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'cash', label: 'Nakit' },
                                        { id: 'card', label: 'Kredi Kartı' },
                                        { id: 'transfer', label: 'Havale / EFT' },
                                        { id: 'package', label: 'Paketten Düş' }
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(m.id)}
                                            className={`py-2 px-3 text-sm rounded-xl border transition-all ${paymentMethod === m.id
                                                ? 'bg-[var(--gold-subtle)] border-[var(--gold-primary)] text-[var(--gold-primary)]'
                                                : 'bg-[var(--bg-dark)] border-[var(--gold-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                                }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setCollectingSale(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-[var(--gold-border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Vazgeç
                                </button>
                                <button type="submit" disabled={collecting}
                                    className="flex-1 py-2.5 rounded-xl btn-gold text-sm font-semibold disabled:opacity-50">
                                    {collecting ? 'Alınıyor...' : 'Tahsil Et'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

