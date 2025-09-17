// app/signup/page.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { SignUpForm } from "@/components/SignUpForm";
import Link from "next/link";

export default function SignUpPage() {
  const { session } = useAuth()
  const router = useRouter()
  const hasHandledSessionRef = useRef(false)

  // Handle session changes
  useEffect(() => {
    if (session && !hasHandledSessionRef.current) {
      hasHandledSessionRef.current = true
      // Use router.replace to avoid adding to history
      router.replace('/')
    }
  }, [session, router])

  // Listen to storage changes for Supabase auth token updates
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key?.includes('sb-') || !e.key?.includes('auth-token')) return
      
      // Only proceed if we have a new session value
      const newSession = e.newValue
      if (newSession && !hasHandledSessionRef.current) {
        hasHandledSessionRef.current = true
        router.replace('/')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [router])
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            sign in to existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignUpForm />
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-500 text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
