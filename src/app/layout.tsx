import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export const metadata: Metadata = {
  title: 'SpaV2 — Premium Wellness Intelligence Platform',
  description: 'Lüks spa ve wellness merkezleri için kapsamlı yönetim platformu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster
            theme="dark"
            className="toaster"
            toastOptions={{
              className: "toast-container",
              style: {
                background: 'var(--bg-card)',
                border: '1px solid var(--gold-border)',
                color: 'var(--text-primary)',
              },
            }}
            position="top-right"
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
