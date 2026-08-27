import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Calendar, FileText, CheckCircle2, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Purchase State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [freightCharges, setFreightCharges] = useState('0');
  const [items, setItems] = useState<any[]>([
    { productId: '', quantity: 1, unitMRP: 0, discountPercent: 20, taxRate: 18 }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, sRes, prodRes] = await Promise.all([
        apiRequest<{ data: any[] }>('/purchases'),
        apiRequest<{ data: any[] }>('/suppliers'),
        apiRequest<{ data: any[] }>('/products'),
      ]);
      setPurchases(pRes.data || []);
      setSuppliers(sRes.data || []);
      setProducts(prodRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitMRP: 0, discountPercent: 20, taxRate: 18 }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const next = [...items];
    next[idx][field] = value;
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        next[idx].unitMRP = prod.mrp || 0;
      }
    }
    setItems(next);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: selectedSupplierId || undefined,
          supplierInvoiceNo: invoiceNumber || undefined,
          freightCharges: parseFloat(freightCharges) || 0,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: parseInt(i.quantity, 10) || 1,
            unitMRP: parseFloat(i.unitMRP) || 0,
            discountPercent: parseFloat(i.discountPercent) || 0,
            taxRate: parseFloat(i.taxRate) || 0,
          })),
        }),
      });
      setIsAddModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record purchase shipment.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Supplier Purchases (Inward Inflow)</h1>
          <p className="text-xs text-slate-500 font-semibold">Record trade discounts, landed freight allocation & update stock balances</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Record Inward Shipment</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/70 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Invoice / Date</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Items Count</th>
                <th className="p-4 text-right">Total Amount (₹)</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading purchases...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                    No supplier purchases recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 font-mono text-sm">{p.supplierInvoiceNo || 'N/A'}</div>
                      <div className="text-[11px] text-slate-500">{new Date(p.purchaseDate).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{p.supplier?.name || 'Walk-in Vendor'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{p.supplier?.phone || ''}</div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      {p.items?.length || 0} parts
                    </td>
                    <td className="p-4 text-right font-mono font-black text-slate-900 text-sm">
                      ₹{p.grandTotal.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded font-black text-[10px]">
                        RECEIVED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 uppercase text-base">Record Inward Stock Shipment</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Supplier</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Supplier Bill No</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-9901"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Freight (₹)</label>
                  <input
                    type="number"
                    value={freightCharges}
                    onChange={(e) => setFreightCharges(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Shipment Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-amber-700 hover:text-amber-800 font-bold text-xs"
                  >
                    + Add More Part
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 items-center">
                    <div className="col-span-5">
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 font-semibold text-xs"
                      >
                        <option value="">Select Spare Part</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.partNumber})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 font-bold text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="MRP"
                        value={item.unitMRP}
                        onChange={(e) => handleItemChange(idx, 'unitMRP', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 font-bold text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Disc %"
                        value={item.discountPercent}
                        onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 font-bold text-xs"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-xl transition shadow-md text-xs"
                >
                  Save Inward Shipment & Increase Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
