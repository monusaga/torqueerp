import React from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Mail, Smartphone, Camera, Wifi, FileText, ShieldCheck, Download } from 'lucide-react';

interface Guide {
  icon: React.ReactNode;
  title: string;
  problem: string;
  steps: string[];
}

const guides: Guide[] = [
  {
    icon: <Camera className="w-5 h-5" />,
    title: 'The scanner reads the label incompletely',
    problem:
      'The part number, name or MRP comes through blank or garbled after scanning a label.',
    steps: [
      'Hold the label flat and fill the green frame with it — the closer the label, the larger the printed characters are to the camera.',
      'Avoid direct glare. A reflection across the MRP line is the most common cause of a missed price.',
      'Give the scan a moment. The app samples several frames and merges them, so a fraction of a second of stillness noticeably improves the result.',
      'If the MRP field turns red and says “check!”, the price could not be read cleanly. Type it in before saving rather than trusting the prefilled value.',
      'For a label that will not scan at all, use Manual Add and type the part number, name and MRP directly.',
    ],
  },
  {
    icon: <Wifi className="w-5 h-5" />,
    title: '“Network error — could not reach the server”',
    problem: 'The app cannot talk to the ERP server.',
    steps: [
      'Check that the phone has working internet — open any website in the browser.',
      'Open Settings → API Server Endpoint in the app and confirm the address is correct and ends with /api/v1/.',
      'If you are on shop Wi-Fi, try mobile data. Some routers block outbound connections on non-standard ports.',
      'If everything looks right and the problem persists, the server itself may be down — email support with the time it started.',
    ],
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: 'Google sign-in does not appear or fails',
    problem: 'The “Continue with Google” button does nothing, or sign-in is rejected.',
    steps: [
      'On the website, do a hard reload (Ctrl+Shift+R) — an old cached copy of the page is the usual cause.',
      'Allow pop-ups for the site. Google opens its account chooser in a pop-up window.',
      'In the Android app, make sure at least one Google account is added to the phone under Settings → Accounts.',
      'If you deleted your account and signed in again, a fresh empty account is created. That is expected — the old data is gone permanently.',
    ],
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: 'Invoice printing and PDF questions',
    problem: 'Choosing a format, or getting a receipt onto a thermal printer.',
    steps: [
      'Invoices are generated as PDF in three formats: A4 and A5 for a regular printer, and an 80mm layout for a thermal roll.',
      'The 80mm receipt has no fixed page length — a long bill keeps printing instead of being cut off.',
      'To print on a thermal printer, open the 80mm PDF from the app and use your printer’s own share or print option.',
      'Amounts show the ₹ symbol and the grand total is printed in a highlighted band so it is readable at a glance.',
    ],
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: 'Installing or updating the Android app',
    problem: 'The APK will not install, or you are unsure you have the current build.',
    steps: [
      'Download the APK from the Download page on this site.',
      'Android will ask permission to install from your browser the first time — allow it, then tap the file again.',
      'To update, install the new APK straight over the old one. Your data is on the server, so nothing is lost.',
      'The Download page lists the version and its SHA-256 checksum if you want to verify the file you received.',
    ],
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: 'Account, data export and deletion',
    problem: 'Getting your data out, or closing the account.',
    steps: [
      'Export your catalog, stock ledger, sales, customers and suppliers as CSV from Reports at any time.',
      'Signing out ends your session on every device, not just the one you are using.',
      'Settings → Delete Account & Data removes the account and every record belonging to it, permanently. Export first — this cannot be undone.',
    ],
  },
];

export const SupportPage: React.FC = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <Navbar />
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
      <header className="text-center mb-14">
        <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Technical Support</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
          Something not working? Start here.
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed mt-4 max-w-2xl mx-auto">
          The problems below cover most of what people run into. If none of them match, write to us — a
          short description with a screenshot usually gets a same-day answer.
        </p>
      </header>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-12">
        <div className="flex items-start gap-4">
          <span className="text-amber-400 mt-0.5">
            <Mail className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">Email support</h2>
            <a
              href="mailto:monusagar247@gmail.com"
              className="text-amber-400 hover:text-amber-300 font-semibold text-sm break-all"
            >
              monusagar247@gmail.com
            </a>
            <p className="text-sm text-slate-400 leading-relaxed mt-3">
              To get a useful answer on the first reply, include:
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
              {[
                'Your business name, so we can find the account.',
                'Whether it happened in the Android app or the website.',
                'The app version, shown on the Download page and in Settings.',
                'What you were doing when it went wrong, and what you expected instead.',
                'A screenshot of the error, if there was one.',
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="text-slate-600 flex-shrink-0">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        {guides.map((guide) => (
          <article
            key={guide.title}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">{guide.icon}</span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white">{guide.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{guide.problem}</p>
                <ol className="mt-4 space-y-2.5">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="text-sm text-slate-400 leading-relaxed flex gap-3">
                      <span className="text-amber-400/70 font-bold flex-shrink-0 tabular-nums">
                        {i + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
    <Footer />
  </div>
);
