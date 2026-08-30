import React from 'react';
import { LegalPage } from '../../components/LegalPage';

export const TermsPage: React.FC = () => (
  <LegalPage
    eyebrow="Legal"
    title="Terms & Conditions"
    intro="These terms govern your use of the Monu Sagar spare-parts ERP — the web application, the Android app, and the server that backs both. By creating an account or using the software you agree to them."
    lastUpdated="29 August 2026"
    footNote="These terms are provided in good faith and describe how the software actually behaves. They are not legal advice. If you operate the software commercially, have a qualified professional review this document against the law that applies to your business before relying on it."
    sections={[
      {
        heading: 'Who these terms are between',
        body: [
          'In this document, “we”, “us” and “Monu Sagar” mean the operator of this software and the server it runs on. “You” means the business that registers an account, together with every staff member you give access to.',
          'The account owner is responsible for everything done under their business account, including actions taken by staff members they invite.',
        ],
      },
      {
        heading: 'Your account',
        body: [
          'You need an account to use the ERP. You can create one with an email address and password, or by signing in with Google.',
        ],
        points: [
          'Give accurate registration details and keep them current.',
          'Keep your password confidential. You are responsible for activity under your credentials.',
          'Tell us promptly if you believe someone has gained access to your account.',
          'Signing out invalidates every session token issued to your account, on all devices.',
          'Do not share one login between people who should have separate access.',
        ],
      },
      {
        heading: 'What the software does',
        body: [
          'Monu Sagar is a spare-parts inventory and billing system. It records your product catalog, purchases, stock movements, sales, customers, suppliers, payments and GST invoices.',
          'Each business is a separate tenant. Your records are scoped to your business and are not visible to any other business using the same server.',
        ],
      },
      {
        heading: 'Your data belongs to you',
        body: [
          'Everything you enter — products, prices, customers, suppliers, invoices and stock history — remains yours. We do not sell it, rent it, or use it to build products for anyone else.',
          'You can export your data to CSV at any time from the Reports section, and you can delete your account and all of its data permanently from Settings.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: ['You agree not to use the software to:'],
        points: [
          'Break any law that applies to your business, including tax and consumer-protection law.',
          'Attempt to access another business’s records, or probe, scan or test the security of the server without written permission.',
          'Upload malware, or deliberately overload or disrupt the service.',
          'Resell or redistribute access to the software without permission.',
          'Issue invoices that misstate what was actually sold or at what price.',
        ],
      },
      {
        heading: 'Invoices, GST and pricing accuracy',
        body: [
          'The software generates GST tax invoices from the figures you enter and the tax rate you select. It calculates totals, but it does not decide what is correct for your business.',
          'You are responsible for the GST rate you apply, the GSTIN you configure, the prices you charge, and the accuracy of every invoice you issue.',
          'The camera scanner can read part numbers and prices from OEM labels automatically. Optical recognition is a convenience, not a guarantee — always check a scanned price before saving it. Where the software is unsure about a price it flags the field for review, but the final check is yours.',
        ],
      },
      {
        heading: 'Availability',
        body: [
          'We aim to keep the service running, but we do not promise uninterrupted availability. Maintenance, upgrades, hosting problems and network faults can all cause downtime.',
          'Where we can plan an interruption, we will try to give notice. Where we cannot, we will restore service as quickly as is practical.',
        ],
      },
      {
        heading: 'Backups',
        body: [
          'Keep your own copies of anything you cannot afford to lose. The CSV export exists for exactly this purpose, and running it regularly is the simplest protection against loss.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'The software is provided as it is. To the extent the law allows, we are not liable for lost profits, lost sales, lost or corrupted data, or any indirect or consequential loss arising from your use of it.',
          'Nothing in these terms limits liability that cannot be limited by law.',
        ],
      },
      {
        heading: 'Suspension and termination',
        body: [
          'You can stop using the software at any time and delete your account from Settings. Deletion is permanent and removes your business records along with the account.',
          'We may suspend an account that is being used to attack the service, to access another business’s data, or in clear breach of these terms. Where it is reasonable to do so, we will contact you first.',
        ],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We may update these terms as the software changes. The revision date at the top of this page always reflects the current version. Continuing to use the service after an update means you accept the revised terms.',
        ],
      },
      {
        heading: 'Contact',
        body: [
          'Questions about these terms can be sent to monusagar247@gmail.com. Please include your business name so we can find your account.',
        ],
      },
    ]}
  />
);
