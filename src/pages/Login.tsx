import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { resolveLegalUrl } from '@/lib/utils';

const Login = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithApple, skipAuth, loading, actionLoading, error, user, isGuest, firebaseAvailable } = useAuth();
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const showApple = !isAndroidNative;
  const privacyUrl = resolveLegalUrl(import.meta.env.VITE_PRIVACY_URL, 'privacy.html');
  const termsUrl = resolveLegalUrl(import.meta.env.VITE_TERMS_URL, 'terms.html');
  const authMessage = firebaseAvailable
    ? 'Sign in to sync your scripts across devices, or continue as a guest.'
    : 'Cuevora works offline. Continue locally without creating an account.';

  useEffect(() => {
    if (user || isGuest) navigate('/home', { replace: true });
  }, [user, isGuest, navigate]);

  if (user || isGuest) return null;

  const handleGoogle = async () => {
    await signInWithGoogle();
  };

  const handleApple = async () => {
    await signInWithApple();
  };

  const handleSkip = () => {
    skipAuth();
    navigate('/home', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-padding">
      {/* Top section with logo */}
      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-8"
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="loginCGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <linearGradient id="loginAccent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="108" fill="#1e1b4b" />
            <path d="M310 130 C200 130, 120 200, 120 256 C120 312, 200 382, 310 382"
              stroke="url(#loginCGrad)" strokeWidth="48" fill="none" strokeLinecap="round" />
            <rect x="200" y="220" width="140" height="12" rx="6" fill="url(#loginAccent)" opacity="0.9" />
            <rect x="200" y="250" width="110" height="12" rx="6" fill="url(#loginAccent)" opacity="0.65" />
            <rect x="200" y="280" width="80" height="12" rx="6" fill="url(#loginAccent)" opacity="0.4" />
            <path d="M360 230 L395 256 L360 282 Z" fill="#f59e0b" opacity="0.85" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl font-bold tracking-tight text-foreground mb-2"
        >
          Welcome to Cuevora
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-sm text-muted-foreground text-center max-w-[280px] mb-2"
        >
          {authMessage}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-xs font-medium text-primary"
        >
          Teleprompter features, actually free.
        </motion.p>
      </div>

      {/* Auth buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex flex-col gap-3 px-8 pb-12"
      >
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive text-center">
            {error}
            <button className="ml-2 underline underline-offset-2" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}

        {!firebaseAvailable && (
          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground text-center">
            Account sync is disabled until Firebase is configured.
          </div>
        )}

        {firebaseAvailable && (
          <>
            {/* Google Sign In */}
            <Button
              variant="outline"
              size="lg"
              className="w-full touch-target text-base font-medium gap-3 h-14 rounded-xl"
              onClick={handleGoogle}
              disabled={loading}
            >
              {actionLoading === 'google' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Apple Sign In */}
            {showApple && (
              <Button
                variant="outline"
                size="lg"
                className="w-full touch-target text-base font-medium gap-3 h-14 rounded-xl"
                onClick={handleApple}
                disabled={loading}
              >
                {actionLoading === 'apple' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                )}
                Continue with Apple
              </Button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        {/* Guest mode */}
        <Button
          variant="ghost"
          size="lg"
          className="w-full touch-target text-sm text-muted-foreground h-12 rounded-xl"
          onClick={handleSkip}
          disabled={loading}
        >
          Continue without an account
        </Button>

        <p className="text-[10px] text-muted-foreground/60 text-center mt-2 leading-relaxed">
          By continuing, you agree to our{' '}
          {termsUrl ? (
            <a className="underline underline-offset-2" href={termsUrl} target="_blank" rel="noreferrer">
              Terms of Service
            </a>
          ) : (
            'Terms of Service'
          )}{' '}
          and{' '}
          {privacyUrl ? (
            <a className="underline underline-offset-2" href={privacyUrl} target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
          ) : (
            'Privacy Policy'
          )}
          . Guest mode stores all data locally on your device.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
