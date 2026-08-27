import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gauge, Menu, X, ArrowRight, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-md shadow-slate-900/20 group-hover:bg-amber-600 transition">
            <Gauge className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight text-slate-900 flex items-center">
              MONU<span className="text-amber-600 ml-1">SAGAR</span>
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold -mt-0.5">
              Spare Parts SaaS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs uppercase tracking-wider font-bold text-slate-600">
          <Link to="/features" className="hover:text-amber-600 transition">Features</Link>
          <Link to="/spare-parts" className="hover:text-amber-600 transition">Spare Parts</Link>
          <Link to="/pricing" className="hover:text-amber-600 transition">Pricing</Link>
          <Link to="/faq" className="hover:text-amber-600 transition">FAQ</Link>
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center space-x-2.5">
          <Link
            to="/download-app"
            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download APK</span>
          </Link>
          {user ? (
            <Link
              to="/app/dashboard"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md"
            >
              <span>ERP Dashboard</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs uppercase tracking-wider font-bold text-slate-600 hover:text-slate-900 transition px-3 py-2"
              >
                Log In
              </Link>
              <Link
                to="/login"
                className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center space-x-1 shadow-sm"
              >
                <span>⚡ 1-Click Login</span>
              </Link>
              <Link
                to="/register"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md"
              >
                <span>Start Free</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <Link
            to="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-slate-700 hover:text-amber-600 font-semibold text-sm"
          >
            Features
          </Link>
          <Link
            to="/spare-parts"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-slate-700 hover:text-amber-600 font-semibold text-sm"
          >
            Spare Parts
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-slate-700 hover:text-amber-600 font-semibold text-sm"
          >
            Pricing
          </Link>
          <Link
            to="/download-app"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-emerald-700 hover:text-emerald-800 font-bold text-sm bg-emerald-50 px-3 rounded-lg border border-emerald-200"
          >
            📱 Download Android APK
          </Link>

          <div className="pt-4 border-t border-slate-200 flex flex-col space-y-2">
            {user ? (
              <Link
                to="/app/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full bg-slate-900 text-white text-center font-bold py-2.5 rounded-xl uppercase text-xs tracking-wider"
              >
                Go to ERP Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-slate-100 text-slate-800 text-center font-bold py-2.5 rounded-xl text-xs uppercase"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-slate-900 text-white text-center font-bold py-2.5 rounded-xl uppercase text-xs tracking-wider"
                >
                  Start Free Today
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
