export interface BannerFontOption {
  id: string;
  name: string;
  family: string;
  category: 'sans-serif' | 'serif' | 'display';
  preview: string;
}

export const BANNER_FONTS: BannerFontOption[] = [
  { id: 'Inter', name: 'Inter (Clean & Modern)', family: "'Inter', sans-serif", category: 'sans-serif', preview: 'Clean Clinical Modern' },
  { id: 'Poppins', name: 'Poppins (Friendly & Geometric)', family: "'Poppins', sans-serif", category: 'sans-serif', preview: 'Friendly High-Impact' },
  { id: 'Montserrat', name: 'Montserrat (Bold & Editorial)', family: "'Montserrat', sans-serif", category: 'sans-serif', preview: 'Bold Bold Promo' },
  { id: 'Playfair Display', name: 'Playfair Display (Luxury Serif)', family: "'Playfair Display', Georgia, serif", category: 'serif', preview: 'Premium Luxury' },
  { id: 'DM Sans', name: 'DM Sans (Contemporary)', family: "'DM Sans', sans-serif", category: 'sans-serif', preview: 'Crisp Contemporary' },
  { id: 'Lora', name: 'Lora (Elegant Serif)', family: "'Lora', serif", category: 'serif', preview: 'Clinical Elegance' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Tech Pro)', family: "'Plus Jakarta Sans', sans-serif", category: 'sans-serif', preview: 'Modern Tech Suite' },
  { id: 'System', name: 'System Default', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", category: 'sans-serif', preview: 'Native System' },
];

export function getFontFamilyCss(fontId?: string | null): string {
  if (!fontId) return "'Inter', sans-serif";
  const found = BANNER_FONTS.find((f) => f.id.toLowerCase() === fontId.toLowerCase());
  return found ? found.family : (fontId.includes(',') ? fontId : `'${fontId}', sans-serif`);
}
