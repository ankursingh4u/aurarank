'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { GoogleButton, GOOGLE_AUTH_ENABLED } from '@/components/auth/google-button'
import { Mail, Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Server generates a confirmation link and emails it via Resend (real
      // verification, no Supabase rate limit). User must confirm before login.
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Sign-up failed. Please try again.')
        setLoading(false)
        return
      }
      setSuccess(true)
      setLoading(false)
    } catch {
      setError('Sign-up failed. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-stone-200 bg-white">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-semibold text-stone-900">Check your email</h2>
            <div className="bg-stone-100 border border-stone-200 rounded-lg px-4 py-3">
              <p className="text-stone-900 font-medium text-sm">{email}</p>
            </div>
            <p className="text-stone-500 text-sm">
              We sent a confirmation link to that address. Click it to verify your email and activate your account.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-left">
              <p className="text-amber-700 text-xs font-medium mb-1">Don&apos;t see it?</p>
              <ul className="text-stone-500 text-xs space-y-1">
                <li>• Check your spam or junk folder</li>
                <li>• It can take a minute to arrive</li>
                <li>• Make sure your email is spelled correctly</li>
              </ul>
            </div>
            <Link href="/login">
              <Button variant="outline" className="border-stone-200 text-stone-700 hover:bg-stone-100">
                Go to login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-stone-200 bg-white backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl text-stone-900 text-center">Create your account</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <GoogleButton label="Sign up with Google" />
          {/* The divider only separates two things when both are shown. */}
          {GOOGLE_AUTH_ENABLED && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stone-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-stone-400">or</span></div>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
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
            <Label htmlFor="password" className="text-stone-700">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-500" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-stone-700">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-500" />
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-9 bg-stone-100 border-stone-200 text-stone-900 placeholder:text-stone-500"
              />
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
            Create Account
          </Button>
          <p className="text-sm text-stone-500">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-700 hover:text-violet-700 font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
