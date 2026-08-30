import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  ScanBarcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  X,
  AlertCircle,
  Receipt,
  User,
  Phone,
  Car,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { CameraScannerModal } from '../../components/CameraScannerModal';

interface CartItem {
  productId: string;
  name: string;
  partNumber: string;
  sellingPrice: number;
  purchaseCost: number;
  quantity: number;
  availableStock: number;
  discountAmount: number;
  taxRate: number; // e.g. 18%
}

export const POSPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Customer & Payment State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerVehicle, setCustomerVehicle] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [taxRate, setTaxRate] = useState<number>(18); // Default 18% GST
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Completed Invoice Modal & Print State
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      const delay = setTimeout(() => {
        searchProducts(searchTerm.trim());
      }, 200);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchProducts = async (q: string) => {
    try {
      const res = await apiRequest<{ data: any[] }>(`/products?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(res.data || []);
    } catch (e) {
      // ignore
    }
  };

  const addToCart = (product: any) => {
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      if (existing.quantity + 1 > product.currentStock) {
        setErrorMsg(`Only ${product.currentStock} units available for ${product.name}.`);
        return;
      }
      setCart(
        cart.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      if (product.currentStock < 1) {
        setErrorMsg(`Product "${product.name}" is currently out of stock.`);
        return;
      }
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          partNumber: product.partNumber,
          sellingPrice: product.sellingPrice,
          purchaseCost: product.purchaseCost,
          quantity: 1,
          availableStock: product.currentStock,
          discountAmount: 0,
          taxRate: product.taxRate || taxRate || 18,
        },
      ]);
    }
    setSearchTerm('');
    setSearchResults([]);
    setErrorMsg(null);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const next = item.quantity + delta;
            if (next > item.availableStock) {
              setErrorMsg(`Cannot add more than available stock (${item.availableStock}).`);
              return item;
            }
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  // Professional Financial & GST Calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const totalDiscount = (rawSubtotal * (discountPercent || 0)) / 100;
  const taxableAmount = Math.max(0, rawSubtotal - totalDiscount);
  const gstAmount = (taxableAmount * (taxRate || 0)) / 100;
  const cgstAmount = gstAmount / 2;
  const sgstAmount = gstAmount / 2;
  const grandTotal = Math.round((taxableAmount + gstAmount) * 100) / 100;
  const amountPaid = amountPaidInput === '' ? grandTotal : parseFloat(amountPaidInput) || 0;
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    setErrorMsg(null);

    try {
      const payload = {
        customerName: customerName.trim() || 'Retail Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        customerVehicle: customerVehicle.trim() || undefined,
        amountPaid,
        paymentMethod,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.sellingPrice,
          discountAmount: (i.sellingPrice * (discountPercent || 0)) / 100,
          taxRate: taxRate,
        })),
      };

      const res = await apiRequest<{ sale: any; invoice: any }>('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCompletedInvoice({
        ...res.invoice,
        sale: res.sale,
        items: cart,
        rawSubtotal,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        taxRate,
        grandTotal,
      });

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerVehicle('');
      setAmountPaidInput('');
      setDiscountPercent(0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout failed. Please check stock availability.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleBarcodeScanned = async (code: string) => {
    try {
      const res = await apiRequest<{ product: any }>(`/products/lookup/${encodeURIComponent(code)}`);
      if (res.product) {
        addToCart(res.product);
      }
    } catch (err: any) {
      setErrorMsg(`No product found matching barcode/part number: ${code}`);
    }
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col lg:flex-row gap-5">
      {/* Left Column: Product Search & Quick Catalog Selection */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl p-5 overflow-hidden shadow-sm">
        {/* Search & Scanner Input Bar */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by part number (e.g. RAH00140/B), name or barcode..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white text-sm font-semibold transition"
            />
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition flex items-center space-x-2 shadow-sm flex-shrink-0 text-xs"
          >
            <ScanBarcode className="w-4 h-4 text-amber-400" />
            <span>Camera Scan</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Live Search Auto-complete Results */}
        {searchResults.length > 0 && (
          <div className="mb-4 bg-white border-2 border-slate-900 rounded-xl p-2 max-h-60 overflow-y-auto space-y-1.5 shadow-xl">
            {searchResults.map((p) => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className="p-3 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-400 cursor-pointer flex items-center justify-between transition text-xs shadow-sm"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                  <div className="text-xs text-slate-600 font-mono mt-0.5 font-medium">
                    Part No: <span className="text-slate-900 font-bold">{p.partNumber}</span> | Stock: <strong className="text-emerald-700">{p.currentStock} units</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900 text-base font-mono">₹{p.sellingPrice.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500 font-medium">MRP: ₹{p.mrp}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fast Counter Spares Grid */}
        <div className="flex-1 overflow-y-auto pt-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Fast Counter Spares (Click to Add)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Instant One-Tap Add</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: 'Front Brake Pads (RE-350)', part: 'RAH00140/B', price: 520, stock: 24 },
              { name: 'Clutch Cable Wire Assembly', part: '145214/C', price: 210, stock: 8 },
              { name: 'NGK Spark Plug CPR8EA-9', part: 'CPR8EA-9', price: 170, stock: 45 },
              { name: 'Motul 7100 15W50 4T (2.5L)', part: 'MOT-7100-25', price: 2250, stock: 12 },
              { name: 'Oil Filter Royal Enfield', part: 'RE-OF-001', price: 130, stock: 50 },
              { name: 'Disc Brake Fluid DOT4 (250ml)', part: 'BF-DOT4-250', price: 180, stock: 30 },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={async () => {
                  try {
                    const res = await apiRequest<{ product: any }>(`/products/lookup/${encodeURIComponent(p.part)}`);
                    if (res.product) addToCart(res.product);
                  } catch {
                    // fallback mock add
                    addToCart({
                      id: `mock-${idx}`,
                      name: p.name,
                      partNumber: p.part,
                      sellingPrice: p.price,
                      purchaseCost: p.price * 0.75,
                      currentStock: p.stock,
                    });
                  }
                }}
                className="bg-slate-50 hover:bg-white border-2 border-slate-200 hover:border-slate-900 p-3.5 rounded-xl text-left transition flex flex-col justify-between group shadow-sm hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1 font-semibold">
                    {p.part}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-2">
                  <span className="font-black text-slate-900 text-sm font-mono">
                    ₹{p.price.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                    {p.stock} in stock
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: POS Cart & Professional GST Billing Terminal */}
      <div className="w-full lg:w-[440px] bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between overflow-hidden shadow-sm">
        <div>
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-slate-900" />
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-900">
                Cart Items ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs uppercase font-bold text-red-600 hover:text-red-800 hover:underline transition"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="max-h-48 overflow-y-auto space-y-2 mb-3 pr-1">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-semibold border-2 border-dashed border-slate-200 rounded-xl">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                No parts in cart yet. Scan or tap items on the left.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs shadow-sm"
                >
                  <div className="truncate pr-2 flex-1">
                    <div className="font-bold text-slate-900 truncate text-xs">{item.name}</div>
                    <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                      ₹{item.sellingPrice.toFixed(2)} × {item.quantity} = <strong className="text-slate-900">₹{(item.sellingPrice * item.quantity).toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="px-2 py-1 text-slate-700 hover:bg-slate-100 font-bold text-sm rounded-l-lg"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-black text-slate-900 text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="px-2 py-1 text-slate-700 hover:bg-slate-100 font-bold text-sm rounded-r-lg"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer & Vehicle Info Inputs */}
          <div className="space-y-2 border-t border-slate-200 pt-3 text-xs mb-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-900 font-semibold"
              />
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (e.g. 9876500001)"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-900 font-semibold"
              />
            </div>
            <input
              type="text"
              value={customerVehicle}
              onChange={(e) => setCustomerVehicle(e.target.value)}
              placeholder="Vehicle No / Model (e.g. Classic 350 / TN 09 BX 4520)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-900 font-semibold"
            />
          </div>
        </div>

        {/* Professional GST & Tax Breakdown Summary */}
        <div className="border-t-2 border-slate-200 pt-3 space-y-2.5">
          {/* The payment-method selector is intentionally hidden for now; every
              sale is recorded as CASH. The state and the field sent to the API
              are kept so the selector can be restored without touching the
              checkout contract. */}

          {/* Tax & Discount Controls */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <span className="text-slate-600 font-semibold">GST Rate:</span>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="bg-transparent font-black text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5% GST</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST (Standard)</option>
                <option value={28}>28% GST (Automotive)</option>
              </select>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <span className="text-slate-600 font-semibold">Discount %:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent || ''}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                placeholder="0%"
                className="w-12 bg-transparent text-right font-black text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Tax Breakdown Table */}
          <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
            <div className="flex justify-between">
              <span>Subtotal (Items):</span>
              <span className="font-mono font-bold text-slate-900">₹{rawSubtotal.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount ({discountPercent}%):</span>
                <span className="font-mono font-bold">-₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>CGST ({(taxRate / 2).toFixed(1)}%):</span>
                  <span className="font-mono font-semibold">₹{cgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>SGST ({(taxRate / 2).toFixed(1)}%):</span>
                  <span className="font-mono font-semibold">₹{sgstAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-baseline font-black text-slate-900 text-lg pt-2 border-t border-slate-200">
              <span className="uppercase tracking-wide text-xs text-slate-600 font-extrabold">Net Grand Total:</span>
              <span className="text-2xl text-slate-900 font-mono font-black">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Complete Checkout Button */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{isCheckingOut ? 'Completing Sale...' : `Complete Sale • ₹${grandTotal.toFixed(2)}`}</span>
          </button>
        </div>
      </div>

      {/* Completed Invoice Thermal Preview Modal */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <h3 className="font-black text-slate-900 uppercase text-base">Sale Completed Successfully!</h3>
              </div>
              <button
                onClick={() => setCompletedInvoice(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Thermal Receipt Card */}
            <div id="printable-receipt" className="bg-slate-50 border-2 border-slate-900 text-black p-5 rounded-2xl font-mono text-xs shadow-inner space-y-2.5">
              <div className="text-center font-black text-base">MONU SAGAR SPARES</div>
              <div className="text-center text-[11px] text-slate-600 border-b border-dashed border-slate-400 pb-2">
                TAX INVOICE: <strong>{completedInvoice.invoiceNumber}</strong> <br />
                Date: {new Date().toLocaleString()}
              </div>

              <div className="text-xs space-y-0.5">
                <div>Customer: <strong>{completedInvoice.customerName || 'Cash Customer'}</strong></div>
                {completedInvoice.customerVehicle && (
                  <div>Vehicle: <strong>{completedInvoice.customerVehicle}</strong></div>
                )}
              </div>

              <div className="border-y border-dashed border-slate-400 py-2 space-y-1.5">
                {completedInvoice.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="truncate pr-1">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-black flex-shrink-0">
                      ₹{(item.sellingPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[11px] text-slate-700 pt-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{completedInvoice.rawSubtotal.toFixed(2)}</span>
                </div>
                {completedInvoice.taxRate > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>CGST ({(completedInvoice.taxRate / 2).toFixed(1)}%):</span>
                      <span>₹{completedInvoice.cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST ({(completedInvoice.taxRate / 2).toFixed(1)}%):</span>
                      <span>₹{completedInvoice.sgstAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-black text-base text-black pt-1 border-t border-slate-900">
                  <span>GRAND TOTAL:</span>
                  <span>₹{completedInvoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-dashed border-slate-300">
                Thank you for your visit! Drive Safe.
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-2 border border-slate-300"
              >
                <Printer className="w-4 h-4 text-slate-900" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                onClick={() => setCompletedInvoice(null)}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-wider text-xs transition shadow-md"
              >
                Next Sale (F2)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode & OCR Scanner Modal */}
      <CameraScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onConfirm={(res) => {
          if (res.barcode || res.partNumber) {
            handleBarcodeScanned(res.barcode || res.partNumber || '');
          }
        }}
      />
    </div>
  );
};
