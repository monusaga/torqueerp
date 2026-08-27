import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gauge, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';

// Demo tenant quick-logins are a development convenience only. They use real
// password authentication against seeded accounts and are excluded from
// production builds.
const SHOW_DEMO_LOGINS = import.meta.env.DEV;

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const performPasswordLogin = async (loginEmail: string, loginPassword: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiRequest<{
        token: string;
        user: any;
        activeBusiness: any;
        businesses: any[];
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      login(data.token, data.user, data.activeBusiness, data.businesses);
      navigate('/app/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performPasswordLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
            <Gauge className="w-5 h-5 text-amber-400" />
          </div>
          <span className="font-black text-2xl tracking-tight text-slate-900">
            MONU<span className="text-amber-600">SAGAR</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 uppercase">
          Sign In to Your ERP Shop
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-semibold">
          Don't have an account?{' '}
          <Link to="/register" className="text-amber-600 hover:text-amber-700 font-bold underline">
            Register new business
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-slate-200 py-8 px-6 shadow-xl rounded-3xl sm:px-10">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Real Google Sign-In: authentication is performed by Google and the
              resulting ID token is verified server-side. */}
          <div className="mb-5">
            <GoogleSignInButton label="Continue with Google" onError={setErrorMsg} />
          </div>

          {SHOW_DEMO_LOGINS && (
            <>
              <div className="relative flex py-1 items-center mb-4">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Dev-Only Demo Tenants
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="mb-6 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => performPasswordLogin('owner.a@example.com', 'password123')}
                    className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-2xl text-left transition flex flex-col justify-between group shadow-sm"
                  >
                    <span className="text-[11px] font-bold text-amber-900 group-hover:text-amber-700 transition truncate">
                      Royal Spares (RE)
                    </span>
                    <span className="text-[9px] text-amber-700 font-mono font-semibold">Tenant A • Owner</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => performPasswordLogin('owner.b@example.com', 'password123')}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-2xl text-left transition flex flex-col justify-between group shadow-sm"
                  >
                    <span className="text-[11px] font-bold text-slate-900 group-hover:text-slate-700 transition truncate">
                      Apex Auto Delhi
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono font-semibold">Tenant B • Owner</span>
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="relative flex py-1 items-center mb-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Or Sign In with Password
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 text-xs font-semibold"
                  placeholder="name@business.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 text-xs font-semibold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 text-xs shadow-md"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <Link
              to="/download-app"
              className="inline-flex items-center space-x-1.5 text-xs text-amber-700 hover:text-amber-800 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 transition"
            >
              <span>📱</span>
              <span>Prefer Mobile? Download Android APK</span>
              <ArrowRight className="w-3 h-3 text-amber-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
