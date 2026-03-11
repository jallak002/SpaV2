import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase ayarları eksik. Lütfen SUPABASE_SERVICE_ROLE_KEY ekleyin.')
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

// Tüm personelleri getir
export async function GET() {
    try {
        const supabaseAdmin = getSupabaseAdmin()

        // Sadece kullanıcıların listesini alıyoruz
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        // Güvenlik için sadece gerekli alanları döndürüyoruz
        const safeUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            full_name: u.user_metadata?.full_name || 'İsimsiz Personel',
            role: u.user_metadata?.role || 'staff',
            // Eğer banned_until değeri null'dan büyükse hesap pasif demektir
            is_active: !u.banned_until
        }))

        return NextResponse.json({ users: safeUsers }, { status: 200 })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Bilinmeyen bir hata oluştu' }, { status: 500 })
    }
}

// Personeli güncelle (örn: pasife çek / aktif yap)
export async function PATCH(request: Request) {
    try {
        const { userId, action } = await request.json()
        const supabaseAdmin = getSupabaseAdmin()

        if (!userId || !action) {
            return NextResponse.json({ error: 'Kullanıcı ID ve eylem gereklidir' }, { status: 400 })
        }

        let updateData: any = {}

        if (action === 'suspend') {
            // Ban user for 10 years essentially makes them suspended/passive
            updateData = { ban_duration: '87600h' }
        } else if (action === 'activate') {
            updateData = { ban_duration: 'none' }
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, user: data.user }, { status: 200 })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Bilinmeyen bir hata oluştu' }, { status: 500 })
    }
}

// Personeli tamamen sil
export async function DELETE(request: Request) {
    try {
        // We expect URL parameter /api/admin/users?id=xxx
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Kullanıcı ID gereklidir' }, { status: 400 })
        }

        const supabaseAdmin = getSupabaseAdmin()

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true }, { status: 200 })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Bilinmeyen bir hata oluştu' }, { status: 500 })
    }
}
