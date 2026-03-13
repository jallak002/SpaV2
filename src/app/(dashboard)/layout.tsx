import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { SessionTimeoutProvider } from '@/components/providers/SessionTimeoutProvider'
import { MobileMenuProvider } from '@/components/providers/MobileMenuProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionTimeoutProvider>
            <MobileMenuProvider>
                <div className="flex min-h-screen bg-[var(--bg-dark)]">
                    <Sidebar />
                    <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                        <Header />
                        <main className="flex-1 p-4 md:p-6 overflow-auto">
                            {children}
                        </main>
                    </div>
                </div>
            </MobileMenuProvider>
        </SessionTimeoutProvider>
    )
}
