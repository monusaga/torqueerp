import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Faq {
  q: string;
  a: string;
}

interface FaqGroup {
  title: string;
  items: Faq[];
}

const groups: FaqGroup[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'Do I need special hardware like a barcode scanner gun?',
        a: 'No. Any smartphone camera works. The Android app reads barcodes, QR codes and the printed text on a part label using the phone itself, so a counter can be running within minutes of installing the app.',
      },
      {
        q: 'How do I install the Android app?',
        a: 'Download the APK from the Download page on this site and open it. Android will ask permission to install from your browser the first time — allow it, then tap the file again. To update later, install the new APK straight over the old one; nothing is lost because your data lives on the server.',
      },
      {
        q: 'Can I use the phone and the computer at the same time?',
        a: 'Yes. The Android app and the website talk to the same server, so a sale rung up on the phone appears on the desktop immediately, and stock added on the desktop is instantly scannable on the phone.',
      },
      {
        q: 'What do I need to set up before billing customers?',
        a: 'Set your shop name, address, GSTIN and invoice prefix under Settings → Business Profile. Those details print on every invoice, so it is worth getting them right before you issue the first bill.',
      },
    ],
  },
  {
    title: 'Scanning parts',
    items: [
      {
        q: 'Which brands of spare part can it scan?',
        a: 'The scanner is not tied to one manufacturer. It recognises the label formats used across Indian OEMs — Royal Enfield, Bajaj, TVS, Hero, Honda, KTM, Suzuki and many aftermarket brands — because it reads the printed part-number field rather than relying on a single company’s barcode scheme.',
      },
      {
        q: 'The QR code on the box is not the part number. Does that matter?',
        a: 'No. Most OEM QR codes hold a long serial, not the part number. If the scanned code does not match anything in your catalog, the app automatically reads the printed label instead and identifies the part from the part number, name and MRP it finds there.',
      },
      {
        q: 'What happens when I scan a part that is not in my catalog yet?',
        a: 'A “New Product Detected” form opens with the part number, name, brand and MRP already filled in from the label. Check them, set the opening quantity and save — the part is in your catalog and is matched instantly the next time you scan it.',
      },
      {
        q: 'Can I add a part without scanning it?',
        a: 'Yes, two ways. “Gallery” runs the same recognition on a photo you already have, which is useful when a supplier sends you a picture of a label. “Manual Add” opens a blank form where you type the part number, name and MRP yourself.',
      },
      {
        q: 'What if the scanner reads the price wrong?',
        a: 'Where the price could not be read cleanly, the MRP field turns red and asks you to check it before saving. This matters because a lost decimal point can turn ₹350.00 into ₹35000 — so the app refuses to present an unclear price as if it were verified.',
      },
      {
        q: 'Can I add 40 or 50 items in one go?',
        a: 'Yes. Both the Purchase and Sell flows keep the camera open and add each scanned part to a running list, so you can work through a full carton without stopping. Review the list once at the end and confirm it in a single step.',
      },
    ],
  },
  {
    title: 'Billing and GST',
    items: [
      {
        q: 'What invoice formats can I print?',
        a: 'Invoices are generated as PDFs in three layouts: A4 and A5 for a regular printer, and an 80mm layout for a thermal receipt roll. The thermal receipt has no fixed page length, so a long bill keeps printing instead of being cut short.',
      },
      {
        q: 'Does it handle GST properly?',
        a: 'Yes. You pick the GST rate on the bill, and the invoice shows the subtotal, any discount, the tax amount and the grand total separately, along with your GSTIN and the amount written out in words. You remain responsible for choosing the correct rate for what you sell.',
      },
      {
        q: 'If I change a product’s price tomorrow, do my old invoices change?',
        a: 'No. When a sale is completed the actual cost and price at that moment are locked into the record. Updating the catalog later affects future sales only, so historical invoices and reported profit stay accurate.',
      },
      {
        q: 'Can I record part payments and track what customers owe?',
        a: 'Yes. Record how much was paid against a bill and the balance due is tracked against that customer. Outstanding receivables are summarised on the dashboard.',
      },
    ],
  },
  {
    title: 'Data and security',
    items: [
      {
        q: 'Can another shop see my data?',
        a: 'No. Every record is tied to the business that owns it, and every request is checked against the business you are signed in to. A request for another business’s record is refused outright. An automated test suite covers this and blocks a release if any of those checks fail.',
      },
      {
        q: 'Where is my data stored?',
        a: 'In the database on the Monu Sagar server your app is configured to point at. Production runs on MySQL. Your phone stores only your session token and a few preferences such as the theme and server address.',
      },
      {
        q: 'Can I export my data if I want to leave?',
        a: 'Yes, at any time and without asking anyone. Reports exports your product catalog, stock movement ledger, sales history, customer records and supplier details to CSV.',
      },
      {
        q: 'How does signing in with Google work?',
        a: 'Google sends a signed identity token which the server verifies with Google directly. An email address on its own is never accepted as proof of identity. The app never sees your Google password and asks for no access to Gmail, Drive or contacts.',
      },
      {
        q: 'What happens if I delete my account?',
        a: 'It is permanent. The account and every business record attached to it — products, stock history, sales, invoices, payments, customers and suppliers — are removed and cannot be recovered. Export your CSV data first if you might want it later.',
      },
    ],
  },
];

export const FaqPage: React.FC = () => {
  const [openKey, setOpenKey] = useState<string>('0-0');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
            Frequently Asked Questions
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
            Got Questions? We’ve Got Answers.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed mt-4 max-w-2xl mx-auto">
            Everything below reflects how the software actually works today. If your question is a
            problem rather than a query, the{' '}
            <Link to="/support" className="text-amber-400 hover:text-amber-300 font-semibold">
              support page
            </Link>{' '}
            has step-by-step fixes.
          </p>
        </div>

        <div className="space-y-12">
          {groups.map((group, g) => (
            <section key={group.title}>
              <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">
                {group.title}
              </h2>
              <div className="space-y-3">
                {group.items.map((faq, i) => {
                  const key = `${g}-${i}`;
                  const isOpen = openKey === key;
                  return (
                    <div
                      key={key}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden transition"
                    >
                      <button
                        onClick={() => setOpenKey(isOpen ? '' : key)}
                        aria-expanded={isOpen}
                        className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 text-base font-semibold text-white hover:text-amber-400 transition"
                      >
                        <span>{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
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
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};
