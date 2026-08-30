import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces.js';
import fs from 'fs';
import path from 'path';

/**
 * PDF standard fonts (Helvetica and friends) are encoded with WinAnsi, which
 * has no Indian Rupee sign. Writing "₹" against them silently prints "¹", so
 * every amount on the invoice — the grand total included — came out corrupted.
 * A Unicode TTF is embedded instead; if it cannot be found at runtime the
 * document still renders, falling back to Helvetica with an "Rs." prefix
 * rather than failing or printing a broken glyph.
 */
const FONT_CANDIDATES = [
  path.resolve(process.cwd(), 'node_modules', 'dejavu-fonts-ttf', 'ttf'),
  path.resolve(process.cwd(), '..', 'node_modules', 'dejavu-fonts-ttf', 'ttf'),
  path.resolve(__dirname, '..', '..', 'node_modules', 'dejavu-fonts-ttf', 'ttf'),
];

function resolveFontDir(): string | null {
  for (const dir of FONT_CANDIDATES) {
    try {
      if (
        fs.existsSync(path.join(dir, 'DejaVuSans.ttf')) &&
        fs.existsSync(path.join(dir, 'DejaVuSans-Bold.ttf'))
      ) {
        return dir;
      }
    } catch {
      // Unreadable candidate: try the next one.
    }
  }
  return null;
}

const FONT_DIR = resolveFontDir();
const UNICODE_OK = FONT_DIR !== null;

const fonts = UNICODE_OK
  ? {
      Invoice: {
        normal: path.join(FONT_DIR as string, 'DejaVuSans.ttf'),
        bold: path.join(FONT_DIR as string, 'DejaVuSans-Bold.ttf'),
        italics: path.join(FONT_DIR as string, 'DejaVuSans-Oblique.ttf'),
        bolditalics: path.join(FONT_DIR as string, 'DejaVuSans-BoldOblique.ttf'),
      },
    }
  : {
      Invoice: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

/** "₹" when the embedded font can draw it, otherwise the safe ASCII prefix. */
const RUPEE = UNICODE_OK ? '₹' : 'Rs.';

const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#cbd5e1';
const BAND = '#f1f5f9';
const DUE = '#b91c1c';
const PAID = '#15803d';

const money = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const amount = (n: number) => `${RUPEE} ${money(n)}`;

// ---------------------------------------------------------------------------
// Amount in words, Indian numbering (crore / lakh / thousand).
// ---------------------------------------------------------------------------
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function underHundred(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

function underThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(underHundred(rest));
  return parts.join(' ');
}

function rupeesInWords(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const whole = Math.floor(rounded);
  const paise = Math.round((rounded - whole) * 100);

  const groups: Array<{ divisor: number; label: string }> = [
    { divisor: 10000000, label: 'Crore' },
    { divisor: 100000, label: 'Lakh' },
    { divisor: 1000, label: 'Thousand' },
  ];

  let remaining = whole;
  const parts: string[] = [];
  for (const { divisor, label } of groups) {
    const count = Math.floor(remaining / divisor);
    if (count) {
      parts.push(`${underThousand(count)} ${label}`);
      remaining %= divisor;
    }
  }
  if (remaining) parts.push(underThousand(remaining));

  const rupeeWords = parts.length ? parts.join(' ') : 'Zero';
  const paiseWords = paise ? ` and ${underHundred(paise)} Paise` : '';
  return `${rupeeWords} Rupees${paiseWords} Only`;
}

export interface InvoicePdfData {
  business: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pin?: string | null;
    gstin?: string | null;
  };
  invoice: {
    invoiceNumber: string;
    invoiceDate: Date | string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: string;
    paymentMethod: string;
    notes?: string | null;
  };
  customer?: {
    name?: string | null;
    phone?: string | null;
    vehicleNumber?: string | null;
    gstin?: string | null;
  } | null;
  items: Array<{
    partNumber: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    totalAmount: number;
  }>;
}

export class PdfService {
  /** True when the Unicode invoice font was found and ₹ will render correctly. */
  static get unicodeFontAvailable(): boolean {
    return UNICODE_OK;
  }

  /** The currency prefix the generated PDF will actually print. */
  static get currencyPrefix(): string {
    return RUPEE;
  }

  static async generateInvoicePdf(
    data: InvoicePdfData,
    format: 'A4' | 'A5' | 'THERMAL' = 'A4'
  ): Promise<Buffer> {
    const printer = new PdfPrinter(fonts);
    const isThermal = format === 'THERMAL';

    const docDefinition = isThermal
      ? PdfService.thermalDocument(data)
      : PdfService.pageDocument(data, format);

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err) => reject(err));
      pdfDoc.end();
    });
  }

  // -------------------------------------------------------------------------
  // A4 / A5 tax invoice
  // -------------------------------------------------------------------------
  private static pageDocument(data: InvoicePdfData, format: 'A4' | 'A5'): TDocumentDefinitions {
    const { business, invoice, customer, items } = data;

    const addressLine = [
      business.address,
      business.city,
      [business.state, business.pin].filter(Boolean).join(' - '),
    ]
      .filter((part) => part && String(part).trim())
      .join(', ');

    const contactLine = [
      business.phone ? `Phone: ${business.phone}` : null,
      business.email ? `Email: ${business.email}` : null,
    ]
      .filter(Boolean)
      .join('   ');

    const itemRows: any[] = [
      [
        { text: '#', style: 'th', alignment: 'center' },
        { text: 'Description', style: 'th' },
        { text: 'Part No.', style: 'th' },
        { text: 'Qty', style: 'th', alignment: 'center' },
        { text: `Rate (${RUPEE})`, style: 'th', alignment: 'right' },
        { text: `Amount (${RUPEE})`, style: 'th', alignment: 'right' },
      ],
    ];

    items.forEach((item, idx) => {
      itemRows.push([
        { text: String(idx + 1), alignment: 'center', style: 'td' },
        { text: item.productName, style: 'td' },
        { text: item.partNumber || '-', style: 'tdMuted' },
        { text: String(item.quantity), alignment: 'center', style: 'td' },
        { text: money(item.unitPrice), alignment: 'right', style: 'td' },
        { text: money(item.totalAmount), alignment: 'right', style: 'tdBold' },
      ]);
    });

    const totalsRows: any[] = [
      [{ text: 'Subtotal', style: 'sumLabel' }, { text: amount(invoice.subtotal), style: 'sumValue' }],
    ];
    if (invoice.discountAmount > 0) {
      totalsRows.push([
        { text: 'Discount', style: 'sumLabel' },
        { text: `- ${amount(invoice.discountAmount)}`, style: 'sumValue' },
      ]);
    }
    totalsRows.push([
      { text: 'GST', style: 'sumLabel' },
      { text: amount(invoice.taxAmount), style: 'sumValue' },
    ]);

    return {
      pageSize: format,
      pageMargins: [32, 32, 32, 54],
      defaultStyle: { font: 'Invoice', fontSize: 9, color: INK },

      footer: (currentPage: number, pageCount: number) => ({
        margin: [32, 8, 32, 0],
        columns: [
          {
            width: '*',
            text: 'This is a computer-generated invoice.',
            fontSize: 7,
            color: MUTED,
          },
          {
            width: 'auto',
            text: `Page ${currentPage} of ${pageCount}`,
            fontSize: 7,
            color: MUTED,
            alignment: 'right',
          },
        ],
      }),

      content: [
        // ---- Letterhead -------------------------------------------------
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: business.name.toUpperCase(), style: 'bizName' },
                addressLine ? { text: addressLine, style: 'bizMeta' } : '',
                contactLine ? { text: contactLine, style: 'bizMeta' } : '',
                business.gstin ? { text: `GSTIN: ${business.gstin}`, style: 'bizGstin' } : '',
              ].filter(Boolean),
            },
            {
              width: 'auto',
              stack: [
                { text: 'TAX INVOICE', style: 'docTitle', alignment: 'right' },
                {
                  text: invoice.invoiceNumber,
                  style: 'docNumber',
                  alignment: 'right',
                },
              ],
            },
          ],
        },
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 531, y2: 0, lineWidth: 1.4, lineColor: INK }],
          margin: [0, 10, 0, 12],
        },

        // ---- Party + invoice meta ---------------------------------------
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'BILL TO', style: 'blockLabel' },
                { text: customer?.name || 'Cash Customer', style: 'partyName' },
                customer?.phone ? { text: `Phone: ${customer.phone}`, style: 'partyMeta' } : '',
                customer?.vehicleNumber
                  ? { text: `Vehicle: ${customer.vehicleNumber}`, style: 'partyMeta' }
                  : '',
                customer?.gstin ? { text: `GSTIN: ${customer.gstin}`, style: 'partyMeta' } : '',
              ].filter(Boolean),
            },
            {
              width: 190,
              table: {
                widths: ['auto', '*'],
                body: [
                  [
                    { text: 'Invoice Date', style: 'metaLabel' },
                    {
                      text: new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }),
                      style: 'metaValue',
                    },
                  ],
                  [
                    { text: 'Status', style: 'metaLabel' },
                    {
                      text: invoice.paymentStatus,
                      style: 'metaValue',
                      color: invoice.balanceDue > 0 ? DUE : PAID,
                      bold: true,
                    },
                  ],
                  [
                    { text: 'Items', style: 'metaLabel' },
                    { text: String(items.length), style: 'metaValue' },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
          margin: [0, 0, 0, 14],
        },

        // ---- Items -------------------------------------------------------
        {
          table: {
            headerRows: 1,
            // 22+70+34+62+72 = 260 fixed, leaving 271pt for the description so
            // long part names wrap instead of being squeezed off the page.
            widths: [22, '*', 70, 34, 62, 72],
            body: itemRows,
          },
          layout: {
            fillColor: (rowIndex: number) => (rowIndex === 0 ? BAND : null),
            hLineWidth: (i: number, node: any) =>
              i === 0 || i === 1 || i === node.table.body.length ? 0.9 : 0.4,
            vLineWidth: () => 0,
            hLineColor: (i: number) => (i <= 1 ? INK : LINE),
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
          margin: [0, 0, 0, 12],
        },

        // ---- Totals ------------------------------------------------------
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Amount in words', style: 'blockLabel' },
                { text: rupeesInWords(invoice.grandTotal), style: 'words' },
                invoice.notes ? { text: `Notes: ${invoice.notes}`, style: 'notes' } : '',
              ].filter(Boolean),
              margin: [0, 2, 12, 0],
            },
            {
              width: 220,
              stack: [
                {
                  table: { widths: ['*', 'auto'], body: totalsRows },
                  layout: 'noBorders',
                },
                {
                  table: {
                    widths: ['*', 'auto'],
                    body: [
                      [
                        { text: 'GRAND TOTAL', style: 'grandLabel' },
                        { text: amount(invoice.grandTotal), style: 'grandValue' },
                      ],
                    ],
                  },
                  layout: {
                    fillColor: () => INK,
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                    paddingTop: () => 7,
                    paddingBottom: () => 7,
                    paddingLeft: () => 8,
                    paddingRight: () => 8,
                  },
                  margin: [0, 4, 0, 4],
                },
                {
                  table: {
                    widths: ['*', 'auto'],
                    body: [
                      [
                        { text: 'Amount Paid', style: 'sumLabel' },
                        { text: amount(invoice.amountPaid), style: 'sumValue' },
                      ],
                      [
                        {
                          text: 'Balance Due',
                          style: 'sumLabel',
                          bold: true,
                          color: invoice.balanceDue > 0 ? DUE : PAID,
                        },
                        {
                          text: amount(invoice.balanceDue),
                          style: 'sumValue',
                          bold: true,
                          color: invoice.balanceDue > 0 ? DUE : PAID,
                        },
                      ],
                    ],
                  },
                  layout: 'noBorders',
                },
              ],
            },
          ],
        },

        // ---- Signature ---------------------------------------------------
        {
          columns: [
            {
              width: '*',
              text: 'Goods once sold will only be taken back or exchanged as per store policy.',
              style: 'terms',
            },
            {
              width: 180,
              stack: [
                { text: ' ', margin: [0, 18, 0, 0] },
                {
                  canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.6, lineColor: LINE },
                  ],
                },
                {
                  text: `For ${business.name}`,
                  style: 'signature',
                  alignment: 'center',
                  margin: [0, 4, 0, 0],
                },
                { text: 'Authorised Signatory', style: 'signatureSub', alignment: 'center' },
              ],
            },
          ],
          margin: [0, 24, 0, 0],
        },
      ],

      styles: {
        bizName: { fontSize: 16, bold: true },
        bizMeta: { fontSize: 8, color: MUTED, margin: [0, 1, 0, 0] },
        bizGstin: { fontSize: 8, bold: true, margin: [0, 3, 0, 0] },
        docTitle: { fontSize: 15, bold: true, color: INK },
        docNumber: { fontSize: 10, color: MUTED, margin: [0, 2, 0, 0] },
        blockLabel: { fontSize: 7, bold: true, color: MUTED, margin: [0, 0, 0, 3] },
        partyName: { fontSize: 11, bold: true },
        partyMeta: { fontSize: 8, color: MUTED, margin: [0, 1, 0, 0] },
        metaLabel: { fontSize: 8, color: MUTED, margin: [0, 1, 8, 1] },
        metaValue: { fontSize: 8, alignment: 'right', margin: [0, 1, 0, 1] },
        th: { fontSize: 8, bold: true, margin: [0, 0, 0, 0] },
        td: { fontSize: 9 },
        tdMuted: { fontSize: 8, color: MUTED },
        tdBold: { fontSize: 9, bold: true },
        sumLabel: { fontSize: 9, color: MUTED, margin: [0, 2, 0, 2] },
        sumValue: { fontSize: 9, alignment: 'right', margin: [0, 2, 0, 2] },
        grandLabel: { fontSize: 10, bold: true, color: '#ffffff' },
        grandValue: { fontSize: 12, bold: true, color: '#ffffff', alignment: 'right' },
        words: { fontSize: 8, italics: true },
        notes: { fontSize: 8, color: MUTED, margin: [0, 6, 0, 0] },
        terms: { fontSize: 7, color: MUTED, margin: [0, 30, 0, 0] },
        signature: { fontSize: 8, bold: true },
        signatureSub: { fontSize: 7, color: MUTED },
      },
    };
  }

  // -------------------------------------------------------------------------
  // 80mm thermal receipt
  // -------------------------------------------------------------------------
  private static thermalDocument(data: InvoicePdfData): TDocumentDefinitions {
    const { business, invoice, customer, items } = data;

    // Each item gets its own two-line block instead of being crammed into five
    // narrow columns, which is what used to squeeze part names off the roll.
    const itemBlocks: any[] = [];
    items.forEach((item, idx) => {
      itemBlocks.push({
        text: `${idx + 1}. ${item.productName}`,
        fontSize: 8,
        bold: true,
        margin: [0, 3, 0, 0],
      });
      if (item.partNumber) {
        itemBlocks.push({ text: item.partNumber, fontSize: 7, color: MUTED });
      }
      itemBlocks.push({
        columns: [
          { width: '*', text: `${item.quantity} x ${money(item.unitPrice)}`, fontSize: 8 },
          { width: 'auto', text: money(item.totalAmount), fontSize: 8, bold: true, alignment: 'right' },
        ],
      });
    });

    const rule = (margin: number[]) => ({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 210, y2: 0, lineWidth: 0.5, lineColor: LINE }],
      margin,
    });

    const summaryRow = (label: string, value: string, bold = false, color?: string) => ({
      columns: [
        { width: '*', text: label, fontSize: 8, bold, color },
        { width: 'auto', text: value, fontSize: 8, bold, color, alignment: 'right' },
      ],
      margin: [0, 1, 0, 1],
    });

    return {
      // 80mm roll. Auto height means a long bill keeps printing instead of
      // being cut off at a fixed page length.
      pageSize: { width: 226, height: 'auto' },
      pageMargins: [8, 10, 8, 10],
      defaultStyle: { font: 'Invoice', fontSize: 8, color: INK },
      content: [
        { text: business.name.toUpperCase(), fontSize: 11, bold: true, alignment: 'center' },
        business.phone
          ? { text: `Phone: ${business.phone}`, fontSize: 7, color: MUTED, alignment: 'center' }
          : '',
        business.gstin
          ? { text: `GSTIN: ${business.gstin}`, fontSize: 7, color: MUTED, alignment: 'center' }
          : '',
        { text: 'TAX INVOICE', fontSize: 9, bold: true, alignment: 'center', margin: [0, 5, 0, 0] },
        rule([0, 5, 0, 5]),

        { text: invoice.invoiceNumber, fontSize: 8, bold: true },
        {
          text: new Date(invoice.invoiceDate).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          fontSize: 7,
          color: MUTED,
        },
        { text: `Customer: ${customer?.name || 'Cash Customer'}`, fontSize: 7, margin: [0, 2, 0, 0] },
        customer?.vehicleNumber
          ? { text: `Vehicle: ${customer.vehicleNumber}`, fontSize: 7 }
          : '',
        rule([0, 5, 0, 2]),

        ...itemBlocks,
        rule([0, 6, 0, 5]),

        summaryRow('Subtotal', amount(invoice.subtotal)),
        ...(invoice.discountAmount > 0
          ? [summaryRow('Discount', `- ${amount(invoice.discountAmount)}`)]
          : []),
        summaryRow('GST', amount(invoice.taxAmount)),

        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [
                { text: 'GRAND TOTAL', fontSize: 9, bold: true, color: '#ffffff' },
                {
                  text: amount(invoice.grandTotal),
                  fontSize: 10,
                  bold: true,
                  color: '#ffffff',
                  alignment: 'right',
                },
              ],
            ],
          },
          layout: {
            fillColor: () => INK,
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingTop: () => 5,
            paddingBottom: () => 5,
            paddingLeft: () => 5,
            paddingRight: () => 5,
          },
          margin: [0, 5, 0, 5],
        },

        summaryRow('Amount Paid', amount(invoice.amountPaid)),
        summaryRow(
          'Balance Due',
          amount(invoice.balanceDue),
          true,
          invoice.balanceDue > 0 ? DUE : PAID
        ),

        {
          text: rupeesInWords(invoice.grandTotal),
          fontSize: 7,
          italics: true,
          margin: [0, 5, 0, 0],
        },
        rule([0, 6, 0, 5]),
        { text: 'Thank you for your business!', fontSize: 8, bold: true, alignment: 'center' },
        {
          text: 'This is a computer-generated receipt.',
          fontSize: 6,
          color: MUTED,
          alignment: 'center',
          margin: [0, 2, 0, 0],
        },
      ].filter(Boolean) as any,
    };
  }
}
