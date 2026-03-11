'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function SessionTimeoutProvider({
    children,
    timeoutMinutes = 60
}: {
    children: React.ReactNode
    timeoutMinutes?: number
}) {
    const router = useRouter()
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const timeoutMs = timeoutMinutes * 60 * 1000

    const resetTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            toast.error('Uzun süre işlem yapmadığınız için oturumunuz sonlandırıldı.')
            router.push('/login')
        }, timeoutMs)
    }, [router, timeoutMs])

    useEffect(() => {
        // İlk ayar
        resetTimeout()

        // İzlenecek etkinlikler (kullanıcı hareketleri)
        const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']

        const handleActivity = () => {
            resetTimeout()
        }

        events.forEach(event => {
            window.addEventListener(event, handleActivity)
        })

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
        }
    }, [resetTimeout])

    return <>{children}</>
}
