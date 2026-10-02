'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      // Give the auth state change listener a tick to propagate the session
      // before navigating, so downstream pages don't see a stale null-user state.
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push('/account');
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('email_not_confirmed')) {
        setError('Please confirm your email address first. Check your inbox for the confirmation link we sent when you registered.');
      } else if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#fdf8f2' }}>
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="font-sans font-extrabold text-2xl tracking-tight" style={{ color: '#6b1a2e' }}>
              Lolita Bakery
            </span>
          </Link>
          <p className="font-body text-sm mt-2" style={{ color: '#6b5a5e' }}>
            Welcome back — sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-card-md p-8">
          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm font-body" style={{ background: '#fde8e8', color: '#c0392b' }}>
              {error}
            </div>
          )}

          {/* Email Form */}
          <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
            <div>
              <label className="block font-sans font-semibold text-xs mb-1.5" style={{ color: '#3a2a2e' }}>
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9b8a8e' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-body outline-none transition-colors focus:border-primary"
                  style={{ borderColor: '#e5dde0', color: '#1a1a1a', background: '#fdf8f2' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-sans font-semibold text-xs" style={{ color: '#3a2a2e' }}>
                  Password
                </label>
                <Link href="/forgot-password" className="font-body text-xs hover:underline" style={{ color: '#7a2a3a' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9b8a8e' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border text-sm font-body outline-none transition-colors focus:border-primary"
                  style={{ borderColor: '#e5dde0', color: '#1a1a1a', background: '#fdf8f2' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#9b8a8e' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-sans font-bold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background: '#7a2a3a' }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center font-body text-sm mt-6" style={{ color: '#6b5a5e' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold hover:underline" style={{ color: '#7a2a3a' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
