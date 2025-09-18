'use client'

import { useAuth } from '../lib/contexts/AuthContext'
import LandingPage from './LandingPage'
import Projects from './Projects'

export default function AppRouter() {
  const { user, loading, session } = useAuth()

  // Debug logging
  console.log('🔍 AppRouter Debug:', { 
    user: user ? { id: user.id, email: user.email } : null, 
    loading, 
    session: session ? 'exists' : 'null' 
  })

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('⏳ AppRouter: Still loading...')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated, show Projects
  if (user) {
    console.log('✅ AppRouter: User authenticated, showing Projects')
    return <Projects />
  }

  // If user is not authenticated, show Landing Page
  console.log('❌ AppRouter: No user, showing Landing Page')
  return <LandingPage />
}
