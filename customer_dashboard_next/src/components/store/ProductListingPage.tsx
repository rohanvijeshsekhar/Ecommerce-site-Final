'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Filter,
  ChevronDown,
  Star,
  ArrowLeft,
  X,
  SlidersHorizontal,
  HelpCircle,
  Heart
} from 'lucide-react';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import { useCategories } from '../../hooks/useCategories';
import { api, getAbsoluteImageUrl } from '../../lib/api';

interface ListingProduct {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  subCategory?: string;
  subItem?: string;
  collection: 'manufactured' | 'imported';
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  brand: string;
  inStock: boolean;
  isBestSeller?: boolean;
  isNewLaunch?: boolean;
  pricing?: any;
  inventory?: any;
}

export function resolveCategory(name: string, categoriesList: any[]): {
  mainCategory?: string;
  subCategoryName?: string;
  subItemName?: string;
  brandName?: string;
} {
  const nameLower = name.toLowerCase();

  // Check if it is a brand name
  const brands = ["3m", "3m espe", "nsk", "woodpecker", "planmeca", "dentsply sirona", "werther", "faazo", "ivoclar", "coltene", "ems"];
  const matchedBrand = brands.find(b => b === nameLower);
  if (matchedBrand) {
    const brandCasingMap: Record<string, string> = {
      "3m": "3M ESPE",
      "3m espe": "3M ESPE",
      "nsk": "NSK",
      "woodpecker": "Woodpecker",
      "planmeca": "Planmeca",
      "dentsply sirona": "Dentsply Sirona",
      "werther": "Werther",
      "faazo": "FAAZO",
      "ivoclar": "Ivoclar",
      "coltene": "Coltene",
      "ems": "EMS"
    };
    return { brandName: brandCasingMap[matchedBrand] };
  }

  // Exact check for main categories
  const mainCategories = [
    "Dental Handpieces",
    "Intraoral Cameras",
    "LED Light Cure Units",
    "Dental Chairs",
    "3D Oral Scanners",
    "Dental Air Compressors",
    "Advanced Dental Equipment & Accessories"
  ];
  
  const exactMain = mainCategories.find(mc => mc.toLowerCase() === nameLower);
  if (exactMain) {
    return { mainCategory: exactMain };
  }

  // Search in CATEGORIES list
  for (const cat of categoriesList) {
    if (cat.label.toLowerCase() === nameLower) {
      return { mainCategory: cat.label };
    }
    for (const sub of cat.subCategories) {
      if (sub.name.toLowerCase() === nameLower) {
        return { mainCategory: cat.label, subCategoryName: sub.name };
      }
      for (const item of sub.subItems) {
        if (item.name.toLowerCase() === nameLower) {
          return { mainCategory: cat.label, subCategoryName: sub.name, subItemName: item.name };
        }
      }
    }
  }

  // Fallbacks using keyword heuristics
  let mainCategory = "Advanced Dental Equipment & Accessories";
  if (nameLower.includes("handpiece") || nameLower === "handpieces" || nameLower.includes("turbine") || nameLower.includes("motor") || nameLower.includes("contra-angle")) {
    mainCategory = "Dental Handpieces";
  } else if (nameLower.includes("camera") || nameLower.includes("intraoral camera")) {
    mainCategory = "Intraoral Cameras";
  } else if (nameLower.includes("curing") || nameLower.includes("cure") || nameLower.includes("composite") || nameLower.includes("glass ionomer") || nameLower.includes("bonding") || nameLower.includes("etching") || nameLower.includes("light")) {
    mainCategory = "LED Light Cure Units";
  } else if (nameLower.includes("chair") || nameLower.includes("stool") || nameLower.includes("seating")) {
    mainCategory = "Dental Chairs";
  } else if (nameLower.includes("compressor") || nameLower.includes("suction") || nameLower.includes("vacuum") || nameLower.includes("pump")) {
    mainCategory = "Dental Air Compressors";
  } else if (nameLower.includes("imaging") || nameLower.includes("x-ray") || nameLower.includes("sensor") || nameLower.includes("cbct") || nameLower.includes("opg") || nameLower.includes("scanner")) {
    mainCategory = "3D Oral Scanners";
  }

  return { mainCategory };
}

export const allProducts: ListingProduct[] = [
  // Dental Handpieces
  {
    id: 'nsk-handpiece',
    title: 'NSK Pana-Max High Speed Handpiece',
    subtitle: 'Advanced air turbine handpiece with ceramic bearings.',
    category: 'Dental Handpieces',
    subCategory: 'High-Speed Handpieces',
    subItem: 'Air Turbines',
    collection: 'manufactured',
    price: 18999,
    originalPrice: 22499,
    rating: 4.8,
    reviews: 128,
    image: '/images/nsk_handpiece_portrait.png',
    brand: 'NSK',
    inStock: true,
    isBestSeller: true
  },
  {
    id: 'faazo-airpro-h1',
    title: 'FAAZO AirPro H1',
    subtitle: 'Standard clinical handpiece engineered for dental networks.',
    category: 'Dental Handpieces',
    subCategory: 'High-Speed Handpieces',
    subItem: 'Air Turbines',
    collection: 'manufactured',
    price: 12499,
    originalPrice: 14999,
    rating: 4.6,
    reviews: 42,
    image: '/images/nsk_handpiece_portrait.png',
    brand: 'FAAZO',
    inStock: true,
    isNewLaunch: true
  },
  {
    id: 'faazo-titan-t9',
    title: 'FAAZO Titan T9 Surgical Handpiece',
    subtitle: 'High-torque micro-motor handpiece for guided implants.',
    category: 'Dental Handpieces',
    subCategory: 'Low-Speed Handpieces',
    subItem: 'Contra-Angles',
    collection: 'manufactured',
    price: 24999,
    originalPrice: 28999,
    rating: 4.9,
    reviews: 31,
    image: '/images/nsk_handpiece_portrait.png',
    brand: 'FAAZO',
    inStock: true,
    isBestSeller: true
  },

  // Intraoral Cameras
  {
    id: 'faazo-view-hd',
    title: 'FAAZO View-HD Diagnostic Camera',
    subtitle: 'High-definition intraoral camera with autofocus LED array.',
    category: 'Intraoral Cameras',
    subCategory: 'HD Diagnostic Cameras',
    subItem: 'Auto-focus Intraoral Cameras',
    collection: 'manufactured',
    price: 14500,
    originalPrice: 17500,
    rating: 4.7,
    reviews: 28,
    image: '/images/faazo_camera_portrait.png',
    brand: 'FAAZO',
    inStock: true
  },
  {
    id: 'faazo-view-wireless',
    title: 'FAAZO View-Wireless Smart Cam',
    subtitle: 'IoT-enabled wireless intraoral imaging camera with docking base.',
    category: 'Intraoral Cameras',
    subCategory: 'HD Diagnostic Cameras',
    subItem: 'Wireless Wi-Fi Cameras',
    collection: 'manufactured',
    price: 28999,
    originalPrice: 32000,
    rating: 4.8,
    reviews: 19,
    image: '/images/faazo_camera_portrait.png',
    brand: 'FAAZO',
    inStock: true,
    isNewLaunch: true
  },
  {
    id: 'nsk-infra-cam',
    title: 'NSK Sopro Care Diagnostic Camera',
    subtitle: 'Intraoral camera with caries fluorescence diagnostics and plaque detection.',
    category: 'Intraoral Cameras',
    subCategory: 'HD Diagnostic Cameras',
    subItem: 'Auto-focus Intraoral Cameras',
    collection: 'imported',
    price: 68000,
    originalPrice: 75000,
    rating: 4.9,
    reviews: 14,
    image: '/images/faazo_camera_portrait.png',
    brand: 'NSK',
    inStock: true
  },

  // LED Light Cure Units
  {
    id: 'woodpecker-curing',
    title: 'Woodpecker LED Curing Light',
    subtitle: 'Broadband polymerization curing unit for composites.',
    category: 'LED Light Cure Units',
    subCategory: 'Cordless Curing Units',
    subItem: 'Broadband LED Lights',
    collection: 'manufactured',
    price: 8999,
    originalPrice: 10499,
    rating: 4.7,
    reviews: 96,
    image: '/images/woodpecker_curing_portrait.png',
    brand: 'Woodpecker',
    inStock: true,
    isBestSeller: true
  },
  {
    id: 'faazo-neocure-c2',
    title: 'FAAZO NeoCure C2',
    subtitle: 'High-intensity dual-wavelength LED curing system.',
    category: 'LED Light Cure Units',
    subCategory: 'Cordless Curing Units',
    subItem: 'Dual-wavelength Systems',
    collection: 'manufactured',
    price: 7499,
    originalPrice: 8999,
    rating: 4.5,
    reviews: 37,
    image: '/images/woodpecker_curing_portrait.png',
    brand: 'FAAZO',
    inStock: true
  },
  {
    id: 'faazo-orthocure-x1',
    title: 'FAAZO OrthoCure X1 Fast-Cure',
    subtitle: 'High-power orthodontic curing light with 3-second rapid cure mode.',
    category: 'LED Light Cure Units',
    subCategory: 'Specialized Curing',
    subItem: 'Orthodontic Fast-Cure',
    collection: 'manufactured',
    price: 15999,
    originalPrice: 18500,
    rating: 4.8,
    reviews: 11,
    image: '/images/woodpecker_curing_portrait.png',
    brand: 'FAAZO',
    inStock: true,
    isBestSeller: true
  },

  // Dental Chairs
  {
    id: 'planmeca-sovereign-chair',
    title: 'Planmeca Sovereign Classic',
    subtitle: 'Premium imported treatment suite with motorized controls.',
    category: 'Dental Chairs',
    subCategory: 'Premium Treatment Suites',
    subItem: 'Luxury Memory Foam Chairs',
    collection: 'imported',
    price: 480000,
    originalPrice: 550000,
    rating: 4.9,
    reviews: 15,
    image: '/images/planmeca_chair_portrait.png',
    brand: 'Planmeca',
    inStock: true,
    isBestSeller: true
  },
  {
    id: 'sirona-intego-chair',
    title: 'Dentsply Sirona Intego Suite',
    subtitle: 'Luxury treatment center with absolute ergonomics and armrests.',
    category: 'Dental Chairs',
    subCategory: 'Premium Treatment Suites',
    subItem: 'Smart Assistant Suites',
    collection: 'imported',
    price: 650000,
    originalPrice: 720000,
    rating: 5.0,
    reviews: 8,
    image: '/images/planmeca_chair_portrait.png',
    brand: 'Dentsply Sirona',
    inStock: true,
    isNewLaunch: true
  },
  {
    id: 'faazo-comfort-chair',
    title: 'FAAZO Comfort C1 Chair Unit',
    subtitle: 'Smart assistant electromechanical chair with seamless clinical upholstery.',
    category: 'Dental Chairs',
    subCategory: 'Standard Chair Systems',
    subItem: 'Electromechanical Chairs',
    collection: 'manufactured',
    price: 185000,
    originalPrice: 210000,
    rating: 4.7,
    reviews: 24,
    image: '/images/planmeca_chair_portrait.png',
    brand: 'FAAZO',
    inStock: true
  },

  // 3D Oral Scanners
  {
    id: 'planmeca-emerald-scanner',
    title: 'Planmeca Emerald S Scanner',
    subtitle: 'High-speed intraoral 3D scanner for digital exports.',
    category: '3D Oral Scanners',
    subCategory: 'Intraoral Digital Scanners',
    subItem: 'High-speed 3D Scanners',
    collection: 'imported',
    price: 980000,
    originalPrice: 1100000,
    rating: 4.9,
    reviews: 22,
    image: '/images/category_imaging.png',
    brand: 'Planmeca',
    inStock: true,
    isBestSeller: true
  },
  {
    id: 'sirona-primescan',
    title: 'Primescan 3D Intraoral Scanner',
    subtitle: 'Ultra-precision high-definition dental digital scanner.',
    category: '3D Oral Scanners',
    subCategory: 'Intraoral Digital Scanners',
    subItem: 'CAD/CAM Digital Impression',
    collection: 'imported',
    price: 1250000,
    originalPrice: 1400000,
    rating: 4.9,
    reviews: 14,
    image: '/images/category_imaging.png',
    brand: 'Dentsply Sirona',
    inStock: true,
    isNewLaunch: true
  },

  // Dental Air Compressors
  {
    id: 'woodpecker-silent-compressor',
    title: 'Woodpecker Oil-Free Silent Compressor',
    subtitle: 'Medical-grade oil-free compressor for clinic workstations.',
    category: 'Dental Air Compressors',
    subCategory: 'Oil-Free Air Compressors',
    subItem: '1-HP Silent Compressors',
    collection: 'imported',
    price: 42000,
    originalPrice: 48000,
    rating: 4.8,
    reviews: 61,
    image: '/images/bestseller_scaler.png',
    brand: 'Woodpecker',
    inStock: true
  },
  {
    id: 'werther-compressor',
    title: 'Werther Silent Air Compressor',
    subtitle: 'High-pressure oil-free clean medical air supply system.',
    category: 'Dental Air Compressors',
    subCategory: 'Oil-Free Air Compressors',
    subItem: '2-HP Dual-Motor Compressors',
    collection: 'imported',
    price: 74999,
    originalPrice: 85000,
    rating: 4.7,
    reviews: 12,
    image: '/images/bestseller_scaler.png',
    brand: 'Werther',
    inStock: true,
    isNewLaunch: true
  },

  // Advanced Dental Equipment & Accessories
  {
    id: 'endo-radar',
    title: 'Endo Radar Apex Locator',
    subtitle: 'Micro-precise root canal diagnostic console and handpiece.',
    category: 'Advanced Dental Equipment & Accessories',
    subCategory: 'Endodontic Equipment',
    subItem: 'Apex Locators',
    collection: 'imported',
    price: 18999,
    originalPrice: 22000,
    rating: 4.9,
    reviews: 74,
    image: '/images/bestseller_locator.png',
    brand: 'Woodpecker',
    inStock: true,
    isBestSeller: true
  },
  {
    id: 'ultrasonic-scaler',
    title: 'Woodpecker Ultrasonic Scaler',
    subtitle: 'Clinical ultrasonic calculus scaler unit with accessories.',
    category: 'Advanced Dental Equipment & Accessories',
    subCategory: 'Clinical Utility',
    subItem: 'Ultrasonic Scalers',
    collection: 'imported',
    price: 10499,
    originalPrice: 13199,
    rating: 4.8,
    reviews: 85,
    image: '/images/bestseller_scaler.png',
    brand: 'Woodpecker',
    inStock: true
  },
  {
    id: 'acc-protective-sleeves',
    title: 'FAAZO Hygienic Protective Sleeves',
    subtitle: 'Disposable transparent barrier sleeves for intraoral camera lenses (100pcs).',
    category: 'Intraoral Cameras',
    subCategory: 'Accessories',
    subItem: 'Protective Sleeves',
    collection: 'manufactured',
    price: 1299,
    originalPrice: 1999,
    rating: 4.6,
    reviews: 45,
    image: '/images/faazo_camera_portrait.png',
    brand: 'FAAZO',
    inStock: true
  },
  {
    id: 'acc-camera-mounts',
    title: 'FAAZO Ergonomic Camera Mount Holder',
    subtitle: 'Stable clinical mount dock for intraoral imaging devices.',
    category: 'Intraoral Cameras',
    subCategory: 'Accessories',
    subItem: 'Camera Mounts',
    collection: 'manufactured',
    price: 2499,
    originalPrice: 3499,
    rating: 4.5,
    reviews: 18,
    image: '/images/faazo_camera_portrait.png',
    brand: 'FAAZO',
    inStock: true
  },
  {
    id: 'acc-usb-cables',
    title: 'NSK Shielded USB 3.0 Interface Cable',
    subtitle: 'High-speed medical-grade USB link cable for image exports.',
    category: 'Intraoral Cameras',
    subCategory: 'Accessories',
    subItem: 'USB Interface Cables',
    collection: 'imported',
    price: 3499,
    originalPrice: 4499,
    rating: 4.8,
    reviews: 29,
    image: '/images/faazo_camera_portrait.png',
    brand: 'NSK',
    inStock: true
  },
  {
    id: 'acc-fiber-guides',
    title: 'Woodpecker Optical Fiber Light Guide Rod',
    subtitle: 'High-transparency glass fiber rod for composite curing lights.',
    category: 'LED Light Cure Units',
    subCategory: 'Accessories',
    subItem: 'Optical Fiber Guides',
    collection: 'imported',
    price: 4899,
    originalPrice: 5999,
    rating: 4.7,
    reviews: 52,
    image: '/images/woodpecker_curing_portrait.png',
    brand: 'Woodpecker',
    inStock: true
  },
  {
    id: 'acc-light-shields',
    title: 'FAAZO Amber Eye Protective Light Shield',
    subtitle: 'Anti-glare orange protective shield for blue light curing.',
    category: 'LED Light Cure Units',
    subCategory: 'Accessories',
    subItem: 'Light Shields',
    collection: 'manufactured',
    price: 899,
    originalPrice: 1499,
    rating: 4.6,
    reviews: 34,
    image: '/images/woodpecker_curing_portrait.png',
    brand: 'FAAZO',
    inStock: true
  },
  {
    id: 'acc-light-meters',
    title: 'Woodpecker LED Light Intensity Meter',
    subtitle: 'Diagnostic digital radiometer for curing light testing.',
    category: 'LED Light Cure Units',
    subCategory: 'Accessories',
    subItem: 'Light Meters & Radiometers',
    collection: 'imported',
    price: 7999,
    originalPrice: 9999,
    rating: 4.9,
    reviews: 23,
    image: '/images/woodpecker_curing_portrait.png',
    brand: 'Woodpecker',
    inStock: true
  },
  {
    id: 'acc-curing-battery',
    title: 'FAAZO Curing Light Replacement Battery',
    subtitle: 'High-capacity lithium replacement battery pack.',
    category: 'LED Light Cure Units',
    subCategory: 'Accessories',
    subItem: 'Replacement Battery Pack',
    collection: 'manufactured',
    price: 2199,
    originalPrice: 2999,
    rating: 4.7,
    reviews: 19,
    image: '/images/woodpecker_curing_portrait.png',
    brand: 'FAAZO',
    inStock: true
  }
];

interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
}

interface ProductListingPageProps {
  category: string;
  onBackToPortfolio: () => void;
  onProductClick: (id: string) => void;
  setCartItems?: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  onBuyNowDirect?: (item: MockCartItem) => void;
  showToast?: (message: string) => void;
  onOpenLoginModal: () => void;
}

const ProductListingPage: React.FC<ProductListingPageProps> = ({
  category,
  onBackToPortfolio,
  onProductClick,
  setCartItems,
  onBuyNowDirect,
  showToast,
  onOpenLoginModal
}) => {
  const { guardAction } = useGuestGuard(onOpenLoginModal, showToast);
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string | null>(null);
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState<'popularity' | 'price-asc' | 'price-desc' | 'rating'>('popularity');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Start empty — DB products replace static mocks once loaded
  const [dbProducts, setDbProducts] = useState<ListingProduct[]>([]);
  const [dbCategoriesList, setDbCategoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const categoriesList = useCategories();

  // Load categories and products dynamically from database on mount
  useEffect(() => {
    setIsLoading(true);
    // Fetch categories and products in parallel for speed
    Promise.all([
      api.get('categories/?page_size=200').catch(() => ({ data: { data: [] } })),
      api.get('products/?page_size=200').catch(() => ({ data: { data: [] } }))
    ]).then(([catRes, prodRes]) => {
      const cats: any[] = catRes.data?.data ?? (Array.isArray(catRes.data) ? catRes.data : []);
      const prods: any[] = prodRes.data?.data ?? (Array.isArray(prodRes.data) ? prodRes.data : []);

      setDbCategoriesList(cats);

      if (Array.isArray(prods) && prods.length > 0) {
        const mappedProds: ListingProduct[] = prods.map((p: any) => {
          const catNode = cats.find((c: any) => String(c.id) === String(p.category));

          let mainCat = 'Other';
          let subCat: string | undefined = undefined;
          let subItem: string | undefined = undefined;

          if (catNode) {
            if (catNode.depth === 2) {
              subItem = catNode.name;
              const p1 = cats.find((c: any) => String(c.id) === String(catNode.parent));
              if (p1) {
                subCat = p1.name;
                const p2 = cats.find((c: any) => String(c.id) === String(p1.parent));
                if (p2) mainCat = p2.name;
                else mainCat = p1.name; // parent is root
              }
            } else if (catNode.depth === 1) {
              subCat = catNode.name;
              const p1 = cats.find((c: any) => String(c.id) === String(catNode.parent));
              if (p1) mainCat = p1.name;
              else mainCat = catNode.name; // parent is root
            } else {
              // depth === 0 — product is directly in root category
              mainCat = catNode.name;
            }
          }

          const rawImage = p.primary_image || (p.images && p.images[0]?.image);
          const image = getAbsoluteImageUrl(rawImage) || '/images/nsk_handpiece_portrait.png';

          const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0;
          const originalPrice = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;
          const inStock = p.inventory
            ? p.inventory.stock_status !== 'out_of_stock'
            : p.status === 'active';

          return {
            id: p.slug,
            title: p.name,
            subtitle: p.short_description || '',
            category: mainCat,
            subCategory: subCat,
            subItem: subItem,
            collection: 'manufactured' as const,
            price: price,
            originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
            rating: 4.8,
            reviews: 0,
            image,
            brand: p.brand_name || 'FAAZO',
            inStock: inStock,
            isBestSeller: p.is_featured,
            isNewLaunch: false,
            pricing: p.pricing,
            inventory: p.inventory,
          };
        });

        // Merge: DB products first, then any static mock products whose slug is not in DB
        const merged = [
          ...mappedProds,
          ...allProducts.filter(ap => !mappedProds.some(dp => dp.id === ap.id)),
        ];
        setDbProducts(merged);
      } else {
        // No DB products — fall back to static mocks
        setDbProducts(allProducts);
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, [category]);

  // Build a helper: given a category ID, collect IDs of itself + all descendants
  const getDescendantIds = (catId: string, cats: any[]): string[] => {
    const ids = [catId];
    const children = cats.filter((c: any) => String(c.parent) === catId);
    for (const child of children) {
      ids.push(...getDescendantIds(String(child.id), cats));
    }
    return ids;
  };

  // Filter products by the current active category
  const categoryProducts = useMemo(() => {
    const result = [...dbProducts];

    // Special selectors
    if (category === 'Best Sellers') return result.filter(p => p.isBestSeller);
    if (category === 'New Launches') return result.filter(p => p.isNewLaunch);

    // If data is still loading, show nothing (spinner is shown in render)
    if (isLoading) return [];

    const nameLower = category.toLowerCase();

    // 1. Try matching the category name in our DB categories list
    const matched = dbCategoriesList.find((c: any) => 
      c.name.toLowerCase() === nameLower ||
      c.slug.toLowerCase() === nameLower ||
      String(c.id) === nameLower
    );

    if (matched) {
      // Resolve the root mainCat name for this clicked node
      let mainCategory: string;
      let subCategoryName: string | undefined;
      let subItemName: string | undefined;

      if (matched.depth === 2) {
        subItemName = matched.name;
        const p1 = dbCategoriesList.find((c: any) => String(c.id) === String(matched.parent));
        subCategoryName = p1?.name;
        const p2 = p1 ? dbCategoriesList.find((c: any) => String(c.id) === String(p1.parent)) : null;
        mainCategory = p2?.name ?? p1?.name ?? matched.name;
      } else if (matched.depth === 1) {
        subCategoryName = matched.name;
        const p1 = dbCategoriesList.find((c: any) => String(c.id) === String(matched.parent));
        mainCategory = p1?.name ?? matched.name;
      } else {
        // depth === 0 — root category: show products from this category AND all children
        mainCategory = matched.name;
      }

      // Filter strictly by hierarchy
      let filtered = result.filter(p => p.category === mainCategory);
      if (subCategoryName) filtered = filtered.filter(p => p.subCategory === subCategoryName);
      if (subItemName) filtered = filtered.filter(p => p.subItem === subItemName);

      // For root category: also include products whose subCategory or subItem belongs under this root
      if (!subCategoryName && !subItemName && filtered.length === 0) {
        // Try matching products stored directly in this root (mainCat = matched.name)
        filtered = result.filter(p =>
          p.category === matched.name ||
          // products nested deeper that resolve to this root
          (p.category === mainCategory)
        );
      }

      return filtered;
    }

    // 2. Fallback: brand or static category resolution
    const resolved = resolveCategory(category, categoriesList);

    if (resolved.brandName) {
      return result.filter(p => p.brand.toLowerCase() === resolved.brandName!.toLowerCase());
    }

    const mainCatProducts = result.filter(p => p.category === resolved.mainCategory);

    if (resolved.subCategoryName || resolved.subItemName) {
      const filtered = mainCatProducts.filter(p =>
        (resolved.subItemName && p.subItem === resolved.subItemName) ||
        (resolved.subCategoryName && p.subCategory === resolved.subCategoryName)
      );
      if (filtered.length > 0) return filtered;
    }

    return mainCatProducts;
  }, [category, dbProducts, dbCategoriesList, isLoading, categoriesList]);

  // Extract all unique brands in the current category
  const availableBrands = useMemo(() => {
    const brands = categoryProducts.map(p => p.brand);
    return Array.from(new Set(brands));
  }, [categoryProducts]);

  // Handle filter matching
  const filteredProducts = useMemo(() => {
    let result = [...categoryProducts];

    // Filter by Brand
    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }

    // NOTE: Price filter is intentionally disabled until real pricing data is implemented.
    // DB products use a placeholder price of 0 — applying price ranges would hide all of them.

    // Filter by availability
    if (showInStockOnly) {
      result = result.filter(p => p.inStock);
    }

    // Sorting logic
    if (sortOption === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [categoryProducts, selectedBrands, showInStockOnly, sortOption]);

  const toggleBrand = (brandName: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandName)
        ? prev.filter(b => b !== brandName)
        : [...prev, brandName]
    );
  };

  const clearAllFilters = () => {
    setSelectedBrands([]);
    setPriceRange(null);
    setShowInStockOnly(false);
  };

  const handleAddToCart = (e: React.MouseEvent, p: ListingProduct) => {
    e.stopPropagation();
    const item: MockCartItem = {
      id: p.id,
      name: p.title,
      category: p.category,
      price: p.price,
      qty: 1,
      image: p.image,
      originalPrice: p.originalPrice
    };
    if (!guardAction({ type: 'add-to-cart', payload: { item } })) return;
    if (setCartItems) {
      setCartItems(prev => {
        const existing = prev.find(i => i.id === p.id);
        if (existing) {
          return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, item];
      });
      if (showToast) showToast("Added to Cart");
    } else {
      onProductClick(p.id);
    }
  };

  const handleBuyNow = (e: React.MouseEvent, p: ListingProduct) => {
    e.stopPropagation();
    const item: MockCartItem = {
      id: p.id,
      name: p.title,
      category: p.category,
      price: p.price,
      qty: 1,
      image: p.image,
      originalPrice: p.originalPrice
    };
    if (!guardAction({ type: 'buy-now', payload: { item } })) return;
    if (onBuyNowDirect) {
      onBuyNowDirect(item);
    }
  };

  const toggleWishlist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const p = dbProducts.find(prod => prod.id === id);
    if (!p) return;
    const item: MockCartItem = {
      id: p.id, name: p.title, category: p.category,
      price: p.price, qty: 1, image: p.image, originalPrice: p.originalPrice
    };
    if (!guardAction({ type: 'wishlist-toggle', payload: { item } })) return;
    setWishlistedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full bg-[#FAFBFB] text-slate-800 select-none pb-20 font-sans pt-[62px] lg:pt-[180px]">

      {/* Category Header Banner */}
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-1 pb-3 border-b border-slate-200/60">
        <div className="flex items-center gap-3.5 text-left">
          <button
            onClick={onBackToPortfolio}
            className="w-9 h-9 rounded-full border border-slate-200/70 hover:border-[#006670] flex items-center justify-center text-slate-600 hover:text-[#006670] hover:bg-[#e6f3f5]/30 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            aria-label="Back to Portfolio"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h1 className={`font-black text-slate-900 tracking-tight font-display leading-tight ${
            category.toLowerCase().includes('accessories') || category.length > 25
              ? 'text-lg md:text-xl lg:text-2xl'
              : 'text-2xl md:text-3xl lg:text-4xl'
          }`}>
            {category}
          </h1>
        </div>
      </div>

      {/* Core Grid Body */}
      <div className="max-w-7xl mx-auto px-4 md:px-12 mt-4.5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Sidebar Filter - Desktop view (3 cols) */}
          <aside className="hidden lg:block lg:col-span-3 text-left bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-xs font-black tracking-widest text-[#006670] uppercase flex items-center gap-1.5">
                <Filter className="w-4 h-4" />
                Filters
              </h3>
              {(selectedBrands.length > 0 || priceRange !== null || showInStockOnly) && (
                <button
                  onClick={clearAllFilters}
                  className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 hover:text-rose-600 cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Filter Section: Brands */}
            <div className="py-5 border-b border-slate-100">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Brand</h4>
              <div className="space-y-2">
                {availableBrands.map(brand => (
                  <label key={brand} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="w-4 h-4 rounded border-slate-200 text-[#006670] focus:ring-[#006670]/25 cursor-pointer"
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Section: Price Ranges */}
            <div className="py-5 border-b border-slate-100">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Price Range</h4>
              <div className="space-y-2">
                {[
                  { value: 'under-15k', label: 'Under ₹15,000' },
                  { value: '15k-50k', label: '₹15,000 - ₹50,000' },
                  { value: '50k-200k', label: '₹50,000 - ₹200,000' },
                  { value: 'over-200k', label: 'Over ₹200,000' }
                ].map(item => (
                  <label key={item.value} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="priceRangeRadio"
                      checked={priceRange === item.value}
                      onChange={() => setPriceRange(item.value)}
                      className="w-4 h-4 border-slate-200 text-[#006670] focus:ring-[#006670]/25 cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Section: Availability & Special Offers */}
            <div className="py-5">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Availability</h4>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={showInStockOnly}
                  onChange={(e) => setShowInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-200 text-[#006670] focus:ring-[#006670]/25 cursor-pointer"
                />
                <span>Show In Stock Only</span>
              </label>
            </div>
          </aside>

          {/* Product Listing Main Section (9 cols) */}
          <main className="lg:col-span-9">

            {/* Header controls (Sort option, Mobile filter toggle) */}
            <div className="flex items-center justify-between gap-4 mb-3.5">
              {/* Mobile Filter toggle */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-4.5 py-2.5 rounded-full border border-slate-200 bg-white text-xs font-extrabold uppercase tracking-wider text-slate-700 cursor-pointer shadow-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
              </button>

              {/* Custom Sort controls with premium teal & white glassmorphic combo */}
              <div className="flex items-center gap-2 text-xs font-bold ml-auto">
                <span className="text-slate-400">Sort By</span>
                <div className="relative">
                  <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="bg-white/80 backdrop-blur-md border border-[#006670]/20 hover:border-[#006670]/60 rounded-full pl-4.5 pr-9 py-2 text-xs font-bold text-[#006670] transition-all cursor-pointer flex items-center gap-1 shadow-xs select-none"
                  >
                    <span>
                      {sortOption === 'popularity' && 'Featured'}
                      {sortOption === 'price-asc' && 'Price: Low to High'}
                      {sortOption === 'price-desc' && 'Price: High to Low'}
                      {sortOption === 'rating' && 'Average Rating'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#006670] absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-300 pointer-events-none ${isSortOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSortOpen && (
                    <>
                      {/* Invisible full-screen backdrop to close menu on click outside */}
                      <div
                        onClick={() => setIsSortOpen(false)}
                        className="fixed inset-0 z-30 bg-transparent cursor-default"
                      />
                      {/* Glassmorphic Dropdown Panel */}
                      <div className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[170px] bg-white/90 backdrop-blur-lg border border-[#006670]/15 rounded-xl shadow-lg py-1.5 overflow-hidden animate-slideIn">
                        {[
                          { value: 'popularity', label: 'Featured' },
                          { value: 'price-asc', label: 'Price: Low to High' },
                          { value: 'price-desc', label: 'Price: High to Low' },
                          { value: 'rating', label: 'Average Rating' }
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() => {
                              setSortOption(item.value as any);
                              setIsSortOpen(false);
                            }}
                            className={`w-full text-left px-4.5 py-2 text-xs font-bold transition-all cursor-pointer block select-none
                              ${sortOption === item.value
                                ? 'bg-[#006670] text-white'
                                : 'text-slate-700 hover:bg-[#e6f3f5]/60 hover:text-[#006670]'
                              }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Product Cards Grid */}
            {isLoading ? (
              // Loading spinner while API fetches
              <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 border-4 border-[#006670]/20 border-t-[#006670] rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Products…</span>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => onProductClick(p.id)}
                    className="group bg-transparent cursor-pointer transition-all duration-300 flex flex-col gap-1.5 sm:gap-3 pb-3 sm:pb-6"
                  >
                    <div>
                      {/* Product image container with portrait aspect ratio and premium glassy/teal finish */}
                      {(() => {
                        const isCoverAsset = p.image.includes('_portrait.png') || p.image.includes('bestseller_') || p.image.includes('studio');
                        return (
                          <div className={`aspect-square md:aspect-[3/4] bg-white/70 backdrop-blur-md rounded-xl flex items-center justify-center relative overflow-hidden mb-1.5 sm:mb-3.5 border border-[#006670]/15 shadow-[inset_0_0_30px_white,0_8px_24px_rgba(0, 43, 46,0.02)] group-hover:border-[#006670]/40 group-hover:shadow-[0_12px_30px_rgba(0, 43, 46,0.06)] transition-all duration-500 ${isCoverAsset ? 'p-0' : 'p-1.5 sm:p-2'}`}>
                            <img
                              src={p.image}
                              alt={p.title}
                              className={`w-full h-full mix-blend-multiply filter brightness-[1.04] contrast-[1.02] transform transition-transform duration-500 
                                ${isCoverAsset
                                  ? 'object-cover group-hover:scale-[1.05]'
                                  : 'object-contain scale-[1.35] group-hover:scale-[1.42]'
                                }`}
                            />

                            {/* Minimalist collection badge - Teal and White combo with glassy finish */}
                            {p.isBestSeller && (
                              <span className="absolute top-3 left-3 bg-white/85 backdrop-blur-sm border border-[#006670]/20 text-[#006670] text-[9px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                                Best Seller
                              </span>
                            )}
                            {p.isNewLaunch && (
                              <span className="absolute top-3 left-3 bg-white/85 backdrop-blur-sm border border-[#006670]/20 text-[#006670] text-[9px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                                New
                              </span>
                            )}

                            {/* Floating glass wishlist icon button */}
                            <button
                              onClick={(e) => toggleWishlist(e, p.id)}
                              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md border border-[#006670]/15 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer z-10"
                            >
                              <Heart className={`w-4 h-4 transition-colors ${wishlistedIds.includes(p.id) ? 'fill-rose-500 stroke-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-500'}`} />
                            </button>
                          </div>
                        );
                      })()}

                      <div className="text-left px-1">
                        <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-[#006670] uppercase block mb-0.5 sm:mb-1">
                          {p.brand}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug tracking-tight line-clamp-1 group-hover:text-[#006670] transition-colors">
                          {p.title}
                        </h4>
                        {p.subtitle && (
                          <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 line-clamp-1">{p.subtitle}</p>
                        )}

                        {/* Rating row (Myntra/Ajio style compact pill) */}
                        <div className="flex items-center gap-2 mt-2 mb-1.5 flex-wrap">
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200/60 rounded-full text-[9px] sm:text-[10px] font-bold text-slate-700">
                            <span>{p.rating}</span>
                            <Star className="w-2.5 h-2.5 fill-emerald-600 stroke-emerald-600" />
                            {p.reviews > 0 && (
                              <>
                                <span className="text-slate-350 font-normal">|</span>
                                <span className="text-slate-500 font-semibold">{p.reviews}</span>
                              </>
                            )}
                          </div>
                          {/* Stock status badge */}
                          {p.inventory?.stock_status ? (
                            <span className={`text-[8px] sm:text-[9px] border px-1 sm:px-1.5 py-0.5 rounded font-black ${
                              p.inventory.stock_status === 'in_stock'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : p.inventory.stock_status === 'low_stock'
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {p.inventory.stock_status === 'in_stock'
                                ? 'In Stock'
                                : p.inventory.stock_status === 'low_stock'
                                ? 'Low Stock'
                                : 'Out of Stock'}
                            </span>
                          ) : (
                            <span className={`text-[8px] sm:text-[9px] border px-1 sm:px-1.5 py-0.5 rounded font-black ${
                              p.inStock
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {p.inStock ? 'In Stock' : 'Out of Stock'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pricing & Full-Width Split Buttons */}
                    <div className="flex flex-col gap-1.5 sm:gap-3 px-1 mt-auto">
                      {p.price > 0 && (
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-950 font-display">
                            ₹{p.price.toLocaleString('en-IN')}
                          </span>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9.5px] sm:text-[10.5px] text-slate-400 line-through font-semibold">
                                ₹{p.originalPrice.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[8px] sm:text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 sm:px-1.5 py-0.5 rounded-full">
                                {Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Buy Now & Add to Cart Action Row */}
                      <div className="flex flex-row gap-1.5 sm:gap-2 w-full">
                        <button
                          onClick={(e) => handleAddToCart(e, p)}
                          className="flex-1 py-1.5 sm:py-2 bg-white/85 backdrop-blur-md border border-[#006670]/25 hover:border-[#006670] hover:bg-[#006670] hover:text-white text-[#006670] text-[8.5px] sm:text-[10px] font-black tracking-wider uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-0.5 sm:gap-1 shadow-xs hover:shadow-sm rounded-lg"
                        >
                          Cart
                        </button>
                        <button
                          onClick={(e) => handleBuyNow(e, p)}
                          className="flex-1 py-1.5 sm:py-2 bg-[#006670] hover:bg-[#004e56] border border-transparent text-white text-[8.5px] sm:text-[10px] font-black tracking-wider uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-0.5 sm:gap-1 shadow-xs hover:shadow-sm rounded-lg"
                        >
                          Buy
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="bg-white rounded-[24px] border border-slate-100 p-12 text-center select-none shadow-xs mt-4">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h4 className="text-base font-black text-slate-800 font-display">No Products Found</h4>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-2 leading-relaxed">
                  {selectedBrands.length > 0 || showInStockOnly
                    ? `No products in "${category}" match your selected filters. Try clearing filters.`
                    : `No products are currently listed under "${category}".`}
                </p>
                <button
                  onClick={clearAllFilters}
                  className="mt-6 inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#e6f3f5] hover:bg-[#006670] text-[#006670] hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Slide-out Mobile Filters Drawer overlay */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-55 flex select-none">
          {/* Backdrop click close */}
          <div
            onClick={() => setIsMobileFilterOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Drawer Panel */}
          <div className="relative w-80 max-w-sm h-full bg-white flex flex-col justify-between shadow-2xl p-6 text-left animate-slideIn">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-xs font-black tracking-widest text-[#006670] uppercase flex items-center gap-1.5">
                  <Filter className="w-4 h-4" />
                  Filters
                </h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 hover:bg-slate-50 rounded-full text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Brands */}
              <div className="py-4 border-b border-slate-100">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">Brand</h4>
                <div className="space-y-2">
                  {availableBrands.map(brand => (
                    <label key={brand} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="w-4.5 h-4.5 rounded border-slate-200 text-[#006670]"
                      />
                      <span>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Ranges */}
              <div className="py-4 border-b border-slate-100">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">Price Range</h4>
                <div className="space-y-2">
                  {[
                    { value: 'under-15k', label: 'Under ₹15,000' },
                    { value: '15k-50k', label: '₹15,000 - ₹50,000' },
                    { value: '50k-200k', label: '₹50,000 - ₹200,000' },
                    { value: 'over-200k', label: 'Over ₹200,000' }
                  ].map(item => (
                    <label key={item.value} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="priceRangeMobile"
                        checked={priceRange === item.value}
                        onChange={() => setPriceRange(item.value)}
                        className="w-4.5 h-4.5 border-slate-200 text-[#006670]"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div className="py-4">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">Availability</h4>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showInStockOnly}
                    onChange={(e) => setShowInStockOnly(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-200 text-[#006670]"
                  />
                  <span>Show In Stock Only</span>
                </label>
              </div>
            </div>

            {/* Action buttons at bottom */}
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-3 text-xs font-bold rounded-xl border border-slate-200 text-center hover:bg-slate-50 cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-[#006670] text-white text-center hover:bg-[#004e56] cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductListingPage;
