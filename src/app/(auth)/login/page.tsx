'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { GoogleButton, GOOGLE_AUTH_ENABLED } from '@/components/auth/google-button'
import { Mail, Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    // Show errors passed from auth callback (e.g. expired link)
    const urlError = searchParams.get('error')
    if (urlError) setError(decodeURIComponent(urlError))

    // If redirected after successful email confirm, show success message
    const urlMessage = searchParams.get('message')
    if (urlMessage === 'confirmed') setConfirmed(true)
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.toLowerCase().includes('invalid login') || error.message.toLowerCase().includes('invalid credentials')) {
        setError('Email or password is incorrect. Please try again.')
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        setError('Please confirm your email first. Check your inbox for the confirmation link.')
      } else if (error.message.toLowerCase().includes('too many')) {
        setError('Too many login attempts. Please wait a minute and try again.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card className="border-stone-200 bg-white backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl text-stone-900 text-center">Welcome back</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <GoogleButton label="Sign in with Google" />
          {/* The divider only separates two things when both are shown. */}
          {GOOGLE_AUTH_ENABLED && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stone-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-stone-400">or</span></div>
            </div>
          )}
          {confirmed && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Email confirmed! Sign in to get started.
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
              {error.toLowerCase().includes('email not confirmed') && (
                <p className="mt-1 text-red-300/70 text-xs">Check your spam folder if you don&apos;t see it.</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-stone-700">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 bg-stone-100 border-stone-200 text-stone-900 placeholder:text-stone-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="password" className="text-stone-700">Password</Label>
              <Link href="/forgot-password" className="text-xs text-violet-700 hover:text-violet-700">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-500" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-9 pr-9 bg-stone-100 border-stone-200 text-stone-900 placeholder:text-stone-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-stone-500 hover:text-stone-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-700 hover:bg-violet-800 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Sign In
          </Button>
          <p className="text-sm text-stone-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-violet-700 hover:text-violet-700 font-medium">
              Sign up free
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="border-stone-200 bg-white backdrop-blur">
        <CardContent className="pt-8 pb-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-700 mx-auto" />
        </CardContent>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  )
}
