import React from 'react';

// Custom SVG Icons matching the reference design badges
export const HandpieceBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const ImagingBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const InstrumentsBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M6 19 L15 10" />
    <path d="M15 10 C16 9, 17 9, 17.5 8 C18 7, 17.5 5.5, 16 5.5" />
    <path d="M10 19 L17 12" />
    <circle cx="18.5" cy="10.5" r="2.5" />
  </svg>
);

export const EquipmentBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

export const MaterialsBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const ChairsBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M19 9l1.25-2.5A2 2 0 0 0 18.46 4H5.54a2 2 0 0 0-1.79 2.5L5 9" />
    <path d="M5 9v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
    <path d="M9 17v4" />
    <path d="M15 17v4" />
  </svg>
);

export const SterilizationBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const EndoBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M4.8 2.3A.3.3 0 0 0 4.5 2h-1a.3.3 0 0 0-.3.3v1.4c0 .16.13.3.3.3h.2v16.1l-1.4 1.4a.3.3 0 0 0 .2.5h3.4a.3.3 0 0 0 .2-.5L4.8 20.1V4h.2c.16 0 .3-.14.3-.3V2.3z" />
    <path d="M8 6h12M8 10h9M8 14h6M8 18h3" />
  </svg>
);

export const ImplantsBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M6 3h12l4 6-10 12L2 9z" />
  </svg>
);

export const PhoneBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </svg>
);

export const OtherBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.29-7.29a1 1 0 0 0 0-1.41L12 2z" />
    <circle cx="7" cy="7" r="1.5" />
  </svg>
);

export const ICON_MAP: Record<string, React.ReactNode> = {
  handpiece:      <HandpieceBadgeIcon />,
  imaging:        <ImagingBadgeIcon />,
  instruments:    <InstrumentsBadgeIcon />,
  equipment:      <EquipmentBadgeIcon />,
  materials:      <MaterialsBadgeIcon />,
  chairs:         <ChairsBadgeIcon />,
  'dental chairs':<ChairsBadgeIcon />,
  sterilization:  <SterilizationBadgeIcon />,
  sterlization:   <SterilizationBadgeIcon />,
  endo:           <EndoBadgeIcon />,
  endodontics:    <EndoBadgeIcon />,
  implants:       <ImplantsBadgeIcon />,
  phone:          <PhoneBadgeIcon />,
  iphone:         <PhoneBadgeIcon />,
  other:          <OtherBadgeIcon />,
};

export const getCategoryIconBadge = (title?: string, slug?: string, iconKey?: string): React.ReactNode => {
  const key = (iconKey || '').toLowerCase().trim();

  if (key && key !== 'other' && key !== 'auto' && ICON_MAP[key]) {
    return ICON_MAP[key];
  }

  const combined = `${title || ''} ${slug || ''} ${key}`.toLowerCase();
  
  if (combined.includes('handpiece') || combined.includes('drill') || combined.includes('rotary') || combined.includes('turbine')) {
    return ICON_MAP['handpiece'];
  }
  if (combined.includes('imaging') || combined.includes('camera') || combined.includes('scan') || combined.includes('x-ray') || combined.includes('xray') || combined.includes('sensor')) {
    return ICON_MAP['imaging'];
  }
  if (combined.includes('instrument') || combined.includes('scaler') || combined.includes('forceps') || combined.includes('pliers') || combined.includes('elevator') || combined.includes('mirror') || combined.includes('probe')) {
    return ICON_MAP['instruments'];
  }
  if (combined.includes('equipment') || combined.includes('compressor') || combined.includes('suction') || combined.includes('unit') || combined.includes('motor')) {
    return ICON_MAP['equipment'];
  }
  if (combined.includes('material') || combined.includes('composite') || combined.includes('cement') || combined.includes('impression') || combined.includes('resin')) {
    return ICON_MAP['materials'];
  }
  if (combined.includes('chair') || combined.includes('seating') || combined.includes('stool')) {
    return ICON_MAP['chairs'];
  }
  if (combined.includes('steriliz') || combined.includes('sterliz') || combined.includes('autoclave') || combined.includes('clean') || combined.includes('pouch') || combined.includes('disinfect')) {
    return ICON_MAP['sterilization'];
  }
  if (combined.includes('endo') || combined.includes('canal') || combined.includes('file') || combined.includes('gutta')) {
    return ICON_MAP['endo'];
  }
  if (combined.includes('implant') || combined.includes('prosthetic') || combined.includes('abutment')) {
    return ICON_MAP['implants'];
  }
  if (combined.includes('iphone') || combined.includes('phone') || combined.includes('mobile') || combined.includes('apple')) {
    return ICON_MAP['phone'];
  }

  if (key && ICON_MAP[key]) {
    return ICON_MAP[key];
  }

  return ICON_MAP['other'];
};
