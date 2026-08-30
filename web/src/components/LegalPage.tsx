import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export interface LegalSection {
  heading: string;
  /** Paragraphs rendered in order. */
  body?: string[];
  /** Bullet points rendered after the paragraphs. */
  points?: string[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
  footNote?: string;
}

/**
 * Shared shell for the long-form policy pages so Terms, Privacy and Support
 * read as one document family instead of three separately-styled pages.
 */
export const LegalPage: React.FC<LegalPageProps> = ({
  eyebrow,
  title,
  intro,
  lastUpdated,
  sections,
  footNote,
}) => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <Navbar />
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">{eyebrow}</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">{title}</h1>
        <p className="text-sm text-slate-400 leading-relaxed mt-4">{intro}</p>
        <p className="text-xs text-slate-500 mt-4">Last updated: {lastUpdated}</p>
      </header>

      <nav className="mb-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">On this page</p>
        <ol className="space-y-1.5 text-sm">
          {sections.map((section, i) => (
            <li key={section.heading}>
              <a
                href={`#section-${i + 1}`}
                className="text-slate-300 hover:text-amber-400 transition"
              >
                <span className="text-slate-600 mr-2">{i + 1}.</span>
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {sections.map((section, i) => (
          <section key={section.heading} id={`section-${i + 1}`} className="scroll-mt-24">
            <h2 className="text-lg font-bold text-white mb-3">
              <span className="text-amber-400 mr-2">{i + 1}.</span>
              {section.heading}
            </h2>
            {section.body?.map((paragraph, p) => (
              <p key={p} className="text-sm text-slate-400 leading-relaxed mb-3">
                {paragraph}
              </p>
            ))}
            {section.points && (
              <ul className="space-y-2 mt-3">
                {section.points.map((point, p) => (
                  <li key={p} className="text-sm text-slate-400 leading-relaxed flex gap-3">
                    <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {footNote && (
        <p className="text-xs text-slate-500 leading-relaxed mt-12 pt-6 border-t border-slate-800">
          {footNote}
        </p>
      )}
    </main>
    <Footer />
  </div>
);
