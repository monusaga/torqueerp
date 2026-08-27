import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  ScanBarcode,
  AlertTriangle,
  Tag,
  Edit2,
  CheckCircle2,
  X,
  Layers,
  Filter,
  Car,
  Bike,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { CameraScannerModal } from '../../components/CameraScannerModal';
import { INDIAN_AUTOMOTIVE_BRANDS, VehicleBrand } from '../../data/indianVehicles';

export const ProductsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Scanner & Add Product Modal States
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Vehicle category in Add Modal
  const [vehicleTypeTab, setVehicleTypeTab] = useState<'TWO_WHEELER' | 'FOUR_WHEELER' | 'COMMERCIAL' | 'EV'>('TWO_WHEELER');
  const [selectedBrandObj, setSelectedBrandObj] = useState<VehicleBrand | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    partNumber: '',
    brand: 'Royal Enfield',
    category: 'Braking System',
    mrp: '',
    purchaseCost: '',
    sellingPrice: '',
    initialStock: '0',
    minStock: '5',
    barcode: '',
    vehicleCompatibility: 'Royal Enfield Classic 350, Bullet 350, Hunter 350, Meteor 350',
  });

  const [savingProduct, setSavingProduct] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const SPARE_CATEGORIES = [
    'Braking System',
    'Engine & Cylinder',
    'Clutch & Transmission',
    'Electrical & Battery',
    'Suspension & Shock Absorbers',
    'Filters (Air / Oil / Fuel)',
    'Oils & Lubricants',
    'Body Parts & Mudguards',
    'Lighting & Indicators',
    'Exhaust & Silencer',
    'Handlebar & Controls',
    'Tires, Tubes & Wheels',
    'Chassis & Frame',
    'Accessories & Luggage',
  ];

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, lowStockOnly, selectedBrandFilter]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      let url = `/products?limit=100`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (lowStockOnly) url += `&lowStock=true`;

      const res = await apiRequest<{ data: any[] }>(url);
      let list = res.data || [];
      if (selectedBrandFilter) {
        list = list.filter((p: any) => p.brand?.toLowerCase() === selectedBrandFilter.toLowerCase());
      }
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setErrorMsg(null);

    try {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newProduct.name.trim(),
          partNumber: newProduct.partNumber.trim().toUpperCase(),
          brand: newProduct.brand.trim() || undefined,
          category: newProduct.category.trim() || undefined,
          mrp: parseFloat(newProduct.mrp) || 0,
          purchaseCost: parseFloat(newProduct.purchaseCost) || 0,
          sellingPrice: parseFloat(newProduct.sellingPrice) || 0,
          initialStock: parseInt(newProduct.initialStock, 10) || 0,
          minStock: parseInt(newProduct.minStock, 10) || 5,
          barcode: newProduct.barcode.trim() || undefined,
          vehicleCompatibility: newProduct.vehicleCompatibility.trim() || undefined,
        }),
      });

      setIsAddModalOpen(false);
      setNewProduct({
        name: '',
        partNumber: '',
        brand: 'Royal Enfield',
        category: 'Braking System',
        mrp: '',
        purchaseCost: '',
        sellingPrice: '',
        initialStock: '0',
        minStock: '5',
        barcode: '',
        vehicleCompatibility: '',
      });
      fetchProducts();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleBrandSelect = (brandName: string) => {
    const found = INDIAN_AUTOMOTIVE_BRANDS.find((b) => b.brand === brandName);
    setSelectedBrandObj(found || null);
    setNewProduct((prev) => ({
      ...prev,
      brand: brandName,
      vehicleCompatibility: found ? found.models.slice(0, 3).join(', ') : prev.vehicleCompatibility,
    }));
  };

  const handleToggleModelChip = (modelName: string) => {
    const current = newProduct.vehicleCompatibility
      ? newProduct.vehicleCompatibility.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    
    let updated: string[];
    if (current.includes(modelName)) {
      updated = current.filter((m) => m !== modelName);
    } else {
      updated = [...current, modelName];
    }
    setNewProduct({ ...newProduct, vehicleCompatibility: updated.join(', ') });
  };

  const handleOcrResultForNewProduct = (res: any) => {
    setNewProduct((prev) => ({
      ...prev,
      partNumber: res.partNumber || prev.partNumber,
      name: res.partName || prev.name,
      mrp: res.mrp ? res.mrp.toString() : prev.mrp,
      barcode: res.barcode || prev.barcode,
    }));
    setIsAddModalOpen(true);
  };

  const filteredBrands = INDIAN_AUTOMOTIVE_BRANDS.filter((b) => b.type === vehicleTypeTab);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Products Master Catalog</h1>
          <p className="text-xs text-slate-500 font-semibold">
            Comprehensive 2-Wheeler & 4-Wheeler OEM spare parts, vehicle compatibility & stock thresholds
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-slate-200 transition flex items-center space-x-2 shadow-sm"
          >
            <ScanBarcode className="w-4 h-4 text-amber-600" />
            <span>Scan with Camera / OCR</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Spare Part</span>
          </button>
        </div>
      </div>

      {/* Quick Brand Badges Scrollbar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setSelectedBrandFilter('')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
            selectedBrandFilter === ''
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Brands ({products.length})
        </button>
        {['Royal Enfield', 'Hero MotoCorp', 'Honda 2-Wheelers', 'Bajaj Auto', 'TVS Motor', 'Yamaha', 'Suzuki 2-Wheelers', 'KTM', 'Maruti Suzuki', 'Hyundai', 'Tata Motors', 'Mahindra', 'Toyota'].map((brand) => (
          <button
            key={brand}
            onClick={() => setSelectedBrandFilter(selectedBrandFilter === brand ? '' : brand)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
              selectedBrandFilter === brand
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {brand}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by part number (e.g. RAH00140/B), name, brand or vehicle model (Classic 350, Splendor, Pulsar, Swift)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 text-xs font-bold"
          />
        </div>

        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition border ${
            lowStockOnly
              ? 'bg-amber-100 border-amber-300 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Low Stock Only</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/70 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Part No / Description</th>
                <th className="p-4">Brand & Category</th>
                <th className="p-4">Vehicle Compatibility</th>
                <th className="p-4 text-right">Cost (₹)</th>
                <th className="p-4 text-right">Selling Price (₹)</th>
                <th className="p-4 text-center">Stock Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No spare parts found</p>
                    <p className="text-[11px] text-slate-500 mt-1">Try changing your search or add a new part.</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.currentStock <= p.minStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-xs text-amber-800 font-mono font-bold mt-0.5">
                          {p.partNumber}
                          {p.barcode && <span className="text-slate-500 ml-2 font-normal">Barcode: {p.barcode}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold text-[11px] border border-slate-200">
                          {p.brand || 'Universal'}
                        </span>
                        <div className="text-slate-500 text-[10px] mt-1 font-semibold">{p.category || 'General'}</div>
                      </td>
                      <td className="p-4 text-slate-600 max-w-xs truncate font-medium">
                        {p.vehicleCompatibility || '—'}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-600 font-medium">
                        ₹{p.purchaseCost.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-slate-900 text-sm">
                        ₹{p.sellingPrice.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-black text-xs ${
                            p.currentStock === 0
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : isLow
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <span>{p.currentStock} units</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal with Complete Indian 2W & 4W Vehicle Engine */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 uppercase">Add Spare Part to Master</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Select vehicle brand, model compatibility, pricing & stock</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4 overflow-y-auto flex-1 text-xs pr-1">
              {/* Part Identifier */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Part Number *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.partNumber}
                    onChange={(e) => setNewProduct({ ...newProduct, partNumber: e.target.value })}
                    placeholder="e.g. RAH00140/B"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 uppercase focus:outline-none focus:border-slate-900 font-mono font-bold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Part Name / Description *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. Front Disc Brake Pad Kit"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Vehicle Segment & Brand Selection Box */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    Automotive Segment & Brand
                  </span>
                  {/* Segment Pills */}
                  <div className="flex space-x-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setVehicleTypeTab('TWO_WHEELER')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        vehicleTypeTab === 'TWO_WHEELER'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🏍️ 2-Wheeler
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleTypeTab('FOUR_WHEELER')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        vehicleTypeTab === 'FOUR_WHEELER'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🚗 4-Wheeler
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleTypeTab('EV')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        vehicleTypeTab === 'EV'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⚡ EV
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleTypeTab('COMMERCIAL')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        vehicleTypeTab === 'COMMERCIAL'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🚚 Commercial
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Company / Brand *</label>
                    <select
                      value={newProduct.brand}
                      onChange={(e) => handleBrandSelect(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
                    >
                      {filteredBrands.map((b) => (
                        <option key={b.brand} value={b.brand}>
                          {b.brand}
                        </option>
                      ))}
                      <option value="Universal">Universal / Multi-brand</option>
                      <option value="Other">Other Custom Brand</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Spare Part Category *</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                    >
                      {SPARE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Popular Model Quick-Select Chips */}
                {selectedBrandObj && selectedBrandObj.models.length > 0 && (
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1.5">
                      ⚡ Tap Models to Add/Remove Compatibility ({selectedBrandObj.brand}):
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                      {selectedBrandObj.models.map((model) => {
                        const isSelected = newProduct.vehicleCompatibility.includes(model);
                        return (
                          <button
                            key={model}
                            type="button"
                            onClick={() => handleToggleModelChip(model)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '} {model}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vehicle Compatibility Text</label>
                  <input
                    type="text"
                    value={newProduct.vehicleCompatibility}
                    onChange={(e) => setNewProduct({ ...newProduct, vehicleCompatibility: e.target.value })}
                    placeholder="e.g. Classic 350, Hunter 350, Meteor 350, Bullet 350"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    value={newProduct.mrp}
                    onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })}
                    placeholder="550"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    value={newProduct.purchaseCost}
                    onChange={(e) => setNewProduct({ ...newProduct, purchaseCost: e.target.value })}
                    placeholder="380"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newProduct.sellingPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value })}
                    placeholder="520"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Inventory & Barcode */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Opening Stock</label>
                  <input
                    type="number"
                    value={newProduct.initialStock}
                    onChange={(e) => setNewProduct({ ...newProduct, initialStock: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Min Threshold Alert</label>
                  <input
                    type="number"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Barcode / QR</label>
                  <input
                    type="text"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    placeholder="8901234567890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-xl transition shadow-md text-xs"
                >
                  {savingProduct ? 'Saving Part...' : 'Save Spare Part to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera OCR Scanner Trigger */}
      <CameraScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onConfirm={handleOcrResultForNewProduct}
      />
    </div>
  );
};
