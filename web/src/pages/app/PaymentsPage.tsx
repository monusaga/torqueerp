import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ data: any[] }>('/payments?limit=100');
      setPayments(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Payments Ledger</h1>
        <p className="text-xs text-slate-500 font-semibold">Track inbound customer payments, supplier settlements & cash book reconciliations</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/70 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Party Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Method / Ref</th>
                <th className="p-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                    No payment entries recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isInbound = p.type === 'INBOUND';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {new Date(p.paymentDate).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {p.customer?.name || p.supplier?.name || 'Walk-in Party'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded font-black text-[10px] ${
                            isInbound
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isInbound ? 'CUSTOMER RECEIVED' : 'SUPPLIER PAID'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 font-medium">
                        {p.paymentMethod} {p.reference && `• Ref: ${p.reference}`}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-slate-900 text-sm">
                        ₹{p.amount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
