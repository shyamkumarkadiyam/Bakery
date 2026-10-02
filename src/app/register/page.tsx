'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await signUp(email, password, { fullName });
      if (data?.session) {
        router.push('/account');
        router.refresh();
      } else {
        setRegistered(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google') => {
    setError('');
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/account`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err?.message || `Failed to sign up with ${provider}. Please try again.`);
      setOauthLoading(null);
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
            Create your account and start ordering
          </p>
        </div>

        {registered ? (
          /* Confirmation screen */
          <div className="bg-white rounded-3xl shadow-card-md p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#fde8f0' }}>
              <Mail size={28} style={{ color: '#7a2a3a' }} />
            </div>
            <h2 className="font-sans font-bold text-xl mb-2" style={{ color: '#3a2a2e' }}>Check your email</h2>
            <p className="font-body text-sm mb-1" style={{ color: '#6b5a5e' }}>
              We sent a confirmation link to
            </p>
            <p className="font-sans font-semibold text-sm mb-4" style={{ color: '#7a2a3a' }}>{email}</p>
            <p className="font-body text-sm mb-6" style={{ color: '#6b5a5e' }}>
              Click the link in the email to verify your account, then come back to sign in.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-sans font-bold text-sm text-white transition-opacity hover:opacity-90"
              style={{ background: '#7a2a3a' }}
            >
              Go to Sign In <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
        /* Card */
        <div className="bg-white rounded-3xl shadow-card-md p-8">
          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm font-body" style={{ background: '#fde8e8', color: '#c0392b' }}>
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={!!oauthLoading || loading}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-2xl border font-sans font-semibold text-sm transition-all hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ borderColor: '#e5dde0', color: '#1a1a1a' }}
            >
              {oauthLoading === 'google' ? (
                <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: '#e5dde0' }} />
            <span className="font-body text-xs" style={{ color: '#9b8a8e' }}>or register with email</span>
            <div className="flex-1 h-px" style={{ background: '#e5dde0' }} />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
            <div>
              <label className="block font-sans font-semibold text-xs mb-1.5" style={{ color: '#3a2a2e' }}>
                Full name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9b8a8e' }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-body outline-none transition-colors focus:border-primary"
                  style={{ borderColor: '#e5dde0', color: '#1a1a1a', background: '#fdf8f2' }}
                />
              </div>
            </div>

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
              <label className="block font-sans font-semibold text-xs mb-1.5" style={{ color: '#3a2a2e' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9b8a8e' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min. 6 characters"
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
              disabled={loading || !!oauthLoading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-sans font-bold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background: '#7a2a3a' }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center font-body text-sm mt-6" style={{ color: '#6b5a5e' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: '#7a2a3a' }}>
              Sign in
            </Link>
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
