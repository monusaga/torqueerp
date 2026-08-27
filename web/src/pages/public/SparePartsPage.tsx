import React from 'react';
import { Navbar } from '../../components/Navbar';
import { PackageCheck, Layers, Wrench, Shield, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SparePartsPage: React.FC = () => {
  const brands = [
    { name: 'Royal Enfield', desc: 'Classic 350, Bullet 500, Meteor, Hunter, Continental GT 650, Himalayan 450' },
    { name: 'Yamaha / Honda / Bajaj / TVS', desc: 'Pulsar, Apache, FZ, R15, Activa, Jupiter, Splendor, Duke' },
    { name: 'Four-Wheeler Automotive', desc: 'Hyundai, Maruti Suzuki, Tata Motors, Mahindra, Toyota, Honda' },
    { name: 'Garages & Workshops', desc: 'Lubricants, filters, brake shoes, spark plugs, chains, batteries, cables' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Domain Expertise</span>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-2">
            Tailored for Motorcycle & Automotive Spare Parts
          </h1>
          <p className="mt-4 text-slate-400 text-base">
            From OEM Royal Enfield part numbers (`RAH00140/B`, `145214/C`) to aftermarket spark plugs and engine oils, handle thousands of SKUs without sweat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {brands.map((b, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
                <span>{b.name}</span>
              </h3>
              <p className="text-slate-400 text-sm">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl">
          <h2 className="text-2xl font-bold text-white mb-6">Why Monu Sagar is Different</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">Vehicle Compatibility Tagging</strong>
                Map any spare part to specific motorcycle models, years, and engine variants.
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">Supplier Discount & Landed Cost Math</strong>
                Compute true unit acquisition cost after supplier trade discounts and freight charges.
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">No Vendor Lock-In</strong>
                Export all parts, stock quantities, and customer ledgers to CSV at any time.
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">Offline Safe Caching</strong>
                Continue lookups and checkout even during intermittent shop connectivity.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
