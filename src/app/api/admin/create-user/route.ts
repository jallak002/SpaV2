import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { email, password, fullName, role } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email ve şifre zorunludur' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Supabase ayarları eksik. Lütfen SUPABASE_SERVICE_ROLE_KEY ekleyin.' }, { status: 500 })
        }

        // Create a Supabase client with the service role key to bypass RLS and create users safely
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // Create the user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: role || 'staff'
            }
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        return NextResponse.json({ user: authData.user }, { status: 200 })

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Bilinmeyen bir hata oluştu' }, { status: 500 })
    }
}
