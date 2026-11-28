export interface BannerFontOption {
  id: string;
  name: string;
  family: string;
  category: 'sans-serif' | 'serif' | 'display';
  preview: string;
}

export const BANNER_FONTS: BannerFontOption[] = [
  { id: 'Inter', name: 'Inter (Clean & Clinical)', family: "'Inter', sans-serif", category: 'sans-serif', preview: 'Clean Clinical Precision' },
  { id: 'Satoshi', name: 'Satoshi (Modern Geometric)', family: "'Satoshi', sans-serif", category: 'sans-serif', preview: 'Modern Premium Geometric' },
  { id: 'Manrope', name: 'Manrope (Contemporary Clean)', family: "'Manrope', sans-serif", category: 'sans-serif', preview: 'Contemporary High-End' },
  { id: 'DM Sans', name: 'DM Sans (Minimal Pro)', family: "'DM Sans', sans-serif", category: 'sans-serif', preview: 'Crisp Minimal Studio' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Tech Pro)', family: "'Plus Jakarta Sans', sans-serif", category: 'sans-serif', preview: 'Modern Tech Suite' },
  { id: 'Faazo Brand', name: 'FAAZO Brand Font', family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif", category: 'sans-serif', preview: 'FAAZO Brand Clinical Identity' },
  { id: 'Poppins', name: 'Poppins (Friendly & Geometric)', family: "'Poppins', sans-serif", category: 'sans-serif', preview: 'Friendly High-Impact' },
  { id: 'Montserrat', name: 'Montserrat (Bold & Editorial)', family: "'Montserrat', sans-serif", category: 'sans-serif', preview: 'Bold Bold Promo' },
  { id: 'Playfair Display', name: 'Playfair Display (Luxury Serif)', family: "'Playfair Display', Georgia, serif", category: 'serif', preview: 'Premium Luxury' },
  { id: 'Lora', name: 'Lora (Elegant Serif)', family: "'Lora', serif", category: 'serif', preview: 'Clinical Elegance' },
  { id: 'System', name: 'System Default', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", category: 'sans-serif', preview: 'Native System' },
];

export function getFontFamilyCss(fontId?: string | null): string {
  if (!fontId) return "'Inter', sans-serif";
  const found = BANNER_FONTS.find((f) => f.id.toLowerCase() === fontId.toLowerCase());
  return found ? found.family : (fontId.includes(',') ? fontId : `'${fontId}', sans-serif`);
}
