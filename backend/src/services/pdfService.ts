import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces.js';

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

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
  /**
   * Generates a clean, professional PDF buffer for invoices without any paid API dependencies.
   */
  static async generateInvoicePdf(
    data: InvoicePdfData,
    format: 'A4' | 'A5' | 'THERMAL' = 'A4'
  ): Promise<Buffer> {
    const printer = new PdfPrinter(fonts);

    const isThermal = format === 'THERMAL';
    const pageSize = isThermal ? { width: 226, height: 600 } : format; // 80mm thermal width is ~226pt

    const tableBody: any[] = [
      [
        { text: '#', style: 'tableHeader' },
        { text: 'Item / Part No', style: 'tableHeader' },
        { text: 'Qty', style: 'tableHeader', alignment: 'center' },
        { text: 'Rate (₹)', style: 'tableHeader', alignment: 'right' },
        { text: 'Total (₹)', style: 'tableHeader', alignment: 'right' },
      ],
    ];

    data.items.forEach((item, idx) => {
      tableBody.push([
        { text: (idx + 1).toString(), alignment: 'center' },
        { text: `${item.productName}\n(${item.partNumber})`, style: 'itemDesc' },
        { text: item.quantity.toString(), alignment: 'center' },
        { text: item.unitPrice.toFixed(2), alignment: 'right' },
        { text: item.totalAmount.toFixed(2), alignment: 'right', bold: true },
      ]);
    });

    const docDefinition: TDocumentDefinitions = {
      pageSize,
      pageMargins: isThermal ? [10, 10, 10, 10] : [30, 30, 30, 30],
      defaultStyle: {
        font: 'Helvetica',
        fontSize: isThermal ? 8 : 10,
      },
      content: [
        // Business Header
        {
          text: data.business.name.toUpperCase(),
          style: 'businessHeader',
          alignment: 'center',
        },
        {
          text: [
            data.business.address ? `${data.business.address}, ` : '',
            data.business.city ? `${data.business.city}, ` : '',
            data.business.state ? `${data.business.state} ` : '',
            data.business.pin ? `- ${data.business.pin}\n` : '\n',
            data.business.phone ? `Phone: ${data.business.phone} ` : '',
            data.business.gstin ? `| GSTIN: ${data.business.gstin}` : '',
          ].join(''),
          style: 'businessSub',
          alignment: 'center',
        },
        { text: '____________________________________________________', alignment: 'center', margin: [0, 4, 0, 8] },

        // Invoice Meta & Customer Details
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'Bill To:\n', bold: true },
                { text: `${data.customer?.name || 'Cash Customer'}\n` },
                data.customer?.phone ? { text: `Phone: ${data.customer.phone}\n` } : '',
                data.customer?.vehicleNumber ? { text: `Vehicle: ${data.customer.vehicleNumber}\n` } : '',
              ],
            },
            {
              width: '*',
              alignment: 'right',
              text: [
                { text: `INVOICE: ${data.invoice.invoiceNumber}\n`, bold: true, fontSize: 11 },
                { text: `Date: ${new Date(data.invoice.invoiceDate).toLocaleDateString()}\n` },
                { text: `Status: ${data.invoice.paymentStatus}\n`, bold: true },
                { text: `Method: ${data.invoice.paymentMethod}\n` },
              ],
            },
          ],
          margin: [0, 0, 0, 12],
        },

        // Items Table
        {
          table: {
            headerRows: 1,
            widths: isThermal ? [15, '*', 25, 40, 45] : [25, '*', 35, 60, 70],
            body: tableBody,
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 12],
        },

        // Totals & Summary
        {
          columns: [
            { width: '*', text: data.invoice.notes ? `Notes: ${data.invoice.notes}` : '' },
            {
              width: isThermal ? 120 : 180,
              table: {
                widths: ['*', '*'],
                body: [
                  [{ text: 'Subtotal:' }, { text: `₹ ${data.invoice.subtotal.toFixed(2)}`, alignment: 'right' }],
                  [{ text: 'Discount:' }, { text: `₹ ${data.invoice.discountAmount.toFixed(2)}`, alignment: 'right' }],
                  [{ text: 'Tax (GST):' }, { text: `₹ ${data.invoice.taxAmount.toFixed(2)}`, alignment: 'right' }],
                  [
                    { text: 'Grand Total:', bold: true },
                    { text: `₹ ${data.invoice.grandTotal.toFixed(2)}`, bold: true, alignment: 'right' },
                  ],
                  [{ text: 'Amount Paid:' }, { text: `₹ ${data.invoice.amountPaid.toFixed(2)}`, alignment: 'right' }],
                  [
                    { text: 'Balance Due:', bold: true, color: data.invoice.balanceDue > 0 ? '#b91c1c' : '#15803d' },
                    {
                      text: `₹ ${data.invoice.balanceDue.toFixed(2)}`,
                      bold: true,
                      alignment: 'right',
                      color: data.invoice.balanceDue > 0 ? '#b91c1c' : '#15803d',
                    },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
        },

        // Footer
        {
          text: '\nThank you for your business!\nAuthorized Signatory',
          alignment: 'center',
          fontSize: 8,
          margin: [0, 15, 0, 0],
        },
      ],
      styles: {
        businessHeader: { fontSize: isThermal ? 11 : 14, bold: true },
        businessSub: { fontSize: isThermal ? 7 : 8, color: '#4b5563' },
        tableHeader: { bold: true, fontSize: isThermal ? 8 : 9, color: '#111827' },
        itemDesc: { fontSize: isThermal ? 7 : 9 },
      },
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err) => reject(err));
      pdfDoc.end();
    });
  }
}
