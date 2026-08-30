import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanBarcode,
  TrendingUp,
  ShieldCheck,
  Zap,
  Smartphone,
  Printer,
  ChevronRight,
  Package,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { CameraScannerModal } from '../../components/CameraScannerModal';

export const LandingPage: React.FC = () => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [demoResult, setDemoResult] = useState<any | null>(null);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-amber-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 bg-white border border-amber-300 px-4 py-1.5 rounded-full text-xs text-amber-800 mb-8 shadow-sm font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Automotive & Motorcycle Spare Parts ERP & POS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.08] uppercase">
            Pure Precision. <br />
            <span className="text-amber-600">
              Scan. Stock. Sell.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Built for Royal Enfield specialists, multi-brand two-wheeler workshops, automotive distributors, and spare-part counters. Fast camera barcode & OCR label recognition with locked historical profit accounting.
          </p>

          {/* Primary CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider px-8 py-4 rounded-2xl transition flex items-center justify-center space-x-2 shadow-lg shadow-slate-900/20 text-sm"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </Link>

            <button
              onClick={() => setScannerOpen(true)}
              className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold uppercase tracking-wider px-6 py-4 rounded-2xl transition flex items-center justify-center space-x-2 text-xs shadow-sm"
            >
              <ScanBarcode className="w-4 h-4 text-amber-600" />
              <span>Try Interactive Camera OCR</span>
            </button>
          </div>

          {demoResult && (
            <div className="mt-6 inline-block bg-amber-50 border border-amber-300 px-4 py-2.5 rounded-2xl text-xs text-left max-w-md shadow-sm">
              <span className="text-amber-800 font-bold">✨ OCR Scanned:</span>{' '}
              <span className="text-slate-900 font-semibold">{demoResult.partName || demoResult.partNumber}</span>
              {demoResult.mrp > 0 && <span className="text-slate-600 ml-2 font-mono font-bold">MRP: ₹{demoResult.mrp}</span>}
            </div>
          )}

          {/* Hero Dashboard Preview Mockup */}
          <div className="mt-16 relative max-w-5xl mx-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/50">
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Today's Counter Performance</div>
                  <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                    ₹48,920.00 <span className="text-xs text-emerald-600 font-bold">+22.4% today</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-amber-800 font-bold shadow-sm">
                    Gross Margin: <strong className="text-slate-900">29.1%</strong>
                  </div>
                  <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-700 font-mono font-bold shadow-sm">
                    Stock: 1,840 Units
                  </div>
                </div>
              </div>

              {/* Fast POS Table Sample */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-800 font-bold truncate">Front Disc Brake Pads (RE-350)</div>
                  <div className="flex justify-between items-baseline mt-2 font-mono">
                    <span className="font-extrabold text-amber-700 text-sm">₹520.00</span>
                    <span className="text-[11px] text-slate-500">Stock: 24 units</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-800 font-bold truncate">Clutch Wire Assembly (Classic 350)</div>
                  <div className="flex justify-between items-baseline mt-2 font-mono">
                    <span className="font-extrabold text-amber-700 text-sm">₹210.00</span>
                    <span className="text-[11px] text-amber-600 font-bold">Stock: 3 (Low)</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-800 font-bold truncate">Motul 7100 15W50 4T Synthetic (2.5L)</div>
                  <div className="flex justify-between items-baseline mt-2 font-mono">
                    <span className="font-extrabold text-amber-700 text-sm">₹2,250.00</span>
                    <span className="text-[11px] text-slate-500">Stock: 12 units</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars Section */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase sm:text-4xl">
              Engineered For High-Speed Shop Operations
            </h2>
            <p className="mt-3 text-slate-600 text-sm">
              Replace sluggish desktop software and paper bills with an ultra-clean, cloud-native ERP.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-6 border border-amber-200">
                <ScanBarcode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase tracking-wide">Zero-Cost Camera & OCR Scanner</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Scan part numbers, MRP tags, barcodes, and supplier invoices directly with your smartphone or PC camera. No expensive handheld barcode hardware required.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6 border border-emerald-200">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase tracking-wide">Locked Historical COGS & Profit</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Captures exact historical landed cost at the moment of sale. If a part price rises in the master catalog tomorrow, your past invoice margins stay 100% accurate.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-6 border border-blue-200">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase tracking-wide">Thermal & A4 Invoicing</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Instant 58mm/80mm thermal receipts for counter customers, GST A4 tax invoices for commercial fleets, and instant PDF download.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Android App Download Banner */}
      <section className="py-12 bg-amber-500 text-slate-950 border-y border-amber-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Smartphone className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest font-black text-slate-950/70">Mobile ERP Companion</div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">Run Your Spare Parts Counter From Android</h3>
              <p className="text-xs text-slate-950/80 font-medium">Hardware camera barcode scanning, sub-second POS sales, and live stock tracking on any Android device.</p>
            </div>
          </div>
          <Link
            to="/download-app"
            className="bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition flex items-center space-x-2 shadow-xl shadow-slate-950/20 flex-shrink-0"
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>Download Android App (v1.4.0)</span>
          </Link>
        </div>
      </section>

      {/* Multi-Tenant Security & CTA */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white p-10 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-8 shadow-xl">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-amber-400 font-bold">Strict Tenant Isolation</span>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 uppercase">Your Data Belongs Strictly to Your Business</h3>
            <p className="text-slate-300 text-xs mt-2 max-w-xl">
              Complete database-level isolation guarantees zero cross-tenant leakage. Full CSV data ownership anytime.
            </p>
          </div>
          <Link
            to="/register"
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider px-8 py-4 rounded-2xl transition shadow-lg text-xs flex-shrink-0"
          >
            Start Free Account
          </Link>
        </div>
      </section>

      <Footer />

      {/* Camera OCR Scanner Demo Modal */}
      <CameraScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onConfirm={(res) => setDemoResult(res)}
      />
    </div>
  );
};
