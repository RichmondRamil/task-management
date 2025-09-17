
// app/profile/page.tsx
'use client'

import { ProfileForm } from '@/components/profile/ProfileForms'
import { useAuth } from '@/lib/contexts/AuthContext'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600 mb-4">You need to be signed in to access your profile.</p>
          <Link
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-gray-600">Update your personal information</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <ProfileForm />
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-500 text-sm"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}