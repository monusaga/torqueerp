import React, { useState, useEffect } from 'react';
import { Layers, ArrowDownLeft, ArrowUpRight, AlertOctagon, Plus, Filter, Search } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const InventoryPage: React.FC = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ data: any[] }>('/inventory/movements?limit=100');
      setMovements(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Stock Movement Ledger</h1>
        <p className="text-xs text-slate-500 font-semibold">Immutable audit trail of all purchases, POS sales, and inventory adjustments</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/70 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Product / Part</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-center">Change Qty</th>
                <th className="p-4 text-center">Balance Stock</th>
                <th className="p-4 text-right">Unit Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading stock movements...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantityChange > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{m.product?.name}</div>
                        <div className="text-[11px] text-amber-800 font-mono font-bold">{m.product?.partNumber}</div>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold text-[10px] border border-slate-200">
                          {m.type}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 font-black font-mono text-xs ${
                            isPositive ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {isPositive ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          <span>{isPositive ? `+${m.quantityChange}` : m.quantityChange}</span>
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-900 font-mono">
                        {m.balanceQuantity}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-600 font-medium">
                        ₹{m.unitCost.toFixed(2)}
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
