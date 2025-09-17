'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '../lib/contexts/AuthContext'

export default function Dashboard() {
  const { user, profile, session, createProfile, fetchProfile, loading } = useAuth()
  const hasFetchedProfileRef = useRef(false)
  const hasCreatedProfileRef = useRef(false)

  useEffect(() => {
    if (!user || !session) return

    console.log('session', session)
    console.log('🎯 Dashboard - User Session:', {
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_confirmed_at ? true : false,
        user_metadata: user.user_metadata,
        created_at: user.created_at,
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
      },
      profile: profile,
    })

    if (!hasFetchedProfileRef.current) {
      hasFetchedProfileRef.current = true
      if (!profile) {
        console.log('👤 Checking for profile...')
        fetchProfile(user.id)
      }
    }
  }, [user, session, fetchProfile, profile])

  useEffect(() => {
    console.log('profile___',profile)
    if (!user) return
    if (profile || profile === null) return
    if (hasCreatedProfileRef.current) return

    if (user.email) {
      hasCreatedProfileRef.current = true
      console.log('🔄 No profile found after fetch, creating one...')
      createProfile(user.id, user.email, user.user_metadata?.display_name)
        .then(() => {
          console.log('✅ Profile creation successful.')
        })
        .catch((error) => {
          console.error('❌ Failed to create profile:', error)
          // Allow retry only on next mount to avoid rapid loops
        })
    }
  }, [user, profile, createProfile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome Back!</h2>
            <p className="text-gray-600 mb-4">
              You're successfully logged in to your Task Manager dashboard.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Profile Status:</strong> {profile ? '✅ Created' : '⏳ Pending'}</p>
            </div>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
            {profile ? (
              <div className="space-y-2 text-sm">
                <p><strong>Full Name:</strong> {profile.full_name || 'Not set'}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Bio:</strong> {profile.bio || 'Not set'}</p>
                <p><strong>Created:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <p>Profile is being created...</p>
                <div className="mt-2 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Create New Project
              </button>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Add New Task
              </button>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                View All Projects
              </button>
            </div>
          </div>
        </div>

        {/* Session Debug Information */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Debug Info</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify({
                user: user ? {
                  id: user.id,
                  email: user.email,
                  email_confirmed_at: user.email_confirmed_at,
                  user_metadata: user.user_metadata,
                } : null,
                session: session ? {
                  expires_at: session.expires_at,
                  expires_in: session.expires_in,
                } : null,
                profile: profile
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
