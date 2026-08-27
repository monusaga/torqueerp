import React, { useState, useEffect } from 'react';
import { Truck, Plus, Phone, Mail, MapPin, Search, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    defaultDiscountPercent: 20,
  });

  useEffect(() => {
    fetchSuppliers();
  }, [searchTerm]);

  const fetchSuppliers = async () => {
    try {
      let url = '/suppliers';
      if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;
      const res = await apiRequest<{ data: any[] }>(url);
      setSuppliers(res.data || []);
    } catch (e) {
      // ignore
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Backend zod rejects empty strings for optional email/gstin — omit blanks.
      await apiRequest('/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: newSupplier.name.trim(),
          contactPerson: newSupplier.contactPerson.trim() || undefined,
          phone: newSupplier.phone.trim() || undefined,
          email: newSupplier.email.trim() || undefined,
          gstin: newSupplier.gstin.trim() || undefined,
          address: newSupplier.address.trim() || undefined,
          defaultDiscountPercent: parseFloat(newSupplier.defaultDiscountPercent.toString()) || 0,
        }),
      });
      setIsAddModalOpen(false);
      setNewSupplier({ name: '', contactPerson: '', phone: '', email: '', gstin: '', address: '', defaultDiscountPercent: 20 });
      fetchSuppliers();
    } catch (e: any) {
      alert(e.message || 'Failed to create supplier.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Suppliers & Distributors CRM</h1>
          <p className="text-xs text-slate-500 font-semibold">Authorized spare part distributors, OEM vendors & trade discount agreements</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Add Supplier</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search suppliers by company name, contact person or GSTIN..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 text-xs font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-black text-slate-900 text-base">{s.name}</h3>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                  {s.defaultDiscountPercent}% Trade Disc
                </span>
              </div>
              {s.gstin && (
                <div className="text-xs text-amber-800 font-mono font-bold mt-1">
                  GST: {s.gstin}
                </div>
              )}
              {s.contactPerson && (
                <div className="text-xs text-slate-600 mt-1 font-medium">Contact: {s.contactPerson}</div>
              )}
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 border-t border-slate-100 pt-3">
              {s.phone && (
                <div className="flex items-center space-x-2 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.phone}</span>
                </div>
              )}
              {s.email && (
                <div className="flex items-center space-x-2 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.email}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 uppercase text-base">Add New Supplier</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="e.g. Royal Enfield Spares Warehouse Chennai"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={newSupplier.contactPerson}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Trade Discount (%)</label>
                  <input
                    type="number"
                    value={newSupplier.defaultDiscountPercent}
                    onChange={(e) => setNewSupplier({ ...newSupplier, defaultDiscountPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">GSTIN</label>
                <input
                  type="text"
                  value={newSupplier.gstin}
                  onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value.toUpperCase() })}
                  placeholder="33AAAAA0000A1Z5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono uppercase font-bold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-xl transition shadow-md"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
