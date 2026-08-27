import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Truck,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

export const AppLayout: React.FC = () => {
  const { user, activeBusiness, businesses, switchBusiness, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [activeBusiness?.id]);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<{ data: any[]; unreadCount: number }>('/notifications');
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      // ignore
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      fetchNotifications();
    } catch (e) {
      // ignore
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'POS Counter', path: '/app/pos', icon: ShoppingCart, highlight: true },
    { label: 'Products Master', path: '/app/products', icon: Package },
    { label: 'Stock Ledger', path: '/app/inventory', icon: Layers },
    { label: 'Purchases (Inward)', path: '/app/purchases', icon: Truck },
    { label: 'Sales & Ledger', path: '/app/sales', icon: FileText },
    { label: 'Tax Invoices', path: '/app/invoices', icon: FileText },
    { label: 'Payments Ledger', path: '/app/payments', icon: CreditCard },
    { label: 'Suppliers CRM', path: '/app/suppliers', icon: Truck },
    { label: 'Customers CRM', path: '/app/customers', icon: Users },
    { label: 'Reports & Export', path: '/app/reports', icon: BarChart3 },
    { label: 'Business Settings', path: '/app/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 selection:bg-amber-500 selection:text-white">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 h-16 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-2">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:text-slate-900">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-black text-lg text-slate-900 tracking-wide">MONU<span className="text-amber-600">SAGAR</span></span>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/app/pos"
            className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 uppercase tracking-wider shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS</span>
          </Link>
        </div>
      </div>

      {/* Sidebar Backdrop on Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Sidebar (Clean White) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out shadow-sm ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & Active Business */}
        <div className="p-4 border-b border-slate-100 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-amber-400 text-sm shadow-md">
                T
              </div>
              <span className="font-black text-lg text-slate-900 tracking-wide">MONU<span className="text-amber-600">SAGAR</span></span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Business Switcher */}
          <div className="relative">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center space-x-2 truncate">
                <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-bold text-slate-800 truncate">
                  {activeBusiness?.name || 'My Business'}
                </span>
              </div>
              {businesses.length > 1 && (
                <select
                  value={activeBusiness?.id}
                  onChange={(e) => switchBusiness(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md font-bold'
                    : item.highlight
                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : item.highlight ? 'text-amber-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto bg-amber-100 text-amber-800 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border border-amber-200">
                    F2
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex flex-col truncate pr-2">
            <span className="text-xs font-bold text-slate-800 truncate">{user?.name}</span>
            <span className="text-[10px] text-slate-500 truncate">{user?.email}</span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top bar for desktop */}
        <header className="hidden md:flex items-center justify-between h-16 px-6 border-b border-slate-200 bg-white/90 backdrop-blur shadow-sm">
          <div className="flex items-center space-x-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Active Tenant: <strong className="text-slate-900 font-bold ml-1">{activeBusiness?.name}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/app/pos"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
            >
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span>POS Counter (F2)</span>
            </Link>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition relative border border-slate-200 shadow-sm"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-2">
                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Alerts ({unreadCount} unread)</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
                    {notifications.length === 0 ? (
                      <p className="text-slate-400 py-4 text-center">No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition ${
                            n.isRead
                              ? 'bg-slate-50 border-slate-100 text-slate-500'
                              : 'bg-amber-50 border-amber-200 text-slate-900'
                          }`}
                        >
                          <div className="font-bold text-amber-900">{n.title}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Quick Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-30 px-2 shadow-lg">
        <Link
          to="/app/dashboard"
          className={`flex flex-col items-center justify-center py-1 text-[10px] uppercase font-bold ${
            location.pathname === '/app/dashboard' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link
          to="/app/products"
          className={`flex flex-col items-center justify-center py-1 text-[10px] uppercase font-bold ${
            location.pathname === '/app/products' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>Parts</span>
        </Link>
        <Link
          to="/app/pos"
          className="flex flex-col items-center justify-center -mt-5 bg-slate-900 text-amber-400 w-12 h-12 rounded-full shadow-lg border border-slate-800"
        >
          <ShoppingCart className="w-6 h-6" />
        </Link>
        <Link
          to="/app/inventory"
          className={`flex flex-col items-center justify-center py-1 text-[10px] uppercase font-bold ${
            location.pathname === '/app/inventory' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>Stock</span>
        </Link>
        <Link
          to="/app/reports"
          className={`flex flex-col items-center justify-center py-1 text-[10px] uppercase font-bold ${
            location.pathname === '/app/reports' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Profit</span>
        </Link>
      </div>
    </div>
  );
};
