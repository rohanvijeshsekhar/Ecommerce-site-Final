// Universal Promotional Banner Visual Positioning Editor Types

export type DeviceBreakpoint = 'desktop' | 'tablet' | 'mobile';

export type BannerElementType =
  | 'heading'
  | 'subheading'
  | 'description'
  | 'promotional_text'
  | 'badge'
  | 'discount'
  | 'countdown'
  | 'cta'
  | 'product_image'
  | 'custom_image'
  | 'logo'
  | 'feature_icon'
  | 'custom_text';

export interface ResponsiveElementTransform {
  x: number; // percentage: 0 to 100
  y: number; // percentage: 0 to 100
  width: number | 'auto'; // percentage (e.g. 50) or 'auto'
  height: number | 'auto'; // percentage or 'auto'
  rotation?: number; // degrees: 0 to 360
  fontSize?: number; // in px
  textAlign?: 'left' | 'center' | 'right';
  visible: boolean;
}

export interface BannerElementTypography {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
  textColor?: string;
  lineHeight?: number | string;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface BannerElementAppearance {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: string | number;
  opacity?: number;
  boxShadow?: string;
}

export interface BannerElementCtaSettings {
  label?: string;
  link?: string;
  openNewTab?: boolean;
  template?: 'solid' | 'outline' | 'text_link' | 'soft_filled' | 'dark_premium';
  size?: 'small' | 'medium' | 'large';
  showArrow?: boolean;
  arrowPosition?: 'right' | 'left';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export interface BannerElementCountdownSettings {
  template?: 'minimal_inline' | 'compact_cards' | 'elegant_text' | 'outlined' | 'dark_premium';
  size?: 'compact' | 'regular' | 'large';
  numberFont?: string;
  labelFont?: string;
  targetDate?: string;
  expiredBehavior?: 'show_expired_badge' | 'disable_cta' | 'hide_cta';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

export interface BannerElement {
  id: string;
  type: BannerElementType;
  name: string;
  zIndex: number;
  locked?: boolean;
  content?: string;
  imageUrl?: string;
  typography?: BannerElementTypography;
  appearance?: BannerElementAppearance;
  cta?: BannerElementCtaSettings;
  countdown?: BannerElementCountdownSettings;
  // Breakpoint-specific transforms (percentage based coordinates)
  desktop: ResponsiveElementTransform;
  tablet?: Partial<ResponsiveElementTransform>;
  mobile?: Partial<ResponsiveElementTransform>;
}

export interface UniversalBannerLayout {
  version: number;
  enabled: boolean;
  canvasWidth?: number; // reference desktop width (1440)
  canvasHeight?: number; // reference desktop height (480)
  aspectRatio?: {
    desktop?: string; // e.g. "3/1" or "16/9"
    tablet?: string; // e.g. "2/1" or "16/9"
    mobile?: string; // e.g. "3/3.7" or "1/1"
  };
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
  mobileBackgroundImageUrl?: string | null;
  overlayOpacity?: number;
  overlayGradient?: 'none' | 'dark' | 'light' | 'fade-right' | 'fade-bottom';
  elements: BannerElement[];
}

export const BREAKPOINT_CONFIGS: Record<
  DeviceBreakpoint,
  { label: string; width: number; height: number; aspectRatio: string }
> = {
  desktop: { label: 'Desktop', width: 1440, height: 480, aspectRatio: '3/1' },
  tablet: { label: 'Tablet', width: 768, height: 384, aspectRatio: '2/1' },
  mobile: { label: 'Mobile', width: 390, height: 480, aspectRatio: '3/3.7' },
};

/**
 * Resolves an element's transform for a given breakpoint, falling back to desktop values.
 */
export function resolveElementTransform(
  element: BannerElement,
  breakpoint: DeviceBreakpoint
): ResponsiveElementTransform {
  if (!element) {
    return { x: 0, y: 0, width: 'auto', height: 'auto', visible: false };
  }
  const desktop = element.desktop || { x: 0, y: 0, width: 'auto', height: 'auto', visible: true };
  if (breakpoint === 'desktop') {
    return desktop;
  }
  const override = breakpoint === 'tablet' ? element.tablet : element.mobile;
  if (!override) {
    // Proportional fallback for mobile/tablet if not customized
    if (breakpoint === 'mobile') {
      return {
        ...desktop,
        x: Math.max(4, Math.min(desktop.x ?? 0, 90)),
        y: Math.max(4, Math.min(desktop.y ?? 0, 90)),
        width: typeof desktop.width === 'number' ? Math.min(92, Math.max(desktop.width * 1.3, 40)) : 'auto',
        fontSize: desktop.fontSize ? Math.max(12, Math.round(desktop.fontSize * 0.72)) : undefined,
      };
    }
    return {
      ...desktop,
      fontSize: desktop.fontSize ? Math.max(13, Math.round(desktop.fontSize * 0.88)) : undefined,
    };
  }

  return {
    x: override.x ?? desktop.x ?? 0,
    y: override.y ?? desktop.y ?? 0,
    width: override.width ?? desktop.width ?? 'auto',
    height: override.height ?? desktop.height ?? 'auto',
    rotation: override.rotation ?? desktop.rotation ?? 0,
    fontSize: override.fontSize ?? (breakpoint === 'mobile' && desktop.fontSize ? Math.round(desktop.fontSize * 0.75) : desktop.fontSize),
    textAlign: override.textAlign ?? desktop.textAlign ?? 'left',
    visible: override.visible ?? desktop.visible ?? true,
  };
}

/**
 * Generates a sensible, beautiful default visual layout from any existing FAAZO banner object.
 */
export function createDefaultBannerLayout(bannerData: any = {}, bannerType: string = 'promo'): UniversalBannerLayout {
  const elements: BannerElement[] = [];
  let zCounter = 10;

  // 1. Badge / Offer Label
  const badgeText = bannerData.badge_text || bannerData.badge || '';
  if (badgeText) {
    elements.push({
      id: 'elem_badge',
      type: 'badge',
      name: 'Offer Badge',
      zIndex: zCounter++,
      content: badgeText,
      typography: {
        fontFamily: bannerData.font_family || 'Inter',
        fontSize: 12,
        fontWeight: 'bold',
        textColor: bannerData.badge_text_color || '#005F63',
      },
      appearance: {
        backgroundColor: bannerData.badge_bg_color || '#E6F4F4',
        borderRadius: 9999,
        padding: '4px 12px',
        borderWidth: 1,
        borderColor: '#B2DFDB',
      },
      desktop: { x: 6, y: 12, width: 'auto', height: 'auto', fontSize: 12, visible: true },
      mobile: { x: 5, y: 8, width: 'auto', height: 'auto', fontSize: 11, visible: true },
    });
  }

  // 2. Main Heading
  const headingText = bannerData.title || bannerData.heading || 'Special Promotional Offer';
  elements.push({
    id: 'elem_heading',
    type: 'heading',
    name: 'Main Heading',
    zIndex: zCounter++,
    content: headingText,
    typography: {
      fontFamily: bannerData.heading_font_family || bannerData.font_family || 'Inter',
      fontSize: 38,
      fontWeight: 'extrabold',
      textColor: bannerData.heading_color || '#0F172A',
      lineHeight: 1.15,
      letterSpacing: '-0.02em',
    },
    desktop: { x: 6, y: 22, width: 50, height: 'auto', fontSize: 38, visible: true },
    tablet: { x: 6, y: 18, width: 60, height: 'auto', fontSize: 28, visible: true },
    mobile: { x: 5, y: 16, width: 90, height: 'auto', fontSize: 22, visible: true },
  });

  // 3. Subheading / Description
  const subText = bannerData.subheading || bannerData.subtitle || bannerData.description || '';
  if (subText) {
    elements.push({
      id: 'elem_description',
      type: 'description',
      name: 'Description Text',
      zIndex: zCounter++,
      content: subText,
      typography: {
        fontFamily: bannerData.description_font_family || bannerData.font_family || 'Inter',
        fontSize: 15,
        fontWeight: 'normal',
        textColor: bannerData.description_color || '#475569',
        lineHeight: 1.5,
      },
      desktop: { x: 6, y: 44, width: 45, height: 'auto', fontSize: 15, visible: true },
      tablet: { x: 6, y: 42, width: 55, height: 'auto', fontSize: 14, visible: true },
      mobile: { x: 5, y: 38, width: 90, height: 'auto', fontSize: 13, visible: true },
    });
  }

  // 4. Offer Tag / Discount Callout
  const offerTag = bannerData.offer_text || '';
  if (offerTag) {
    elements.push({
      id: 'elem_discount',
      type: 'discount',
      name: 'Discount Tag',
      zIndex: zCounter++,
      content: offerTag,
      typography: {
        fontFamily: bannerData.font_family || 'Inter',
        fontSize: 14,
        fontWeight: 'extrabold',
        textColor: bannerData.offer_color || '#005F63',
      },
      appearance: {
        backgroundColor: '#F0FDFA',
        borderRadius: 8,
        padding: '6px 14px',
        borderWidth: 1,
        borderColor: '#99F6E4',
      },
      desktop: { x: 6, y: 60, width: 'auto', height: 'auto', fontSize: 14, visible: true },
      mobile: { x: 5, y: 54, width: 'auto', height: 'auto', fontSize: 12, visible: true },
    });
  }

  // 5. Countdown Timer
  if (bannerData.countdown_enabled !== false && (bannerData.end_date || bannerType === 'daily_offer')) {
    elements.push({
      id: 'elem_countdown',
      type: 'countdown',
      name: 'Countdown Timer',
      zIndex: zCounter++,
      countdown: {
        template: bannerData.countdown_template || 'minimal_inline',
        size: bannerData.countdown_size || 'regular',
        numberFont: bannerData.countdown_font_family || 'Inter',
        labelFont: bannerData.countdown_font_family || 'Inter',
        targetDate: bannerData.end_date,
        expiredBehavior: bannerData.expired_behavior || 'show_expired_badge',
        bgColor: bannerData.countdown_bg_color,
        textColor: bannerData.countdown_text_color,
      },
      desktop: { x: 6, y: 70, width: 'auto', height: 'auto', visible: true },
      mobile: { x: 5, y: 64, width: 'auto', height: 'auto', visible: true },
    });
  }

  // 6. CTA Button
  const ctaLabel = bannerData.cta_text || bannerData.button_text || 'Shop Now';
  elements.push({
    id: 'elem_cta',
    type: 'cta',
    name: 'CTA Button',
    zIndex: zCounter++,
    cta: {
      label: ctaLabel,
      link: bannerData.cta_url || bannerData.cta_link || bannerData.button_link || '/offers',
      openNewTab: bannerData.cta_open_in_new_tab || false,
      template: bannerData.cta_template || 'solid',
      size: bannerData.cta_size || 'medium',
      showArrow: bannerData.cta_show_arrow !== false,
      bgColor: bannerData.cta_bg_color || '#005F63',
      textColor: bannerData.cta_text_color || '#FFFFFF',
      borderColor: bannerData.cta_border_color || '#005F63',
      borderRadius: bannerData.cta_border_radius || 'md',
    },
    desktop: { x: 6, y: 84, width: 'auto', height: 'auto', visible: true },
    mobile: { x: 5, y: 82, width: 'auto', height: 'auto', visible: true },
  });

  // 7. Product Image / Feature Visual
  const bgImg = bannerData.desktop_image_url || bannerData.desktop_image || bannerData.banner_image_url || bannerData.banner_image;
  const mobileImg = bannerData.mobile_image_url || bannerData.mobile_image;

  return {
    version: 1,
    enabled: true,
    canvasWidth: 1440,
    canvasHeight: 480,
    aspectRatio: {
      desktop: '3/1',
      tablet: '2/1',
      mobile: '3/3.7',
    },
    backgroundColor: bannerData.bg_color || '#FFFFFF',
    backgroundImageUrl: typeof bgImg === 'string' ? bgImg : null,
    mobileBackgroundImageUrl: typeof mobileImg === 'string' ? mobileImg : null,
    overlayOpacity: bannerData.overlay_opacity ?? 0.15,
    overlayGradient: bannerData.overlay_gradient || 'none',
    elements,
  };
}
