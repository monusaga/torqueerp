import React, { useState } from 'react';
import { BarChart3, Download, Layers, TrendingUp } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const ReportsPage: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExportCsv = async (type: 'products' | 'sales') => {
    try {
      setDownloading(type);
      const token = localStorage.getItem('torque_token');
      const bizId = localStorage.getItem('torque_business_id');

      const res = await fetch(`/api/v1/reports/export?type=${type}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-business-id': bizId || '',
        },
      });

      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Export failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Reports & Data Export</h1>
        <p className="text-xs text-slate-500 font-semibold">Export your business data anytime with 100% data ownership</p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products & Inventory CSV Export */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mb-4 border border-amber-200">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">Export Products Master & Inventory</h3>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed font-medium">
              Downloads complete spare-parts catalog, OEM part numbers, barcodes, MRPs, purchase costs, current quantities in stock, and min-stock alert thresholds as CSV.
            </p>
          </div>

          <button
            onClick={() => handleExportCsv('products')}
            disabled={downloading === 'products'}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-sm"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>{downloading === 'products' ? 'Generating CSV...' : 'Download Products Master (CSV)'}</span>
          </button>
        </div>

        {/* Sales & Realized Profit CSV Export */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4 border border-emerald-200">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">Export Sales & Historical Gross Profit</h3>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed font-medium">
              Downloads all invoice transactions, customer info, sales subtotals, GST tax, locked COGS at moment of sale, and realized gross profits as CSV.
            </p>
          </div>

          <button
            onClick={() => handleExportCsv('sales')}
            disabled={downloading === 'sales'}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{downloading === 'sales' ? 'Generating CSV...' : 'Download Sales Ledger (CSV)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
