import { Inter } from "next/font/google"
import "./globals.css"
import { MainNav } from "@/components/main-nav"
import { Toaster } from "@/components/ui/toaster"
import type React from "react" // Import React

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r bg-muted/40 p-6 lg:block">
            <div className="flex h-full flex-col justify-between">
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">AI Voice Assistant</h2>
                <MainNav />
              </div>
            </div>
          </aside>
          <main className="flex-1">
            <div className="container mx-auto py-10">{children}</div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}

