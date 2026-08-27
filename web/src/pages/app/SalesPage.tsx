import React, { useState, useEffect } from 'react';
import { FileText, Search, Printer, Calendar, TrendingUp } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ data: any[] }>('/sales?limit=100');
      setSales(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Sales & Profit Ledger</h1>
        <p className="text-xs text-slate-500 font-semibold">Every POS counter transaction with locked historical COGS and realized profit</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/70 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Invoice No / Date</th>
                <th className="p-4">Customer / Vehicle</th>
                <th className="p-4">Payment</th>
                <th className="p-4 text-right">COGS Cost (₹)</th>
                <th className="p-4 text-right">Grand Total (₹)</th>
                <th className="p-4 text-right">Gross Profit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading sales transactions...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                    No sales recorded yet. Open POS counter to make a sale!
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 font-mono text-sm">{s.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-500">{new Date(s.saleDate).toLocaleString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{s.customer?.name || 'Walk-in Customer'}</div>
                      <div className="text-[11px] text-amber-800 font-mono font-bold">
                        {s.customer?.vehicleNumber || s.customer?.vehicleModel || 'Counter'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold text-[10px] border border-slate-200">
                        {s.paymentMethod} • {s.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-600 font-medium">
                      ₹{s.totalCostCOGS.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-slate-900 text-sm">
                      ₹{s.grandTotal.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-emerald-700 text-sm">
                      +₹{s.grossProfit.toFixed(2)}
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
