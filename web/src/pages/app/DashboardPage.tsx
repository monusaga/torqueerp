import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingCart,
  Layers,
  AlertTriangle,
  ScanBarcode,
  FileText,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { CameraScannerModal } from '../../components/CameraScannerModal';

export const DashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest('/reports/dashboard');
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const summary = dashboardData?.summary || {
    todaySales: 0,
    todayGrossProfit: 0,
    todayPurchases: 0,
    totalProducts: 0,
    stockValueCost: 0,
    stockValueRetail: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalReceivables: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 font-semibold">Live counter revenue, inventory valuation & gross profit margins</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-slate-200 transition flex items-center space-x-2 shadow-sm"
          >
            <ScanBarcode className="w-4 h-4 text-amber-600" />
            <span>Scan Label / Barcode</span>
          </button>

          <Link
            to="/app/pos"
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md"
          >
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            <span>Open POS Counter (F2)</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today’s Sales</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 font-mono">
            ₹{summary.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center text-[10px] text-amber-700 font-bold uppercase tracking-wider">
            <span>Locked Historical COGS</span>
          </div>
        </div>

        {/* Today's Gross Profit */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today’s Gross Profit</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-600 font-mono">
            ₹{summary.todayGrossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Realized Margin:{' '}
            <strong className="text-slate-900 font-bold">
              {summary.todaySales > 0
                ? `${((summary.todayGrossProfit / summary.todaySales) * 100).toFixed(1)}%`
                : '0.0%'}
            </strong>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stock Valuation (Cost)</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 font-mono">
            ₹{summary.stockValueCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Retail Potential:{' '}
            <strong className="text-slate-700 font-bold">
              ₹{summary.stockValueRetail.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Low / Out of Stock Alert Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stock Alerts</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-3">
            <span className="text-2xl font-black text-amber-600 font-mono">{summary.lowStockCount} Low</span>
            <span className="text-sm font-bold text-red-600 font-mono">{summary.outOfStockCount} Out</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <Link to="/app/products?lowStock=true" className="text-amber-700 hover:underline font-bold">
              View items needing reorder →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Low Stock Alert Table + Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Warning List */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">Low Stock Watchlist</h3>
            </div>
            <Link to="/app/products" className="text-xs text-amber-700 hover:underline font-bold">
              All Parts
            </Link>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-80">
            {dashboardData?.lowStockProducts?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">All products are healthy in stock!</p>
            ) : (
              dashboardData?.lowStockProducts?.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[10px] text-amber-800 font-mono font-semibold">{p.partNumber}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="px-2 py-0.5 rounded font-extrabold bg-amber-100 text-amber-900 border border-amber-200 text-[11px]">
                      {p.currentStock} left
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">Min: {p.minStock}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Counter Sales Ledger */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">Recent POS Counter Sales</h3>
            </div>
            <Link to="/app/sales" className="text-xs text-amber-700 hover:underline font-bold">
              View All Sales
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Items</th>
                  <th className="pb-3 text-right">Total (₹)</th>
                  <th className="pb-3 text-right">Gross Profit</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboardData?.recentSales?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No sales recorded today yet.
                    </td>
                  </tr>
                ) : (
                  dashboardData?.recentSales?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono text-amber-800 font-bold">{s.invoiceNumber}</td>
                      <td className="py-3 text-slate-800 font-semibold">{s.customer?.name || 'Cash Customer'}</td>
                      <td className="py-3 text-slate-500">{s.items?.length || 1} parts</td>
                      <td className="py-3 text-right font-bold text-slate-900 font-mono">₹{s.grandTotal.toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-emerald-600 font-mono">
                        +₹{s.grossProfit.toFixed(2)}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {s.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Camera OCR Scanner Modal */}
      <CameraScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onConfirm={(res) => {
          if (res.partNumber || res.barcode) {
            window.location.href = `/app/products?search=${encodeURIComponent(res.partNumber || res.barcode || '')}`;
          }
        }}
      />
    </div>
  );
};
