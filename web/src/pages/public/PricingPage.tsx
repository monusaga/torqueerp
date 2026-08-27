import React from 'react';
import { Navbar } from '../../components/Navbar';
import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PricingPage: React.FC = () => {
  const plans = [
    {
      name: 'Community / Starter',
      price: '₹0',
      period: 'Forever free during MVP',
      desc: 'Ideal for independent spare-parts retailers and workshop counters.',
      features: [
        'Unlimited Products & Stock Entries',
        'Camera Barcode & Label OCR Scanner',
        'High-Speed Counter POS Checkout',
        'Thermal & A4 GST Invoice Generator',
        'Stock Movement Audit Ledger',
        'Supplier & Customer CRM',
        'Realized Gross Profit Analytics',
        'CSV Data Export Anytime',
      ],
      cta: 'Start Free Account',
      popular: true,
    },
    {
      name: 'Growth / Pro (Future)',
      price: '₹99',
      period: 'per month / future tier',
      desc: 'For multi-store retailers and distributors needing cloud backup & analytics.',
      features: [
        'Everything in Free Starter',
        'Multi-Store & Multi-Warehouse Bins',
        'Staff Roles & Fine Permissions',
        'Automated Low-Stock WhatsApp Reminders',
        'Cloud AI Natural Language Assistant',
        'Priority Technical Support',
      ],
      cta: 'Coming Soon',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Transparent Pricing</span>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-2">
            Zero-Cost-First Strategy
          </h1>
          <p className="mt-4 text-slate-400 text-base">
            No mandatory paid APIs. No hidden fees. Production-ready ERP capabilities out of the box.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((p, i) => (
            <div
              key={i}
              className={`rounded-3xl p-8 border flex flex-col justify-between transition ${
                p.popular
                  ? 'bg-slate-900 border-emerald-500/50 shadow-2xl shadow-emerald-950/30 relative'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 right-6 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center space-x-1 shadow-md">
                  <Sparkles className="w-3 h-3" />
                  <span>Production MVP</span>
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                <p className="text-slate-400 text-xs mb-6">{p.desc}</p>
                <div className="flex items-baseline space-x-2 mb-6">
                  <span className="text-4xl font-extrabold text-white">{p.price}</span>
                  <span className="text-xs text-slate-400">{p.period}</span>
                </div>

                <ul className="space-y-3 text-sm text-slate-300 mb-8">
                  {p.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/register"
                className={`w-full py-3.5 rounded-2xl font-semibold text-center text-sm transition ${
                  p.popular
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
