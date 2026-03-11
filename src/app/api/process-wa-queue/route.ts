import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase admin client (service role - bypasses RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- NetGSM SMS Gönderme Fonksiyonu ---
async function sendNetGSM(phone: string, message: string, apiKey: string, apiSecret: string): Promise<boolean> {
    try {
        // Telefon numarasını düzenle (başındaki 0 veya +90 kaldır, sadece 10 haneli numara)
        const cleanPhone = phone.replace(/\D/g, '').replace(/^(0090|90|0)/, '')

        const params = new URLSearchParams({
            usercode: apiKey,
            password: apiSecret,
            gsmno: cleanPhone,
            message: message,
            msgheader: 'RANDEVU', // NetGSM'de kayıtlı başlığınız (ör: marka adınız)
            dil: 'TR:1',           // Türkçe karakter desteği
            filter: '0',
        })

        const res = await fetch(`https://api.netgsm.com.tr/sms/send/get/?${params.toString()}`)
        const text = await res.text()

        // NetGSM başarılı yanıt: "00 ..." ile başlar
        return text.trim().startsWith('00')
    } catch (err) {
        console.error('[NetGSM] Gönderim hatası:', err)
        return false
    }
}

// --- Twilio WhatsApp Gönderme Fonksiyonu ---
async function sendTwilio(phone: string, message: string, accountSid: string, authToken: string): Promise<boolean> {
    try {
        const cleanPhone = phone.replace(/\D/g, '').replace(/^(0090|90|0)/, '')
        const fullPhone = `+90${cleanPhone}`

        const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    From: 'whatsapp:+14155238886', // Twilio Sandbox numarası, değiştirin
                    To: `whatsapp:${fullPhone}`,
                    Body: message,
                }),
            }
        )

        const data = await res.json()
        return res.ok && data.sid
    } catch (err) {
        console.error('[Twilio] Gönderim hatası:', err)
        return false
    }
}

export async function POST(req: NextRequest) {
    // Güvenlik: Sadece bizim cron job'umuzdan gelen istekleri kabul et
    const secret = req.headers.get('x-cron-secret')
    const envSecret = process.env.CRON_SECRET

    if (envSecret && secret !== envSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now = new Date().toISOString()

        // 1. Zamanı gelmiş, henüz gönderilmemiş mesajları bul
        const { data: pendingMessages, error: fetchError } = await supabase
            .from('wa_message_queue')
            .select('*, spas(whatsapp_provider, whatsapp_api_key, whatsapp_api_secret)')
            .eq('status', 'pending')
            .lte('scheduled_at', now)
            .limit(50) // Tek seferde max 50 mesaj işle

        if (fetchError) {
            console.error('[Queue] Mesaj çekme hatası:', fetchError)
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        if (!pendingMessages || pendingMessages.length === 0) {
            return NextResponse.json({ processed: 0, message: 'Gönderilecek mesaj yok.' })
        }

        let sentCount = 0
        let failedCount = 0

        // 2. Her mesajı işle
        for (const msg of pendingMessages) {
            const spa = (msg as any).spas
            const provider = spa?.whatsapp_provider || 'none'
            const apiKey = spa?.whatsapp_api_key || ''
            const apiSecret = spa?.whatsapp_api_secret || ''

            let success = false

            if (provider === 'none' || !apiKey) {
                // Provider yapılandırılmamış - sadece veritabanında işaretle (simülasyon)
                console.log(`[Queue] Simülasyon: ${msg.phone} → ${msg.message.substring(0, 30)}...`)
                success = true
            } else if (provider === 'netgsm') {
                success = await sendNetGSM(msg.phone, msg.message, apiKey, apiSecret)
            } else if (provider === 'twilio') {
                success = await sendTwilio(msg.phone, msg.message, apiKey, apiSecret)
            }

            // 3. Durumu güncelle
            await supabase
                .from('wa_message_queue')
                .update({
                    status: success ? 'sent' : 'failed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', msg.id)

            if (success) sentCount++
            else failedCount++
        }

        console.log(`[Queue] İşlendi: ${sentCount} gönderildi, ${failedCount} başarısız`)

        return NextResponse.json({
            processed: pendingMessages.length,
            sent: sentCount,
            failed: failedCount,
        })

    } catch (err: any) {
        console.error('[Queue] Genel hata:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// GET: Kuyruk durumunu görüntüle (opsiyonel - admin panel için)
export async function GET(req: NextRequest) {
    const secret = req.headers.get('x-cron-secret')
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data } = await supabase
        .from('wa_message_queue')
        .select('status, type, scheduled_at, phone')
        .order('scheduled_at', { ascending: false })
        .limit(20)

    return NextResponse.json({ queue: data })
}
