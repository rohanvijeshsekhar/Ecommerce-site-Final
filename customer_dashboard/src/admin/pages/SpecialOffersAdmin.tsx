import React, { useState, useEffect } from 'react';
import { 
  Percent, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Clock, 
  Tag, 
  Building2, 
  AlertCircle,
  Eye,
  Check,
  X
} from 'lucide-react';
import { useToast } from '../components/Toast';

export interface AdminOfferItem {
  id: string;
  title: string;
  badge: 'Limited Time' | 'Bundle Offer' | 'Exclusive' | 'Best Value' | 'Buy More Save More';
  category: 'Handpieces' | 'Equipment' | 'Imaging' | 'Materials' | 'Endodontics';
  brand: string;
  offerType: 'Limited Time' | 'Bundle Offer' | 'Exclusive' | 'Best Value' | 'Buy More Save More';
  description: string;
  originalPrice: number;
  discountedPrice: number;
  savingsText: string;
  validityText: string;
  image: string;
  isActive: boolean;
  isFeatured?: boolean;
}

const DEFAULT_OFFERS: AdminOfferItem[] = [
  {
    id: 'special-offer-1',
    title: 'Woodpecker LED.F Curing Light & Scaler Combo',
    badge: 'Bundle Offer',
    category: 'Equipment',
    brand: 'Woodpecker',
    offerType: 'Bundle Offer',
    description: 'High-intensity LED curing light paired with digital piezoelectric scaler for clinical operatory precision.',
    originalPrice: 18500,
    discountedPrice: 13800,
    savingsText: 'Save ₹4,700 (25% OFF)',
    validityText: 'Valid till end of month • 6 Units Left',
    image: '/images/combo_implants.png',
    isActive: true,
    isFeatured: true
  },
  {
    id: 'special-offer-2',
    title: 'NSK Pana-Max Plus High-Speed Handpiece (Pack of 3)',
    badge: 'Best Value',
    category: 'Handpieces',
    brand: 'NSK',
    offerType: 'Buy More Save More',
    description: 'Clean-head system with push-button chuck and micro-precision ceramic bearings for durability.',
    originalPrice: 24000,
    discountedPrice: 17900,
    savingsText: 'Save ₹6,100 (25% OFF)',
    validityText: 'Official NSK Warranty Included',
    image: '/images/handpiece_pro.png',
    isActive: true
  },
  {
    id: 'special-offer-3',
    title: '3M Filtek Z250 Universal Restorative Kit',
    badge: 'Exclusive',
    category: 'Materials',
    brand: '3M',
    offerType: 'Exclusive',
    description: 'Microhybrid composite resin syringes with Scotchbond universal adhesive primer kit.',
    originalPrice: 12800,
    discountedPrice: 9950,
    savingsText: 'Save ₹2,850 (22% OFF)',
    validityText: 'Certified 3M India Direct Stock',
    image: '/images/category_materials.png',
    isActive: true
  },
  {
    id: 'special-offer-4',
    title: 'Carestream CS 2200 Intraoral X-Ray Generator System',
    badge: 'Limited Time',
    category: 'Imaging',
    brand: 'Carestream',
    offerType: 'Limited Time',
    description: 'High-frequency 70kV generator with focal spot 0.4mm for ultra-sharp digital radiograph diagnostics.',
    originalPrice: 165000,
    discountedPrice: 138000,
    savingsText: 'Save ₹27,000 (16% OFF)',
    validityText: 'Includes Free On-Site Installation',
    image: '/images/category_imaging.png',
    isActive: true
  },
  {
    id: 'special-offer-5',
    title: 'Dentsply Sirona WaveOne Gold Endodontic Kit',
    badge: 'Bundle Offer',
    category: 'Endodontics',
    brand: 'Dentsply Sirona',
    offerType: 'Bundle Offer',
    description: 'Reciprocating NiTi files + paper points + obturator core package for root canal procedures.',
    originalPrice: 15400,
    discountedPrice: 11900,
    savingsText: 'Save ₹3,500 (23% OFF)',
    validityText: 'Limited Clinical Allocation',
    image: '/images/combo_restorative.png',
    isActive: true
  },
  {
    id: 'special-offer-6',
    title: 'Planmeca Emerald S Intraoral Scanner Package',
    badge: 'Exclusive',
    category: 'Imaging',
    brand: 'Planmeca',
    offerType: 'Exclusive',
    description: 'Ultra-fast 3D digital impression scanning system with laptop workstation and Romexis software.',
    originalPrice: 1450000,
    discountedPrice: 1290000,
    savingsText: 'Save ₹1,60,000 (11% OFF)',
    validityText: 'Includes 2-Year Comprehensive Warranty',
    image: '/images/hero_chair.png',
    isActive: true
  }
];

const SpecialOffersAdmin: React.FC = () => {
  const toast = useToast();
  const [offers, setOffers] = useState<AdminOfferItem[]>(() => {
    const saved = localStorage.getItem('faazo_admin_special_offers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_OFFERS;
  });

  useEffect(() => {
    localStorage.setItem('faazo_admin_special_offers', JSON.stringify(offers));
  }, [offers]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBadge, setFilterBadge] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AdminOfferItem | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'Handpieces' | 'Equipment' | 'Imaging' | 'Materials' | 'Endodontics'>('Handpieces');
  const [formBrand, setFormBrand] = useState('3M');
  const [formBadge, setFormBadge] = useState<'Limited Time' | 'Bundle Offer' | 'Exclusive' | 'Best Value' | 'Buy More Save More'>('Limited Time');
  const [formDescription, setFormDescription] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState<number>(10000);
  const [formDiscountedPrice, setFormDiscountedPrice] = useState<number>(8000);
  const [formValidityText, setFormValidityText] = useState('Valid while stock lasts');
  const [formImage, setFormImage] = useState('/images/handpiece_pro.png');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  const openCreateModal = () => {
    setEditingOffer(null);
    setFormTitle('');
    setFormCategory('Handpieces');
    setFormBrand('3M');
    setFormBadge('Limited Time');
    setFormDescription('');
    setFormOriginalPrice(10000);
    setFormDiscountedPrice(8000);
    setFormValidityText('Valid while stock lasts • Limited Units');
    setFormImage('/images/handpiece_pro.png');
    setFormIsActive(true);
    setFormIsFeatured(false);
    setIsModalOpen(true);
  };

  const openEditModal = (offer: AdminOfferItem) => {
    setEditingOffer(offer);
    setFormTitle(offer.title);
    setFormCategory(offer.category);
    setFormBrand(offer.brand);
    setFormBadge(offer.badge);
    setFormDescription(offer.description);
    setFormOriginalPrice(offer.originalPrice);
    setFormDiscountedPrice(offer.discountedPrice);
    setFormValidityText(offer.validityText);
    setFormImage(offer.image);
    setFormIsActive(offer.isActive);
    setFormIsFeatured(offer.isFeatured || false);
    setIsModalOpen(true);
  };

  const handleSaveOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.addToast('Please enter an offer title.', 'danger');
      return;
    }

    const savingsAmount = Math.max(0, formOriginalPrice - formDiscountedPrice);
    const savingsPct = formOriginalPrice > 0 ? Math.round((savingsAmount / formOriginalPrice) * 100) : 0;
    const savingsText = `Save ₹${savingsAmount.toLocaleString('en-IN')} (${savingsPct}% OFF)`;

    if (editingOffer) {
      setOffers(prev => prev.map(o => o.id === editingOffer.id ? {
        ...o,
        title: formTitle,
        category: formCategory,
        brand: formBrand,
        badge: formBadge,
        offerType: formBadge,
        description: formDescription,
        originalPrice: formOriginalPrice,
        discountedPrice: formDiscountedPrice,
        savingsText,
        validityText: formValidityText,
        image: formImage,
        isActive: formIsActive,
        isFeatured: formIsFeatured
      } : o));
      toast.addToast(`Updated offer "${formTitle}" successfully!`, 'success');
    } else {
      const newOffer: AdminOfferItem = {
        id: `special-offer-${Date.now()}`,
        title: formTitle,
        category: formCategory,
        brand: formBrand,
        badge: formBadge,
        offerType: formBadge,
        description: formDescription,
        originalPrice: formOriginalPrice,
        discountedPrice: formDiscountedPrice,
        savingsText,
        validityText: formValidityText,
        image: formImage,
        isActive: formIsActive,
        isFeatured: formIsFeatured
      };
      setOffers(prev => [newOffer, ...prev]);
      toast.addToast(`Created new limited offer "${formTitle}"!`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o));
    toast.addToast('Updated offer status', 'info');
  };

  const handleDeleteOffer = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete offer "${title}"?`)) {
      setOffers(prev => prev.filter(o => o.id !== id));
      toast.addToast(`Deleted offer "${title}"`, 'warning');
    }
  };

  // Filtered List
  const filteredOffers = offers.filter(o => {
    if (searchQuery && !o.title.toLowerCase().includes(searchQuery.toLowerCase()) && !o.brand.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterBadge !== 'All' && o.badge !== filterBadge) return false;
    if (filterCategory !== 'All' && o.category !== filterCategory) return false;
    return true;
  });

  const activeCount = offers.filter(o => o.isActive).length;
  const featuredCount = offers.filter(o => o.isFeatured).length;

  return (
    <div className="space-y-6 text-left select-none pb-12 font-sans">
      
      {/* ── HEADER BAR ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[#006670] font-black text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Catalogue CMS Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Limited & Special Offers
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure promotional deals, bundle discounts, and limited-time offers rendered on the Special Offers page.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Offer</span>
        </button>
      </div>

      {/* ── METRIC STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Offers</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{offers.length}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#006670]/10 text-[#006670] flex items-center justify-center">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Promotions</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{activeCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Featured Showcase</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{featuredCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search offer title, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006670]"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={filterBadge}
              onChange={(e) => setFilterBadge(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
            >
              <option value="All">All Badges</option>
              <option value="Limited Time">Limited Time</option>
              <option value="Bundle Offer">Bundle Offer</option>
              <option value="Exclusive">Exclusive</option>
              <option value="Best Value">Best Value</option>
              <option value="Buy More Save More">Buy More Save More</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Handpieces">Handpieces</option>
              <option value="Equipment">Equipment</option>
              <option value="Imaging">Imaging</option>
              <option value="Materials">Materials</option>
              <option value="Endodontics">Endodontics</option>
            </select>
          </div>

        </div>
      </div>

      {/* ── OFFERS MANAGEMENT TABLE ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-4">Offer Details</th>
                <th className="px-5 py-4">Badge / Type</th>
                <th className="px-5 py-4">Category & Brand</th>
                <th className="px-5 py-4">Pricing & Savings</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOffers.length > 0 ? (
                filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Title & Image */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5 min-w-[240px]">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                          <img src={offer.image} alt={offer.title} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4 className="font-bold text-slate-800 text-xs line-clamp-1">{offer.title}</h4>
                            {offer.isFeatured && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 font-medium">{offer.validityText}</p>
                        </div>
                      </div>
                    </td>

                    {/* Badge */}
                    <td className="px-5 py-4 shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-[#006670]/10 text-[#006670] text-[10.5px] font-extrabold uppercase tracking-wider">
                        {offer.badge}
                      </span>
                    </td>

                    {/* Category & Brand */}
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-700 block">{offer.brand}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{offer.category}</span>
                    </td>

                    {/* Pricing */}
                    <td className="px-5 py-4">
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-slate-900 text-sm">₹{offer.discountedPrice.toLocaleString('en-IN')}</span>
                        <span className="text-slate-400 line-through text-[11px]">₹{offer.originalPrice.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 block">{offer.savingsText}</span>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleActive(offer.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                          offer.isActive 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {offer.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{offer.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(offer)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-[#006670] text-slate-600 hover:text-white transition-colors cursor-pointer"
                          title="Edit Offer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(offer.id, offer.title)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-rose-600 text-slate-600 hover:text-white transition-colors cursor-pointer"
                          title="Delete Offer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No limited offers match your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT OFFER MODAL ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#006670] font-black text-sm">
                <Percent className="w-4 h-4" />
                <span>{editingOffer ? 'Edit Special Offer' : 'Add New Limited Offer'}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOffer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Offer Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Woodpecker LED Curing Light & Scaler Combo"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#006670]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
                  >
                    <option value="Handpieces">Handpieces</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Imaging">Imaging Systems</option>
                    <option value="Materials">Materials</option>
                    <option value="Endodontics">Endodontics</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3M, NSK, Woodpecker"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#006670]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Offer Badge *
                  </label>
                  <select
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
                  >
                    <option value="Limited Time">Limited Time</option>
                    <option value="Bundle Offer">Bundle Offer</option>
                    <option value="Exclusive">Exclusive</option>
                    <option value="Best Value">Best Value</option>
                    <option value="Buy More Save More">Buy More Save More</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Short Clinical Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe clinical features or bundle inclusions..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#006670]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Original Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Special Discounted Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formDiscountedPrice}
                    onChange={(e) => setFormDiscountedPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#006670] focus:outline-none focus:border-[#006670]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Validity & Stock Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Valid till end of month • 6 Units Left"
                  value={formValidityText}
                  onChange={(e) => setFormValidityText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#006670]"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Product Image URL
                </label>
                <input
                  type="text"
                  placeholder="/images/handpiece_pro.png"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#006670]"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#006670] focus:ring-[#006670]"
                  />
                  <span className="text-xs font-bold text-slate-700">Active Offer</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-[#006670] focus:ring-[#006670]"
                  />
                  <span className="text-xs font-bold text-amber-700">Set as Featured Promotion</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-extrabold uppercase hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                >
                  {editingOffer ? 'Save Changes' : 'Create Offer'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SpecialOffersAdmin;
