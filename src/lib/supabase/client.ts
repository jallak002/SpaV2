import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    if (typeof document === 'undefined') return []
                    return document.cookie.split(';').map(c => {
                        const [name, ...rest] = c.split('=')
                        return { name: name.trim(), value: rest.join('=') }
                    })
                },
                setAll(cookiesToSet) {
                    if (typeof document === 'undefined') return
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // value is already base64 encoded by supabase/ssr, so no URI encoding needed.
                        let cookieString = `${name}=${value}`
                        if (options?.domain) cookieString += `; domain=${options.domain}`
                        if (options?.path) cookieString += `; path=${options.path}`
                        if (options?.secure) cookieString += `; secure`
                        if (options?.sameSite) cookieString += `; samesite=${options.sameSite}`
                        // Notice we DO NOT append maxAge here. Thus, it becomes a Session Cookie!
                        document.cookie = cookieString
                    })
                }
            }
        }
    )
}
