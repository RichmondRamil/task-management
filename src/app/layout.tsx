// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../lib/contexts/AuthContext'
import { ProjectProvider } from '../lib/contexts/ProjectContext'
import { TaskProvider } from '../lib/contexts/TaskContext'
import { Navigation } from '../components/layout/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaskManager - Project & Task Management',
  description: 'A simple full-stack task and project management application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ProjectProvider>
            <TaskProvider>
              <div className="min-h-screen bg-gray-50">
                <Navigation />
                <main className="container mx-auto py-8 px-4">
                  {children}
                </main>
              </div>
            </TaskProvider>
          </ProjectProvider>
        </AuthProvider>
      </body>
    </html>
  )
}