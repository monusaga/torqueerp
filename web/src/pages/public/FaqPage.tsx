import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const FaqPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Does Monu Sagar require expensive hardware like dedicated barcode scanners?',
      a: 'No! You can use any smartphone camera or standard PC webcam to scan barcodes, QR codes, and printed spare-parts labels directly with our zero-cost OCR engine.',
    },
    {
      q: 'Can I print thermal receipts for my retail counter?',
      a: 'Yes, Monu Sagar produces clean 58mm and 80mm thermal receipts as well as standard A4 and A5 GST tax invoices that can be printed on any thermal USB/Bluetooth printer or saved as PDF.',
    },
    {
      q: 'How does historical profit calculation work if product prices change later?',
      a: 'Whenever a sale is completed, Monu Sagar permanently captures and locks the actual landed cost of the part at that exact moment. If you update the product purchase price in the master catalog tomorrow, past invoices and reported profits remain 100% accurate.',
    },
    {
      q: 'Is multi-tenant business data completely isolated?',
      a: 'Yes. Every business is strictly isolated in the database and API authorization layer. An automated release-blocking security test suite ensures no business can ever query or view another shop\'s data.',
    },
    {
      q: 'Can I export my data if I decide to switch?',
      a: 'Yes, you can export your complete product catalog, stock movement ledger, sales history, customer records, and supplier details to CSV at any time.',
    },
    {
      q: 'Does the Android app use the same database as the Web app?',
      a: 'Yes, the Android App and Web App consume the exact same backend REST API and shared PostgreSQL database. Stock changes on mobile are instantly visible on desktop.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Frequently Asked Questions</span>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-2">
            Got Questions? We’ve Got Answers.
          </h1>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between text-base font-semibold text-white hover:text-emerald-400 transition"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-emerald-400 flex-shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 ml-4" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
