'use client';

import React, { useState } from 'react';
import { Search, Heart, FileText, Compass, CreditCard, Package, Check, RefreshCw, Star, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ordersService } from '../../lib/services/ordersService';
import { useStore } from '../../contexts/StoreContext';

interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
  rating?: number;
}

interface Order {
  id: string;
  date: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  items: MockCartItem[];
  paymentMethod: string;
  total: number;
}

interface MyOrdersPageProps {
  orders: Order[];
  setCartItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  wishlistItems: MockCartItem[];
  setCurrentView: (view: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders') => void;
  activeTrackingOrderId: string | null;
  onProductClick: (id: string) => void;
  showToast?: (message: string) => void;
}

const MyOrdersPage: React.FC<MyOrdersPageProps> = ({
  orders,
  setCartItems,
  wishlistItems,
  setCurrentView,
  activeTrackingOrderId,
  onProductClick,
  showToast,
}) => {
  const { user, profile, logout } = useAuth();

  // Display name: prefer profile clinic context, fall back to user full_name
  const displayName = user?.full_name || 'Doctor';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() || '')
    .join('');

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'delivered' | 'cancelled' | 'returned'>('all');
  
  // Track which orders have their timelines expanded
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (activeTrackingOrderId) {
      initial[activeTrackingOrderId] = true;
    }
    return initial;
  });



  // --- HANDLERS ---
  const toggleTimeline = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleReorder = (order: Order) => {
    // Add all items in the order back to the cart
    setCartItems(prev => {
      let updated = [...prev];
      order.items.forEach(newItem => {
        const existIdx = updated.findIndex(c => c.id === newItem.id);
        if (existIdx > -1) {
          updated[existIdx].qty += newItem.qty;
        } else {
          updated.push({ ...newItem });
        }
      });
      return updated;
    });
    if (showToast) showToast('Items added to Cart');
    else alert('Items from this order have been added to your cart!');
    setCurrentView('cart');
    window.scrollTo(0, 0);
  };

  // --- FILTER & SEARCH ---
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Portal statistics
  const totalCount = orders.length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const warrantyCount = orders.filter(o => o.status === 'delivered' && o.items.some(i => i.category === 'Clinical Equipment')).length;

  return (
    <div className="w-full bg-[#f4f7f7] min-h-screen pt-[104px] lg:pt-[180px] pb-16 font-sans select-none text-left animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto px-4 md:px-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 25% Left Column: Sidebar menu */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* User Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] font-bold text-sm">
                {initials || <UserIcon />}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans font-bold leading-none block">Hello,</span>
                <span className="text-xs font-black text-slate-800 tracking-wide mt-0.5 block">{displayName}</span>
                {profile?.clinic_name && (
                  <span className="text-[10px] text-slate-400 font-sans block mt-0.5 truncate max-w-[140px]">{profile.clinic_name}</span>
                )}
              </div>
            </div>

            {/* Navigation Options Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="divide-y divide-slate-100/70 text-xs font-bold text-slate-600">
                
                {/* Active Orders Group */}
                <div className="px-4 py-3 bg-[#e6f3f5]/45 text-[#006670] border-l-4 border-[#006670] flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-3 uppercase tracking-wide">
                    <Package className="w-4 h-4 text-[#006670]" />
                    My Orders
                  </span>
                  <Check className="w-3.5 h-3.5" />
                </div>

                {/* Account Settings */}
                <div className="p-4">
                  <span className="flex items-center gap-3 uppercase text-slate-400 tracking-widest text-[9.5px] mb-3">
                    <UserIcon className="w-4 h-4 text-[#006670]" />
                    Account settings
                  </span>
                  <ul className="pl-7 space-y-3 font-sans text-xs text-slate-600 font-medium">
                    <li className="hover:text-[#006670] cursor-pointer">Profile Information</li>
                    <li className="hover:text-[#006670] cursor-pointer" onClick={() => alert('Manage saved delivery locations.')}>Clinic Address Locations</li>
                    <li className="hover:text-[#006670] cursor-pointer">GST Registrations</li>
                  </ul>
                </div>

                {/* Payments */}
                <div className="p-4">
                  <span className="flex items-center gap-3 uppercase text-slate-400 tracking-widest text-[9.5px] mb-3">
                    <CreditCard className="w-4 h-4 text-[#006670]" />
                    Payments & Financing
                  </span>
                  <ul className="pl-7 space-y-3 font-sans text-xs text-slate-600 font-medium">
                    <li className="hover:text-[#006670] cursor-pointer">FAAZO Capital Credit Line</li>
                    <li className="hover:text-[#006670] cursor-pointer">Saved Cards & Accounts</li>
                  </ul>
                </div>

                {/* My Stuff group */}
                <div className="p-0">
                  <div className="p-4 pb-2">
                    <span className="flex items-center gap-3 uppercase text-slate-400 tracking-widest text-[9.5px] mb-2.5">
                      <Compass className="w-4 h-4 text-[#006670]" />
                      My stuff
                    </span>
                  </div>
                  <ul className="space-y-0.5 pb-2 font-medium">
                    <li 
                      onClick={() => setCurrentView('wishlist')}
                      className="px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer text-slate-600 hover:text-[#006670]"
                    >
                      <span className="pl-7">Wishlist ({wishlistItems.length})</span>
                      <Heart className="w-3.5 h-3.5 text-slate-400" />
                    </li>
                    <li className="px-11 py-2 text-slate-600 hover:text-[#006670] cursor-pointer font-sans text-xs font-medium">Coupons & Rewards</li>
                    <li className="px-11 py-2 text-slate-600 hover:text-[#006670] cursor-pointer font-sans text-xs font-medium">Warranty Registrations</li>
                  </ul>
                </div>

                {/* Log Out */}
                <div className="p-4 flex items-center gap-3 hover:bg-rose-50 hover:text-rose-500 cursor-pointer text-slate-700" onClick={() => { logout(); setCurrentView('home'); }}>
                  <PowerIcon className="w-4 h-4 text-rose-500" />
                  <span>Log Out</span>
                </div>

              </div>
            </div>

          </div>

          {/* 75% Right Column: Main Content Portal */}
          <div className="lg:col-span-9 space-y-5">
            
            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Total Orders</span>
                <span className="text-xl font-black text-slate-800 font-display mt-2">{totalCount}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Delivered</span>
                <span className="text-xl font-black text-emerald-600 font-display mt-2">{deliveredCount}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Processing</span>
                <span className="text-xl font-black text-amber-500 font-display mt-2">{processingCount}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Active Warranties</span>
                <span className="text-xl font-black text-[#006670] font-display mt-2">{warrantyCount} Devices</span>
              </div>

            </div>

            {/* Filter and Search Bar Card */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                
                {/* Search orders */}
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search past orders by ID or equipment name..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006670] bg-white"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Mobile Collapsible Status Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5">
                  {(['all', 'processing', 'delivered', 'cancelled', 'returned'] as const).map((status) => {
                    const isSel = statusFilter === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border cursor-pointer transition-colors whitespace-nowrap
                          ${isSel 
                            ? 'bg-[#006670] border-[#006670] text-white' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Orders Cards Listing */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white py-16 px-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                    <Package className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">No Orders Found</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1 font-sans">
                    We couldn't find any orders matching your criteria. Try adjusting filters or search query.
                  </p>
                  <button
                    onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
                    className="mt-6 px-5 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isExpanded = !!expandedOrders[order.id];
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
                      
                      {/* Card Header Info */}
                      <div className="bg-slate-50/75 px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-left">
                        <div className="flex gap-5 flex-wrap">
                          <div>
                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Date Purchased</span>
                            <span className="text-[11.5px] font-bold text-slate-700 block mt-0.5">{order.date}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Total procurement Cost</span>
                            <span className="text-[11.5px] font-black text-[#006670] block mt-0.5">₹{order.total.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Order ID</span>
                            <span className="text-[11.5px] font-bold text-slate-700 block mt-0.5">{order.id}</span>
                          </div>
                        </div>

                        <div>
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border block w-fit
                            ${order.status === 'delivered' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                              order.status === 'processing' ? 'bg-amber-50 border-amber-100 text-amber-500' :
                              'bg-slate-100 border-slate-200 text-slate-500'}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>

                      {/* Card Items & Details */}
                      <div className="divide-y divide-slate-100">
                        {order.items.map((item) => (
                          <div key={item.id} className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between text-left">
                            
                            <div className="flex gap-4 items-center">
                              <div className="w-16 h-16 bg-slate-50 p-1 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-1 hover:text-[#006670] cursor-pointer" onClick={() => onProductClick(item.id)}>{item.name}</h4>
                                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Category: {item.category}</p>
                                <p className="text-[10.5px] text-slate-600 font-sans mt-0.5">Quantity: {item.qty}</p>
                              </div>
                            </div>

                            {/* Actions Group for each card */}
                            <div className="flex flex-wrap gap-2.5 border-t border-slate-50 pt-3 md:border-none md:pt-0 w-full md:w-auto shrink-0 justify-end">
                              <button
                                onClick={() => toggleTimeline(order.id)}
                                className="px-4 py-2 border border-slate-200 hover:border-[#006670] bg-white rounded-lg text-[10.5px] font-extrabold text-slate-700 hover:text-[#006670] uppercase tracking-wide cursor-pointer transition-colors"
                              >
                                {isExpanded ? 'Hide Status' : 'Track Order'}
                              </button>
                              <button
                                onClick={() => handleReorder(order)}
                                className="px-4 py-2 bg-[#006670] hover:bg-[#004e56] text-white rounded-lg text-[10.5px] font-extrabold uppercase tracking-wide cursor-pointer transition-colors flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Reorder
                              </button>
                              <button
                                onClick={() => ordersService.downloadInvoice(order.id, (order as any).invoice_number, showToast)}
                                className="px-3.5 py-2 border border-slate-200 hover:border-[#006670] bg-white rounded-lg text-[10.5px] font-extrabold text-slate-700 hover:text-[#006670] uppercase tracking-wide cursor-pointer transition-colors flex items-center gap-1.5"
                                title="Download GST Tax Invoice PDF"
                              >
                                <Download className="w-3.5 h-3.5 text-[#006670]" />
                                Download Invoice
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>

                      {/* Expandable Order Tracking Timeline */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 p-5 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-4">Logistics Timeline</span>
                          
                          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 max-w-2xl mx-auto py-2">
                            {/* Horizontal Line on Desktop */}
                            <div className="hidden md:block absolute left-4 right-4 h-0.5 bg-slate-200 top-1/2 -translate-y-1/2 z-0" />
                            
                            {/* Steps array */}
                            {getSteps(order.status).map((step, sIdx) => (
                              <div key={sIdx} className="flex md:flex-col items-center gap-3 md:gap-2.5 relative z-10 text-left md:text-center flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-black text-xs transition-colors
                                  ${step.active 
                                    ? 'bg-[#006670] border-[#006670] text-white shadow-sm shadow-[#006670]/25' 
                                    : 'bg-white border-slate-200 text-slate-400'}`}>
                                  {step.active ? <Check className="w-4 h-4 stroke-[3]" /> : sIdx + 1}
                                </div>
                                <div className="space-y-0.5">
                                  <span className={`text-[10.5px] font-black uppercase tracking-wide block
                                    ${step.active ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {step.label}
                                  </span>
                                  <span className="text-[9.5px] text-slate-400 font-sans block">{step.desc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

            {/* Accessory Recommendations Grid */}
            <div className="border-t border-slate-200/50 pt-8">
              <span className="text-[10px] font-black tracking-widest text-[#006670] uppercase text-center block mb-1">Recommended Consumables</span>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight mt-1 mb-6 text-center">
                Frequently purchased spare accessories
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {accessories.map((acc) => (
                  <div 
                    key={acc.id}
                    onClick={() => alert(`Browse details of ${acc.name}`)}
                    className="bg-white p-3.5 rounded-xl border border-slate-200/70 text-left flex flex-col justify-between hover:shadow-sm transition-shadow cursor-pointer group"
                  >
                    <div className="w-full h-20 bg-slate-50 border border-slate-100 rounded-lg p-1.5 flex items-center justify-center">
                      <img src={acc.image} alt={acc.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="mt-3 space-y-1">
                      <h4 className="text-[10.5px] font-bold text-slate-800 line-clamp-1 group-hover:text-[#006670]">{acc.name}</h4>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-2.5 h-2.5 fill-amber-500 stroke-none" />
                        <span className="text-[9px] font-bold text-slate-600 mt-0.5">{acc.rating}</span>
                      </div>
                      <span className="text-xs font-black text-[#006670] font-display block pt-0.5">₹{acc.price.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

// Helper function to build status timeline steps
const getSteps = (status: Order['status']) => {
  const stepsList = [
    { label: 'Placed', desc: 'Secure order logged', key: 'placed' },
    { label: 'Processing', desc: 'Component calibrations', key: 'processing' },
    { label: 'Shipped', desc: 'Medical transit package', key: 'shipped' },
    { label: 'Delivered', desc: 'Installation finalized', key: 'delivered' },
  ];
  
  // Status check levels
  const statusLevels: Record<Order['status'], number> = {
    processing: 1, // Placed + Processing active
    shipped: 2,    // Placed + Processing + Shipped active
    delivered: 3,  // Placed + Processing + Shipped + Delivered active
    cancelled: 0,  // Placed active
    returned: 0,
  };

  const currentLevel = statusLevels[status];
  return stepsList.map((step, idx) => ({
    ...step,
    active: idx <= currentLevel
  }));
};

const accessories = [
  {
    id: 'acc-1',
    name: 'NSK Lubricating Spray Oil',
    price: 1299,
    rating: 4.8,
    image: '/images/bestseller_handpiece.png',
  },
  {
    id: 'acc-2',
    name: 'Scaling Tips Torque Wrench Key',
    price: 699,
    rating: 4.9,
    image: '/images/bestseller_scaler.png',
  },
  {
    id: 'acc-3',
    name: 'Light Cure Shield Protective Filter',
    price: 499,
    rating: 4.7,
    image: '/images/bestseller_curing.png',
  },
  {
    id: 'acc-4',
    name: 'Composites Cavity Finishing Burrs Set',
    price: 1599,
    rating: 4.8,
    image: '/images/bestseller_materials.png',
  }
];

// Helper icons
const UserIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const PowerIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export default MyOrdersPage;
