'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { X, User, Tag, ShoppingBag, Banknote, FileText } from 'lucide-react'
import { toast } from 'sonner'

const DEMO_SPA_ID = process.env.NEXT_PUBLIC_DEMO_SPA_ID!

interface Props {
    open: boolean
    onClose: () => void
    onSaved: () => void
}

export default function NewSaleModal({ open, onClose, onSaved }: Props) {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const [saving, setSaving] = useState(false)
    const [loadingData, setLoadingData] = useState(false)

    // Data lists
    const [customers, setCustomers] = useState<any[]>([])
    const [staff, setStaff] = useState<any[]>([])
    const [items, setItems] = useState<any[]>([]) // services or packages

    // Form states
    const [customerId, setCustomerId] = useState('')
    const [saleType, setSaleType] = useState('service') // service, product, package
    const [itemId, setItemId] = useState('')
    const [staffId, setStaffId] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [unitPrice, setUnitPrice] = useState<number>(0)
    const [discountAmount, setDiscountAmount] = useState<number>(0)
    const [paymentMethod, setPaymentMethod] = useState('cash') // cash, card, transfer, package
    const [notes, setNotes] = useState('')

    useEffect(() => {
        if (open) {
            fetchInitialData()
        }
    }, [open])

    useEffect(() => {
        if (open && saleType) {
            fetchItemsData(saleType)
        }
    }, [saleType, open])

    const fetchInitialData = async () => {
        setLoadingData(true)
        const [{ data: customersData }, { data: staffData }] = await Promise.all([
            supabase.from('customers').select('id, full_name').eq('spa_id', DEMO_SPA_ID).order('full_name'),
            supabase.from('staff').select('id, full_name').eq('spa_id', DEMO_SPA_ID).eq('is_active', true).order('full_name')
        ])
        setCustomers(customersData || [])
        setStaff(staffData || [])
        setLoadingData(false)
    }

    const fetchItemsData = async (type: string) => {
        setItemId('')
        setUnitPrice(0)
        let data: any[] | null = null
        if (type === 'service') {
            const res = await supabase.from('services').select('id, name, price').eq('spa_id', DEMO_SPA_ID).eq('is_active', true).order('name')
            data = res.data
        } else if (type === 'package') {
            const res = await supabase.from('packages').select('id, name, price').eq('spa_id', DEMO_SPA_ID).eq('is_active', true).order('name')
            data = res.data
        } else if (type === 'product') {
            // If you have a products table, fetch it here. For now it's empty.
            data = []
        }
        setItems(data || [])
    }

    const handleItemSelect = (id: string) => {
        setItemId(id)
        const selectedItem = items.find(i => i.id === id)
        if (selectedItem) {
            setUnitPrice(selectedItem.price || 0)
        } else {
            setUnitPrice(0)
        }
    }

    const totalPrice = Math.max(0, (quantity * unitPrice) - discountAmount)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!saleType || !itemId || !unitPrice) {
            toast.error('Lütfen Satış Tipi, Öğe ve Fiyat bilgilerini doldurun.')
            return
        }

        const selectedItemName = items.find(i => i.id === itemId)?.name || 'Bilinmeyen Öğe'

        setSaving(true)
        const { error } = await supabase
            .from('sales')
            .insert({
                spa_id: DEMO_SPA_ID,
                customer_id: customerId || null,
                staff_id: staffId || null,
                sale_type: saleType,
                item_name: selectedItemName,
                item_id: itemId,
                quantity: quantity,
                unit_price: unitPrice,
                discount_amount: discountAmount,
                total_price: totalPrice,
                payment_method: paymentMethod,
                notes: notes.trim() || null,
                payment_status: 'paid'
            })

        setSaving(false)

        if (error) {
            toast.error('Satış kaydedilemedi: ' + error.message)
            return
        }

        // Paketsatışı yapıldıysa, müşterinin paket hesabına ekle
        if (saleType === 'package' && customerId && itemId) {
            const { data: pkgData } = await supabase.from('packages').select('sessions_count, duration_months').eq('id', itemId).single()
            if (pkgData) {
                const expiryDate = new Date()
                expiryDate.setMonth(expiryDate.getMonth() + (pkgData.duration_months || 12)) // Default 1 year if undefined

                const { error: pkgError } = await supabase.from('customer_packages').insert({
                    spa_id: DEMO_SPA_ID,
                    customer_id: customerId,
                    package_id: itemId,
                    total_sessions: parseInt(pkgData.sessions_count || 0) * quantity,
                    remaining_sessions: parseInt(pkgData.sessions_count || 0) * quantity,
                    purchase_date: new Date().toISOString(),
                    expiry_date: expiryDate.toISOString(),
                    status: 'Aktif'
                })
                if (pkgError) {
                    toast.error('Gelişmiş paket oluşturulamadı: ' + pkgError.message)
                }
            }
        }

        toast.success('✅ Satış başarıyla eklendi!')
        onSaved()
        handleClose()
    }

    const handleClose = () => {
        setCustomerId('')
        setSaleType('service')
        setItemId('')
        setStaffId('')
        setQuantity(1)
        setUnitPrice(0)
        setDiscountAmount(0)
        setPaymentMethod('cash')
        setNotes('')
        onClose()
    }

    if (!open) return null

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
            <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-[var(--gold-border)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Yeni Satış</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Satış detaylarını girin</p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Müşteri & Personel */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <User size={12} className="text-[var(--gold-primary)]" /> Müşteri
                            </label>
                            <select
                                value={customerId}
                                onChange={e => setCustomerId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                            >
                                <option value="">Müşteri Seçilmedi</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <User size={12} className="text-[var(--gold-primary)]" /> Satışı Yapan
                            </label>
                            <select
                                value={staffId}
                                onChange={e => setStaffId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                            >
                                <option value="">Personel Seçin</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Satış Tipi & Öğe */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <Tag size={12} className="text-[var(--gold-primary)]" /> Satış Türü
                            </label>
                            <select
                                value={saleType}
                                onChange={e => setSaleType(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                            >
                                <option value="service">Hizmet</option>
                                <option value="package">Paket</option>
                                <option value="product">Ürün</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <ShoppingBag size={12} className="text-[var(--gold-primary)]" /> Satılacak Öğe
                            </label>
                            <select
                                value={itemId}
                                onChange={e => handleItemSelect(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)] transition-colors"
                            >
                                <option value="">Öğe Seçin</option>
                                {items.map(i => <option key={i.id} value={i.id}>{i.name} (₺{i.price})</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Fiyatlandırma */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Miktar</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(Number(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Birim Fiyat (₺)</label>
                            <input
                                type="number"
                                min="0"
                                value={unitPrice}
                                onChange={e => setUnitPrice(Number(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider text-red-400">İndirim (₺)</label>
                            <input
                                type="number"
                                min="0"
                                value={discountAmount}
                                onChange={e => setDiscountAmount(Number(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-red-900/50 text-sm text-[var(--text-primary)] focus:outline-none focus:border-red-500"
                            />
                        </div>
                    </div>

                    {/* Ödeme Yöntemi & Toplam */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--gold-border)]" style={{ background: 'var(--gold-subtle)' }}>
                        <div className="flex-1 space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                <Banknote size={12} className="text-[var(--gold-primary)]" /> Ödeme Yöntemi
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold-primary)]"
                            >
                                <option value="cash">Nakit</option>
                                <option value="card">Kredi Kartı</option>
                                <option value="transfer">Havale / EFT</option>
                                <option value="package">Paketten Düş</option>
                            </select>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Ödenecek Tutar</div>
                            <div className="text-2xl font-bold text-[var(--gold-primary)]">₺{totalPrice.toLocaleString('tr-TR')}</div>
                        </div>
                    </div>

                    {/* Notlar */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            <FileText size={12} className="text-[var(--gold-primary)]" /> Notlar
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Satışla ilgili ek bilgiler..."
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--gold-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-primary)] resize-none"
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={handleClose}
                            className="flex-1 py-2.5 rounded-xl border border-[var(--gold-border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                            Vazgeç
                        </button>
                        <button type="submit" disabled={saving || loadingData}
                            className="flex-1 py-2.5 rounded-xl btn-gold text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {saving ? 'Kaydediliyor...' : '✅ Satışı Tamamla'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
