'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '../../lib/contexts/AuthContext'
import { Skeleton } from '../ui/skeleton'

export default function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole?: string
}) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If not loading and there's no user, redirect to login
    if (!loading && !user) {
      // Store the attempted URL to redirect back after login
      const redirectUrl = encodeURIComponent(pathname)
      router.push(`/login?returnTo=${redirectUrl}`)
    }
  }, [user, loading, router, pathname])

  // Show loading state while checking auth
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
