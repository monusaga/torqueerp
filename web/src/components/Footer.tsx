import React from 'react';
import { Link } from 'react-router-dom';
import { Gauge, Smartphone, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                <Gauge className="w-4 h-4" />
              </div>
              <span className="font-black text-lg text-white tracking-tight">
                MONU<span className="text-amber-500">SAGAR</span>
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed">
              India's #1 specialized Automotive Spare Parts ERP, POS & Inventory Cloud Platform.
            </p>
            <div className="inline-flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold">100% Data Isolation</span>
            </div>
          </div>

          {/* Navigation Col */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Product</h4>
            <ul className="space-y-2">
              <li><Link to="/features" className="hover:text-amber-400 transition">Features</Link></li>
              <li><Link to="/spare-parts" className="hover:text-amber-400 transition">Vehicle Compatibility</Link></li>
              <li><Link to="/pricing" className="hover:text-amber-400 transition">Pricing Plans</Link></li>
              <li><Link to="/faq" className="hover:text-amber-400 transition">Frequently Asked Questions</Link></li>
            </ul>
          </div>

          {/* Mobile App Col */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Mobile Apps</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/download-app" className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Download Android APK (v1.4.0)</span>
                </Link>
              </li>
              <li className="text-slate-500 text-[11px]">Direct APK Install (Android 8.0+)</li>
              <li className="text-slate-500 text-[11px]">Hardware CameraX Barcode Scanner</li>
              <li className="text-slate-500 text-[11px]">Offline Stock Check & Counter POS</li>
            </ul>
          </div>

          {/* Quick Access Col */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Account & Portal</h4>
            <ul className="space-y-2">
              <li><Link to="/login" className="hover:text-amber-400 transition">Owner & Staff Login</Link></li>
              <li><Link to="/register" className="hover:text-amber-400 transition">Register New Garage</Link></li>
              <li><Link to="/app/dashboard" className="hover:text-amber-400 transition">ERP Cloud Terminal</Link></li>
              <li><Link to="/app/settings" className="hover:text-amber-400 transition">Settings & Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Monu Sagar. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link to="/support" className="hover:text-amber-400 transition">Technical Support</Link>
            <Link to="/terms" className="hover:text-amber-400 transition">Terms &amp; Conditions</Link>
            <Link to="/privacy" className="hover:text-amber-400 transition">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
