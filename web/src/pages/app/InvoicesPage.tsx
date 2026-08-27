import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Search, Calendar } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ data: any[] }>('/invoices?limit=100');
      setInvoices(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (id: string, format: 'A4' | 'THERMAL' = 'A4') => {
    try {
      const token = localStorage.getItem('torque_token');
      const bizId = localStorage.getItem('torque_business_id');

      const res = await fetch(`/api/v1/invoices/${id}/pdf?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-business-id': bizId || '',
        },
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${id}_${format.toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Tax Invoices Directory</h1>
        <p className="text-xs text-slate-500 font-semibold">Print thermal 80mm receipts or download official GST A4 PDF invoices</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/70 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Invoice No / Date</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4 text-right">Grand Total (₹)</th>
                <th className="p-4 text-right">Amount Paid (₹)</th>
                <th className="p-4 text-right">Balance Due (₹)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 font-mono text-sm">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4 text-slate-900 font-bold">
                      {inv.customerName || 'Cash Customer'}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-slate-900 text-sm">
                      ₹{inv.grandTotal.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-700">
                      ₹{inv.amountPaid.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-amber-800">
                      ₹{inv.balanceDue.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded font-black text-[10px] ${
                          inv.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleDownloadPdf(inv.id, 'A4')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] flex items-center space-x-1 border border-slate-200"
                          title="Download A4 GST PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-700" />
                          <span>A4 PDF</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(inv.id, 'THERMAL')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] flex items-center space-x-1 border border-slate-200"
                          title="Download 80mm Thermal Receipt PDF"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-700" />
                          <span>Thermal</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
