'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Phone, AlertTriangle, MessageCircle, Send } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'sonner'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

const triggerLabels: Record<string, { label: string; color: string }> = {
    at_risk_30: { label: 'Riskli (30 gün)', color: '#FF9800' },
    at_risk_60: { label: 'Riskli (60 gün)', color: '#FF5722' },
    lost_90: { label: 'Kayıp (90 gün)', color: '#F44336' },
    package_expiry: { label: 'Paket Bitiyor', color: '#9C27B0' },
}

export default function RecallPage() {
    const supabase = createClient()
    const [queue, setQueue] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchQueue = () => {
        setLoading(true)
        supabase.from('recall_queue')
            .select('*, customers(full_name, phone, segment)')
            .eq('spa_id', DEMO_SPA_ID)
            .order('created_at', { ascending: false })
            .then(({ data }) => { setQueue(data || []); setLoading(false) })
    }

    useEffect(() => {
        fetchQueue()
    }, [])

    const handleSendIndividual = async (item: any) => {
        const phone = item.customers?.phone?.replace(/\D/g, '') || ''
        if (!phone) {
            toast.error('Müşterinin telefon numarası bulunamadı.')
            return
        }

        // Update status in DB
        const { error } = await supabase.from('recall_queue').update({ status: 'sent' }).eq('id', item.id)
        if (error) {
            toast.error('Durum güncellenirken hata oluştu.')
            return
        }

        // Update local state
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'sent' } : q))

        let msg = `Merhaba ${item.customers?.full_name}, sizi merkezimizde tekrar görmek isteriz!`
        if (item.trigger_reason === 'package_expiry') msg = `Merhaba ${item.customers?.full_name}, paket seanslarınız bitmek üzere! Yeni avantajlı ürün/hizmetlerimiz için bekleriz.`
        if (item.trigger_reason === 'lost_90') msg = `Merhaba ${item.customers?.full_name}, uzun süredir merkezimize uğramadınız. Sizi çok özledik! Bu mesaja özel %20 indirimle randevunuzu oluşturabilirsiniz.`

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        window.open(url, '_blank')
        toast.success('WhatsApp uygulaması/web açılıyor...')
    }

    const handleSendBulk = async () => {
        const pendingItems = queue.filter(q => q.status === 'pending')
        if (pendingItems.length === 0) {
            toast.info('Gönderilecek, beklemede olan kayıt yok.')
            return
        }

        const ids = pendingItems.map(i => i.id)
        const { error } = await supabase.from('recall_queue').update({ status: 'sent' }).in('id', ids)

        if (error) {
            toast.error('Toplu güncelleme hatası: ' + error.message)
            return
        }

        setQueue(prev => prev.map(q => ids.includes(q.id) ? { ...q, status: 'sent' } : q))
        toast.success(`${pendingItems.length} kullanıcıya toplu SMS/WhatsApp API tetiklendi! (Önizleme: Sadece veritabanında Gönderildi olarak güncellendi)`)
    }

    return (
        <div className="space-y-6 fade-in-up">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Geri Çağırma Sistemi</h1>
                <p className="text-sm text-[var(--text-muted)]">Otomatik müşteri hatırlatma kuyruğu • Her gece 02:00 çalışır</p>
            </div>

            {/* Açıklama */}
            <div className="card-gold p-4 flex gap-3">
                <AlertTriangle size={18} className="text-[var(--gold-primary)] flex-shrink-0 mt-0.5" />
                <div>
                    <div className="text-sm font-medium text-[var(--text-primary)] mb-1">Recall Engine Nasıl Çalışır?</div>
                    <div className="text-xs text-[var(--text-muted)] space-y-1">
                        <p>• <span className="text-orange-400">30 gün</span> — Müşteri ortalama ziyaret aralığını aştı → "Riskli" mesajı</p>
                        <p>• <span className="text-red-400">60 gün</span> — Uzun süre gelmeyen müşteri → "Kritik Riskli" mesajı</p>
                        <p>• <span className="text-red-600">90 gün+</span> — Kayıp müşteri → Özel geri dönüş kampanyası</p>
                        <p>• <span className="text-purple-400">Paket bitiyor</span> — Kalan seans ≤ 2 → Yeni paket önerisi</p>
                    </div>
                </div>
            </div>

            {/* Kuyruk */}
            <div className="card-gold overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--gold-border)] flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Mesaj Kuyruğu</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gold-primary)]/20 text-[var(--gold-primary)]">
                            {queue.filter(q => q.status === 'pending').length} bekliyor
                        </span>
                    </div>

                    <button
                        onClick={handleSendBulk}
                        disabled={queue.filter(q => q.status === 'pending').length === 0}
                        className="btn-gold !py-1.5 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={14} /> Toplu Gönder
                    </button>
                </div>
                {loading ? (
                    <div className="p-4 space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded" />)}</div>
                ) : queue.length === 0 ? (
                    <div className="text-center py-14 text-[var(--text-muted)]">
                        <Phone size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Geri çağırma kuyruğu boş</p>
                        <p className="text-xs mt-1">Edge Function her gece otomatik dolduracak</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--bg-hover)]">
                        {queue.map(item => {
                            const triggerInfo = triggerLabels[item.trigger_reason] || { label: item.trigger_reason, color: '#666' }
                            return (
                                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-hover)] transition-colors">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                                        style={{ background: `${triggerInfo.color}20`, color: triggerInfo.color, border: `1px solid ${triggerInfo.color}40` }}>
                                        {item.customers?.full_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-[var(--text-primary)]">{item.customers?.full_name}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{item.customers?.phone}</div>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full flex-shrink-0 font-medium"
                                        style={{ background: `${triggerInfo.color}20`, color: triggerInfo.color, border: `1px solid ${triggerInfo.color}40` }}>
                                        {triggerInfo.label}
                                    </span>
                                    <div className="text-center flex-shrink-0 flex items-center gap-3">
                                        <div className="text-right">
                                            <div className={`text-xs px-2 py-1 inline-block rounded-full ${item.status === 'pending' ? 'segment-at_risk' : item.status === 'sent' ? 'segment-active' : 'status-cancelled'}`}>
                                                {item.status === 'pending' ? 'Bekliyor' : item.status === 'sent' ? 'Gönderildi' : item.status}
                                            </div>
                                            {item.status !== 'pending' && item.scheduled_send_at && (
                                                <div className="text-xs text-[var(--text-muted)] mt-1">
                                                    {format(new Date(item.scheduled_send_at), 'dd MMM HH:mm', { locale: tr })}
                                                </div>
                                            )}
                                        </div>
                                        {item.status === 'pending' && (
                                            <button
                                                onClick={() => handleSendIndividual(item)}
                                                className="w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center border border-[#25D366]/30"
                                                title="WhatsApp ile ulaştır"
                                            >
                                                <MessageCircle size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
