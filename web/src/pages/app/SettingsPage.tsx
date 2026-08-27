import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Building2, Shield, Save, CheckCircle2, LogOut, Trash2, AlertTriangle, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user, activeBusiness, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    gstin: '',
    pan: '',
    invoicePrefix: 'INV',
    defaultTaxRate: 18,
    allowNegativeStock: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Delete Account / Business Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchBusiness();
  }, []);

  const fetchBusiness = async () => {
    try {
      const res = await apiRequest<{ business: any }>('/businesses/current');
      if (res.business) {
        setFormData({
          name: res.business.name || '',
          phone: res.business.phone || '',
          email: res.business.email || '',
          address: res.business.address || '',
          city: res.business.city || '',
          state: res.business.state || '',
          pin: res.business.pin || '',
          gstin: res.business.gstin || '',
          pan: res.business.pan || '',
          invoicePrefix: res.business.invoicePrefix || 'INV',
          defaultTaxRate: res.business.defaultTaxRate || 18,
          allowNegativeStock: res.business.allowNegativeStock || false,
        });
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await apiRequest('/businesses/current', {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          defaultTaxRate: parseFloat(formData.defaultTaxRate.toString()) || 0,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiRequest('/auth/account', {
        method: 'DELETE',
      });
      logout();
      navigate('/register');
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Business Settings</h1>
          <p className="text-xs text-slate-500 font-semibold">Configure business profile, GST tax defaults, sessions & data controls</p>
        </div>

        {/* Prominent Header Logout Button */}
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Session</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Business settings updated successfully!</span>
        </div>
      )}

      {/* Profile & Shop Settings Form */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-6 text-xs shadow-sm">
        <div>
          <h3 className="font-bold text-slate-900 text-sm mb-3">Shop Profile & Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Business Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="font-bold text-slate-900 text-sm mb-3">GSTIN & Invoicing Numbering</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="33AAAAA0000A1Z5"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono uppercase font-bold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase() })}
                placeholder="RSP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono uppercase font-bold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Default GST Rate (%)</label>
              <input
                type="number"
                value={formData.defaultTaxRate}
                onChange={(e) => setFormData({ ...formData, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Inventory Negative Stock Policy</h3>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allowNegativeStock}
              onChange={(e) => setFormData({ ...formData, allowNegativeStock: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-50 border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <div>
              <span className="text-slate-900 font-bold block">Allow Negative Stock</span>
              <span className="text-slate-500 text-[11px] font-medium">
                When unchecked (recommended), sales are automatically blocked if inventory in the stock ledger is insufficient.
              </span>
            </div>
          </label>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center space-x-2 shadow-sm text-xs"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Account Info & Session Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Account & Active User</h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <div className="font-bold text-slate-900 text-sm">{user?.name}</div>
            <div className="text-slate-500 text-xs">{user?.email}</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl transition flex items-center space-x-2 shadow-sm"
          >
            <LogOut className="w-4 h-4 text-slate-600" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Delete Business & Permanent Account Removal */}
      <div className="bg-red-50/50 border-2 border-red-200 p-6 rounded-2xl text-xs space-y-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="font-black text-red-900 text-sm uppercase tracking-wide">Danger Zone: Permanent Account Deletion</h3>
        </div>
        <p className="text-red-700 text-xs leading-relaxed font-medium">
          Deleting your account permanently wipes all products master data, stock ledger movements, historical invoices, purchases, customer records, and financial accounts. This action is irreversible.
        </p>

        <button
          type="button"
          onClick={() => {
            setDeleteModalOpen(true);
            setDeleteConfirmationText('');
            setDeleteError(null);
          }}
          className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-xl transition flex items-center space-x-2 shadow-md"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Entire Account & Data</span>
        </button>
      </div>

      {/* Delete Confirmation Safety Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-black text-slate-900 uppercase text-sm">Confirm Account Deletion</h3>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed font-medium">
              Are you absolutely sure you want to permanently delete your account and all associated shop data?
            </p>

            <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-red-800 text-xs font-semibold">
              To proceed, please type <strong className="font-black text-red-900 uppercase tracking-widest">DELETE</strong> in the field below:
            </div>

            {deleteError && (
              <div className="text-red-600 text-xs font-bold">
                {deleteError}
              </div>
            )}

            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold uppercase tracking-wider text-xs focus:outline-none focus:border-red-600"
            />

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText.trim().toUpperCase() !== 'DELETE' || isDeleting}
                onClick={handleDeleteAccount}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl font-black uppercase tracking-wider text-xs transition shadow-md flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
