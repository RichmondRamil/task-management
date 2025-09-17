/* eslint-disable react-hooks/exhaustive-deps */
// lib/contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '../supabase'
import { Database } from '../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthResponse {
  data: { user: User | null; session: Session | null } | null
  error: AuthError | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, fullName?: string) => Promise<AuthResponse>
  signIn: (email: string, password: string) => Promise<AuthResponse>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  createProfile: (userId: string, email: string, fullName?: string) => Promise<Profile>
  fetchProfile: (userId: string) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log("🔄 Getting initial session...")
      const { data: { session: initialSession } } = await supabase.auth.getSession()
      console.log("🚀 Initial session:", initialSession)
      console.log("👤 Initial user:", initialSession?.user ? { id: initialSession.user.id, email: initialSession.user.email } : null)
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      
      console.log("✅ Setting loading to false")
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 Auth state change event:", event)
        console.log("🔄 Auth state change session:", session)
        console.log("👤 Auth state change user:", session?.user ? { id: session.user.id, email: session.user.email } : null)
        setSession(session)
        setUser(session?.user ?? null)
        
        console.log("✅ Auth state change: Setting loading to false")
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Handle email confirmation redirect: exchange `code` for a session
  useEffect(() => {
    const exchangeCode = async () => {
      if (typeof window === 'undefined') return

      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (!code) return

      console.log('🔐 Found auth code in URL, exchanging for session...')
      try {
        setLoading(true)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        console.log('🔁 exchangeCodeForSession response:', { data, error })

        if (error) {
          console.error('❌ Failed to exchange code for session:', error)
          return
        }

        setSession(data.session)
        setUser(data.user)

        // Clean the URL (remove the code param)
        url.searchParams.delete('code')
        if (typeof window !== 'undefined' && window.history.replaceState) {
          window.history.replaceState({}, document.title, url.pathname + url.search)
        }
      } catch (err) {
        console.error('❌ Unexpected error during code exchange:', err)
      } finally {
        setLoading(false)
      }
    }

    exchangeCode()
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, this is okay for new users
        console.log('Profile not found for user:', userId)
        return
      }

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error in fetchProfile:', error)
    }
  }, [supabase])

  const createProfile = useCallback(async (userId: string, email: string, fullName?: string) => {
    console.log('📄 Creating profile for user:', { userId, email, fullName })
    try {
      const profileData = {
        id: userId,
        email: email,
        full_name: fullName || null,
      }
      
      console.log('📤 Inserting profile data:', profileData)
      const { data, error } = await (supabase as any)
        .from('profiles')
        .upsert(profileData, { onConflict: 'id', ignoreDuplicates: true })
        .select()
        .single()

      console.log('📥 Profile creation response:', { data, error })

      if (error) {
        console.error('❌ Profile creation error:', error)
        throw error
      }

      console.log('✅ Profile created successfully:', data)
      setProfile(data)
      return data
    } catch (error) {
      console.error('❌ Error in createProfile:', error)
      throw error
    }
  }, [supabase])

  const signUp = async (email: string, password: string, fullName?: string): Promise<AuthResponse> => {
    console.log('📝 SignUp function called with:', { email, fullName })
    try {
      setError(null)
      setLoading(true)
      
      // Basic validation
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      console.log('📤 Calling supabase.auth.signUp')
      const { data, error } = await supabase.auth.signUp({
        options: {
          data: {
            display_name: fullName,
          },
        },
        email,
        password,
      })

      console.log('📥 SignUp response:', { data, error })

      if (error) {
        console.error('❌ SignUp error:', error)
        setError(error.message)
        return { data, error }
      }

      return { data, error }
    } catch (err) {
      console.error('❌ Unexpected signup error:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    console.log('🔑 SignIn function called with email:', email)
    try {
      setError(null)
      setLoading(true)
      
      // Basic validation
      if (!email || !password) {
        throw new Error('Email and password are required')
      }
      
      console.log('📤 Calling supabase.auth.signInWithPassword')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('📥 SignIn response:', { data, error })

      if (error) {
        console.error('❌ SignIn error:', error)
        setError(error.message)
      }

      return { data, error }
    } catch (err) {
      console.error('❌ Unexpected signin error:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('🚀 SignOut function called')
    try {
      console.log('🔄 Setting loading state and clearing errors')
      setError(null)
      setLoading(true)
      
      console.log('📤 Calling supabase.auth.signOut()')
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Sign out error:', error)
        setError(error.message)
        return
      }
      
      console.log('✅ Supabase signOut successful, clearing local state')
      // Clear local state immediately
      setUser(null)
      setProfile(null)
      setSession(null)
      
      console.log('🔄 Redirecting to home page')
      // Force redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      
    } catch (err) {
      console.error('❌ Unexpected sign out error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out'
      setError(errorMessage)
    } finally {
      console.log('🏁 SignOut process completed')
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      setError(null)
      
      if (!user) {
        throw new Error('No user found')
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        setError(error.message)
        throw error
      }

      // Refresh profile data
      await fetchProfile(user.id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      throw err
    }
  }

  const clearError = () => {
    setError(null)
  }

  const value = {
    user,
    profile,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    createProfile,
    fetchProfile,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}