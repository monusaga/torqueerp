import React from 'react';
import { Navbar } from '../../components/Navbar';
import { ScanBarcode, Layers, TrendingUp, Printer, Users, Shield, Zap, RefreshCw, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FeaturesPage: React.FC = () => {
  const features = [
    {
      icon: ScanBarcode,
      title: 'Smart Camera & OCR Label Scanner',
      desc: 'Capture part labels, barcodes, and MRP tags directly using browser webcams or Android cameras with instant confidence scoring and human verification.',
    },
    {
      icon: Layers,
      title: 'Auditable Stock Movement Ledger',
      desc: 'Track every inventory addition, sale deduction, customer return, supplier return, and damage adjustment with immutable ledger logs.',
    },
    {
      icon: TrendingUp,
      title: 'Historical COGS & Profit Tracking',
      desc: 'Lock in purchase costs at the moment of sale. Product price changes in the master catalog never corrupt past gross profit reports.',
    },
    {
      icon: Zap,
      title: 'High-Speed POS Counter',
      desc: 'Complete customer checkout in under 5 seconds with live part number search, vehicle number tags, and cash/UPI balance tracking.',
    },
    {
      icon: Printer,
      title: 'Thermal & A4 GST Invoicing',
      desc: 'Zero-cost PDF generation supporting 58mm/80mm thermal receipt printers for shop counters and full A4 tax invoices for commercial fleets.',
    },
    {
      icon: Smartphone,
      title: 'Shared Web & Android Architecture',
      desc: 'Work seamlessly on mobile phones, tablets, or desktop PCs against the exact same centralized database without data mismatch.',
    },
    {
      icon: Users,
      title: 'Supplier & Customer CRM',
      desc: 'Manage supplier purchase histories, discount percentages, customer credit balances, and vehicle models.',
    },
    {
      icon: Shield,
      title: 'Strict Multi-Tenant Isolation',
      desc: 'Complete database-level isolation ensures no other shop or business can ever access your products, sales, or pricing data.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Features Built for Speed & Precision
          </h1>
          <p className="mt-4 text-slate-400 text-base">
            Everything you need to run a high-volume motorcycle or auto spare parts business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl hover:border-emerald-500/40 transition"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-20 text-center bg-slate-900 border border-slate-800 p-12 rounded-3xl">
          <h2 className="text-2xl font-bold text-white mb-4">Start streamlining your shop operations today</h2>
          <Link
            to="/register"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3.5 rounded-2xl transition shadow-lg shadow-emerald-950"
          >
            Get Started Free
          </Link>
        </div>
      </main>
    </div>
  );
};
