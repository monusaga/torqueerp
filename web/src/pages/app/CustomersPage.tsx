import React, { useState, useEffect } from 'react';
import { Users, Plus, Phone, Car, Search, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    vehicleNumber: '',
    vehicleModel: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  const fetchCustomers = async () => {
    try {
      let url = '/customers';
      if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;
      const res = await apiRequest<{ data: any[] }>(url);
      setCustomers(res.data || []);
    } catch (e) {
      // ignore
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
      });
      setIsAddModalOpen(false);
      setNewCustomer({ name: '', phone: '', vehicleNumber: '', vehicleModel: '', notes: '' });
      fetchCustomers();
    } catch (e: any) {
      alert(e.message || 'Failed to create customer.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Customers Directory</h1>
          <p className="text-xs text-slate-500 font-semibold">Retail clients, motorcycle owners & vehicle maintenance histories</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Add Customer</span>
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
            placeholder="Search by customer name, phone or vehicle plate (e.g. TN 09 BX 4520)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 text-xs font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-black text-slate-900 text-base">{c.name}</h3>
                <span className="bg-slate-100 text-[10px] text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-200">
                  {c._count?.sales || 0} Invoices
                </span>
              </div>
              {c.vehicleNumber && (
                <div className="text-xs text-amber-800 font-mono font-bold mt-1">
                  🚗 {c.vehicleNumber}
                </div>
              )}
              {c.vehicleModel && (
                <div className="text-xs text-slate-600 mt-0.5 font-medium">{c.vehicleModel}</div>
              )}
            </div>

            <div className="text-xs text-slate-600 border-t border-slate-100 pt-3">
              {c.phone ? (
                <div className="flex items-center space-x-2 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.phone}</span>
                </div>
              ) : (
                <span className="text-slate-400 italic">No phone registered</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 uppercase text-base">Add New Customer</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="e.g. Karthik Raman"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+91 98765 00001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Vehicle Plate Number</label>
                <input
                  type="text"
                  value={newCustomer.vehicleNumber}
                  onChange={(e) => setNewCustomer({ ...newCustomer, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. TN 09 BX 4520"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono uppercase font-bold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Vehicle Model</label>
                <input
                  type="text"
                  value={newCustomer.vehicleModel}
                  onChange={(e) => setNewCustomer({ ...newCustomer, vehicleModel: e.target.value })}
                  placeholder="e.g. Royal Enfield Classic 350 Stealth Black"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-xl transition shadow-md"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
