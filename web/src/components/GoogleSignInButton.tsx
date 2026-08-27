import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { isFirebaseConfigured, signInWithGoogleViaFirebase } from '../lib/firebase';

const GIS_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GoogleLogo: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface GoogleSignInButtonProps {
  label?: string;
  onError: (message: string) => void;
}

/**
 * Real "Continue with Google" — authentication is performed by Google
 * (Firebase Auth popup, or Google Identity Services), and the resulting
 * Google-issued ID token is verified server-side by /auth/google.
 * There is no way to sign in by simply typing a Gmail address.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ label, onError }) => {
  const [busy, setBusy] = useState(false);
  const gisContainerRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const completeBackendLogin = async (credential: string) => {
    const data = await apiRequest<{
      token: string;
      user: any;
      activeBusiness: any;
      businesses: any[];
    }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    login(data.token, data.user, data.activeBusiness, data.businesses);
    navigate('/app/dashboard');
  };

  const handleFirebaseSignIn = async () => {
    setBusy(true);
    try {
      const idToken = await signInWithGoogleViaFirebase();
      await completeBackendLogin(idToken);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        onError(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  // Google Identity Services path: render Google's official button.
  useEffect(() => {
    if (isFirebaseConfigured || !GIS_CLIENT_ID || !gisContainerRef.current) return;

    const initGis = () => {
      if (!window.google || !gisContainerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GIS_CLIENT_ID,
        callback: (response) => {
          completeBackendLogin(response.credential).catch((err: any) =>
            onError(err?.message || 'Google sign-in failed. Please try again.')
          );
        },
      });
      window.google.accounts.id.renderButton(gisContainerRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 320,
      });
    };

    const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existing) {
      initGis();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = initGis;
    script.onerror = () => onError('Could not load Google sign-in. Check your connection.');
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isFirebaseConfigured) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={handleFirebaseSignIn}
        className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl text-slate-800 font-bold text-xs flex items-center justify-center space-x-3 shadow-sm hover:shadow transition disabled:opacity-50"
      >
        <GoogleLogo />
        <span>{busy ? 'Authenticating with Google…' : label || 'Continue with Google'}</span>
      </button>
    );
  }

  if (GIS_CLIENT_ID) {
    return <div ref={gisContainerRef} className="flex justify-center" />;
  }

  return (
    <div className="w-full py-3 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-400 font-semibold text-[11px] flex items-center justify-center space-x-2">
      <GoogleLogo />
      <span>Google sign-in unavailable — server not configured for Google authentication</span>
    </div>
  );
};
