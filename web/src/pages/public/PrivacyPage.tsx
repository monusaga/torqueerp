import React from 'react';
import { LegalPage } from '../../components/LegalPage';

export const PrivacyPage: React.FC = () => (
  <LegalPage
    eyebrow="Legal"
    title="Privacy Policy"
    intro="This policy explains exactly what the Monu Sagar ERP collects, why it collects it, where it is stored, and what control you have over it. It describes what the software genuinely does — not a generic template."
    lastUpdated="29 August 2026"
    footNote="This policy describes the software’s actual behaviour in good faith. It is not legal advice. If you operate the software commercially, have a qualified professional review it against the data-protection law that applies to your business."
    sections={[
      {
        heading: 'The short version',
        body: [
          'Your business data is stored on the Monu Sagar server you connect to, it is kept separate from every other business, and it is not sold or shared with advertisers or data brokers.',
          'You can export everything to CSV whenever you like, and you can delete your account and all its records permanently from Settings.',
        ],
      },
      {
        heading: 'Information you give us',
        body: ['When you register and use the ERP, the following is stored:'],
        points: [
          'Account details — your name, email address, and a password stored only as a bcrypt hash. We never store or see your plain password.',
          'Business details — shop name, address, phone, GSTIN and invoice settings, as you enter them.',
          'Operational records — products, part numbers, prices, stock levels and stock movements, purchases, sales, invoices, payments, customers and suppliers.',
          'Customer records you enter — a customer’s name, phone number and vehicle number, when you add them to a bill. You are responsible for having a proper basis to record your own customers’ details.',
        ],
      },
      {
        heading: 'Signing in with Google',
        body: [
          'If you use “Continue with Google”, Google sends us a signed identity token. We verify that token with Google and read only your Google account ID, your email address and your display name from it.',
          'We never accept an email address on its own as proof of identity — a request without a valid, Google-signed token is rejected. We do not receive your Google password, and we do not request access to your Gmail, Drive, contacts or any other Google service.',
        ],
      },
      {
        heading: 'The camera, photos and scanning',
        body: [
          'The Android app asks for camera permission so it can scan barcodes, QR codes and printed part labels. It also lets you pick a saved photo of a label from your gallery.',
          'Barcode reading and text recognition run on your device. The photograph itself is never uploaded — only the text extracted from it, together with any scanned code, is sent to the server so the part can be identified against your catalog.',
          'The app requests one photo at a time through the Android system picker, which gives it access only to the image you choose. It has no access to the rest of your gallery.',
        ],
      },
      {
        heading: 'Information collected automatically',
        body: [
          'The server keeps ordinary operational records needed to run and secure the service: request logs, error logs, and an audit trail of significant actions within your business, such as who changed a price or adjusted stock.',
          'Rate limiting uses your network address to stop abuse. We do not run advertising trackers, and we do not build behavioural profiles.',
        ],
      },
      {
        heading: 'Where your data is stored',
        body: [
          'Your records live in the database on the Monu Sagar server that your app is configured to use. The Android app and the web app talk to the same server, which is why stock changes on the phone appear immediately on the desktop.',
          'On your phone, the app stores only your session token and a few preferences, such as the chosen theme and server address. Signing out clears them.',
        ],
      },
      {
        heading: 'How your data is separated from other businesses',
        body: [
          'Every record carries the identity of the business that owns it, and every API request is checked against the business you are signed in to. A request for a record belonging to another business is refused, not filtered.',
          'This separation is covered by an automated test suite that runs on every change and blocks a release if any of those checks fail.',
        ],
      },
      {
        heading: 'Who we share data with',
        body: [
          'We do not sell your data, and we do not share it for advertising.',
          'Data is disclosed only in these situations:',
        ],
        points: [
          'To the hosting provider that runs the server, purely as a consequence of storing it there.',
          'To Google, only during sign-in verification, and only to confirm that the identity token you presented is genuine.',
          'Where a valid legal obligation requires it.',
        ],
      },
      {
        heading: 'How long data is kept',
        body: [
          'Your records are kept for as long as your account exists, because an inventory and tax system is only useful with its history intact.',
          'When you delete your account, the account and its businesses are removed permanently along with their products, stock history, sales, invoices, payments, customers and suppliers. Deletion cannot be undone, so export anything you need first.',
        ],
      },
      {
        heading: 'Security',
        body: ['The measures actually in place include:'],
        points: [
          'Passwords stored as bcrypt hashes, never in readable form.',
          'Signed session tokens that can be invalidated server-side — signing out ends every session on every device.',
          'Google sign-in that requires a cryptographically verified token, never a self-declared email address.',
          'Business-level access checks on every request, backed by automated tests.',
          'Traffic served over HTTPS.',
          'No system is completely secure, so keep your password private and export your data regularly.',
        ],
      },
      {
        heading: 'Your choices',
        points: [
          'Export — download your catalog, stock ledger, sales, customers and suppliers as CSV from Reports, at any time.',
          'Correct — edit any record directly in the app.',
          'Delete — remove your account and all its data permanently from Settings → Delete Account & Data.',
          'Revoke camera or photo access at any time in your phone’s app settings; scanning stops working, but nothing else is affected.',
        ],
      },
      {
        heading: 'Children',
        body: [
          'This is business software and is not intended for children. We do not knowingly collect information from anyone under 18.',
        ],
      },
      {
        heading: 'Changes to this policy',
        body: [
          'If the software starts collecting or using data differently, this page is updated and the revision date at the top changes with it.',
        ],
      },
      {
        heading: 'Contact',
        body: [
          'For any privacy question, or to request export or deletion help, write to monusagar247@gmail.com with your business name.',
        ],
      },
    ]}
  />
);
